window.activeSession = RoomBnbAPI.loadSession();

// Auth form handlers
window.initLoginView = function() {
    const loginError = document.querySelector("[data-login-error]");
    if (loginError) loginError.textContent = "";

    // Google Sign-In mock trigger
    const googleBtn = document.getElementById("google-login-btn");
    if (googleBtn) {
        googleBtn.onclick = async () => {
            try {
                // Register/Login mock Google user
                const user = await RoomBnbAPI.login("google-user@gmail.com", "googlepassword", "customer");
                RoomBnbAPI.showToast("Logged in successfully with Google Mock!");
                setTimeout(() => {
                    window.location.href = "customer.html";
                }, 1000);
            } catch (e) {
                // If not registered yet, try registering then logging in
                try {
                    await RoomBnbAPI.register("Google Traveler", "google-user@gmail.com", "googlepassword", "Mountain View, CA", "customer", "+1555000111");
                    await RoomBnbAPI.login("google-user@gmail.com", "googlepassword", "customer");
                    RoomBnbAPI.showToast("Logged in successfully with Google Mock!");
                    setTimeout(() => {
                        window.location.href = "customer.html";
                    }, 1000);
                } catch (regErr) {
                    RoomBnbAPI.showToast(regErr.message, "error");
                }
            }
        };
    }

    // Forgot Password and 2FA View Toggles
    const forgotLink = document.getElementById("forgot-password-link");
    const loginCard = document.getElementById("login-card-container");
    const forgotCard = document.getElementById("forgot-password-card");
    const backFromForgot = document.getElementById("back-to-login-from-forgot");
    const forgotForm = document.getElementById("forgot-password-form");
    const forgotError = document.getElementById("forgot-error");

    if (forgotLink && loginCard && forgotCard) {
        forgotLink.onclick = (e) => {
            e.preventDefault();
            loginCard.style.display = "none";
            forgotCard.style.display = "block";
            if (forgotError) forgotError.textContent = "";
        };
    }
    if (backFromForgot && loginCard && forgotCard) {
        backFromForgot.onclick = (e) => {
            e.preventDefault();
            forgotCard.style.display = "none";
            loginCard.style.display = "block";
        };
    }
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = forgotForm.email.value.trim();
            try {
                const res = await RoomBnbAPI.forgotPassword(email);
                if (forgotError) {
                    forgotError.style.color = "var(--success)";
                    forgotError.textContent = res.message || "Reset link sent! Mock code: 123456";
                }
                RoomBnbAPI.showToast("Password reset email sent (Mock)!");
            } catch (err) {
                if (forgotError) {
                    forgotError.style.color = "var(--error)";
                    forgotError.textContent = err.message || "Error sending reset link.";
                }
            }
        };
    }

    const twoFactorCard = document.getElementById("two-factor-card");
    const backFrom2fa = document.getElementById("back-to-login-from-2fa");
    const twoFactorForm = document.getElementById("two-factor-form");
    const twoFactorError = document.getElementById("two-factor-error");

    if (backFrom2fa && loginCard && twoFactorCard) {
        backFrom2fa.onclick = (e) => {
            e.preventDefault();
            twoFactorCard.style.display = "none";
            loginCard.style.display = "block";
        };
    }

    if (twoFactorForm) {
        twoFactorForm.onsubmit = async (e) => {
            e.preventDefault();
            RoomBnbAPI.showToast("2FA is disabled on this platform.");
        };
    }
};

window.handleLoginSubmit = async function(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value;
    const loginError = document.querySelector("[data-login-error]");
    if (loginError) loginError.textContent = "";

    try {
        const user = await RoomBnbAPI.login(email, password, role);
        RoomBnbAPI.showToast("Logged in successfully!");
        
        setTimeout(() => {
            if (user.role === "admin") {
                window.location.href = "admin.html";
            } else if (user.role === "host") {
                window.location.href = "host.html";
            } else {
                window.location.href = "customer.html";
            }
        }, 800);
    } catch (err) {
        if (loginError) loginError.textContent = err.message || "Invalid email or password for selected role.";
    }
};

window.handleRegisterSubmit = async function(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const address = form.address.value.trim();
    const phone = form.phone.value.trim();
    const role = form.role ? form.role.value : "customer";
    const errorEl = form.querySelector(".login-error") || document.querySelector("[data-home-register-error]") || document.querySelector("[data-register-error]");
    if (errorEl) errorEl.textContent = "";

    try {
        await RoomBnbAPI.register(name, email, password, address, role, phone);
        sessionStorage.setItem("register_success", "true");
        RoomBnbAPI.showToast("Account created! Please sign in.");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
    } catch (err) {
        if (errorEl) errorEl.textContent = err.message || "Email is already registered.";
    }
};

// Global routing entrypoint
window.router = async function() {
    window.activeSession = RoomBnbAPI.loadSession();

    try {
        window.appConfig = await RoomBnbAPI.getConfig();
    } catch (e) {
        console.error("Failed to load config, using fallback values", e);
        window.appConfig = { siteName: "RoomBnB", hero: {}, sections: {}, stats: [], services: [] };
    }

    const homeView = document.getElementById("home-view");
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");
    const customerView = document.getElementById("customer-view");
    const hostView = document.getElementById("host-view");
    const adminView = document.getElementById("admin-view");

    if (loginView) {
        if (window.activeSession) {
            window.location.href = window.activeSession.role === "admin" ? "admin.html" : (window.activeSession.role === "host" ? "host.html" : "customer.html");
            return;
        }
        window.initLoginView();
    } else if (registerView) {
        if (window.activeSession) {
            window.location.href = window.activeSession.role === "admin" ? "admin.html" : (window.activeSession.role === "host" ? "host.html" : "customer.html");
            return;
        }
    } else if (customerView) {
        if (!window.activeSession || window.activeSession.role !== "customer") {
            window.location.href = "login.html";
            return;
        }
        if (typeof window.initCustomerView === 'function') window.initCustomerView(window.activeSession);
    } else if (hostView) {
        if (!window.activeSession || window.activeSession.role !== "host") {
            window.location.href = "login.html";
            return;
        }
        if (typeof window.initHostView === 'function') window.initHostView(window.activeSession);
    } else if (adminView) {
        if (!window.activeSession || window.activeSession.role !== "admin") {
            window.location.href = "login.html";
            return;
        }
        if (typeof window.initAdminView === 'function') window.initAdminView(window.activeSession);
    } else if (homeView) {
        if (typeof window.initHomeView === 'function') window.initHomeView(window.activeSession);
    }

    window.updateNavbar(window.activeSession);
    RoomBnbAPI.renderBrand(window.appConfig);

    if (typeof window.initDashboardTabs === 'function') window.initDashboardTabs();
    if (typeof window.initAnimations === 'function') window.initAnimations();

    const geoBtn = document.getElementById("geo-btn");
    if (geoBtn) {
        geoBtn.onclick = window.handleGeolocation;
    }

    if (typeof window.initDragAndDrop === 'function') window.initDragAndDrop();
};

// Global App Initialization
window.initApp = function() {
    console.log("RoomBnB: initApp() starting...");
    try {
        const searchForm = document.querySelector("[data-search-form]");
        if (searchForm) searchForm.addEventListener("submit", window.handleSearch);

        const homeRegisterForm = document.querySelector("[data-home-register-form]");
        if (homeRegisterForm) homeRegisterForm.addEventListener("submit", window.handleRegisterSubmit);

        const registerForm = document.querySelector("[data-register-form]");
        if (registerForm) registerForm.addEventListener("submit", window.handleRegisterSubmit);

        const loginForm = document.querySelector("[data-login-form]");
        if (loginForm) loginForm.addEventListener("submit", window.handleLoginSubmit);

        // Reset database button
        const resetBtn = document.getElementById("reset-app-btn");
        if (resetBtn) {
            resetBtn.onclick = async () => {
                if (confirm("Reset RoomBnB to default stays seeds and logs?")) {
                    await RoomBnbAPI.resetApp();
                    RoomBnbAPI.clearSession();
                    window.location.href = "index.html";
                }
            };
        }

        // Email Verification Banner action
        document.addEventListener("click", async (event) => {
            if (event.target.id === "verify-email-banner-btn") {
                try {
                    await RoomBnbAPI.updateUser(window.activeSession.id, { verified: true });
                    window.activeSession.verified = true;
                    RoomBnbAPI.saveSession(window.activeSession);
                    RoomBnbAPI.showToast("Email successfully verified!");
                    window.updateNavbar(window.activeSession);
                } catch (err) {
                    RoomBnbAPI.showToast("Failed to verify email.", "error");
                }
            }
        });

        // Run Routing logic
        window.router();
        console.log("RoomBnB: initApp() completed.");
    } catch (err) {
        console.error("RoomBnB: Error during initApp():", err);
    }
};

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", window.initApp);
} else {
    window.initApp();
}
window.addEventListener("hashchange", window.router);
