// ==================== UPDATED SCRIPT FOR index.html ====================
// Replace the existing script content with this

const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwxzOC_5-4HmK9XaiMH2p0TuE_9RAi9g1SL4Y23trM_nE-l2wtJ8ELhJNWhJ4QS3Yvi/exec"; // Update this with your Apps Script URL

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Enhanced function to send order to Google Sheets
async function sendToGoogleSheets(orderData) {
    try {
        // Add order ID and metadata
        orderData.orderId = generateOrderId();
        orderData.timestamp = new Date().toISOString();
        
        const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, 
            body: JSON.stringify(orderData) 
        });
        
        // Store order in local backup
        saveOrderToLocalBackup(orderData);
        
        return true;
    } catch (error) {
        console.error("Error:", error);
        // Store failed orders in local storage to retry later
        saveFailedOrder(orderData);
        return false;
    }
}

// Save order to local backup
function saveOrderToLocalBackup(orderData) {
    let orders = JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
    orders.push(orderData);
    localStorage.setItem("ttm_orders_backup", JSON.stringify(orders));
}

// Save failed order for retry
function saveFailedOrder(orderData) {
    let failedOrders = JSON.parse(localStorage.getItem("ttm_failed_orders") || "[]");
    failedOrders.push(orderData);
    localStorage.setItem("ttm_failed_orders", JSON.stringify(failedOrders));
}

// Retry failed orders
async function retryFailedOrders() {
    let failedOrders = JSON.parse(localStorage.getItem("ttm_failed_orders") || "[]");
    for (let order of failedOrders) {
        try {
            await sendToGoogleSheets(order);
        } catch(e) {
            console.error("Retry failed for order:", order);
        }
    }
    localStorage.setItem("ttm_failed_orders", "[]");
}

// View orders from local backup (for debugging)
function viewLocalOrders() {
    const orders = JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
    console.table(orders);
    return orders;
}

// Get today's order summary
function getTodayOrders() {
    const orders = JSON.parse(localStorage.getItem("ttm_orders_backup") || "[]");
    const today = new Date().toDateString();
    return orders.filter(order => new Date(order.timestamp).toDateString() === today);
}

// Enhanced order confirmation in modal
// Replace the modalConfirmOrder onclick handler in your openProductModal function:

modalDiv.querySelector('#modalConfirmOrder').onclick = async () => {
    let name = modalDiv.querySelector('#modalName').value;
    let phone = modalDiv.querySelector('#modalPhone').value;
    let address = modalDiv.querySelector('#modalAddress').value;
    let comment = modalDiv.querySelector('#modalComment').value;
    
    if(!name || !phone || !address) { 
        showToast("Please fill Name, Phone & Address"); 
        return; 
    }
    
    let deliveryCharge = getDeliveryCharge(address);
    let total = product.price + deliveryCharge;
    
    const orderData = {
        orderType: "Single Product",
        name: name,
        phone: phone,
        address: address,
        comment: comment,
        deliveryCharge: deliveryCharge,
        products: JSON.stringify([{ 
            title: product.title, 
            price: product.price, 
            quantity: 1,
            imageUrl: product.imageUrl || ''
        }]),
        totalAmount: total
    };
    
    await saveOrderToSheet(orderData.orderType, 
        { name, phone, address, comment, deliveryCharge }, 
        [{ title: product.title, price: product.price, quantity: 1 }], 
        total
    );
    
    showToast(`✅ Order confirmed! Order ID: ${orderData.orderId || 'pending'} Total: ${total} ৳`);
    closeModal();
};

// Update the cart confirmation handler
document.getElementById('confirmCartFinal').onclick = async () => {
    if(cart.length === 0) { 
        showToast("Cart is empty"); 
        return; 
    }
    
    let name = document.getElementById('cartName').value;
    let phone = document.getElementById('cartPhone').value;
    let address = document.getElementById('cartAddress').value;
    let comment = document.getElementById('cartMsg').value;
    
    if(!name || !phone || !address) { 
        showToast("Please fill Name, Phone & Address"); 
        return; 
    }
    
    let subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    let deliveryCharge = getDeliveryCharge(address);
    let grandTotal = subtotal + deliveryCharge;
    
    const orderData = {
        orderType: "Multiple Products (Cart)",
        name: name,
        phone: phone,
        address: address,
        comment: comment,
        deliveryCharge: deliveryCharge,
        products: JSON.stringify(cart.map(item => ({ 
            title: item.title, 
            price: item.price, 
            quantity: item.quantity,
            imageUrl: item.imageUrl || ''
        }))),
        totalAmount: grandTotal
    };
    
    await saveOrderToSheet("Multiple Products (Cart)", 
        { name, phone, address, comment, deliveryCharge }, 
        cart.map(item => ({ title: item.title, price: item.price, quantity: item.quantity })), 
        grandTotal
    );
    
    showToast(`✅ Order confirmed! Order ID: ${orderData.orderId || 'pending'} Total: ${grandTotal} ৳`);
    cart = [];
    saveCart();
    document.getElementById('cartPanel').classList.remove('open');
};

// Update the saveOrderToSheet function
async function saveOrderToSheet(orderType, customerData, products, total) { 
    const orderData = {
        orderType: orderType,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        comment: customerData.comment || "",
        deliveryCharge: customerData.deliveryCharge,
        products: JSON.stringify(products),
        totalAmount: total
    };
    
    await sendToGoogleSheets(orderData);
}

// Retry failed orders every hour
setInterval(() => {
    retryFailedOrders();
}, 3600000);

// On page load, try to send any failed orders
window.addEventListener('load', () => {
    retryFailedOrders();
});