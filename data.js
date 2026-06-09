const defaultData = {
    siteName: "RoomBnB",
    hero: {
        eyebrow: "Book stays that feel like home",
        title: "Find your next perfect stay.",
        description: "RoomBnB helps travelers browse comfortable homes, compare guest-ready stays, and request bookings with a smooth Airbnb-style experience."
    },
    sections: {
        propertiesHeading: "Featured stays",
        propertiesDescription: "Browse curated homes with transparent pricing, reliable hosts, and guest-ready service from check-in to checkout.",
        ownerTitle: "Have a place guests would love?",
        ownerDescription: "RoomBnB also helps hosts list, manage, and improve their properties, while keeping the guest booking experience simple and trustworthy.",
        footerText: "RoomBnB. Built for travelers, hosts, and memorable stays."
    },
    stats: [
        { id: "stat-1", value: "2.4k", label: "guest bookings" },
        { id: "stat-2", value: "98%", label: "guest satisfaction" },
        { id: "stat-3", value: "24/7", label: "owner support" },
        { id: "stat-4", value: "120+", label: "guest-ready stays" }
    ],
    properties: [
        {
            id: "property-1",
            name: "Skyline Comfort Suite",
            type: "Apartment",
            description: "Premium apartment with automated check-in, bright interiors, and a skyline-ready living space.",
            price: 148,
            rating: 4.98,
            photoClass: "photo-1"
        },
        {
            id: "property-2",
            name: "Harbor View Residence",
            type: "Villa",
            description: "A polished urban retreat for weekend trips, work stays, and relaxed waterfront evenings.",
            price: 196,
            rating: 4.92,
            photoClass: "photo-2"
        },
        {
            id: "property-3",
            name: "Garden Studio Stay",
            type: "Studio",
            description: "A compact bright studio with simple check-in, cozy styling, and quiet garden energy.",
            price: 112,
            rating: 4.95,
            photoClass: "photo-3"
        },
        {
            id: "property-4",
            name: "Modern Downtown Loft",
            type: "Apartment",
            description: "Sleek loft in the heart of the city with high ceilings, floor-to-ceiling windows, and modern art.",
            price: 189,
            rating: 4.88,
            photoClass: "photo-4"
        },
        {
            id: "property-5",
            name: "Seaside Cottage Retreat",
            type: "Cottage",
            description: "Charming cottage steps from the beach with ocean views, a private patio, and peaceful coastal vibes.",
            price: 225,
            rating: 4.97,
            photoClass: "photo-5"
        },
        {
            id: "property-6",
            name: "Mountain Cabin Escape",
            type: "Cabin",
            description: "Rustic yet refined cabin surrounded by forest trails, a hot tub, and cozy fireplace evenings.",
            price: 178,
            rating: 4.91,
            photoClass: "photo-6"
        }
    ],
    services: [
        {
            id: "service-1",
            title: "Easy stay discovery",
            description: "Search by location and property type, compare prices, and find stays that match your trip."
        },
        {
            id: "service-2",
            title: "Simple booking requests",
            description: "Customers can request a stay from the dashboard and track the booking status after admin review."
        },
        {
            id: "service-3",
            title: "Trusted host support",
            description: "Hosts still get tools for listings and operations, so guests see cleaner, more reliable stays."
        }
    ],
    bookings: []
};

const RoomBnbStore = {
    dataKey: "roombnb-homepage-data",
    sessionKey: "roombnb-session",
    usersKey: "roombnb-users",
    adminCode: "admin123",

    clone(value) {
        return JSON.parse(JSON.stringify(value));
    },

    loadData() {
        const savedData = localStorage.getItem(this.dataKey);

        if (!savedData) {
            return this.clone(defaultData);
        }

        try {
            const parsedData = JSON.parse(savedData);

            const normalizeProperties = (properties) =>
                properties.map((property, index) => ({
                    ...property,
                    photoClass: property.photoClass || `photo-${index + 1}`
                }));

            return {
                ...this.clone(defaultData),
                ...parsedData,
                hero: { ...defaultData.hero, ...parsedData.hero },
                sections: { ...defaultData.sections, ...parsedData.sections },
                stats: parsedData.stats || defaultData.stats,
                properties: normalizeProperties(parsedData.properties || defaultData.properties),
                services: parsedData.services || defaultData.services,
                bookings: parsedData.bookings || []
            };
        } catch {
            return this.clone(defaultData);
        }
    },

    saveData(data) {
        localStorage.setItem(this.dataKey, JSON.stringify(data));
    },

    loadUsers() {
        const savedUsers = localStorage.getItem(this.usersKey);

        if (!savedUsers) {
            return [];
        }

        try {
            return JSON.parse(savedUsers);
        } catch {
            return [];
        }
    },

    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    },

    findUser(email, password) {
        const users = this.loadUsers();

        return users.find((user) => user.email === email && user.password === password) || null;
    },

    addUser(name, email, password, address, role) {
        const users = this.loadUsers();

        if (users.some((user) => user.email === email)) {
            return false;
        }

        users.push({ id: this.createId("user"), name, email, password, address, role });
        this.saveUsers(users);
        return true;
    },

    loadSession() {
        const savedSession = localStorage.getItem(this.sessionKey);

        if (!savedSession) {
            return null;
        }

        try {
            return JSON.parse(savedSession);
        } catch {
            return null;
        }
    },

    saveSession(session) {
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    },

    clearSession() {
        localStorage.removeItem(this.sessionKey);
    },

    createId(prefix) {
        return `${prefix}-${Date.now()}`;
    },

    escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },

    requireRole(role) {
        const session = this.loadSession();

        if (!session || session.role !== role) {
            window.location.href = "login.html";
            throw new Error("Redirecting to login.");
        }

        return session;
    },

    renderBrand(data) {
        document.querySelectorAll("[data-site-name]").forEach((element) => {
            element.textContent = data.siteName;
        });
        document.querySelectorAll(".brand-mark").forEach((element) => {
            element.textContent = data.siteName.charAt(0).toUpperCase();
        });
    },

    renderSession(session) {
        const label = document.querySelector("[data-session-label]");

        if (label && session) {
            label.textContent = `${session.name} - ${session.role}`;
        }
    },

    logout() {
        this.clearSession();
        window.location.href = "login.html";
    },

    showToast(message, type = "success") {
        let container = document.querySelector(".toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
