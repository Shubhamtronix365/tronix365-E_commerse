import axios from 'axios';

const getBaseURL = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return import.meta.env.VITE_DEV_API_URL || 'http://localhost:8000';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const client = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000, // 30 second timeout to accommodate Render cold starts
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token and request correlation ID
client.interceptors.request.use(
    (config) => {
        // Attach user JWT authentication token if present
        const token = localStorage.getItem('tronix_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Attach unique end-to-end request correlation ID for observability
        if (!config.headers['X-Request-ID']) {
            const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            config.headers['X-Request-ID'] = reqId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors, auto-retry cold starts, and correlate errors
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        const reqId = config?.headers?.['X-Request-ID'] || 'unknown';
        
        // Retry logic for Network Errors or 502/503/504 (Render cold-start wakeups)
        if (config && (!config._retryCount || config._retryCount < 2)) {
            if (!error.response || [502, 503, 504].includes(error.response.status)) {
                config._retryCount = (config._retryCount || 0) + 1;
                console.log(`[Observability ${reqId}] Backend waking up... retrying request (${config._retryCount}/2)`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return client(config);
            }
        }

        if (error.response && error.response.status >= 400) {
            console.warn(`[Observability ${reqId}] API ${config?.method?.toUpperCase()} ${config?.url} failed with status ${error.response.status}`);
        }

        if (error.response && error.response.status === 401 && config && !config._isRetry) {
            config._isRetry = true;
            const refreshToken = localStorage.getItem('tronix_refresh_token');
            if (refreshToken) {
                try {
                    const refreshBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const refreshRes = await axios.post(
                        `${refreshBaseUrl}/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
                        {},
                        { headers: { 'X-Request-ID': reqId } }
                    );
                    const newAccessToken = refreshRes.data?.access_token;
                    if (newAccessToken) {
                        localStorage.setItem('tronix_token', newAccessToken);
                        config.headers.Authorization = `Bearer ${newAccessToken}`;
                        return client(config);
                    }
                } catch (refreshErr) {
                    console.warn(`[Observability ${reqId}] Silent token refresh failed:`, refreshErr);
                    localStorage.removeItem('tronix_token');
                    localStorage.removeItem('tronix_refresh_token');
                    localStorage.removeItem('tronix_user');
                }
            }
        }
        return Promise.reject(error);
    }
);

export default client;
