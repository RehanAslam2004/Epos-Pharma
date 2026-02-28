const API_BASE = 'http://127.0.0.1:3456/api';

function getToken() {
    return localStorage.getItem('epos_token');
}

function setToken(token) {
    localStorage.setItem('epos_token', token);
}

function removeToken() {
    localStorage.removeItem('epos_token');
}

function setUser(user) {
    localStorage.setItem('epos_user', JSON.stringify(user));
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('epos_user'));
    } catch {
        return null;
    }
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'x-session-token': token }),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

export const api = {
    // Auth
    login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getSession: () => request('/auth/session'),
    checkSession: () => request('/auth/session'),
    getUsers: () => request('/auth/users'),
    createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) => request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

    // Products
    getProducts: (params = '') => request(`/products?${params}`),
    getProduct: (id) => request(`/products/${id}`),
    getProductStats: () => request('/products/stats'),
    createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

    // Sales
    getSales: (params = '') => request(`/sales?${params}`),
    getSale: (id) => request(`/sales/${id}`),
    createSale: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
    getTodaySales: () => request('/sales/today'),
    getMonthlySales: () => request('/sales/monthly'),

    // Customers
    getCustomers: (params = '') => request(`/customers?${params}`),
    getCustomer: (id) => request(`/customers/${id}`),
    getCustomerStats: () => request('/customers/stats'),
    getCustomerPurchases: (id) => request(`/customers/${id}/purchases`),
    createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

    // Suppliers
    getSuppliers: (params = '') => request(`/suppliers?${params}`),
    getSupplier: (id) => request(`/suppliers/${id}`),
    getSupplierProducts: (id) => request(`/suppliers/${id}/products`),
    createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

    // Reports
    getDashboard: () => request('/reports/dashboard'),
    getSalesReport: (params = '') => request(`/reports/sales?${params}`),
    getInventoryReport: () => request('/reports/inventory'),
    getCustomerReport: () => request('/reports/customers'),
    getSupplierReport: () => request('/reports/suppliers'),
    getPaymentReport: (params = '') => request(`/reports/payments?${params}`),

    // Settings
    getSettings: () => request('/settings'),
    updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    getTrial: () => request('/settings/trial'),
    activateLicense: (key) => request('/settings/license', { method: 'POST', body: JSON.stringify({ license_key: key }) }),
    createBackup: () => request('/settings/backup', { method: 'POST' }),
    restoreBackup: (file) => request('/settings/restore', { method: 'POST', body: JSON.stringify({ backup_file: file }) }),
    getBackups: () => request('/settings/backups'),

    // Notifications
    getNotifications: () => request('/notifications').catch(() => []),
};

export { getToken, setToken, removeToken, setUser, getUser };
