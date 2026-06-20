window.initCustomerView = function(session) {
    window.renderCustomerProperties();
    window.renderCustomerRequests(session);
    window.renderWishlistTab();
    window.renderProfileDetails(session);
    window.initNotificationsBell(session);

    // Profile photo upload trigger
    const picTrigger = document.getElementById("trigger-pic-upload-btn");
    const picFile = document.getElementById("profile-pic-upload");
    if (picTrigger && picFile) {
        picTrigger.onclick = () => picFile.click();
        picFile.onchange = () => {
            if (picFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        await RoomBnbAPI.updateUser(session.id, { profilePic: e.target.result });
                        window.renderProfileDetails(session);
                        RoomBnbAPI.showToast("Profile image updated successfully!");
                    } catch (err) {
                        RoomBnbAPI.showToast("Failed to upload profile picture.", "error");
                    }
                };
                reader.readAsDataURL(picFile.files[0]);
            }
        };
    }

    // Personal details form submission
    const profileUpdateForm = document.getElementById("profile-update-form");
    if (profileUpdateForm) {
        profileUpdateForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = profileUpdateForm.name.value.trim();
            const phone = profileUpdateForm.phone.value.trim();
            const address = profileUpdateForm.address.value.trim();
            
            try {
                await RoomBnbAPI.updateUser(session.id, { name, phone, address });
                RoomBnbAPI.showToast("Personal profile details updated.");
                window.activeSession.name = name;
                RoomBnbAPI.saveSession(window.activeSession);
                window.updateNavbar(window.activeSession);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to update profile info.", "error");
            }
        };
    }

    // Password Update form submission
    const profilePasswordForm = document.getElementById("profile-password-form");
    if (profilePasswordForm) {
        profilePasswordForm.onsubmit = async (e) => {
            e.preventDefault();
            const oldPass = profilePasswordForm.oldPassword.value;
            const newPass = profilePasswordForm.newPassword.value;
            const errorEl = document.getElementById("profile-pass-error");
            if (errorEl) errorEl.textContent = "";

            try {
                // Verify old password by logging in
                const user = await RoomBnbAPI.getUser(session.id);
                await RoomBnbAPI.login(user.email, oldPass, session.role);
                
                // Update password
                await RoomBnbAPI.updateUser(session.id, { password: newPass });
                profilePasswordForm.reset();
                RoomBnbAPI.showToast("Password updated successfully!");
            } catch (err) {
                if (errorEl) errorEl.textContent = "Incorrect current password.";
            }
        };
    }

    // Government ID verification upload
    const idTrigger = document.getElementById("trigger-id-upload-btn");
    const idFile = document.getElementById("id-card-upload");
    if (idTrigger && idFile) {
        idTrigger.onclick = () => idFile.click();
        idFile.onchange = () => {
            if (idFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        await RoomBnbAPI.updateUser(session.id, { verified: true });
                        window.renderProfileDetails(session);
                        RoomBnbAPI.showToast("Government ID received. User identity verified!");
                    } catch (err) {
                        RoomBnbAPI.showToast("Failed to upload ID document.", "error");
                    }
                };
                reader.readAsDataURL(idFile.files[0]);
            }
        };
    }

    // Global Click Delegation inside Customer dashboard
    document.addEventListener("click", async (event) => {
        // Cancel trip request
        const cancelBookingId = event.target.dataset.cancelBookingId;
        if (cancelBookingId) {
            if (confirm("Are you sure you want to cancel this booking stay reservation?")) {
                try {
                    await RoomBnbAPI.updateBookingStatus(cancelBookingId, "Cancelled");
                    RoomBnbAPI.showToast("Booking cancelled successfully.");
                    window.renderCustomerRequests(session);
                    window.renderCustomerProperties();
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to cancel reservation.", "error");
                }
            }
        }

        // Print Invoice Receipt
        const invoiceBookingId = event.target.dataset.invoiceBookingId;
        if (invoiceBookingId) {
            window.printInvoiceForBooking(invoiceBookingId);
        }

        // Rebook property
        const rebookPropId = event.target.dataset.rebookPropertyId;
        if (rebookPropId) {
            window.openPropertyDetailsModal(rebookPropId);
        }

        // Report Review
        const reportPropId = event.target.dataset.reportReviewPropId;
        const reportRevId = event.target.dataset.reportReviewId;
        if (reportPropId && reportRevId) {
            try {
                await RoomBnbAPI.reportReview(reportRevId);
                RoomBnbAPI.showToast("Review reported to platform moderation.");
                window.openPropertyDetailsModal(reportPropId);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to report review.", "error");
            }
        }
    });

    // Write review photo selector click label
    const trigRevPhoto = document.getElementById("trigger-review-photo-btn");
    const revPhotoFile = document.getElementById("review-photo-upload");
    if (trigRevPhoto && revPhotoFile) {
        trigRevPhoto.onclick = () => revPhotoFile.click();
        revPhotoFile.onchange = () => {
            const label = document.getElementById("review-photo-filename-label");
            if (label && revPhotoFile.files.length > 0) {
                label.textContent = revPhotoFile.files[0].name;
            }
        };
    }

    // Review form submit handler
    const reviewForm = document.getElementById("review-submit-form");
    if (reviewForm) {
        reviewForm.onsubmit = window.submitReviewForm;
    }

    // Support Desk Tickets Init
    const ticketTabBtn = document.querySelector('[data-tab-target="customer-tickets"]');
    if (ticketTabBtn) {
        ticketTabBtn.onclick = () => {
            window.activeTicketId = null;
            const historyPane = document.getElementById("ticket-chat-history");
            const headerTitle = document.getElementById("ticket-chat-header-name");
            const msgInput = document.getElementById("ticket-chat-message-input");
            const sendBtn = document.getElementById("ticket-chat-send-btn");

            if (historyPane) {
                historyPane.innerHTML = `
                    <div style="margin:auto; text-align:center; color:var(--text-muted);">
                        <span style="font-size:3rem; display:block; margin-bottom:12px;">🛠️</span>
                        <span>Pick a support ticket on the left to view messages.</span>
                    </div>
                `;
            }
            if (headerTitle) headerTitle.textContent = "Select a ticket to view conversation";
            if (msgInput && sendBtn) {
                msgInput.disabled = true;
                sendBtn.disabled = true;
                msgInput.value = "";
            }
            window.renderTicketsList(session);
        };
    }

    const raiseModal = document.getElementById("raise-ticket-modal");
    const createBtn = document.getElementById("create-ticket-btn");
    const ticketForm = document.getElementById("ticket-submit-form");
    if (createBtn && raiseModal) {
        createBtn.onclick = () => {
            if (ticketForm) ticketForm.reset();
            raiseModal.showModal();
        };
    }

    if (ticketForm && raiseModal) {
        ticketForm.onsubmit = async (e) => {
            e.preventDefault();
            const type = ticketForm.type.value;
            const subject = ticketForm.subject.value.trim();
            const description = ticketForm.description.value.trim();

            try {
                await RoomBnbAPI.createTicket(session.id, session.role, type, subject, description);
                raiseModal.close();
                RoomBnbAPI.showToast("Support ticket raised successfully!");
                window.renderTicketsList(session);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to file support ticket.", "error");
            }
        };
    }

    const ticketSendBtn = document.getElementById("ticket-chat-send-btn");
    const ticketMsgInput = document.getElementById("ticket-chat-message-input");
    if (ticketSendBtn && ticketMsgInput) {
        ticketSendBtn.onclick = () => window.sendTicketMessage();
        ticketMsgInput.onkeypress = (e) => {
            if (e.key === "Enter") window.sendTicketMessage();
        };
    }
};

window.renderCustomerProperties = async function() {
    const list = document.querySelector("#customer-properties-pane [data-property-list]");
    if (list) {
        try {
            const properties = await RoomBnbAPI.getProperties();
            let favs = [];
            if (window.activeSession) {
                favs = await RoomBnbAPI.getFavorites(window.activeSession.id);
            }

            list.innerHTML = properties.map(property => {
                const isFav = favs.includes(property.id) ? "active" : "";
                const bgImage = (property.images && property.images.length > 0) ? property.images[0] : '';
                const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"` : '';
                return `
                    <article class="property-card" draggable="true" data-id="${property.id}">
                        <div class="property-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" ${styleAttr}>
                            <span class="property-card-badge">${RoomBnbAPI.escapeHtml(property.type)}</span>
                            <button class="property-card-fav ${isFav}" data-fav-toggle-id="${property.id}">❤️</button>
                        </div>
                        <div class="property-info">
                            <div class="property-top">
                                <h3>${RoomBnbAPI.escapeHtml(property.name)}</h3>
                                <span class="rating">${Number(property.rating).toFixed(2)}</span>
                            </div>
                            <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
                            <div style="display:flex; gap:12px; font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-bottom:12px;">
                                <span>👥 ${property.capacity} guests</span>
                                <span>🛏️ ${property.bedrooms} beds</span>
                                <span>🛁 ${property.bathrooms} baths</span>
                            </div>
                            <div class="property-price-box">
                                <div class="price">$${Number(property.price).toLocaleString()} <span>/ night</span></div>
                                <button class="mini-button" type="button" data-view-property="${property.id}">Book Stay</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join("");
        } catch (e) {
            list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading stays.</p>`;
        }
    }
};

window.renderCustomerRequests = async function(session) {
    const requestsList = document.querySelector("[data-customer-requests]");
    if (requestsList) {
        try {
            const bookings = await RoomBnbAPI.getBookings("customer", session.id);
            const properties = await RoomBnbAPI.getProperties();

            requestsList.innerHTML = bookings.length
                ? bookings.map(booking => {
                    const property = properties.find(item => item.id === booking.propertyId);
                    const statusLower = booking.status.toLowerCase();
                    
                    const showCancel = ["pending", "approved", "paid"].includes(statusLower);
                    const showReview = ["paid", "approved", "completed"].includes(statusLower);

                    return `
                        <article class="request-card">
                            <div class="request-card-info">
                                <h3>${RoomBnbAPI.escapeHtml(property?.name || "Deleted Property")}</h3>
                                <p style="font-weight:700; font-size:0.9rem; color:var(--text-muted);">
                                    Dates: ${booking.checkIn} to ${booking.checkOut} (${booking.nights} nights) &bull; ${booking.guestsCount} guests
                                </p>
                                <p style="font-size:0.82rem; color:var(--text-muted);">
                                    Price calculated: Base $${booking.basePrice} | Tax $${booking.tax} | Fee $${booking.serviceFee} | Total: <strong style="color:var(--accent);">$${booking.totalPrice}</strong>
                                </p>
                                <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Requested on ${booking.createdAt}</p>
                            </div>
                            <div>
                                <span class="status-pill ${statusLower}">${booking.status}</span>
                                <div class="request-card-actions" style="margin-top:10px;">
                                    ${showCancel ? `<button class="mini-button danger-button" type="button" data-cancel-booking-id="${booking.id}">Cancel Trip</button>` : ""}
                                    <button class="mini-button" type="button" data-invoice-booking-id="${booking.id}">Invoice 📄</button>
                                    ${showReview ? `<button class="mini-button" type="button" style="border-color:var(--accent); color:var(--accent);" data-review-booking-id="${booking.id}" data-review-property-id="${booking.propertyId}">Write Review</button>` : ""}
                                    ${!showCancel ? `<button class="mini-button" type="button" style="border-color:var(--accent); color:var(--accent);" data-rebook-property-id="${booking.propertyId}">Rebook Stay</button>` : ""}
                                </div>
                            </div>
                        </article>
                    `;
                }).join("")
                : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
                     <h3>No requests submitted.</h3>
                     <p>Explore properties and send a booking request.</p>
                   </div>`;
        } catch (e) {
            requestsList.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading reservations.</p>`;
        }
    }
};

window.renderWishlistTab = async function() {
    const list = document.querySelector("[data-customer-favorites-list]");
    if (!list) return;

    try {
        const favIds = await RoomBnbAPI.getFavorites(window.activeSession.id);
        const properties = await RoomBnbAPI.getProperties();
        const favProperties = properties.filter(p => favIds.includes(p.id));

        list.innerHTML = favProperties.length
            ? favProperties.map(property => {
                const bgImage = (property.images && property.images.length > 0) ? property.images[0] : '';
                const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"` : '';
                return `
                <article class="property-card" data-id="${property.id}">
                    <div class="property-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" ${styleAttr}>
                        <span class="property-card-badge">${RoomBnbAPI.escapeHtml(property.type)}</span>
                        <button class="property-card-fav active" data-fav-toggle-id="${property.id}">❤️</button>
                    </div>
                    <div class="property-info">
                        <div class="property-top">
                            <h3>${RoomBnbAPI.escapeHtml(property.name)}</h3>
                            <span class="rating">${Number(property.rating).toFixed(2)}</span>
                        </div>
                        <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
                        <div class="property-price-box">
                            <div class="price">$${property.price} <span>/ night</span></div>
                            <button class="mini-button" type="button" data-view-property="${property.id}">Book Now</button>
                        </div>
                    </div>
                </article>
            `; }).join("")
            : `<div style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-muted);">
                 <h3>Your wishlist is empty.</h3>
                 <p>Click the heart icon on properties to save them here.</p>
               </div>`;
    } catch (e) {
        list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading wishlist.</p>`;
    }
};

window.renderProfileDetails = async function(session) {
    try {
        const user = await RoomBnbAPI.getUser(session.id);
        
        const form = document.getElementById("profile-update-form");
        if (form) {
            form.name.value = user.name || "";
            form.phone.value = user.phone || "";
            form.address.value = user.address || "";
        }

        const avatarView = document.getElementById("profile-avatar-view");
        if (avatarView) {
            if (user.profilePic) {
                avatarView.style.backgroundImage = `url('${user.profilePic}')`;
            } else {
                avatarView.style.backgroundImage = "none";
                avatarView.style.backgroundColor = "var(--border)";
            }
        }

        const unverifiedBox = document.getElementById("identity-unverified-box");
        const verifiedBox = document.getElementById("identity-verified-box");
        if (unverifiedBox && verifiedBox) {
            if (user.verified) {
                unverifiedBox.style.display = "none";
                verifiedBox.style.display = "flex";
            } else {
                unverifiedBox.style.display = "block";
                verifiedBox.style.display = "none";
            }
        }
    } catch (e) {
        console.error("Failed to load user profile", e);
    }
};

window.renderTicketsList = async function(session) {
    const list = document.getElementById("tickets-sidebar-list");
    if (!list) return;
    try {
        const tickets = await RoomBnbAPI.getTickets(session.id, session.role);
        list.innerHTML = tickets.length
            ? tickets.map(ticket => {
                const activeClass = ticket.id === window.activeTicketId ? "active" : "";
                const statusColor = ticket.status === "Open" ? "color: var(--success);" : "color: var(--text-muted);";
                return `
                    <div class="chat-thread-item ${activeClass}" data-ticket-id="${ticket.id}" style="padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; display: flex; flex-direction: column; gap: 4px; background: var(--surface);">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-weight:700; font-size:0.9rem;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${RoomBnbAPI.escapeHtml(ticket.subject)}</span>
                            <span style="${statusColor} font-size:0.75rem; font-weight:800;">${ticket.status}</span>
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(ticket.type)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Created: ${ticket.createdAt.split(",")[0]}</div>
                    </div>
                `;
            }).join("")
            : `<div style="padding:24px; color:var(--text-muted); text-align:center; font-size:0.88rem;">No support tickets filed yet.</div>`;

        list.querySelectorAll(".chat-thread-item").forEach(el => {
            el.onclick = () => {
                window.activeTicketId = el.dataset.ticketId;
                window.renderTicketMessages(window.activeTicketId);
                list.querySelectorAll(".chat-thread-item").forEach(item => item.classList.remove("active"));
                el.classList.add("active");
            };
        });
    } catch (err) {
        console.error("Error loading tickets list:", err);
    }
};

window.renderTicketMessages = async function(ticketId) {
    if (!ticketId) return;

    try {
        const messages = await RoomBnbAPI.getTicketMessages(ticketId);
        const tickets = await RoomBnbAPI.getTickets(window.activeSession.id, window.activeSession.role);
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const historyPane = document.getElementById("ticket-chat-history");
        const headerTitle = document.getElementById("ticket-chat-header-name");
        const msgInput = document.getElementById("ticket-chat-message-input");
        const sendBtn = document.getElementById("ticket-chat-send-btn");
        const closeBtn = document.getElementById("close-ticket-action-btn");

        const isOpen = ticket.status === "Open";

        if (msgInput && sendBtn) {
            msgInput.disabled = !isOpen;
            sendBtn.disabled = !isOpen;
            msgInput.placeholder = isOpen ? "Type a message to support..." : "This ticket is closed.";
        }

        if (closeBtn) {
            closeBtn.style.display = isOpen ? "block" : "none";
            closeBtn.onclick = async () => {
                if (confirm("Are you sure you want to close this ticket? This cannot be undone.")) {
                    try {
                        await RoomBnbAPI.closeTicket(ticketId);
                        RoomBnbAPI.showToast("Ticket closed successfully.");
                        window.renderTicketsList(window.activeSession);
                        window.renderTicketMessages(ticketId);
                    } catch (err) {
                        RoomBnbAPI.showToast("Failed to close ticket.", "error");
                    }
                }
            };
        }

        if (headerTitle) {
            headerTitle.innerHTML = `
                <div>
                    <div style="font-weight: 900; font-size:1.05rem;">[${ticket.type}] ${RoomBnbAPI.escapeHtml(ticket.subject)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-top: 4px;">${RoomBnbAPI.escapeHtml(ticket.description)}</div>
                </div>
            `;
            if (closeBtn) headerTitle.appendChild(closeBtn);
        }

        if (historyPane) {
            historyPane.innerHTML = messages.length
                ? messages.map(m => {
                    const directionClass = m.senderId === window.activeSession.id ? "sent" : "received";
                    return `
                        <div class="chat-bubble ${directionClass}">
                            <div>${RoomBnbAPI.escapeHtml(m.content)}</div>
                            <span class="chat-bubble-time">${m.timestamp.split(",")[1] || m.timestamp}</span>
                        </div>
                    `;
                }).join("")
                : `<div style="margin:auto; text-align:center; color:var(--text-muted); font-size:0.9rem;">No messages in this ticket yet.</div>`;
            
            historyPane.scrollTop = historyPane.scrollHeight;
        }
    } catch (err) {
        console.error("Error loading ticket history:", err);
    }
};

window.sendTicketMessage = async function() {
    const ticketId = window.activeTicketId;
    const msgInput = document.getElementById("ticket-chat-message-input");
    if (!ticketId || !msgInput) return;
    const content = msgInput.value.trim();
    if (!content) return;

    try {
        await RoomBnbAPI.sendTicketMessage(ticketId, window.activeSession.id, content);
        msgInput.value = "";
        window.renderTicketMessages(ticketId);
    } catch (err) {
        RoomBnbAPI.showToast("Failed to send message.", "error");
    }
};
