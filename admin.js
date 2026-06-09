const store = RoomBnbStore;
const appData = store.loadData();
const session = store.requireRole("admin");

store.renderBrand(appData);
store.renderSession(session);

function upsertById(collection, item) {
    const index = collection.findIndex((currentItem) => currentItem.id === item.id);

    if (index >= 0) {
        collection[index] = item;
        return;
    }

    collection.push(item);
}

function renderForms() {
    const siteForm = document.querySelector("[data-site-form]");

    siteForm.siteName.value = appData.siteName;
    siteForm.heroEyebrow.value = appData.hero.eyebrow;
    siteForm.heroTitle.value = appData.hero.title;
    siteForm.heroDescription.value = appData.hero.description;
}

function renderRequests() {
    document.querySelector("[data-admin-requests]").innerHTML = appData.bookings.length
        ? appData.bookings.map(renderRequestCard).join("")
        : `<p class="empty-state">No customer requests yet.</p>`;
}

function renderAdminLists() {
    document.querySelector("[data-admin-properties]").innerHTML = appData.properties.map((property) => `
        <div class="admin-list-row">
            <span>${store.escapeHtml(property.name)}</span>
            <div class="card-actions">
                <button class="mini-button" type="button" data-edit-property="${property.id}">Edit</button>
                <button class="mini-button danger-button" type="button" data-delete-property="${property.id}">Delete</button>
            </div>
        </div>
    `).join("");

    document.querySelector("[data-admin-stats]").innerHTML = appData.stats.map((stat) => `
        <div class="admin-list-row">
            <span>${store.escapeHtml(stat.value)} ${store.escapeHtml(stat.label)}</span>
            <div class="card-actions">
                <button class="mini-button" type="button" data-edit-stat="${stat.id}">Edit</button>
                <button class="mini-button danger-button" type="button" data-delete-stat="${stat.id}">Delete</button>
            </div>
        </div>
    `).join("");

    document.querySelector("[data-admin-services]").innerHTML = appData.services.map((service) => `
        <div class="admin-list-row">
            <span>${store.escapeHtml(service.title)}</span>
            <div class="card-actions">
                <button class="mini-button" type="button" data-edit-service="${service.id}">Edit</button>
                <button class="mini-button danger-button" type="button" data-delete-service="${service.id}">Delete</button>
            </div>
        </div>
    `).join("");
}

function renderRequestCard(booking) {
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
}

function updateBookingStatus(bookingId, status) {
    const booking = appData.bookings.find((item) => item.id === bookingId);

    if (!booking) {
        return;
    }

    booking.status = status;
    store.saveData(appData);
    renderRequests();
    store.showToast(`Booking request ${status.toLowerCase()}!`);
}

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

function fillPropertyForm(propertyId) {
    const property = appData.properties.find((item) => item.id === propertyId);
    const form = document.querySelector("[data-property-form]");

    form.id.value = property.id;
    form.name.value = property.name;
    form.type.value = property.type;
    form.description.value = property.description;
    form.price.value = property.price;
    form.rating.value = property.rating;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fillStatForm(statId) {
    const stat = appData.stats.find((item) => item.id === statId);
    const form = document.querySelector("[data-stat-form]");

    form.id.value = stat.id;
    form.value.value = stat.value;
    form.label.value = stat.label;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fillServiceForm(serviceId) {
    const service = appData.services.find((item) => item.id === serviceId);
    const form = document.querySelector("[data-service-form]");

    form.id.value = service.id;
    form.title.value = service.title;
    form.description.value = service.description;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.querySelector("[data-logout-button]").addEventListener("click", () => store.logout());

document.querySelector("[data-site-form]").addEventListener("submit", (event) => {
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
});

document.querySelector("[data-property-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.id.value || store.createId("property");
    const currentProperty = appData.properties.find((property) => property.id === id);

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
    store.showToast(isEdit ? "Property updated successfully!" : "Property added successfully!");
});

document.querySelector("[data-stat-form]").addEventListener("submit", (event) => {
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
    store.showToast(isEdit ? "Stat updated successfully!" : "Stat added successfully!");
});

document.querySelector("[data-service-form]").addEventListener("submit", (event) => {
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
    store.showToast(isEdit ? "Service updated successfully!" : "Service added successfully!");
});

document.addEventListener("click", (event) => {
    if (event.target.dataset.editProperty) {
        fillPropertyForm(event.target.dataset.editProperty);
    }

    if (event.target.dataset.deleteProperty) {
        deleteProperty(event.target.dataset.deleteProperty);
    }

    if (event.target.dataset.editStat) {
        fillStatForm(event.target.dataset.editStat);
    }

    if (event.target.dataset.deleteStat) {
        deleteStat(event.target.dataset.deleteStat);
    }

    if (event.target.dataset.editService) {
        fillServiceForm(event.target.dataset.editService);
    }

    if (event.target.dataset.deleteService) {
        deleteService(event.target.dataset.deleteService);
    }

    if (event.target.dataset.bookingStatus) {
        updateBookingStatus(event.target.dataset.bookingId, event.target.dataset.bookingStatus);
    }
});

renderForms();
renderAdminLists();
renderRequests();
