// Global window states
window.activeSession = RoomBnbAPI.loadSession();
window.appConfig = {}; // loaded asynchronously on startup
window.visibleProperties = [];
window.bookingCheckIn = null;
window.bookingCheckOut = null;
window.activePropertyForBooking = null;
window.activeConvoId = null;

/* ==========================================
   HELPER UTILITIES
   ========================================== */
window.setText = function(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
};

window.updateElementVisibility = function(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "flex" : "none";
};

/* ==========================================
   STICKY HEADER & SCROLL REVEAL ANIMATIONS
   ========================================== */
window.initAnimations = function() {
    // 1. Scroll-shrink header
    const topbar = document.getElementById("app-topbar") || document.querySelector(".topbar");
    if (topbar) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 40) {
                topbar.classList.add("scrolled");
            } else {
                topbar.classList.remove("scrolled");
            }
        });
        // Initial state
        if (window.scrollY > 40) topbar.classList.add("scrolled");
    }

    // 2. Entrance reveal animation using IntersectionObserver
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll(".reveal").forEach(el => {
        revealObserver.observe(el);
    });
};

/* ==========================================
   TABS MANAGEMENT (DASHBOARDS)
   ========================================= */
window.initDashboardTabs = function() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    if (menuItems.length === 0) return;

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(mi => mi.classList.remove("active"));
            document.querySelectorAll(".dashboard-pane").forEach(pane => pane.classList.remove("active"));

            item.classList.add("active");
            const targetId = item.dataset.tabTarget;
            const targetPane = document.getElementById(`${targetId}-pane`);
            if (targetPane) {
                targetPane.classList.add("active");
            }
            
            if (targetId === "customer-favorites") {
                if (typeof window.renderWishlistTab === 'function') window.renderWishlistTab();
            } else if (targetId === "customer-chat" || targetId === "host-chat") {
                window.renderChatInbox();
            }
        });
    });
};

/* ==========================================
   NAVIGATION & SESSION HEADER RENDERER
   ========================================== */
window.updateNavbar = function(session) {
    const navLinks = document.getElementById("dynamic-nav-links");
    const sessionActions = document.getElementById("dynamic-session-actions");
    if (!navLinks || !sessionActions) return;

    const isHomepage = !!document.getElementById("home-view");
    const isCustomerPage = !!document.getElementById("customer-view");
    const isHostPage = !!document.getElementById("host-view");
    const isAdminPage = !!document.getElementById("admin-view");

    if (!session) {
        navLinks.innerHTML = `
            <a href="${isHomepage ? '#stays' : 'index.html#stays'}">Stays</a>
            <a href="${isHomepage ? '#services' : 'index.html#services'}">Experience</a>
            <a href="${isHomepage ? '#owners' : 'index.html#owners'}">List your place</a>
        `;
        sessionActions.innerHTML = `
            <a class="nav-action" href="login.html">Login</a>
            <a class="nav-action nav-action--primary" href="register.html">Register</a>
        `;

        if (isHomepage) {
            navLinks.querySelectorAll("a").forEach(a => {
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    const targetId = a.getAttribute("href").substring(1);
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                });
            });
        }
    } else {
        if (session.role === "customer") {
            navLinks.innerHTML = `
                <a href="index.html">Home Stays</a>
                <a href="customer.html">My Dashboard</a>
            `;
        } else if (session.role === "host") {
            navLinks.innerHTML = `
                <a href="index.html">Home Stays</a>
                <a href="host.html">Host Dashboard</a>
            `;
        } else if (session.role === "admin") {
            navLinks.innerHTML = `
                <a href="index.html">Home Stays</a>
                <a href="admin.html">Admin Panel</a>
            `;
        }

        sessionActions.innerHTML = `
            <div class="session-pill">
                <span class="avatar-dot"></span>
                <span>${RoomBnbAPI.escapeHtml(session.name)} (${RoomBnbAPI.escapeHtml(session.role)})</span>
            </div>
            <button class="nav-action" type="button" data-logout-button>Logout</button>
        `;

        const logoutBtn = sessionActions.querySelector("[data-logout-button]");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                RoomBnbAPI.logout();
            });
        }
    }

    // Email Verification Banner check
    const banner = document.getElementById("email-verification-banner");
    if (banner) {
        if (session) {
            RoomBnbAPI.getUser(session.id).then(user => {
                if (user && !user.verified) {
                    banner.style.display = "block";
                } else {
                    banner.style.display = "none";
                }
            }).catch(() => {
                banner.style.display = "none";
            });
        } else {
            banner.style.display = "none";
        }
    }
};

/* ==========================================
   PROPERTY DETAILS DIALOG
   ========================================== */
window.getPropertyGalleryImages = function(property) {
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
        return property.images;
    }
    const galleryMap = {
        "property-1": [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=800&q=80"
        ],
        "property-2": [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
        ],
        "property-3": [
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
        ],
        "property-4": [
            "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80"
        ],
        "property-5": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
        ],
        "property-6": [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=800&q=80"
        ]
    };
    return galleryMap[property.id] || [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=800&q=80"
    ];
};

window.openPropertyDetailsModal = async function(propertyId) {
    try {
        const properties = await RoomBnbAPI.getProperties();
        const property = properties.find(p => p.id === propertyId);
        if (!property) return;

        window.activePropertyForBooking = property;
        window.bookingCheckIn = null;
        window.bookingCheckOut = null;

        const modal = document.getElementById("property-details-modal");
        if (!modal) return;

        const titleEl = document.getElementById("modal-prop-title");
        const bodyEl = document.getElementById("modal-prop-body");
        const footerEl = document.getElementById("modal-prop-footer");

        titleEl.textContent = property.name;

        const images = window.getPropertyGalleryImages(property);

        bodyEl.innerHTML = `
            <div class="gallery-slider-container">
                <div class="gallery-slides" id="gallery-slides-wrapper">
                    ${images.map((img, idx) => `
                        <div class="gallery-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${img}')"></div>
                    `).join("")}
                </div>
                <button type="button" class="gallery-nav-btn prev" id="gallery-prev-btn">&#10094;</button>
                <button type="button" class="gallery-nav-btn next" id="gallery-next-btn">&#10095;</button>
            </div>
            
            <div class="modal-prop-details-grid">
                <div class="details-main-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="property-card-badge" style="position:static;">${RoomBnbAPI.escapeHtml(property.type)}</span>
                        <span class="rating" style="font-size:1.1rem;">${Number(property.rating).toFixed(2)}</span>
                    </div>
                    <div class="details-spec-row">
                        <span>👥 Max <strong>${property.capacity} guests</strong></span>
                        <span>🛏️ <strong>${property.bedrooms} bedrooms</strong></span>
                        <span>🛁 <strong>${property.bathrooms} bathrooms</strong></span>
                    </div>
                    <p style="font-size: 1.02rem; line-height: 1.6; color: var(--text);">
                        ${RoomBnbAPI.escapeHtml(property.description)}
                    </p>
                    
                    <div class="details-host-card">
                        <div class="host-avatar">${property.hostName.charAt(0)}</div>
                        <div>
                            <div style="font-weight:800; font-size:0.95rem;">Hosted by ${RoomBnbAPI.escapeHtml(property.hostName)}</div>
                            <div style="font-size:0.82rem; color:var(--text-muted);">Responsive host &bull; 24/7 check-in assistance</div>
                        </div>
                    </div>
                    
                    <div style="margin-top:14px;">
                        <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:10px;">What this place offers</h4>
                        <div class="details-amenities-list">
                            ${property.amenities.map(a => `<div class="details-amenity-item">${a}</div>`).join("")}
                        </div>
                    </div>
                    
                    <div style="margin-top:14px;">
                        <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:10px;">House Rules</h4>
                        <ul style="padding-left:20px; font-size:0.92rem; color:var(--text-muted); display:grid; gap:6px;">
                            ${property.rules.map(r => `<li>${RoomBnbAPI.escapeHtml(r)}</li>`).join("")}
                        </ul>
                    </div>
                    
                    <div>
                        <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:4px;">Stays Location</h4>
                        <p style="font-size:0.88rem; color:var(--text-muted);">Exact location details are shared after booking verification.</p>
                        <div class="details-map">
                            <div class="map-pulse"></div>
                            <div class="map-pin">📍</div>
                        </div>
                    </div>
                </div>

                <div class="booking-form-box">
                    <h3 style="font-weight:800; font-size:1.35rem; margin-bottom:10px;">Select Dates</h3>
                    <div class="calendar-wrapper">
                        <div class="calendar-header">
                            <span>July 2026</span>
                        </div>
                        <div class="calendar-grid" id="modal-calendar-grid"></div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
                        <label style="display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:0.82rem;">
                            Guests count
                            <input type="number" id="booking-guests-input" value="1" min="1" max="${property.capacity}" style="padding:10px; border:1px solid var(--border); border-radius:12px; font:inherit;">
                        </label>
                        <label style="display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:0.82rem;">
                            Promo Coupon Code
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="booking-coupon-input" placeholder="e.g. WELCOME10" style="flex-grow:1; padding:10px; border:1px solid var(--border); border-radius:12px; font:inherit;">
                                <button type="button" class="mini-button" id="apply-coupon-btn" style="margin:0;">Apply</button>
                            </div>
                            <span id="coupon-calc-pill-box" style="margin-top:6px;"></span>
                        </label>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border); padding-top:16px; margin-top:16px;">
                        <div class="booking-calc-row">
                            <span id="calc-base-label">$${property.price} x 0 nights</span>
                            <span id="calc-base-val">$0</span>
                        </div>
                        <div class="booking-calc-row">
                            <span>10% Lodging Tax</span>
                            <span id="calc-tax-val">$0</span>
                        </div>
                        <div class="booking-calc-row">
                            <span>5% Flat Service Fee</span>
                            <span id="calc-fee-val">$0</span>
                        </div>
                        <div class="booking-calc-row" id="calc-discount-row" style="display:none; color:var(--success);">
                            <span>Coupon Discount</span>
                            <span id="calc-discount-val">-$0</span>
                        </div>
                        <div class="booking-calc-row total">
                            <span>Total Payable</span>
                            <span id="calc-total-val">$0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="reviews-section">
                <h3>Guest Reviews (★ ${property.rating.toFixed(2)})</h3>
                <div class="reviews-grid-list">
                    ${property.reviews.length 
                        ? property.reviews.map(r => `
                            <div class="review-card">
                                <div class="review-card-header">
                                    <div class="reviewer-meta">
                                        <div class="host-avatar" style="width:36px; height:36px; font-size:0.85rem;">${r.reviewerName.charAt(0)}</div>
                                        <div>
                                            <div class="reviewer-name">${RoomBnbAPI.escapeHtml(r.reviewerName)}</div>
                                            <div class="reviewer-date">${r.date} &bull; Rated ★ ${r.rating}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <button class="review-btn-tiny ${r.reported ? 'reported' : ''}" data-report-review-prop-id="${property.id}" data-report-review-id="${r.id}">
                                            ${r.reported ? 'Flagged ⚠️' : 'Report 🏳️'}
                                        </button>
                                    </div>
                                </div>
                                <p>${RoomBnbAPI.escapeHtml(r.text)}</p>
                                ${r.photo ? `<img class="review-card-photo" src="${r.photo}" alt="review photo">` : ''}
                            </div>
                        `).join("")
                        : '<p style="color:var(--text-muted); font-size:0.95rem;">No reviews yet for this stay.</p>'
                    }
                </div>
            </div>
        `;

        // Slider Navigation Setup
        let currentSlide = 0;
        const slides = bodyEl.querySelectorAll(".gallery-slide");
        const prevBtn = bodyEl.querySelector("#gallery-prev-btn");
        const nextBtn = bodyEl.querySelector("#gallery-next-btn");
        if (prevBtn && nextBtn && slides.length > 0) {
            prevBtn.onclick = () => {
                slides[currentSlide].classList.remove("active");
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                slides[currentSlide].classList.add("active");
            };
            nextBtn.onclick = () => {
                slides[currentSlide].classList.remove("active");
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add("active");
            };
        }

        window.drawCalendar(property.bookedDates);

        // Footer Actions Setup
        if (!window.activeSession) {
            footerEl.innerHTML = `
                <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
                <a class="button-primary" href="login.html" style="min-height:44px; display:inline-flex; align-items:center;">Log in to book stay</a>
            `;
        } else if (window.activeSession.role === "customer") {
            footerEl.innerHTML = `
                <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
                <button class="button-primary" type="button" id="confirm-booking-details-btn" style="min-height:44px;">Verify & Pay Stay</button>
            `;
            document.getElementById("confirm-booking-details-btn").onclick = () => {
                if (!window.bookingCheckIn || !window.bookingCheckOut) {
                    RoomBnbAPI.showToast("Please choose check-in and check-out dates on the calendar.", "error");
                    return;
                }
                modal.close();
                window.openPaymentModal();
            };
        } else {
            footerEl.innerHTML = `
                <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
            `;
        }

        modal.showModal();
    } catch (e) {
        RoomBnbAPI.showToast("Failed to load details.", "error");
    }
};

/* ==========================================
   CALENDAR DRAWING & PRICING
   ========================================== */
window.drawCalendar = function(bookedList = []) {
    const grid = document.getElementById("modal-calendar-grid");
    if (!grid) return;

    const daysLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html = daysLabels.map(d => `<div class="calendar-day-label">${d}</div>`).join("");

    // pad empty first 3 slots for July 2026 starting on Wednesday
    for (let i = 0; i < 3; i++) {
        html += `<div class="calendar-day disabled"></div>`;
    }

    for (let day = 1; day <= 31; day++) {
        const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
        const isBlocked = bookedList.includes(dateStr);
        let classes = "calendar-day";
        if (isBlocked) classes += " calendar-blocked";

        if (window.bookingCheckIn && dateStr === window.bookingCheckIn) {
            classes += " selected";
        } else if (window.bookingCheckOut && dateStr === window.bookingCheckOut) {
            classes += " selected";
        } else if (window.bookingCheckIn && window.bookingCheckOut) {
            const startDay = Number(window.bookingCheckIn.split("-")[2]);
            const endDay = Number(window.bookingCheckOut.split("-")[2]);
            if (day > startDay && day < endDay) {
                classes += " in-range";
            }
        }

        html += `<div class="${classes}" data-calendar-day="${dateStr}">${day}</div>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".calendar-day:not(.calendar-blocked):not(.disabled)").forEach(el => {
        el.onclick = () => {
            const dateVal = el.dataset.calendarDay;
            window.handleCalendarDayClick(dateVal, bookedList);
        };
    });
};

window.handleCalendarDayClick = function(dateStr, bookedList) {
    if (!window.bookingCheckIn || (window.bookingCheckIn && window.bookingCheckOut)) {
        window.bookingCheckIn = dateStr;
        window.bookingCheckOut = null;
    } else {
        const startDay = Number(window.bookingCheckIn.split("-")[2]);
        const endDay = Number(dateStr.split("-")[2]);

        if (endDay <= startDay) {
            window.bookingCheckIn = dateStr;
        } else {
            let dateOverlap = false;
            for (let d = startDay + 1; d < endDay; d++) {
                const checkStr = `2026-07-${d < 10 ? '0' + d : d}`;
                if (bookedList.includes(checkStr)) {
                    dateOverlap = true;
                    break;
                }
            }
            if (dateOverlap) {
                RoomBnbAPI.showToast("Selected range contains booked dates.", "error");
                window.bookingCheckIn = dateStr;
                window.bookingCheckOut = null;
            } else {
                window.bookingCheckOut = dateStr;
            }
        }
    }

    window.drawCalendar(bookedList);
    window.recalculateBookingBill();
};

window.recalculateBookingBill = function() {
    if (!window.activePropertyForBooking) return;

    let nights = 0;
    if (window.bookingCheckIn && window.bookingCheckOut) {
        const startDay = Number(window.bookingCheckIn.split("-")[2]);
        const endDay = Number(window.bookingCheckOut.split("-")[2]);
        nights = endDay - startDay;
    }

    const price = window.activePropertyForBooking.price;
    const baseTotal = price * nights;
    const tax = Math.round(baseTotal * 0.1);
    const serviceFee = Math.round(baseTotal * 0.05);

    const couponInput = document.getElementById("booking-coupon-input");
    const code = couponInput ? couponInput.value.toUpperCase().trim() : "";
    let discount = 0;

    if (code && window.appConfig.coupons) {
        const coupon = window.appConfig.coupons.find(c => c.code === code);
        if (coupon) {
            if (coupon.discountType === "percent") {
                discount = Math.round(baseTotal * (coupon.value / 100));
            } else if (coupon.discountType === "flat") {
                discount = Math.min(coupon.value, baseTotal);
            }
        }
    }

    const grandTotal = Math.max(0, baseTotal + tax + serviceFee - discount);

    window.setText("#calc-base-label", `$${price} x ${nights} night${nights !== 1 ? 's' : ''}`);
    window.setText("#calc-base-val", `$${baseTotal}`);
    window.setText("#calc-tax-val", `$${tax}`);
    window.setText("#calc-fee-val", `$${serviceFee}`);
    window.setText("#calc-total-val", `$${grandTotal}`);

    const discRow = document.getElementById("calc-discount-row");
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = "flex";
            window.setText("#calc-discount-val", `-$${discount}`);
        } else {
            discRow.style.display = "none";
        }
    }
};

/* ==========================================
   PAYMENT MODAL CONTROLLER
   ========================================== */
window.openPaymentModal = function() {
    if (!window.activePropertyForBooking || !window.bookingCheckIn || !window.bookingCheckOut) return;

    const modal = document.getElementById("payment-modal");
    if (!modal) return;

    document.getElementById("payment-submit-form").reset();
    window.setText("#cc-cardholder-view", "JOHN DOE");
    window.setText("#cc-cardnumber-view", "•••• •••• •••• ••••");
    window.setText("#cc-expiry-view", "MM/YY");
    window.setText("#cc-cvv-view", "•••");
    const mockup = document.getElementById("cc-mockup");
    if (mockup) mockup.classList.remove("flipped");

    const totalPayableStr = document.getElementById("calc-total-val").textContent;
    window.setText("#payment-payable-amount", totalPayableStr);

    modal.showModal();
};

window.initPaymentInputListeners = function() {
    const cardRadio = document.getElementById("pay-card-radio");
    const upiRadio = document.getElementById("pay-upi-radio");
    const cardPanel = document.getElementById("payment-card-panel");
    const upiPanel = document.getElementById("payment-upi-panel");

    if (cardRadio && upiRadio && cardPanel && upiPanel) {
        cardRadio.onchange = () => {
            cardPanel.hidden = false;
            upiPanel.hidden = true;
            window.togglePaymentInputsRequired(true);
        };
        upiRadio.onchange = () => {
            cardPanel.hidden = true;
            upiPanel.hidden = false;
            window.togglePaymentInputsRequired(false);
        };
    }

    const ccName = document.getElementById("cc-name-input");
    const ccNum = document.getElementById("cc-number-input");
    const ccExp = document.getElementById("cc-expiry-input");
    const ccCvv = document.getElementById("cc-cvv-input");
    const ccMockup = document.getElementById("cc-mockup");

    if (ccName) {
        ccName.onkeyup = () => {
            window.setText("#cc-cardholder-view", ccName.value ? ccName.value.toUpperCase() : "JOHN DOE");
        };
    }

    if (ccNum) {
        ccNum.onkeyup = () => {
            let v = ccNum.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let matches = v.match(/\d{4,16}/g);
            let match = (matches && matches[0]) || '';
            let parts = [];
            for (let i = 0, len = match.length; i < len; i += 4) {
                parts.push(match.substring(i, i + 4));
            }
            if (parts.length > 0) {
                ccNum.value = parts.join(' ');
                window.setText("#cc-cardnumber-view", parts.join(' '));
            } else {
                ccNum.value = v;
                window.setText("#cc-cardnumber-view", v || "•••• •••• •••• ••••");
            }
        };
    }

    if (ccExp) {
        ccExp.onkeyup = () => {
            let v = ccExp.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            if (v.length >= 2) {
                ccExp.value = v.substring(0, 2) + '/' + v.substring(2, 4);
            }
            window.setText("#cc-expiry-view", ccExp.value || "MM/YY");
        };
    }

    if (ccCvv) {
        ccCvv.onfocus = () => { if (ccMockup) ccMockup.classList.add("flipped"); };
        ccCvv.onblur = () => { if (ccMockup) ccMockup.classList.remove("flipped"); };
        ccCvv.onkeyup = () => {
            window.setText("#cc-cvv-view", ccCvv.value || "•••");
        };
    }
};

window.togglePaymentInputsRequired = function(isCard) {
    const ccName = document.getElementById("cc-name-input");
    const ccNum = document.getElementById("cc-number-input");
    const ccExp = document.getElementById("cc-expiry-input");
    const ccCvv = document.getElementById("cc-cvv-input");
    const upiId = document.getElementById("upi-id-input");

    if (ccName && ccNum && ccExp && ccCvv && upiId) {
        ccName.required = isCard;
        ccNum.required = isCard;
        ccExp.required = isCard;
        ccCvv.required = isCard;
        upiId.required = !isCard;
    }
};

window.processBookingPayment = function(event) {
    event.preventDefault();
    if (!window.activePropertyForBooking || !window.bookingCheckIn || !window.bookingCheckOut || !window.activeSession) return;

    const modal = document.getElementById("payment-modal");
    if (!modal) return;

    RoomBnbAPI.showToast("Authenticating transaction security credentials...", "info");

    setTimeout(async () => {
        try {
            const startDay = Number(window.bookingCheckIn.split("-")[2]);
            const endDay = Number(window.bookingCheckOut.split("-")[2]);
            const nights = endDay - startDay;
            const price = window.activePropertyForBooking.price;
            const basePrice = price * nights;
            const tax = Math.round(basePrice * 0.1);
            const serviceFee = Math.round(basePrice * 0.05);

            const couponVal = document.getElementById("booking-coupon-input")?.value.toUpperCase().trim() || "";
            let discountApplied = 0;
            if (couponVal && window.appConfig.coupons) {
                const coupon = window.appConfig.coupons.find(c => c.code === couponVal);
                if (coupon) {
                    discountApplied = (coupon.discountType === "percent") ? Math.round(basePrice * (coupon.value / 100)) : Math.min(coupon.value, basePrice);
                }
            }

            const totalPrice = basePrice + tax + serviceFee - discountApplied;
            const payMethod = document.querySelector('input[name="payMethod"]:checked').value;

            // Submit booking request
            const res = await RoomBnbAPI.createBooking({
                propertyId: window.activePropertyForBooking.id,
                customerId: window.activeSession.id,
                customerName: window.activeSession.name,
                hostId: window.activePropertyForBooking.hostId,
                checkIn: window.bookingCheckIn,
                checkOut: window.bookingCheckOut,
                guestsCount: Number(document.getElementById("booking-guests-input").value),
                nights,
                basePrice,
                tax,
                serviceFee,
                discountApplied,
                totalPrice,
                couponCode: couponVal,
                paymentMethod: payMethod.toUpperCase()
            });

            // Auto-pay status update
            await RoomBnbAPI.updateBookingStatus(res.bookingId, 'Paid');

            modal.close();
            RoomBnbAPI.showToast("Payment Successful! Booking request paid and confirmed.");

            // Reload view
            if (document.getElementById("customer-view")) {
                if (typeof window.renderCustomerRequests === 'function') window.renderCustomerRequests(window.activeSession);
                if (typeof window.renderCustomerProperties === 'function') window.renderCustomerProperties();
            } else if (typeof window.initHomeView === 'function') {
                window.initHomeView(window.activeSession);
            }
        } catch (err) {
            RoomBnbAPI.showToast(err.message, "error");
        }
    }, 2000);
};

/* ==========================================
   REVIEWS WRITING
   ========================================== */
window.handleWriteReviewTrigger = async function(bookingId, propertyId) {
    const modal = document.getElementById("customer-review-modal");
    if (!modal) return;

    document.getElementById("review-submit-form").reset();
    document.getElementById("review-booking-id").value = bookingId;
    document.getElementById("review-property-id").value = propertyId;
    document.getElementById("review-photo-filename-label").textContent = "No photo selected";

    try {
        const properties = await RoomBnbAPI.getProperties();
        const property = properties.find(p => p.id === propertyId);
        let existingReview = null;
        if (property && property.reviews) {
            existingReview = property.reviews.find(r => r.reviewerName === window.activeSession.name);
        }

        const titleEl = modal.querySelector(".modal-header h2");
        const submitBtn = modal.querySelector('button[type="submit"]');

        if (existingReview) {
            if (titleEl) titleEl.textContent = "Edit Stay Review";
            if (submitBtn) submitBtn.textContent = "Update Review";
            
            document.getElementById("review-rating-input").value = existingReview.rating;
            document.getElementById("review-text-input").value = existingReview.text;
        } else {
            if (titleEl) titleEl.textContent = "Write Stay Review";
            if (submitBtn) submitBtn.textContent = "Submit Review";
        }

        modal.showModal();
    } catch (err) {
        RoomBnbAPI.showToast("Failed to initiate review form.", "error");
    }
};

window.submitReviewForm = function(event) {
    event.preventDefault();
    const bookingId = document.getElementById("review-booking-id").value;
    const propertyId = document.getElementById("review-property-id").value;
    const rating = Number(document.getElementById("review-rating-input").value);
    const text = document.getElementById("review-text-input").value.trim();
    const fileInput = document.getElementById("review-photo-upload");

    const completeReview = async (photoURL = "") => {
        try {
            await RoomBnbAPI.submitReview({
                propertyId,
                reviewerName: window.activeSession.name,
                rating,
                text,
                photo: photoURL,
                bookingId
            });

            // Mark booking completed
            await RoomBnbAPI.updateBookingStatus(bookingId, 'Completed');

            document.getElementById("customer-review-modal").close();
            RoomBnbAPI.showToast("Review published successfully!");

            // Refresh UI
            if (typeof window.renderCustomerRequests === 'function') window.renderCustomerRequests(window.activeSession);
            if (typeof window.renderCustomerProperties === 'function') window.renderCustomerProperties();
        } catch (err) {
            RoomBnbAPI.showToast(err.message, "error");
        }
    };

    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            completeReview(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        completeReview("");
    }
};

/* ==========================================
   REAL-TIME INBOX MESSAGES (CUSTOMER ↔ HOST)
   ========================================== */
window.renderChatInbox = async function() {
    const isCustomer = window.activeSession.role === "customer";
    const sidebar = document.getElementById(isCustomer ? "customer-chat-sidebar" : "host-chat-sidebar");
    if (!sidebar) return;

    try {
        const chats = await RoomBnbAPI.getChats(window.activeSession.role, window.activeSession.id);
        sidebar.innerHTML = chats.length
            ? chats.map(convo => {
                const activeClass = convo.id === window.activeConvoId ? "active" : "";
                const badge = convo.unreadCount > 0 ? `<span class="chat-thread-unread-badge">${convo.unreadCount}</span>` : "";
                return `
                    <div class="chat-thread-item ${activeClass}" data-convo-id="${convo.id}">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <div class="chat-thread-title">${RoomBnbAPI.escapeHtml(convo.otherPartyName)}</div>
                            ${badge}
                        </div>
                        <div class="chat-thread-desc">${RoomBnbAPI.escapeHtml(convo.lastMessage)}</div>
                    </div>
                `;
            }).join("")
            : `<div style="padding:24px; color:var(--text-muted); text-align:center; font-size:0.88rem;">No messages inbox channels active.</div>`;

        sidebar.querySelectorAll(".chat-thread-item").forEach(el => {
            el.onclick = () => {
                window.activeConvoId = el.dataset.convoId;
                window.renderChatHistory();
                window.renderChatInbox(); 
            };
        });
    } catch (err) {
        console.error("Error loading chats inbox:", err);
    }
};

window.renderChatHistory = async function() {
    if (!window.activeConvoId) return;

    try {
        const messages = await RoomBnbAPI.getMessages(window.activeConvoId, window.activeSession.id);
        
        // Fetch threads again to reload names
        const chats = await RoomBnbAPI.getChats(window.activeSession.role, window.activeSession.id);
        const convo = chats.find(c => c.id === window.activeConvoId);
        if (!convo) return;

        window.updateBellBadgeCount(window.activeSession);

        const isCustomer = window.activeSession.role === "customer";
        const historyPane = document.getElementById(isCustomer ? "customer-chat-history" : "host-chat-history");
        const headerTitle = document.getElementById(isCustomer ? "customer-chat-header-name" : "host-chat-header-name");
        const msgInput = document.getElementById(isCustomer ? "customer-chat-message-input" : "host-chat-message-input");
        const sendBtn = document.getElementById(isCustomer ? "customer-chat-send-btn" : "host-chat-send-btn");

        if (msgInput && sendBtn) {
            msgInput.disabled = false;
            sendBtn.disabled = false;
        }

        if (headerTitle) {
            headerTitle.textContent = `${convo.otherPartyName} (Stays: ${convo.propertyName})`;
        }

        if (historyPane) {
            historyPane.innerHTML = messages.length
                ? messages.map(m => {
                    const directionClass = m.senderId === window.activeSession.id ? "sent" : "received";
                    const readTick = m.senderId === window.activeSession.id 
                        ? (m.read ? '<span style="color:#60a5fa; margin-left:4px; font-weight:800;">✓✓</span>' : '<span style="opacity:0.6; margin-left:4px;">✓</span>')
                        : '';
                    return `
                        <div class="chat-bubble ${directionClass}">
                            ${m.image ? `<img class="chat-bubble-img" src="${m.image}">` : ''}
                            <div>${RoomBnbAPI.escapeHtml(m.content)}</div>
                            <span class="chat-bubble-time">${m.timestamp} ${readTick}</span>
                        </div>
                    `;
                }).join("")
                : `<div style="margin:auto; text-align:center; color:var(--text-muted); font-size:0.9rem;">Send a hello message to begin!</div>`;
            
            historyPane.scrollTop = historyPane.scrollHeight;
        }
    } catch (err) {
        console.error("Error loading chat history:", err);
    }
};

window.sendActiveChatMessage = async function(content, imageURL = "") {
    if (!window.activeConvoId || (!content.trim() && !imageURL)) return;

    const isCustomer = window.activeSession.role === "customer";
    const msgInput = document.getElementById(isCustomer ? "customer-chat-message-input" : "host-chat-message-input");

    try {
        await RoomBnbAPI.sendMessage(window.activeConvoId, window.activeSession.id, content, imageURL);
        if (msgInput) msgInput.value = "";
        window.renderChatHistory();
        window.renderChatInbox();
    } catch (err) {
        RoomBnbAPI.showToast("Failed to send message.", "error");
    }
};

window.initChatEventListeners = function() {
    const custSend = document.getElementById("customer-chat-send-btn");
    const custInput = document.getElementById("customer-chat-message-input");
    if (custSend && custInput) {
        custSend.onclick = () => window.sendActiveChatMessage(custInput.value);
        custInput.onkeypress = (e) => {
            if (e.key === "Enter") window.sendActiveChatMessage(custInput.value);
        };
    }

    const hostSend = document.getElementById("host-chat-send-btn");
    const hostInput = document.getElementById("host-chat-message-input");
    if (hostSend && hostInput) {
        hostSend.onclick = () => window.sendActiveChatMessage(hostInput.value);
        hostInput.onkeypress = (e) => {
            if (e.key === "Enter") window.sendActiveChatMessage(hostInput.value);
        };
    }

    const custAttach = document.getElementById("customer-chat-attach-btn");
    const custFile = document.getElementById("customer-chat-file-input");
    if (custAttach && custFile) {
        custAttach.onclick = () => custFile.click();
        custFile.onchange = () => {
            if (custFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    window.sendActiveChatMessage("[Attached Image]", e.target.result);
                };
                reader.readAsDataURL(custFile.files[0]);
            }
        };
    }

    const hostAttach = document.getElementById("host-chat-attach-btn");
    const hostFile = document.getElementById("host-chat-file-input");
    if (hostAttach && hostFile) {
        hostAttach.onclick = () => hostFile.click();
        hostFile.onchange = () => {
            if (hostFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    window.sendActiveChatMessage("[Attached Image]", e.target.result);
                };
                reader.readAsDataURL(hostFile.files[0]);
            }
        };
    }
};

/* ==========================================
   NOTIFICATIONS BELL POPOVER
   ========================================== */
window.initNotificationsBell = function(session) {
    const bellBtn = document.getElementById("notifications-bell-btn");
    const popover = document.getElementById("notifications-popover");
    if (!bellBtn || !popover) return;

    bellBtn.onclick = (e) => {
        e.stopPropagation();
        if (popover.style.display === "none" || !popover.style.display) {
            window.renderNotificationsList(session);
            popover.style.display = "block";
            // Mark read on opening
            RoomBnbAPI.markNotificationsRead(session.id).then(() => {
                window.updateBellBadgeCount(session);
            });
        } else {
            popover.style.display = "none";
        }
    };

    document.addEventListener("click", () => {
        popover.style.display = "none";
    });

    popover.onclick = (e) => e.stopPropagation();

    window.updateBellBadgeCount(session);
};

window.updateBellBadgeCount = async function(session) {
    const badge = document.getElementById("notif-badge-count");
    if (!badge) return;

    try {
        const notifs = await RoomBnbAPI.getNotifications(session.id);
        const unreadCount = notifs.filter(n => !n.read).length;

        // Also add unread chat counts to badge
        const chats = await RoomBnbAPI.getChats(session.role, session.id);
        const unreadChats = chats.reduce((sum, c) => sum + c.unreadCount, 0);

        const totalUnread = unreadCount + unreadChats;

        if (totalUnread > 0) {
            badge.textContent = totalUnread;
            badge.style.display = "grid";
        } else {
            badge.style.display = "none";
        }
    } catch (err) {
        console.error("Error updating bell count:", err);
    }
};

window.renderNotificationsList = async function(session) {
    const list = document.getElementById("notif-popover-list");
    if (!list) return;

    try {
        const notifs = await RoomBnbAPI.getNotifications(session.id);
        list.innerHTML = notifs.length
            ? notifs.map(n => `
                <div class="notif-item ${!n.read ? 'unread' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="notif-title">${RoomBnbAPI.escapeHtml(n.title)}</span>
                        <span class="notif-date">${n.date.split(",")[0]}</span>
                    </div>
                    <p class="notif-text">${RoomBnbAPI.escapeHtml(n.message)}</p>
                </div>
            `).join("")
            : `<div style="padding:16px; color:var(--text-muted); text-align:center; font-size:0.82rem;">No notifications.</div>`;
    } catch (err) {
        list.innerHTML = `<div style="padding:16px; color:var(--text-muted); text-align:center;">Failed to load.</div>`;
    }
};

/* ==========================================
   PRINTABLE PDF INVOICES
   ========================================== */
window.printInvoiceForBooking = async function(bookingId) {
    try {
        const bookings = await RoomBnbAPI.getBookings(window.activeSession.role, window.activeSession.id);
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const properties = await RoomBnbAPI.getProperties();
        const property = properties.find(p => p.id === booking.propertyId);

        let printContainer = document.getElementById("print-invoice-invoice-container");
        if (!printContainer) {
            printContainer = document.createElement("div");
            printContainer.id = "print-invoice-invoice-container";
            printContainer.className = "print-only-container";
            document.body.appendChild(printContainer);
        }

        printContainer.innerHTML = `
            <div style="padding:40px; font-family:'Outfit', sans-serif; color:#0f172a;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:20px; margin-bottom:20px;">
                    <div>
                        <h1 style="font-size:2.5rem; font-weight:900; margin:0; color:#ff385c;">RoomBnB</h1>
                        <span style="font-size:0.9rem; color:#64748b;">Booking Invoice & Stay Receipt</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; font-size:1.1rem;">Invoice #${booking.id.toUpperCase()}</div>
                        <div style="font-size:0.85rem; color:#64748b;">Issued on ${booking.createdAt}</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-bottom:30px;">
                    <div>
                        <h4 style="text-transform:uppercase; color:#64748b; font-size:0.75rem; margin-bottom:6px; font-weight:800;">Billing Details</h4>
                        <div style="font-weight:700; font-size:1.05rem;">${RoomBnbAPI.escapeHtml(booking.customerName)}</div>
                        <div style="font-size:0.88rem; color:#475569;">Traveler (Guest) ID: ${booking.customerId}</div>
                    </div>
                    <div>
                        <h4 style="text-transform:uppercase; color:#64748b; font-size:0.75rem; margin-bottom:6px; font-weight:800;">Property & Host Details</h4>
                        <div style="font-weight:700; font-size:1.05rem;">${RoomBnbAPI.escapeHtml(property?.name || "Stay Property")}</div>
                        <div style="font-size:0.88rem; color:#475569;">Host Owner ID: ${booking.hostId}</div>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; text-align:left;">
                    <thead>
                        <tr style="background:#f1f5f9; font-size:0.85rem; text-transform:uppercase; font-weight:800; color:#475569;">
                            <th style="padding:12px; border:1px solid #e2e8f0;">Stay Description</th>
                            <th style="padding:12px; border:1px solid #e2e8f0; text-align:center;">Nights</th>
                            <th style="padding:12px; border:1px solid #e2e8f0; text-align:right;">Rate</th>
                            <th style="padding:12px; border:1px solid #e2e8f0; text-align:right;">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="font-size:0.95rem;">
                            <td style="padding:12px; border:1px solid #e2e8f0;">
                                <strong>Reservation Stay Request</strong><br>
                                <span style="font-size:0.82rem; color:#64748b;">From: ${booking.checkIn} to ${booking.checkOut} &bull; ${booking.guestsCount} guests</span>
                            </td>
                            <td style="padding:12px; border:1px solid #e2e8f0; text-align:center;">${booking.nights}</td>
                            <td style="padding:12px; border:1px solid #e2e8f0; text-align:right;">$${booking.basePrice / booking.nights}</td>
                            <td style="padding:12px; border:1px solid #e2e8f0; text-align:right;">$${booking.basePrice}</td>
                        </tr>
                        <tr style="font-size:0.9rem; color:#475569;">
                            <td colspan="3" style="padding:10px; border:1px solid #e2e8f0; text-align:right; font-weight:700;">10% Lodging Tax</td>
                            <td style="padding:10px; border:1px solid #e2e8f0; text-align:right;">$${booking.tax}</td>
                        </tr>
                        <tr style="font-size:0.9rem; color:#475569;">
                            <td colspan="3" style="padding:10px; border:1px solid #e2e8f0; text-align:right; font-weight:700;">5% Service Fee</td>
                            <td style="padding:10px; border:1px solid #e2e8f0; text-align:right;">$${booking.serviceFee}</td>
                        </tr>
                        ${booking.discountApplied > 0 ? `
                        <tr style="font-size:0.9rem; color:#15803d; background:#f0fdf4;">
                            <td colspan="3" style="padding:10px; border:1px solid #e2e8f0; text-align:right; font-weight:700;">Coupon Discount (${booking.couponCode})</td>
                            <td style="padding:10px; border:1px solid #e2e8f0; text-align:right;">-$${booking.discountApplied}</td>
                        </tr>
                        ` : ''}
                        <tr style="font-size:1.15rem; font-weight:900;">
                            <td colspan="3" style="padding:12px; border:1px solid #e2e8f0; text-align:right; background:#f8fafc;">Total Paid Amount</td>
                            <td style="padding:12px; border:1px solid #e2e8f0; text-align:right; background:#f8fafc; color:#ff385c;">$${booking.totalPrice}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:20px; margin-top:40px;">
                    <div>
                        <div style="font-weight:700; font-size:0.9rem;">Payment Status: <span style="color:#15803d;">CONFIRMED (${booking.paymentMethod})</span></div>
                        <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">All transactions are secure and encrypted. Thank you for booking with RoomBnB!</div>
                    </div>
                    <div style="text-align:right; font-weight:800; font-size:0.9rem; opacity:0.8;">
                        RoomBnB Inc.
                    </div>
                </div>
            </div>
        `;

        window.print();
    } catch (err) {
        RoomBnbAPI.showToast("Failed to print receipt.", "error");
    }
};

/* ==========================================
   DRAG & DROP COMPARISON DRAWER
   ========================================== */
window.initDragAndDrop = function() {
    const drawer = document.getElementById("favorites-drawer");
    const dropZone = document.getElementById("favorites-drop-zone");
    const list = document.getElementById("favorites-list");
    const header = document.getElementById("favorites-header");
    const count = document.getElementById("favorites-count");
    const toggle = document.getElementById("favorites-toggle");

    if (!drawer || !dropZone) return;

    // Remove old listeners cleanly
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    newHeader.onclick = () => {
        drawer.classList.toggle("open");
    };

    if (toggle) {
        toggle.onclick = () => {
            drawer.classList.toggle("open");
        };
    }

    // Drag events delegation
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".property-card");
        if (card) {
            e.dataTransfer.setData("text/plain", card.dataset.id);
            dropZone.classList.add("drag-over");
        }
    });

    document.addEventListener("dragend", () => {
        dropZone.classList.remove("drag-over");
    });

    dropZone.ondragover = (e) => {
        e.preventDefault();
    };

    dropZone.ondrop = async (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/plain");

        if (id && window.activeSession) {
            try {
                await RoomBnbAPI.addFavorite(window.activeSession.id, id);
                RoomBnbAPI.showToast("Added to compare wishlist!");
                window.renderFavorites();
                if (document.getElementById("customer-view")) {
                    if (typeof window.renderWishlistTab === 'function') window.renderWishlistTab();
                }
            } catch (err) {
                console.error(err);
            }
        } else if (!window.activeSession) {
            RoomBnbAPI.showToast("Please log in to add favorites.", "error");
        }
    };

    window.renderFavorites();
};

window.renderFavorites = async function() {
    const list = document.getElementById("favorites-list");
    const count = document.getElementById("favorites-count");
    const drawer = document.getElementById("favorites-drawer");
    if (!list) return;

    if (!window.activeSession) {
        list.innerHTML = `<div style="padding:16px; color:var(--text-muted); font-size:0.85rem; text-align:center;">Sign in to view compare wishlist.</div>`;
        if (count) count.textContent = "0";
        return;
    }

    try {
        const favIds = await RoomBnbAPI.getFavorites(window.activeSession.id);
        if (count) count.textContent = favIds.length;

        if (favIds.length === 0) {
            list.innerHTML = `<div class="drop-zone-prompt">Drag properties here to compare details side-by-side.</div>`;
            drawer.style.display = "none";
            return;
        }

        drawer.style.display = "block";

        const properties = await RoomBnbAPI.getProperties();
        const favsList = properties.filter(p => favIds.includes(p.id));

        list.innerHTML = favsList.map(property => `
            <div class="favorite-item">
                <div class="fav-item-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" style="width:50px; height:50px; border-radius:6px; background-size:cover;"></div>
                <div style="flex-grow:1; min-width:0;">
                    <div class="fav-item-title">${RoomBnbAPI.escapeHtml(property.name)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">$${property.price}/night &bull; ★ ${property.rating.toFixed(2)}</div>
                </div>
                <button type="button" class="remove-fav-btn" data-remove-fav-id="${property.id}" style="background:none; border:none; color:var(--primary); font-size:1.15rem; cursor:pointer;">&times;</button>
            </div>
        `).join("");

        list.querySelectorAll(".remove-fav-btn").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.removeFavId;
                await RoomBnbAPI.removeFavorite(window.activeSession.id, id);
                RoomBnbAPI.showToast("Removed from compare wishlist.");
                window.renderFavorites();
                if (document.getElementById("customer-view")) {
                    if (typeof window.renderWishlistTab === 'function') window.renderWishlistTab();
                }
            };
        });
    } catch (err) {
        console.error("Error rendering favorites:", err);
    }
};

/* ==========================================
   GEOLOCATION ENGINES
   ========================================== */
window.handleGeolocation = function() {
    const geoBtn = document.getElementById("geo-btn");
    const locInput = document.querySelector('input[name="location"]');
    if (!geoBtn || !locInput) return;

    geoBtn.classList.add("loading");
    geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Mocking reverse geocoding for presentation
            setTimeout(() => {
                locInput.value = "Malibu, California (Detected Location)";
                geoBtn.classList.remove("loading");
                geoBtn.disabled = false;
                RoomBnbAPI.showToast("Location detected successfully!");
            }, 1500);
        },
        (error) => {
            geoBtn.classList.remove("loading");
            geoBtn.disabled = false;
            RoomBnbAPI.showToast("Unable to retrieve location permission.", "error");
        },
        { enableHighAccuracy: true, timeout: 6000 }
    );
};
