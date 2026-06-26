// Wishlist stays feature module for RoomBnB Customer Dashboard

// Render the customer favorites tab
window.renderWishlistTab = async function() {
    const list = document.querySelector("[data-customer-favorites-list]");
    if (!list) return;

    if (!window.activeSession) {
        list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Please log in to view your wishlist.</p>`;
        return;
    }

    try {
        const favIds = await RoomBnbAPI.getFavorites(window.activeSession.id);
        const properties = await RoomBnbAPI.getProperties();
        const favProperties = properties.filter(p => favIds.includes(p.id));

        list.innerHTML = favProperties.length
            ? favProperties.map(property => {
                const bgImage = (property.images && property.images.length > 0) ? property.images[0] : '';
                const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"` : '';
                return `
                <article class="property-card" data-id="${property.id}">
                    <div class="property-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" ${styleAttr}>
                        <span class="property-card-badge">${RoomBnbAPI.escapeHtml(property.type)}</span>
                        <button class="property-card-fav active" data-fav-toggle-id="${property.id}">❤️</button>
                    </div>
                    <div class="property-info">
                        <div class="property-top">
                            <h3>${RoomBnbAPI.escapeHtml(property.name)}</h3>
                            <span class="rating">${Number(property.rating).toFixed(2)}</span>
                        </div>
                        <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
                        <div class="property-price-box">
                            <div class="price">$${property.price} <span>/ night</span></div>
                            <button class="mini-button" type="button" data-view-property="${property.id}">Book Now</button>
                        </div>
                    </div>
                </article>
            `; }).join("")
            : `<div style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-muted);">
                 <h3>Your wishlist is empty.</h3>
                 <p>Click the heart icon on properties to save them here.</p>
               </div>`;
    } catch (e) {
        list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading wishlist.</p>`;
    }
};

// Global click handler delegation for favorite (heart) buttons
document.addEventListener("click", async (event) => {
    // Check if the clicked element (or a parent) is a favorite button
    const favButton = event.target.closest("[data-fav-toggle-id]");
    if (!favButton) return;

    event.preventDefault();
    const propertyId = favButton.dataset.favToggleId;

    if (!window.activeSession) {
        RoomBnbAPI.showToast("Please log in to save properties to your wishlist.", "error");
        return;
    }

    const userId = window.activeSession.id;

    try {
        const favIds = await RoomBnbAPI.getFavorites(userId);
        const isFav = favIds.includes(propertyId);

        if (isFav) {
            // Remove from wishlist
            await RoomBnbAPI.removeFavorite(userId, propertyId);
            RoomBnbAPI.showToast("Removed from wishlist.");
            favButton.classList.remove("active");
        } else {
            // Add to wishlist
            await RoomBnbAPI.addFavorite(userId, propertyId);
            RoomBnbAPI.showToast("Added to wishlist!");
            favButton.classList.add("active");
        }

        // Re-render UI elements to ensure state is synchronized
        if (typeof window.renderCustomerProperties === 'function') {
            await window.renderCustomerProperties();
        }
        
        // If the wishlist tab itself is active, re-render it immediately
        const wishlistTab = document.querySelector('[data-tab-target="customer-favorites"]');
        if (wishlistTab && wishlistTab.classList.contains("active")) {
            await window.renderWishlistTab();
        }
    } catch (err) {
        console.error("Failed to toggle favorite:", err);
        RoomBnbAPI.showToast("Error updating wishlist.", "error");
    }
});
