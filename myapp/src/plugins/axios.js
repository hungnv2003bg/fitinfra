import axios from 'axios';
import { clearAuthData, getAuthData } from '../utils/authUtils';
import store from '../redux/store';
import userSlice from '../redux/userSlice';

const resolvedBackendUrl = (() => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }
    // Luôn sử dụng port 8080 cho backend, bất kể frontend chạy trên port nào
    const { hostname } = window.location;
    return `http://${hostname}:8080`; // Spring Boot backend port mặc định
})();

const axiosIns = axios.create({
    baseURL: resolvedBackendUrl,
    timeout: 100000,
});

// Track user activity for inactivity detection
let lastActivityTime = Date.now();
let inactivityTimer = null;

const resetInactivityTimer = () => {
    lastActivityTime = Date.now();
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    // Set timer for 30 minutes of inactivity
    inactivityTimer = setTimeout(() => {
        console.log('User inactive for 30 minutes, logging out...');
        clearAuthData();
        store.dispatch(userSlice.actions.dangXuat());
        window.location.href = '/login';
    }, 30 * 60 * 1000); // 30 minutes
};

// Track user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});

// Auto-refresh token function
const refreshAccessToken = async () => {
    try {
        const authData = getAuthData();
        if (!authData || !authData.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post('/api/auth/refresh', {
            refreshToken: authData.refreshToken
        });

        const { token, refreshToken, nguoiDung, quyenList } = response.data;
        
        // Update localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(nguoiDung));
        localStorage.setItem('quyenList', JSON.stringify(quyenList));
        
        // Update Redux store
        store.dispatch(userSlice.actions.dangNhap({
            token,
            quyenList,
            nguoiDung
        }));
        
        console.log('Token refreshed successfully');
        return token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuthData();
        store.dispatch(userSlice.actions.dangXuat());
        throw error;
    }
};

// Check if token needs refresh (expires in 5 minutes)
const needsRefresh = (token) => {
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = exp - now;
        
        // Refresh if token expires in less than 5 minutes
        return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
        return true; // If we can't parse the token, assume it needs refresh
    }
};

axiosIns.interceptors.request.use(async config => {
    const token = localStorage.getItem('token');
    
    // Check if token needs refresh before making request
    if (token && needsRefresh(token)) {
        try {
            const newToken = await refreshAccessToken();
            config.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
            // Refresh failed, request will likely fail with 401
            // The response interceptor will handle logout
        }
    } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

axiosIns.interceptors.response.use(
    response => {
        // Reset inactivity timer on successful response
        resetInactivityTimer();
        return response;
    },
    async error => {
        const { response } = error || {};
        const status = response?.status;
        const serverMsg = (response?.data && (response.data.error || response.data.message)) || '';
        const reqMethod = (error?.config?.method || '').toLowerCase();
        const reqUrl = error?.config?.url || '';

        const isPolicyBlock = status === 403 && /không thể\s*(xóa|sửa)/i.test(serverMsg);
        const isBusiness403 = status === 403 && (reqMethod === 'delete' || reqMethod === 'put') && (/\/api\/sop-documents/.test(reqUrl));
        const isUserUpdate = reqMethod === 'put' && /\/api\/users\/\d+$/.test(reqUrl);
        const isRefreshEndpoint = reqUrl.includes('/api/auth/refresh');

        // Try to refresh token on 401, except for refresh endpoint itself
        if (status === 401 && !isRefreshEndpoint) {
            try {
                const newToken = await refreshAccessToken();
                // Retry the original request with new token
                const originalRequest = error.config;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosIns(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                clearAuthData();
                store.dispatch(userSlice.actions.dangXuat());
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        const shouldLogout = (status === 401 || (status === 403 && !isPolicyBlock && !isBusiness403)) && !isUserUpdate && !isRefreshEndpoint;

        if (shouldLogout) {
            clearAuthData();
            store.dispatch(userSlice.actions.dangXuat());
            return;
        }

        return Promise.reject(error);
    }
);

export default axiosIns;