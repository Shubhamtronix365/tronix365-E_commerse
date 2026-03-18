import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
    return useContext(WishlistContext);
};

export const WishlistProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [wishlistItems, setWishlistItems] = useState(() => {
        try {
            const savedWishlist = localStorage.getItem('tronix365_wishlist');
            return savedWishlist ? JSON.parse(savedWishlist) : [];
        } catch (error) {
            console.error('Error loading wishlist:', error);
            return [];
        }
    });

    // Sync from backend on login
    useEffect(() => {
        const fetchWishlist = async () => {
            if (isAuthenticated) {
                try {
                    const response = await axios.get('/wishlist');
                    const items = response.data.map(item => ({
                        ...item.product,
                        wishlist_item_id: item.id
                    }));
                    setWishlistItems(items);
                } catch (error) {
                    console.error("Failed to fetch wishlist:", error);
                }
            }
        };
        fetchWishlist();
    }, [isAuthenticated]);

    // Save to local storage for guests
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('tronix365_wishlist', JSON.stringify(wishlistItems));
        }
    }, [wishlistItems, isAuthenticated]);

    const addToWishlist = async (product) => {
        if (isAuthenticated) {
            try {
                const response = await axios.post('/wishlist', { product_id: product.id });
                const newItem = {
                    ...response.data.product,
                    wishlist_item_id: response.data.id
                };
                setWishlistItems(prev => {
                    if (prev.some(item => item.id === product.id)) return prev;
                    return [...prev, newItem];
                });
            } catch (error) {
                console.error("Failed to add to wishlist:", error);
            }
            return;
        }

        setWishlistItems(prevItems => {
            if (prevItems.some(item => item.id === product.id)) {
                return prevItems;
            }
            return [...prevItems, product];
        });
    };

    const removeFromWishlist = async (productId) => {
        if (isAuthenticated) {
            try {
                await axios.delete(`/wishlist/${productId}`);
            } catch (error) {
                console.error("Failed to remove from wishlist:", error);
            }
        }
        setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const toggleWishlist = (product) => {
        if (isInWishlist(product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    };

    const isInWishlist = (productId) => {
        return wishlistItems.some(item => item.id === parseInt(productId));
    };

    const clearWishlist = () => {
        setWishlistItems([]);
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            toggleWishlist,
            isInWishlist,
            clearWishlist
        }}>
            {children}
        </WishlistContext.Provider>
    );
};
