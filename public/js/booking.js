// Booking feature module for RoomBnB Customer Dashboard

// Global click handler delegation for viewing property details / book stays
document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-property]");
    if (!viewButton) return;

    event.preventDefault();
    const propertyId = viewButton.dataset.viewProperty;
    if (propertyId && typeof window.openPropertyDetailsModal === 'function') {
        window.openPropertyDetailsModal(propertyId);
    }
});

// Render the customer requests / bookings tab, filtering out 'Pending' bookings
// (Only bookings that are paid/bought will be visible)
window.renderCustomerRequests = async function(session) {
    const requestsList = document.querySelector("[data-customer-requests]");
    if (!requestsList) return;

    try {
        const bookings = await RoomBnbAPI.getBookings("customer", session.id);
        const properties = await RoomBnbAPI.getProperties();

        // Filter bookings: only show those that are paid/bought (non-Pending)
        const boughtBookings = bookings.filter(b => b.status !== "Pending");

        requestsList.innerHTML = boughtBookings.length
            ? boughtBookings.map(booking => {
                const property = properties.find(item => item.id === booking.propertyId);
                const statusLower = booking.status.toLowerCase();
                
                const showCancel = ["approved", "paid"].includes(statusLower);
                const showReview = ["paid", "approved", "completed"].includes(statusLower);

                return `
                    <article class="request-card">
                        <div class="request-card-info">
                            <h3>${RoomBnbAPI.escapeHtml(property?.name || "Deleted Property")}</h3>
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
                 <h3>No bookings found.</h3>
                 <p>Explore properties and book a stay.</p>
               </div>`;
    } catch (e) {
        console.error("Error rendering customer requests:", e);
        requestsList.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading reservations.</p>`;
    }
};

// Wire up payment form submit listener and payment mode selectors
window.initBookingPaymentListeners = function() {
    const form = document.getElementById("payment-submit-form");
    if (form) {
        form.onsubmit = window.processBookingPayment;
    }

    if (typeof window.initPaymentInputListeners === 'function') {
        window.initPaymentInputListeners();
    }
};

// Initialize listeners immediately or on DOM content loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initBookingPaymentListeners);
} else {
    window.initBookingPaymentListeners();
}
