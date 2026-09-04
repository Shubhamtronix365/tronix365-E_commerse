import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Factory, 
    Truck, 
    Layers, 
    Building2, 
    Mail, 
    Phone, 
    User, 
    MapPin, 
    CheckCircle2, 
    ArrowRight, 
    HelpCircle, 
    Clock, 
    ShieldCheck, 
    DollarSign, 
    AlertCircle,
    Split,
    Check
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TowerOrderModal = ({ 
    isOpen, 
    onClose, 
    product = null, 
    initialQty = 10,
    onSuccess = null 
}) => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const availableStock = product?.stock || 0;
    const isSourcingOnly = product?.tower_order_only;
    const defaultFactoryLead = product?.factory_lead_days || 7;
    const defaultShippingLead = product?.shipping_lead_days || 3;
    const unitPrice = product?.price || product?.sale_price || 0;

    const [qty, setQty] = useState(initialQty);
    const [splitMode, setSplitMode] = useState('full'); // 'split' or 'full'
    const [targetPrice, setTargetPrice] = useState(unitPrice ? Math.round(unitPrice * 0.95) : 100);
    const [customProductName, setCustomProductName] = useState(product?.title || '');
    
    // Customer Details
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [gstin, setGstin] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryCity, setDeliveryCity] = useState('');
    const [deliveryState, setDeliveryState] = useState('');
    const [deliveryPincode, setDeliveryPincode] = useState('');
    const [requiredByDate, setRequiredByDate] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');

    const [loading, setLoading] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState(null);

    // Auto-fill user information if available
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

    useEffect(() => {
        if (user) {
            setCustomerName(user.full_name || '');
            setCustomerEmail(user.email || '');
            
            // Fetch saved addresses if logged in
            const fetchAddresses = async () => {
                try {
                    const res = await client.get('/addresses');
                    const addrs = res.data || [];
                    setSavedAddresses(addrs);
                } catch (err) {
                    console.error("Failed to load saved addresses for tower order:", err);
                }
            };
            fetchAddresses();
        }
    }, [user, isOpen]);

    const handleApplyTowerAddress = (addr) => {
        setSelectedAddressId(addr.id);
        setDeliveryAddress(addr.address_line || '');
        setDeliveryCity(addr.city || '');
        setDeliveryState(addr.state || '');
        setDeliveryPincode(addr.pincode || '');
        if (addr.phone && !customerPhone) setCustomerPhone(addr.phone);
        if (addr.full_name && !customerName) setCustomerName(addr.full_name);
        if (addr.is_gst_invoice) {
            if (addr.company_name) setCompanyName(addr.company_name);
            if (addr.gstin) setGstin(addr.gstin);
        }
        toast.success(`Applied: ${addr.label || 'Saved Address'}`);
    };

    useEffect(() => {
        if (product) {
            setCustomProductName(product.title);
            const p = product.price || product.sale_price || 100;
            setTargetPrice(Math.round(p * 0.95)); // Suggest ~5% lower default target price for bulk
            if (initialQty > availableStock && availableStock > 0 && !isSourcingOnly) {
                setSplitMode('split');
            } else {
                setSplitMode('full');
            }
        }
        if (initialQty) {
            setQty(initialQty);
        }
    }, [product, initialQty, availableStock, isSourcingOnly]);

    if (!isOpen) return null;

    // Calculate split numbers
    const canSplit = !isSourcingOnly && availableStock > 0 && qty > availableStock;
    const immediateQty = (canSplit && splitMode === 'split') ? availableStock : 0;
    const backorderQty = (canSplit && splitMode === 'split') ? (qty - availableStock) : qty;
    const targetTotal = Math.round(qty * Number(targetPrice || 0));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please fill in your name, email, and contact number');
            return;
        }

        if (!qty || qty <= 0) {
            toast.error('Please enter a valid requested quantity');
            return;
        }

        if (!targetPrice || targetPrice <= 0) {
            toast.error('Please specify your Target Price per unit');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                product_id: product?.id || null,
                product_name: product?.title || customProductName || 'Custom Sourcing Requirement',
                product_sku: product?.skv || null,
                product_image: product?.image || null,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                company_name: companyName || null,
                gstin: gstin || null,
                delivery_address: deliveryAddress || null,
                delivery_city: deliveryCity || null,
                delivery_state: deliveryState || null,
                delivery_pincode: deliveryPincode || null,
                requested_qty: Number(qty),
                immediate_qty: immediateQty,
                backorder_qty: backorderQty,
                target_price: Number(targetPrice),
                target_total: targetTotal,
                customer_notes: customerNotes || null,
                required_by_date: requiredByDate || null,
            };

            const res = await client.post('/tower-orders', payload);
            setSubmittedOrder(res.data);
            toast.success(`Tower Order ${res.data.order_number} placed successfully!`);
            if (onSuccess) {
                onSuccess(res.data);
            }
        } catch (err) {
            console.error('Error creating Tower Order:', err);
            toast.error(err.response?.data?.detail || 'Failed to place Tower Order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-[#0f0f18] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative text-white max-h-[92vh] flex flex-col"
            >
                {/* Header - Clean, Professional & Human-Designed */}
                <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-white/10 flex items-center justify-between bg-[#151522]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <Factory size={18} className="sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-lg font-bold text-white">
                                    Place Tower Order
                                </h3>
                                <span className="bg-amber-400 text-black text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-md tracking-wider">
                                    B2B Factory Indent
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                                Arranged directly through our manufacturing network • Set your target price & split quantities
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px]"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 custom-scrollbar">
                    {submittedOrder ? (
                        /* SUCCESS STATE */
                        <div className="py-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/10">
                                <CheckCircle2 size={36} />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Order Request Logged</span>
                                <h2 className="text-2xl font-bold text-white mt-1">Tower Order Placed Successfully!</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Order Reference: <span className="font-mono text-violet-400 font-bold px-2 py-0.5 bg-violet-500/10 rounded border border-violet-500/20">{submittedOrder.order_number}</span>
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left max-w-lg mx-auto space-y-3">
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                    <span className="text-gray-400">Product:</span>
                                    <span className="text-white font-medium">{submittedOrder.product_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                    <span className="text-gray-400">Requested Quantity:</span>
                                    <span className="text-white font-bold">{submittedOrder.requested_qty} units</span>
                                </div>
                                {submittedOrder.immediate_qty > 0 && (
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 text-amber-400">
                                        <span>Split (Immediate in-stock):</span>
                                        <span>{submittedOrder.immediate_qty} units (Warehouse)</span>
                                    </div>
                                )}
                                {submittedOrder.backorder_qty > 0 && (
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 text-violet-400">
                                        <span>Split (Factory Backorder):</span>
                                        <span>{submittedOrder.backorder_qty} units (Lead Time applies)</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                    <span className="text-gray-400">Target Price:</span>
                                    <span className="text-tronix-accent font-bold">₹{submittedOrder.target_price} / unit</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-1">
                                    <span className="text-gray-400">Target Total Budget:</span>
                                    <span className="text-emerald-400 font-extrabold text-base">₹{submittedOrder.target_total?.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Transparent Workflow Notice */}
                            <div className="bg-violet-950/30 border border-violet-500/30 rounded-xl p-4 text-left max-w-lg mx-auto space-y-2">
                                <div className="flex items-center gap-2 text-violet-300 font-semibold text-xs uppercase tracking-wide">
                                    <Clock size={16} /> What Happens Next?
                                </div>
                                <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                                    <li><strong>Sales Team Contact:</strong> Our engineering & procurement team will contact you shortly.</li>
                                    <li><strong>Quotation & P.I.:</strong> We will issue an official Proforma Invoice with factory lead time.</li>
                                    <li><strong>NEFT/RTGS Transfer:</strong> Transfer amount to confirm factory procurement.</li>
                                    <li><strong>Shipment:</strong> Material will be dispatched with live tracking (# Lead Time: Factory + Shipping).</li>
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/dashboard');
                                    }}
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    Track in Dashboard <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* FORM INPUT STATE */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Human-Crafted Product Summary & Editable Order Name Box */}
                            <div className="bg-[#141420] rounded-xl border border-white/10 p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        {product?.image ? (
                                            <div className="w-14 h-14 rounded-lg bg-white p-1 flex-shrink-0 flex items-center justify-center border border-white/20">
                                                <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                                <Factory size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    {product ? 'Catalog Product' : 'Custom Sourcing'}
                                                </span>
                                                {product?.skv && (
                                                    <>
                                                        <span className="text-gray-600">•</span>
                                                        <span className="text-[11px] font-mono text-gray-400">
                                                            SKU: <span className="text-gray-200">{product.skv}</span>
                                                        </span>
                                                    </>
                                                )}
                                                {!isSourcingOnly && product && (
                                                    <>
                                                        <span className="text-gray-600">•</span>
                                                        <span className="text-[11px] text-gray-400">
                                                            In Stock: <span className={availableStock > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>{availableStock} units</span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <h4 className="font-semibold text-white text-sm sm:text-base leading-snug">
                                                {product?.title || customProductName || 'Custom Component Sourcing'}
                                            </h4>
                                        </div>
                                    </div>

                                    {unitPrice > 0 && (
                                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                                            <span className="text-[11px] text-gray-400 block">Current Catalog Price</span>
                                            <span className="text-lg font-bold text-white">
                                                ₹{Number(unitPrice).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Order / Item Name (Always editable if user wants custom label or custom part) */}
                                <div className="pt-3 border-t border-white/5">
                                    <label className="block text-xs font-medium text-gray-300 mb-1">
                                        Order / Component Name
                                        <span className="text-gray-500 text-[11px] ml-1.5 font-normal">(You can edit or add project reference)</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={customProductName}
                                        onChange={(e) => setCustomProductName(e.target.value)}
                                        placeholder="Enter product title or custom part requirement"
                                        className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Split Order Recommendation (If qty > stock) */}
                            {canSplit && (
                                <div className="p-4 rounded-xl bg-[#141420] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white text-xs font-semibold">
                                            <Split size={15} className="text-amber-400" />
                                            <span>Partial Stock Available in Warehouse</span>
                                        </div>
                                        <span className="text-[11px] text-gray-400">
                                            Stock: <strong className="text-emerald-400">{availableStock}</strong> / Required: <strong className="text-white">{qty}</strong>
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        We have <strong>{availableStock} units</strong> ready in warehouse for immediate dispatch. The remaining <strong>{qty - availableStock} units</strong> can be placed on factory backorder with full lead time.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setSplitMode('split')}
                                            className={`p-3 rounded-lg border text-left transition-all ${
                                                splitMode === 'split' 
                                                    ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm' 
                                                    : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-xs text-amber-300">Split Fulfillment</span>
                                                {splitMode === 'split' && <CheckCircle2 size={16} className="text-amber-400" />}
                                            </div>
                                            <div className="text-[11px] text-gray-300 mt-1.5 space-y-0.5">
                                                <div>• Ship <strong>{availableStock} units</strong> immediately</div>
                                                <div>• Factory indent for <strong>{qty - availableStock} units</strong></div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSplitMode('full')}
                                            className={`p-3 rounded-lg border text-left transition-all ${
                                                splitMode === 'full' 
                                                    ? 'bg-white/10 border-white/30 text-white' 
                                                    : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-xs text-gray-200">Ship All Together</span>
                                                {splitMode === 'full' && <CheckCircle2 size={16} className="text-white" />}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-1.5">
                                                Hold and deliver all <strong>{qty} units</strong> in a single shipment upon factory completion.
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quantities & Target Price Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div className="bg-[#141420] p-4 rounded-xl border border-white/10">
                                    <label className="block text-xs font-semibold text-gray-200 mb-2 flex items-center justify-between">
                                        <span>Required Quantity (Units) *</span>
                                        {canSplit && splitMode === 'split' && (
                                            <span className="text-[10px] text-amber-400 font-medium">
                                                {immediateQty} now + {backorderQty} backorder
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={qty}
                                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-400 text-base sm:text-sm font-semibold"
                                        placeholder="e.g. 100"
                                    />
                                </div>

                                <div className="bg-[#141420] p-4 rounded-xl border border-white/10">
                                    <label className="block text-xs font-semibold text-gray-200 mb-2 flex items-center justify-between">
                                        <span>Your Target Price (₹ / Unit) *</span>
                                        <span className="text-[11px] text-emerald-400 font-bold">
                                            Est. Total: ₹{targetTotal.toLocaleString('en-IN')}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            required
                                            inputMode="decimal"
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                            className="w-full pl-7 pr-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-amber-400 focus:outline-none focus:border-amber-400 text-base sm:text-sm font-bold"
                                            placeholder="Enter target price per unit"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lead Time Estimation Notice */}
                            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#141420] border border-white/10 text-xs">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                    <Clock size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="font-semibold text-white text-xs">Estimated Fulfillment Lead Time</div>
                                    <div className="text-gray-400 text-[11px]">
                                        Factory Procurement: <strong className="text-gray-200">~{defaultFactoryLead} working days</strong> • Courier Transit: <strong className="text-gray-200">~{defaultShippingLead} days</strong> (Dispatch in ~{defaultFactoryLead + defaultShippingLead} days upon payment confirmation).
                                    </div>
                                </div>
                            </div>

                            {/* Customer Contact Details */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <User size={14} /> Customer & Corporate Information
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="e.g. Rahul Sharma"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Email Address *</label>
                                        <input
                                            type="email"
                                            required
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            placeholder="e.g. rahul@company.com"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Contact Phone *</label>
                                        <input
                                            type="tel"
                                            required
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Company / Organization (Optional)</label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="e.g. Apex Robotics Pvt Ltd"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">GSTIN Number (Optional)</label>
                                        <input
                                            type="text"
                                            value={gstin}
                                            onChange={(e) => setGstin(e.target.value.toUpperCase())}
                                            placeholder="e.g. 27AAAAA0000A1Z5"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs font-mono uppercase focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Location & Timeline */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin size={14} /> Delivery Destination & Target Timeline
                                    </h4>
                                    {savedAddresses.length > 0 && (
                                        <span className="text-[10px] text-gray-400">1-click auto-fill available</span>
                                    )}
                                </div>

                                {savedAddresses.length > 0 && (
                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/10 overflow-x-auto scrollbar-none whitespace-nowrap">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mr-1 shrink-0 font-semibold">
                                            Saved:
                                        </span>
                                        {savedAddresses.map((addr) => {
                                            const isSelected = selectedAddressId === addr.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={addr.id}
                                                    onClick={() => handleApplyTowerAddress(addr)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border shrink-0 min-h-[36px] ${
                                                        isSelected
                                                            ? 'bg-violet-600 text-white border-violet-400 shadow-md'
                                                            : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    <span>{addr.label || 'Address'}: {addr.city} ({addr.pincode})</span>
                                                    {isSelected && <Check size={12} className="stroke-[2.5]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] text-gray-400 mb-1">Delivery Address</label>
                                        <input
                                            type="text"
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                            placeholder="Street address or industrial plot"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={deliveryCity}
                                            onChange={(e) => setDeliveryCity(e.target.value)}
                                            placeholder="City"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Pincode</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6}
                                            value={deliveryPincode}
                                            onChange={(e) => setDeliveryPincode(e.target.value)}
                                            placeholder="Pincode"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Required By Date (Deadline)</label>
                                        <input
                                            type="date"
                                            value={requiredByDate}
                                            onChange={(e) => setRequiredByDate(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Special Notes / Specifications</label>
                                        <input
                                            type="text"
                                            value={customerNotes}
                                            onChange={(e) => setCustomerNotes(e.target.value)}
                                            placeholder="Packaging, tolerances, or specific brand/make"
                                            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-xs focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* The 6-Step Visual Process Overview */}
                            <div className="pt-2 border-t border-white/10">
                                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    How It Works (6-Step Fulfillment)
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                        <div className="font-bold text-amber-400">1. Place Order</div>
                                        <div className="text-gray-400 mt-0.5">Online</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-[#141420] border border-white/10 text-gray-300">
                                        <div className="font-semibold">2. Sales Review</div>
                                        <div className="text-gray-500 mt-0.5">Direct Call</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-[#141420] border border-white/10 text-gray-300">
                                        <div className="font-semibold">3. Quotation</div>
                                        <div className="text-gray-500 mt-0.5">Formal P.I.</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-[#141420] border border-white/10 text-gray-300">
                                        <div className="font-semibold">4. Payment</div>
                                        <div className="text-gray-500 mt-0.5">NEFT / RTGS</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-[#141420] border border-white/10 text-gray-300">
                                        <div className="font-semibold">5. Production</div>
                                        <div className="text-gray-500 mt-0.5">Factory Indent</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                        <div className="font-bold text-emerald-400">6. Dispatch</div>
                                        <div className="text-gray-400 mt-0.5">Live Tracking</div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-3 border-t border-white/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium text-center min-h-[44px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-98 disabled:opacity-50 min-h-[44px]"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Submit Tower Order</span>
                                            <ArrowRight size={16} className="stroke-[3]" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default TowerOrderModal;
