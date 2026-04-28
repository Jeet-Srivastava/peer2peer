import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
const ASSET_BASE_URL =
    import.meta.env.VITE_ASSET_BASE_URL ||
    (API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '') : '');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests automatically
api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// Auth API
export const registerUser = (userData) => api.post('/auth/register', userData);
export const loginUser = (userData) => api.post('/auth/login', userData);
export const getProfile = () => api.get('/auth/profile');

// Product API
export const getProducts = () => api.get('/products');
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (productData) => api.post('/products', productData);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Upload API
export const uploadImage = (formData) =>
    api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// Payment API
export const createStripeSession = (productData) => api.post('/payments/create-checkout-session', { product: productData });

export const resolveAssetUrl = (assetPath) => {
    if (!assetPath || !assetPath.startsWith('/')) {
        return assetPath;
    }

    return ASSET_BASE_URL ? `${ASSET_BASE_URL}${assetPath}` : assetPath;
};

export default api;
