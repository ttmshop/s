// ==================== Google Sheets Connector JavaScript File ====================
// Upload this file to your GitHub and use the raw URL in your index.html

const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwLAgiq__p8mnhu5GGs6jf8BDbKPDs5tjl00RBegsU-JEdlrSV8kIzXg7SYMlxkv15RXQ/exec";

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Format products data for Google Sheets
function formatProductsData(products) {
    if (!products || products.length === 0) return "";
    return products.map(p => `${p.title} (${p.quantity || 1}x) : ৳${p.price}`).join(" | ");
}

// Main function to send order to Google Sheets
async function sendOrderToGoogleSheets(orderData) {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            orderId: generateOrderId(),
            orderType: orderData.orderType || "Single Product",
            name: orderData.name || "",
            phone: orderData.phone || "",
            address: orderData.address || "",
            products: JSON.stringify(orderData.products || []),
            totalAmount: orderData.totalAmount || 0,
            deliveryCharge: orderData.deliveryCharge || 0,
            comment: orderData.comment || ""
        };
        
        const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify(payload) 
        });
        
        // Save to local backup
        saveOrderToLocalBackup(payload);
        
        return { success: true, orderId: payload.orderId };
    } catch (error) {
        console.error("Error sending order:", error);
        saveFailedOrder(orderData);
        return { success: false, error: error.message };
    }
}

// Save order to local backup
function saveOrderToLocalBackup(orderData) {
    let orders = JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
    orders.push({
        ...orderData,
        localSaveTime: new Date().toISOString()
    });
    localStorage.setItem("ttm_orders_backup", JSON.stringify(orders));
}

// Save failed order for retry
function saveFailedOrder(orderData) {
    let failedOrders = JSON.parse(localStorage.getItem("ttm_failed_orders") || "[]");
    failedOrders.push({
        ...orderData,
        failedAt: new Date().toISOString()
    });
    localStorage.setItem("ttm_failed_orders", JSON.stringify(failedOrders));
}

// Retry failed orders
async function retryFailedOrders() {
    let failedOrders = JSON.parse(localStorage.getItem("ttm_failed_orders") || "[]");
    let stillFailed = [];
    
    for (let order of failedOrders) {
        try {
            const result = await sendOrderToGoogleSheets(order);
            if (!result.success) {
                stillFailed.push(order);
            }
        } catch(e) {
            stillFailed.push(order);
        }
    }
    
    localStorage.setItem("ttm_failed_orders", JSON.stringify(stillFailed));
    
    if (stillFailed.length === 0) {
        console.log("All failed orders have been retried successfully!");
    }
}

// Get today's orders from local backup
function getTodayOrders() {
    const orders = JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
    const today = new Date().toDateString();
    return orders.filter(order => new Date(order.timestamp).toDateString() === today);
}

// Get all orders from local backup
function getAllOrders() {
    return JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
}

// Clear local backup (after successful sync)
function clearLocalBackup() {
    localStorage.removeItem("ttm_orders_backup");
    showToast("Local backup cleared");
}

// Retry failed orders every hour
setInterval(() => {
    retryFailedOrders();
}, 3600000);

// Retry on page load
window.addEventListener('load', () => {
    retryFailedOrders();
});

// Export functions for use in main website
window.TTMShop = {
    sendOrder: sendOrderToGoogleSheets,
    getTodayOrders: getTodayOrders,
    getAllOrders: getAllOrders,
    retryFailed: retryFailedOrders,
    clearBackup: clearLocalBackup
};
