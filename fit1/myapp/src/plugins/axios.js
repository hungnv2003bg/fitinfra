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
let warningTimer = null;
let warningShown = false;

const resetInactivityTimer = () => {
    lastActivityTime = Date.now();
    warningShown = false;
    
    // Clear existing timers
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (warningTimer) {
        clearTimeout(warningTimer);
    }
    
    // Set warning timer (5 minutes before logout)
    warningTimer = setTimeout(() => {
        if (!warningShown) {
            warningShown = true;
            const warningMessage = 'Bạn sẽ bị đăng xuất sau 5 phút nữa do không hoạt động. Nhấp vào bất kỳ đâu để tiếp tục.';
            alert(warningMessage);
        }
    }, (60 - 5) * 60 * 1000); // 55 minutes
    
    // Set logout timer for 1 hour of inactivity
    inactivityTimer = setTimeout(() => {
        console.log('User inactive for 1 hour, logging out...');
        clearAuthData();
        store.dispatch(userSlice.actions.dangXuat());
        window.location.href = '/login';
    }, 60 * 60 * 1000); // 1 hour
};

// Track user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});

// Auto-refresh token function with retry
const refreshAccessToken = async (retryCount = 0) => {
    const maxRetries = 2;
    
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
        console.error(`Token refresh failed (attempt ${retryCount + 1}):`, error);
        
        // Retry if we haven't exceeded max retries and it's a network error
        if (retryCount < maxRetries && (!error.response || error.response.status >= 500)) {
            console.log(`Retrying token refresh in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return refreshAccessToken(retryCount + 1);
        }
        
        // If all retries failed or it's an auth error, logout
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
        
        // Refresh if token expires in less than 10 minutes
        return timeUntilExpiry < 10 * 60 * 1000;
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