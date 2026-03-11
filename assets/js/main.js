// Main JavaScript for KylianShop

// utility to format numbers as KES currency
function formatPrice(value) {
    return 'KES ' + Number(value).toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('shadow-sm', 'bg-white');
            } else {
                navbar.classList.remove('shadow-sm', 'bg-white');
            }
        });
    }

    // Initialize cart count from localStorage
    updateCartCount();
});

function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;

    let cart = JSON.parse(localStorage.getItem('kylian_cart')) || [];
    let count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountEl.textContent = count;
    
    if(count > 0) {
        cartCountEl.style.display = 'inline-block';
    } else {
        cartCountEl.style.display = 'none';
    }
}

// Function to add item to cart (can be called from buttons)
function addToCart(product) {
    // require authentication for cart actions
    const token = localStorage.getItem('kylian_token');
    if (!token) {
        // open auth modal if not logged in
        const modalEl = document.getElementById('authModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
        return; // do not add to cart
    }

    let cart = JSON.parse(localStorage.getItem('kylian_cart')) || [];
    
    const existingItemIndex = cart.findIndex(item => item.id === product.id && item.size === product.size);
    
    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += (product.quantity || 1);
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: product.size || 'M',
            quantity: product.quantity || 1
        });
    }
    
    localStorage.setItem('kylian_cart', JSON.stringify(cart));
    updateCartCount();
    
    // Optional: Show a toast or notification
    showToast('Item added to cart!');
}
