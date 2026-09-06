import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

// Set base URL for axios based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.baseURL = API_URL;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('tronix_token'));
    const [isLoading, setIsLoading] = useState(true);

    // Synchronize axios headers and load/verify user profile
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                // Ensure header is updated immediately before any API call
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                localStorage.setItem('tronix_token', token);

                const storedUser = localStorage.getItem('tronix_user');
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                    } catch (e) {
                        console.error("Failed to parse stored user:", e);
                    }
                }

                try {
                    // Verify token/fetch fresh profile
                    const response = await axios.get('/profile');
                    setUser(response.data);
                    localStorage.setItem('tronix_user', JSON.stringify(response.data));
                } catch (error) {
                    console.error("Failed to load user profile:", error);
                    if (error.response?.status === 401) {
                        logout();
                    }
                }
            } else {
                delete axios.defaults.headers.common['Authorization'];
                localStorage.removeItem('tronix_token');
            }
            setIsLoading(false);
        };
        loadUser();
    }, [token]);

    const login = async (email, password, isAdmin = false) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            
            const endpoint = isAdmin ? '/admin/login' : '/login';
            const response = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            
            if (response.data.status === 'otp_required') {
                return { success: true, otpRequired: true, email: response.data.email };
            }
            
            const { access_token, user_name, role } = response.data;
            
            setToken(access_token);
            const userData = { email, full_name: user_name, role };
            setUser(userData);
            localStorage.setItem('tronix_user', JSON.stringify(userData));
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                statusCode: error.response?.status,
                message: error.response?.data?.detail || "Login failed" 
            };
        }
    };

    const signup = async (userData) => {
        try {
            const response = await axios.post('/signup', userData);
            // Auto login after signup if the API returns a token, 
            // otherwise the user will redirect to login page.
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.detail || "Signup failed" 
            };
        }
    };

    const loginWithGoogle = async (credential) => {
        try {
            const response = await axios.post('/auth/google', { credential });
            const { access_token, user_name, role, email } = response.data;
            
            setToken(access_token);
            const userData = { email, full_name: user_name, role };
            setUser(userData);
            localStorage.setItem('tronix_user', JSON.stringify(userData));
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.detail || "Google Login failed" 
            };
        }
    };

    const loginWithOTPResponse = (otpResponseData) => {
        const { access_token, user_name, role, email } = otpResponseData;
        setToken(access_token);
        const userData = { email, full_name: user_name, role };
        setUser(userData);
        localStorage.setItem('tronix_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('tronix_user');
        localStorage.removeItem('tronix_token');
        localStorage.removeItem('tronix365_cart');
        localStorage.removeItem('tronix365_wishlist');
        // Notify other tabs
        window.dispatchEvent(new Event('storage'));
    };

    const value = {
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        setUser,
        loginWithOTPResponse
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
