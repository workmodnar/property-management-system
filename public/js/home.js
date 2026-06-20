window.initHomeView = async function(session) {
    document.title = `${window.appConfig.siteName || 'RoomBnB'} | Book Unique Stays`;

    // Render copywriting
    window.setText("[data-hero-eyebrow]", window.appConfig.hero?.eyebrow || "Book stays that feel like home");
    window.setText("[data-hero-title]", window.appConfig.hero?.title || "Find your next perfect stay.");
    window.setText("[data-hero-description]", window.appConfig.hero?.description || "");
    window.setText("[data-properties-heading]", window.appConfig.sections?.propertiesHeading || "Featured stays");
    window.setText("[data-properties-description]", window.appConfig.sections?.propertiesDescription || "");
    window.setText("[data-owner-title]", window.appConfig.sections?.ownerTitle || "Have a place guests would love?");
    window.setText("[data-owner-description]", window.appConfig.sections?.ownerDescription || "");
    window.setText("[data-footer-text]", window.appConfig.sections?.footerText || "RoomBnB. Built for travelers, hosts, and memorable stays.");

    const registerSection = document.getElementById("register");
    if (registerSection) {
        registerSection.style.display = session ? "none" : "block";
    }

    window.renderHomeStats();
    await window.renderHomeProperties();
    window.renderHomeServices();
    window.renderPropertyTypes();

    // Toggle advanced filters panel
    const filterBtn = document.getElementById("trigger-advanced-filters-btn");
    const advancedFilters = document.getElementById("advanced-filters-container");
    if (filterBtn && advancedFilters) {
        filterBtn.onclick = () => {
            if (advancedFilters.style.display === "none" || !advancedFilters.style.display) {
                advancedFilters.style.display = "flex";
            } else {
                advancedFilters.style.display = "none";
            }
        };
    }
};

window.renderHomeStats = function() {
    const statsList = document.querySelector("[data-stats-list]");
    if (statsList && window.appConfig.stats) {
        statsList.innerHTML = window.appConfig.stats.map(stat => `
            <div class="stat">
                <strong>${RoomBnbAPI.escapeHtml(stat.value)}</strong>
                <span>${RoomBnbAPI.escapeHtml(stat.label)}</span>
            </div>
        `).join("");
    }
};

window.renderHomeProperties = async function() {
    const list = document.querySelector("[data-property-list]");
    if (list) {
        try {
            if (!window.visibleProperties || window.visibleProperties.length === 0) {
                window.visibleProperties = await RoomBnbAPI.getProperties();
            }
            
            let favs = [];
            if (window.activeSession) {
                favs = await RoomBnbAPI.getFavorites(window.activeSession.id);
            }

            list.innerHTML = window.visibleProperties.length
                ? window.visibleProperties.map(property => {
                    const isFav = favs.includes(property.id) ? "active" : "";
                    const bgImage = (property.images && property.images.length > 0) ? property.images[0] : '';
                    const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"` : '';
                    return `
                        <article class="property-card" draggable="true" data-id="${property.id}">
                            <div class="property-photo ${RoomBnbAPI.escapeHtml(property.photoClass)}" ${styleAttr}>
                                <span class="property-card-badge">${RoomBnbAPI.escapeHtml(property.type)}</span>
                                <button class="property-card-fav ${isFav}" data-fav-toggle-id="${property.id}">❤️</button>
                            </div>
                            <div class="property-info">
                                <div class="property-top">
                                    <h3>${RoomBnbAPI.escapeHtml(property.name)}</h3>
                                    <span class="rating">${Number(property.rating).toFixed(2)}</span>
                                </div>
                                <p>${RoomBnbAPI.escapeHtml(property.description)}</p>
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
        } catch (e) {
            list.innerHTML = `<div style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-muted);"><h3>Error loading properties stays.</h3></div>`;
        }
    }
};

window.renderHomeServices = function() {
    const list = document.querySelector("[data-service-list]");
    if (list && window.appConfig.services) {
        list.innerHTML = window.appConfig.services.map((service, idx) => `
            <article class="feature-item">
                <div class="feature-icon">${idx + 1}</div>
                <div>
                    <h3>${RoomBnbAPI.escapeHtml(service.title)}</h3>
                    <p>${RoomBnbAPI.escapeHtml(service.description)}</p>
                </div>
            </article>
        `).join("");
    }
};

window.renderPropertyTypes = async function() {
    const select = document.querySelector("[data-property-type-filter]");
    if (select) {
        try {
            const properties = await RoomBnbAPI.getProperties();
            const types = [...new Set(properties.map(p => p.type))];
            select.innerHTML = `
                <option value="all">All property types</option>
                ${types.map(type => `<option value="${RoomBnbAPI.escapeHtml(type)}">${RoomBnbAPI.escapeHtml(type)}</option>`).join("")}
            `;
        } catch (e) {
            console.error("Failed to load property types", e);
        }
    }
};

window.checkDatesOverlap = function(start, end, bookedList) {
    const checkStart = new Date(start);
    const checkEnd = new Date(end);
    
    for (const bookedDateStr of bookedList) {
        const booked = new Date(bookedDateStr);
        if (booked >= checkStart && booked <= checkEnd) {
            return true;
        }
    }
    return false;
};

window.handleSearch = async function(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.propertyType.value;
    const location = form.location.value.trim();
    const guests = form.guests.value ? Number(form.guests.value) : 0;
    
    const minPrice = form.minPrice?.value ? Number(form.minPrice.value) : 0;
    const maxPrice = form.maxPrice?.value ? Number(form.maxPrice.value) : Infinity;
    const minRating = form.minRating?.value ? Number(form.minRating.value) : 0;
    const checkIn = form.filterCheckIn?.value;
    const checkOut = form.filterCheckOut?.value;

    const selectedAmenities = [];
    document.querySelectorAll("#search-amenities-checks input:checked").forEach(cb => {
        selectedAmenities.push(cb.value);
    });

    try {
        const filters = {
            type,
            minPrice: minPrice || undefined,
            maxPrice: (maxPrice !== Infinity) ? maxPrice : undefined,
            minRating: minRating || undefined,
            capacity: guests || undefined,
            amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined
        };

        if (location) {
            filters.search = location;
        }

        let properties = await RoomBnbAPI.getProperties(filters);

        if (checkIn && checkOut) {
            properties = properties.filter(property => {
                if (property.bookedDates) {
                    return !window.checkDatesOverlap(checkIn, checkOut, property.bookedDates);
                }
                return true;
            });
        }

        window.visibleProperties = properties;

        const searchMsg = document.querySelector("[data-search-message]");
        if (searchMsg) {
            searchMsg.textContent = `Showing ${properties.length} stay(s) matching criteria.`;
        }

        window.renderHomeProperties();
    } catch (e) {
        RoomBnbAPI.showToast("Failed to run search query.", "error");
    }
};
