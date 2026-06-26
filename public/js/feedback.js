// Feedback module for RoomBnB Customer Dashboard

window.renderFeedbackTab = async function() {
    const list = document.getElementById("customer-feedback-list");
    if (!list) return;

    if (!window.activeSession) {
        list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Please log in to view your feedback.</p>`;
        return;
    }

    try {
        const name = window.activeSession.name;
        // Fetch feedbacks written by this reviewer name
        const apiBaseUrl = window.location.origin;
        const reviews = await RoomBnbAPI.fetchJSON(`${apiBaseUrl}/api/reviews/user/${encodeURIComponent(name)}`);

        list.innerHTML = reviews.length
            ? reviews.map(r => {
                const ratingNum = Number(r.rating) || 5;
                const stars = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
                
                // Parse property images
                let images = [];
                try {
                    images = JSON.parse(r.propertyImages || '[]');
                } catch (err) {
                    images = [];
                }
                const bgImage = images.length > 0 ? images[0] : '';
                const styleAttr = bgImage ? `style="background-image: url('${bgImage}'); background-size: cover; background-position: center; width:80px; height:80px; border-radius:12px; flex-shrink:0;"` : '';

                return `
                    <div class="feedback-card" style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; display:flex; gap:20px; box-shadow:var(--shadow-sm); text-align:left;">
                        ${bgImage ? `<div ${styleAttr}></div>` : ''}
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                                <div>
                                    <h4 style="font-weight:800; font-size:1.1rem; margin:0; color:var(--text);">${RoomBnbAPI.escapeHtml(r.propertyName || 'Stay')}</h4>
                                    <div style="color:var(--accent); font-size:0.95rem; font-weight:700; margin-top:2px;">${stars}</div>
                                </div>
                                <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Submitted on ${r.date}</span>
                            </div>
                            <p style="font-size:0.95rem; line-height:1.5; margin:0 0 12px 0; color:var(--text);">${RoomBnbAPI.escapeHtml(r.text)}</p>
                            ${r.photo ? `<img src="${r.photo}" alt="Review photo" style="max-width:200px; max-height:120px; border-radius:8px; margin-bottom:12px; display:block;">` : ''}
                            
                            ${r.replyText ? `
                                <div style="background:var(--secondary-light); border-left:4px solid var(--accent); padding:12px 16px; border-radius:4px; margin-top:10px;">
                                    <strong style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:4px; color:var(--text-dark);">Host Response:</strong>
                                    <span style="font-size:0.9rem; line-height:1.4; color:var(--text-muted);">${RoomBnbAPI.escapeHtml(r.replyText)}</span>
                                </div>
                            ` : `
                                <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">No response from host yet.</div>
                            `}
                        </div>
                    </div>
                `;
            }).join("")
            : `<div class="empty-state" style="text-align:center; padding: 40px; color:var(--text-muted);">
                 <h3>No feedbacks submitted yet.</h3>
                 <p>Review stay history under "My Bookings" after your trips are completed to share your feedback.</p>
               </div>`;
    } catch (err) {
        console.error("Error loading feedback list:", err);
        list.innerHTML = `<p style="padding:40px; color:var(--text-muted);">Error loading feedbacks.</p>`;
    }
};

// Listen to menu item click delegation
document.addEventListener("click", (event) => {
    const tabItem = event.target.closest('[data-tab-target="customer-feedbacks"]');
    if (tabItem) {
        window.renderFeedbackTab();
    }
});
