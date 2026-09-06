import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, ShieldCheck, Truck, ChevronRight, Loader, AlertCircle, Trash2, Zap, Store, Check, Plus, Home, Building, Warehouse, Edit2, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import ShippingMethodSelector from '../components/checkout/ShippingMethodSelector';
import CheckoutOrderSummary from '../components/checkout/CheckoutOrderSummary';

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

    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
    const [saveThisAddress, setSaveThisAddress] = useState(true);
    const [showAddressForm, setShowAddressForm] = useState(false);

    // Auto-fill from logged-in user & fetch saved addresses
    useEffect(() => {
        // Rehydrate draft if present in sessionStorage
        try {
            const draftStr = sessionStorage.getItem('tronix_checkout_draft');
            if (draftStr) {
                const draft = JSON.parse(draftStr);
                if (draft.address) {
                    setAddress(prev => ({
                        ...prev,
                        ...draft.address,
                        fullName: user?.full_name || draft.address.fullName || prev.fullName,
                        email: user?.email || draft.address.email || prev.email
                    }));
                }
                if (draft.selectedShipping) {
                    setSelectedShipping(draft.selectedShipping);
                }
                if (draft.couponCode) {
                    setCouponCode(draft.couponCode);
                }
                if (user) {
                    sessionStorage.removeItem('tronix_checkout_draft');
                }
            }
        } catch (e) {
            console.error("Failed to restore checkout draft", e);
        }

        if (user) {
            setAddress(prev => ({
                ...prev,
                fullName: prev.fullName || user.full_name || user.name || '',
                email: prev.email || user.email || ''
            }));

            const fetchUserAddresses = async () => {
                setLoadingSavedAddresses(true);
                try {
                    const res = await client.get('/addresses');
                    const addrs = res.data || [];
                    setSavedAddresses(addrs);
                    if (addrs.length > 0) {
                        const def = addrs.find(a => a.is_default) || addrs[0];
                        setSelectedAddressId(def.id);
                        setAddress(prev => ({
                            ...prev,
                            fullName: def.full_name || prev.fullName,
                            mobile: def.phone || prev.mobile,
                            pincode: def.pincode || prev.pincode,
                            addressLine: def.address_line || prev.addressLine,
                            city: def.city || prev.city,
                            state: def.state || prev.state,
                            isGstInvoice: def.is_gst_invoice || false,
                            companyName: def.company_name || '',
                            gstin: def.gstin || '',
                            companyAddress: def.address_line || ''
                        }));
                    } else {
                        setSelectedAddressId('new');
                        setShowAddressForm(true);
                    }
                } catch (err) {
                    console.error("Failed to load saved addresses:", err);
                    setSelectedAddressId('new');
                    setShowAddressForm(true);
                } finally {
                    setLoadingSavedAddresses(false);
                }
            };
            fetchUserAddresses();
        } else {
            setSelectedAddressId('new');
            setShowAddressForm(true);
        }
    }, [user]);

    const handleSelectSavedAddress = (addr) => {
        setSelectedAddressId(addr.id);
        setAddress(prev => ({
            ...prev,
            fullName: addr.full_name || prev.fullName,
            mobile: addr.phone || prev.mobile,
            pincode: addr.pincode || prev.pincode,
            addressLine: addr.address_line || prev.addressLine,
            city: addr.city || prev.city,
            state: addr.state || prev.state,
            isGstInvoice: addr.is_gst_invoice || false,
            companyName: addr.company_name || '',
            gstin: addr.gstin || '',
            companyAddress: addr.address_line || ''
        }));
        toast.success(`Delivery address set to: ${addr.label || 'Saved Address'}`);
    };

    const handleSelectNewAddress = () => {
        setSelectedAddressId('new');
        setShowAddressForm(true);
        setAddress(prev => ({
            ...prev,
            fullName: user?.full_name || user?.name || '',
            mobile: '',
            pincode: '',
            addressLine: '',
            city: '',
            state: '',
            isGstInvoice: false,
            companyName: '',
            gstin: '',
            companyAddress: ''
        }));
    };

    const getAddressTypeIcon = (label) => {
        switch (label?.toLowerCase()) {
            case 'home': return <Home size={14} className="text-violet-400" />;
            case 'office': return <Building size={14} className="text-cyan-400" />;
            case 'warehouse': return <Warehouse size={14} className="text-emerald-400" />;
            default: return <MapPin size={14} className="text-pink-400" />;
        }
    };

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

        // Enforce Mandatory Login before final payment and order placement
        if (!user) {
            try {
                sessionStorage.setItem('tronix_checkout_draft', JSON.stringify({
                    address,
                    selectedShipping,
                    couponCode: appliedCoupon?.code || couponCode
                }));
            } catch (err) {}

            toast((t) => (
                <div className="flex flex-col gap-1 py-0.5">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <Lock size={15} className="text-yellow-400" />
                        <span>Login Required to Place Order</span>
                    </div>
                    <p className="text-xs text-gray-300">
                        Your delivery address has been saved. Please sign in or create an account to proceed with payment.
                    </p>
                </div>
            ), {
                duration: 4000,
                style: {
                    background: '#151522',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fff',
                }
            });

            navigate('/login?redirect=/checkout');
            return;
        }

        setLoading(true);
        try {
            // Auto-save address to user's address book if requested
            if (user && selectedAddressId === 'new' && saveThisAddress) {
                try {
                    await client.post('/addresses', {
                        label: 'Home',
                        full_name: address.fullName,
                        phone: address.mobile,
                        address_line: address.addressLine,
                        pincode: address.pincode,
                        city: address.city,
                        state: address.state,
                        is_default: savedAddresses.length === 0,
                        is_gst_invoice: address.isGstInvoice,
                        company_name: address.companyName || null,
                        gstin: address.gstin || null
                    });
                } catch (saveErr) {
                    console.warn("Could not auto-save address to book:", saveErr);
                }
            }

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
        <div className="min-h-screen pt-20 sm:pt-24 pb-28 lg:pb-12 px-3 sm:px-6 bg-[#0F172A]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                {/* LEFT COLUMN: Steps */}
                <div className="lg:col-span-2 space-y-6">

                    {/* STEP 1: ADDRESS */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Delivery Address</h2>
                                    {savedAddresses.length > 0 && (
                                        <p className="text-xs text-gray-400">Choose from your saved addresses or enter a new one</p>
                                    )}
                                </div>
                            </div>
                            {user && (
                                <Link
                                    to="/dashboard"
                                    className="hidden sm:flex items-center gap-1 text-xs text-tronix-primary hover:text-violet-300 transition-colors font-medium"
                                >
                                    <span>Manage Address Book</span>
                                    <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>

                        {/* Saved Addresses Quick Selector */}
                        {user && savedAddresses.length > 0 && (
                            <div className="mb-6 space-y-3">
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    Deliver To Saved Address
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {savedAddresses.map((addr) => {
                                        const isSelected = selectedAddressId === addr.id;
                                        return (
                                            <div
                                                key={addr.id}
                                                onClick={() => handleSelectSavedAddress(addr)}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'bg-tronix-primary/15 border-tronix-primary shadow-lg shadow-tronix-primary/10 ring-1 ring-tronix-primary'
                                                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-xs font-semibold flex items-center gap-1">
                                                            {getAddressTypeIcon(addr.label)}
                                                            {addr.label || 'Home'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {addr.is_default && (
                                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                                    Default
                                                                </span>
                                                            )}
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                                isSelected ? 'border-tronix-primary bg-tronix-primary' : 'border-white/30'
                                                            }`}>
                                                                {isSelected && <Check size={10} className="text-white stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="font-bold text-white text-sm">{addr.full_name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>
                                                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                                        {addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
                                                    </p>
                                                </div>

                                                {addr.is_gst_invoice && addr.gstin && (
                                                    <div className="mt-2 text-[11px] text-violet-300 font-mono">
                                                        GST: {addr.gstin}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Option to enter a brand new address */}
                                    <div
                                        onClick={handleSelectNewAddress}
                                        className={`p-4 rounded-xl border border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center min-h-[110px] ${
                                            selectedAddressId === 'new'
                                                ? 'bg-tronix-primary/10 border-tronix-primary text-white ring-1 ring-tronix-primary'
                                                : 'bg-white/[0.02] border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1 text-tronix-primary">
                                            <Plus size={16} />
                                        </div>
                                        <span className="text-xs font-semibold">Enter A Different Address</span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">Use new recipient or location</span>
                                    </div>
                                </div>

                                {selectedAddressId !== 'new' && (
                                    <div className="flex items-center justify-between pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddressForm(!showAddressForm)}
                                            className="text-xs text-tronix-primary hover:text-violet-300 transition-colors flex items-center gap-1 font-medium"
                                        >
                                            <Edit2 size={12} />
                                            <span>{showAddressForm ? 'Hide address details form' : 'Review or modify details for this order'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Confirmation pill when saved address is active without expanded form */}
                        {selectedAddressId !== 'new' && !showAddressForm && savedAddresses.length > 0 && (
                            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                                    <span>
                                        Shipping to: <strong>{address.fullName}</strong> ({address.city} - {address.pincode})
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddressForm(true)}
                                    className="text-white hover:underline font-semibold text-xs ml-2"
                                >
                                    Edit Details
                                </button>
                            </div>
                        )}

                        {/* Address Form (Shown if new address chosen, no saved address, or expanded) */}
                        {(selectedAddressId === 'new' || savedAddresses.length === 0 || showAddressForm) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">Full Name</label>
                                    <input
                                        type="text" name="fullName" value={address.fullName} onChange={handleInputChange}
                                        autoComplete="name"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="tronix"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">Email Address</label>
                                    <input
                                        type="email" name="email" value={address.email} onChange={handleInputChange}
                                        autoComplete="email"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="abc@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">Mobile Number</label>
                                    <input
                                        type="tel" name="mobile" value={address.mobile} onChange={handleInputChange}
                                        autoComplete="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">Pincode</label>
                                    <div className="relative">
                                        <input
                                            type="text" name="pincode" value={address.pincode} onChange={handleInputChange}
                                            maxLength={6}
                                            autoComplete="postal-code"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className={`w-full bg-white/5 border ${pincodeError ? 'border-red-500' : 'border-white/10'} rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors`}
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
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">Flat, House no., Building, Company, Apartment</label>
                                    <input
                                        type="text" name="addressLine" value={address.addressLine} onChange={handleInputChange}
                                        autoComplete="street-address"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="123 Innovation Tower"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">City</label>
                                    <input
                                        type="text" name="city" value={address.city} onChange={handleInputChange}
                                        autoComplete="address-level2"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="New Delhi"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs sm:text-sm mb-1 font-medium">State</label>
                                    <input
                                        type="text" name="state" value={address.state} onChange={handleInputChange}
                                        autoComplete="address-level1"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-white focus:border-tronix-primary outline-none transition-colors"
                                        placeholder="Delhi"
                                    />
                                </div>

                                {/* Save to address book option if logged in and entering new */}
                                {user && selectedAddressId === 'new' && (
                                    <div className="md:col-span-2 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                                            <input
                                                type="checkbox"
                                                checked={saveThisAddress}
                                                onChange={(e) => setSaveThisAddress(e.target.checked)}
                                                className="w-4 h-4 rounded text-tronix-primary bg-black/40 border-white/20 accent-tronix-primary cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-300">
                                                Save this address to my Address Book for 1-click checkout on future orders
                                            </span>
                                        </label>
                                    </div>
                                )}

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
                        )}
                    </div>

                    {/* STEP 2: SHIPPING METHOD */}
                    <ShippingMethodSelector
                        shippingOptions={SHIPPING_OPTIONS}
                        selectedShipping={selectedShipping}
                        setSelectedShipping={setSelectedShipping}
                    />

                    {/* STEP 3: PAYMENT */}
                    <div className="bg-tronix-card border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
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
                    <CheckoutOrderSummary
                        appliedCoupon={appliedCoupon}
                        setAppliedCoupon={setAppliedCoupon}
                        couponCode={couponCode}
                        setCouponCode={setCouponCode}
                        handleApplyCoupon={handleApplyCoupon}
                        isApplyingCoupon={isApplyingCoupon}
                        standaloneItems={standaloneItems}
                        bundleGroups={bundleGroups}
                        selectedItems={selectedItems}
                        subtotal={subtotal}
                        totalDiscount={totalDiscount}
                        cgst={cgst}
                        sgst={sgst}
                        activeShipping={activeShipping}
                        totalAmount={totalAmount}
                        user={user}
                        loading={loading}
                        handlePayment={handlePayment}
                    />
                </div>
            </div>
        </div>
    );
};

export default Checkout;
