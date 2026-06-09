const store = RoomBnbStore;
const form = document.querySelector("[data-register-form]");
const registerError = document.querySelector("[data-register-error]");

store.renderBrand(store.loadData());

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const address = form.address.value.trim();
    const role = "customer";

    if (!name || !email || !password || !address) {
        registerError.textContent = "All fields are required.";
        return;
    }

    if (password.length < 6) {
        registerError.textContent = "Password must be at least 6 characters.";
        return;
    }

    const created = store.addUser(name, email, password, address, role);

    if (!created) {
        registerError.textContent = "An account with this email already exists.";
        return;
    }

    sessionStorage.setItem("register_success", "true");
    window.location.href = "login.html";
});
