import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Check, Clock, Truck, User, CreditCard, Calendar, Image as ImageIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const OrderModal = ({ isOpen, onClose, order, onUpdateOrderStatus }) => {
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    if (!order) return null;

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

                            {/* Status Pipeline Stepper */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-emerald-500/20"></div>
                                {order.status === 'deleted' ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mb-3">
                                            <X size={32} className="text-red-500" />
                                        </div>
                                        <h3 className="text-red-400 font-bold text-lg">Order Cancelled</h3>
                                        <p className="text-gray-300 text-sm mt-1 text-center font-medium">This order was cancelled. Payment will be refunded in 3-7 working days.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between relative z-10">
                                        {['pending', 'confirmed', 'shipped', 'delivered'].map((step, idx, arr) => {
                                            const isActive = order.status === step || arr.indexOf(order.status) >= idx;
                                            const isCurrent = order.status === step;
                                            return (
                                                <div key={step} className="flex flex-col items-center flex-1 relative">
                                                    {/* Connecting Line */}
                                                    {idx !== arr.length - 1 && (
                                                        <div className={`absolute top-5 left-[50%] right-[-50%] h-[2px] ${isActive && arr.indexOf(order.status) > idx ? 'bg-violet-500' : 'bg-white/10'}`} />
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
                                                        {step}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Admin Action Buttons */}
                                {order.status !== 'deleted' && onUpdateOrderStatus && (
                                    <div className="mt-6 flex flex-wrap justify-center gap-3 pt-6 border-t border-white/10">
                                        {order.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => onUpdateOrderStatus(order.id, 'confirmed')}
                                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                                >
                                                    <Check size={16} /> Confirm Order
                                                </button>
                                                <button
                                                    onClick={() => setIsRejectModalOpen(true)}
                                                    className="px-6 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                                >
                                                    <X size={16} /> Cancel / Reject Order
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <>
                                                <button
                                                    onClick={() => onUpdateOrderStatus(order.id, 'shipped')}
                                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                                                >
                                                    Mark as Shipped
                                                </button>
                                                <button
                                                    onClick={() => setIsRejectModalOpen(true)}
                                                    className="px-6 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                                >
                                                    <X size={16} /> Cancel Order
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'shipped' && (
                                            <>
                                                <button
                                                    onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-green-500/20"
                                                >
                                                    Mark as Delivered
                                                </button>
                                                <button
                                                    onClick={() => setIsRejectModalOpen(true)}
                                                    className="px-6 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                                >
                                                    <X size={16} /> Cancel Order
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Customer & Order Info Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

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
                                                {order.txnid || 'Payment Pending / COD'}
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

        <ConfirmModal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectModalOpen(false)}
            onConfirm={() => onUpdateOrderStatus(order.id, 'deleted')}
            title="Cancel / Reject Order?"
            message="Are you sure you want to cancel this order? The customer will be informed that their payment will be refunded in 3-7 working days."
            confirmText="Cancel Order"
            cancelText="Keep Order"
            type="danger"
        />
        </>
    );
};

export default OrderModal;
