window.initHostView = async function(session) {
    window.renderHostAnalytics(session);
    window.renderHostProperties(session);
    window.renderHostBookings(session);
    window.renderChatInbox();

    // Check verified host status
    try {
        const hostUser = await RoomBnbAPI.getUser(session.id);
        const badge = document.getElementById("host-verified-badge");
        if (badge && hostUser && hostUser.verified) {
            badge.style.display = "inline-flex";
        }
    } catch (e) {
        console.error("Failed to check host verification status", e);
    }

    // Load bank/reviews initially
    window.renderHostFinancials(session);
    window.renderHostReviews(session);

    // Host tabs click events
    const earningsTabBtn = document.querySelector('[data-tab-target="host-earnings"]');
    if (earningsTabBtn) {
        earningsTabBtn.onclick = () => window.renderHostFinancials(session);
    }

    const reviewsTabBtn = document.querySelector('[data-tab-target="host-reviews"]');
    if (reviewsTabBtn) {
        reviewsTabBtn.onclick = () => window.renderHostReviews(session);
    }

    // Bank Setup Form
    const bankForm = document.getElementById("host-bank-form");
    if (bankForm) {
        try {
            const hostUser = await RoomBnbAPI.getUser(session.id);
            if (hostUser && hostUser.bankAccount) {
                bankForm.bankAccount.value = hostUser.bankAccount;
            }
        } catch (e) {}

        bankForm.onsubmit = async (e) => {
            e.preventDefault();
            const bankAccount = bankForm.bankAccount.value.trim();
            try {
                await RoomBnbAPI.updateUser(session.id, { bankAccount });
                RoomBnbAPI.showToast("Bank details updated successfully!");
                window.renderHostFinancials(session);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to update bank details.", "error");
            }
        };
    }

    // Withdraw Form
    const withdrawForm = document.getElementById("host-withdraw-form");
    if (withdrawForm) {
        withdrawForm.onsubmit = async (e) => {
            e.preventDefault();
            const amount = Number(withdrawForm.amount.value);
            
            try {
                // Calculate balance
                const bookings = await RoomBnbAPI.getBookings("host", session.id);
                const paidBookings = bookings.filter(b => b.status === "Paid" || b.status === "Approved" || b.status === "Completed");
                
                let grossEarnings = 0;
                let commission = 0;
                paidBookings.forEach(b => {
                    grossEarnings += b.totalPrice;
                    commission += (b.commission !== undefined ? b.commission : Math.round(b.basePrice * 0.1));
                });
                const netEarnings = grossEarnings - commission;

                const transactions = await RoomBnbAPI.getHostTransactions(session.id);
                const withdrawals = transactions.filter(t => t.type === "Withdrawal").reduce((sum, t) => sum + t.amount, 0);
                const currentBalance = netEarnings - withdrawals;

                if (amount > currentBalance) {
                    RoomBnbAPI.showToast(`Insufficient balance. You only have $${currentBalance.toLocaleString()} available.`, "error");
                    return;
                }

                const hostUser = await RoomBnbAPI.getUser(session.id);
                const bankAccount = hostUser.bankAccount || "Bank Transfer";

                await RoomBnbAPI.requestWithdrawal(session.id, amount, bankAccount);
                RoomBnbAPI.showToast(`Payout request of $${amount} submitted!`);
                withdrawForm.reset();
                window.renderHostFinancials(session);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to submit payout withdrawal request.", "error");
            }
        };
    }

    // Host property form submit handler
    const hostPropForm = document.querySelector("[data-host-property-form]");
    if (hostPropForm) {
        hostPropForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = hostPropForm.id.value;

            const rulesVal = hostPropForm.rules.value.trim();
            const rulesList = rulesVal ? rulesVal.split(",").map(r => r.trim()) : ["No smoking"];

            const amenitiesList = [];
            hostPropForm.querySelectorAll("#host-property-amenities input:checked").forEach(cb => {
                amenitiesList.push(cb.value);
            });

            const imagesText = hostPropForm.imagesList.value.trim();
            const imagesArray = imagesText ? imagesText.split("\n").map(url => url.trim()).filter(url => url.length > 0) : [];

            const propertyData = {
                name: hostPropForm.name.value.trim(),
                type: hostPropForm.type.value.trim(),
                price: Number(hostPropForm.price.value),
                capacity: Number(hostPropForm.capacity.value),
                bedrooms: Number(hostPropForm.bedrooms.value),
                bathrooms: Number(hostPropForm.bathrooms.value),
                description: hostPropForm.description.value.trim(),
                rules: rulesList,
                amenities: amenitiesList,
                hostId: session.id,
                latitude: Number(hostPropForm.latitude.value || 0.0),
                longitude: Number(hostPropForm.longitude.value || 0.0),
                cleaningFee: Number(hostPropForm.cleaningFee.value || 0.0),
                seasonalPricing: { weekend: Number(hostPropForm.weekendPrice.value || hostPropForm.price.value) },
                images: imagesArray,
                address: hostPropForm.address.value.trim(),
                city: hostPropForm.city.value.trim(),
                state: hostPropForm.state.value.trim(),
                country: hostPropForm.country.value.trim()
            };

            try {
                if (id) {
                    await RoomBnbAPI.updateProperty(id, propertyData);
                    RoomBnbAPI.showToast("Listing updated!");
                } else {
                    await RoomBnbAPI.createProperty(propertyData);
                    RoomBnbAPI.showToast("New Listing created successfully!");
                }
                document.getElementById("host-property-modal").close();
                window.renderHostProperties(session);
                window.renderHostAnalytics(session);
            } catch (err) {
                RoomBnbAPI.showToast(err.message, "error");
            }
        };
    }

    // Attach local photos handler
    const photoUploadInput = document.getElementById("host-property-photo-upload");
    if (photoUploadInput && hostPropForm) {
        photoUploadInput.onchange = async () => {
            const files = photoUploadInput.files;
            if (!files || files.length === 0) return;
            
            let loadedCount = 0;
            const currentUrls = hostPropForm.imagesList.value.split("\n").map(u => u.trim()).filter(u => u.length > 0);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentUrls.push(e.target.result);
                    loadedCount++;
                    if (loadedCount === files.length) {
                        hostPropForm.imagesList.value = currentUrls.join("\n");
                        RoomBnbAPI.showToast(`Successfully attached ${files.length} photo(s)!`);
                        photoUploadInput.value = ""; // reset file input
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Click Delegation inside Host Panel
    document.addEventListener("click", async (event) => {
        // Open create property modal
        if (event.target.id === "host-add-property-btn") {
            const modal = document.getElementById("host-property-modal");
            const form = modal ? modal.querySelector("[data-host-property-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("host-modal-title").textContent = "Create New Listing";
                modal.showModal();
            }
        }

        // Open edit property modal
        const hostEditPropId = event.target.dataset.editPropertyId;
        if (hostEditPropId) {
            try {
                const properties = await RoomBnbAPI.getProperties({ checkAdmin: true });
                const property = properties.find(p => p.id === hostEditPropId);
                const modal = document.getElementById("host-property-modal");
                const form = modal ? modal.querySelector("[data-host-property-form]") : null;
                if (property && form) {
                    form.id.value = property.id;
                    form.name.value = property.name;
                    form.type.value = property.type;
                    form.price.value = property.price;
                    form.capacity.value = property.capacity;
                    form.bedrooms.value = property.bedrooms;
                    form.bathrooms.value = property.bathrooms;
                    form.description.value = property.description;
                    form.rules.value = property.rules.join(", ");
                    
                    form.address.value = property.address !== undefined ? property.address : "";
                    form.city.value = property.city !== undefined ? property.city : "";
                    form.state.value = property.state !== undefined ? property.state : "";
                    form.country.value = property.country !== undefined ? property.country : "";
                    
                    form.latitude.value = property.latitude !== undefined ? property.latitude : "";
                    form.longitude.value = property.longitude !== undefined ? property.longitude : "";
                    form.cleaningFee.value = property.cleaningFee !== undefined ? property.cleaningFee : "";
                    form.weekendPrice.value = (property.seasonalPricing && property.seasonalPricing.weekend) ? property.seasonalPricing.weekend : "";
                    form.imagesList.value = (property.images && Array.isArray(property.images)) ? property.images.join("\n") : "";

                    modal.querySelectorAll("#host-property-amenities input").forEach(cb => {
                        cb.checked = property.amenities.includes(cb.value);
                    });

                    document.getElementById("host-modal-title").textContent = "Edit Property Listing";
                    modal.showModal();
                }
            } catch (err) {
                RoomBnbAPI.showToast("Failed to fetch property details.", "error");
            }
        }

        // Delete property listing
        const hostDeletePropId = event.target.dataset.deletePropertyId;
        if (hostDeletePropId) {
            if (confirm("Are you sure you want to delete your listed property?")) {
                try {
                    await RoomBnbAPI.deleteProperty(hostDeletePropId);
                    window.renderHostProperties(session);
                    window.renderHostAnalytics(session);
                    RoomBnbAPI.showToast("Listing deleted successfully.");
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to delete property listing.", "error");
                }
            }
        }

        // Approve / decline bookings requests
        const hostBookingAction = event.target.dataset.hostAction;
        const hostBookingId = event.target.dataset.bookingId;
        if (hostBookingAction && hostBookingId) {
            try {
                await RoomBnbAPI.updateBookingStatus(hostBookingId, hostBookingAction);
                window.renderHostBookings(session);
                window.renderHostAnalytics(session);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to update booking status.", "error");
            }
        }

        // Messaging Guest channel initiation
        const chatGuestId = event.target.dataset.chatWithGuest;
        const chatPropName = event.target.dataset.propName;
        if (chatGuestId && chatPropName) {
            try {
                const convo = await RoomBnbAPI.initiateChat(chatGuestId, session.id, chatPropName);
                window.activeConvoId = convo.id;
                
                // Click Chat tab menu
                const tabMenuItem = document.querySelector('[data-tab-target="host-chat"]');
                if (tabMenuItem) {
                    tabMenuItem.click();
                }
            } catch (err) {
                RoomBnbAPI.showToast("Failed to start chat session.", "error");
            }
        }
    });
};

window.renderHostAnalytics = async function(session) {
    try {
        const properties = await RoomBnbAPI.getProperties({ checkAdmin: true });
        const hostListings = properties.filter(p => p.hostId === session.id);
        const hostListingIds = hostListings.map(l => l.id);
        
        const bookings = await RoomBnbAPI.getBookings("host", session.id);

        const paidBookings = bookings.filter(b => b.status === "Paid" || b.status === "Approved" || b.status === "Completed");
        
        let grossEarnings = 0;
        let commission = 0;
        paidBookings.forEach(b => {
            grossEarnings += b.totalPrice;
            commission += (b.commission !== undefined ? b.commission : Math.round(b.basePrice * 0.1));
        });
        const netEarnings = grossEarnings - commission;

        window.setText("#host-total-earnings", `$${netEarnings.toLocaleString()}`);
        window.setText("#host-active-bookings-count", bookings.filter(b => b.status === "Paid" || b.status === "Approved").length);
        window.setText("#host-total-listings-count", hostListings.length);
    } catch (e) {
        console.error("Failed to load analytics details", e);
    }
};

window.renderHostProperties = async function(session) {
    const grid = document.querySelector("[data-host-properties-list]");
    if (grid) {
        try {
            const properties = await RoomBnbAPI.getProperties({ checkAdmin: true });
            const hostListings = properties.filter(p => p.hostId === session.id);

            grid.innerHTML = hostListings.length
                ? hostListings.map(property => {
                    const bgImage = (property.images && property.images.length > 0) ? property.images[0] : '';
                    const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"` : '';
                    return `
                    <article class="property-card" data-id="${property.id}">
                        <div class="property-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" ${styleAttr}>
                            <span class="property-card-badge">${RoomBnbAPI.escapeHtml(property.type)}</span>
                        </div>
                        <div class="property-info">
                            <div class="property-top">
                                <h3>${RoomBnbAPI.escapeHtml(property.name)}</h3>
                                <span class="rating">${Number(property.rating || 0).toFixed(2)}</span>
                            </div>
                            <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
                            <div style="display:flex; gap:12px; font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-bottom:12px;">
                                <span>👥 ${property.capacity} guests</span>
                                <span>🛏️ ${property.bedrooms} beds</span>
                                <span>🛁 ${property.bathrooms} baths</span>
                            </div>
                            <div class="property-price-box">
                                <div class="price">$${property.price} <span>/ night</span></div>
                                <div class="card-actions">
                                    <button class="mini-button" type="button" data-edit-property-id="${property.id}">Edit</button>
                                    <button class="mini-button danger-button" type="button" data-delete-property-id="${property.id}">Delete</button>
                                </div>
                            </div>
                        </div>
                    </article>
                    `;
                }).join("")
                : `<div style="grid-column: span 3; text-align:center; padding:40px; color:var(--text-muted);">
                     <h3>You haven't listed any stays yet.</h3>
                     <p>Click "Create New Listing" to list your first place.</p>
                   </div>`;
        } catch (e) {
            grid.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading stays.</p>`;
        }
    }
};

window.renderHostBookings = async function(session) {
    const list = document.querySelector("[data-host-bookings-list]");
    if (list) {
        try {
            const bookings = await RoomBnbAPI.getBookings("host", session.id);
            const properties = await RoomBnbAPI.getProperties({ checkAdmin: true });

            list.innerHTML = bookings.length
                ? bookings.map(booking => {
                    const property = properties.find(l => l.id === booking.propertyId);
                    const statusLower = booking.status.toLowerCase();
                    const controls = booking.status === "Pending" ? `
                        <div class="request-card-actions">
                            <button class="mini-button" type="button" style="background:var(--success); color:#fff; border-color:var(--success);" data-host-action="Approved" data-booking-id="${booking.id}">Approve</button>
                            <button class="mini-button danger-button" type="button" data-host-action="Rejected" data-booking-id="${booking.id}">Reject</button>
                        </div>
                    ` : "";

                    return `
                        <article class="request-card">
                            <div class="request-card-info">
                                <h3>${RoomBnbAPI.escapeHtml(property?.name || "Deleted Property")}</h3>
                                <p style="font-weight:700; font-size:0.9rem; color:var(--text-muted);">
                                    Guest: ${RoomBnbAPI.escapeHtml(booking.customerName)} &bull; ${booking.checkIn} to ${booking.checkOut}
                                </p>
                                <p style="font-size:0.85rem; color:var(--text-muted);">
                                    Total Price: $${booking.totalPrice} ($${booking.basePrice} base rate) &bull; ${booking.guestsCount} guests
                                </p>
                                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Request Date: ${booking.createdAt}</p>
                            </div>
                            <div>
                                <span class="status-pill ${statusLower}">${booking.status}</span>
                                <div style="margin-top:10px; display:flex; gap:10px; align-items:center;">
                                    ${controls}
                                    <button class="mini-button" type="button" data-chat-with-guest="${booking.customerId}" data-prop-name="${property?.name}">Message Guest</button>
                                </div>
                            </div>
                        </article>
                    `;
                }).join("")
                : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
                     <h3>No booking requests for your properties yet.</h3>
                   </div>`;
        } catch (e) {
            list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading booking requests.</p>`;
        }
    }
};

window.renderHostFinancials = async function(session) {
    try {
        const bookings = await RoomBnbAPI.getBookings("host", session.id);
        const paidBookings = bookings.filter(b => b.status === "Paid" || b.status === "Approved" || b.status === "Completed");
        
        let grossEarnings = 0;
        let commission = 0;
        paidBookings.forEach(b => {
            grossEarnings += b.totalPrice;
            commission += (b.commission !== undefined ? b.commission : Math.round(b.basePrice * 0.1));
        });
        const netEarnings = grossEarnings - commission;

        const transactions = await RoomBnbAPI.getHostTransactions(session.id);
        const withdrawals = transactions.filter(t => t.type === "Withdrawal").reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = netEarnings - withdrawals;

        window.setText("#host-wallet-balance", `$${currentBalance.toLocaleString()}`);
        window.setText("#host-lifetime-revenue", `$${netEarnings.toLocaleString()}`);
        window.setText("#host-withdrawn-amount", `$${withdrawals.toLocaleString()}`);

        const tbody = document.getElementById("host-financials-tbody");
        if (tbody) {
            tbody.innerHTML = transactions.length
                ? transactions.map(t => `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:10px 0; font-family:monospace; font-size:0.82rem;">${t.id}</td>
                        <td style="padding:10px 0;"><span class="status-pill ${t.type === 'Payment' ? 'approved' : 'pending'}">${t.type}</span></td>
                        <td style="padding:10px 0; font-weight:800; color:${t.type === 'Payment' ? 'var(--success)' : 'var(--accent)'};">${t.type === 'Payment' ? '+' : '-'}$${t.amount.toLocaleString()}</td>
                        <td style="padding:10px 0;">${RoomBnbAPI.escapeHtml(t.paymentMethod || 'N/A')}</td>
                        <td style="padding:10px 0;"><span class="status-pill approved">${t.status}</span></td>
                        <td style="padding:10px 0; font-size:0.8rem; color:var(--text-muted);">${t.createdAt}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-muted);">No financial logs found.</td></tr>`;
        }
    } catch (err) {
        console.error("Error rendering financials:", err);
    }
};

window.renderHostReviews = async function(session) {
    const container = document.getElementById("host-reviews-container");
    if (!container) return;

    try {
        const properties = await RoomBnbAPI.getProperties({ checkAdmin: true });
        const hostListings = properties.filter(p => p.hostId === session.id);
        
        let reviewsHtml = "";
        
        for (const prop of hostListings) {
            if (prop.reviews && prop.reviews.length > 0) {
                for (const r of prop.reviews) {
                    const replyFormHtml = r.replyText
                        ? `<div style="background:var(--secondary-light); border-left:4px solid var(--accent); padding:12px; border-radius:4px; margin-top:10px;">
                             <strong style="font-size:0.85rem; display:block; margin-bottom:4px; color:var(--accent);">Your Reply:</strong>
                             <p style="margin:0; font-size:0.9rem;">${RoomBnbAPI.escapeHtml(r.replyText)}</p>
                           </div>`
                        : `<form class="review-reply-form" data-review-id="${r.id}" style="margin-top:12px; display:flex; gap:10px;">
                             <input name="replyText" type="text" placeholder="Type response to this guest review..." required style="flex-grow:1; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); font:inherit; font-size:0.85rem;">
                             <button type="submit" class="mini-button" style="margin:0; background:var(--accent); color:#fff; border-color:var(--accent);">Reply</button>
                           </form>`;

                    reviewsHtml += `
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; box-shadow:var(--shadow-sm); text-align:left;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <div>
                                    <strong style="font-size:1rem;">${RoomBnbAPI.escapeHtml(r.reviewerName)}</strong>
                                    <span style="font-size:0.8rem; color:var(--text-muted); margin-left:8px;">on ${RoomBnbAPI.escapeHtml(prop.name)} &bull; ${r.date}</span>
                                </div>
                                <span style="color:var(--accent); font-weight:800;">★ ${r.rating}</span>
                            </div>
                            <p style="margin:0 0 10px 0; color:var(--text); font-size:0.92rem; line-height:1.5;">${RoomBnbAPI.escapeHtml(r.text)}</p>
                            ${replyFormHtml}
                        </div>
                    `;
                }
            }
        }

        container.innerHTML = reviewsHtml || `<div style="padding:40px; text-align:center; color:var(--text-muted);">No guest reviews received yet.</div>`;

        container.querySelectorAll(".review-reply-form").forEach(form => {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const reviewId = form.dataset.reviewId;
                const replyText = form.replyText.value.trim();

                try {
                    await RoomBnbAPI.submitReviewReply(reviewId, replyText);
                    RoomBnbAPI.showToast("Reply submitted successfully!");
                    window.renderHostReviews(session);
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to submit reply.", "error");
                }
            };
        });

    } catch (err) {
        console.error("Error rendering reviews:", err);
    }
};
