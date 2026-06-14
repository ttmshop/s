// TTM Shop - Google Sheets Connector
const TTM_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyc0rPv6g_lixRbqVme06rPAvbyWc7JqQXN2GvdOx_ua4Kg2W3rMvEZOWdqAuN2pXa2/exec";

function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function sendOrderToSheet(orderData) {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            orderId: generateOrderId(),
            orderType: orderData.orderType,
            name: orderData.name,
            phone: orderData.phone,
            address: orderData.address,
            products: JSON.stringify(orderData.products),
            totalAmount: orderData.totalAmount,
            deliveryCharge: orderData.deliveryCharge,
            comment: orderData.comment,
            status: "Active"
        };
        
        await fetch(TTM_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return { success: true, orderId: payload.orderId };
    } catch(error) {
        console.error("Error:", error);
        return { success: false, error: error.message };
    }
}
