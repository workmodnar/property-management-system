const store = RoomBnbStore;
let appData = store.loadData();
let visibleProperties = [...appData.properties];
let activeSession = null;

// Helper to set element text
function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

/* ==========================================
   NAVIGATION & SESSION NAVBAR RENDERER
   ========================================== */
function updateNavbar(session) {
    const navLinks = document.getElementById("dynamic-nav-links");
    const sessionActions = document.getElementById("dynamic-session-actions");
    if (!navLinks || !sessionActions) return;

    const isHomepage = !!document.getElementById("home-view");

    if (!session) {
        navLinks.innerHTML = `
            <a href="${isHomepage ? '#stays' : 'index.html#stays'}">Stays</a>
            <a href="${isHomepage ? '#services' : 'index.html#services'}">Guest experience</a>
            <a href="${isHomepage ? '#owners' : 'index.html#owners'}">List your place</a>
        `;
        sessionActions.innerHTML = `
            <a class="nav-action" href="login.html">Login</a>
            <a class="nav-action nav-action--primary" href="register.html">Register</a>
        `;

        // Smooth scroll for homepage anchors
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
        const isCustomerPage = !!document.getElementById("customer-view");
        const isAdminPage = !!document.getElementById("admin-view");

        if (session.role === "customer") {
            navLinks.innerHTML = `
                <a href="index.html">Home</a>
                <a href="${isCustomerPage ? '#customer-properties' : 'customer.html#customer-properties'}">Properties</a>
                <a href="${isCustomerPage ? '#requests' : 'customer.html#requests'}">My requests</a>
            `;
        } else if (session.role === "admin") {
            navLinks.innerHTML = `
                <a href="index.html">Home</a>
                <a href="${isAdminPage ? '#content' : 'admin.html#content'}">Content</a>
                <a href="${isAdminPage ? '#bookings' : 'admin.html#bookings'}">Bookings</a>
            `;
        }

        sessionActions.innerHTML = `
            <span class="session-pill">${store.escapeHtml(session.name)} - ${store.escapeHtml(session.role)}</span>
            <button class="nav-action" type="button" data-logout-button>Logout</button>
        `;

        // Smooth scroll inside dashboards
        navLinks.querySelectorAll("a").forEach(a => {
            a.addEventListener("click", (e) => {
                const href = a.getAttribute("href");
                if (href.startsWith("#")) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }
            });
        });

        // Logout listener
        const logoutBtn = sessionActions.querySelector("[data-logout-button]");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                store.logout();
                router();
            });
        }
    }
}

/* ==========================================
   HOMEPAGE VIEW CONTROLLER
   ========================================== */
function initHomeView(session) {
    document.title = `${appData.siteName} | Book Unique Stays`;

    // Render Home text content
    setText("[data-hero-eyebrow]", appData.hero.eyebrow);
    setText("[data-hero-title]", appData.hero.title);
    setText("[data-hero-description]", appData.hero.description);
    setText("[data-properties-heading]", appData.sections.propertiesHeading);
    setText("[data-properties-description]", appData.sections.propertiesDescription);
    setText("[data-owner-title]", appData.sections.ownerTitle);
    setText("[data-owner-description]", appData.sections.ownerDescription);
    setText("[data-footer-text]", appData.sections.footerText);

    // Hide inline registration card if user logged in
    const registerSection = document.getElementById("register");
    if (registerSection) {
        registerSection.style.display = session ? "none" : "block";
    }

    // Render components
    renderHomeStats();
    renderHomeProperties();
    renderHomeServices();
    renderPropertyTypes();
}

function renderHomeStats() {
    const statsList = document.querySelector("[data-stats-list]");
    if (statsList) {
        statsList.innerHTML = appData.stats.map((stat) => `
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
        list.innerHTML = visibleProperties.map((property) => `
            <article class="property-card" draggable="true" data-id="${property.id}">
                <div class="property-photo ${store.escapeHtml(property.photoClass)}"></div>
                <div class="property-info">
                    <div class="property-top">
                        <h3>${store.escapeHtml(property.name)}</h3>
                        <span class="rating">${Number(property.rating).toFixed(2)}</span>
                    </div>
                    <p>${store.escapeHtml(property.description)}</p>
                    <span class="price">From $${Number(property.price).toLocaleString()} / night</span>
                    <button class="mini-button" type="button" data-view-property="${property.id}">View details</button>
                </div>
            </article>
        `).join("");
    }
}

function renderHomeServices() {
    const list = document.querySelector("[data-service-list]");
    if (list) {
        list.innerHTML = appData.services.map((service) => `
            <article class="feature-item">
                <h3>${store.escapeHtml(service.title)}</h3>
                <p>${store.escapeHtml(service.description)}</p>
            </article>
        `).join("");
    }
}

function renderPropertyTypes() {
    const select = document.querySelector("[data-property-type-filter]");
    if (select) {
        const types = [...new Set(appData.properties.map((p) => p.type))];
        select.innerHTML = `
            <option value="all">All property types</option>
            ${types.map((type) => `<option value="${store.escapeHtml(type)}">${store.escapeHtml(type)}</option>`).join("")}
        `;
    }
}

function handleSearch(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedType = form.propertyType.value;
    const location = form.location.value.trim();

    visibleProperties = selectedType === "all"
        ? [...appData.properties]
        : appData.properties.filter((property) => property.type === selectedType);

    if (location) {
        const query = location.toLowerCase();
        visibleProperties = visibleProperties.filter((property) => 
            property.name.toLowerCase().includes(query) ||
            property.description.toLowerCase().includes(query) ||
            property.type.toLowerCase().includes(query)
        );
    }

    const searchMsg = document.querySelector("[data-search-message]");
    if (searchMsg) {
        searchMsg.textContent = location
            ? `Showing ${visibleProperties.length} result(s) for ${selectedType === "all" ? "all property types" : selectedType} matching "${location}".`
            : `Showing ${visibleProperties.length} result(s).`;
    }

    renderHomeProperties();
}

function handleHomeRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const address = form.address.value.trim();
    const password = form.password.value.trim();
    const errorEl = document.querySelector("[data-home-register-error]");

    if (!name || !email || !address || !password) {
        if (errorEl) errorEl.textContent = "All fields are required.";
        return;
    }

    if (password.length < 6) {
        if (errorEl) errorEl.textContent = "Password must be at least 6 characters.";
        return;
    }

    const created = store.addUser(name, email, password, address, "customer");
    if (!created) {
        if (errorEl) errorEl.textContent = "An account with this email already exists.";
        return;
    }

    form.reset();
    if (errorEl) errorEl.textContent = "";
    sessionStorage.setItem("register_success", "true");
    window.location.href = "login.html";
}

/* ==========================================
   AUTHENTICATION VIEWS (LOGIN & REGISTER)
   ========================================== */
function initLoginView() {
    const loginError = document.querySelector("[data-login-error]");
    if (loginError) loginError.textContent = "";

    // Show toast if redirected from successful registration
    if (sessionStorage.getItem("register_success") === "true") {
        store.showToast("Account created successfully! Please log in.");
        sessionStorage.removeItem("register_success");
    }
}

function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const roleSelect = form.role;
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const loginError = document.querySelector("[data-login-error]");

    if (roleSelect.value === "admin") {
        if (form.adminCode.value !== store.adminCode) {
            if (loginError) loginError.textContent = "Invalid admin code. Try admin123.";
            return;
        }

        const session = {
            id: "admin-1",
            name: "Admin",
            role: "admin"
        };
        store.saveSession(session);
        form.reset();
        window.location.href = "admin.html";
        return;
    }

    const user = store.findUser(email, password);
    if (!user) {
        if (loginError) loginError.textContent = "Invalid credentials. Please register first.";
        return;
    }

    const session = {
        id: user.id,
        name: user.name,
        role: user.role
    };
    store.saveSession(session);
    form.reset();
    window.location.href = "customer.html";
}

function initRegisterView() {
    const registerError = document.querySelector("[data-register-error]");
    if (registerError) registerError.textContent = "";
}

function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const address = form.address.value.trim();
    const registerError = document.querySelector("[data-register-error]");

    if (!name || !email || !password || !address) {
        if (registerError) registerError.textContent = "All fields are required.";
        return;
    }

    if (password.length < 6) {
        if (registerError) registerError.textContent = "Password must be at least 6 characters.";
        return;
    }

    const created = store.addUser(name, email, password, address, "customer");
    if (!created) {
        if (registerError) registerError.textContent = "An account with this email already exists.";
        return;
    }

    form.reset();
    sessionStorage.setItem("register_success", "true");
    window.location.href = "login.html";
}

/* ==========================================
   CUSTOMER VIEW CONTROLLER
   ========================================== */
function initCustomerView(session) {
    renderCustomerProperties();
    renderCustomerRequests(session);
}

function renderCustomerProperties() {
    const list = document.querySelector("#customer-properties [data-property-list]");
    if (list) {
        list.innerHTML = appData.properties.map((property) => `
            <article class="property-card" draggable="true" data-id="${property.id}">
                <div class="property-photo ${store.escapeHtml(property.photoClass)}"></div>
                <div class="property-info">
                    <div class="property-top">
                        <h3>${store.escapeHtml(property.name)}</h3>
                        <span class="rating">${Number(property.rating).toFixed(2)}</span>
                    </div>
                    <p>${store.escapeHtml(property.description)}</p>
                    <span class="price">From $${Number(property.price).toLocaleString()} / night</span>
                    <button class="mini-button" type="button" data-view-property="${property.id}">View details</button>
                </div>
            </article>
        `).join("");
    }
}

function renderCustomerRequests(session) {
    const requestsList = document.querySelector("[data-customer-requests]");
    if (requestsList) {
        const requests = appData.bookings.filter((booking) => booking.customerId === session.id);
        requestsList.innerHTML = requests.length
            ? requests.map((booking) => {
                const property = appData.properties.find((item) => item.id === booking.propertyId);
                return `
                    <article class="request-card">
                        <div>
                            <h3>${store.escapeHtml(property?.name || "Deleted property")}</h3>
                            <p>Requested on ${store.escapeHtml(booking.createdAt)}.</p>
                        </div>
                        <span class="status-pill">${store.escapeHtml(booking.status)}</span>
                    </article>
                `;
            }).join("")
            : `<p class="empty-state">No booking requests yet.</p>`;
    }
}

function createBooking(propertyId) {
    const session = store.loadSession();
    if (!session) return;

    const alreadyRequested = appData.bookings.some((booking) => (
        booking.customerId === session.id && booking.propertyId === propertyId
    ));

    if (alreadyRequested) {
        store.showToast("You have already requested a booking for this property!", "error");
        document.querySelector("#requests").scrollIntoView({ behavior: "smooth" });
        return;
    }

    appData.bookings.push({
        id: store.createId("booking"),
        propertyId,
        customerId: session.id,
        customerName: session.name,
        status: "Pending",
        createdAt: new Date().toLocaleDateString()
    });

    store.saveData(appData);
    renderCustomerRequests(session);
    store.showToast("Booking request submitted successfully!");
    document.querySelector("#requests").scrollIntoView({ behavior: "smooth" });
}

/* ==========================================
   ADMIN VIEW CONTROLLER
   ========================================== */
function initAdminView(session) {
    // Populate copy form
    const siteForm = document.querySelector("[data-site-form]");
    if (siteForm) {
        siteForm.siteName.value = appData.siteName;
        siteForm.heroEyebrow.value = appData.hero.eyebrow;
        siteForm.heroTitle.value = appData.hero.title;
        siteForm.heroDescription.value = appData.hero.description;
    }

    renderAdminLists();
    renderAdminRequests();
}

function renderAdminLists() {
    const propertiesEl = document.querySelector("[data-admin-properties]");
    if (propertiesEl) {
        propertiesEl.innerHTML = appData.properties.map((property) => `
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
        statsEl.innerHTML = appData.stats.map((stat) => `
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
        servicesEl.innerHTML = appData.services.map((service) => `
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

function renderAdminRequests() {
    const list = document.querySelector("[data-admin-requests]");
    if (list) {
        list.innerHTML = appData.bookings.length
            ? appData.bookings.map((booking) => {
                const property = appData.properties.find((item) => item.id === booking.propertyId);
                const controls = booking.status === "Pending" ? `
                    <div class="card-actions">
                        <button class="mini-button" type="button" data-booking-status="Approved" data-booking-id="${booking.id}">Approve</button>
                        <button class="mini-button" type="button" data-booking-status="Rejected" data-booking-id="${booking.id}">Reject</button>
                    </div>
                ` : "";

                return `
                    <article class="request-card">
                        <div>
                            <h3>${store.escapeHtml(property?.name || "Deleted property")}</h3>
                            <p>${store.escapeHtml(booking.customerName)} requested this stay on ${store.escapeHtml(booking.createdAt)}.</p>
                        </div>
                        <div>
                            <span class="status-pill">${store.escapeHtml(booking.status)}</span>
                            ${controls}
                        </div>
                    </article>
                `;
            }).join("")
            : `<p class="empty-state">No customer requests yet.</p>`;
    }
}

function upsertById(collection, item) {
    const index = collection.findIndex((currentItem) => currentItem.id === item.id);
    if (index >= 0) {
        collection[index] = item;
        return;
    }
    collection.push(item);
}

function handleSiteCopySubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    appData.siteName = form.siteName.value.trim();
    appData.hero.eyebrow = form.heroEyebrow.value.trim();
    appData.hero.title = form.heroTitle.value.trim();
    appData.hero.description = form.heroDescription.value.trim();
    appData.sections.footerText = `${appData.siteName} Property Management System. Built for owners, managers, and memorable stays.`;

    store.saveData(appData);
    store.renderBrand(appData);
    store.showToast("Homepage copy saved successfully!");
}

function handlePropertySubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.id.value || store.createId("property");
    const currentProperty = appData.properties.find((p) => p.id === id);

    upsertById(appData.properties, {
        id,
        name: form.name.value.trim(),
        type: form.type.value.trim(),
        description: form.description.value.trim(),
        price: Number(form.price.value),
        rating: Number(form.rating.value),
        photoClass: currentProperty?.photoClass || `photo-${(appData.properties.length % 3) + 1}`
    });

    const isEdit = !!form.id.value;
    form.reset();
    store.saveData(appData);
    renderAdminLists();
    
    const modal = document.getElementById("admin-property-modal");
    if (modal) modal.close();

    store.showToast(isEdit ? "Property updated successfully!" : "Property added successfully!");
}

function handleStatSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const isEdit = !!form.id.value;

    upsertById(appData.stats, {
        id: form.id.value || store.createId("stat"),
        value: form.value.value.trim(),
        label: form.label.value.trim()
    });

    form.reset();
    store.saveData(appData);
    renderAdminLists();

    const modal = document.getElementById("admin-stat-modal");
    if (modal) modal.close();

    store.showToast(isEdit ? "Stat updated successfully!" : "Stat added successfully!");
}

function handleServiceSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const isEdit = !!form.id.value;

    upsertById(appData.services, {
        id: form.id.value || store.createId("service"),
        title: form.title.value.trim(),
        description: form.description.value.trim()
    });

    form.reset();
    store.saveData(appData);
    renderAdminLists();

    const modal = document.getElementById("admin-service-modal");
    if (modal) modal.close();

    store.showToast(isEdit ? "Service updated successfully!" : "Service added successfully!");
}

// Fill forms for editing
function fillPropertyForm(propertyId) {
    const property = appData.properties.find((item) => item.id === propertyId);
    const modal = document.getElementById("admin-property-modal");
    const form = modal ? modal.querySelector("[data-property-form]") : null;
    if (property && form) {
        form.id.value = property.id;
        form.name.value = property.name;
        form.type.value = property.type;
        form.description.value = property.description;
        form.price.value = property.price;
        form.rating.value = property.rating;
        
        const titleEl = document.getElementById("property-modal-title");
        if (titleEl) titleEl.textContent = "Edit Property";
        
        modal.showModal();
    }
}

function fillStatForm(statId) {
    const stat = appData.stats.find((item) => item.id === statId);
    const modal = document.getElementById("admin-stat-modal");
    const form = modal ? modal.querySelector("[data-stat-form]") : null;
    if (stat && form) {
        form.id.value = stat.id;
        form.value.value = stat.value;
        form.label.value = stat.label;
        
        const titleEl = document.getElementById("stat-modal-title");
        if (titleEl) titleEl.textContent = "Edit Stat";
        
        modal.showModal();
    }
}

function fillServiceForm(serviceId) {
    const service = appData.services.find((item) => item.id === serviceId);
    const modal = document.getElementById("admin-service-modal");
    const form = modal ? modal.querySelector("[data-service-form]") : null;
    if (service && form) {
        form.id.value = service.id;
        form.title.value = service.title;
        form.description.value = service.description;
        
        const titleEl = document.getElementById("service-modal-title");
        if (titleEl) titleEl.textContent = "Edit Service";
        
        modal.showModal();
    }
}

// Delete actions
function deleteProperty(id) {
    if (confirm("Are you sure you want to delete this property?")) {
        appData.properties = appData.properties.filter((item) => item.id !== id);
        store.saveData(appData);
        renderAdminLists();
        store.showToast("Property deleted successfully!");
    }
}

function deleteStat(id) {
    if (confirm("Are you sure you want to delete this stat?")) {
        appData.stats = appData.stats.filter((item) => item.id !== id);
        store.saveData(appData);
        renderAdminLists();
        store.showToast("Stat deleted successfully!");
    }
}

function deleteService(id) {
    if (confirm("Are you sure you want to delete this service?")) {
        appData.services = appData.services.filter((item) => item.id !== id);
        store.saveData(appData);
        renderAdminLists();
        store.showToast("Service deleted successfully!");
    }
}

function updateBookingStatus(bookingId, status) {
    const booking = appData.bookings.find((item) => item.id === bookingId);
    if (!booking) return;

    booking.status = status;
    store.saveData(appData);
    renderAdminRequests();
    store.showToast(`Booking request ${status.toLowerCase()}!`);
}

/* ==========================================
   ROUTING ENGINE
   ========================================== */
function router() {
    appData = store.loadData();
    const session = store.loadSession();
    activeSession = session;

    const homeView = document.getElementById("home-view");
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");
    const customerView = document.getElementById("customer-view");
    const adminView = document.getElementById("admin-view");

    if (loginView) {
        if (session) {
            window.location.href = session.role === "admin" ? "admin.html" : "customer.html";
            return;
        }
        initLoginView();
    } else if (registerView) {
        if (session) {
            window.location.href = session.role === "admin" ? "admin.html" : "customer.html";
            return;
        }
        initRegisterView();
    } else if (customerView) {
        if (!session || session.role !== "customer") {
            window.location.href = "login.html";
            return;
        }
        initCustomerView(session);
    } else if (adminView) {
        if (!session || session.role !== "admin") {
            window.location.href = "login.html";
            return;
        }
        initAdminView(session);
    } else if (homeView) {
        initHomeView(session);
        
        // Handle scroll if URL has a hash initially
        const hash = window.location.hash;
        if (hash && hash.startsWith("#")) {
            const targetId = hash.substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: "smooth" });
                }, 50);
            }
        }
    }

    updateNavbar(session);
    store.renderBrand(appData);

    // HTML5 APIs & Modals init
    initMobileMenu(session);
    initDragAndDrop();

    const geoBtn = document.getElementById("geo-btn");
    if (geoBtn) {
        geoBtn.onclick = handleGeolocation;
    }
}

/* ==========================================
   INITIALIZATION & BINDINGS
   ========================================== */
function initApp() {
    // 1. Setup Form Submit Listeners once
    const searchForm = document.querySelector("[data-search-form]");
    if (searchForm) searchForm.addEventListener("submit", handleSearch);

    const homeRegisterForm = document.querySelector("[data-home-register-form]");
    if (homeRegisterForm) homeRegisterForm.addEventListener("submit", handleHomeRegister);

    const registerForm = document.querySelector("[data-register-form]");
    if (registerForm) registerForm.addEventListener("submit", handleRegister);

    const loginForm = document.querySelector("[data-login-form]");
    if (loginForm) {
        const roleSelect = loginForm.role;
        const adminCodeField = document.querySelector("[data-admin-code-field]");
        
        roleSelect.addEventListener("change", () => {
            adminCodeField.hidden = roleSelect.value !== "admin";
        });
        loginForm.addEventListener("submit", handleLogin);
    }

    const siteForm = document.querySelector("[data-site-form]");
    if (siteForm) siteForm.addEventListener("submit", handleSiteCopySubmit);

    const propertyForm = document.querySelector("[data-property-form]");
    if (propertyForm) propertyForm.addEventListener("submit", handlePropertySubmit);

    const statForm = document.querySelector("[data-stat-form]");
    if (statForm) statForm.addEventListener("submit", handleStatSubmit);

    const serviceForm = document.querySelector("[data-service-form]");
    if (serviceForm) serviceForm.addEventListener("submit", handleServiceSubmit);

    // 2. Admin Modal creation triggers
    const addPropBtn = document.getElementById("add-property-btn");
    if (addPropBtn) addPropBtn.addEventListener("click", openAddPropertyModal);

    const addStatBtn = document.getElementById("add-stat-btn");
    if (addStatBtn) addStatBtn.addEventListener("click", openAddStatModal);

    const addServBtn = document.getElementById("add-service-btn");
    if (addServBtn) addServBtn.addEventListener("click", openAddServiceModal);

    // Reset database to defaults
    const resetBtn = document.getElementById("reset-app-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset all application data to default stays and bookings?")) {
                store.resetData();
                appData = store.loadData();
                visibleProperties = [...appData.properties];
                router();
                store.showToast("All application data has been reset to defaults.");
            }
        });
    }

    // 3. Setup Single Global Click listener (Event Delegation)
    document.addEventListener("click", (event) => {
        // Close modals helper
        const closeModalId = event.target.dataset.closeModal;
        if (closeModalId) {
            const dialog = document.getElementById(closeModalId);
            if (dialog) dialog.close();
        }

        // View details modal trigger
        const viewPropBtn = event.target.closest("[data-view-property]");
        const viewPropId = viewPropBtn ? viewPropBtn.dataset.viewProperty : null;
        if (viewPropId) openPropertyDetailsModal(viewPropId);

        // Edit triggers
        const editPropertyId = event.target.dataset.editProperty;
        if (editPropertyId) fillPropertyForm(editPropertyId);

        const editStatId = event.target.dataset.editStat;
        if (editStatId) fillStatForm(editStatId);

        const editServiceId = event.target.dataset.editService;
        if (editServiceId) fillServiceForm(editServiceId);

        // Delete triggers
        const deletePropertyId = event.target.dataset.deleteProperty;
        if (deletePropertyId) deleteProperty(deletePropertyId);

        const deleteStatId = event.target.dataset.deleteStat;
        if (deleteStatId) deleteStat(deleteStatId);

        const deleteServiceId = event.target.dataset.deleteService;
        if (deleteServiceId) deleteService(deleteServiceId);

        // Booking status approval/rejections (admin)
        if (event.target.dataset.bookingStatus) {
            updateBookingStatus(event.target.dataset.bookingId, event.target.dataset.bookingStatus);
        }

        // Request booking request trigger (customer)
        const bookPropertyId = event.target.dataset.bookProperty;
        if (bookPropertyId) createBooking(bookPropertyId);
    });

    // 4. Register Hash Listeners and Run Router initially
    window.addEventListener("hashchange", router);
    router();
}

/* ==========================================
   HTML5 GEOLOCATION API & `<dialog>` CONTROL
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
            
            // Query free Nominatim OSM reverse geocoder with custom headers
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
                
                // Trigger search grid updates
                const searchForm = document.querySelector("[data-search-form]");
                if (searchForm) {
                    const event = new Event("submit", { cancelable: true });
                    searchForm.dispatchEvent(event);
                }
            })
            .catch(() => {
                locationInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                store.showToast("Location coordinates loaded!");
                
                const searchForm = document.querySelector("[data-search-form]");
                if (searchForm) {
                    const event = new Event("submit", { cancelable: true });
                    searchForm.dispatchEvent(event);
                }
            })
            .finally(() => {
                geoBtn.classList.remove("loading");
                geoBtn.disabled = false;
            });
        },
        (error) => {
            geoBtn.classList.remove("loading");
            geoBtn.disabled = false;
            let msg = "Unable to retrieve location.";
            if (error.code === error.PERMISSION_DENIED) {
                msg = "Location permission denied. Please allow access.";
            }
            store.showToast(msg, "error");
        },
        { enableHighAccuracy: true, timeout: 6000 }
    );
}

function openPropertyDetailsModal(propertyId) {
    const property = appData.properties.find(p => p.id === propertyId);
    if (!property) return;

    const modal = document.getElementById("property-details-modal");
    if (!modal) return;

    const titleEl = document.getElementById("modal-prop-title");
    const bodyEl = document.getElementById("modal-prop-body");
    const footerEl = document.getElementById("modal-prop-footer");

    titleEl.textContent = property.name;

    const amenities = [
        "High-speed WiFi", "Air conditioning", "Dedicated workspace", 
        "Kitchen essentials", "Fresh linens & towels", "Smart lock self check-in"
    ];
    
    bodyEl.innerHTML = `
        <div class="modal-prop-hero ${store.escapeHtml(property.photoClass)}"></div>
        <div class="modal-prop-meta">
            <span class="modal-prop-type">${store.escapeHtml(property.type)}</span>
            <span class="modal-prop-rating">${Number(property.rating).toFixed(2)}</span>
        </div>
        <p style="color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 16px;">
            ${store.escapeHtml(property.description)}
        </p>
        <div class="modal-prop-amenities">
            <h4>What this place offers</h4>
            <div class="amenities-grid">
                ${amenities.map(a => `<div class="amenity-item">${a}</div>`).join("")}
            </div>
        </div>
        <div class="modal-prop-price">
            $${Number(property.price).toLocaleString()} <span>/ night</span>
        </div>
    `;

    if (!activeSession) {
        footerEl.innerHTML = `
            <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
            <a class="mini-button" href="login.html" style="background:#ff385c; color:#fff; border-color:#ff385c; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">Log in to book</a>
        `;
    } else if (activeSession.role === "customer") {
        const alreadyRequested = appData.bookings.some((booking) => (
            booking.customerId === activeSession.id && booking.propertyId === propertyId
        ));

        if (alreadyRequested) {
            footerEl.innerHTML = `
                <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
                <button class="mini-button" type="button" disabled style="background:#eeeeee; color:#999; border-color:#eee; cursor:not-allowed;">Requested</button>
            `;
        } else {
            footerEl.innerHTML = `
                <button class="mini-button" type="button" data-close-modal="property-details-modal">Cancel</button>
                <button class="mini-button" type="button" id="confirm-modal-booking-btn" style="background:#ff385c; color:#fff; border-color:#ff385c;">Request booking now</button>
            `;

            const btn = footerEl.querySelector("#confirm-modal-booking-btn");
            if (btn) {
                btn.addEventListener("click", () => {
                    createBooking(propertyId);
                    modal.close();
                });
            }
        }
    } else {
        footerEl.innerHTML = `
            <button class="mini-button" type="button" data-close-modal="property-details-modal">Close</button>
        `;
    }

    modal.showModal();
}

function openAddPropertyModal() {
    const modal = document.getElementById("admin-property-modal");
    const form = modal ? modal.querySelector("[data-property-form]") : null;
    if (form) {
        form.reset();
        form.id.value = "";
        const titleEl = document.getElementById("property-modal-title");
        if (titleEl) titleEl.textContent = "Add Property";
        modal.showModal();
    }
}

function openAddStatModal() {
    const modal = document.getElementById("admin-stat-modal");
    const form = modal ? modal.querySelector("[data-stat-form]") : null;
    if (form) {
        form.reset();
        form.id.value = "";
        const titleEl = document.getElementById("stat-modal-title");
        if (titleEl) titleEl.textContent = "Add Stat";
        modal.showModal();
    }
}

function openAddServiceModal() {
    const modal = document.getElementById("admin-service-modal");
    const form = modal ? modal.querySelector("[data-service-form]") : null;
    if (form) {
        form.reset();
        form.id.value = "";
        const titleEl = document.getElementById("service-modal-title");
        if (titleEl) titleEl.textContent = "Add Service";
        modal.showModal();
    }
}

/* ==========================================
   HTML5 DRAG & DROP COMPARE DRAWER
   ========================================== */
function initDragAndDrop() {
    const drawer = document.getElementById("favorites-drawer");
    const dropZone = document.getElementById("favorites-drop-zone");
    const list = document.getElementById("favorites-list");
    const header = document.getElementById("favorites-header");
    const count = document.getElementById("favorites-count");
    const toggle = document.getElementById("favorites-toggle");

    if (!drawer || !dropZone) return;

    // Remove old listeners to avoid duplicates
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    newHeader.addEventListener("click", () => {
        drawer.classList.toggle("open");
        const toggleBtn = drawer.querySelector("#favorites-toggle");
        if (toggleBtn) {
            toggleBtn.textContent = drawer.classList.contains("open") ? "Hide" : "Show";
        }
    });

    // Setup drag events
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
                store.showToast("Added to compare/favorites list!");
                renderFavorites();
            } else {
                store.showToast("This property is already in your favorites list.", "error");
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
        list.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 12px 0;">Drag and drop property cards here to save & compare stays.</p>`;
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
                    <p>$${property.price}/night</p>
                </div>
                <button type="button" class="fav-remove-btn" data-remove-fav="${property.id}">&times;</button>
            </div>
        `;
    }).join("");

    // Bind remove button handlers
    list.querySelectorAll("[data-remove-fav]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.dataset.removeFav;
            store.removeFavorite(id);
            renderFavorites();
            store.showToast("Removed from favorites.");
        });
    });
}

/* ==========================================
   RESPONSIVE MOBILE NAVBAR SYSTEM
   ========================================== */
function initMobileMenu(session) {
    const toggleBtn = document.getElementById("mobile-nav-toggle");
    const closeBtn = document.getElementById("mobile-nav-close");
    const dialog = document.getElementById("mobile-nav-dialog");
    const linksSlot = document.getElementById("mobile-nav-links");
    const actionsSlot = document.getElementById("mobile-nav-actions");

    if (!toggleBtn || !dialog || !linksSlot || !actionsSlot) return;

    toggleBtn.addEventListener("click", () => {
        const desktopLinks = document.getElementById("dynamic-nav-links");
        const desktopActions = document.getElementById("dynamic-session-actions");

        if (desktopLinks) {
            linksSlot.innerHTML = desktopLinks.innerHTML;
        }
        if (desktopActions) {
            actionsSlot.innerHTML = desktopActions.innerHTML;
        }

        // Custom mobile navigation links interaction
        linksSlot.querySelectorAll("a").forEach(a => {
            a.addEventListener("click", (e) => {
                dialog.close();
                const href = a.getAttribute("href");
                if (href.startsWith("#")) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }
            });
        });

        // Logout listener in mobile menu
        const logoutBtn = actionsSlot.querySelector("[data-logout-button]");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                dialog.close();
                store.logout();
                router();
            });
        }

        dialog.showModal();
    });

    closeBtn.addEventListener("click", () => {
        dialog.close();
    });
}

// Start application when DOM loads
window.addEventListener("DOMContentLoaded", initApp);

