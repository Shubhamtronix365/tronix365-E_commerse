import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, ShieldCheck, Truck, ChevronRight, Loader, AlertCircle, Trash2, Zap, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const Checkout = () => {
    const { selectedItems, cartTotal, subtotal: cartSubtotal, bundleDiscounts, clearCart } = useCart();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const navigate = useNavigate();

    // ── Shipping Options ─────────────────────────────────────────
    const SHIPPING_OPTIONS = [
        { id: 'express', label: 'Express Shipping',        desc: '2 to 5 Working Days (Below 2Kg)', cost: 149, icon: Zap },
        { id: 'surface', label: 'Surface Shipping',        desc: '4 to 7 Working Days',            cost: 69,  icon: Truck },
        { id: 'pickup',  label: 'Store Pickup (Pune)',     desc: '9:30 AM – 6:00 PM, Pune Office', cost: 0,   icon: Store },
    ];

    const [selectedShipping, setSelectedShipping] = useState(() => {
        try { return sessionStorage.getItem('tronix_shipping') || 'surface'; } catch { return 'surface'; }
    });

    const activeShipping = SHIPPING_OPTIONS.find(o => o.id === selectedShipping) || SHIPPING_OPTIONS[1];

    const standaloneItems = selectedItems.filter(item => !item.bundle_id);
    const bundleGroups = selectedItems.filter(item => item.bundle_id).reduce((acc, item) => {
        if (!acc[item.bundle_id]) {
            acc[item.bundle_id] = {
                id: item.bundle_id,
                bundle_name: item.bundle?.name || 'Product Bundle',
                original_price: item.bundle?.original_price || 0,
                bundle_price: item.bundle?.bundle_price || 0,
                quantity: item.quantity,
                items: []
            };
        }
        acc[item.bundle_id].items.push(item);
        return acc;
    }, {});

    // Redirect if no items selected
    useEffect(() => {
        if (selectedItems.length === 0) {
            toast.error("Please select items to checkout");
            navigate('/cart');
        }
    }, [selectedItems, navigate]);

    // Delivery & B2B GST Address State
    const [address, setAddress] = useState({
        fullName: '',
        email: '',
        mobile: '',
        pincode: '',
        addressLine: '',
        city: '',
        state: '',
        isGstInvoice: false,
        companyName: '',
        gstin: '',
        companyAddress: ''
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
    const subtotal = cartSubtotal; // Raw subtotal before bundle/coupon discounts
    const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
    const totalDiscount = bundleDiscounts + couponDiscount;
    const taxableBase = subtotal - totalDiscount;         // base on which GST applies
    const cgst = Math.round(taxableBase * 0.09);          // CGST 9%
    const sgst = Math.round(taxableBase * 0.09);          // SGST 9%
    const gst = cgst + sgst;                              // total GST 18%
    const shipping = activeShipping.cost;                 // customer-selected shipping
    const totalAmount = taxableBase + gst + shipping;

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        try {
            const res = await client.post(`/apply-coupon?code=${couponCode}&cart_total=${subtotal}`);
            setAppliedCoupon(res.data);
            toast.success(`Coupon "${res.data.code}" applied! You saved ₹${res.data.discount_amount}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid coupon code");
            setAppliedCoupon(null);
        } finally {
            setIsApplyingCoupon(false);
        }
    };

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

        // B2B GST Validation if requested
        if (address.isGstInvoice) {
            if (!address.companyName || !address.companyName.trim()) {
                toast.error("Please enter your Company / Business Name for GST Invoice.");
                return;
            }
            if (!address.gstin || address.gstin.trim().length !== 15) {
                toast.error("Please enter a valid 15-character GSTIN number.");
                return;
            }
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
                items: selectedItems.map(item => ({ 
                    product_id: item.id, 
                    quantity: item.quantity,
                    bundle_id: item.bundle_id
                })),
                phone: address.mobile,
                address_line: address.addressLine,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                coupon_code: appliedCoupon?.code || null,
                discount_amount: totalDiscount,
                is_gst_invoice: address.isGstInvoice,
                gstin: address.isGstInvoice ? address.gstin.trim().toUpperCase() : null,
                company_name: address.isGstInvoice ? address.companyName.trim() : null,
                company_address: address.isGstInvoice ? (address.companyAddress.trim() || address.addressLine) : null,
                gst_rate: 18.0,
                gst_amount: gst,
                subtotal_before_gst: taxableBase,
                shipping_method: activeShipping.id,
                shipping_cost: activeShipping.cost,
                bypass: false
            });

            const data = response.data;

            // 2. Create hidden form and submit to PayU
            const form = document.createElement('form');
            form.action = data.action;
            form.method = 'POST';

            const params = {
                key: data.key,
                txnid: data.txnid,
                amount: data.amount,
                productinfo: data.productinfo,
                firstname: data.firstname,
                email: data.email,
                phone: address.mobile,
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

                            {/* GST & B2B Business Billing Option */}
                            <div className="md:col-span-2 pt-4 border-t border-white/10 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl hover:bg-violet-500/15 transition-all">
                                    <input
                                        type="checkbox"
                                        name="isGstInvoice"
                                        checked={address.isGstInvoice}
                                        onChange={(e) => setAddress({ ...address, isGstInvoice: e.target.checked })}
                                        className="w-5 h-5 text-violet-500 accent-violet-500 rounded cursor-pointer"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-white flex items-center gap-2">
                                            🏢 I require a GST Invoice / B2B Company Billing
                                        </p>
                                        <p className="text-xs text-gray-400">Claim GST input tax credit for your business or corporate purchase</p>
                                    </div>
                                </label>
                            </div>

                            {address.isGstInvoice && (
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 border border-violet-500/30 p-5 rounded-xl">
                                    <div>
                                        <label className="block text-violet-300 text-xs uppercase font-bold tracking-wider mb-1">Company / Business Name *</label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            required
                                            value={address.companyName}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Acme Technologies Pvt Ltd"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-violet-300 text-xs uppercase font-bold tracking-wider mb-1">GSTIN Number (15 Digits) *</label>
                                        <input
                                            type="text"
                                            name="gstin"
                                            required
                                            maxLength={15}
                                            value={address.gstin}
                                            onChange={(e) => setAddress({ ...address, gstin: e.target.value.toUpperCase() })}
                                            placeholder="e.g. 27AAAAA0000A1Z5"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none font-mono text-sm tracking-wider"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-violet-300 text-xs uppercase font-bold tracking-wider mb-1">Registered Business Address</label>
                                        <input
                                            type="text"
                                            name="companyAddress"
                                            value={address.companyAddress}
                                            onChange={handleInputChange}
                                            placeholder="Registered Office Address (Leave blank to use delivery address)"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 2: SHIPPING METHOD */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                            <h2 className="text-xl font-bold text-white">Shipping Method</h2>
                        </div>
                        <div className="space-y-3">
                            {SHIPPING_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isActive = selectedShipping === opt.id;
                                return (
                                    <label
                                        key={opt.id}
                                        className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                                            isActive
                                                ? 'border-tronix-primary bg-tronix-primary/10'
                                                : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="checkout_shipping"
                                            value={opt.id}
                                            checked={isActive}
                                            onChange={() => {
                                                setSelectedShipping(opt.id);
                                                try { sessionStorage.setItem('tronix_shipping', opt.id); } catch {}
                                            }}
                                            className="w-5 h-5 accent-tronix-primary"
                                        />
                                        <Icon size={20} className={isActive ? 'text-tronix-primary' : 'text-gray-500'} />
                                        <div className="flex-1">
                                            <p className={`font-semibold text-sm ${ isActive ? 'text-white' : 'text-gray-300'}`}>{opt.label}</p>
                                            <p className="text-xs text-gray-500">{opt.desc}</p>
                                        </div>
                                        <span className={`font-bold text-sm shrink-0 ${
                                            opt.cost === 0 ? 'text-emerald-400' : (isActive ? 'text-tronix-accent' : 'text-gray-400')
                                        }`}>
                                            {opt.cost === 0 ? 'FREE' : `₹${opt.cost}`}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* STEP 3: PAYMENT */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">3</span>
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

                            {/* Premium Coupon Input */}
                            <div className="mb-6">
                                <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider font-bold">Promo Code</label>
                                {!appliedCoupon ? (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Enter Code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-24 py-3 text-sm text-white focus:border-tronix-primary outline-none transition-colors placeholder:text-gray-500"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={isApplyingCoupon || !couponCode}
                                            className="absolute right-1.5 top-1.5 bottom-1.5 bg-tronix-primary hover:bg-violet-600 text-white px-4 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                        >
                                            {isApplyingCoupon ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <ShieldCheck size={16} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-emerald-400 font-bold text-sm tracking-wide">{appliedCoupon.code}</p>
                                                <p className="text-emerald-500/80 text-[10px] uppercase font-bold">Successfully Applied</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setAppliedCoupon(null);
                                                setCouponCode('');
                                                toast.success("Coupon removed");
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                            title="Remove Coupon"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {standaloneItems.map((item) => (
                                    <div key={item.cart_item_id || item.id} className="flex gap-3 items-start">
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

                                {Object.values(bundleGroups).map((group) => (
                                    <div key={`bundle-${group.id}`} className="bg-tronix-primary/5 rounded-lg border border-tronix-primary/20 p-3">
                                        <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
                                            <div>
                                                <span className="text-[10px] font-bold text-tronix-primary uppercase tracking-wider block mb-0.5">Bundle Deal</span>
                                                <p className="text-sm text-white font-bold">{group.bundle_name}</p>
                                                <p className="text-xs text-gray-500">Qty: {group.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 line-through block">₹{group.original_price * group.quantity}</span>
                                                <span className="text-sm font-bold text-tronix-accent">₹{group.bundle_price * group.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {group.items.map(bi => (
                                                <div key={bi.cart_item_id || bi.id} className="flex items-center gap-1.5 bg-white/5 rounded px-1.5 py-1">
                                                    <img src={getImageUrl(bi.image)} className="w-4 h-4 object-contain" />
                                                    <span className="text-[10px] text-gray-400 capitalize max-w-[80px] truncate">{bi.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/10 pt-4 space-y-2 mb-6">
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Items ({selectedItems.length}):</span>
                                    <span>₹{subtotal}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-400 text-sm font-medium">
                                        <span>Discount:</span>
                                        <span>- ₹{totalDiscount}</span>
                                    </div>
                                )}
                                {/* CGST + SGST breakdown */}
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>CGST (9%):</span>
                                    <span>₹{cgst}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>SGST (9%):</span>
                                    <span>₹{sgst}</span>
                                </div>
                                {/* Shipping */}
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Shipping ({activeShipping.label}):</span>
                                    <span className={activeShipping.cost === 0 ? 'text-emerald-400' : 'text-white'}>
                                        {activeShipping.cost === 0 ? 'FREE' : `₹${activeShipping.cost}`}
                                    </span>
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
                                {loading ? 'Redirecting to PayU...' : 'Proceed to Secure Payment'}
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
