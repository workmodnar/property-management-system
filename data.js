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
            description: "Premium apartment with automated check-in, bright interiors, and a skyline-ready living space in downtown.",
            price: 148,
            rating: 4.98,
            photoClass: "photo-1",
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            amenities: ["High-speed WiFi", "Air conditioning", "Dedicated workspace", "Kitchen essentials", "Fresh linens & towels", "Smart lock self check-in"],
            rules: ["No smoking inside", "Quiet hours after 10 PM", "No parties or events", "Max 4 guests"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: ["2026-06-25", "2026-06-26", "2026-06-27"],
            reviews: [
                { id: "rev-1", reviewerName: "John Doe", rating: 5, text: "Absolutely loved this place! Clean, beautiful views, and the check-in was seamless.", date: "2026-06-15", photo: "", reported: false },
                { id: "rev-2", reviewerName: "Emma Stone", rating: 4.9, text: "Great location and very cozy studio. Host was very communicative.", date: "2026-06-18", photo: "", reported: false }
            ]
        },
        {
            id: "property-2",
            name: "Harbor View Residence",
            type: "Villa",
            description: "A polished urban retreat for weekend trips, work stays, and relaxed waterfront evenings.",
            price: 196,
            rating: 4.92,
            photoClass: "photo-2",
            bedrooms: 3,
            bathrooms: 3,
            capacity: 6,
            amenities: ["High-speed WiFi", "Air conditioning", "Kitchen essentials", "Fresh linens & towels", "Pool", "Parking", "Waterfront View"],
            rules: ["No smoking inside", "Pets allowed with approval", "Quiet hours after 11 PM"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: ["2026-07-01", "2026-07-02"],
            reviews: [
                { id: "rev-3", reviewerName: "Marcus Aurelius", rating: 4.8, text: "Perfect waterfront escape. The pool is stunning.", date: "2026-06-10", photo: "", reported: false }
            ]
        },
        {
            id: "property-3",
            name: "Garden Studio Stay",
            type: "Studio",
            description: "A compact bright studio with simple check-in, cozy styling, and quiet garden energy.",
            price: 112,
            rating: 4.95,
            photoClass: "photo-3",
            bedrooms: 1,
            bathrooms: 1,
            capacity: 2,
            amenities: ["High-speed WiFi", "Kitchen essentials", "Fresh linens & towels", "Smart lock self check-in", "Private Garden"],
            rules: ["No smoking", "No pets", "Quiet garden hours"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: [],
            reviews: []
        },
        {
            id: "property-4",
            name: "Modern Downtown Loft",
            type: "Apartment",
            description: "Sleek loft in the heart of the city with high ceilings, floor-to-ceiling windows, and modern art.",
            price: 189,
            rating: 4.88,
            photoClass: "photo-4",
            bedrooms: 1,
            bathrooms: 1.5,
            capacity: 2,
            amenities: ["High-speed WiFi", "Air conditioning", "Dedicated workspace", "Kitchen essentials", "Smart lock self check-in", "Gym"],
            rules: ["No smoking", "No parties", "Max 2 guests"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: [],
            reviews: []
        },
        {
            id: "property-5",
            name: "Seaside Cottage Retreat",
            type: "Cottage",
            description: "Charming cottage steps from the beach with ocean views, a private patio, and peaceful coastal vibes.",
            price: 225,
            rating: 4.97,
            photoClass: "photo-5",
            bedrooms: 2,
            bathrooms: 1,
            capacity: 4,
            amenities: ["High-speed WiFi", "Kitchen essentials", "Fresh linens & towels", "Private Patio", "Beach access"],
            rules: ["Wash sand off before entering", "No smoking", "Max 4 guests"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: [],
            reviews: [
                { id: "rev-4", reviewerName: "Alice Wonderland", rating: 5.0, text: "Steps from the ocean! We had a wonderful family time.", date: "2026-06-12", photo: "", reported: false }
            ]
        },
        {
            id: "property-6",
            name: "Mountain Cabin Escape",
            type: "Cabin",
            description: "Rustic yet refined cabin surrounded by forest trails, a hot tub, and cozy fireplace evenings.",
            price: 178,
            rating: 4.91,
            photoClass: "photo-6",
            bedrooms: 2,
            bathrooms: 2,
            capacity: 5,
            amenities: ["High-speed WiFi", "Fireplace", "Hot tub", "Kitchen essentials", "Parking", "Forest Trails"],
            rules: ["Be careful with the fireplace", "Wild animals nearby - keep food inside", "No smoking"],
            hostId: "host-1",
            hostName: "Sarah Jenkins",
            bookedDates: [],
            reviews: []
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
    bookings: [],
    conversations: [],
    notifications: [],
    coupons: [
        { code: "WELCOME10", discountType: "percent", value: 10 },
        { code: "SUPERHOST", discountType: "percent", value: 20 },
        { code: "FLAT50", discountType: "flat", value: 50 }
    ]
};

const RoomBnbStore = {
    dataKey: "roombnb-homepage-data",
    sessionKey: "roombnb-session",
    usersKey: "roombnb-users",
    favoritesKey: "roombnb-favorites",
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
                    photoClass: property.photoClass || `photo-${index + 1}`,
                    bedrooms: property.bedrooms || 1,
                    bathrooms: property.bathrooms || 1,
                    capacity: property.capacity || 2,
                    amenities: property.amenities || ["High-speed WiFi", "Air conditioning", "Kitchen essentials"],
                    rules: property.rules || ["No smoking"],
                    hostId: property.hostId || "host-1",
                    hostName: property.hostName || "Sarah Jenkins",
                    bookedDates: property.bookedDates || [],
                    reviews: property.reviews || []
                }));

            return {
                ...this.clone(defaultData),
                ...parsedData,
                hero: { ...defaultData.hero, ...parsedData.hero },
                sections: { ...defaultData.sections, ...parsedData.sections },
                stats: parsedData.stats || defaultData.stats,
                properties: normalizeProperties(parsedData.properties || defaultData.properties),
                services: parsedData.services || defaultData.services,
                bookings: parsedData.bookings || [],
                conversations: parsedData.conversations || [],
                notifications: parsedData.notifications || [],
                coupons: parsedData.coupons || defaultData.coupons
            };
        } catch {
            return this.clone(defaultData);
        }
    },

    saveData(data) {
        localStorage.setItem(this.dataKey, JSON.stringify(data));
    },

    resetData() {
        localStorage.removeItem(this.dataKey);
        localStorage.removeItem(this.favoritesKey);
        localStorage.removeItem(this.usersKey);
    },

    loadUsers() {
        const savedUsers = localStorage.getItem(this.usersKey);
        let users = [];

        if (savedUsers) {
            try {
                users = JSON.parse(savedUsers);
            } catch {
                users = [];
            }
        }

        const seedUsers = [
            { id: "admin-1", name: "System Admin", email: "admin@roombnb.com", password: "password", role: "admin", address: "Main Headquarters", phone: "+1234567890", verified: true, profilePic: "" },
            { id: "host-1", name: "Sarah Jenkins", email: "host@roombnb.com", password: "password", role: "host", address: "123 Ocean Blvd, Malibu", phone: "+1987654321", verified: true, profilePic: "" },
            { id: "customer-1", name: "Alex Mercer", email: "customer@roombnb.com", password: "password", role: "customer", address: "456 Pine St, Seattle", phone: "+1555019922", verified: false, profilePic: "" }
        ];

        let updated = false;
        seedUsers.forEach(seed => {
            const exists = users.some(u => u.email.toLowerCase() === seed.email.toLowerCase());
            if (!exists) {
                users.push(seed);
                updated = true;
            }
        });

        if (updated || !savedUsers) {
            this.saveUsers(users);
        }

        return users;
    },

    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    },

    findUser(email, password) {
        const users = this.loadUsers();
        return users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password) || null;
    },

    addUser(name, email, password, address, role, phone = "") {
        const users = this.loadUsers();

        if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
            return false;
        }

        users.push({
            id: this.createId("user"),
            name,
            email,
            password,
            address,
            role,
            phone,
            verified: role === "admin" || role === "host", // hosts and admins seeded as verified, customers can verify ID later
            profilePic: ""
        });
        this.saveUsers(users);
        return true;
    },

    updateUser(userId, updatedFields) {
        const users = this.loadUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index >= 0) {
            users[index] = { ...users[index], ...updatedFields };
            this.saveUsers(users);
            
            // Sync session if active session is this user
            const session = this.loadSession();
            if (session && session.id === userId) {
                this.saveSession({
                    ...session,
                    name: users[index].name,
                    role: users[index].role
                });
            }
            return true;
        }
        return false;
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

    loadFavorites() {
        const saved = localStorage.getItem(this.favoritesKey);
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    },

    saveFavorites(favorites) {
        localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
    },

    addFavorite(id) {
        const favorites = this.loadFavorites();
        if (!favorites.includes(id)) {
            favorites.push(id);
            this.saveFavorites(favorites);
            return true;
        }
        return false;
    },

    removeFavorite(id) {
        let favorites = this.loadFavorites();
        favorites = favorites.filter(favId => favId !== id);
        this.saveFavorites(favorites);
    },

    createId(prefix) {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Chat Helpers
    getOrCreateConversation(customerId, hostId, propertyName) {
        const data = this.loadData();
        let convo = data.conversations.find(c => c.customerId === customerId && c.hostId === hostId);
        if (!convo) {
            convo = {
                id: this.createId("convo"),
                customerId,
                hostId,
                propertyName,
                messages: []
            };
            data.conversations.push(convo);
            this.saveData(data);
        }
        return convo;
    },

    sendChatMessage(convoId, senderId, content, image = "") {
        const data = this.loadData();
        const convo = data.conversations.find(c => c.id === convoId);
        if (convo) {
            const newMsg = {
                senderId,
                content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                image,
                read: false
            };
            convo.messages.push(newMsg);
            this.saveData(data);
            
            // Add notification to receiver
            const receiverId = (senderId === convo.customerId) ? convo.hostId : convo.customerId;
            this.addNotification(receiverId, "message", "New Message Received", `You have a new message regarding ${convo.propertyName}.`);
            return true;
        }
        return false;
    },

    // Notification Helpers
    addNotification(userId, type, title, message) {
        const data = this.loadData();
        data.notifications.push({
            id: this.createId("notif"),
            userId,
            type,
            title,
            message,
            date: new Date().toLocaleString(),
            read: false
        });
        this.saveData(data);
    },

    markNotificationsRead(userId) {
        const data = this.loadData();
        data.notifications.forEach(n => {
            if (n.userId === userId) n.read = true;
        });
        this.saveData(data);
    }
};
