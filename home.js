const store = RoomBnbStore;
const appData = store.loadData();
let visibleProperties = [...appData.properties];

function setText(selector, value) {
    document.querySelector(selector).textContent = value;
}

function renderHomeCopy() {
    document.title = `${appData.siteName} | Book Unique Stays`;
    store.renderBrand(appData);
    setText("[data-hero-eyebrow]", appData.hero.eyebrow);
    setText("[data-hero-title]", appData.hero.title);
    setText("[data-hero-description]", appData.hero.description);
    setText("[data-properties-heading]", appData.sections.propertiesHeading);
    setText("[data-properties-description]", appData.sections.propertiesDescription);
    setText("[data-owner-title]", appData.sections.ownerTitle);
    setText("[data-owner-description]", appData.sections.ownerDescription);
    setText("[data-footer-text]", appData.sections.footerText);
}

function renderStats() {
    document.querySelector("[data-stats-list]").innerHTML = appData.stats.map((stat) => `
        <div class="stat">
            <strong>${store.escapeHtml(stat.value)}</strong>
            <span>${store.escapeHtml(stat.label)}</span>
        </div>
    `).join("");
}

function renderProperties() {
    document.querySelector("[data-property-list]").innerHTML = visibleProperties.map((property) => `
        <article class="property-card">
            <div class="property-photo ${store.escapeHtml(property.photoClass)}"></div>
            <div class="property-info">
                <div class="property-top">
                    <h3>${store.escapeHtml(property.name)}</h3>
                    <span class="rating">Star ${Number(property.rating).toFixed(2)}</span>
                </div>
                <p>${store.escapeHtml(property.description)}</p>
                <span class="price">From $${Number(property.price).toLocaleString()} night</span>
                <a class="mini-button" href="login.html">Request booking</a>
            </div>
        </article>
    `).join("");
}

function renderServices() {
    document.querySelector("[data-service-list]").innerHTML = appData.services.map((service) => `
        <article class="feature-item">
            <h3>${store.escapeHtml(service.title)}</h3>
            <p>${store.escapeHtml(service.description)}</p>
        </article>
    `).join("");
}

function renderPropertyTypes() {
    const types = [...new Set(appData.properties.map((property) => property.type))];

    document.querySelector("[data-property-type-filter]").innerHTML = `
        <option value="all">All property types</option>
        ${types.map((type) => `<option value="${store.escapeHtml(type)}">${store.escapeHtml(type)}</option>`).join("")}
    `;
}

function handleSearch(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedType = form.propertyType.value;
    const location = form.location.value.trim();

    visibleProperties = selectedType === "all"
        ? [...appData.properties]
        : appData.properties.filter((property) => property.type === selectedType);

    document.querySelector("[data-search-message]").textContent = location
        ? `Showing ${visibleProperties.length} result(s) for ${selectedType === "all" ? "all property types" : selectedType} near ${location}.`
        : `Showing ${visibleProperties.length} result(s).`;

    renderProperties();
}

document.querySelector("[data-search-form]").addEventListener("submit", handleSearch);

const homeRegisterForm = document.querySelector("[data-home-register-form]");

if (homeRegisterForm) {
    const homeRegisterError = document.querySelector("[data-home-register-error]");

    homeRegisterForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = homeRegisterForm.name.value.trim();
        const email = homeRegisterForm.email.value.trim();
        const address = homeRegisterForm.address.value.trim();
        const password = homeRegisterForm.password.value.trim();

        if (!name || !email || !address || !password) {
            homeRegisterError.textContent = "All fields are required.";
            return;
        }

        if (password.length < 6) {
            homeRegisterError.textContent = "Password must be at least 6 characters.";
            return;
        }

        const created = store.addUser(name, email, password, address, "customer");

        if (!created) {
            homeRegisterError.textContent = "An account with this email already exists.";
            return;
        }

        window.location.href = "login.html";
    });
}

renderHomeCopy();
renderStats();
renderProperties();
renderServices();
renderPropertyTypes();
