import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuth } from './AuthContext';
import { roundToTwo } from '../utils/priceUtils';

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

    const [cartWarnings, setCartWarnings] = useState([]);

    const syncCart = async () => {
        if (isAuthenticated) {
            if (isMerging.current) return;
            isMerging.current = true;
            try {
                // 1. Merge local cart with backend if items exist
                const savedCart = localStorage.getItem('tronix365_cart');
                const localItems = savedCart ? JSON.parse(savedCart) : [];
                if (localItems.length > 0) {
                    const guestItems = localItems.map(item => ({
                        product_id: item.id,
                        quantity: item.quantity,
                        selected: item.selected !== false,
                        bundle_id: item.bundle_id || null
                    }));
                    await client.post('/cart/merge', { items: guestItems });
                    localStorage.removeItem('tronix365_cart');
                }
                
                // 2. Fetch fresh cart from backend
                const response = await client.get('/cart');
                
                // Check for backend warnings header
                const warningsHeader = response.headers && (response.headers['x-cart-warnings'] || response.headers['X-Cart-Warnings']);
                if (warningsHeader) {
                    try {
                        const decoded = decodeURIComponent(warningsHeader);
                        setCartWarnings(decoded.split('; '));
                        toast(decoded, {
                            icon: '⚠️',
                            duration: 6000,
                            style: {
                                background: '#1e293b',
                                color: '#f8fafc',
                                border: '1px solid #f59e0b'
                            }
                        });
                    } catch (e) {}
                }

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
                if (error.response?.status !== 401) {
                    console.error("Failed to sync cart:", error);
                }
            } finally {
                isMerging.current = false;
            }
        } else {
            // Guest user: validate any bundles against active bundles
            try {
                const hasBundles = cartItems.some(i => i.bundle_id);
                if (hasBundles) {
                    const bundlesRes = await client.get('/bundles');
                    const activeBundleMap = new Map((bundlesRes.data || []).map(b => [b.id, b]));
                    let hadInvalidBundle = false;
                    const validated = cartItems.map(item => {
                        if (item.bundle_id) {
                            const activeBundle = activeBundleMap.get(item.bundle_id);
                            if (!activeBundle) {
                                hadInvalidBundle = true;
                                return { ...item, bundle_id: null, bundle: null };
                            }
                            return { ...item, bundle: activeBundle };
                        }
                        return item;
                    });
                    if (hadInvalidBundle) {
                        setCartItems(validated);
                        localStorage.setItem('tronix365_cart', JSON.stringify(validated));
                        const warning = "A promotional bundle in your cart has expired or ended. The items remain in your cart at regular price.";
                        setCartWarnings(prev => [...prev, warning]);
                        toast(warning, {
                            icon: '⚠️',
                            duration: 6000,
                            style: {
                                background: '#1e293b',
                                color: '#f8fafc',
                                border: '1px solid #f59e0b'
                            }
                        });
                    }
                }
            } catch (e) {}
        }
    };

    // Sync on auth changes
    useEffect(() => {
        syncCart();
    }, [isAuthenticated]);

    // Save to local storage for guests
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('tronix365_cart', JSON.stringify(cartItems));
        }
    }, [cartItems, isAuthenticated]);

    const addToCart = async (product, quantity = 1) => {
        const numQty = Math.max(1, parseInt(quantity, 10) || 1);
        const existingItem = cartItems.find(item => item.id === product.id && !item.bundle_id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        const maxAllowed = product.stock || 0;

        if (maxAllowed > 0 && (currentQty + numQty) > maxAllowed) {
            toast.error(`Only ${maxAllowed} items available in stock (${currentQty} already in your cart)`);
            return false;
        }

        if (isAuthenticated) {
            try {
                const response = await client.post('/cart', {
                    product_id: product.id,
                    quantity: numQty,
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
        setCartItems(prevItems => {
            const itemInCart = prevItems.find(item => item.id === product.id && !item.bundle_id);
            if (itemInCart) {
                return prevItems.map(item =>
                    item.id === product.id && !item.bundle_id
                        ? { ...item, quantity: item.quantity + numQty }
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity: numQty, selected: true }];
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
            await client.post(`/cart/bundle/${bundleId}`);
            // Refetch cart to get updated items with bundle_ids
            const response = await client.get('/cart');
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
        const item = cartItems.find(i => i.cart_item_id === identifier || i.id === identifier);
        if (isAuthenticated && item?.cart_item_id) {
            try {
                await client.delete(`/cart/${item.cart_item_id}`);
            } catch (error) {
                console.error("Failed to remove from cart:", error);
            }
        }
        setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== identifier && item.id !== identifier));
    };

    const updateQuantity = async (identifier, newQuantity) => {
        const numQty = parseInt(newQuantity, 10);
        if (isNaN(numQty) || numQty < 1) return;
        
        const item = cartItems.find(i => i.cart_item_id === identifier || i.id === identifier);
        if (!item) return;

        const maxAllowed = item.stock || 0;
        if (maxAllowed > 0 && numQty > maxAllowed) {
            toast.error(`Only ${maxAllowed} items available in stock`);
            return;
        }

        if (isAuthenticated && item.cart_item_id) {
            try {
                await client.put(`/cart/${item.cart_item_id}`, { quantity: numQty });
            } catch (error) {
                toast.error("Failed to update quantity");
                return;
            }
        }

        setCartItems(prevItems =>
            prevItems.map(i =>
                (i.cart_item_id === identifier || i.id === identifier) ? { ...i, quantity: numQty } : i
            )
        );
    };

    const toggleSelection = async (identifier) => {
        const item = cartItems.find(i => (i.cart_item_id || i.id) === identifier);
        if (!item) return;

        const newSelected = !item.selected;

        if (isAuthenticated && item.cart_item_id) {
            try {
                await client.put(`/cart/${item.cart_item_id}`, { selected: newSelected });
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
                    item.cart_item_id ? client.delete(`/cart/${item.cart_item_id}`) : Promise.resolve()
                )
            );
        } catch (error) {
            console.error("Failed to remove bundle:", error);
        }
        setCartItems(prev => prev.filter(i => i.bundle_id !== bundleId));
    };

    const updateBundleQuantity = async (bundleId, newQuantity) => {
        const numQty = parseInt(newQuantity, 10);
        if (!isAuthenticated || isNaN(numQty) || numQty < 1) return;
        
        const bundleItems = cartItems.filter(i => i.bundle_id === bundleId);
        if (bundleItems.length === 0) return;

        // Check stock for all items
        const outOfStockItem = bundleItems.find(i => numQty > (i.stock || 0));
        if (outOfStockItem) {
            toast.error(`Not enough stock for ${outOfStockItem.title} (Max: ${outOfStockItem.stock || 0})`);
            return;
        }

        try {
            await Promise.all(
                bundleItems.map(item =>
                    item.cart_item_id ? client.put(`/cart/${item.cart_item_id}`, { quantity: numQty }) : Promise.resolve()
                )
            );
        } catch (error) {
            toast.error("Failed to update bundle quantity");
            return;
        }

        setCartItems(prevItems =>
            prevItems.map(i =>
                i.bundle_id === bundleId ? { ...i, quantity: numQty } : i
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
                    item.cart_item_id ? client.put(`/cart/${item.cart_item_id}`, { selected: newSelected }) : Promise.resolve()
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

    const clearCart = async () => {
        if (isAuthenticated) {
            try {
                await client.delete('/cart');
            } catch (error) {
                console.error("Failed to clear cart on backend:", error);
            }
        }
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
                const isBundleExpired = item.bundle.expiry_date && new Date(item.bundle.expiry_date) < new Date();
                const isBundleInactive = item.bundle.is_active === false;
                if (!isBundleExpired && !isBundleInactive) {
                    const discountPerBundle = (item.bundle.original_price || 0) - (item.bundle.bundle_price || 0);
                    if (discountPerBundle > 0) {
                        bundleDiscounts += discountPerBundle * item.quantity;
                    }
                    bundlesProcessed.add(item.bundle_id);
                }
            }
        });

        return {
            subtotal: roundToTwo(subtotal),
            bundleDiscounts: roundToTwo(bundleDiscounts),
            total: Math.max(0, roundToTwo(subtotal - bundleDiscounts))
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
            syncCart,
            cartWarnings,
            clearCartWarnings: () => setCartWarnings([]),
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
