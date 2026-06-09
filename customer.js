const store = RoomBnbStore;
const appData = store.loadData();
const session = store.requireRole("customer");

store.renderBrand(appData);
store.renderSession(session);

function renderProperties() {
    document.querySelector("[data-property-list]").innerHTML = appData.properties.map((property) => `
        <article class="property-card">
            <div class="property-photo ${store.escapeHtml(property.photoClass)}"></div>
            <div class="property-info">
                <div class="property-top">
                    <h3>${store.escapeHtml(property.name)}</h3>
                    <span class="rating">Star ${Number(property.rating).toFixed(2)}</span>
                </div>
                <p>${store.escapeHtml(property.description)}</p>
                <span class="price">From $${Number(property.price).toLocaleString()} night</span>
                <button class="mini-button" type="button" data-book-property="${property.id}">Request booking</button>
            </div>
        </article>
    `).join("");
}

function renderRequests() {
    const requests = appData.bookings.filter((booking) => booking.customerId === session.id);

    document.querySelector("[data-customer-requests]").innerHTML = requests.length
        ? requests.map(renderRequestCard).join("")
        : `<p class="empty-state">No booking requests yet.</p>`;
}

function renderRequestCard(booking) {
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
}

function createBooking(propertyId) {
    const alreadyRequested = appData.bookings.some((booking) => (
        booking.customerId === session.id && booking.propertyId === propertyId
    ));

    if (alreadyRequested) {
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
    renderRequests();
    document.querySelector("#requests").scrollIntoView({ behavior: "smooth" });
}

document.querySelector("[data-logout-button]").addEventListener("click", () => store.logout());
document.addEventListener("click", (event) => {
    const propertyId = event.target.dataset.bookProperty;

    if (propertyId) {
        createBooking(propertyId);
    }
});

renderProperties();
renderRequests();
