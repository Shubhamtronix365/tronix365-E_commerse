import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
    return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
    const { isAuthenticated, user, token } = useAuth();
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('tronix365_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const isMerging = useRef(false);

    // Sync with backend on login
    useEffect(() => {
        const syncCart = async () => {
            if (isAuthenticated && !isMerging.current) {
                isMerging.current = true;
                try {
                    // 1. Merge local cart with backend
                    if (cartItems.length > 0) {
                        const guestItems = cartItems.map(item => ({
                            product_id: item.id,
                            quantity: item.quantity,
                            selected: item.selected !== false
                        }));
                        await axios.post('/cart/merge', { items: guestItems });
                    }
                    
                    // 2. Fetch fresh cart from backend
                    const response = await axios.get('/cart');
                    const mergedItems = response.data.map(item => ({
                        ...item.product,
                        cart_item_id: item.id, // Store backend ID for updates
                        quantity: item.quantity,
                        selected: item.selected
                    }));
                    setCartItems(mergedItems);
                } catch (error) {
                    console.error("Failed to sync cart:", error);
                } finally {
                    isMerging.current = false;
                }
            }
        };

        syncCart();
    }, [isAuthenticated]);

    // Save to local storage for guests
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('tronix365_cart', JSON.stringify(cartItems));
        }
    }, [cartItems, isAuthenticated]);

    const addToCart = async (product, quantity = 1) => {
        if (isAuthenticated) {
            try {
                const response = await axios.post('/cart', {
                    product_id: product.id,
                    quantity,
                    selected: true
                });
                const newItem = {
                    ...response.data.product,
                    cart_item_id: response.data.id,
                    quantity: response.data.quantity,
                    selected: response.data.selected
                };
                
                setCartItems(prev => {
                    const exists = prev.find(item => item.id === product.id);
                    if (exists) {
                        return prev.map(item => item.id === product.id ? newItem : item);
                    }
                    return [...prev, newItem];
                });
                toast.success("Added to cart");
                return true;
            } catch (error) {
                toast.error(error.response?.data?.detail || "Failed to add to cart");
                return false;
            }
        }

        // Guest logic
        const existingItem = cartItems.find(item => item.id === product.id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        const maxAllowed = product.stock || 0;

        if (currentQty + quantity > maxAllowed) {
            toast.error(`Only ${maxAllowed} items available in stock`);
            return false;
        }

        setCartItems(prevItems => {
            const itemInCart = prevItems.find(item => item.id === product.id);
            if (itemInCart) {
                return prevItems.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity, selected: true }];
            }
        });
        toast.success("Added to cart");
        return true;
    };

    const removeFromCart = async (productId) => {
        if (isAuthenticated) {
            const item = cartItems.find(i => i.id === productId);
            if (item?.cart_item_id) {
                try {
                    await axios.delete(`/cart/${item.cart_item_id}`);
                } catch (error) {
                    console.error("Failed to remove from cart:", error);
                }
            }
        }
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const updateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        
        const item = cartItems.find(i => i.id === productId);
        if (!item) return;

        const maxAllowed = item.stock || 0;
        if (newQuantity > maxAllowed) {
            toast.error(`Only ${maxAllowed} items available in stock`);
            return;
        }

        if (isAuthenticated && item.cart_item_id) {
            try {
                await axios.put(`/cart/${item.cart_item_id}`, { quantity: newQuantity });
            } catch (error) {
                toast.error("Failed to update quantity");
                return;
            }
        }

        setCartItems(prevItems =>
            prevItems.map(i =>
                i.id === productId ? { ...i, quantity: newQuantity } : i
            )
        );
    };

    const toggleSelection = async (productId) => {
        const item = cartItems.find(i => i.id === productId);
        if (!item) return;

        const newSelected = !item.selected;

        if (isAuthenticated && item.cart_item_id) {
            try {
                await axios.put(`/cart/${item.cart_item_id}`, { selected: newSelected });
            } catch (error) {
                console.error("Failed to toggle selection:", error);
            }
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === productId ? { ...item, selected: newSelected } : item
            )
        );
    };

    const selectAll = (isSelected) => {
        setCartItems(prevItems =>
            prevItems.map(item => ({ ...item, selected: isSelected }))
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    // Calculate total ONLY for selected items
    const cartTotal = cartItems
        .filter(item => item.selected !== false) // Default to true if undefined
        .reduce((total, item) => total + (item.price * item.quantity), 0);

    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
    const selectedCount = cartItems.filter(item => item.selected !== false).length;
    const selectedItems = cartItems.filter(item => item.selected !== false);

    return (
        <CartContext.Provider value={{
            cartItems,
            selectedItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            toggleSelection,
            selectAll,
            clearCart,
            cartTotal,
            cartCount,
            selectedCount
        }}>
            {children}
        </CartContext.Provider>
    );
};
