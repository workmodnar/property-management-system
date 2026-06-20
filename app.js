const store = RoomBnbStore;
let appData = store.loadData();
let visibleProperties = [...appData.properties];
let activeSession = store.loadSession();

// Calendar state for currently open property modal
let bookingCheckIn = null;
let bookingCheckOut = null;
let activePropertyForBooking = null;

// Chat state
let activeConvoId = null;

/* ==========================================
   HELPER UTILITIES
   ========================================== */
function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function updateElementVisibility(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "flex" : "none";
}

/* ==========================================
   STICKY HEADER & SCROLL REVEAL ANIMATIONS
   ========================================== */
function initAnimations() {
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
}

/* ==========================================
   TABS MANAGEMENT (DASHBOARDS)
   ========================================== */
function initDashboardTabs() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    if (menuItems.length === 0) return;

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            // Remove active classes
            menuItems.forEach(mi => mi.classList.remove("active"));
            document.querySelectorAll(".dashboard-pane").forEach(pane => pane.classList.remove("active"));

            // Add active to current
            item.classList.add("active");
            const targetId = item.dataset.tabTarget;
            const targetPane = document.getElementById(`${targetId}-pane`);
            if (targetPane) {
                targetPane.classList.add("active");
            }
            
            // Special triggers when switching tabs
            if (targetId === "customer-favorites") {
                renderWishlistTab();
            } else if (targetId === "customer-chat" || targetId === "host-chat") {
                renderChatInbox();
            }
        });
    });
}

/* ==========================================
   NAVIGATION & SESSION HEADER RENDERER
   ========================================== */
function updateNavbar(session) {
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
                <span>${store.escapeHtml(session.name)} (${store.escapeHtml(session.role)})</span>
            </div>
            <button class="nav-action" type="button" data-logout-button>Logout</button>
        `;

        const logoutBtn = sessionActions.querySelector("[data-logout-button]");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                store.logout();
            });
        }
    }

    // Email Verification Banner check
    const banner = document.getElementById("email-verification-banner");
    if (banner) {
        if (session) {
            const users = store.loadUsers();
            const currentUser = users.find(u => u.id === session.id);
            if (currentUser && !currentUser.verified) {
                banner.style.display = "block";
            } else {
                banner.style.display = "none";
            }
        } else {
            banner.style.display = "none";
        }
    }
}

/* ==========================================
   HOMEPAGE VIEW CONTROLLER
   ========================================== */
function initHomeView(session) {
    document.title = `${appData.siteName} | Book Unique Stays`;

    // Render landing copywriting
    setText("[data-hero-eyebrow]", appData.hero.eyebrow);
    setText("[data-hero-title]", appData.hero.title);
    setText("[data-hero-description]", appData.hero.description);
    setText("[data-properties-heading]", appData.sections.propertiesHeading);
    setText("[data-properties-description]", appData.sections.propertiesDescription);
    setText("[data-owner-title]", appData.sections.ownerTitle);
    setText("[data-owner-description]", appData.sections.ownerDescription);
    setText("[data-footer-text]", appData.sections.footerText);

    const registerSection = document.getElementById("register");
    if (registerSection) {
        registerSection.style.display = session ? "none" : "block";
    }

    renderHomeStats();
    renderHomeProperties();
    renderHomeServices();
    renderPropertyTypes();

    // Toggle advanced filters panel
    const filterBtn = document.getElementById("trigger-advanced-filters-btn");
    const advancedFilters = document.getElementById("advanced-filters-container");
    if (filterBtn && advancedFilters) {
        filterBtn.onclick = () => {
            if (advancedFilters.style.display === "none") {
                advancedFilters.style.display = "flex";
            } else {
                advancedFilters.style.display = "none";
            }
        };
    }
}

function renderHomeStats() {
    const statsList = document.querySelector("[data-stats-list]");
    if (statsList) {
        statsList.innerHTML = appData.stats.map(stat => `
            <div class="stat">
                <strong>${store.escapeHtml(stat.value)}</strong>
                <span>${store.escapeHtml(stat.label)}</span>
            </div>
        `).join("");
    }
}

function renderHomeProperties() {
    const list = document.querySelector("[data-property-list]");
    if (list) {
        const favs = store.loadFavorites();
        list.innerHTML = visibleProperties.length
            ? visibleProperties.map(property => {
                const isFav = favs.includes(property.id) ? "active" : "";
                return `
                    <article class="property-card" draggable="true" data-id="${property.id}">
                        <div class="property-photo ${store.escapeHtml(property.photoClass)}">
                            <span class="property-card-badge">${store.escapeHtml(property.type)}</span>
                            <button class="property-card-fav ${isFav}" data-fav-toggle-id="${property.id}">❤️</button>
                        </div>
                        <div class="property-info">
                            <div class="property-top">
                                <h3>${store.escapeHtml(property.name)}</h3>
                                <span class="rating">${Number(property.rating).toFixed(2)}</span>
                            </div>
                            <p>${store.escapeHtml(property.description)}</p>
                            <div style="display:flex; gap:12px; font-size:0.82rem; color:var(--text-muted); font-weight:700; margin-bottom:12px;">
                                <span>👥 ${property.capacity} guests</span>
                                <span>🛏️ ${property.bedrooms} beds</span>
                                <span>🛁 ${property.bathrooms} baths</span>
                            </div>
                            <div class="property-price-box">
                                <div class="price">$${Number(property.price).toLocaleString()} <span>/ night</span></div>
                                <button class="mini-button" type="button" data-view-property="${property.id}">View Details</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join("")
            : `<div style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-muted);">
                 <h3>No stays found matching filters.</h3>
                 <p>Try resetting some options or search terms.</p>
               </div>`;
    }
}

function renderHomeServices() {
    const list = document.querySelector("[data-service-list]");
    if (list) {
        list.innerHTML = appData.services.map((service, idx) => `
            <article class="feature-item">
                <div class="feature-icon">${idx + 1}</div>
                <div>
                    <h3>${store.escapeHtml(service.title)}</h3>
                    <p>${store.escapeHtml(service.description)}</p>
                </div>
            </article>
        `).join("");
    }
}

function renderPropertyTypes() {
    const select = document.querySelector("[data-property-type-filter]");
    if (select) {
        const types = [...new Set(appData.properties.map(p => p.type))];
        select.innerHTML = `
            <option value="all">All property types</option>
            ${types.map(type => `<option value="${store.escapeHtml(type)}">${store.escapeHtml(type)}</option>`).join("")}
        `;
    }
}

function handleSearch(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedType = form.propertyType.value;
    const location = form.location.value.trim();
    const guests = form.guests.value ? Number(form.guests.value) : 0;
    
    // Advanced fields
    const minPrice = form.minPrice?.value ? Number(form.minPrice.value) : 0;
    const maxPrice = form.maxPrice?.value ? Number(form.maxPrice.value) : Infinity;
    const minRating = form.minRating?.value ? Number(form.minRating.value) : 0;
    const checkIn = form.filterCheckIn?.value;
    const checkOut = form.filterCheckOut?.value;

    const selectedAmenities = [];
    document.querySelectorAll("#search-amenities-checks input:checked").forEach(cb => {
        selectedAmenities.push(cb.value);
    });

    visibleProperties = appData.properties.filter(property => {
        // 1. Type
        if (selectedType !== "all" && property.type !== selectedType) return false;
        
        // 2. Location
        if (location) {
            const query = location.toLowerCase();
            const matchesLoc = property.name.toLowerCase().includes(query) ||
                               property.description.toLowerCase().includes(query) ||
                               property.type.toLowerCase().includes(query);
            if (!matchesLoc) return false;
        }

        // 3. Guests Capacity
        if (guests && property.capacity < guests) return false;

        // 4. Price bounds
        if (property.price < minPrice || property.price > maxPrice) return false;

        // 5. Rating threshold
        if (property.rating < minRating) return false;

        // 6. Amenities checklists
        if (selectedAmenities.length > 0) {
            const hasAll = selectedAmenities.every(a => property.amenities.includes(a));
            if (!hasAll) return false;
        }

        // 7. Date check boundaries
        if (checkIn && checkOut && property.bookedDates) {
            const overlaps = checkDatesOverlap(checkIn, checkOut, property.bookedDates);
            if (overlaps) return false;
        }

        return true;
    });

    const searchMsg = document.querySelector("[data-search-message]");
    if (searchMsg) {
        searchMsg.textContent = `Showing ${visibleProperties.length} stay(s) matching criteria.`;
    }

    renderHomeProperties();
}

function checkDatesOverlap(start, end, bookedList) {
    const checkStart = new Date(start);
    const checkEnd = new Date(end);
    
    for (const bookedDateStr of bookedList) {
        const booked = new Date(bookedDateStr);
        if (booked >= checkStart && booked <= checkEnd) {
            return true;
        }
    }
    return false;
}

/* ==========================================
   AUTHENTICATION LOGIC (LOGIN, 2FA, REG)
   ========================================== */
function initLoginView() {
    const loginError = document.querySelector("[data-login-error]");
    if (loginError) loginError.textContent = "";

    // Google Sign-In mock trigger
    const googleBtn = document.getElementById("google-login-btn");
    if (googleBtn) {
        googleBtn.onclick = () => {
            // Google Mock Auto Signin as Guest
            const users = store.loadUsers();
            let gUser = users.find(u => u.email === "google-user@gmail.com");
            if (!gUser) {
                store.addUser("Google Traveler", "google-user@gmail.com", "googlepassword", "Mountain View, CA", "customer", "+1555000111");
                gUser = store.loadUsers().find(u => u.email === "google-user@gmail.com");
            }
            // Save Session
            store.saveSession({
                id: gUser.id,
                name: gUser.name,
                role: gUser.role
            });
            store.showToast("Logged in successfully with Google Mock!");
            setTimeout(() => {
                window.location.href = "customer.html";
            }, 1000);
        };
    }
}

function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value;
    const loginError = document.querySelector("[data-login-error]");

    const user = store.findUser(email, password);
    if (!user || user.role !== role) {
        if (loginError) loginError.textContent = "Invalid email or password for selected role.";
        return;
    }

    // Proceed login directly
    const session = {
        id: user.id,
        name: user.name,
        role: user.role
    };
    store.saveSession(session);
    
    // Redirect to correct dashboard based on role
    if (user.role === "admin") {
        window.location.href = "admin.html";
    } else if (user.role === "host") {
        window.location.href = "host.html";
    } else {
        window.location.href = "customer.html";
    }
}

function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const address = form.address.value.trim();
    const phone = form.phone.value.trim();
    const role = form.role.value;
    const errorEl = document.querySelector("[data-register-error]");

    const created = store.addUser(name, email, password, address, role, phone);
    if (!created) {
        if (errorEl) errorEl.textContent = "Email is already registered.";
        return;
    }

    sessionStorage.setItem("register_success", "true");
    window.location.href = "login.html";
}

/* ==========================================
   CUSTOMER DASHBOARD VIEW CONTROLLER
   ========================================== */
function initCustomerView(session) {
    // Render available properties to browse inside customer dashboard
    renderCustomerProperties();
    renderCustomerRequests(session);
    renderWishlistTab();
    renderChatInbox();
    renderProfileDetails(session);
    initNotificationsBell(session);
}

function renderCustomerProperties() {
    const list = document.querySelector("#customer-properties-pane [data-property-list]");
    if (list) {
        const favs = store.loadFavorites();
        list.innerHTML = appData.properties.map(property => {
            const isFav = favs.includes(property.id) ? "active" : "";
            return `
                <article class="property-card" draggable="true" data-id="${property.id}">
                    <div class="property-photo ${store.escapeHtml(property.photoClass)}">
                        <span class="property-card-badge">${store.escapeHtml(property.type)}</span>
                        <button class="property-card-fav ${isFav}" data-fav-toggle-id="${property.id}">❤️</button>
                    </div>
                    <div class="property-info">
                        <div class="property-top">
                            <h3>${store.escapeHtml(property.name)}</h3>
                            <span class="rating">${Number(property.rating).toFixed(2)}</span>
                        </div>
                        <p>${store.escapeHtml(property.description)}</p>
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
    }
}

function renderCustomerRequests(session) {
    const requestsList = document.querySelector("[data-customer-requests]");
    if (requestsList) {
        const requests = appData.bookings.filter(b => b.customerId === session.id);
        requestsList.innerHTML = requests.length
            ? requests.map(booking => {
                const property = appData.properties.find(item => item.id === booking.propertyId);
                const statusLower = booking.status.toLowerCase();
                
                // Show cancel button if request is active (pending or paid/approved)
                const showCancel = ["pending", "approved", "paid"].includes(statusLower);
                
                // Allow reviews if paid/approved/completed
                const showReview = ["paid", "approved", "completed"].includes(statusLower);

                return `
                    <article class="request-card">
                        <div class="request-card-info">
                            <h3>${store.escapeHtml(property?.name || "Deleted Property")}</h3>
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
    }
}

function renderWishlistTab() {
    const list = document.querySelector("[data-customer-favorites-list]");
    if (!list) return;

    const favIds = store.loadFavorites();
    const favProperties = appData.properties.filter(p => favIds.includes(p.id));

    list.innerHTML = favProperties.length
        ? favProperties.map(property => `
            <article class="property-card" data-id="${property.id}">
                <div class="property-photo ${store.escapeHtml(property.photoClass)}">
                    <span class="property-card-badge">${store.escapeHtml(property.type)}</span>
                    <button class="property-card-fav active" data-fav-toggle-id="${property.id}">❤️</button>
                </div>
                <div class="property-info">
                    <div class="property-top">
                        <h3>${store.escapeHtml(property.name)}</h3>
                        <span class="rating">${Number(property.rating).toFixed(2)}</span>
                    </div>
                    <p>${store.escapeHtml(property.description)}</p>
                    <div class="property-price-box">
                        <div class="price">$${property.price} <span>/ night</span></div>
                        <button class="mini-button" type="button" data-view-property="${property.id}">Book Now</button>
                    </div>
                </div>
            </article>
        `).join("")
        : `<div style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-muted);">
             <h3>Your wishlist is empty.</h3>
             <p>Click the heart icon on properties to save them here.</p>
           </div>`;
}

function renderProfileDetails(session) {
    const users = store.loadUsers();
    const user = users.find(u => u.id === session.id);
    if (!user) return;

    // Set form defaults
    const form = document.getElementById("profile-update-form");
    if (form) {
        form.name.value = user.name || "";
        form.phone.value = user.phone || "";
        form.address.value = user.address || "";
    }

    // Set avatar large
    const avatarView = document.getElementById("profile-avatar-view");
    if (avatarView) {
        if (user.profilePic) {
            avatarView.style.backgroundImage = `url('${user.profilePic}')`;
        } else {
            avatarView.style.backgroundImage = "none";
            avatarView.style.backgroundColor = "var(--border)";
        }
    }

    // Identity badge toggle
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
}

/* ==========================================
   HOST DASHBOARD VIEW CONTROLLER
   ========================================== */
function initHostView(session) {
    renderHostAnalytics(session);
    renderHostProperties(session);
    renderHostBookings(session);
    renderChatInbox();

    // Check verified host status
    const users = store.loadUsers();
    const hostUser = users.find(u => u.id === session.id);
    const badge = document.getElementById("host-verified-badge");
    if (badge && hostUser && hostUser.verified) {
        badge.style.display = "inline-flex";
    }
}

function renderHostAnalytics(session) {
    const hostListings = appData.properties.filter(p => p.hostId === session.id);
    const hostListingIds = hostListings.map(l => l.id);
    const hostBookings = appData.bookings.filter(b => hostListingIds.includes(b.propertyId));

    // Earnings calculation (paid bookings)
    const paidBookings = hostBookings.filter(b => b.status === "Paid" || b.status === "Approved" || b.status === "Completed");
    const earnings = paidBookings.reduce((sum, b) => sum + b.basePrice, 0);

    setText("#host-total-earnings", `$${earnings.toLocaleString()}`);
    setText("#host-active-bookings-count", hostBookings.filter(b => b.status === "Paid" || b.status === "Approved").length);
    setText("#host-total-listings-count", hostListings.length);
}

function renderHostProperties(session) {
    const grid = document.querySelector("[data-host-properties-list]");
    if (grid) {
        const hostListings = appData.properties.filter(p => p.hostId === session.id);
        grid.innerHTML = hostListings.length
            ? hostListings.map(property => `
                <article class="property-card" data-id="${property.id}">
                    <div class="property-photo ${store.escapeHtml(property.photoClass)}">
                        <span class="property-card-badge">${store.escapeHtml(property.type)}</span>
                    </div>
                    <div class="property-info">
                        <div class="property-top">
                            <h3>${store.escapeHtml(property.name)}</h3>
                            <span class="rating">${Number(property.rating).toFixed(2)}</span>
                        </div>
                        <p>${store.escapeHtml(property.description)}</p>
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
            `).join("")
            : `<div style="grid-column: span 3; text-align:center; padding:40px; color:var(--text-muted);">
                 <h3>You haven't listed any stays yet.</h3>
                 <p>Click "Create Listing" at the top to list your first place.</p>
               </div>`;
    }
}

function renderHostBookings(session) {
    const list = document.querySelector("[data-host-bookings-list]");
    if (list) {
        const hostListings = appData.properties.filter(p => p.hostId === session.id);
        const hostListingIds = hostListings.map(l => l.id);
        const bookings = appData.bookings.filter(b => hostListingIds.includes(b.propertyId));

        list.innerHTML = bookings.length
            ? bookings.map(booking => {
                const property = hostListings.find(l => l.id === booking.propertyId);
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
                            <h3>${store.escapeHtml(property?.name || "Deleted Property")}</h3>
                            <p style="font-weight:700; font-size:0.9rem; color:var(--text-muted);">
                                Guest: ${store.escapeHtml(booking.customerName)} &bull; ${booking.checkIn} to ${booking.checkOut}
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
    }
}

/* ==========================================
   ADMIN PANEL CONTROLLER
   ========================================== */
function initAdminView(session) {
    // Fill site copywriting form fields
    const siteForm = document.querySelector("[data-site-form]");
    if (siteForm) {
        siteForm.siteName.value = appData.siteName;
        siteForm.heroEyebrow.value = appData.hero.eyebrow;
        siteForm.heroTitle.value = appData.hero.title;
        siteForm.heroDescription.value = appData.hero.description;
    }

    renderAdminCopyLists();
    renderAdminPropertiesGrid();
    renderAdminRequests();
    renderAdminUsersList();
    renderAdminReportedReviews();
}

function renderAdminCopyLists() {
    const propertiesEl = document.querySelector("[data-admin-properties]");
    if (propertiesEl) {
        propertiesEl.innerHTML = appData.properties.map(property => `
            <div class="admin-list-row">
                <span>${store.escapeHtml(property.name)}</span>
                <div class="card-actions">
                    <button class="mini-button" type="button" data-edit-property="${property.id}">Edit</button>
                    <button class="mini-button danger-button" type="button" data-delete-property="${property.id}">Delete</button>
                </div>
            </div>
        `).join("");
    }

    const statsEl = document.querySelector("[data-admin-stats]");
    if (statsEl) {
        statsEl.innerHTML = appData.stats.map(stat => `
            <div class="admin-list-row">
                <span>${store.escapeHtml(stat.value)} ${store.escapeHtml(stat.label)}</span>
                <div class="card-actions">
                    <button class="mini-button" type="button" data-edit-stat="${stat.id}">Edit</button>
                    <button class="mini-button danger-button" type="button" data-delete-stat="${stat.id}">Delete</button>
                </div>
            </div>
        `).join("");
    }

    const servicesEl = document.querySelector("[data-admin-services]");
    if (servicesEl) {
        servicesEl.innerHTML = appData.services.map(service => `
            <div class="admin-list-row">
                <span>${store.escapeHtml(service.title)}</span>
                <div class="card-actions">
                    <button class="mini-button" type="button" data-edit-service="${service.id}">Edit</button>
                    <button class="mini-button danger-button" type="button" data-delete-service="${service.id}">Delete</button>
                </div>
            </div>
        `).join("");
    }
}

function renderAdminPropertiesGrid() {
    const grid = document.querySelector("[data-admin-properties-grid]");
    if (grid) {
        grid.innerHTML = appData.properties.map(property => `
            <article class="property-card" data-id="${property.id}">
                <div class="property-photo ${store.escapeHtml(property.photoClass)}">
                    <span class="property-card-badge">${store.escapeHtml(property.type)}</span>
                </div>
                <div class="property-info">
                    <div class="property-top">
                        <h3>${store.escapeHtml(property.name)}</h3>
                        <span class="rating">${Number(property.rating).toFixed(2)}</span>
                    </div>
                    <p>${store.escapeHtml(property.description)}</p>
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
        `).join("");
    }
}

function renderAdminRequests() {
    const list = document.querySelector("[data-admin-requests]");
    if (list) {
        list.innerHTML = appData.bookings.length
            ? appData.bookings.map(booking => {
                const property = appData.properties.find(item => item.id === booking.propertyId);
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
                            <h3>${store.escapeHtml(property?.name || "Deleted Property")}</h3>
                            <p style="font-weight:700; font-size:0.9rem;">
                                Customer: ${store.escapeHtml(booking.customerName)} &bull; Host ID: ${booking.hostId}
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
    }
}

function renderAdminUsersList() {
    const tbody = document.getElementById("admin-users-table-body");
    if (tbody) {
        const users = store.loadUsers();
        tbody.innerHTML = users.map(user => {
            const verText = user.verified ? `<span class="verified-badge">Verified ✓</span>` : `<span style="color:var(--text-muted); font-weight:700;">Unverified</span>`;
            return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding:12px; font-weight:700;">${store.escapeHtml(user.name)}</td>
                    <td style="padding:12px; color:var(--text-muted);">${store.escapeHtml(user.email)}</td>
                    <td style="padding:12px; color:var(--text-muted);">${store.escapeHtml(user.phone || "N/A")}</td>
                    <td style="padding:12px; font-weight:800; text-transform:uppercase; font-size:0.8rem; color:var(--accent);">${store.escapeHtml(user.role)}</td>
                    <td style="padding:12px;">${verText}</td>
                    <td style="padding:12px; text-align:center;">
                        <button class="mini-button" type="button" data-admin-toggle-user-id="${user.id}">Toggle Verification</button>
                    </td>
                </tr>
            `;
        }).join("");
    }
}

function renderAdminReportedReviews() {
    const list = document.getElementById("admin-reported-reviews-list");
    if (!list) return;

    const reportedReviews = [];
    appData.properties.forEach(p => {
        if (p.reviews) {
            p.reviews.forEach(r => {
                if (r.reported) {
                    reportedReviews.push({
                        propertyId: p.id,
                        propertyName: p.name,
                        review: r
                    });
                }
            });
        }
    });

    list.innerHTML = reportedReviews.length
        ? reportedReviews.map(item => `
            <article class="request-card">
                <div>
                    <h3>Property: ${store.escapeHtml(item.propertyName)}</h3>
                    <p style="font-weight:700; color:var(--text-muted); margin-bottom:6px;">Reviewer: ${store.escapeHtml(item.review.reviewerName)} (Rating: ★ ${item.review.rating})</p>
                    <p style="font-style:italic; background:var(--background); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border); font-size:0.92rem; color:var(--text);">"${store.escapeHtml(item.review.text)}"</p>
                </div>
                <div>
                    <button class="mini-button danger-button" type="button" data-admin-delete-review-prop-id="${item.propertyId}" data-admin-delete-review-id="${item.review.id}">Remove Review</button>
                </div>
            </article>
        `).join("")
        : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
             <h3>No reported reviews to moderate.</h3>
           </div>`;
}

/* ==========================================
   INTERACTIVE DETAILS MODAL & CALENDAR RESERVATION
   ========================================== */
function getPropertyGalleryImages(property) {
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
}

function openPropertyDetailsModal(propertyId) {
    const property = appData.properties.find(p => p.id === propertyId);
    if (!property) return;

    activePropertyForBooking = property;
    bookingCheckIn = null;
    bookingCheckOut = null;

    const modal = document.getElementById("property-details-modal");
    if (!modal) return;

    const titleEl = document.getElementById("modal-prop-title");
    const bodyEl = document.getElementById("modal-prop-body");
    const footerEl = document.getElementById("modal-prop-footer");

    titleEl.textContent = property.name;

    const images = getPropertyGalleryImages(property);

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
            <!-- Left Info -->
            <div class="details-main-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="property-card-badge" style="position:static;">${store.escapeHtml(property.type)}</span>
                    <span class="rating" style="font-size:1.1rem;">${Number(property.rating).toFixed(2)}</span>
                </div>
                <div class="details-spec-row">
                    <span>👥 Max <strong>${property.capacity} guests</strong></span>
                    <span>🛏️ <strong>${property.bedrooms} bedrooms</strong></span>
                    <span>🛁 <strong>${property.bathrooms} bathrooms</strong></span>
                </div>
                <p style="font-size: 1.02rem; line-height: 1.6; color: var(--text);">
                    ${store.escapeHtml(property.description)}
                </p>
                
                <div class="details-host-card">
                    <div class="host-avatar">${property.hostName.charAt(0)}</div>
                    <div>
                        <div style="font-weight:800; font-size:0.95rem;">Hosted by ${store.escapeHtml(property.hostName)}</div>
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
                        ${property.rules.map(r => `<li>${store.escapeHtml(r)}</li>`).join("")}
                    </ul>
                </div>

                <!-- Interactive vector map mockup -->
                <div>
                    <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:4px;">Stays Location</h4>
                    <p style="font-size:0.88rem; color:var(--text-muted);">Exact location details are shared after booking verification.</p>
                    <div class="details-map">
                        <div class="map-pulse"></div>
                        <div class="map-pin">📍</div>
                    </div>
                </div>
            </div>

            <!-- Right booking invoice panel -->
            <div class="booking-form-box">
                <h3 style="font-weight:800; font-size:1.35rem; margin-bottom:10px;">Select Dates</h3>
                <div class="calendar-wrapper">
                    <div class="calendar-header">
                        <span>July 2026</span>
                    </div>
                    <div class="calendar-grid" id="modal-calendar-grid">
                        <!-- Populated by drawCalendar() -->
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
                    <label style="display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:0.82rem;">
                        Guests count
                        <input type="number" id="booking-guests-input" value="1" min="1" max="${property.capacity}" style="padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font:inherit;">
                    </label>
                    <label style="display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:0.82rem;">
                        Promo Coupon Code
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="booking-coupon-input" placeholder="e.g. WELCOME10" style="flex-grow:1; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font:inherit;">
                            <button type="button" class="mini-button" id="apply-coupon-btn" style="margin:0;">Apply</button>
                        </div>
                        <span id="coupon-calc-pill-box" style="margin-top:6px;"></span>
                    </label>
                </div>

                <!-- Price breakdown calculator -->
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

        <!-- Stays reviews list -->
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
                                        <div class="reviewer-name">${store.escapeHtml(r.reviewerName)}</div>
                                        <div class="reviewer-date">${r.date} &bull; Rated ★ ${r.rating}</div>
                                    </div>
                                </div>
                                <div>
                                    <button class="review-btn-tiny ${r.reported ? 'reported' : ''}" data-report-review-prop-id="${property.id}" data-report-review-id="${r.id}">
                                        ${r.reported ? 'Flagged ⚠️' : 'Report 🏳️'}
                                    </button>
                                </div>
                            </div>
                            <p>${store.escapeHtml(r.text)}</p>
                            ${r.photo ? `<img class="review-card-photo" src="${r.photo}" alt="review photo">` : ''}
                        </div>
                    `).join("")
                    : '<p style="color:var(--text-muted); font-size:0.95rem;">No reviews yet for this stay.</p>'
                }
            </div>
        </div>
    `;

    // Interactive slider logic
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

    drawCalendar(property.bookedDates);

    // Footer actions
    if (!activeSession) {
        footerEl.innerHTML = `
            <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
            <a class="button-primary" href="login.html" style="min-height:44px; display:inline-flex; align-items:center;">Log in to book stay</a>
        `;
    } else if (activeSession.role === "customer") {
        footerEl.innerHTML = `
            <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
            <button class="button-primary" type="button" id="confirm-booking-details-btn" style="min-height:44px; background:var(--accent);">Verify & Pay Stay</button>
        `;

        document.getElementById("confirm-booking-details-btn").onclick = () => {
            if (!bookingCheckIn || !bookingCheckOut) {
                store.showToast("Please choose check-in and check-out dates on the calendar.", "error");
                return;
            }
            // Close details modal, open payment modal
            modal.close();
            openPaymentModal();
        };
    } else {
        footerEl.innerHTML = `
            <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
        `;
    }

    modal.showModal();
}

function drawCalendar(bookedList = []) {
    const grid = document.getElementById("modal-calendar-grid");
    if (!grid) return;

    // Render calendar header labels
    const daysLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html = daysLabels.map(d => `<div class="calendar-day-label">${d}</div>`).join("");

    // July 2026 starts on Wednesday (index 3).
    // Pad first 3 empty days
    for (let i = 0; i < 3; i++) {
        html += `<div class="calendar-day disabled"></div>`;
    }

    // Render days 1 to 31
    for (let day = 1; day <= 31; day++) {
        const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
        const isBlocked = bookedList.includes(dateStr);
        let classes = "calendar-day";
        if (isBlocked) classes += " calendar-blocked";

        // Highlight selected
        if (bookingCheckIn && dateStr === bookingCheckIn) {
            classes += " selected";
        } else if (bookingCheckOut && dateStr === bookingCheckOut) {
            classes += " selected";
        } else if (bookingCheckIn && bookingCheckOut) {
            const startDay = Number(bookingCheckIn.split("-")[2]);
            const endDay = Number(bookingCheckOut.split("-")[2]);
            if (day > startDay && day < endDay) {
                classes += " in-range";
            }
        }

        html += `<div class="${classes}" data-calendar-day="${dateStr}">${day}</div>`;
    }

    grid.innerHTML = html;

    // Attach click events
    grid.querySelectorAll(".calendar-day:not(.calendar-blocked):not(.disabled)").forEach(el => {
        el.onclick = () => {
            const dateVal = el.dataset.calendarDay;
            handleCalendarDayClick(dateVal, bookedList);
        };
    });
}

function handleCalendarDayClick(dateStr, bookedList) {
    if (!bookingCheckIn || (bookingCheckIn && bookingCheckOut)) {
        bookingCheckIn = dateStr;
        bookingCheckOut = null;
    } else {
        const startDay = Number(bookingCheckIn.split("-")[2]);
        const endDay = Number(dateStr.split("-")[2]);

        if (endDay <= startDay) {
            // Clicked date is before check-in, set it as new check-in
            bookingCheckIn = dateStr;
        } else {
            // Check if any blocked dates overlap in between
            let dateOverlap = false;
            for (let d = startDay + 1; d < endDay; d++) {
                const checkStr = `2026-07-${d < 10 ? '0' + d : d}`;
                if (bookedList.includes(checkStr)) {
                    dateOverlap = true;
                    break;
                }
            }
            if (dateOverlap) {
                store.showToast("Selected range contains booked dates. Choose another range.", "error");
                bookingCheckIn = dateStr;
                bookingCheckOut = null;
            } else {
                bookingCheckOut = dateStr;
            }
        }
    }

    drawCalendar(bookedList);
    recalculateBookingBill();
}

function recalculateBookingBill() {
    if (!activePropertyForBooking) return;

    let nights = 0;
    if (bookingCheckIn && bookingCheckOut) {
        const startDay = Number(bookingCheckIn.split("-")[2]);
        const endDay = Number(bookingCheckOut.split("-")[2]);
        nights = endDay - startDay;
    }

    const price = activePropertyForBooking.price;
    const baseTotal = price * nights;
    const tax = Math.round(baseTotal * 0.1);
    const serviceFee = Math.round(baseTotal * 0.05);

    // Check coupon input
    const couponInput = document.getElementById("booking-coupon-input");
    const code = couponInput ? couponInput.value.toUpperCase().trim() : "";
    let discount = 0;

    if (code) {
        const coupon = appData.coupons.find(c => c.code === code);
        if (coupon) {
            if (coupon.discountType === "percent") {
                discount = Math.round(baseTotal * (coupon.value / 100));
            } else if (coupon.discountType === "flat") {
                discount = Math.min(coupon.value, baseTotal);
            }
        }
    }

    const grandTotal = Math.max(0, baseTotal + tax + serviceFee - discount);

    // Update views
    setText("#calc-base-label", `$${price} x ${nights} night${nights !== 1 ? 's' : ''}`);
    setText("#calc-base-val", `$${baseTotal}`);
    setText("#calc-tax-val", `$${tax}`);
    setText("#calc-fee-val", `$${serviceFee}`);
    setText("#calc-total-val", `$${grandTotal}`);

    const discRow = document.getElementById("calc-discount-row");
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = "flex";
            setText("#calc-discount-val", `-$${discount}`);
        } else {
            discRow.style.display = "none";
        }
    }
}

/* ==========================================
   PAYMENT GATEWAY ENGINE & GATE SIMULATION
   ========================================== */
function openPaymentModal() {
    if (!activePropertyForBooking || !bookingCheckIn || !bookingCheckOut) return;

    const modal = document.getElementById("payment-modal");
    if (!modal) return;

    // Reset forms & card labels
    document.getElementById("payment-submit-form").reset();
    setText("#cc-cardholder-view", "JOHN DOE");
    setText("#cc-cardnumber-view", "•••• •••• •••• ••••");
    setText("#cc-expiry-view", "MM/YY");
    setText("#cc-cvv-view", "•••");
    document.getElementById("cc-mockup").classList.remove("flipped");

    // Fetch grand total calculated inside properties details
    const totalPayableStr = document.getElementById("calc-total-val").textContent;
    setText("#payment-payable-amount", totalPayableStr);

    modal.showModal();
}

function initPaymentInputListeners() {
    // 1. Radio method tab triggers
    const cardRadio = document.getElementById("pay-card-radio");
    const upiRadio = document.getElementById("pay-upi-radio");
    const cardPanel = document.getElementById("payment-card-panel");
    const upiPanel = document.getElementById("payment-upi-panel");

    if (cardRadio && upiRadio && cardPanel && upiPanel) {
        cardRadio.onchange = () => {
            cardPanel.hidden = false;
            upiPanel.hidden = true;
            // set card inputs required, upi optional
            togglePaymentInputsRequired(true);
        };
        upiRadio.onchange = () => {
            cardPanel.hidden = true;
            upiPanel.hidden = false;
            togglePaymentInputsRequired(false);
        };
    }

    // 2. Card Visual Inputs sync
    const ccName = document.getElementById("cc-name-input");
    const ccNum = document.getElementById("cc-number-input");
    const ccExp = document.getElementById("cc-expiry-input");
    const ccCvv = document.getElementById("cc-cvv-input");
    const ccMockup = document.getElementById("cc-mockup");

    if (ccName) {
        ccName.onkeyup = () => {
            setText("#cc-cardholder-view", ccName.value ? ccName.value.toUpperCase() : "JOHN DOE");
        };
    }

    if (ccNum) {
        ccNum.onkeyup = () => {
            let v = ccNum.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let matches = v.match(/\d{4,16}/g);
            let match = (matches && matches[0]) || '';
            let parts = [];
            for (let i=0, len=match.length; i<len; i+=4) {
                parts.push(match.substring(i, i+4));
            }
            if (parts.length > 0) {
                ccNum.value = parts.join(' ');
                setText("#cc-cardnumber-view", parts.join(' '));
            } else {
                ccNum.value = v;
                setText("#cc-cardnumber-view", v || "•••• •••• •••• ••••");
            }
        };
    }

    if (ccExp) {
        ccExp.onkeyup = () => {
            let v = ccExp.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            if (v.length >= 2) {
                ccExp.value = v.substring(0,2) + '/' + v.substring(2,4);
            }
            setText("#cc-expiry-view", ccExp.value || "MM/YY");
        };
    }

    if (ccCvv) {
        ccCvv.onfocus = () => { if (ccMockup) ccMockup.classList.add("flipped"); };
        ccCvv.onblur = () => { if (ccMockup) ccMockup.classList.remove("flipped"); };
        ccCvv.onkeyup = () => {
            setText("#cc-cvv-view", ccCvv.value || "•••");
        };
    }
}

function togglePaymentInputsRequired(isCard) {
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
}

function processBookingPayment(event) {
    event.preventDefault();
    if (!activePropertyForBooking || !bookingCheckIn || !bookingCheckOut || !activeSession) return;

    const modal = document.getElementById("payment-modal");
    if (!modal) return;

    // Show processing toast
    store.showToast("Authenticating transaction security credentials...", "info");
    
    // Simulate transaction validation delays
    setTimeout(() => {
        // Calculate invoice totals
        const startDay = Number(bookingCheckIn.split("-")[2]);
        const endDay = Number(bookingCheckOut.split("-")[2]);
        const nights = endDay - startDay;
        const price = activePropertyForBooking.price;
        const basePrice = price * nights;
        const tax = Math.round(basePrice * 0.1);
        const serviceFee = Math.round(basePrice * 0.05);

        // Coupon code
        const couponVal = document.getElementById("booking-coupon-input")?.value.toUpperCase().trim() || "";
        let discountApplied = 0;
        if (couponVal) {
            const coupon = appData.coupons.find(c => c.code === couponVal);
            if (coupon) {
                discountApplied = (coupon.discountType === "percent") ? Math.round(basePrice * (coupon.value / 100)) : Math.min(coupon.value, basePrice);
            }
        }

        const totalPrice = basePrice + tax + serviceFee - discountApplied;
        const payMethod = document.querySelector('input[name="payMethod"]:checked').value;

        // Push new booking request
        const newBooking = {
            id: store.createId("booking"),
            propertyId: activePropertyForBooking.id,
            propertyName: activePropertyForBooking.name,
            customerId: activeSession.id,
            customerName: activeSession.name,
            hostId: activePropertyForBooking.hostId,
            checkIn: bookingCheckIn,
            checkOut: bookingCheckOut,
            guestsCount: Number(document.getElementById("booking-guests-input").value),
            nights,
            basePrice,
            tax,
            serviceFee,
            discountApplied,
            totalPrice,
            couponCode: couponVal,
            paymentMethod: payMethod.toUpperCase(),
            status: "Paid", // automatically approved and paid on client transaction success
            createdAt: new Date().toLocaleDateString()
        };

        appData.bookings.push(newBooking);

        // Block dates in property list booked range
        const propIndex = appData.properties.findIndex(p => p.id === activePropertyForBooking.id);
        if (propIndex >= 0) {
            for (let d = startDay; d <= endDay; d++) {
                const blockStr = `2026-07-${d < 10 ? '0' + d : d}`;
                if (!appData.properties[propIndex].bookedDates.includes(blockStr)) {
                    appData.properties[propIndex].bookedDates.push(blockStr);
                }
            }
        }

        // Add notifications
        store.addNotification(activeSession.id, "payment", "Booking Confirmed & Paid", `Your trip stay at ${activePropertyForBooking.name} is successfully processed!`);
        store.addNotification(activePropertyForBooking.hostId, "booking", "New Reservation Paid", `${activeSession.name} booked ${activePropertyForBooking.name} from ${bookingCheckIn} to ${bookingCheckOut}.`);

        store.saveData(appData);
        modal.close();
        store.showToast("Payment Successful! Booking request registered.");

        // Refresh views
        if (document.getElementById("customer-view")) {
            renderCustomerRequests(activeSession);
            renderCustomerProperties();
        } else {
            initHomeView(activeSession);
        }
    }, 2000);
}

/* ==========================================
   REVIEWS & RATINGS UPLOADS
   ========================================== */
function handleReportReview(propertyId, reviewId) {
    appData = store.loadData();
    const property = appData.properties.find(p => p.id === propertyId);
    if (property && property.reviews) {
        const review = property.reviews.find(r => r.id === reviewId);
        if (review) {
            review.reported = true;
            store.saveData(appData);
            store.showToast("Review reported to platform moderation.");
            
            // Reload property detail modal to update Flagged tag
            openPropertyDetailsModal(propertyId);
        }
    }
}

function handleWriteReviewTrigger(bookingId, propertyId) {
    const modal = document.getElementById("customer-review-modal");
    if (!modal) return;

    document.getElementById("review-submit-form").reset();
    document.getElementById("review-booking-id").value = bookingId;
    document.getElementById("review-property-id").value = propertyId;
    document.getElementById("review-photo-filename-label").textContent = "No photo selected";

    // Check if review already exists from this customer
    appData = store.loadData();
    const property = appData.properties.find(p => p.id === propertyId);
    let existingReview = null;
    if (property && property.reviews) {
        existingReview = property.reviews.find(r => r.reviewerId === activeSession.id);
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
}

function submitReviewForm(event) {
    event.preventDefault();
    const bookingId = document.getElementById("review-booking-id").value;
    const propertyId = document.getElementById("review-property-id").value;
    const rating = Number(document.getElementById("review-rating-input").value);
    const text = document.getElementById("review-text-input").value.trim();
    const fileInput = document.getElementById("review-photo-upload");

    const completeReviewSubmission = (photoDataURL = "") => {
        appData = store.loadData();
        const property = appData.properties.find(p => p.id === propertyId);
        if (property) {
            if (!property.reviews) property.reviews = [];
            
            // Check if edit or create
            const existingReviewIndex = property.reviews.findIndex(r => r.reviewerId === activeSession.id);
            if (existingReviewIndex >= 0) {
                // Edit
                property.reviews[existingReviewIndex].rating = rating;
                property.reviews[existingReviewIndex].text = text;
                if (photoDataURL) {
                    property.reviews[existingReviewIndex].photo = photoDataURL;
                }
            } else {
                // Create
                const newReview = {
                    id: store.createId("rev"),
                    reviewerId: activeSession.id,
                    reviewerName: activeSession.name,
                    rating,
                    text,
                    date: new Date().toLocaleDateString(),
                    photo: photoDataURL,
                    reported: false
                };
                property.reviews.push(newReview);
            }

            // Re-calculate aggregate rating
            const totalRating = property.reviews.reduce((sum, r) => sum + r.rating, 0);
            property.rating = totalRating / property.reviews.length;

            // Mark booking as completed
            const booking = appData.bookings.find(b => b.id === bookingId);
            if (booking) booking.status = "Completed";

            store.saveData(appData);
            document.getElementById("customer-review-modal").close();
            store.showToast(existingReviewIndex >= 0 ? "Review updated successfully!" : "Review published successfully!");

            // Refresh dashboards
            renderCustomerRequests(activeSession);
            renderCustomerProperties();
        }
    };

    // If review photo selected, convert to data URL first
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            completeReviewSubmission(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        completeReviewSubmission("");
    }
}

/* ==========================================
   MESSAGING SYSTEM (CUSTOMER ↔ HOST CHAT)
   ========================================== */
function renderChatInbox() {
    const isCustomer = activeSession.role === "customer";
    const sidebar = document.getElementById(isCustomer ? "customer-chat-sidebar" : "host-chat-sidebar");
    if (!sidebar) return;

    appData = store.loadData();
    // Filter chats involving active user
    const chats = appData.conversations.filter(c => isCustomer ? c.customerId === activeSession.id : c.hostId === activeSession.id);

    sidebar.innerHTML = chats.length
        ? chats.map(convo => {
            const partnerName = isCustomer 
                ? (store.loadUsers().find(u => u.id === convo.hostId)?.name || "Host Owner")
                : (store.loadUsers().find(u => u.id === convo.customerId)?.name || "Traveler");
            
            const lastMsg = convo.messages.length ? convo.messages[convo.messages.length - 1].content : "No messages yet.";
            const activeClass = convo.id === activeConvoId ? "active" : "";

            return `
                <div class="chat-thread-item ${activeClass}" data-convo-id="${convo.id}">
                    <div class="chat-thread-title">${store.escapeHtml(partnerName)}</div>
                    <div class="chat-thread-desc">${store.escapeHtml(lastMsg)}</div>
                </div>
            `;
        }).join("")
        : `<div style="padding:24px; color:var(--text-muted); text-align:center; font-size:0.88rem;">No messages inbox channels active.</div>`;

    // Bind thread clicks
    sidebar.querySelectorAll(".chat-thread-item").forEach(el => {
        el.onclick = () => {
            activeConvoId = el.dataset.convoId;
            renderChatHistory();
            renderChatInbox(); // refresh active state styles
        };
    });
}

function renderChatHistory() {
    if (!activeConvoId) return;

    appData = store.loadData();
    const convo = appData.conversations.find(c => c.id === activeConvoId);
    if (!convo) return;

    // Mark received messages in this convo as read
    let convoChanged = false;
    convo.messages.forEach(m => {
        if (m.senderId !== activeSession.id && !m.read) {
            m.read = true;
            convoChanged = true;
        }
    });
    if (convoChanged) {
        store.saveData(appData);
        updateBellBadgeCount(activeSession);
    }

    const isCustomer = activeSession.role === "customer";
    const historyPane = document.getElementById(isCustomer ? "customer-chat-history" : "host-chat-history");
    const headerTitle = document.getElementById(isCustomer ? "customer-chat-header-name" : "host-chat-header-name");
    const msgInput = document.getElementById(isCustomer ? "customer-chat-message-input" : "host-chat-message-input");
    const sendBtn = document.getElementById(isCustomer ? "customer-chat-send-btn" : "host-chat-send-btn");

    // Enable input bars
    if (msgInput && sendBtn) {
        msgInput.disabled = false;
        sendBtn.disabled = false;
    }

    const partnerName = isCustomer 
        ? (store.loadUsers().find(u => u.id === convo.hostId)?.name || "Host Owner")
        : (store.loadUsers().find(u => u.id === convo.customerId)?.name || "Traveler");

    if (headerTitle) {
        headerTitle.textContent = `${partnerName} (Stays: ${convo.propertyName})`;
    }

    if (historyPane) {
        historyPane.innerHTML = convo.messages.length
            ? convo.messages.map(m => {
                const directionClass = m.senderId === activeSession.id ? "sent" : "received";
                const readTick = m.senderId === activeSession.id 
                    ? (m.read ? '<span style="color:#60a5fa; margin-left:4px; font-weight:800;">✓✓</span>' : '<span style="opacity:0.6; margin-left:4px;">✓</span>')
                    : '';
                return `
                    <div class="chat-bubble ${directionClass}">
                        ${m.image ? `<img class="chat-bubble-img" src="${m.image}">` : ''}
                        <div>${store.escapeHtml(m.content)}</div>
                        <span class="chat-bubble-time">${m.timestamp} ${readTick}</span>
                    </div>
                `;
            }).join("")
            : `<div style="margin:auto; text-align:center; color:var(--text-muted); font-size:0.9rem;">Send a hello message to begin!</div>`;
        
        // Auto scroll to bottom
        historyPane.scrollTop = historyPane.scrollHeight;
    }
}

function sendActiveChatMessage(content, imageURL = "") {
    if (!activeConvoId || (!content.trim() && !imageURL)) return;

    const isCustomer = activeSession.role === "customer";
    const msgInput = document.getElementById(isCustomer ? "customer-chat-message-input" : "host-chat-message-input");

    store.sendChatMessage(activeConvoId, activeSession.id, content, imageURL);
    if (msgInput) msgInput.value = "";

    // Refresh views
    renderChatHistory();
    renderChatInbox();
}

function initChatEventListeners() {
    // Customer send triggers
    const custSend = document.getElementById("customer-chat-send-btn");
    const custInput = document.getElementById("customer-chat-message-input");
    if (custSend && custInput) {
        custSend.onclick = () => sendActiveChatMessage(custInput.value);
        custInput.onkeypress = (e) => {
            if (e.key === "Enter") sendActiveChatMessage(custInput.value);
        };
    }

    // Host send triggers
    const hostSend = document.getElementById("host-chat-send-btn");
    const hostInput = document.getElementById("host-chat-message-input");
    if (hostSend && hostInput) {
        hostSend.onclick = () => sendActiveChatMessage(hostInput.value);
        hostInput.onkeypress = (e) => {
            if (e.key === "Enter") sendActiveChatMessage(hostInput.value);
        };
    }

    // Customer attach uploader simulation
    const custAttach = document.getElementById("customer-chat-attach-btn");
    const custFile = document.getElementById("customer-chat-file-input");
    if (custAttach && custFile) {
        custAttach.onclick = () => custFile.click();
        custFile.onchange = () => {
            if (custFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    sendActiveChatMessage("[Attached Image]", e.target.result);
                };
                reader.readAsDataURL(custFile.files[0]);
            }
        };
    }

    // Host attach uploader simulation
    const hostAttach = document.getElementById("host-chat-attach-btn");
    const hostFile = document.getElementById("host-chat-file-input");
    if (hostAttach && hostFile) {
        hostAttach.onclick = () => hostFile.click();
        hostFile.onchange = () => {
            if (hostFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    sendActiveChatMessage("[Attached Image]", e.target.result);
                };
                reader.readAsDataURL(hostFile.files[0]);
            }
        };
    }
}

/* ==========================================
   NOTIFICATIONS POPOVER SYSTEM
   ========================================== */
function initNotificationsBell(session) {
    const container = document.getElementById("notif-bell-container");
    const badge = document.getElementById("notif-bell-badge");
    const drawer = document.getElementById("notif-bell-drawer");
    const markReadBtn = document.getElementById("notif-mark-read-btn");

    if (!container || !badge || !drawer) return;

    // Toggle drawer open
    container.onclick = (e) => {
        e.stopPropagation();
        drawer.classList.toggle("open");
        renderNotificationsList(session);
    };

    // Close on click outside
    document.addEventListener("click", () => {
        drawer.classList.remove("open");
    });
    drawer.onclick = (e) => e.stopPropagation();

    // Mark all read trigger
    if (markReadBtn) {
        markReadBtn.onclick = () => {
            store.markNotificationsRead(session.id);
            updateBellBadgeCount(session);
            renderNotificationsList(session);
        };
    }

    updateBellBadgeCount(session);
}

function updateBellBadgeCount(session) {
    const badge = document.getElementById("notif-bell-badge");
    if (!badge) return;

    appData = store.loadData();
    const unreadCount = appData.notifications.filter(n => n.userId === session.id && !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "grid";
    } else {
        badge.style.display = "none";
    }
}

function renderNotificationsList(session) {
    const list = document.getElementById("notif-bell-list");
    if (!list) return;

    appData = store.loadData();
    const listItems = appData.notifications.filter(n => n.userId === session.id);

    list.innerHTML = listItems.length
        ? listItems.map(n => `
            <div class="notif-item ${!n.read ? 'unread' : ''}">
                <div class="notif-item-title">${store.escapeHtml(n.title)}</div>
                <div class="notif-item-desc">${store.escapeHtml(n.message)}</div>
                <div class="notif-item-date">${n.date}</div>
            </div>
        `).join("")
        : `<div style="padding:20px; color:var(--text-muted); text-align:center; font-size:0.8rem;">No notification updates.</div>`;
}

/* ==========================================
   PDF INVOICES GENERATION / PRINTING
   ========================================== */
function printInvoiceForBooking(bookingId) {
    appData = store.loadData();
    const booking = appData.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const property = appData.properties.find(p => p.id === booking.propertyId);
    const printContainer = document.getElementById("print-invoice-container");

    if (printContainer) {
        printContainer.innerHTML = `
            <div class="printable-invoice">
                <div class="invoice-header">
                    <div>
                        <h1 style="font-size: 2.2rem; font-weight: 800; letter-spacing: -1px;">${appData.siteName}</h1>
                        <p style="color: #555;">Stays Confirmation Receipt & Invoice</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="font-size: 1.25rem;">INVOICE ID: #${booking.id}</h2>
                        <p>Date Generated: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
                    <div>
                        <h3 style="border-bottom:1px solid #000; padding-bottom:4px;">Billing Details</h3>
                        <p><strong>Customer Name:</strong> ${store.escapeHtml(booking.customerName)}</p>
                        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
                    </div>
                    <div>
                        <h3 style="border-bottom:1px solid #000; padding-bottom:4px;">Stay Details</h3>
                        <p><strong>Property Name:</strong> ${store.escapeHtml(property?.name || "Deleted Property")}</p>
                        <p><strong>Location Type:</strong> ${store.escapeHtml(property?.type || "Stay")}</p>
                        <p><strong>Duration Checkin:</strong> ${booking.checkIn} to ${booking.checkOut} (${booking.nights} nights)</p>
                    </div>
                </div>

                <table class="invoice-details-table" style="margin-top:30px;">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Nights count</th>
                            <th>Unit Rate</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Base Stays accommodation for ${booking.guestsCount} guests</td>
                            <td>${booking.nights}</td>
                            <td>$${property ? property.price : booking.basePrice / booking.nights}</td>
                            <td>$${booking.basePrice}</td>
                        </tr>
                        <tr>
                            <td>Lodging Taxes (10% flat)</td>
                            <td>-</td>
                            <td>-</td>
                            <td>$${booking.tax}</td>
                        </tr>
                        <tr>
                            <td>Service Booking Fee (5%)</td>
                            <td>-</td>
                            <td>-</td>
                            <td>$${booking.serviceFee}</td>
                        </tr>
                        ${booking.discountApplied > 0 ? `
                            <tr style="color:green;">
                                <td>Coupon Code Discount (${booking.couponCode})</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-$${booking.discountApplied}</td>
                            </tr>
                        ` : ''}
                        <tr style="font-weight:bold; font-size:1.1rem; border-top:2px solid #000;">
                            <td colspan="3" style="text-align:right;">Amount Paid:</td>
                            <td>$${booking.totalPrice}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top:40px; text-align:center; font-size:0.85rem; border-top:1px solid #ddd; padding-top:20px; color:#555;">
                    Thank you for choosing ${appData.siteName}! For support contact customer@roombnb.com.
                </div>
            </div>
        `;

        // Trigger native print dialog window
        window.print();
    }
}

/* ==========================================
   ROUTING ENGINE
   ========================================== */
function router() {
    appData = store.loadData();
    activeSession = store.loadSession();

    const homeView = document.getElementById("home-view");
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");
    const customerView = document.getElementById("customer-view");
    const hostView = document.getElementById("host-view");
    const adminView = document.getElementById("admin-view");

    if (loginView) {
        if (activeSession) {
            window.location.href = activeSession.role === "admin" ? "admin.html" : (activeSession.role === "host" ? "host.html" : "customer.html");
            return;
        }
        initLoginView();
    } else if (registerView) {
        if (activeSession) {
            window.location.href = activeSession.role === "admin" ? "admin.html" : (activeSession.role === "host" ? "host.html" : "customer.html");
            return;
        }
    } else if (customerView) {
        if (!activeSession || activeSession.role !== "customer") {
            window.location.href = "login.html";
            return;
        }
        initCustomerView(activeSession);
    } else if (hostView) {
        if (!activeSession || activeSession.role !== "host") {
            window.location.href = "login.html";
            return;
        }
        initHostView(activeSession);
    } else if (adminView) {
        if (!activeSession || activeSession.role !== "admin") {
            window.location.href = "login.html";
            return;
        }
        initAdminView(activeSession);
    } else if (homeView) {
        initHomeView(activeSession);
    }

    updateNavbar(activeSession);
    store.renderBrand(appData);

    // Initialize custom dashboard tabs structure
    initDashboardTabs();

    // Trigger animations reveals
    initAnimations();

    // Geolocation bind
    const geoBtn = document.getElementById("geo-btn");
    if (geoBtn) {
        geoBtn.onclick = handleGeolocation;
    }

    // Drag-and-drop Compare compare drawer
    initDragAndDrop();
}

/* ==========================================
   DRAG AND DROP COMPARISON DRAWER
   ========================================== */
function initDragAndDrop() {
    const drawer = document.getElementById("favorites-drawer");
    const dropZone = document.getElementById("favorites-drop-zone");
    const list = document.getElementById("favorites-list");
    const header = document.getElementById("favorites-header");
    const count = document.getElementById("favorites-count");
    const toggle = document.getElementById("favorites-toggle");

    if (!drawer || !dropZone) return;

    // Clone header to remove old listeners cleanly
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    newHeader.addEventListener("click", () => {
        drawer.classList.toggle("open");
        const toggleBtn = drawer.querySelector("#favorites-toggle");
        if (toggleBtn) {
            toggleBtn.textContent = drawer.classList.contains("open") ? "Hide" : "Show";
        }
    });

    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".property-card");
        if (card) {
            const id = card.dataset.id;
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "copyMove";
            drawer.classList.add("open");
            const toggleBtn = drawer.querySelector("#favorites-toggle");
            if (toggleBtn) toggleBtn.textContent = "Hide";
        }
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const propertyId = e.dataTransfer.getData("text/plain");
        if (propertyId) {
            const added = store.addFavorite(propertyId);
            if (added) {
                store.showToast("Stays added to comparison compare drawer!");
                renderFavorites();
                if (document.getElementById("customer-view")) {
                    renderWishlistTab();
                }
            } else {
                store.showToast("This property is already in your wishlist.", "error");
            }
        }
    });

    renderFavorites();
}

function renderFavorites() {
    const list = document.getElementById("favorites-list");
    const count = document.getElementById("favorites-count");
    if (!list || !count) return;

    const favIds = store.loadFavorites();
    count.textContent = favIds.length;

    if (favIds.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 12px 0;">Drag property cards here to save & compare stays.</p>`;
        return;
    }

    list.innerHTML = favIds.map(id => {
        const property = appData.properties.find(p => p.id === id);
        if (!property) return "";
        return `
            <div class="fav-item" data-view-property="${property.id}" style="cursor: pointer;">
                <div class="fav-thumb ${store.escapeHtml(property.photoClass)}"></div>
                <div class="fav-info">
                    <h4>${store.escapeHtml(property.name)}</h4>
                    <p>$${property.price}/night &bull; ★ ${property.rating}</p>
                </div>
                <button type="button" class="fav-remove-btn" data-remove-fav="${property.id}">&times;</button>
            </div>
        `;
    }).join("");

    // Bind remove button handlers
    list.querySelectorAll("[data-remove-fav]").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.removeFav;
            store.removeFavorite(id);
            renderFavorites();
            if (document.getElementById("customer-view")) {
                renderWishlistTab();
            }
            store.showToast("Removed from favorites.");
        };
    });
}

/* ==========================================
   GEOLOCATION API
   ========================================== */
function handleGeolocation() {
    const geoBtn = document.getElementById("geo-btn");
    const locationInput = document.querySelector('input[name="location"]');
    if (!geoBtn || !locationInput) return;

    if (!navigator.geolocation) {
        store.showToast("Geolocation is not supported by your browser.", "error");
        return;
    }

    geoBtn.classList.add("loading");
    geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                headers: { 'Accept-Language': 'en' }
            })
            .then(res => res.json())
            .then(data => {
                let locStr = "";
                if (data && data.address) {
                    const addr = data.address;
                    const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality;
                    const state = addr.state || addr.region;
                    if (city && state) {
                        locStr = `${city}, ${state}`;
                    } else if (city) {
                        locStr = city;
                    } else if (addr.country) {
                        locStr = addr.country;
                    }
                }
                
                locationInput.value = locStr || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                store.showToast("Current location detected!");
                
                // Trigger search updates
                const searchForm = document.querySelector("[data-search-form]");
                if (searchForm) {
                    const event = new Event("submit", { cancelable: true });
                    searchForm.dispatchEvent(event);
                }
            })
            .catch(() => {
                locationInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                store.showToast("Location coordinates loaded!");
            })
            .finally(() => {
                geoBtn.classList.remove("loading");
                geoBtn.disabled = false;
            });
        },
        (error) => {
            geoBtn.classList.remove("loading");
            geoBtn.disabled = false;
            store.showToast("Unable to retrieve location permission.", "error");
        },
        { enableHighAccuracy: true, timeout: 6000 }
    );
}

/* ==========================================
   INITIALIZATION & CLICK DELEGATIONS
   ========================================== */
function initApp() {
    // 1. Core listeners
    const searchForm = document.querySelector("[data-search-form]");
    if (searchForm) searchForm.addEventListener("submit", handleSearch);

    const homeRegisterForm = document.querySelector("[data-home-register-form]");
    if (homeRegisterForm) homeRegisterForm.addEventListener("submit", handleRegisterSubmit);

    const registerForm = document.querySelector("[data-register-form]");
    if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);

    const loginForm = document.querySelector("[data-login-form]");
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

    const siteForm = document.querySelector("[data-site-form]");
    if (siteForm) siteForm.addEventListener("submit", (e) => {
        e.preventDefault();
        appData.siteName = siteForm.siteName.value.trim();
        appData.hero.eyebrow = siteForm.heroEyebrow.value.trim();
        appData.hero.title = siteForm.heroTitle.value.trim();
        appData.hero.description = siteForm.heroDescription.value.trim();
        store.saveData(appData);
        store.renderBrand(appData);
        store.showToast("Website landing copy saved successfully!");
    });

    // Reset database to defaults
    const resetBtn = document.getElementById("reset-app-btn");
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm("Reset RoomBnB to default stays seeds and logs? All listings will be re-set.")) {
                store.resetData();
                store.clearSession();
                window.location.href = "index.html";
            }
        };
    }

    // Apply Coupon Code inside details modal
    document.addEventListener("click", (e) => {
        if (e.target.id === "apply-coupon-btn") {
            recalculateBookingBill();
            const couponInput = document.getElementById("booking-coupon-input");
            const code = couponInput ? couponInput.value.toUpperCase().trim() : "";
            const coupon = appData.coupons.find(c => c.code === code);
            
            const pillBox = document.getElementById("coupon-calc-pill-box");
            if (pillBox) {
                if (coupon) {
                    pillBox.innerHTML = `<span class="coupon-applied-pill">✓ Coupon ${coupon.code} Applied!</span>`;
                    store.showToast(`Coupon code ${coupon.code} applied!`);
                } else {
                    pillBox.innerHTML = `<span style="color:var(--primary); font-size:0.8rem; font-weight:800;">Invalid Coupon Code</span>`;
                }
            }
        }
    });

    // Payment Form Submit simulation
    const payForm = document.getElementById("payment-submit-form");
    if (payForm) {
        payForm.onsubmit = processBookingPayment;
    }
    initPaymentInputListeners();

    // 2. Global Event Delegation Click Router
    document.addEventListener("click", (event) => {
        // Modal close button
        const closeModalId = event.target.dataset.closeModal;
        if (closeModalId) {
            const dialog = document.getElementById(closeModalId);
            if (dialog) dialog.close();
        }

        // View details dialog
        const viewPropBtn = event.target.closest("[data-view-property]");
        if (viewPropBtn) {
            openPropertyDetailsModal(viewPropBtn.dataset.viewProperty);
        }

        // Toggle Favorites heart
        const favToggleBtn = event.target.closest("[data-fav-toggle-id]");
        if (favToggleBtn) {
            const id = favToggleBtn.dataset.favToggleId;
            const favs = store.loadFavorites();
            if (favs.includes(id)) {
                store.removeFavorite(id);
                favToggleBtn.classList.remove("active");
                store.showToast("Removed from wishlist.");
            } else {
                store.addFavorite(id);
                favToggleBtn.classList.add("active");
                store.showToast("Added to wishlist!");
            }
            renderFavorites();
            if (document.getElementById("customer-view")) {
                renderWishlistTab();
            }
        }

        // Email Verification Banner action
        if (event.target.id === "verify-email-banner-btn") {
            const users = store.loadUsers();
            const idx = users.findIndex(u => u.id === activeSession.id);
            if (idx >= 0) {
                users[idx].verified = true;
                store.saveUsers(users);
                store.showToast("Email successfully verified!");
                updateNavbar(activeSession);
            }
        }

        // --- CUSTOMER ACTIONS ---
        // Cancel Booking Trip
        const cancelBookingId = event.target.dataset.cancelBookingId;
        if (cancelBookingId) {
            if (confirm("Are you sure you want to cancel this booking stay reservation?")) {
                appData = store.loadData();
                const booking = appData.bookings.find(b => b.id === cancelBookingId);
                if (booking) {
                    booking.status = "Cancelled";
                    // Remove blocked dates from property bookedDates
                    const property = appData.properties.find(p => p.id === booking.propertyId);
                    if (property && property.bookedDates) {
                        const start = Number(booking.checkIn.split("-")[2]);
                        const end = Number(booking.checkOut.split("-")[2]);
                        const datesToRemove = [];
                        for (let d = start; d <= end; d++) {
                            datesToRemove.push(`2026-07-${d < 10 ? '0' + d : d}`);
                        }
                        property.bookedDates = property.bookedDates.filter(dateStr => !datesToRemove.includes(dateStr));
                    }
                    // Notifications
                    store.addNotification(booking.customerId, "booking", "Booking Cancelled", `Your stay reservation at ${property?.name || 'Stay'} was cancelled.`);
                    store.addNotification(booking.hostId, "booking", "Reservation Cancelled by Guest", `${booking.customerName} cancelled their trip dates.`);

                    store.saveData(appData);
                    store.showToast("Booking cancelled successfully.");
                    renderCustomerRequests(activeSession);
                    renderCustomerProperties();
                }
            }
        }

        // Download Invoice receipt
        const invoiceBookingId = event.target.dataset.invoiceBookingId;
        if (invoiceBookingId) {
            printInvoiceForBooking(invoiceBookingId);
        }

        // Write review modal opening
        const revBookingId = event.target.dataset.reviewBookingId;
        const revPropId = event.target.dataset.reviewPropertyId;
        if (revBookingId && revPropId) {
            handleWriteReviewTrigger(revBookingId, revPropId);
        }

        // Rebook Stay
        const rebookPropId = event.target.dataset.rebookPropertyId;
        if (rebookPropId) {
            openPropertyDetailsModal(rebookPropId);
        }

        // Flag / Report Review
        const reportPropId = event.target.dataset.reportReviewPropId;
        const reportRevId = event.target.dataset.reportReviewId;
        if (reportPropId && reportRevId) {
            handleReportReview(reportPropId, reportRevId);
        }

        // --- HOST DASHBOARD ACTION TRIGGERS ---
        // Host property form dialog add/edit
        const hostAddBtn = event.target.id === "host-add-property-btn";
        if (hostAddBtn) {
            const modal = document.getElementById("host-property-modal");
            const form = modal ? modal.querySelector("[data-host-property-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("host-modal-title").textContent = "Create New Listing";
                modal.showModal();
            }
        }

        const hostEditPropId = event.target.dataset.editPropertyId;
        if (hostEditPropId) {
            const property = appData.properties.find(p => p.id === hostEditPropId);
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
                
                // Set checkboxes
                modal.querySelectorAll("#host-property-amenities input").forEach(cb => {
                    cb.checked = property.amenities.includes(cb.value);
                });

                document.getElementById("host-modal-title").textContent = "Edit Property Listing";
                modal.showModal();
            }
        }

        const hostDeletePropId = event.target.dataset.deletePropertyId;
        if (hostDeletePropId) {
            if (confirm("Are you sure you want to delete your listed property?")) {
                appData.properties = appData.properties.filter(p => p.id !== hostDeletePropId);
                store.saveData(appData);
                renderHostProperties(activeSession);
                store.showToast("Listing deleted successfully.");
            }
        }

        // Host booking approval / rejection queue
        const hostBookingAction = event.target.dataset.hostAction;
        const hostBookingId = event.target.dataset.bookingId;
        if (hostBookingAction && hostBookingId) {
            appData = store.loadData();
            const booking = appData.bookings.find(b => b.id === hostBookingId);
            if (booking) {
                booking.status = hostBookingAction;
                // Notify customer
                store.addNotification(booking.customerId, "booking", `Booking ${hostBookingAction}`, `Your reservation request at ${booking.propertyName} has been ${hostBookingAction.toLowerCase()}.`);
                
                store.saveData(appData);
                renderHostBookings(activeSession);
                renderHostAnalytics(activeSession);
                store.showToast(`Booking request successfully marked as ${hostBookingAction}!`);
            }
        }

        // Chat with guest / traveler thread creator
        const chatGuestId = event.target.dataset.chatWithGuest;
        const chatPropName = event.target.dataset.propName;
        if (chatGuestId && chatPropName) {
            const convo = store.getOrCreateConversation(chatGuestId, activeSession.id, chatPropName);
            activeConvoId = convo.id;
            
            // Switch tabs to chat
            const tabMenuItem = document.querySelector('[data-tab-target="host-chat"]');
            if (tabMenuItem) {
                tabMenuItem.click();
            }
        }

        // --- ADMIN PANEL ACTION TRIGGERS ---
        // Admin approval/rejections
        const admBookingAction = event.target.dataset.adminAction;
        const admBookingId = event.target.dataset.bookingId;
        if (admBookingAction && admBookingId) {
            appData = store.loadData();
            const booking = appData.bookings.find(b => b.id === admBookingId);
            if (booking) {
                booking.status = admBookingAction;
                store.addNotification(booking.customerId, "booking", `Booking Approved`, `Reservation at ${booking.propertyName} approved by platform.`);
                store.saveData(appData);
                renderAdminRequests();
                store.showToast(`Booking request ${admBookingAction.toLowerCase()}`);
            }
        }

        // Admin Toggle user verification
        const admToggleUserId = event.target.dataset.adminToggleUserId;
        if (admToggleUserId) {
            const users = store.loadUsers();
            const idx = users.findIndex(u => u.id === admToggleUserId);
            if (idx >= 0) {
                users[idx].verified = !users[idx].verified;
                store.saveUsers(users);
                renderAdminUsersList();
                store.showToast("User identity verification state updated.");
            }
        }

        // Admin Delete Review moderation
        const admDelRevPropId = event.target.dataset.adminDeleteReviewPropId;
        const admDelRevId = event.target.dataset.adminDeleteReviewId;
        if (admDelRevPropId && admDelRevId) {
            appData = store.loadData();
            const property = appData.properties.find(p => p.id === admDelRevPropId);
            if (property && property.reviews) {
                property.reviews = property.reviews.filter(r => r.id !== admDelRevId);
                // recalculate rating
                if (property.reviews.length > 0) {
                    const sum = property.reviews.reduce((s, r) => s + r.rating, 0);
                    property.rating = sum / property.reviews.length;
                } else {
                    property.rating = 5.0; // default clean rating
                }
                store.saveData(appData);
                renderAdminReportedReviews();
                store.showToast("Inappropriate review removed from property catalog.");
            }
        }

        // Admin quick stats/metrics/services creation helpers
        const admAddStatBtn = event.target.id === "add-stat-btn";
        if (admAddStatBtn) {
            const modal = document.getElementById("admin-stat-modal");
            const form = modal ? modal.querySelector("[data-stat-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("stat-modal-title").textContent = "Create Stat Metric";
                modal.showModal();
            }
        }

        const admAddServBtn = event.target.id === "add-service-btn";
        if (admAddServBtn) {
            const modal = document.getElementById("admin-service-modal");
            const form = modal ? modal.querySelector("[data-service-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("service-modal-title").textContent = "Create Service Offer";
                modal.showModal();
            }
        }

        const admEditStatId = event.target.dataset.editStat;
        if (admEditStatId) {
            const stat = appData.stats.find(s => s.id === admEditStatId);
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

        const admEditServId = event.target.dataset.editService;
        if (admEditServId) {
            const service = appData.services.find(s => s.id === admEditServId);
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

        const admDelStatId = event.target.dataset.deleteStat;
        if (admDelStatId) {
            if (confirm("Delete this metric?")) {
                appData.stats = appData.stats.filter(s => s.id !== admDelStatId);
                store.saveData(appData);
                renderAdminCopyLists();
                store.showToast("Metric stat deleted.");
            }
        }

        const admDelServId = event.target.dataset.deleteService;
        if (admDelServId) {
            if (confirm("Delete this service item?")) {
                appData.services = appData.services.filter(s => s.id !== admDelServId);
                store.saveData(appData);
                renderAdminCopyLists();
                store.showToast("Service item deleted.");
            }
        }

        // General dialog trigger button for Admin property
        const addPropBtn = event.target.id === "add-property-btn";
        if (addPropBtn) {
            const modal = document.getElementById("admin-property-modal");
            const form = modal ? modal.querySelector("[data-property-form]") : null;
            if (form) {
                form.reset();
                form.id.value = "";
                document.getElementById("property-modal-title").textContent = "Add Stays Property";
                modal.showModal();
            }
        }

        const admEditPropId = event.target.dataset.editProperty;
        if (admEditPropId) {
            const property = appData.properties.find(p => p.id === admEditPropId);
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
        }

        const admDelPropId = event.target.dataset.deleteProperty;
        if (admDelPropId) {
            if (confirm("Delete this property catalog item?")) {
                appData.properties = appData.properties.filter(p => p.id !== admDelPropId);
                store.saveData(appData);
                renderAdminPropertiesGrid();
                renderAdminCopyLists();
                store.showToast("Stays property deleted.");
            }
        }
    });

    // Forms handles inside panels
    const hostPropForm = document.querySelector("[data-host-property-form]");
    if (hostPropForm) {
        hostPropForm.onsubmit = (e) => {
            e.preventDefault();
            appData = store.loadData();
            const id = hostPropForm.id.value || store.createId("property");
            const existing = appData.properties.find(p => p.id === id);

            const rulesVal = hostPropForm.rules.value.trim();
            const rulesList = rulesVal ? rulesVal.split(",").map(r => r.trim()) : ["No smoking"];

            const amenitiesList = [];
            hostPropForm.querySelectorAll("#host-property-amenities input:checked").forEach(cb => {
                amenitiesList.push(cb.value);
            });

            const updatedObj = {
                id,
                name: hostPropForm.name.value.trim(),
                type: hostPropForm.type.value.trim(),
                price: Number(hostPropForm.price.value),
                capacity: Number(hostPropForm.capacity.value),
                bedrooms: Number(hostPropForm.bedrooms.value),
                bathrooms: Number(hostPropForm.bathrooms.value),
                description: hostPropForm.description.value.trim(),
                rules: rulesList,
                amenities: amenitiesList,
                hostId: activeSession.id,
                hostName: activeSession.name,
                photoClass: existing?.photoClass || `photo-${(appData.properties.length % 3) + 1}`,
                rating: existing?.rating || 5.0,
                bookedDates: existing?.bookedDates || [],
                reviews: existing?.reviews || []
            };

            const idx = appData.properties.findIndex(p => p.id === id);
            if (idx >= 0) {
                appData.properties[idx] = updatedObj;
            } else {
                appData.properties.push(updatedObj);
            }

            store.saveData(appData);
            document.getElementById("host-property-modal").close();
            renderHostProperties(activeSession);
            renderHostAnalytics(activeSession);
            store.showToast(hostPropForm.id.value ? "Listing updated!" : "New Listing created successfully!");
        };
    }

    const admPropForm = document.querySelector("[data-property-form]");
    if (admPropForm) {
        admPropForm.onsubmit = (e) => {
            e.preventDefault();
            appData = store.loadData();
            const id = admPropForm.id.value || store.createId("property");
            const existing = appData.properties.find(p => p.id === id);

            const rulesList = admPropForm.rules.value.split(",").map(r => r.trim());
            const amenitiesList = [];
            admPropForm.querySelectorAll("#admin-property-amenities input:checked").forEach(cb => {
                amenitiesList.push(cb.value);
            });

            const updatedObj = {
                id,
                name: admPropForm.name.value.trim(),
                type: admPropForm.type.value.trim(),
                price: Number(admPropForm.price.value),
                capacity: Number(admPropForm.capacity.value),
                bedrooms: Number(admPropForm.bedrooms.value),
                bathrooms: Number(admPropForm.bathrooms.value),
                description: admPropForm.description.value.trim(),
                rules: rulesList,
                amenities: amenitiesList,
                hostId: existing?.hostId || "admin-1",
                hostName: existing?.hostName || "Sarah Jenkins",
                photoClass: existing?.photoClass || `photo-${(appData.properties.length % 3) + 1}`,
                rating: existing?.rating || 5.0,
                bookedDates: existing?.bookedDates || [],
                reviews: existing?.reviews || []
            };

            const idx = appData.properties.findIndex(p => p.id === id);
            if (idx >= 0) appData.properties[idx] = updatedObj;
            else appData.properties.push(updatedObj);

            store.saveData(appData);
            document.getElementById("admin-property-modal").close();
            renderAdminPropertiesGrid();
            renderAdminCopyLists();
            store.showToast("Property listing saved.");
        };
    }

    const admStatForm = document.querySelector("[data-stat-form]");
    if (admStatForm) {
        admStatForm.onsubmit = (e) => {
            e.preventDefault();
            appData = store.loadData();
            const id = admStatForm.id.value || store.createId("stat");
            const val = admStatForm.value.value.trim();
            const lbl = admStatForm.label.value.trim();

            const idx = appData.stats.findIndex(s => s.id === id);
            if (idx >= 0) appData.stats[idx] = { id, value: val, label: lbl };
            else appData.stats.push({ id, value: val, label: lbl });

            store.saveData(appData);
            document.getElementById("admin-stat-modal").close();
            renderAdminCopyLists();
            store.showToast("Landing stat metric saved.");
        };
    }

    const admServForm = document.querySelector("[data-service-form]");
    if (admServForm) {
        admServForm.onsubmit = (e) => {
            e.preventDefault();
            appData = store.loadData();
            const id = admServForm.id.value || store.createId("service");
            const t = admServForm.title.value.trim();
            const d = admServForm.description.value.trim();

            const idx = appData.services.findIndex(s => s.id === id);
            if (idx >= 0) appData.services[idx] = { id, title: t, description: d };
            else appData.services.push({ id, title: t, description: d });

            store.saveData(appData);
            document.getElementById("admin-service-modal").close();
            renderAdminCopyLists();
            store.showToast("Service details saved.");
        };
    }

    // Customer profile uploader bindings
    const picTrigger = document.getElementById("trigger-pic-upload-btn");
    const picFile = document.getElementById("profile-pic-upload");
    if (picTrigger && picFile) {
        picTrigger.onclick = () => picFile.click();
        picFile.onchange = () => {
            if (picFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    store.updateUser(activeSession.id, { profilePic: e.target.result });
                    renderProfileDetails(activeSession);
                    store.showToast("Profile image updated successfully!");
                };
                reader.readAsDataURL(picFile.files[0]);
            }
        };
    }

    // Profile Details Update Submit
    const profileUpdateForm = document.getElementById("profile-update-form");
    if (profileUpdateForm) {
        profileUpdateForm.onsubmit = (e) => {
            e.preventDefault();
            const name = profileUpdateForm.name.value.trim();
            const phone = profileUpdateForm.phone.value.trim();
            const address = profileUpdateForm.address.value.trim();
            
            store.updateUser(activeSession.id, { name, phone, address });
            store.showToast("Personal profile details updated.");
        };
    }

    // Profile Password Submit
    const profilePasswordForm = document.getElementById("profile-password-form");
    if (profilePasswordForm) {
        profilePasswordForm.onsubmit = (e) => {
            e.preventDefault();
            const oldPass = profilePasswordForm.oldPassword.value;
            const newPass = profilePasswordForm.newPassword.value;
            
            const users = store.loadUsers();
            const user = users.find(u => u.id === activeSession.id);
            if (user.password !== oldPass) {
                document.getElementById("profile-pass-error").textContent = "Incorrect current password.";
                return;
            }

            document.getElementById("profile-pass-error").textContent = "";
            store.updateUser(activeSession.id, { password: newPass });
            profilePasswordForm.reset();
            store.showToast("Password updated successfully!");
        };
    }

    // Identity uploader
    const idTrigger = document.getElementById("trigger-id-upload-btn");
    const idFile = document.getElementById("id-card-upload");
    if (idTrigger && idFile) {
        idTrigger.onclick = () => idFile.click();
        idFile.onchange = () => {
            if (idFile.files.length > 0) {
                const reader = new FileReader();
                reader.onload = () => {
                    store.updateUser(activeSession.id, { verified: true });
                    renderProfileDetails(activeSession);
                    store.showToast("Government ID received. User identity verified!");
                };
                reader.readAsDataURL(idFile.files[0]);
            }
        };
    }

    // Review Submit Dialog Form
    const reviewForm = document.getElementById("review-submit-form");
    if (reviewForm) {
        reviewForm.onsubmit = submitReviewForm;
    }
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

    // Chats listeners
    initChatEventListeners();

    // Mobile nav drawers
    initMobileMenu(activeSession);

    // Initial router invoke
    router();
}

/* ==========================================
   RESPONSIVE MOBILE NAVBAR DRAWER
   ========================================== */
function initMobileMenu(session) {
    const toggleBtn = document.getElementById("mobile-nav-toggle");
    const closeBtn = document.getElementById("mobile-nav-close");
    const dialog = document.getElementById("mobile-nav-dialog");
    const linksSlot = document.getElementById("mobile-nav-links");
    const actionsSlot = document.getElementById("mobile-nav-actions");

    if (!toggleBtn || !dialog || !linksSlot || !actionsSlot) return;

    toggleBtn.onclick = () => {
        const desktopLinks = document.getElementById("dynamic-nav-links");
        const desktopActions = document.getElementById("dynamic-session-actions");

        if (desktopLinks) linksSlot.innerHTML = desktopLinks.innerHTML;
        if (desktopActions) actionsSlot.innerHTML = desktopActions.innerHTML;

        // mobile links click closure
        linksSlot.querySelectorAll("a").forEach(a => {
            a.onclick = () => dialog.close();
        });

        // mobile logout trigger
        const logoutBtn = actionsSlot.querySelector("[data-logout-button]");
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                dialog.close();
                store.logout();
            };
        }
        dialog.showModal();
    };

    closeBtn.onclick = () => dialog.close();
}

window.addEventListener("DOMContentLoaded", initApp);
window.addEventListener("hashchange", router);
