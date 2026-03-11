// admin.js — logic used on admin.html

document.addEventListener('DOMContentLoaded', () => {
    refreshNavAuth();
    checkAdmin();
    loadProducts();
    loadOrders();

    document.getElementById('product-form').addEventListener('submit', handleAddProduct);
});

function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('kylian_user')) || {};
    if (!user.role || user.role !== 'admin') {
        showToast('You must be an administrator to view this page.', 'danger');
        window.location.href = 'index.html';
        return;
    }
}

async function loadProducts() {
    try {
        const products = await api.get('/admin/products');
        const container = document.getElementById('product-list');
        if (products.length === 0) {
            container.innerHTML = '<p>No products found.</p>';
            return;
        }
        let html = '<table class="table"><thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>';
        products.forEach(p => {
            html += `<tr>
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td>KES ${p.price}</td>
                    <td>${p.stock}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button></td>
                </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('prod-name').value,
        price: parseFloat(document.getElementById('prod-price').value),
        image_url: document.getElementById('prod-image').value,
        category: document.getElementById('prod-category').value,
        stock: parseInt(document.getElementById('prod-stock').value, 10) || 0,
        description: document.getElementById('prod-desc').value,
    };
    try {
        await api.post('/admin/products', data);
        showToast('Product added.');
        e.target.reset();
        loadProducts();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteProduct(id) {
    if (!confirm('Delete product #' + id + '?')) return;
    try {
        await api.delete(`/admin/products/${id}`);
        loadProducts();
    } catch (err) {
        alert(err.message);
    }
}

async function loadOrders() {
    try {
        const orders = await api.get('/admin/orders');
        const container = document.getElementById('order-list');
        if (orders.length === 0) {
            container.innerHTML = '<p>No orders.</p>';
            return;
        }
        let html = '<div class="accordion" id="ordersAccordion">';
        orders.forEach(o => {
            html += `<div class="accordion-item">
                    <h2 class="accordion-header" id="heading${o.id}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${o.id}" aria-expanded="false" aria-controls="collapse${o.id}">
                            Order #${o.id} &ndash; ${o.email} &ndash; ${o.status}
                        </button>
                    </h2>
                    <div id="collapse${o.id}" class="accordion-collapse collapse" aria-labelledby="heading${o.id}" data-bs-parent="#ordersAccordion">
                        <div class="accordion-body">
                            <p><strong>Name:</strong> ${o.first_name || ''} ${o.last_name || ''}</p>
                            <p><strong>Address:</strong> ${o.address || ''}, ${o.city || ''} ${o.zip_code || ''}</p>
                            <p><strong>Items:</strong></p>
                            <ul>${(o.items || []).map(i => `<li>${i.product_name} x${i.quantity} (KES ${i.unit_price})</li>`).join('')}</ul>
                            <div class="mb-2">
                                <button class="btn btn-sm btn-success" onclick="approveOrder(${o.id})">Approve</button>
                            </div>
                            <div class="input-group mb-2">
                                <input type="text" id="msg-${o.id}" class="form-control" placeholder="Message to customer">
                                <button class="btn btn-secondary" onclick="sendMessage(${o.user_id || 'null'}, ${o.id})">Send</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

async function approveOrder(id) {
    try {
        await api.put(`/admin/orders/${id}`);
        loadOrders();
    } catch (err) {
        alert(err.message);
    }
}

async function sendMessage(userId, orderId) {
    const input = document.getElementById(`msg-${orderId}`);
    const text = input.value.trim();
    if (!text) return;
    try {
        await api.post('/admin/messages', { user_id: userId, subject: `Order #${orderId} Update`, message: text });
        showToast('Message sent');
        input.value = '';
    } catch (err) {
        alert(err.message);
    }
}
