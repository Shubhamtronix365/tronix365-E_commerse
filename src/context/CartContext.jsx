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
                        selected: item.selected,
                        bundle_id: item.bundle_id,
                        bundle: item.bundle
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
                    const exists = prev.find(item => item.id === product.id && !item.bundle_id);
                    if (exists) {
                        return prev.map(item => (item.id === product.id && !item.bundle_id) ? newItem : item);
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
        const existingItem = cartItems.find(item => item.id === product.id && !item.bundle_id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        const maxAllowed = product.stock || 0;

        if (currentQty + quantity > maxAllowed) {
            toast.error(`Only ${maxAllowed} items available in stock`);
            return false;
        }

        setCartItems(prevItems => {
            const itemInCart = prevItems.find(item => item.id === product.id && !item.bundle_id);
            if (itemInCart) {
                return prevItems.map(item =>
                    item.id === product.id && !item.bundle_id
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

    const addBundle = async (bundleId) => {
        if (!isAuthenticated) {
            toast.error("Please login to add bundles");
            return false;
        }

        try {
            await axios.post(`/cart/bundle/${bundleId}`);
            // Refetch cart to get updated items with bundle_ids
            const response = await axios.get('/cart');
            const mergedItems = response.data.map(item => ({
                ...item.product,
                cart_item_id: item.id,
                quantity: item.quantity,
                selected: item.selected,
                bundle_id: item.bundle_id,
                bundle: item.bundle
            }));
            setCartItems(mergedItems);
            toast.success("Bundle added to cart");
            return true;
        } catch (error) {
            toast.error("Failed to add bundle");
            return false;
        }
    };

    const removeFromCart = async (identifier) => {
        if (isAuthenticated) {
            const item = cartItems.find(i => (i.cart_item_id || i.id) === identifier);
            if (item?.cart_item_id) {
                try {
                    await axios.delete(`/cart/${item.cart_item_id}`);
                } catch (error) {
                    console.error("Failed to remove from cart:", error);
                }
            }
        }
        setCartItems(prevItems => prevItems.filter(item => (item.cart_item_id || item.id) !== identifier));
    };

    const updateQuantity = async (identifier, newQuantity) => {
        if (newQuantity < 1) return;
        
        const item = cartItems.find(i => (i.cart_item_id || i.id) === identifier);
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
                (i.cart_item_id || i.id) === identifier ? { ...i, quantity: newQuantity } : i
            )
        );
    };

    const toggleSelection = async (identifier) => {
        const item = cartItems.find(i => (i.cart_item_id || i.id) === identifier);
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
                (item.cart_item_id || item.id) === identifier ? { ...item, selected: newSelected } : item
            )
        );
    };

    const removeBundle = async (bundleId) => {
        if (!isAuthenticated) return;
        const itemsToRemove = cartItems.filter(i => i.bundle_id === bundleId);
        
        try {
            await Promise.all(
                itemsToRemove.map(item => 
                    item.cart_item_id ? axios.delete(`/cart/${item.cart_item_id}`) : Promise.resolve()
                )
            );
        } catch (error) {
            console.error("Failed to remove bundle:", error);
        }
        setCartItems(prev => prev.filter(i => i.bundle_id !== bundleId));
    };

    const updateBundleQuantity = async (bundleId, newQuantity) => {
        if (!isAuthenticated || newQuantity < 1) return;
        
        const bundleItems = cartItems.filter(i => i.bundle_id === bundleId);
        if (bundleItems.length === 0) return;

        // Check stock for all items
        const outOfStockItem = bundleItems.find(i => newQuantity > (i.stock || 0));
        if (outOfStockItem) {
            toast.error(`Not enough stock for ${outOfStockItem.title}`);
            return;
        }

        try {
            await Promise.all(
                bundleItems.map(item =>
                    item.cart_item_id ? axios.put(`/cart/${item.cart_item_id}`, { quantity: newQuantity }) : Promise.resolve()
                )
            );
        } catch (error) {
            toast.error("Failed to update bundle quantity");
            return;
        }

        setCartItems(prevItems =>
            prevItems.map(i =>
                i.bundle_id === bundleId ? { ...i, quantity: newQuantity } : i
            )
        );
    };

    const toggleBundleSelection = async (bundleId) => {
        if (!isAuthenticated) return;
        const bundleItems = cartItems.filter(i => i.bundle_id === bundleId);
        if (bundleItems.length === 0) return;
        
        const newSelected = !bundleItems[0].selected;

        try {
            await Promise.all(
                bundleItems.map(item =>
                    item.cart_item_id ? axios.put(`/cart/${item.cart_item_id}`, { selected: newSelected }) : Promise.resolve()
                )
            );
        } catch (error) {
            console.error("Failed to toggle bundle selection:", error);
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.bundle_id === bundleId ? { ...item, selected: newSelected } : item
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
    const calculateTotals = () => {
        let subtotal = 0;
        let bundleDiscounts = 0;
        const bundlesProcessed = new Set();

        cartItems.filter(item => item.selected !== false).forEach(item => {
            const effectivePrice = item.price || item.sale_price || 0;
            subtotal += effectivePrice * item.quantity;
            
            // If item is part of a bundle and we haven't processed this bundle yet
            if (item.bundle_id && item.bundle && !bundlesProcessed.has(item.bundle_id)) {
                const discountPerBundle = item.bundle.original_price - item.bundle.bundle_price;
                // We assume quantity 1 for the bundle itself for now, or match it to the item quantity
                // Since all items in a bundle added together have same quantity in our logic
                bundleDiscounts += discountPerBundle * item.quantity;
                bundlesProcessed.add(item.bundle_id);
            }
        });

        return {
            subtotal,
            bundleDiscounts,
            total: subtotal - bundleDiscounts
        };
    };

    const { subtotal, bundleDiscounts, total: cartTotal } = calculateTotals();

    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
    const selectedCount = cartItems.filter(item => item.selected !== false).length;
    const selectedItems = cartItems.filter(item => item.selected !== false);

    return (
        <CartContext.Provider value={{
            cartItems,
            selectedItems,
            addToCart,
            addBundle,
            removeBundle,
            updateBundleQuantity,
            toggleBundleSelection,
            removeFromCart,
            updateQuantity,
            toggleSelection,
            selectAll,
            clearCart,
            cartTotal,
            subtotal,
            bundleDiscounts,
            cartCount,
            selectedCount
        }}>
            {children}
        </CartContext.Provider>
    );
};
