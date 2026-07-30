import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, Zap, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/imageUtils';

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
        selectedCount
    } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

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
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-display font-bold text-white mb-8">Shopping Cart</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                                className={`bg-tronix-card/50 border ${item.selected !== false ? 'border-tronix-primary/50' : 'border-white/5'} rounded-xl p-4 flex gap-4 items-center transition-colors`}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.selected !== false}
                                    onChange={() => toggleSelection(item.cart_item_id || item.id)}
                                    className="w-5 h-5 accent-tronix-primary bg-white/10 border-white/20 rounded cursor-pointer shrink-0"
                                />

                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-lg flex items-center justify-center p-2 shrink-0">
                                    <img src={getImageUrl(item.image)} alt={item.title} className={`max-w-full max-h-full object-contain ${item.selected === false ? 'opacity-50 grayscale' : ''}`} />
                                </div>

                                <div className="flex flex-col sm:flex-row flex-1 min-w-0 sm:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-medium truncate ${item.selected === false ? 'text-gray-500' : 'text-white'}`}>{item.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-400">{item.category}</p>
                                        </div>
                                        <div className={`mt-2 font-bold ${item.selected === false ? 'text-gray-600' : 'text-tronix-accent'}`}>₹{item.price}</div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.cart_item_id || item.id, item.quantity - 1)}
                                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.cart_item_id || item.id, item.quantity + 1)}
                                                disabled={item.quantity >= item.stock}
                                                className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors ${item.quantity >= item.stock ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.cart_item_id || item.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
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
                                className={`bg-tronix-primary/5 border ${group.selected ? 'border-tronix-primary/50' : 'border-tronix-primary/20'} rounded-xl p-4 transition-colors relative overflow-hidden`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-tronix-primary/10 to-transparent opacity-30 pointer-events-none" />

                                <div className="flex gap-4 items-start relative z-10">
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
                                                <span className="text-sm text-gray-500 line-through block">₹{group.original_price}</span>
                                                <span className={`text-xl font-bold ${group.selected === false ? 'text-gray-600' : 'text-tronix-accent'}`}>
                                                    ₹{group.bundle_price}
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

                                        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateBundleQuantity(group.id, group.quantity - 1)}
                                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center text-white font-medium">{group.quantity}</span>
                                                    <button
                                                        onClick={() => updateBundleQuantity(group.id, group.quantity + 1)}
                                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors text-gray-400 hover:text-white hover:bg-white/10"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <span className="hidden sm:inline text-xs text-gray-500">Applies to all bundle items</span>
                                            </div>

                                            <button
                                                onClick={() => removeBundle(group.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-medium"
                                            >
                                                <Trash2 size={16} /> <span className="hidden sm:inline">Remove Bundle</span>
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
                                    <span className="text-white">₹{cartTotal}</span>
                                </div>
                                {bundleDiscounts > 0 && (
                                    <div className="flex justify-between text-emerald-400 font-medium">
                                        <span>Bundle Savings</span>
                                        <span>- ₹{bundleDiscounts}</span>
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
                                                    {opt.cost === 0 ? 'FREE' : `₹${opt.cost}`}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CGST + SGST Breakdown */}
                            {(() => {
                                const taxableBase = cartTotal; // after bundle discounts, before GST
                                const cgst = Math.round(taxableBase * 0.09);
                                const sgst = Math.round(taxableBase * 0.09);
                                const grandTotal = taxableBase + cgst + sgst + activeShipping.cost;
                                return (
                                    <>
                                        <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                                            <div className="flex justify-between text-gray-400 text-sm">
                                                <span>CGST (9%)</span>
                                                <span className="text-white">₹{cgst}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-400 text-sm">
                                                <span>SGST (9%)</span>
                                                <span className="text-white">₹{sgst}</span>
                                            </div>
                                            {activeShipping.cost > 0 && (
                                                <div className="flex justify-between text-gray-400 text-sm">
                                                    <span>Shipping ({activeShipping.label})</span>
                                                    <span className="text-white">₹{activeShipping.cost}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between text-lg font-bold text-white mb-8">
                                            <span>Total</span>
                                            <span className="text-tronix-accent">₹{grandTotal}</span>
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
        </div>
    );
};

export default Cart;
