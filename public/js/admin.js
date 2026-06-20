window.initAdminView = async function(session) {
    // Fill site copywriting form fields
    const siteForm = document.querySelector("[data-site-form]");
    if (siteForm && window.appConfig) {
        siteForm.siteName.value = window.appConfig.siteName || "RoomBnB";
        siteForm.heroEyebrow.value = window.appConfig.hero?.eyebrow || "";
        siteForm.heroTitle.value = window.appConfig.hero?.title || "";
        siteForm.heroDescription.value = window.appConfig.hero?.description || "";
    }

    window.renderAdminCopyLists();
    window.renderAdminPropertiesGrid();
    window.renderAdminRequests();
    window.renderAdminUsersList();
    window.renderAdminReportedReviews();
    window.renderAdminCoupons();

    // Tab clicks listeners
    const analyticsTab = document.querySelector('[data-tab-target="admin-analytics"]');
    if (analyticsTab) {
        analyticsTab.onclick = () => window.loadAdminAnalytics();
    }

    const couponsTab = document.querySelector('[data-tab-target="admin-coupons"]');
    if (couponsTab) {
        couponsTab.onclick = () => window.renderAdminCoupons();
    }

    const ticketsTab = document.querySelector('[data-tab-target="admin-tickets"]');
    if (ticketsTab) {
        ticketsTab.onclick = () => window.renderAdminTicketsList();
    }

    const cmsTab = document.querySelector('[data-tab-target="admin-cms"]');
    if (cmsTab) {
        cmsTab.onclick = () => {
            // Load CMS details
            const cmsForm = document.getElementById("admin-cms-form");
            if (cmsForm && window.appConfig.cms) {
                cmsForm.aboutUs.value = window.appConfig.cms.aboutUs || "";
                cmsForm.contactUs.value = window.appConfig.cms.contactUs || "";
                cmsForm.terms.value = window.appConfig.cms.terms || "";
                cmsForm.privacy.value = window.appConfig.cms.privacy || "";
            }
        };
    }

    // Load initial analytics
    window.loadAdminAnalytics();

    // Commission Form
    const commForm = document.getElementById("admin-commission-form");
    if (commForm) {
        commForm.rate.value = window.appConfig.commissionRate !== undefined ? window.appConfig.commissionRate : 10;
        commForm.onsubmit = async (e) => {
            e.preventDefault();
            const rate = Number(commForm.rate.value);
            try {
                await RoomBnbAPI.updateCommission(rate);
                window.appConfig.commissionRate = rate;
                RoomBnbAPI.showToast("Commission rate updated!");
            } catch (err) {
                RoomBnbAPI.showToast("Failed to save commission rate.", "error");
            }
        };
    }

    // CMS Form
    const cmsForm = document.getElementById("admin-cms-form");
    if (cmsForm) {
        cmsForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                aboutUs: cmsForm.aboutUs.value.trim(),
                contactUs: cmsForm.contactUs.value.trim(),
                terms: cmsForm.terms.value.trim(),
                privacy: cmsForm.privacy.value.trim()
            };
            try {
                await RoomBnbAPI.updateConfig('cms', data);
                window.appConfig.cms = data;
                RoomBnbAPI.showToast("CMS configurations copywriting saved!");
            } catch(err) {
                RoomBnbAPI.showToast("Failed to save CMS copy.", "error");
            }
        };
    }

    // Coupons Modal Form
    const couponModal = document.getElementById("admin-coupon-modal");
    const createCouponBtn = document.getElementById("admin-create-coupon-btn");
    const couponForm = document.getElementById("admin-coupon-form");

    if (createCouponBtn && couponModal) {
        createCouponBtn.onclick = () => {
            if (couponForm) {
                couponForm.reset();
                couponForm.code.readOnly = false;
            }
            document.getElementById("coupon-modal-title").textContent = "Create Promo Coupon";
            couponModal.showModal();
        };
    }

    if (couponForm && couponModal) {
        couponForm.onsubmit = async (e) => {
            e.preventDefault();
            const code = couponForm.code.value.toUpperCase().trim();
            const discountType = couponForm.discountType.value;
            const value = Number(couponForm.value.value);
            const description = couponForm.description.value.trim();
            const active = couponForm.active.checked;

            try {
                if (couponForm.code.readOnly) {
                    await RoomBnbAPI.updateCoupon(code, { discountType, value, active, description });
                    RoomBnbAPI.showToast("Promo Coupon updated!");
                } else {
                    await RoomBnbAPI.createCoupon({ code, discountType, value, active, description });
                    RoomBnbAPI.showToast("Promo Coupon created!");
                }
                couponModal.close();
                window.renderAdminCoupons();
            } catch (err) {
                RoomBnbAPI.showToast(err.message, "error");
            }
        };
    }

    // CSV and Print triggers
    const exportCsvBtn = document.getElementById("export-bookings-csv-btn");
    if (exportCsvBtn) {
        exportCsvBtn.onclick = () => window.exportBookingsToCSV();
    }

    const printReportBtn = document.getElementById("print-analytics-report-btn");
    if (printReportBtn) {
        printReportBtn.onclick = () => window.print();
    }

    // Ticket reply message events
    const ticketSendBtn = document.getElementById("admin-ticket-chat-send-btn");
    const ticketMsgInput = document.getElementById("admin-ticket-chat-message-input");
    if (ticketSendBtn && ticketMsgInput) {
        ticketSendBtn.onclick = () => window.sendAdminTicketMessage();
        ticketMsgInput.onkeypress = (e) => {
            if (e.key === "Enter") window.sendAdminTicketMessage();
        };
    }

    // Copywriting submit handler
    if (siteForm) {
        siteForm.onsubmit = async (e) => {
            e.preventDefault();
            const siteName = siteForm.siteName.value.trim();
            const heroEyebrow = siteForm.heroEyebrow.value.trim();
            const heroTitle = siteForm.heroTitle.value.trim();
            const heroDescription = siteForm.heroDescription.value.trim();

            try {
                await RoomBnbAPI.updateSiteConfig({ siteName, heroEyebrow, heroTitle, heroDescription });
                window.appConfig.siteName = siteName;
                window.appConfig.hero = { eyebrow: heroEyebrow, title: heroTitle, description: heroDescription };
                RoomBnbAPI.renderBrand(window.appConfig);
                RoomBnbAPI.showToast("Website landing copy saved successfully!");
            } catch (err) {
                RoomBnbAPI.showToast("Failed to update site config.", "error");
            }
        };
    }

    // Property creation/edit form submit handler
    const admPropForm = document.querySelector("[data-property-form]");
    if (admPropForm) {
        admPropForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = admPropForm.id.value;
            const rulesList = admPropForm.rules.value.split(",").map(r => r.trim());
            const amenitiesList = [];
            admPropForm.querySelectorAll("#admin-property-amenities input:checked").forEach(cb => {
                amenitiesList.push(cb.value);
            });

            const propertyData = {
                name: admPropForm.name.value.trim(),
                type: admPropForm.type.value.trim(),
                price: Number(admPropForm.price.value),
                capacity: Number(admPropForm.capacity.value),
                bedrooms: Number(admPropForm.bedrooms.value),
                bathrooms: Number(admPropForm.bathrooms.value),
                description: admPropForm.description.value.trim(),
                rules: rulesList,
                amenities: amenitiesList,
                hostId: "admin-1" // default admin host ID
            };

            try {
                if (id) {
                    await RoomBnbAPI.updateProperty(id, propertyData);
                    RoomBnbAPI.showToast("Property listing updated.");
                } else {
                    await RoomBnbAPI.createProperty(propertyData);
                    RoomBnbAPI.showToast("Property listing created.");
                }
                document.getElementById("admin-property-modal").close();
                window.renderAdminPropertiesGrid();
                window.renderAdminCopyLists();
            } catch (err) {
                RoomBnbAPI.showToast(err.message, "error");
            }
        };
    }

    // Stat metric submit handler
    const admStatForm = document.querySelector("[data-stat-form]");
    if (admStatForm) {
        admStatForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = admStatForm.id.value || `stat-${Date.now()}`;
            const val = admStatForm.value.value.trim();
            const lbl = admStatForm.label.value.trim();

            let stats = window.appConfig.stats || [];
            const idx = stats.findIndex(s => s.id === id);
            if (idx >= 0) stats[idx] = { id, value: val, label: lbl };
            else stats.push({ id, value: val, label: lbl });

            try {
                await RoomBnbAPI.updateConfig('stats', stats);
                window.appConfig.stats = stats;
                document.getElementById("admin-stat-modal").close();
                window.renderAdminCopyLists();
                RoomBnbAPI.showToast("Landing stat metric saved.");
            } catch (err) {
                RoomBnbAPI.showToast("Failed to save stat.", "error");
            }
        };
    }

    // Service offer submit handler
    const admServForm = document.querySelector("[data-service-form]");
    if (admServForm) {
        admServForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = admServForm.id.value || `service-${Date.now()}`;
            const t = admServForm.title.value.trim();
            const d = admServForm.description.value.trim();

            let services = window.appConfig.services || [];
            const idx = services.findIndex(s => s.id === id);
            if (idx >= 0) services[idx] = { id, title: t, description: d };
            else services.push({ id, title: t, description: d });

            try {
                await RoomBnbAPI.updateConfig('services', services);
                window.appConfig.services = services;
                document.getElementById("admin-service-modal").close();
                window.renderAdminCopyLists();
                RoomBnbAPI.showToast("Service details saved.");
            } catch (err) {
                RoomBnbAPI.showToast("Failed to save service.", "error");
            }
        };
    }

    // Global Click Delegation inside Admin Dashboard
    document.addEventListener("click", async (event) => {
        // Toggle user identity verification
        const admToggleUserId = event.target.dataset.adminToggleUserId;
        if (admToggleUserId) {
            try {
                const users = await RoomBnbAPI.getUsers();
                const user = users.find(u => u.id === admToggleUserId);
                if (user) {
                    await RoomBnbAPI.updateUser(admToggleUserId, { verified: !user.verified });
                    window.renderAdminUsersList();
                    RoomBnbAPI.showToast("User identity verification state updated.");
                }
            } catch (err) {
                RoomBnbAPI.showToast("Failed to toggle verification status.", "error");
            }
        }

        // Change user status (Suspend / Activate)
        const changeStatusUserId = event.target.dataset.adminChangeStatusId;
        const newStatus = event.target.dataset.newStatus;
        if (changeStatusUserId && newStatus) {
            try {
                await RoomBnbAPI.updateUserStatus(changeStatusUserId, newStatus);
                window.renderAdminUsersList();
                RoomBnbAPI.showToast(`User account status updated to: ${newStatus}`);
            } catch(err) {
                RoomBnbAPI.showToast("Failed to update user status.", "error");
            }
        }

        // Delete User account
        const deleteUserId = event.target.dataset.adminDeleteUserId;
        if (deleteUserId) {
            if (confirm("Are you sure you want to permanently delete this user account and all their listings? This cannot be undone.")) {
                try {
                    await RoomBnbAPI.deleteUser(deleteUserId);
                    window.renderAdminUsersList();
                    RoomBnbAPI.showToast("User account successfully deleted.");
                } catch(err) {
                    RoomBnbAPI.showToast("Failed to delete user account.", "error");
                }
            }
        }

        // Edit Coupon trigger
        const editCouponCode = event.target.dataset.adminEditCouponCode;
        if (editCouponCode) {
            try {
                const coupons = await RoomBnbAPI.getCoupons();
                const coupon = coupons.find(c => c.code === editCouponCode);
                const couponForm = document.getElementById("admin-coupon-form");
                const couponModal = document.getElementById("admin-coupon-modal");
                if (coupon && couponForm && couponModal) {
                    couponForm.code.value = coupon.code;
                    couponForm.code.readOnly = true;
                    couponForm.discountType.value = coupon.discountType;
                    couponForm.value.value = coupon.value;
                    couponForm.description.value = coupon.description;
                    couponForm.active.checked = coupon.active;

                    document.getElementById("coupon-modal-title").textContent = "Edit Promo Coupon";
                    couponModal.showModal();
                }
            } catch(err) {
                RoomBnbAPI.showToast("Failed to fetch coupon details.", "error");
            }
        }

        // Delete Coupon
        const deleteCouponCode = event.target.dataset.adminDeleteCouponCode;
        if (deleteCouponCode) {
            if (confirm(`Are you sure you want to delete promo coupon code ${deleteCouponCode}?`)) {
                try {
                    await RoomBnbAPI.deleteCoupon(deleteCouponCode);
                    window.renderAdminCoupons();
                    RoomBnbAPI.showToast("Promo coupon code deleted successfully.");
                } catch(err) {
                    RoomBnbAPI.showToast("Failed to delete coupon.", "error");
                }
            }
        }

        // Moderate / Delete Review
        const admDelRevPropId = event.target.dataset.adminDeleteReviewPropId;
        const admDelRevId = event.target.dataset.adminDeleteReviewId;
        if (admDelRevPropId && admDelRevId) {
            try {
                await RoomBnbAPI.deleteReview(admDelRevId);
                window.renderAdminReportedReviews();
                RoomBnbAPI.showToast("Inappropriate review removed from property catalog.");
            } catch (err) {
                RoomBnbAPI.showToast("Failed to moderate review.", "error");
            }
        }

        // Booking Status action Approve/Reject
        const admBookingAction = event.target.dataset.adminAction;
        const admBookingId = event.target.dataset.bookingId;
        if (admBookingAction && admBookingId) {
            try {
                await RoomBnbAPI.updateBookingStatus(admBookingId, admBookingAction);
                window.renderAdminRequests();
                RoomBnbAPI.showToast(`Booking request ${admBookingAction.toLowerCase()}`);
            } catch (err) {
                RoomBnbAPI.showToast("Failed to update reservation.", "error");
            }
        }

        // Add stat metric trigger dialog
        if (event.target.id === "add-stat-btn") {
            const modal = document.getElementById("admin-stat-modal");
            const form = modal ? modal.querySelector("[data-stat-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("stat-modal-title").textContent = "Create Stat Metric";
                modal.showModal();
            }
        }

        // Edit stat metric trigger dialog
        const admEditStatId = event.target.dataset.editStat;
        if (admEditStatId) {
            const stat = window.appConfig.stats.find(s => s.id === admEditStatId);
            const modal = document.getElementById("admin-stat-modal");
            const form = modal ? modal.querySelector("[data-stat-form]") : null;
            if (stat && form) {
                form.id.value = stat.id;
                form.value.value = stat.value;
                form.label.value = stat.label;
                document.getElementById("stat-modal-title").textContent = "Edit Stat Metric";
                modal.showModal();
            }
        }

        // Delete stat metric
        const admDelStatId = event.target.dataset.deleteStat;
        if (admDelStatId) {
            if (confirm("Delete this metric?")) {
                let stats = window.appConfig.stats.filter(s => s.id !== admDelStatId);
                try {
                    await RoomBnbAPI.updateConfig('stats', stats);
                    window.appConfig.stats = stats;
                    window.renderAdminCopyLists();
                    RoomBnbAPI.showToast("Metric stat deleted.");
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to delete stat.", "error");
                }
            }
        }

        // Add service offer trigger dialog
        if (event.target.id === "add-service-btn") {
            const modal = document.getElementById("admin-service-modal");
            const form = modal ? modal.querySelector("[data-service-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("service-modal-title").textContent = "Create Service Offer";
                modal.showModal();
            }
        }

        // Edit service offer trigger dialog
        const admEditServId = event.target.dataset.editService;
        if (admEditServId) {
            const service = window.appConfig.services.find(s => s.id === admEditServId);
            const modal = document.getElementById("admin-service-modal");
            const form = modal ? modal.querySelector("[data-service-form]") : null;
            if (service && form) {
                form.id.value = service.id;
                form.title.value = service.title;
                form.description.value = service.description;
                document.getElementById("service-modal-title").textContent = "Edit Service Offer";
                modal.showModal();
            }
        }

        // Delete service offer
        const admDelServId = event.target.dataset.deleteService;
        if (admDelServId) {
            if (confirm("Delete this service item?")) {
                let services = window.appConfig.services.filter(s => s.id !== admDelServId);
                try {
                    await RoomBnbAPI.updateConfig('services', services);
                    window.appConfig.services = services;
                    window.renderAdminCopyLists();
                    RoomBnbAPI.showToast("Service item deleted.");
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to delete service.", "error");
                }
            }
        }

        // Add stays property trigger dialog
        if (event.target.id === "add-property-btn") {
            const modal = document.getElementById("admin-property-modal");
            const form = modal ? modal.querySelector("[data-property-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("property-modal-title").textContent = "Add Stays Property";
                modal.showModal();
            }
        }

        // Edit stays property trigger dialog
        const admEditPropId = event.target.dataset.editProperty;
        if (admEditPropId) {
            try {
                const properties = await RoomBnbAPI.getProperties();
                const property = properties.find(p => p.id === admEditPropId);
                const modal = document.getElementById("admin-property-modal");
                const form = modal ? modal.querySelector("[data-property-form]") : null;
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
                    modal.querySelectorAll("#admin-property-amenities input").forEach(cb => {
                        cb.checked = property.amenities.includes(cb.value);
                    });
                    document.getElementById("property-modal-title").textContent = "Edit Stays Property";
                    modal.showModal();
                }
            } catch (err) {
                RoomBnbAPI.showToast("Failed to fetch property details.", "error");
            }
        }

        // Delete stays property
        const admDelPropId = event.target.dataset.deleteProperty;
        if (admDelPropId) {
            if (confirm("Delete this property catalog item?")) {
                try {
                    await RoomBnbAPI.deleteProperty(admDelPropId);
                    window.renderAdminPropertiesGrid();
                    window.renderAdminCopyLists();
                    RoomBnbAPI.showToast("Stays property deleted.");
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to delete property.", "error");
                }
            }
        }
    });
};

window.renderAdminCopyLists = async function() {
    const propertiesEl = document.querySelector("[data-admin-properties]");
    if (propertiesEl) {
        try {
            const properties = await RoomBnbAPI.getProperties();
            propertiesEl.innerHTML = properties.map(property => `
                <div class="admin-list-row">
                    <span>${RoomBnbAPI.escapeHtml(property.name)}</span>
                    <div class="card-actions">
                        <button class="mini-button" type="button" data-edit-property="${property.id}">Edit</button>
                        <button class="mini-button danger-button" type="button" data-delete-property="${property.id}">Delete</button>
                    </div>
                </div>
            `).join("");
        } catch (e) {
            propertiesEl.innerHTML = `<p style="padding:10px; color:var(--text-muted);">Error loading stays.</p>`;
        }
    }

    const statsEl = document.querySelector("[data-admin-stats]");
    if (statsEl && window.appConfig.stats) {
        statsEl.innerHTML = window.appConfig.stats.map(stat => `
            <div class="admin-list-row">
                <span>${RoomBnbAPI.escapeHtml(stat.value)} ${RoomBnbAPI.escapeHtml(stat.label)}</span>
                <div class="card-actions">
                    <button class="mini-button" type="button" data-edit-stat="${stat.id}">Edit</button>
                    <button class="mini-button danger-button" type="button" data-delete-stat="${stat.id}">Delete</button>
                </div>
            </div>
        `).join("");
    }

    const servicesEl = document.querySelector("[data-admin-services]");
    if (servicesEl && window.appConfig.services) {
        servicesEl.innerHTML = window.appConfig.services.map(service => `
            <div class="admin-list-row">
                <span>${RoomBnbAPI.escapeHtml(service.title)}</span>
                <div class="card-actions">
                    <button class="mini-button" type="button" data-edit-service="${service.id}">Edit</button>
                    <button class="mini-button danger-button" type="button" data-delete-service="${service.id}">Delete</button>
                </div>
            </div>
        `).join("");
    }
};

window.renderAdminPropertiesGrid = async function() {
    const grid = document.querySelector("[data-admin-properties-grid]");
    if (grid) {
        try {
            const properties = await RoomBnbAPI.getProperties();
            grid.innerHTML = properties.map(property => {
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
                            <span class="rating">${Number(property.rating).toFixed(2)}</span>
                        </div>
                        <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
                        <p style="font-size:0.82rem; color:var(--accent); font-weight:700;">Host: ${property.hostName}</p>
                        <div class="property-price-box">
                            <div class="price">$${property.price} <span>/ night</span></div>
                            <div class="card-actions">
                                <button class="mini-button" type="button" data-edit-property="${property.id}">Edit</button>
                                <button class="mini-button danger-button" type="button" data-delete-property="${property.id}">Delete</button>
                            </div>
                        </div>
                    </div>
                </article>
            `; }).join("");
        } catch (e) {
            grid.innerHTML = `<p style="padding:20px; color:var(--text-muted);">Error loading stays catalog.</p>`;
        }
    }
};

window.renderAdminRequests = async function() {
    const list = document.querySelector("[data-admin-requests]");
    if (list) {
        try {
            const bookings = await RoomBnbAPI.getBookings("admin");
            const properties = await RoomBnbAPI.getProperties();

            list.innerHTML = bookings.length
                ? bookings.map(booking => {
                    const property = properties.find(item => item.id === booking.propertyId);
                    const statusLower = booking.status.toLowerCase();
                    const controls = booking.status === "Pending" ? `
                        <div class="request-card-actions" style="margin-top:10px;">
                            <button class="mini-button" type="button" style="background:var(--success); color:#fff; border-color:var(--success);" data-admin-action="Approved" data-booking-id="${booking.id}">Approve</button>
                            <button class="mini-button danger-button" type="button" data-admin-action="Rejected" data-booking-id="${booking.id}">Reject</button>
                        </div>
                    ` : "";

                    return `
                        <article class="request-card">
                            <div class="request-card-info">
                                <h3>${RoomBnbAPI.escapeHtml(property?.name || "Deleted Property")}</h3>
                                <p style="font-weight:700; font-size:0.9rem;">
                                    Customer: ${RoomBnbAPI.escapeHtml(booking.customerName)} &bull; Host ID: ${booking.hostId}
                                </p>
                                <p style="font-size:0.85rem; color:var(--text-muted);">
                                    Date: ${booking.checkIn} to ${booking.checkOut} &bull; Total: $${booking.totalPrice} ($${booking.basePrice} base)
                                </p>
                            </div>
                            <div>
                                <span class="status-pill ${statusLower}">${booking.status}</span>
                                ${controls}
                            </div>
                        </article>
                    `;
                }).join("")
                : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
                     <h3>No booking requests on the platform.</h3>
                   </div>`;
        } catch (e) {
            list.innerHTML = `<p style="padding:20px; color:var(--text-muted);">Error loading reservations list.</p>`;
        }
    }
};

window.renderAdminUsersList = async function() {
    const tbody = document.getElementById("admin-users-table-body");
    if (tbody) {
        try {
            const users = await RoomBnbAPI.getUsers();
            tbody.innerHTML = users.map(user => {
                const verText = user.verified ? `<span class="status-pill approved" style="font-size:0.75rem;">Verified</span>` : `<span class="status-pill pending" style="font-size:0.75rem;">Unverified</span>`;
                const statusText = user.status === "Suspended" ? `<span class="status-pill rejected" style="font-size:0.75rem;">Suspended</span>` : `<span class="status-pill approved" style="font-size:0.75rem;">Active</span>`;
                
                const isSelf = user.id === window.activeSession.id;
                const suspendBtn = user.status === "Suspended"
                    ? `<button class="mini-button" type="button" data-admin-change-status-id="${user.id}" data-new-status="Active" style="background:var(--success); color:#fff; border-color:var(--success); padding:4px 8px; font-size:0.75rem; margin:2px;">Activate</button>`
                    : `<button class="mini-button danger-button" type="button" data-admin-change-status-id="${user.id}" data-new-status="Suspended" style="padding:4px 8px; font-size:0.75rem; margin:2px;">Suspend</button>`;
                
                const deleteBtn = isSelf ? "" : `<button class="mini-button danger-button" type="button" data-admin-delete-user-id="${user.id}" style="padding:4px 8px; font-size:0.75rem; margin:2px;">Delete</button>`;

                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding:12px; font-weight:700;">${RoomBnbAPI.escapeHtml(user.name)}</td>
                        <td style="padding:12px; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(user.email)}</td>
                        <td style="padding:12px; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(user.phone || "N/A")}</td>
                        <td style="padding:12px; font-weight:800; text-transform:uppercase; font-size:0.8rem; color:var(--accent);">${RoomBnbAPI.escapeHtml(user.role)}</td>
                        <td style="padding:12px;"><div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">${verText} ${statusText}</div></td>
                        <td style="padding:12px; text-align:center;">
                            <button class="mini-button" type="button" data-admin-toggle-user-id="${user.id}" style="padding:4px 8px; font-size:0.75rem; margin:2px;">Toggle Verify</button>
                            ${isSelf ? "" : suspendBtn}
                            ${deleteBtn}
                        </td>
                    </tr>
                `;
            }).join("");
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-muted);">Error loading users list.</td></tr>`;
        }
    }
};

window.renderAdminReportedReviews = async function() {
    const list = document.getElementById("admin-reported-reviews-list");
    if (!list) return;

    try {
        const reportedReviews = await RoomBnbAPI.getReportedReviews();

        list.innerHTML = reportedReviews.length
            ? reportedReviews.map(item => `
                <article class="request-card">
                    <div>
                        <h3>Property: ${RoomBnbAPI.escapeHtml(item.propertyName)}</h3>
                        <p style="font-weight:700; color:var(--text-muted); margin-bottom:6px;">Reviewer: ${RoomBnbAPI.escapeHtml(item.reviewerName)} (Rating: ★ ${item.rating})</p>
                        <p style="font-style:italic; background:var(--background); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border); font-size:0.92rem; color:var(--text);">"${RoomBnbAPI.escapeHtml(item.text)}"</p>
                    </div>
                    <div>
                        <button class="mini-button danger-button" type="button" data-admin-delete-review-prop-id="${item.propertyId}" data-admin-delete-review-id="${item.id}">Remove Review</button>
                    </div>
                </article>
            `).join("")
            : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
                 <h3>No reported reviews to moderate.</h3>
               </div>`;
    } catch (e) {
        list.innerHTML = `<p style="padding:20px; color:var(--text-muted);">Error loading reported reviews.</p>`;
    }
};

window.loadAdminAnalytics = async function() {
    try {
        const report = await RoomBnbAPI.getReports();
        
        window.setText("#admin-stat-total-users", report.stats.totalUsers);
        window.setText("#admin-stat-total-properties", report.stats.totalProperties);
        window.setText("#admin-stat-total-bookings", report.stats.totalBookings);
        window.setText("#admin-stat-total-revenue", `$${(report.stats.revenue || 0).toLocaleString()}`);

        // Draw monthly bookings count
        window.drawSvgBarChart("monthly-bookings-chart-container", report.monthlyBookings, "month", "count");
        // Draw monthly revenue chart
        window.drawSvgBarChart("monthly-revenue-chart-container", report.monthlyRevenue, "month", "sum", "$");

    } catch (err) {
        console.error("Error loading analytics report:", err);
    }
};

window.drawSvgBarChart = function(containerId, data, xKey, yKey, labelPrefix = "") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.9rem;">No data points available yet.</div>`;
        return;
    }

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 260;
    const padding = 40;

    const maxVal = Math.max(...data.map(d => d[yKey])) || 10;
    const chartHeight = height - 2 * padding;
    const chartWidth = width - 2 * padding;
    const barWidth = Math.max(12, (chartWidth / data.length) - 24);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let bars = "";
    let xAxisLabels = "";
    let yAxisTicks = "";

    for (let i = 0; i <= 4; i++) {
        const tickVal = Math.round((maxVal / 4) * i);
        const y = height - padding - (tickVal / maxVal) * chartHeight;
        yAxisTicks += `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
            <text x="${padding - 8}" y="${y + 4}" font-size="10" fill="var(--text-muted)" text-anchor="end">${labelPrefix}${tickVal}</text>
        `;
    }

    data.forEach((d, idx) => {
        const val = d[yKey];
        const barHeight = (val / maxVal) * chartHeight;
        const x = padding + idx * (chartWidth / data.length) + ((chartWidth / data.length) - barWidth) / 2;
        const y = height - padding - barHeight;

        const monthNum = parseInt(d[xKey]);
        const monthLabel = months[monthNum - 1] || `M${d[xKey]}`;

        bars += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--accent)" rx="4" style="transition: all 0.3s ease;">
                <title>${monthLabel}: ${labelPrefix}${val.toLocaleString()}</title>
            </rect>
            <text x="${x + barWidth / 2}" y="${y - 8}" font-size="10" font-weight="bold" fill="var(--accent)" text-anchor="middle">${labelPrefix}${val.toLocaleString()}</text>
        `;

        xAxisLabels += `
            <text x="${x + barWidth / 2}" y="${height - padding + 18}" font-size="11" font-weight="700" fill="var(--text-muted)" text-anchor="middle">${monthLabel}</text>
        `;
    });

    container.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
            ${yAxisTicks}
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border)" stroke-width="2" />
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--border)" stroke-width="2" />
            ${bars}
            ${xAxisLabels}
        </svg>
    `;
};

window.renderAdminCoupons = async function() {
    const tbody = document.getElementById("admin-coupons-tbody");
    if (!tbody) return;

    try {
        const coupons = await RoomBnbAPI.getCoupons();
        tbody.innerHTML = coupons.length
            ? coupons.map(c => {
                const statusText = c.active ? `<span class="status-pill approved">Active</span>` : `<span class="status-pill rejected">Inactive</span>`;
                const valueText = c.discountType === "percent" ? `${c.value}%` : `$${c.value}`;
                return `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:12px; font-weight:800;">${RoomBnbAPI.escapeHtml(c.code)}</td>
                        <td style="padding:12px; text-transform:capitalize;">${RoomBnbAPI.escapeHtml(c.discountType)}</td>
                        <td style="padding:12px; font-weight:700;">${valueText}</td>
                        <td style="padding:12px; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(c.description || "N/A")}</td>
                        <td style="padding:12px;">${statusText}</td>
                        <td style="padding:12px; text-align:center;">
                            <button class="mini-button" type="button" data-admin-edit-coupon-code="${c.code}" style="padding:4px 8px; font-size:0.75rem; margin:2px;">Edit</button>
                            <button class="mini-button danger-button" type="button" data-admin-delete-coupon-code="${c.code}" style="padding:4px 8px; font-size:0.75rem; margin:2px;">Delete</button>
                        </td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-muted);">No coupons created yet.</td></tr>`;
    } catch (err) {
        console.error("Error loading coupons:", err);
    }
};

window.renderAdminTicketsList = async function() {
    const list = document.getElementById("admin-tickets-sidebar-list");
    if (!list) return;

    try {
        const tickets = await RoomBnbAPI.getTickets("", "admin");
        list.innerHTML = tickets.length
            ? tickets.map(ticket => {
                const activeClass = ticket.id === window.adminActiveTicketId ? "active" : "";
                const statusColor = ticket.status === "Open" ? "color: var(--success);" : "color: var(--text-muted);";
                return `
                    <div class="chat-thread-item ${activeClass}" data-admin-ticket-id="${ticket.id}" style="padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; display: flex; flex-direction: column; gap: 4px; background: var(--surface); text-align: left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-weight:700; font-size:0.9rem;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">${RoomBnbAPI.escapeHtml(ticket.subject)}</span>
                            <span style="${statusColor} font-size:0.75rem; font-weight:800;">${ticket.status}</span>
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(ticket.type)} &bull; ${RoomBnbAPI.escapeHtml(ticket.userRole)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">User: ${ticket.userId}</div>
                    </div>
                `;
            }).join("")
            : `<div style="padding:24px; color:var(--text-muted); text-align:center; font-size:0.88rem;">No disputes or tickets filed.</div>`;

        list.querySelectorAll(".chat-thread-item").forEach(el => {
            el.onclick = () => {
                window.adminActiveTicketId = el.dataset.adminTicketId;
                window.renderAdminTicketMessages(window.adminActiveTicketId);
                list.querySelectorAll(".chat-thread-item").forEach(item => item.classList.remove("active"));
                el.classList.add("active");
            };
        });
    } catch (err) {
        console.error("Error rendering admin tickets list:", err);
    }
};

window.renderAdminTicketMessages = async function(ticketId) {
    if (!ticketId) return;

    try {
        const messages = await RoomBnbAPI.getTicketMessages(ticketId);
        const tickets = await RoomBnbAPI.getTickets("", "admin");
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const historyPane = document.getElementById("admin-ticket-chat-history");
        const headerTitle = document.getElementById("admin-ticket-chat-header-name");
        const msgInput = document.getElementById("admin-ticket-chat-message-input");
        const sendBtn = document.getElementById("admin-ticket-chat-send-btn");
        const closeBtn = document.getElementById("admin-close-ticket-action-btn");

        const isOpen = ticket.status === "Open";

        if (msgInput && sendBtn) {
            msgInput.disabled = !isOpen;
            sendBtn.disabled = !isOpen;
            msgInput.placeholder = isOpen ? "Type a reply to user..." : "This ticket is closed.";
        }

        if (closeBtn) {
            closeBtn.style.display = isOpen ? "block" : "none";
            closeBtn.onclick = async () => {
                if (confirm("Are you sure you want to close this ticket?")) {
                    try {
                        await RoomBnbAPI.closeTicket(ticketId);
                        RoomBnbAPI.showToast("Ticket closed successfully.");
                        window.renderAdminTicketsList();
                        window.renderAdminTicketMessages(ticketId);
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
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-top: 4px;">User: ${ticket.userId} (${ticket.userRole}) &bull; Description: ${RoomBnbAPI.escapeHtml(ticket.description)}</div>
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
        console.error("Error loading admin ticket messages:", err);
    }
};

window.sendAdminTicketMessage = async function() {
    const ticketId = window.adminActiveTicketId;
    const msgInput = document.getElementById("admin-ticket-chat-message-input");
    if (!ticketId || !msgInput) return;
    const content = msgInput.value.trim();
    if (!content) return;

    try {
        await RoomBnbAPI.sendTicketMessage(ticketId, window.activeSession.id, content);
        msgInput.value = "";
        window.renderAdminTicketMessages(ticketId);
    } catch (err) {
        RoomBnbAPI.showToast("Failed to send message.", "error");
    }
};

window.exportBookingsToCSV = async function() {
    try {
        const bookings = await RoomBnbAPI.getBookings("admin");
        if (bookings.length === 0) {
            RoomBnbAPI.showToast("No bookings available to export.", "error");
            return;
        }

        const headers = ["Booking ID", "Property ID", "Customer Name", "Host ID", "Check-In", "Check-Out", "Nights", "Total Price", "Status", "Created At"];
        const rows = bookings.map(b => [
            b.id, b.propertyId, b.customerName, b.hostId, b.checkIn, b.checkOut, b.nights, b.totalPrice, b.status, b.createdAt
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `RoomBnB_Bookings_Report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        RoomBnbAPI.showToast("CSV report downloaded successfully!");
    } catch(err) {
        RoomBnbAPI.showToast("Failed to export CSV report.", "error");
    }
};
