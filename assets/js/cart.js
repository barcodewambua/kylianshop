// Cart specific logic

// formatting helper used across cart
function formatPrice(value) { return 'KES ' + Number(value).toFixed(2); }

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('cart-items-container')) {
        renderCart();
    }
});

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const template = document.getElementById('cart-summary');
    
    if(!container) return;

    let cart = JSON.parse(localStorage.getItem('kylian_cart')) || [];
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-5"><h4>Your cart is empty.</h4><a href="shop.html" class="btn btn-primary mt-3">Continue Shopping</a></div>';
        if(template) template.style.display = 'none';
        return;
    }

    if(template) template.style.display = 'block';
    let html = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        let itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `
            <div class="row border-bottom py-3 align-items-center">
                <div class="col-3 col-md-2">
                    <img src="${item.image}" alt="${item.name}" class="img-fluid">
                </div>
                <div class="col-9 col-md-4">
                    <h6 class="mb-1">${item.name}</h6>
                    <small class="text-muted">Size: ${item.size}</small>
                </div>
                <div class="col-6 col-md-2 mt-3 mt-md-0 fw-bold">
                    ${formatPrice(item.price)}
                </div>
                <div class="col-6 col-md-3 mt-3 mt-md-0">
                    <div class="input-group input-group-sm w-75">
                        <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity(${index}, -1)">-</button>
                        <input type="text" class="form-control text-center text-muted" value="${item.quantity}" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="col-12 col-md-1 mt-3 mt-md-0 text-md-end text-center">
                    <button class="btn btn-link text-danger p-0" onclick="removeItem(${index})"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    
    // Update summary values
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    
    if(subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    // Assuming flat $10 shipping for demonstration
    if(totalEl) totalEl.textContent = formatPrice(subtotal + 10);
    
    updateCartCount();
}

function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('kylian_cart')) || [];
    if(cart[index]) {
        cart[index].quantity += change;
        if(cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('kylian_cart', JSON.stringify(cart));
        renderCart();
    }
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('kylian_cart')) || [];
    if(cart[index]) {
        cart.splice(index, 1);
        localStorage.setItem('kylian_cart', JSON.stringify(cart));
        renderCart();
    }
}
