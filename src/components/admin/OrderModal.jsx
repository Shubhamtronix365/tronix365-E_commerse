import React, { useState, useEffect } from 'react';
import { 
    X, Check, Truck, AlertTriangle, Package, Calendar, Mail, Phone, 
    MapPin, Building, CreditCard, ShieldCheck, Tag, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const ORDER_STATUS_OPTIONS = [
    { value: "pending", label: "Pending Verification" },
    { value: "confirmed", label: "Order Confirmed" },
    { value: "payment_received", label: "Payment Received" },
    { value: "processing", label: "Order Processing" },
    { value: "packed", label: "Packed & Sealed" },
    { value: "shipped", label: "Dispatched / Shipped" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refund_initiated", label: "Refund Initiated" },
    { value: "refund_completed", label: "Refund Completed" },
    { value: "failed_payment", label: "Payment Failed" },
    { value: "return_requested", label: "Return Requested" },
    { value: "return_approved", label: "Return Approved" },
    { value: "return_rejected", label: "Return Declined" },
    { value: "exchange_approved", label: "Exchange Approved" },
    { value: "exchange_rejected", label: "Exchange Declined" }
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
        cancellation_reason: 'Cancelled by Store Administrator',
        refund_status: 'Full Refund Initiated (3-7 Working Days)'
    });

    // Custom Status Change Dropdown State
    const [selectedNewStatus, setSelectedNewStatus] = useState('');

    useEffect(() => {
        if (order) {
            setSelectedNewStatus(order.status || 'pending');
            const existingCourier = order.courier || '';
            const isPreset = PRESET_COURIERS.includes(existingCourier);
            
            setShippingData({
                targetStatus: 'shipped',
                courier: existingCourier ? (isPreset ? existingCourier : 'Other') : 'Delhivery',
                custom_courier: existingCourier && !isPreset ? existingCourier : '',
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
        const finalCourier = shippingData.courier === 'Other' 
            ? (shippingData.custom_courier && shippingData.custom_courier.strip() ? shippingData.custom_courier.strip() : 'Local Transport') 
            : shippingData.courier;

        onUpdateOrderStatus(order.id, {
            status: shippingData.targetStatus,
            courier: finalCourier,
            custom_courier: shippingData.courier === 'Other' ? shippingData.custom_courier : '',
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
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 text-white overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />

                        {/* Main Order Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col my-auto"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                                            Order #order_tronix_{String(order.id).padStart(4, '0')}
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                order.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </h2>
                                        <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                            <Calendar size={12} />
                                            {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content Scrollable Area */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                                
                                {/* Quick Status Management Bar */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                    <p className="text-xs uppercase tracking-wider font-bold text-violet-400 flex items-center gap-1.5">
                                        <Truck size={14} /> Manage Order Status & Dispatch Notification
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => onUpdateOrderStatus(order.id, { status: 'confirmed' })}
                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                                            >
                                                <Check size={14} /> Confirm Order
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleOpenShippingModal('shipped')}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                                            >
                                                <Truck size={14} /> Mark as Shipped
                                            </button>
                                        )}
                                        {order.status === 'shipped' && (
                                            <button
                                                onClick={() => handleOpenShippingModal('out_for_delivery')}
                                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
                                            >
                                                <Truck size={14} /> Out For Delivery
                                            </button>
                                        )}
                                        {(order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                            <button
                                                onClick={() => onUpdateOrderStatus(order.id, { status: 'delivered' })}
                                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-green-500/20 flex items-center gap-1.5"
                                            >
                                                <Check size={14} /> Mark Delivered
                                            </button>
                                        )}
                                        {order.status !== 'cancelled' && order.status !== 'deleted' && (
                                            <button
                                                onClick={() => setIsCancelModalOpen(true)}
                                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                                            >
                                                <X size={14} /> Cancel Order
                                            </button>
                                        )}
                                    </div>

                                    {/* Full Status Selector Dropdown */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <span className="text-xs text-gray-400 font-semibold shrink-0">Set Custom Status:</span>
                                        <select
                                            value={selectedNewStatus}
                                            onChange={handleDropdownStatusChange}
                                            className="bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-semibold"
                                        >
                                            {ORDER_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                                                    {opt.label} ({opt.value})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Logistics Details Card (if present) */}
                                {(order.courier || order.tracking_number || order.estimated_delivery_date) && (
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                                        <p className="text-xs uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1.5">
                                            <Truck size={14} /> Active Logistics & Shipping Details
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            <div>
                                                <span className="text-gray-400 block">Courier Method:</span>
                                                <span className="font-bold text-white">{order.courier || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">Tracking Number:</span>
                                                <span className="font-bold text-violet-300">{order.tracking_number || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">Estimated Delivery:</span>
                                                <span className="font-bold text-white">{order.estimated_delivery_date || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">Arrival Window:</span>
                                                <span className="font-bold text-white">{order.estimated_arrival_time || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Cancellation Summary Card (if cancelled) */}
                                {(order.status === 'cancelled' || order.status === 'deleted') && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                                        <p className="text-xs uppercase tracking-wider font-bold text-red-400 flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> Order Cancellation Record
                                        </p>
                                        <div className="text-xs space-y-1 text-red-200">
                                            <p><strong>Reason:</strong> {order.cancellation_reason || 'Cancelled by store administrator'}</p>
                                            <p><strong>Refund Status:</strong> {order.refund_status || 'Full Refund Initiated (3-7 Working Days)'}</p>
                                            {order.cancellation_date && (
                                                <p><strong>Cancelled On:</strong> {new Date(order.cancellation_date).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* B2B GST Invoice Information Card */}
                                {order.is_gst_invoice && (
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                                            <ShieldCheck size={14} /> Verified Tax Invoice / B2B GST Information
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="text-gray-400 block">Registered Company Name:</span>
                                                <span className="font-bold text-white">{order.company_name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">GSTIN Number:</span>
                                                <span className="font-bold text-emerald-300">{order.gstin || 'N/A'}</span>
                                            </div>
                                            {order.company_address && (
                                                <div className="sm:col-span-2">
                                                    <span className="text-gray-400 block">Registered Company Address:</span>
                                                    <span className="font-bold text-white">{order.company_address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Customer Info Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                                            <Mail size={14} /> Customer Contact
                                        </h4>
                                        <p className="font-bold text-white">{order.full_name || 'N/A'}</p>
                                        <p className="text-gray-300 text-xs flex items-center gap-1.5">
                                            <Mail size={12} className="text-violet-400" /> {order.customer_email}
                                        </p>
                                        <p className="text-gray-300 text-xs flex items-center gap-1.5">
                                            <Phone size={12} className="text-violet-400" /> {order.phone || 'N/A'}
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                                            <MapPin size={14} /> Delivery Address
                                        </h4>
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            {order.address_line || 'N/A'}<br />
                                            {order.city}{order.state ? `, ${order.state}` : ''} {order.pincode ? `- ${order.pincode}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Order Items Table */}
                                <div className="space-y-3">
                                    <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400">
                                        Purchased Items ({Array.isArray(order.items) ? order.items.length : 0})
                                    </h4>
                                    <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10 bg-white/5">
                                        {Array.isArray(order.items) && order.items.map((item, idx) => (
                                            <div key={idx} className="p-3 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={item.product?.image || 'https://placehold.co/80?text=TRONIX365'}
                                                        alt={item.product?.title || 'Product'}
                                                        className="w-12 h-12 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{item.product?.title || 'Electronics Product'}</p>
                                                        <p className="text-xs text-gray-400">
                                                            Qty: <span className="text-violet-300 font-bold">{item.quantity}</span> &times; ₹{Number(item.price_at_purchase || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-emerald-400 text-sm">
                                                    ₹{(Number(item.price_at_purchase || 0) * (item.quantity || 1)).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Breakdown & GST Total */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Subtotal (Excl. Tax)</span>
                                        <span>₹{(order.subtotal_before_gst || (order.total_amount - (order.gst_amount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {order.coupon_code && (
                                        <div className="flex justify-between text-xs text-yellow-400">
                                            <span>Coupon Discount ({order.coupon_code})</span>
                                            <span>- ₹{Number(order.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>CGST (9%)</span>
                                        <span>₹{((order.gst_amount || 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>SGST (9%)</span>
                                        <span>₹{((order.gst_amount || 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-amber-400">
                                        <span>Total GST Collected (18%)</span>
                                        <span>₹{Number(order.gst_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="pt-2 border-t border-white/10 flex justify-between text-base font-extrabold text-white">
                                        <span>Total Paid (Incl. 18% GST)</span>
                                        <span className="text-emerald-400">₹{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Logistics & Shipping Configuration Modal */}
            <AnimatePresence>
                {isShippingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-white">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShippingModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-gray-900 border border-blue-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                                    <Truck className="text-blue-500" size={20} /> Shipping & Tracking Information
                                </h3>
                                <button onClick={() => setIsShippingModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleConfirmShipping} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Select Shipping Partner / Method</label>
                                    <select
                                        value={shippingData.courier}
                                        onChange={(e) => setShippingData({ ...shippingData, courier: e.target.value })}
                                        className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                    >
                                        {PRESET_COURIERS.map(c => (
                                            <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {shippingData.courier === 'Other' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-300 uppercase mb-1">Custom Shipping Method / Partner Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Local Transport / Bus Parcel / Train Cargo / Personal Delivery"
                                            value={shippingData.custom_courier}
                                            onChange={(e) => setShippingData({ ...shippingData, custom_courier: e.target.value })}
                                            className="w-full bg-black/60 border border-blue-500/50 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Tracking Number / AWB</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. TRX-9847291834"
                                        value={shippingData.tracking_number}
                                        onChange={(e) => setShippingData({ ...shippingData, tracking_number: e.target.value })}
                                        className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Estimated Delivery Date</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. August 05, 2026"
                                            value={shippingData.estimated_delivery_date}
                                            onChange={(e) => setShippingData({ ...shippingData, estimated_delivery_date: e.target.value })}
                                            className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Estimated Arrival Time</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 10:00 AM - 4:00 PM"
                                            value={shippingData.estimated_arrival_time}
                                            onChange={(e) => setShippingData({ ...shippingData, estimated_arrival_time: e.target.value })}
                                            className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                                    <button type="button" onClick={() => setIsShippingModalOpen(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 text-xs font-bold">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-1.5">
                                        <Truck size={14} /> Update Shipping & Send Notification Email
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
                                    <AlertTriangle className="text-red-500" size={20} /> Cancel Order & Dispatch Email
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
                                        className="w-full bg-black/60 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
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
                                        className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
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
