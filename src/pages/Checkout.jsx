import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, ShieldCheck, Truck, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const Checkout = () => {
    const { selectedItems, cartTotal } = useCart();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const navigate = useNavigate();

    // Redirect if no items selected
    useEffect(() => {
        if (selectedItems.length === 0) {
            toast.error("Please select items to checkout");
            navigate('/cart');
        }
    }, [selectedItems, navigate]);

    // Delivery Address State
    const [address, setAddress] = useState({
        fullName: '',
        email: '',
        mobile: '',
        pincode: '',
        addressLine: '',
        city: '',
        state: ''
    });

    // Auto-fill from logged-in user
    useEffect(() => {
        if (user) {
            setAddress(prev => ({
                ...prev,
                fullName: prev.fullName || user.full_name || user.name || '',
                email: prev.email || user.email || ''
            }));
        }
    }, [user]);

    // Auto-fill city and state from PIN code
    useEffect(() => {
        const fetchPincodeDetails = async () => {
            if (address.pincode.length === 6) {
                setIsPincodeLoading(true);
                setPincodeError('');
                try {
                    const res = await fetch(`https://api.postalpincode.in/pincode/${address.pincode}`);
                    const data = await res.json();
                    
                    if (data[0].Status === "Success") {
                        const { District, State } = data[0].PostOffice[0];
                        setAddress(prev => ({
                            ...prev,
                            city: District,
                            state: State
                        }));
                        toast.success(`Location found: ${District}, ${State}`);
                    } else {
                        setPincodeError('Invalid PIN code');
                    }
                } catch (error) {
                    console.error("PIN lookup error:", error);
                    setPincodeError('Failed to fetch details');
                } finally {
                    setIsPincodeLoading(false);
                }
            } else if (address.pincode.length > 0 && address.pincode.length < 6) {
                setPincodeError(''); // Reset while typing
            }
        };

        const timer = setTimeout(() => {
            fetchPincodeDetails();
        }, 500); // Debounce to allow typing

        return () => clearTimeout(timer);
    }, [address.pincode]);

    const [paymentMethod, setPaymentMethod] = useState('payu');

    // Derived Totals
    const subtotal = cartTotal;
    const gst = Math.round(cartTotal * 0.18);
    const shipping = 0; // Free shipping logic
    const totalAmount = subtotal + gst + shipping;

    const handleInputChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const handlePayment = async () => {
        // Basic Validation
        if (!address.fullName || !address.email || !address.mobile || !address.addressLine || !address.pincode) {
            toast.error("Please fill in all address details.");
            return;
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(address.email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            const email = address.email || (user ? user.email : "guest@example.com");

            // 1. Get PayU params and hash from backend
            const response = await client.post('/payment/initiate', {
                amount: totalAmount,
                firstname: address.fullName,
                email: email,
                productinfo: `Order for ${selectedItems.length} items`,
                items: selectedItems.map(item => ({ product_id: item.id, quantity: item.quantity })),
                phone: address.mobile,
                address_line: address.addressLine,
                city: address.city,
                state: address.state,
                pincode: address.pincode
            });

            const data = response.data;

            // 2. Create hidden form and submit to PayU
            const form = document.createElement('form');
            form.action = data.action;
            form.method = 'POST';

            // Mix address into surl/furl params if needed, or just standard PayU params
            const params = {
                key: data.key,
                txnid: data.txnid,
                amount: data.amount,
                productinfo: data.productinfo,
                firstname: data.firstname,
                email: data.email,
                phone: address.mobile, // Use address mobile
                surl: data.surl,
                furl: data.furl,
                hash: data.hash
            };

            for (const key in params) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = params[key];
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Payment initiation failed. Try again.');
            setLoading(false);
        }
    };

    if (selectedItems.length === 0) return null;

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 bg-[#0F172A]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Steps */}
                <div className="lg:col-span-2 space-y-6">

                    {/* STEP 1: ADDRESS */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                            <h2 className="text-xl font-bold text-white">Delivery Address</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                                <input
                                    type="text" name="fullName" value={address.fullName} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="tronix"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm mb-1">Email Address</label>
                                <input
                                    type="email" name="email" value={address.email} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="abc@example"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Mobile Number</label>
                                <input
                                    type="text" name="mobile" value={address.mobile} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Pincode</label>
                                <div className="relative">
                                    <input
                                        type="text" name="pincode" value={address.pincode} onChange={handleInputChange}
                                        maxLength={6}
                                        className={`w-full bg-white/5 border ${pincodeError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors`}
                                        placeholder="110001"
                                    />
                                    {isPincodeLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader size={16} className="text-tronix-primary animate-spin" />
                                        </div>
                                    )}
                                </div>
                                {pincodeError && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle size={12} /> {pincodeError}
                                    </p>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm mb-1">Flat, House no., Building, Company, Apartment</label>
                                <input
                                    type="text" name="addressLine" value={address.addressLine} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="123 Innovation Tower"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">City</label>
                                <input
                                    type="text" name="city" value={address.city} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="New Delhi"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">State</label>
                                <input
                                    type="text" name="state" value={address.state} onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors"
                                    placeholder="Delhi"
                                />
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: PAYMENT */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                            <h2 className="text-xl font-bold text-white">Payment Method</h2>
                        </div>

                        <div className="space-y-4">
                            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'payu' ? 'border-tronix-primary bg-tronix-primary/10' : 'border-white/10 hover:border-white/30'}`}>
                                <input
                                    type="radio" name="payment" value="payu"
                                    checked={paymentMethod === 'payu'} onChange={() => setPaymentMethod('payu')}
                                    className="w-5 h-5 text-tronix-primary accent-tronix-primary"
                                />
                                <div className="ml-4 flex-1">
                                    <div className="flex items-center gap-2 font-bold text-white">
                                        PayU Secure Payment
                                        <div className="flex gap-1 ml-2">
                                            <span className="bg-white/10 px-1 rounded text-xs text-gray-300">UPI</span>
                                            <span className="bg-white/10 px-1 rounded text-xs text-gray-300">Card</span>
                                            <span className="bg-white/10 px-1 rounded text-xs text-gray-300">NetBanking</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400">Fast and secure payment via PayU Gateway</p>
                                </div>
                                <ShieldCheck className="text-green-500" />
                            </label>

                            <label className={`flex items-center p-4 border rounded-xl cursor-not-allowed border-white/5 opacity-50`}>
                                <input type="radio" disabled className="w-5 h-5" />
                                <div className="ml-4">
                                    <div className="font-bold text-gray-400">Cash on Delivery</div>
                                    <p className="text-sm text-gray-500">Currently unavailable for your location</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Order Summary (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-tronix-card border border-white/10 rounded-xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>

                            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedItems.map((item) => (
                                    <div key={item.id} className="flex gap-3 items-start">
                                        <div className="w-12 h-12 bg-white/5 rounded-md flex-shrink-0 flex items-center justify-center p-1">
                                            <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 truncate">{item.title}</p>
                                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-medium text-white">₹{item.price * item.quantity}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/10 pt-4 space-y-2 mb-6">
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Items ({selectedItems.length}):</span>
                                    <span>₹{subtotal}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Delivery:</span>
                                    <span className="text-green-400">FREE</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Tax (18% GST):</span>
                                    <span>₹{gst}</span>
                                </div>
                                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10 mt-2">
                                    <span>Order Total:</span>
                                    <span className="text-tronix-accent">₹{totalAmount}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? 'Processing...' : 'Place Your Order and Pay'}
                            </button>

                            <p className="text-xs text-center text-gray-500 mt-3">
                                By placing your order, you agree to Tronix365's privacy notice and conditions of use.
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-400">
                            <ShieldCheck className="text-tronix-primary" size={20} />
                            <span>Safe and Secure Payments. 100% Authentic products.</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Checkout;
