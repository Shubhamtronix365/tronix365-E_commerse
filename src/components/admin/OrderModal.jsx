import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Package, Check, Clock, Truck, User, CreditCard, Calendar, 
    Image as ImageIcon, AlertTriangle, Send, FileText, ChevronDown, RefreshCw 
} from 'lucide-react';

const PRESET_COURIERS = [
    "Porter",
    "Delhivery",
    "DTDC",
    "Blue Dart",
    "India Post",
    "DHL",
    "FedEx",
    "XpressBees",
    "Ecom Express",
    "Shadowfax",
    "Self Delivery",
    "Pickup",
    "Other"
];

const ALL_ORDER_STATUSES = [
    { value: "pending", label: "Order Received (Pending)" },
    { value: "confirmed", label: "Order Confirmed" },
    { value: "payment_received", label: "Payment Received" },
    { value: "processing", label: "Processing" },
    { value: "packed", label: "Packed" },
    { value: "shipped", label: "Shipped" },
    { value: "out_for_delivery", label: "Out For Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refund_initiated", label: "Refund Initiated" },
    { value: "refund_completed", label: "Refund Completed" },
    { value: "failed_payment", label: "Failed Payment" },
    { value: "return_requested", label: "Return Requested" },
    { value: "return_approved", label: "Return Approved" },
    { value: "return_rejected", label: "Return Rejected" },
    { value: "exchange_approved", label: "Exchange Approved" },
    { value: "exchange_rejected", label: "Exchange Rejected" }
];

const OrderModal = ({ isOpen, onClose, order, onUpdateOrderStatus }) => {
    // Shipping Modal State
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [shippingData, setShippingData] = useState({
        targetStatus: 'shipped',
        courier: 'Delhivery',
        custom_courier: '',
        tracking_number: '',
        estimated_delivery_date: '',
        estimated_arrival_time: ''
    });

    // Cancel Modal State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelData, setCancelData] = useState({
        cancellation_reason: '',
        refund_status: 'Full Refund Initiated (3-7 Working Days)'
    });

    // Custom Status Change State
    const [selectedNewStatus, setSelectedNewStatus] = useState('');

    useEffect(() => {
        if (order) {
            setSelectedNewStatus(order.status || 'pending');
            setShippingData({
                targetStatus: 'shipped',
                courier: order.courier ? (PRESET_COURIERS.includes(order.courier) ? order.courier : 'Other') : 'Delhivery',
                custom_courier: order.courier && !PRESET_COURIERS.includes(order.courier) ? order.courier : '',
                tracking_number: order.tracking_number || '',
                estimated_delivery_date: order.estimated_delivery_date || '',
                estimated_arrival_time: order.estimated_arrival_time || ''
            });
            setCancelData({
                cancellation_reason: order.cancellation_reason || 'Cancelled by Store Administrator',
                refund_status: order.refund_status || 'Full Refund Initiated (3-7 Working Days)'
            });
        }
    }, [order]);

    if (!order) return null;

    const handleOpenShippingModal = (status = 'shipped') => {
        setShippingData(prev => ({ ...prev, targetStatus: status }));
        setIsShippingModalOpen(true);
    };

    const handleConfirmShipping = (e) => {
        e.preventDefault();
        const finalCourier = shippingData.courier === 'Other' ? shippingData.custom_courier : shippingData.courier;
        onUpdateOrderStatus(order.id, {
            status: shippingData.targetStatus,
            courier: shippingData.courier,
            custom_courier: shippingData.custom_courier,
            tracking_number: shippingData.tracking_number,
            estimated_delivery_date: shippingData.estimated_delivery_date,
            estimated_arrival_time: shippingData.estimated_arrival_time
        });
        setIsShippingModalOpen(false);
    };

    const handleConfirmCancel = (e) => {
        e.preventDefault();
        const reason = cancelData.cancellation_reason && cancelData.cancellation_reason.trim()
            ? cancelData.cancellation_reason.trim()
            : 'Cancelled by Store Administrator';
        const refund = cancelData.refund_status && cancelData.refund_status.trim()
            ? cancelData.refund_status.trim()
            : 'Full Refund Initiated (3-7 Working Days)';

        onUpdateOrderStatus(order.id, {
            status: 'cancelled',
            cancellation_reason: reason,
            refund_status: refund
        });
        setIsCancelModalOpen(false);
    };

    const handleDropdownStatusChange = (e) => {
        const val = e.target.value;
        setSelectedNewStatus(val);
        if (val === 'shipped' || val === 'out_for_delivery') {
            handleOpenShippingModal(val);
        } else if (val === 'cancelled' || val === 'deleted') {
            setIsCancelModalOpen(true);
        } else {
            onUpdateOrderStatus(order.id, { status: val });
        }
    };

    return (
        <>
            <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 text-white">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-4xl bg-tronix-card border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10 flex flex-col max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                            <div>
                                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                        <Package className="text-violet-400 w-5 h-5" />
                                    </div>
                                    Order Details
                                </h2>
                                <p className="text-gray-400 mt-1 ml-14 text-sm">Order ID: #order_tronix_{String(order.id).padStart(4, '0')} • {order.customer_email}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                            {/* Status Pipeline Stepper & Admin Controls */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-emerald-500/20"></div>
                                
                                {order.status === 'cancelled' || order.status === 'deleted' ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mb-3">
                                            <X size={32} className="text-red-500" />
                                        </div>
                                        <h3 className="text-red-400 font-bold text-lg">Order Cancelled</h3>
                                        <p className="text-gray-300 text-sm mt-1 text-center font-medium">
                                            Reason: {order.cancellation_reason || 'Cancelled by store admin'}<br/>
                                            Refund Status: <span className="text-emerald-400 font-bold">{order.refund_status || 'Full Refund Initiated (3-7 Working Days)'}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between relative z-10">
                                        {['pending', 'confirmed', 'shipped', 'delivered'].map((step, idx, arr) => {
                                            const stepIndex = arr.indexOf(order.status);
                                            const isActive = order.status === step || (stepIndex !== -1 && stepIndex >= idx);
                                            const isCurrent = order.status === step;
                                            return (
                                                <div key={step} className="flex flex-col items-center flex-1 relative">
                                                    {/* Connecting Line */}
                                                    {idx !== arr.length - 1 && (
                                                        <div className={`absolute top-5 left-[50%] right-[-50%] h-[2px] ${isActive && stepIndex > idx ? 'bg-violet-500' : 'bg-white/10'}`} />
                                                    )}

                                                    {/* Step Circle */}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 ${isActive ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-white/5 text-gray-500 border border-white/10'
                                                        }`}>
                                                        {isActive && !isCurrent ? <Check size={20} /> :
                                                            step === 'pending' ? <Clock size={20} /> :
                                                                step === 'confirmed' ? <Package size={20} /> :
                                                                    step === 'shipped' ? <Truck size={20} /> : <Check size={20} />}
                                                    </div>

                                                    {/* Step Label */}
                                                    <p className={`mt-3 text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                        {step.replace('_', ' ')}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Admin Action Bar & Status Dropdown */}
                                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                    {/* Quick Preset Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => onUpdateOrderStatus(order.id, { status: 'confirmed' })}
                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                                            >
                                                <Check size={14} /> Confirm Order
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleOpenShippingModal('shipped')}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                                            >
                                                <Truck size={14} /> Mark as Shipped
                                            </button>
                                        )}
                                        {order.status === 'shipped' && (
                                            <button
                                                onClick={() => handleOpenShippingModal('out_for_delivery')}
                                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold text-xs transition-colors shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
                                            >
                                                <Truck size={14} /> Out For Delivery
                                            </button>
                                        )}
                                        {(order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                            <button
                                                onClick={() => onUpdateOrderStatus(order.id, { status: 'delivered' })}
                                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-colors shadow-lg shadow-green-500/20 flex items-center gap-1.5"
                                            >
                                                <Check size={14} /> Mark Delivered
                                            </button>
                                        )}
                                        {order.status !== 'cancelled' && order.status !== 'deleted' && (
                                            <button
                                                onClick={() => setIsCancelModalOpen(true)}
                                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                                            >
                                                <X size={14} /> Cancel Order
                                            </button>
                                        )}
                                    </div>

                                    {/* Full Status Selector Dropdown */}
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <span className="text-xs text-gray-400 uppercase font-bold tracking-wider shrink-0">Change Status:</span>
                                        <select
                                            value={selectedNewStatus}
                                            onChange={handleDropdownStatusChange}
                                            className="bg-black/60 border border-violet-500/30 rounded-xl px-3 py-2 text-xs font-bold text-violet-300 focus:outline-none focus:border-violet-400 cursor-pointer w-full md:w-auto"
                                        >
                                            {ALL_ORDER_STATUSES.map(st => (
                                                <option key={st.value} value={st.value} className="bg-gray-900 text-white font-medium">
                                                    {st.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Details Card (If available) */}
                            {(order.courier || order.tracking_number || order.estimated_delivery_date) && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                                    <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Truck size={16} className="text-blue-400" /> Active Shipping Details
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">Courier / Partner</p>
                                            <p className="text-white font-bold">{order.courier || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">Tracking Number</p>
                                            <p className="text-blue-400 font-mono font-bold">{order.tracking_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">Est. Delivery / Arrival</p>
                                            <p className="text-white font-bold">{order.estimated_delivery_date || order.estimated_arrival_time || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Customer & Order Info Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                {/* B2B GST Card (If present) */}
                                {(order.is_gst_invoice || order.gstin || order.company_name) && (
                                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-5 lg:col-span-2">
                                        <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            🏢 Registered B2B GST Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Company / Business Name</p>
                                                <p className="text-white font-bold">{order.company_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Customer GSTIN</p>
                                                <p className="text-violet-400 font-mono font-bold tracking-wider">{order.gstin || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Registered Office Address</p>
                                                <p className="text-gray-300 text-xs">{order.company_address || order.address_line || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Profile Card */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <User size={16} className="text-violet-400" /> Customer Profile
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Full Name</p>
                                            <p className="text-white font-medium text-lg">{order.full_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email Address</p>
                                            <p className="text-gray-300">{order.customer_email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Address Card */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Truck size={16} className="text-blue-400" /> Shipping Address
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Address Line</p>
                                            <p className="text-gray-200">{order.address_line || 'N/A'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">City</p>
                                                <p className="text-gray-200">{order.city || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">State</p>
                                                <p className="text-gray-200">{order.state || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pincode</p>
                                                <p className="text-gray-200 font-bold tracking-widest">{order.pincode || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phone</p>
                                                <p className="text-gray-200">{order.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Timeline Card */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors lg:col-span-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <CreditCard size={16} className="text-emerald-400" /> Payment & Timeline
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transaction ID</p>
                                            <p className="text-emerald-400 font-mono text-sm bg-emerald-500/10 inline-block px-2 py-1 rounded mt-1 border border-emerald-500/20">
                                                {order.txnid || 'Payment Pending / Online'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Order Placed On</p>
                                            <p className="text-gray-300 flex items-center gap-2 mt-1">
                                                <Calendar size={14} className="text-gray-500" />
                                                {order.created_at ? new Date(order.created_at).toLocaleString(undefined, {
                                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Amount</p>
                                            <p className="text-white font-bold text-xl mt-0.5">₹{order.total_amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-white/5 bg-black/20">
                                    <h3 className="font-semibold text-white">Purchased Products</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-black/40 text-gray-300 uppercase font-medium text-xs">
                                            <tr>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4 text-right">Unit Price</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {order.items && order.items.length > 0 ? (
                                                order.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                                                                    {item.product?.image ? (
                                                                        <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ImageIcon className="text-gray-500 w-5 h-5" />
                                                                    )}
                                                                </div>
                                                                <span className="font-medium text-white line-clamp-2">{item.product?.title || 'Unknown Product'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold text-white">
                                                            {item.quantity}x
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            ₹{item.price_at_purchase || 0}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                                            ₹{(item.price_at_purchase || 0) * item.quantity}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                        No item details available.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {/* Order Summary Footer */}
                                        {order.total_amount > 0 && (
                                            <tfoot className="bg-black/40 border-t border-white/10">
                                                <tr>
                                                    <td colSpan="2"></td>
                                                    <td className="px-6 py-3 text-right text-sm text-gray-400 font-medium">Original Amount (before tax):</td>
                                                    <td className="px-6 py-3 text-right text-sm text-white font-bold">₹{((order.total_amount + (order.discount_amount || 0)) / 1.18).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="2"></td>
                                                    <td className="px-6 py-3 text-right text-sm text-gray-400 font-medium">GST (18%):</td>
                                                    <td className="px-6 py-3 text-right text-sm text-yellow-400 font-bold">₹{((order.total_amount + (order.discount_amount || 0)) - ((order.total_amount + (order.discount_amount || 0)) / 1.18)).toFixed(2)}</td>
                                                </tr>
                                                {order.discount_amount > 0 && (
                                                    <tr>
                                                        <td colSpan="2"></td>
                                                        <td className="px-6 py-3 text-right text-sm text-emerald-400 font-bold">Total Discount {order.coupon_code ? `(${order.coupon_code})` : ''}:</td>
                                                        <td className="px-6 py-3 text-right text-sm text-emerald-400 font-bold">- ₹{order.discount_amount}</td>
                                                    </tr>
                                                )}
                                                <tr className="border-t border-white/10 bg-white/5">
                                                    <td colSpan="2"></td>
                                                    <td className="px-6 py-4 text-right text-sm text-white font-bold">Grand Total:</td>
                                                    <td className="px-6 py-4 text-right text-base text-emerald-400 font-black">₹{order.total_amount.toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>

            {/* Shipping Details Modal */}
            <AnimatePresence>
                {isShippingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-white">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShippingModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-gray-900 border border-violet-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Truck className="text-blue-400" size={20} /> Dispatch & Shipping Details
                                </h3>
                                <button onClick={() => setIsShippingModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleConfirmShipping} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Shipping Courier / Partner</label>
                                    <select
                                        value={shippingData.courier}
                                        onChange={(e) => setShippingData({ ...shippingData, courier: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                    >
                                        {PRESET_COURIERS.map(c => (
                                            <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {shippingData.courier === 'Other' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-violet-300 uppercase mb-1">Custom Shipping Method (Type Any Carrier)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Local Transport, Bus Parcel, Train Cargo, Personal Delivery..."
                                            value={shippingData.custom_courier}
                                            onChange={(e) => setShippingData({ ...shippingData, custom_courier: e.target.value })}
                                            className="w-full bg-black/50 border border-violet-500/40 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-400"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Tracking Number (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. TRK987654321IN"
                                        value={shippingData.tracking_number}
                                        onChange={(e) => setShippingData({ ...shippingData, tracking_number: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Est. Delivery Date</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Aug 02, 2026"
                                            value={shippingData.estimated_delivery_date}
                                            onChange={(e) => setShippingData({ ...shippingData, estimated_delivery_date: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Est. Arrival Time</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. By 4:00 PM"
                                            value={shippingData.estimated_arrival_time}
                                            onChange={(e) => setShippingData({ ...shippingData, estimated_arrival_time: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                                    <button type="button" onClick={() => setIsShippingModalOpen(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 text-xs font-bold">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-1.5">
                                        <Send size={14} /> Update Shipping & Notify Customer
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Order Cancellation Modal */}
            <AnimatePresence>
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-white">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCancelModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-gray-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" size={20} /> Cancel Order & Send Notification
                                </h3>
                                <button onClick={() => setIsCancelModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleConfirmCancel} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Reason for Cancellation</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="e.g. Out of stock / Customer requested cancellation / Delivery address unreachable..."
                                        value={cancelData.cancellation_reason}
                                        onChange={(e) => setCancelData({ ...cancelData, cancellation_reason: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Refund Status Message</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Full Refund Initiated (3-7 Working Days) / Refund Completed"
                                        value={cancelData.refund_status}
                                        onChange={(e) => setCancelData({ ...cancelData, refund_status: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                                    <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 text-xs font-bold">Keep Order</button>
                                    <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 flex items-center gap-1.5">
                                        <X size={14} /> Confirm Cancel & Dispatch Email
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default OrderModal;
