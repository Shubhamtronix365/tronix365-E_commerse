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

    // Synchronize axios headers with token
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('tronix_token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('tronix_token');
        }
    }, [token]);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = localStorage.getItem('tronix_user');
            if (storedUser && token) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    
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
            }
            setIsLoading(false);
        };

        loadUser();
    }, []);

    const login = async (email, password, isAdmin = false) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            
            const endpoint = isAdmin ? '/admin/login' : '/login';
            const response = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { access_token, user_name, role } = response.data;
            
            setToken(access_token);
            const userData = { email, full_name: user_name, role };
            setUser(userData);
            localStorage.setItem('tronix_user', JSON.stringify(userData));
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
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
        signup,
        logout,
        setUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
