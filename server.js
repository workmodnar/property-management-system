const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDb, query, run, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Helper to generate IDs
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const user = await get(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?`, [email, password]);
        if (!user || user.role !== role) {
            return res.status(401).json({ error: "Invalid email or password for selected role." });
        }
        if (user.status === "Suspended") {
            return res.status(403).json({ error: "Your account is suspended. Contact support." });
        }
        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            email: user.email,
            verified: !!user.verified,
            profilePic: user.profilePic,
            status: user.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, address, role, phone } = req.body;
    try {
        const existing = await get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [email]);
        if (existing) {
            return res.status(400).json({ error: "Email is already registered." });
        }
        const id = createId('user');
        const verified = (role === 'admin' || role === 'host') ? 1 : 0;
        await run(`INSERT INTO users (id, name, email, password, address, role, phone, verified, profilePic, bankAccount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, email, password, address, role, phone || "", verified, "", "", "Active"]);
        res.status(201).json({ success: true, userId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/forgot', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [email]);
        if (!user) {
            return res.status(404).json({ error: "No account found with this email." });
        }
        res.json({ message: "Mock password reset email sent. Use mock code '123456' on login screens." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/2fa', async (req, res) => {
    const { email, code } = req.body;
    try {
        if (code !== '123456') {
            return res.status(400).json({ error: "Invalid 2FA code. Use mock code 123456." });
        }
        const user = await get(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email]);
        if (!user) {
            return res.status(404).json({ error: "No account found with this email." });
        }
        if (user.status === "Suspended") {
            return res.status(403).json({ error: "Your account is suspended. Contact support." });
        }
        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            email: user.email,
            verified: !!user.verified,
            profilePic: user.profilePic,
            status: user.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// USERS ENDPOINTS
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
    try {
        const users = await query(`SELECT id, name, email, address, role, phone, verified, profilePic, status FROM users`);
        res.json(users.map(u => ({ ...u, verified: !!u.verified })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await get(`SELECT id, name, email, address, role, phone, verified, profilePic, bankAccount, status FROM users WHERE id = ?`, [req.params.id]);
        if (!user) return res.status(404).json({ error: "User not found." });
        user.verified = !!user.verified;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { name, phone, address, verified, profilePic, password, bankAccount, status } = req.body;
    try {
        const user = await get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
        if (!user) return res.status(404).json({ error: "User not found." });

        const updatedName = name !== undefined ? name : user.name;
        const updatedPhone = phone !== undefined ? phone : user.phone;
        const updatedAddress = address !== undefined ? address : user.address;
        const updatedVerified = verified !== undefined ? (verified ? 1 : 0) : user.verified;
        const updatedProfilePic = profilePic !== undefined ? profilePic : user.profilePic;
        const updatedPassword = password !== undefined ? password : user.password;
        const updatedBank = bankAccount !== undefined ? bankAccount : user.bankAccount;
        const updatedStatus = status !== undefined ? status : user.status;

        await run(`UPDATE users SET name = ?, phone = ?, address = ?, verified = ?, profilePic = ?, password = ?, bankAccount = ?, status = ? WHERE id = ?`,
            [updatedName, updatedPhone, updatedAddress, updatedVerified, updatedProfilePic, updatedPassword, updatedBank, updatedStatus, req.params.id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
        await run(`DELETE FROM properties WHERE hostId = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// PROPERTIES ENDPOINTS
// ----------------------------------------------------
app.get('/api/properties', async (req, res) => {
    try {
        const { search, type, minPrice, maxPrice, minRating, capacity, amenities, checkAdmin } = req.query;
        let sql = `SELECT p.*, u.name as hostName FROM properties p JOIN users u ON p.hostId = u.id WHERE 1=1`;
        let params = [];

        // Exclude unapproved properties for general customers
        if (!checkAdmin) {
            sql += ` AND p.status = 'Approved'`;
        }

        if (search) {
            sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.type) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.city) LIKE ? OR LOWER(p.country) LIKE ?)`;
            const searchParam = `%${search.toLowerCase()}%`;
            params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
        }
        if (type && type !== 'all') {
            sql += ` AND LOWER(p.type) = LOWER(?)`;
            params.push(type);
        }
        if (minPrice) {
            sql += ` AND p.price >= ?`;
            params.push(Number(minPrice));
        }
        if (maxPrice) {
            sql += ` AND p.price <= ?`;
            params.push(Number(maxPrice));
        }
        if (minRating) {
            sql += ` AND p.rating >= ?`;
            params.push(Number(minRating));
        }
        if (capacity) {
            sql += ` AND p.capacity >= ?`;
            params.push(Number(capacity));
        }

        let properties = await query(sql, params);

        // Fetch reviews and bookedDates for each property
        for (let prop of properties) {
            prop.amenities = JSON.parse(prop.amenities || '[]');
            prop.rules = JSON.parse(prop.rules || '[]');
            prop.images = JSON.parse(prop.images || '[]');
            prop.seasonalPricing = JSON.parse(prop.seasonalPricing || '{}');
            prop.featured = !!prop.featured;
            
            // Get reviews
            const reviews = await query(`SELECT * FROM reviews WHERE propertyId = ?`, [prop.id]);
            prop.reviews = reviews.map(r => ({ ...r, reported: !!r.reported }));

            // Get bookedDates from paid/approved bookings
            const bookings = await query(`SELECT checkIn, checkOut FROM bookings WHERE propertyId = ? AND status IN ('Approved', 'Paid', 'Completed')`, [prop.id]);
            const bookedDates = [];
            bookings.forEach(b => {
                const start = Number(b.checkIn.split("-")[2]);
                const end = Number(b.checkOut.split("-")[2]);
                for (let d = start; d < end; d++) {
                    bookedDates.push(`2026-07-${d < 10 ? '0' + d : d}`);
                }
            });
            prop.bookedDates = bookedDates;
        }

        // Filter by amenities on backend side
        if (amenities) {
            const filterAmenities = Array.isArray(amenities) ? amenities : [amenities];
            properties = properties.filter(p => 
                filterAmenities.every(a => p.amenities.includes(a))
            );
        }

        res.json(properties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/properties', async (req, res) => {
    const { name, type, price, capacity, bedrooms, bathrooms, description, rules, amenities, hostId, address, city, state, country, latitude, longitude, cleaningFee, seasonalPricing, images } = req.body;
    try {
        const id = createId('property');
        const photoIndex = Math.floor(Math.random() * 6) + 1;
        const defaultImages = images && images.length ? images : [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
        ];
        
        await run(`INSERT INTO properties (id, name, type, price, capacity, bedrooms, bathrooms, description, rules, amenities, hostId, photoClass, rating, address, city, state, country, latitude, longitude, cleaningFee, seasonalPricing, images, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, name, type, Number(price), Number(capacity), Number(bedrooms), Number(bathrooms), description,
            JSON.stringify(Array.isArray(rules) ? rules : []),
            JSON.stringify(Array.isArray(amenities) ? amenities : []),
            hostId, `photo-${photoIndex}`, 5.0,
            address || "", city || "", state || "", country || "",
            Number(latitude || 0.0), Number(longitude || 0.0), Number(cleaningFee || 0.0),
            JSON.stringify(seasonalPricing || {}), JSON.stringify(defaultImages), 0, "Approved"
        ]);
        res.status(201).json({ success: true, propertyId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/properties/:id', async (req, res) => {
    const { name, type, price, capacity, bedrooms, bathrooms, description, rules, amenities, address, city, state, country, latitude, longitude, cleaningFee, seasonalPricing, images, featured, status } = req.body;
    try {
        const existing = await get(`SELECT * FROM properties WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ error: "Listing not found." });

        const updatedName = name !== undefined ? name : existing.name;
        const updatedType = type !== undefined ? type : existing.type;
        const updatedPrice = price !== undefined ? Number(price) : existing.price;
        const updatedCapacity = capacity !== undefined ? Number(capacity) : existing.capacity;
        const updatedBedrooms = bedrooms !== undefined ? Number(bedrooms) : existing.bedrooms;
        const updatedBathrooms = bathrooms !== undefined ? Number(bathrooms) : existing.bathrooms;
        const updatedDesc = description !== undefined ? description : existing.description;
        const updatedRules = rules !== undefined ? JSON.stringify(rules) : existing.rules;
        const updatedAmenities = amenities !== undefined ? JSON.stringify(amenities) : existing.amenities;

        const updatedAddress = address !== undefined ? address : existing.address;
        const updatedCity = city !== undefined ? city : existing.city;
        const updatedState = state !== undefined ? state : existing.state;
        const updatedCountry = country !== undefined ? country : existing.country;
        const updatedLat = latitude !== undefined ? Number(latitude) : existing.latitude;
        const updatedLng = longitude !== undefined ? Number(longitude) : existing.longitude;
        const updatedCleaning = cleaningFee !== undefined ? Number(cleaningFee) : existing.cleaningFee;
        const updatedSeasonal = seasonalPricing !== undefined ? JSON.stringify(seasonalPricing) : existing.seasonalPricing;
        const updatedImages = images !== undefined ? JSON.stringify(images) : existing.images;
        const updatedFeatured = featured !== undefined ? (featured ? 1 : 0) : existing.featured;
        const updatedStatus = status !== undefined ? status : existing.status;

        await run(`UPDATE properties SET name = ?, type = ?, price = ?, capacity = ?, bedrooms = ?, bathrooms = ?, description = ?, rules = ?, amenities = ?, address = ?, city = ?, state = ?, country = ?, latitude = ?, longitude = ?, cleaningFee = ?, seasonalPricing = ?, images = ?, featured = ?, status = ? WHERE id = ?`, [
            updatedName, updatedType, updatedPrice, updatedCapacity, updatedBedrooms, updatedBathrooms, updatedDesc, updatedRules, updatedAmenities,
            updatedAddress, updatedCity, updatedState, updatedCountry, updatedLat, updatedLng, updatedCleaning, updatedSeasonal, updatedImages, updatedFeatured, updatedStatus, req.params.id
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/properties/:id', async (req, res) => {
    try {
        await run(`DELETE FROM properties WHERE id = ?`, [req.params.id]);
        await run(`DELETE FROM reviews WHERE propertyId = ?`, [req.params.id]);
        await run(`DELETE FROM bookings WHERE propertyId = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// BOOKINGS ENDPOINTS
// ----------------------------------------------------
app.get('/api/bookings', async (req, res) => {
    const { role, userId } = req.query;
    try {
        let sql = `SELECT b.*, p.name as propertyName, p.photoClass FROM bookings b JOIN properties p ON b.propertyId = p.id WHERE 1=1`;
        let params = [];
        if (role === 'customer') {
            sql += ` AND b.customerId = ?`;
            params.push(userId);
        } else if (role === 'host') {
            sql += ` AND b.hostId = ?`;
            params.push(userId);
        }
        const bookings = await query(sql, params);
        res.json(bookings.map(b => ({ ...b, refunded: !!b.refunded })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { propertyId, customerId, customerName, hostId, checkIn, checkOut, guestsCount, nights, basePrice, tax, serviceFee, discountApplied, totalPrice, couponCode, paymentMethod } = req.body;
    if (Number(nights) > 4) {
        return res.status(400).json({ error: "Booking stays are limited to a maximum of 4 days." });
    }
    try {
        const id = createId('booking');
        const status = 'Pending';
        const createdAt = new Date().toLocaleString();
        const commRateRow = await get(`SELECT value FROM configs WHERE key = 'commissionRate'`);
        const commRate = commRateRow ? Number(commRateRow.value) : 10.0;
        const commission = Math.round(basePrice * (commRate / 100));

        await run(`INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, propertyId, customerId, customerName, hostId, checkIn, checkOut, Number(guestsCount), Number(nights),
            Number(basePrice), Number(tax), Number(serviceFee), Number(discountApplied), Number(totalPrice),
            couponCode || "", paymentMethod || "", status, createdAt, 0, commission
        ]);

        // Write ledger entry transaction
        await run(`INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            createId('tx'), id, customerId, 'Payment', Number(totalPrice), paymentMethod || "CARD", 'Completed', createdAt
        ]);

        // Add host notification
        const prop = await get(`SELECT name FROM properties WHERE id = ?`, [propertyId]);
        const propName = prop ? prop.name : "Property";
        await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            createId('notif'), hostId, 'booking', 'New Booking Request',
            `${customerName} requested a reservation at ${propName} from ${checkIn} to ${checkOut}.`,
            createdAt, 0
        ]);

        res.status(201).json({ success: true, bookingId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const booking = await get(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
        if (!booking) return res.status(404).json({ error: "Booking not found." });

        await run(`UPDATE bookings SET status = ? WHERE id = ?`, [status, req.params.id]);

        const prop = await get(`SELECT name FROM properties WHERE id = ?`, [booking.propertyId]);
        const propName = prop ? prop.name : "Property";
        const date = new Date().toLocaleString();

        // Send notifications based on status changes
        if (status === 'Approved') {
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.customerId, 'booking', 'Booking Approved',
                `Your reservation at ${propName} has been approved by the host. Please complete your payment.`, date, 0
            ]);
        } else if (status === 'Paid') {
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.hostId, 'payment', 'Payment Received',
                `${booking.customerName} has paid for their upcoming stay at ${propName}.`, date, 0
            ]);
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.customerId, 'payment', 'Booking Confirmed!',
                `Payment received! Your stay at ${propName} is fully booked and confirmed.`, date, 0
            ]);
        } else if (status === 'Rejected') {
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.customerId, 'booking', 'Booking Declined',
                `We're sorry, your booking request at ${propName} was declined by the host.`, date, 0
            ]);
        } else if (status === 'Cancelled') {
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.customerId, 'booking', 'Booking Cancelled', `Stay reservation at ${propName} has been cancelled.`, date, 0
            ]);
            await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                createId('notif'), booking.hostId, 'booking', 'Booking Cancelled by Guest', `${booking.customerName} cancelled their trip dates at ${propName}.`, date, 0
            ]);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings/:id/refund', async (req, res) => {
    try {
        const booking = await get(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
        if (!booking) return res.status(404).json({ error: "Booking not found." });

        await run(`UPDATE bookings SET status = 'Refunded', refunded = 1 WHERE id = ?`, [req.params.id]);
        
        // Write transaction refund log
        await run(`INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            createId('tx'), req.params.id, booking.customerId, 'Refund', Number(booking.totalPrice), booking.paymentMethod || "CARD", 'Completed', new Date().toLocaleString()
        ]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// CHATS ENDPOINTS
// ----------------------------------------------------
app.get('/api/chats', async (req, res) => {
    const { role, userId } = req.query;
    try {
        let sql = `SELECT * FROM conversations WHERE customerId = ? OR hostId = ?`;
        const convos = await query(sql, [userId, userId]);

        for (let convo of convos) {
            const lastMsg = await get(`SELECT * FROM messages WHERE convoId = ? ORDER BY id DESC LIMIT 1`, [convo.id]);
            convo.lastMessage = lastMsg ? lastMsg.content : "No messages yet";
            convo.lastTimestamp = lastMsg ? lastMsg.timestamp : "";

            const unread = await get(`SELECT COUNT(*) as count FROM messages WHERE convoId = ? AND senderId != ? AND read = 0`, [convo.id, userId]);
            convo.unreadCount = unread ? unread.count : 0;
            
            const otherPartyId = (userId === convo.customerId) ? convo.hostId : convo.customerId;
            const otherUser = await get(`SELECT name FROM users WHERE id = ?`, [otherPartyId]);
            convo.otherPartyName = otherUser ? otherUser.name : "User";
        }
        res.json(convos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/chats/:id/messages', async (req, res) => {
    const { readerId } = req.query;
    try {
        const messages = await query(`SELECT * FROM messages WHERE convoId = ? ORDER BY id ASC`, [req.params.id]);
        if (readerId) {
            await run(`UPDATE messages SET read = 1 WHERE convoId = ? AND senderId != ?`, [req.params.id, readerId]);
        }
        res.json(messages.map(m => ({ ...m, read: !!m.read })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/message', async (req, res) => {
    const { convoId, senderId, content, image } = req.body;
    try {
        const convo = await get(`SELECT * FROM conversations WHERE id = ?`, [convoId]);
        if (!convo) return res.status(404).json({ error: "Conversation not found." });

        const id = createId('msg');
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await run(`INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            id, convoId, senderId, content, timestamp, image || "", 0
        ]);

        const receiverId = (senderId === convo.customerId) ? convo.hostId : convo.customerId;
        await run(`INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            createId('notif'), receiverId, 'message', 'New Message',
            `You received a new message regarding ${convo.propertyName}.`,
            new Date().toLocaleString(), 0
        ]);

        res.status(201).json({ success: true, messageId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/initiate', async (req, res) => {
    const { customerId, hostId, propertyName } = req.body;
    try {
        let convo = await get(`SELECT * FROM conversations WHERE customerId = ? AND hostId = ?`, [customerId, hostId]);
        if (!convo) {
            const id = createId('convo');
            await run(`INSERT INTO conversations VALUES (?, ?, ?, ?)`, [id, customerId, hostId, propertyName]);
            convo = { id, customerId, hostId, propertyName };
        }
        res.json(convo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// FAVORITES ENDPOINTS
// ----------------------------------------------------
app.get('/api/favorites/:userId', async (req, res) => {
    try {
        const favs = await query(`SELECT propertyId FROM favorites WHERE userId = ?`, [req.params.userId]);
        res.json(favs.map(f => f.propertyId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/favorites', async (req, res) => {
    const { userId, propertyId } = req.body;
    try {
        await run(`INSERT OR IGNORE INTO favorites VALUES (?, ?)`, [userId, propertyId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/favorites', async (req, res) => {
    const { userId, propertyId } = req.body;
    try {
        await run(`DELETE FROM favorites WHERE userId = ? AND propertyId = ?`, [userId, propertyId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// REVIEWS ENDPOINTS
// ----------------------------------------------------
app.post('/api/reviews', async (req, res) => {
    const { propertyId, reviewerName, rating, text, photo, bookingId } = req.body;
    try {
        const id = createId('rev');
        const date = new Date().toISOString().split('T')[0];
        
        if (bookingId) {
            await run(`DELETE FROM reviews WHERE propertyId = ? AND reviewerName = ?`, [propertyId, reviewerName]);
        }

        await run(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, propertyId, reviewerName, Number(rating), text, date, photo || "", 0, ""
        ]);

        const reviews = await query(`SELECT rating FROM reviews WHERE propertyId = ?`, [propertyId]);
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await run(`UPDATE properties SET rating = ? WHERE id = ?`, [Number(avg.toFixed(2)), propertyId]);

        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/user/:reviewerName', async (req, res) => {
    try {
        const sql = `SELECT r.*, p.name as propertyName, p.images as propertyImages 
                     FROM reviews r 
                     JOIN properties p ON r.propertyId = p.id 
                     WHERE LOWER(r.reviewerName) = LOWER(?)`;
        const reviews = await query(sql, [req.params.reviewerName]);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reviews/:id/report', async (req, res) => {
    try {
        await run(`UPDATE reviews SET reported = 1 WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/:id/reply', async (req, res) => {
    const { replyText } = req.body;
    try {
        await run(`UPDATE reviews SET replyText = ? WHERE id = ?`, [replyText, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/reviews', async (req, res) => {
    try {
        const list = await query(`SELECT r.*, p.name as propertyName FROM reviews r JOIN properties p ON r.propertyId = p.id WHERE r.reported = 1`);
        res.json(list.map(r => ({ ...r, reported: !!r.reported })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const review = await get(`SELECT propertyId FROM reviews WHERE id = ?`, [req.params.id]);
        await run(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
        
        if (review) {
            const reviews = await query(`SELECT rating FROM reviews WHERE propertyId = ?`, [review.propertyId]);
            const avg = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 5.0;
            await run(`UPDATE properties SET rating = ? WHERE id = ?`, [Number(avg.toFixed(2)), review.propertyId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// SUPPORT COMPLAINTS TICKETS ENDPOINTS
// ----------------------------------------------------
app.get('/api/tickets', async (req, res) => {
    const { userId, role } = req.query;
    try {
        let sql = `SELECT * FROM tickets`;
        let params = [];
        if (role !== 'admin' && userId) {
            sql += ` WHERE userId = ?`;
            params.push(userId);
        }
        sql += ` ORDER BY id DESC`;
        const list = await query(sql, params);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const { userId, userRole, type, subject, description } = req.body;
    try {
        const id = createId('tkt');
        const createdAt = new Date().toLocaleString();
        await run(`INSERT INTO tickets VALUES (?, ?, ?, ?, ?, ?, 'Open', ?)`, [
            id, userId, userRole, type, subject, description, createdAt
        ]);
        res.status(201).json({ success: true, ticketId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tickets/:id/messages', async (req, res) => {
    try {
        const msgs = await query(`SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY timestamp ASC`, [req.params.id]);
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tickets/:id/messages', async (req, res) => {
    const { senderId, content } = req.body;
    try {
        const id = createId('tktmsg');
        const timestamp = new Date().toLocaleString();
        await run(`INSERT INTO ticket_messages VALUES (?, ?, ?, ?, ?)`, [
            id, req.params.id, senderId, content, timestamp
        ]);
        res.status(201).json({ success: true, messageId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tickets/:id/close', async (req, res) => {
    try {
        await run(`UPDATE tickets SET status = 'Closed' WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// HOST TRANSACTION WITHDRAWALS ENDPOINTS
// ----------------------------------------------------
app.get('/api/hosts/:id/transactions', async (req, res) => {
    try {
        const txs = await query(`SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC`, [req.params.id]);
        res.json(txs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hosts/:id/withdraw', async (req, res) => {
    const { amount, bankAccount } = req.body;
    try {
        const id = createId('tx');
        const createdAt = new Date().toLocaleString();
        await run(`INSERT INTO transactions VALUES (?, "", ?, 'Withdrawal', ?, ?, 'Completed', ?)`, [
            id, req.params.id, Number(amount), bankAccount || "Bank Transfer", createdAt
        ]);
        res.status(201).json({ success: true, transactionId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// ADMIN TRANSACTION LEDGER ENDPOINT
// ----------------------------------------------------
app.get('/api/admin/transactions', async (req, res) => {
    try {
        const txs = await query(`SELECT t.*, u.name as userName, u.email as userEmail FROM transactions t JOIN users u ON t.userId = u.id ORDER BY t.createdAt DESC`);
        res.json(txs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// COUPON ENDPOINTS
// ----------------------------------------------------
app.get('/api/coupons', async (req, res) => {
    try {
        const list = await query(`SELECT * FROM coupons`);
        res.json(list.map(c => ({ ...c, active: !!c.active })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/coupons', async (req, res) => {
    const { code, discountType, value, active, description } = req.body;
    try {
        await run(`INSERT INTO coupons VALUES (?, ?, ?, ?, ?)`, [
            code.toUpperCase(), discountType, Number(value), active ? 1 : 0, description || ""
        ]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/coupons/:code', async (req, res) => {
    const { discountType, value, active, description } = req.body;
    try {
        await run(`UPDATE coupons SET discountType = ?, value = ?, active = ?, description = ? WHERE code = ?`, [
            discountType, Number(value), active ? 1 : 0, description || "", req.params.code.toUpperCase()
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/coupons/:code', async (req, res) => {
    try {
        await run(`DELETE FROM coupons WHERE code = ?`, [req.params.code.toUpperCase()]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// SITE CONFIGS / COPY ENDPOINTS
// ----------------------------------------------------
app.get('/api/config', async (req, res) => {
    try {
        const siteNameRow = await get(`SELECT value FROM configs WHERE key = 'siteName'`);
        const heroRow = await get(`SELECT value FROM configs WHERE key = 'hero'`);
        const sectionsRow = await get(`SELECT value FROM configs WHERE key = 'sections'`);
        const statsRow = await get(`SELECT value FROM configs WHERE key = 'stats'`);
        const servicesRow = await get(`SELECT value FROM configs WHERE key = 'services'`);
        const cmsRow = await get(`SELECT value FROM configs WHERE key = 'cms'`);
        const commRateRow = await get(`SELECT value FROM configs WHERE key = 'commissionRate'`);
        
        const coupons = await query(`SELECT * FROM coupons WHERE active = 1`);

        res.json({
            siteName: siteNameRow ? JSON.parse(siteNameRow.value) : "RoomBnB",
            hero: heroRow ? JSON.parse(heroRow.value) : {},
            sections: sectionsRow ? JSON.parse(sectionsRow.value) : {},
            stats: statsRow ? JSON.parse(statsRow.value) : [],
            services: servicesRow ? JSON.parse(servicesRow.value) : [],
            cms: cmsRow ? JSON.parse(cmsRow.value) : {},
            commissionRate: commRateRow ? Number(commRateRow.value) : 10.0,
            coupons: coupons.map(c => ({ ...c, active: !!c.active }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/config/site', async (req, res) => {
    const { siteName, heroEyebrow, heroTitle, heroDescription } = req.body;
    try {
        await run(`UPDATE configs SET value = ? WHERE key = 'siteName'`, [JSON.stringify(siteName)]);
        
        const hero = {
            eyebrow: heroEyebrow,
            title: heroTitle,
            description: heroDescription
        };
        await run(`UPDATE configs SET value = ? WHERE key = 'hero'`, [JSON.stringify(hero)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/config/:key', async (req, res) => {
    try {
        await run(`UPDATE configs SET value = ? WHERE key = ?`, [JSON.stringify(req.body), req.params.key]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/config/reset', async (req, res) => {
    try {
        await run(`DELETE FROM users`);
        await run(`DELETE FROM properties`);
        await run(`DELETE FROM bookings`);
        await run(`DELETE FROM conversations`);
        await run(`DELETE FROM messages`);
        await run(`DELETE FROM notifications`);
        await run(`DELETE FROM favorites`);
        await run(`DELETE FROM coupons`);
        await run(`DELETE FROM reviews`);
        await run(`DELETE FROM configs`);
        await run(`DELETE FROM tickets`);
        await run(`DELETE FROM ticket_messages`);
        await run(`DELETE FROM transactions`);
        
        await initDb();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// REPORTS / ANALYTICS GENERATOR
// ----------------------------------------------------
app.get('/api/admin/reports', async (req, res) => {
    try {
        // Analytics statistics
        const usersCount = await get(`SELECT COUNT(*) as count FROM users`);
        const hostsCount = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'host'`);
        const customersCount = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`);
        const propertiesCount = await get(`SELECT COUNT(*) as count FROM properties`);
        const activePropertiesCount = await get(`SELECT COUNT(*) as count FROM properties WHERE status = 'Approved'`);
        const bookingsCount = await get(`SELECT COUNT(*) as count FROM bookings`);
        const revenueSum = await get(`SELECT SUM(totalPrice) as total FROM bookings WHERE status IN ('Paid', 'Approved', 'Completed')`);
        const refundSum = await get(`SELECT SUM(totalPrice) as total FROM bookings WHERE status = 'Refunded'`);

        // Group by months for graphs
        const monthlyBookings = await query(`SELECT STRFTIME('%m', createdAt) as month, COUNT(*) as count FROM bookings GROUP BY month`);
        const monthlyRevenue = await query(`SELECT STRFTIME('%m', createdAt) as month, SUM(totalPrice) as sum FROM bookings WHERE status IN ('Paid', 'Approved', 'Completed') GROUP BY month`);

        res.json({
            stats: {
                totalUsers: usersCount.count,
                totalHosts: hostsCount.count,
                totalCustomers: customersCount.count,
                totalProperties: propertiesCount.count,
                activeProperties: activePropertiesCount.count,
                totalBookings: bookingsCount.count,
                revenue: revenueSum.total || 0,
                refunds: refundSum.total || 0
            },
            monthlyBookings,
            monthlyRevenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifs = await query(`SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC`, [req.params.userId]);
        res.json(notifs.map(n => ({ ...n, read: !!n.read })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:userId/read', async (req, res) => {
    try {
        await run(`UPDATE notifications SET read = 1 WHERE userId = ?`, [req.params.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to serve index.html for undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`RoomBnB Server running on: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Database initialization failed:", err);
});
