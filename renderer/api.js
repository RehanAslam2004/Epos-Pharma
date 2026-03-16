let API_BASE = localStorage.getItem('epos_api_url')
    ? `${localStorage.getItem('epos_api_url')}/api`
    : 'http://127.0.0.1:3456/api';

function setApiBaseUrl(url) {
    if (url) {
        // Strip trailing slash if present, and remove /api if user added it
        let cleanUrl = url.replace(/\/+$/, '').replace(/\/api$/, '');
        localStorage.setItem('epos_api_url', cleanUrl);
        API_BASE = `${cleanUrl}/api`;
    } else {
        localStorage.removeItem('epos_api_url');
        API_BASE = 'http://127.0.0.1:3456/api';
    }
}

function getApiBaseUrl() {
    return localStorage.getItem('epos_api_url') || 'http://127.0.0.1:3456';
}

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
    returnSale: (id, items = null) => request(`/sales/${id}/return`, { method: 'POST', body: items ? JSON.stringify({ items }) : undefined }),
    printReceipt: (data) => request('/print/receipt', { method: 'POST', body: JSON.stringify(data) }),
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
    getSuppliers: (search = '') => request(`/suppliers${search ? `?search=${search}` : ''}`),
    getSupplier: (id) => request(`/suppliers/${id}`),
    getSupplierProducts: (id) => request(`/suppliers/${id}/products`),
    createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
    getSupplierLedger: (id) => request(`/suppliers/${id}/ledger`),
    addSupplierPayment: (id, payload) => request(`/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(payload) }),

    // Purchases (Phase 1.5)
    getPurchases: () => request('/purchases'),
    getPurchase: (id) => request(`/purchases/${id}`),
    createPurchase: (payload) => request('/purchases', { method: 'POST', body: JSON.stringify(payload) }),

    // Expenses (Phase 5)
    getExpenses: (params = '') => request(`/expenses?${params}`),
    getExpenseSummary: () => request('/expenses/summary'),
    createExpense: (payload) => request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

    // Reports
    getDashboard: () => request('/reports/dashboard'),
    getSalesReport: (params = '') => request(`/reports/sales?${params}`),
    getInventoryReport: () => request('/reports/inventory'),
    getCustomerReport: () => request('/reports/customers'),
    getSupplierReport: () => request('/reports/suppliers'),
    getPaymentReport: (params = '') => request(`/reports/payments?${params}`),
    getStockMovements: (params = '') => request(`/reports/stock-movements?${params}`),

    // Settings
    getSettings: () => request('/settings'),
    updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    getTrial: () => request('/settings/trial'),
    activateLicense: (key) => request('/settings/license', { method: 'POST', body: JSON.stringify({ license_key: key }) }),
    createBackup: () => request('/settings/backup', { method: 'POST' }),
    uploadBackup: (fileName, base64Data) => request('/settings/upload-backup', { method: 'POST', body: JSON.stringify({ fileName, data: base64Data }) }),
    restoreBackup: (file) => request('/settings/restore', { method: 'POST', body: JSON.stringify({ backup_file: file }) }),
    getBackups: () => request('/settings/backups'),
    getNetwork: () => request('/settings/network'),

    // Notifications
    getNotifications: () => request('/notifications').catch(() => []),

    // Setup Wizard
    getSetupStatus: () => request('/setup/status'),
    getSetupMachineId: () => request('/setup/machine-id'),
    completeSetup: (data) => request('/setup/complete', { method: 'POST', body: JSON.stringify(data) }),
};

export { getToken, setToken, removeToken, setUser, getUser, setApiBaseUrl, getApiBaseUrl };
