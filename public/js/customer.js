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

