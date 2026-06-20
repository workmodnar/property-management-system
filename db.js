const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promise helpers
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Initialize Tables
async function initDb() {
    console.log("RoomBnB: Initializing SQLite database schema...");

    // Create Tables
    await run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        address TEXT,
        role TEXT NOT NULL,
        phone TEXT,
        verified INTEGER DEFAULT 0,
        profilePic TEXT DEFAULT "",
        bankAccount TEXT DEFAULT "",
        status TEXT DEFAULT "Active"
    )`);

    await run(`CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        rating REAL DEFAULT 5.0,
        photoClass TEXT NOT NULL,
        bedrooms INTEGER DEFAULT 1,
        bathrooms INTEGER DEFAULT 1,
        capacity INTEGER DEFAULT 2,
        amenities TEXT, -- JSON Array string
        rules TEXT,     -- JSON Array string
        hostId TEXT NOT NULL,
        address TEXT DEFAULT "",
        city TEXT DEFAULT "",
        state TEXT DEFAULT "",
        country TEXT DEFAULT "",
        latitude REAL DEFAULT 0.0,
        longitude REAL DEFAULT 0.0,
        cleaningFee REAL DEFAULT 0.0,
        seasonalPricing TEXT DEFAULT "{}", -- JSON string mapping seasonal/weekend rates
        images TEXT DEFAULT "[]", -- JSON array of image URLs
        featured INTEGER DEFAULT 0,
        status TEXT DEFAULT "Approved"
    )`);

    await run(`CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        hostId TEXT NOT NULL,
        checkIn TEXT NOT NULL,
        checkOut TEXT NOT NULL,
        guestsCount INTEGER NOT NULL,
        nights INTEGER NOT NULL,
        basePrice REAL NOT NULL,
        tax REAL NOT NULL,
        serviceFee REAL NOT NULL,
        discountApplied REAL NOT NULL,
        totalPrice REAL NOT NULL,
        couponCode TEXT,
        paymentMethod TEXT,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        refunded INTEGER DEFAULT 0,
        commission REAL DEFAULT 10.0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        hostId TEXT NOT NULL,
        propertyName TEXT NOT NULL
    )`);

    await run(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        convoId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT,
        timestamp TEXT NOT NULL,
        image TEXT DEFAULT "",
        read INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        read INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS favorites (
        userId TEXT NOT NULL,
        propertyId TEXT NOT NULL,
        PRIMARY KEY (userId, propertyId)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        discountType TEXT NOT NULL,
        value REAL NOT NULL,
        active INTEGER DEFAULT 1,
        description TEXT DEFAULT ""
    )`);

    await run(`CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        reviewerName TEXT NOT NULL,
        rating REAL NOT NULL,
        text TEXT,
        date TEXT NOT NULL,
        photo TEXT DEFAULT "",
        reported INTEGER DEFAULT 0,
        replyText TEXT DEFAULT ""
    )`);

    // Support complaints tickets
    await run(`CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userRole TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT "Open",
        createdAt TEXT NOT NULL
    )`);

    await run(`CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticketId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )`);

    // Payout transactions and ledger log
    await run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        bookingId TEXT DEFAULT "",
        userId TEXT NOT NULL,
        type TEXT NOT NULL, -- 'Payment' or 'Withdrawal'
        amount REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        status TEXT DEFAULT "Completed",
        createdAt TEXT NOT NULL
    )`);

    await run(`CREATE TABLE IF NOT EXISTS configs (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Seed Data
    await seedData();
}

async function seedData() {
    // 1. Seed Users
    const usersCount = await get(`SELECT COUNT(*) as count FROM users`);
    if (usersCount.count === 0) {
        console.log("RoomBnB: Seeding users...");
        await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["admin-1", "System Admin", "admin@roombnb.com", "password", "Main Headquarters", "admin", "+1234567890", 1, "", "", "Active"]);
        await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["host-1", "Sarah Jenkins", "host@roombnb.com", "password", "123 Ocean Blvd, Malibu", "host", "+1987654321", 1, "", "US1234567890", "Active"]);
        await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["customer-1", "Alex Mercer", "customer@roombnb.com", "password", "456 Pine St, Seattle", "customer", "+1555019922", 0, "", "", "Active"]);
    }

    // 2. Seed Coupons
    const couponsCount = await get(`SELECT COUNT(*) as count FROM coupons`);
    if (couponsCount.count === 0) {
        console.log("RoomBnB: Seeding coupons...");
        await run(`INSERT INTO coupons VALUES (?, ?, ?, ?, ?)`, ["WELCOME10", "percent", 10, 1, "10% Welcome Discount"]);
        await run(`INSERT INTO coupons VALUES (?, ?, ?, ?, ?)`, ["SUPERHOST", "percent", 20, 1, "20% Host Discount"]);
        await run(`INSERT INTO coupons VALUES (?, ?, ?, ?, ?)`, ["FLAT50", "flat", 50, 1, "Flat $50 Discount"]);
    }

    // 3. Seed Properties
    const propertiesCount = await get(`SELECT COUNT(*) as count FROM properties`);
    if (propertiesCount.count === 0) {
        console.log("RoomBnB: Seeding properties...");
        const defaultProperties = [
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
                address: "405 Park Ave",
                city: "New York",
                state: "NY",
                country: "United States",
                latitude: 40.7128,
                longitude: -74.0060,
                cleaningFee: 25,
                seasonalPricing: { weekend: 165, holiday: 185 },
                images: [
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
                ],
                featured: 1,
                status: "Approved"
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
                address: "24 Harbor Rd",
                city: "Miami",
                state: "FL",
                country: "United States",
                latitude: 25.7617,
                longitude: -80.1918,
                cleaningFee: 40,
                seasonalPricing: { weekend: 220, holiday: 250 },
                images: [
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80"
                ],
                featured: 0,
                status: "Approved"
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
                address: "88 Garden Lane",
                city: "Seattle",
                state: "WA",
                country: "United States",
                latitude: 47.6062,
                longitude: -122.3321,
                cleaningFee: 15,
                seasonalPricing: { weekend: 125, holiday: 140 },
                images: [
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"
                ],
                featured: 1,
                status: "Approved"
            }
        ];

        for (const p of defaultProperties) {
            await run(`INSERT INTO properties VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                p.id, p.name, p.type, p.description, p.price, p.rating, p.photoClass,
                p.bedrooms, p.bathrooms, p.capacity,
                JSON.stringify(p.amenities), JSON.stringify(p.rules), p.hostId,
                p.address, p.city, p.state, p.country, p.latitude, p.longitude, p.cleaningFee,
                JSON.stringify(p.seasonalPricing), JSON.stringify(p.images), p.featured, p.status
            ]);
        }
    }

    // 4. Seed Reviews
    const reviewsCount = await get(`SELECT COUNT(*) as count FROM reviews`);
    if (reviewsCount.count === 0) {
        console.log("RoomBnB: Seeding reviews...");
        await run(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["rev-1", "property-1", "John Doe", 5.0, "Absolutely loved this place! Clean, beautiful views, and the check-in was seamless.", "2026-06-15", "", 0, "Thanks for staying! Welcome back anytime."]);
        await run(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["rev-2", "property-1", "Emma Stone", 4.9, "Great location and very cozy studio. Host was very communicative.", "2026-06-18", "", 0, ""]);
        await run(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            ["rev-3", "property-2", "Marcus Aurelius", 4.8, "Perfect waterfront escape. The pool is stunning.", "2026-06-10", "", 0, ""]);
    }

    // 5. Seed configurations
    const configsCount = await get(`SELECT COUNT(*) as count FROM configs`);
    if (configsCount.count === 0) {
        console.log("RoomBnB: Seeding site configurations...");
        const defaultHero = {
            eyebrow: "Book stays that feel like home",
            title: "Find your next perfect stay.",
            description: "RoomBnB helps travelers browse comfortable homes, compare guest-ready stays, and request bookings with a smooth Airbnb-style experience."
        };
        const defaultSections = {
            propertiesHeading: "Featured stays",
            propertiesDescription: "Browse curated homes with transparent pricing, reliable hosts, and guest-ready service from check-in to checkout.",
            ownerTitle: "Have a place guests would love?",
            ownerDescription: "RoomBnB also helps hosts list, manage, and improve their properties, while keeping the guest booking experience simple and trustworthy.",
            footerText: "RoomBnB. Built for travelers, hosts, and memorable stays."
        };
        const defaultStats = [
            { id: "stat-1", value: "2.4k", label: "guest bookings" },
            { id: "stat-2", value: "98%", label: "guest satisfaction" },
            { id: "stat-3", value: "24/7", label: "owner support" },
            { id: "stat-4", value: "120+", label: "guest-ready stays" }
        ];
        const defaultServices = [
            { id: "service-1", title: "Easy stay discovery", description: "Search by location and property type, compare prices, and find stays that match your trip." },
            { id: "service-2", title: "Simple booking requests", description: "Customers can request a stay from the dashboard and track the booking status after admin review." },
            { id: "service-3", title: "Trusted host support", description: "Hosts still get tools for listings and operations, so guests see cleaner, more reliable stays." }
        ];

        // CMS Content Seeds
        const cmsContent = {
            aboutUs: "RoomBnB is a peer-to-peer property rental platform designed to give travelers the ultimate home-away-from-home experience. Established in 2026, we bridges guest requests and host listings seamlessly.",
            contactUs: "Have questions? Reach us at support@roombnb.com or raise a ticket inside your workspace drawer. Phone: +1 555-ROOM-BNB.",
            terms: "By booking on RoomBnB, you agree to respect local house rules, quiet hours, and cancellation timelines set by hosts. All transactions are securely audited.",
            privacy: "RoomBnB is committed to keeping traveler identity documentation secure. We encrypt database storage logs and never share personal information with third parties."
        };

        await run(`INSERT INTO configs VALUES (?, ?)`, ["siteName", JSON.stringify("RoomBnB")]);
        await run(`INSERT INTO configs VALUES (?, ?)`, ["hero", JSON.stringify(defaultHero)]);
        await run(`INSERT INTO configs VALUES (?, ?)`, ["sections", JSON.stringify(defaultSections)]);
        await run(`INSERT INTO configs VALUES (?, ?)`, ["stats", JSON.stringify(defaultStats)]);
        await run(`INSERT INTO configs VALUES (?, ?)`, ["services", JSON.stringify(defaultServices)]);
        await run(`INSERT INTO configs VALUES (?, ?)`, ["cms", JSON.stringify(cmsContent)]);
    }
}

module.exports = {
    db,
    query,
    run,
    get,
    initDb
};
