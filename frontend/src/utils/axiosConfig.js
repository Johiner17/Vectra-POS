import axios from 'axios';

/**
 * Configura interceptores globales de Axios para:
 * 1. Agregar el token JWT automáticamente en cada request
 * 2. Manejar errores 401/403 redirigiendo al login
 */

// Interceptor de REQUEST: agrega el token automáticamente
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: maneja errores de autenticación
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token inválido o expirado: limpiar sesión y redirigir al login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirigir solo si no estamos ya en /login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
