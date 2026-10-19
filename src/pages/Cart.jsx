import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, Zap, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/imageUtils';
import { calculateTaxAndTotals, formatCurrency, formatPrice } from '../utils/priceUtils';

/**
 * Resilient Cart Quantity Stepper:
 * - Allows full backspacing and clearing without snapping back to 1.
 * - Supports typing multi-digit numbers (e.g. 22, 55).
 * - Enforces minimum 1 and maximum stock limit.
 * - Debounces rapid typing commits to avoid unnecessary API round-trips.
 * - Sanitizes on blur, Enter key, and button clicks.
 */
const CartQuantityStepper = ({
    value,
    min = 1,
    max = 9999,
    onCommit,
    disabled = false,
    label = 'quantity'
}) => {
    const [localVal, setLocalVal] = useState(String(value ?? 1));
    const debounceTimerRef = useRef(null);

    // Keep local string in sync if external value changes (e.g. initial load, cart refresh)
    useEffect(() => {
        setLocalVal(String(value ?? 1));
    }, [value]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const commit = (num) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        const safeMin = Math.max(1, min);
        const safeMax = Math.max(safeMin, max);
        const clamped = Math.min(safeMax, Math.max(safeMin, num));
        setLocalVal(String(clamped));
        if (clamped !== value) {
            onCommit(clamped);
        }
    };

    const handleInputChange = (e) => {
        const raw = e.target.value;
        // 1. Allow full backspace to empty string so user can type new numbers cleanly
        if (raw === '') {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            setLocalVal('');
            return;
        }

        // 2. Reject non-digits (+, -, e, ., symbols)
        if (!/^\d+$/.test(raw)) return;

        // 3. Normalize leading zero (e.g. "05" -> "5")
        const normalized = raw.length > 1 && raw.startsWith('0')
            ? String(parseInt(raw, 10))
            : raw;

        setLocalVal(normalized);

        const parsed = parseInt(normalized, 10);
        if (isNaN(parsed)) return;

        const safeMax = Math.max(min, max);
        if (parsed > safeMax) {
            toast.error(`Only ${safeMax} items available in stock`, { id: `stock-limit-${label}` });
            setLocalVal(String(safeMax));
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            onCommit(safeMax);
            return;
        }

        if (parsed >= min) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                onCommit(parsed);
            }, 350);
        }
    };

    const handleBlur = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        const parsed = parseInt(localVal, 10);
        if (localVal === '' || isNaN(parsed) || parsed < min) {
            commit(min);
        } else {
            commit(parsed);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleDecrement = () => {
        const current = parseInt(localVal, 10) || value || min;
        if (current > min) {
            commit(current - 1);
        }
    };

    const handleIncrement = () => {
        const current = parseInt(localVal, 10) || value || min;
        const safeMax = Math.max(min, max);
        if (current < safeMax) {
            commit(current + 1);
        } else {
            toast.error(`Only ${safeMax} items available in stock`, { id: `stock-limit-${label}` });
        }
    };

    const currentNum = parseInt(localVal, 10) || value || min;
    const safeMax = Math.max(min, max);
    const isAtMin = currentNum <= min;
    const isAtMax = currentNum >= safeMax;

    return (
        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.04] sm:bg-white/5 rounded-xl p-0.5 sm:p-1 border border-white/10 sm:border-white/5">
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || isAtMin}
                className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] rounded-lg bg-white/5 flex items-center justify-center transition-all active:scale-90 ${
                    disabled || isAtMin
                        ? 'text-gray-600 cursor-not-allowed opacity-50'
                        : 'text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20'
                }`}
                aria-label={`Decrease ${label}`}
            >
                <Minus size={15} />
            </button>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled}
                value={localVal}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-14 sm:w-12 py-1 sm:py-0.5 text-center text-white font-bold text-base sm:text-sm bg-transparent border-x border-white/10 focus:outline-none focus:bg-white/5"
                aria-label={`Cart ${label}`}
            />
            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || isAtMax}
                className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] rounded-lg bg-white/5 flex items-center justify-center transition-all active:scale-90 ${
                    disabled || isAtMax
                        ? 'text-gray-600 cursor-not-allowed opacity-50'
                        : 'text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20'
                }`}
                aria-label={`Increase ${label}`}
            >
                <Plus size={15} />
            </button>
        </div>
    );
};

const Cart = () => {
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        removeBundle,
        updateBundleQuantity,
        toggleBundleSelection,
        cartTotal,
        subtotal,
        bundleDiscounts,
        clearCart,
        toggleSelection,
        selectAll,
        selectedCount,
        cartWarnings,
        clearCartWarnings
    } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [recoveryBanner, setRecoveryBanner] = useState(null);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('recovered') === 'true') {
            setRecoveryBanner(true);
            toast.success(`Welcome back! Your cart items are saved and ready for checkout.`, {
                duration: 5000,
                icon: '🛒'
            });
        }
    }, [location.search]);

    // ── Shipping Options ──────────────────────────────────────────────────────
    const SHIPPING_OPTIONS = [
        {
            id: 'express',
            label: 'Express Shipping',
            desc: '2 to 5 Working Days (Below 2Kg)',
            cost: 149,
            icon: Zap,
        },
        {
            id: 'surface',
            label: 'Surface Shipping',
            desc: '4 to 7 Working Days',
            cost: 69,
            icon: Truck,
        },
        {
            id: 'pickup',
            label: 'Store Pickup (Pune Office)',
            desc: '9:30 AM to 6:00 PM',
            cost: 0,
            icon: Store,
        },
    ];

    // Default to surface; restore from session if user navigated back
    const [selectedShipping, setSelectedShipping] = useState(() => {
        try {
            return sessionStorage.getItem('tronix_shipping') || 'surface';
        } catch { return 'surface'; }
    });

    const handleShippingChange = (id) => {
        setSelectedShipping(id);
        try { sessionStorage.setItem('tronix_shipping', id); } catch {}
    };

    const activeShipping = SHIPPING_OPTIONS.find(o => o.id === selectedShipping) || SHIPPING_OPTIONS[1];

    const standaloneItems = cartItems.filter(item => !item.bundle_id);
    const bundleGroups = cartItems.filter(item => item.bundle_id).reduce((acc, item) => {
        if (!acc[item.bundle_id]) {
            acc[item.bundle_id] = {
                id: item.bundle_id,
                bundle_name: item.bundle?.name || 'Product Bundle',
                original_price: item.bundle?.original_price || 0,
                bundle_price: item.bundle?.bundle_price || 0,
                quantity: item.quantity,
                selected: item.selected !== false,
                items: []
            };
        }
        acc[item.bundle_id].items.push(item);
        return acc;
    }, {});

    const handleCheckout = () => {
        if (!isAuthenticated) {
            toast.error('Please login to proceed to checkout');
            navigate('/login', { state: { from: '/checkout' } });
            return;
        }
        if (selectedCount === 0) {
            toast.error('Please select at least one item to checkout');
            return;
        }
        // Persist chosen shipping so Checkout page can pre-select it
        try { sessionStorage.setItem('tronix_shipping', selectedShipping); } catch {}
        navigate('/checkout');
    };

    const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected !== false);

    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-32 lg:pb-12 px-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-6 sm:mb-8">Shopping Cart</h1>

                {recoveryBanner && (
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/40 border border-purple-500/40 flex items-center justify-between gap-4 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🛒</span>
                            <div>
                                <p className="text-white font-semibold text-sm">Welcome Back to Your Cart!</p>
                                <p className="text-xs text-gray-300">
                                    We preserved all your items. You can proceed directly to checkout whenever you're ready.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRecoveryBanner(false)}
                            className="text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {cartWarnings && cartWarnings.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start justify-between gap-3 shadow-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <h4 className="font-semibold text-sm text-amber-300">Cart Update Notification</h4>
                                {cartWarnings.map((warning, idx) => (
                                    <p key={idx} className="text-xs text-amber-200/90 mt-0.5">{warning}</p>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={clearCartWarnings}
                            className="text-amber-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Select All Header */}
                        <div className="bg-tronix-card/50 border border-white/5 rounded-xl p-4 flex items-center gap-4 mb-4">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => selectAll(e.target.checked)}
                                className="w-5 h-5 accent-tronix-primary bg-white/10 border-white/20 rounded cursor-pointer"
                            />
                            <span className="text-gray-300 font-medium">Select All ({cartItems.length} items)</span>
                        </div>

                        {standaloneItems.map((item) => (
                            <motion.div
                                key={item.cart_item_id || item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-tronix-card/50 border ${item.selected !== false ? 'border-tronix-primary/50' : 'border-white/5'} rounded-xl p-3 sm:p-4 flex gap-2.5 sm:gap-4 items-start sm:items-center transition-colors`}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.selected !== false}
                                    onChange={() => toggleSelection(item.cart_item_id || item.id)}
                                    className="w-5 h-5 accent-tronix-primary bg-white/10 border-white/20 rounded cursor-pointer shrink-0 mt-1 sm:mt-0"
                                />

                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-lg flex items-center justify-center p-2 shrink-0">
                                    <img src={getImageUrl(item.image)} alt={item.title} className={`max-w-full max-h-full object-contain ${item.selected === false ? 'opacity-50 grayscale' : ''}`} />
                                </div>

                                <div className="flex flex-col sm:flex-row flex-1 min-w-0 sm:items-center gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-medium text-sm sm:text-base line-clamp-2 sm:truncate ${item.selected === false ? 'text-gray-500' : 'text-white'}`}>{item.title}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs sm:text-sm text-gray-400">{item.category}</p>
                                        </div>
                                        <div className={`mt-1 sm:mt-2 text-base sm:text-lg font-bold ${item.selected === false ? 'text-gray-600' : 'text-tronix-accent'}`}>₹{formatPrice(item.price)}</div>
                                    </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto">
                                        <CartQuantityStepper
                                            value={item.quantity}
                                            min={1}
                                            max={typeof item.stock === 'number' && item.stock > 0 ? item.stock : 9999}
                                            onCommit={(newQty) => updateQuantity(item.cart_item_id || item.id, newQty)}
                                            label="item quantity"
                                        />

                                        <button
                                            onClick={() => removeFromCart(item.cart_item_id || item.id)}
                                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
                                            aria-label="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {Object.values(bundleGroups).map((group) => (
                            <motion.div
                                key={`bundle-${group.id}`}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-tronix-primary/5 border ${group.selected ? 'border-tronix-primary/50' : 'border-tronix-primary/20'} rounded-xl p-3 sm:p-4 transition-colors relative overflow-hidden`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-tronix-primary/10 to-transparent opacity-30 pointer-events-none" />

                                <div className="flex gap-2.5 sm:gap-4 items-start relative z-10">
                                    <input
                                        type="checkbox"
                                        checked={group.selected}
                                        onChange={() => toggleBundleSelection(group.id)}
                                        className="w-5 h-5 accent-tronix-primary bg-white/10 border-white/20 rounded cursor-pointer shrink-0 mt-1"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-tronix-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                        Bundle Deal
                                                    </span>
                                                </div>
                                                <h3 className={`font-bold text-lg ${group.selected === false ? 'text-gray-500' : 'text-white'}`}>
                                                    {group.bundle_name}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm text-gray-500 line-through block">₹{formatPrice(group.original_price)}</span>
                                                <span className={`text-xl font-bold ${group.selected === false ? 'text-gray-600' : 'text-tronix-accent'}`}>
                                                    ₹{formatPrice(group.bundle_price)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {group.items.map(bi => (
                                                <div key={bi.cart_item_id || bi.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 pr-3 border border-white/5">
                                                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center p-1">
                                                        <img src={getImageUrl(bi.image)} alt={bi.title} className={`max-w-full max-h-full object-contain ${group.selected === false ? 'opacity-50 grayscale' : ''}`} />
                                                    </div>
                                                    <span className={`text-xs font-medium ${group.selected === false ? 'text-gray-500' : 'text-gray-300'}`}>{bi.title}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3.5 mt-2">
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const maxBundleStock = group.items.length > 0
                                                        ? Math.min(...group.items.map(bi => (typeof bi.stock === 'number' && bi.stock >= 0 ? bi.stock : 9999)))
                                                        : 9999;
                                                    return (
                                                        <CartQuantityStepper
                                                            value={group.quantity}
                                                            min={1}
                                                            max={maxBundleStock}
                                                            onCommit={(newQty) => updateBundleQuantity(group.id, newQty)}
                                                            label="bundle quantity"
                                                        />
                                                    );
                                                })()}
                                                <span className="text-[11px] sm:text-xs text-gray-500">Applies to all bundle items</span>
                                            </div>

                                            <button
                                                onClick={() => removeBundle(group.id)}
                                                className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
                                                aria-label="Remove bundle"
                                            >
                                                <Trash2 size={15} />
                                                <span>Remove Bundle</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={clearCart}
                                className="text-sm text-red-500 hover:text-red-400 hover:underline transition-colors"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-tronix-card border border-white/5 rounded-2xl p-6 sticky top-24">
                            <h3 className="font-display font-bold text-xl text-white mb-6">Cart Totals</h3>

                            {/* Subtotal */}
                            <div className="space-y-3 mb-4 pb-4 border-b border-white/5">
                                <div className="flex justify-between text-gray-400">
                                    <span>Subtotal ({selectedCount} items)</span>
                                    <span className="text-white">₹{formatCurrency(cartTotal)}</span>
                                </div>
                                {bundleDiscounts > 0 && (
                                    <div className="flex justify-between text-emerald-400 font-medium">
                                        <span>Bundle Savings</span>
                                        <span>- ₹{formatCurrency(bundleDiscounts)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Shipping Options */}
                            <div className="mb-4 pb-4 border-b border-white/5">
                                <p className="text-gray-400 text-sm font-semibold mb-3">Shipment</p>
                                <div className="space-y-2">
                                    {SHIPPING_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        const isActive = selectedShipping === opt.id;
                                        return (
                                            <label
                                                key={opt.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    isActive
                                                        ? 'border-tronix-primary/60 bg-tronix-primary/10'
                                                        : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="cart_shipping"
                                                    value={opt.id}
                                                    checked={isActive}
                                                    onChange={() => handleShippingChange(opt.id)}
                                                    className="accent-tronix-primary mt-0.5 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Icon size={13} className={isActive ? 'text-tronix-primary' : 'text-gray-500'} />
                                                        <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                            {opt.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                                                </div>
                                                <span className={`text-sm font-bold shrink-0 ${
                                                    opt.cost === 0 ? 'text-emerald-400' : (isActive ? 'text-tronix-accent' : 'text-gray-400')
                                                }`}>
                                                    {opt.cost === 0 ? 'FREE' : `₹${formatPrice(opt.cost)}`}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CGST + SGST Breakdown */}
                            {(() => {
                                const { cgst, sgst, grandTotal } = calculateTaxAndTotals(cartTotal, activeShipping.cost);
                                return (
                                    <>
                                        <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                                            <div className="flex justify-between text-gray-400 text-sm">
                                                <span>CGST (9%)</span>
                                                <span className="text-white">₹{formatCurrency(cgst)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-400 text-sm">
                                                <span>SGST (9%)</span>
                                                <span className="text-white">₹{formatCurrency(sgst)}</span>
                                            </div>
                                            {activeShipping.cost > 0 && (
                                                <div className="flex justify-between text-gray-400 text-sm">
                                                    <span>Shipping ({activeShipping.label})</span>
                                                    <span className="text-white">₹{formatPrice(activeShipping.cost)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between text-lg font-bold text-white mb-8">
                                            <span>Total</span>
                                            <span className="text-tronix-accent">₹{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </>
                                );
                            })()}

                            <button
                                onClick={handleCheckout}
                                disabled={selectedCount === 0}
                                className={`w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg ${
                                    selectedCount === 0
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20 group'
                                }`}
                            >
                                Proceed to Checkout
                                {selectedCount > 0 && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <p className="text-center text-xs text-gray-500 mt-4">
                                {selectedCount === 0 ? 'Select items to checkout' : 'Secure Checkout — 256-bit Encryption'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Bottom Checkout Bar */}
            {cartItems.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 shadow-2xl safe-area-bottom">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                            </span>
                            <div className="text-lg font-black text-white leading-tight">
                                ₹{formatCurrency(calculateTaxAndTotals(cartTotal, activeShipping.cost).grandTotal)}
                            </div>
                            <span className="text-[10px] text-gray-500">Incl. GST & Shipping</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={selectedCount === 0}
                            className={`flex-1 font-bold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg active:scale-95 ${
                                selectedCount === 0
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/25'
                            }`}
                        >
                            <span>Checkout</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
