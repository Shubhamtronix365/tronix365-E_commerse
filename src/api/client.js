import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 30000, // 30 second timeout to accommodate Render cold starts
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('tronix_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors and auto-retry cold starts
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        
        // Retry logic for Network Errors or 502/503/504 (Render cold-start wakeups)
        if (config && (!config._retryCount || config._retryCount < 2)) {
            if (!error.response || [502, 503, 504].includes(error.response.status)) {
                config._retryCount = (config._retryCount || 0) + 1;
                console.log(`Backend waking up... retrying request (${config._retryCount}/2)`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return client(config);
            }
        }

        if (error.response && error.response.status === 401) {
            // Optional: trigger logout or refresh token logic if needed
        }
        return Promise.reject(error);
    }
);

export default client;
