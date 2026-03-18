import React from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/imageUtils';

const Cart = () => {
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        cartTotal,
        clearCart,
        toggleSelection,
        selectAll,
        selectedCount
    } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleCheckout = () => {
        if (!isAuthenticated) {
            toast.error("Please login to proceed to checkout");
            navigate('/login', { state: { from: '/checkout' } });
            return;
        }
        if (selectedCount === 0) {
            toast.error("Please select at least one item to checkout");
            return;
        }
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

                        {cartItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-tronix-card/50 border ${item.selected !== false ? 'border-tronix-primary/50' : 'border-white/5'} rounded-xl p-4 flex gap-4 items-center transition-colors`}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.selected !== false}
                                    onChange={() => toggleSelection(item.id)}
                                    className="w-5 h-5 accent-tronix-primary bg-white/10 border-white/20 rounded cursor-pointer shrink-0"
                                />

                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-lg flex items-center justify-center p-2 shrink-0">
                                    <img src={getImageUrl(item.image)} alt={item.title} className={`max-w-full max-h-full object-contain ${item.selected === false ? 'opacity-50 grayscale' : ''}`} />
                                </div>

                                <div className="flex flex-col sm:flex-row flex-1 min-w-0 sm:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-medium truncate ${item.selected === false ? 'text-gray-500' : 'text-white'}`}>{item.title}</h3>
                                        <p className="text-sm text-gray-400">{item.category}</p>
                                        <div className={`mt-2 font-bold ${item.selected === false ? 'text-gray-600' : 'text-tronix-accent'}`}>₹{item.price}</div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={item.quantity >= item.stock}
                                                className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors ${item.quantity >= item.stock ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
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
                            <h3 className="font-display font-bold text-xl text-white mb-6">Order Summary</h3>

                            <div className="space-y-4 mb-6 pb-6 border-b border-white/5">
                                <div className="flex justify-between text-gray-400">
                                    <span>Subtotal ({selectedCount} items)</span>
                                    <span className="text-white">₹{cartTotal}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Shipping</span>
                                    <span className="text-green-400">Free</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Tax (18% GST)</span>
                                    <span className="text-white">₹{Math.round(cartTotal * 0.18)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-lg font-bold text-white mb-8">
                                <span>Total</span>
                                <span>₹{Math.round(cartTotal * 1.18)}</span>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={selectedCount === 0}
                                className={`w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg ${selectedCount === 0
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20 group'
                                    }`}
                            >
                                Proceed to Checkout
                                {selectedCount > 0 && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <p className="text-center text-xs text-gray-500 mt-4">
                                {selectedCount === 0 ? "Select items to checkout" : "Secure Checkout - 256-bit Encryption"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
