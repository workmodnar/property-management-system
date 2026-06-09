const store = RoomBnbStore;
const data = store.loadData();
const form = document.querySelector("[data-login-form]");
const roleSelect = form.role;
const adminCodeField = document.querySelector("[data-admin-code-field]");
const loginError = document.querySelector("[data-login-error]");

store.renderBrand(data);

roleSelect.addEventListener("change", () => {
    adminCodeField.hidden = roleSelect.value !== "admin";
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (roleSelect.value === "admin" && form.adminCode.value !== store.adminCode) {
        loginError.textContent = "Invalid admin code. Try admin123.";
        return;
    }

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (roleSelect.value === "admin") {
        if (form.adminCode.value !== store.adminCode) {
            loginError.textContent = "Invalid admin code. Try admin123.";
            return;
        }

        const session = {
            id: "admin-1",
            name: form.name.value.trim() || "Admin",
            role: "admin"
        };

        store.saveSession(session);
        window.location.href = "admin.html";
        return;
    }

    const user = store.findUser(email, password);

    if (!user) {
        loginError.textContent = "Invalid credentials. Please register first.";
        return;
    }

    const session = {
        id: user.id,
        name: user.name,
        role: user.role
    };

    store.saveSession(session);
    window.location.href = "customer.html";
});
