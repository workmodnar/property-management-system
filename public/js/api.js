const API_BASE = window.location.origin;

const RoomBnbAPI = {
    sessionKey: "roombnb-session",

    // JSON Fetch helper
    async fetchJSON(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }
        return data;
    },

    // Session Management
    loadSession() {
        const savedSession = localStorage.getItem(this.sessionKey);
        if (!savedSession) return null;
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

    logout() {
        this.clearSession();
        window.location.href = "login.html";
    },

    requireRole(role) {
        const session = this.loadSession();
        if (!session || session.role !== role) {
            window.location.href = "login.html";
            throw new Error("Redirecting to login.");
        }
        return session;
    },

    // UI Helpers
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

    escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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

    // REST ENDPOINTS COMMUNICATION
    async login(email, password, role) {
        const user = await this.fetchJSON(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password, role })
        });
        this.saveSession(user);
        return user;
    },

    async register(name, email, password, address, role, phone) {
        return this.fetchJSON(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ name, email, password, address, role, phone })
        });
    },

    async getUsers() {
        return this.fetchJSON(`${API_BASE}/api/users`);
    },

    async getUser(userId) {
        return this.fetchJSON(`${API_BASE}/api/users/${userId}`);
    },

    async updateUser(userId, updatedFields) {
        const result = await this.fetchJSON(`${API_BASE}/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedFields)
        });
        // Sync active session name if changed
        const session = this.loadSession();
        if (session && session.id === userId) {
            if (updatedFields.name) session.name = updatedFields.name;
            this.saveSession(session);
        }
        return result;
    },

    async getProperties(filters = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== "") {
                if (Array.isArray(val)) {
                    val.forEach(v => queryParams.append(key, v));
                } else {
                    queryParams.append(key, val);
                }
            }
        });
        return this.fetchJSON(`${API_BASE}/api/properties?${queryParams.toString()}`);
    },

    async createProperty(propertyData) {
        return this.fetchJSON(`${API_BASE}/api/properties`, {
            method: 'POST',
            body: JSON.stringify(propertyData)
        });
    },

    async updateProperty(propertyId, propertyData) {
        return this.fetchJSON(`${API_BASE}/api/properties/${propertyId}`, {
            method: 'PUT',
            body: JSON.stringify(propertyData)
        });
    },

    async deleteProperty(propertyId) {
        return this.fetchJSON(`${API_BASE}/api/properties/${propertyId}`, {
            method: 'DELETE'
        });
    },

    async getBookings(role, userId) {
        return this.fetchJSON(`${API_BASE}/api/bookings?role=${role}&userId=${userId}`);
    },

    async createBooking(bookingData) {
        return this.fetchJSON(`${API_BASE}/api/bookings`, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },

    async updateBookingStatus(bookingId, status) {
        return this.fetchJSON(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async getChats(role, userId) {
        return this.fetchJSON(`${API_BASE}/api/chats?role=${role}&userId=${userId}`);
    },

    async getMessages(convoId, readerId) {
        return this.fetchJSON(`${API_BASE}/api/chats/${convoId}/messages?readerId=${readerId}`);
    },

    async sendMessage(convoId, senderId, content, image = "") {
        return this.fetchJSON(`${API_BASE}/api/chats/message`, {
            method: 'POST',
            body: JSON.stringify({ convoId, senderId, content, image })
        });
    },

    async initiateChat(customerId, hostId, propertyName) {
        return this.fetchJSON(`${API_BASE}/api/chats/initiate`, {
            method: 'POST',
            body: JSON.stringify({ customerId, hostId, propertyName })
        });
    },

    async getFavorites(userId) {
        return this.fetchJSON(`${API_BASE}/api/favorites/${userId}`);
    },

    async addFavorite(userId, propertyId) {
        return this.fetchJSON(`${API_BASE}/api/favorites`, {
            method: 'POST',
            body: JSON.stringify({ userId, propertyId })
        });
    },

    async removeFavorite(userId, propertyId) {
        return this.fetchJSON(`${API_BASE}/api/favorites`, {
            method: 'DELETE',
            body: JSON.stringify({ userId, propertyId })
        });
    },

    async submitReview(reviewData) {
        return this.fetchJSON(`${API_BASE}/api/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    },

    async reportReview(reviewId) {
        return this.fetchJSON(`${API_BASE}/api/reviews/${reviewId}/report`, {
            method: 'PUT'
        });
    },

    async getReportedReviews() {
        return this.fetchJSON(`${API_BASE}/api/admin/reviews`);
    },

    async deleteReview(reviewId) {
        return this.fetchJSON(`${API_BASE}/api/reviews/${reviewId}`, {
            method: 'DELETE'
        });
    },

    async getConfig() {
        return this.fetchJSON(`${API_BASE}/api/config`);
    },

    async updateSiteConfig(configData) {
        return this.fetchJSON(`${API_BASE}/api/config/site`, {
            method: 'PUT',
            body: JSON.stringify(configData)
        });
    },

    async updateConfig(key, data) {
        return this.fetchJSON(`${API_BASE}/api/config/${key}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async resetApp() {
        return this.fetchJSON(`${API_BASE}/api/config/reset`, {
            method: 'POST'
        });
    },

    async getNotifications(userId) {
        return this.fetchJSON(`${API_BASE}/api/notifications/${userId}`);
    },

    async markNotificationsRead(userId) {
        return this.fetchJSON(`${API_BASE}/api/notifications/${userId}/read`, {
            method: 'PUT'
        });
    },

    // Extended Features Wrappers
    async forgotPassword(email) {
        return this.fetchJSON(`${API_BASE}/api/auth/forgot`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    async verify2FA(email, code) {
        return this.fetchJSON(`${API_BASE}/api/auth/2fa`, {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
    },

    async getTickets(userId, role) {
        return this.fetchJSON(`${API_BASE}/api/tickets?userId=${userId}&role=${role}`);
    },

    async createTicket(userId, userRole, type, subject, description) {
        return this.fetchJSON(`${API_BASE}/api/tickets`, {
            method: 'POST',
            body: JSON.stringify({ userId, userRole, type, subject, description })
        });
    },

    async getTicketMessages(ticketId) {
        return this.fetchJSON(`${API_BASE}/api/tickets/${ticketId}/messages`);
    },

    async sendTicketMessage(ticketId, senderId, content) {
        return this.fetchJSON(`${API_BASE}/api/tickets/${ticketId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ senderId, content })
        });
    },

    async closeTicket(ticketId) {
        return this.fetchJSON(`${API_BASE}/api/tickets/${ticketId}/close`, {
            method: 'PUT'
        });
    },

    async getHostTransactions(hostId) {
        return this.fetchJSON(`${API_BASE}/api/hosts/${hostId}/transactions`);
    },

    async requestWithdrawal(hostId, amount, bankAccount) {
        return this.fetchJSON(`${API_BASE}/api/hosts/${hostId}/withdraw`, {
            method: 'POST',
            body: JSON.stringify({ amount, bankAccount })
        });
    },

    async getAdminTransactions() {
        return this.fetchJSON(`${API_BASE}/api/admin/transactions`);
    },

    async getCoupons() {
        return this.fetchJSON(`${API_BASE}/api/coupons`);
    },

    async createCoupon(couponData) {
        return this.fetchJSON(`${API_BASE}/api/admin/coupons`, {
            method: 'POST',
            body: JSON.stringify(couponData)
        });
    },

    async updateCoupon(code, couponData) {
        return this.fetchJSON(`${API_BASE}/api/admin/coupons/${code}`, {
            method: 'PUT',
            body: JSON.stringify(couponData)
        });
    },

    async deleteCoupon(code) {
        return this.fetchJSON(`${API_BASE}/api/admin/coupons/${code}`, {
            method: 'DELETE'
        });
    },

    async submitReviewReply(reviewId, replyText) {
        return this.fetchJSON(`${API_BASE}/api/reviews/${reviewId}/reply`, {
            method: 'POST',
            body: JSON.stringify({ replyText })
        });
    },

    async getReports() {
        return this.fetchJSON(`${API_BASE}/api/admin/reports`);
    },

    async updateUserStatus(userId, status) {
        return this.fetchJSON(`${API_BASE}/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async deleteUser(userId) {
        return this.fetchJSON(`${API_BASE}/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    async refundBooking(bookingId) {
        return this.fetchJSON(`${API_BASE}/api/bookings/${bookingId}/refund`, {
            method: 'POST'
        });
    },

    async updateCommission(rate) {
        return this.fetchJSON(`${API_BASE}/api/admin/commission`, {
            method: 'PUT',
            body: JSON.stringify({ rate })
        });
    }
};
