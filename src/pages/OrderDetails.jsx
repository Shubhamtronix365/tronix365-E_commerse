import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, ChevronLeft, CheckCircle, Clock, XCircle, FileText, Truck, CreditCard, User, Check, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await client.get(`/orders/${id}`);
                setOrder(res.data);
            } catch (error) {
                console.error("Order details error:", error);
                toast.error("Failed to load order details");
                // Navigate back if not found or unauthorized
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    if (loading) {
        return <div className="min-h-screen pt-24 text-center text-white">Loading order details...</div>;
    }

    if (!order) {
        return <div className="min-h-screen pt-24 text-center text-white">Order not found.</div>;
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-tronix-bg">
            <div className="max-w-5xl mx-auto">
                {/* Back Navigation */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>

                <div className="bg-tronix-card border border-white/10 rounded-xl overflow-hidden shadow-xl mb-6">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Order Details</h2>
                            <p className="text-sm text-gray-400">
                                Ordered on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                <span className="mx-2">|</span>
                                Order #order_tronix_{String(order.id).padStart(4, '0')}
                            </p>
                        </div>
                        <Link
                            to={`/invoice/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/10 text-sm font-medium transition-colors"
                        >
                            <FileText size={18} /> View Invoice
                        </Link>
                    </div>

                    <div className="p-6 md:p-8">
                        {/* Status Pipeline Stepper */}
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 relative overflow-hidden mb-8">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-emerald-500/20"></div>
                            {order.status === 'deleted' ? (
                                <div className="flex flex-col items-center justify-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mb-3">
                                        <XCircle size={32} className="text-red-500" />
                                    </div>
                                    <h3 className="text-red-400 font-bold text-lg">Order Rejected</h3>
                                    <p className="text-gray-400 text-sm mt-1">This order was not approved and has been cancelled.</p>
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
                                                    {step === 'pending' ? 'Pending Approval' : step === 'confirmed' ? 'Order Placed' : step}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Status Grid Dossier */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-colors">
                                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                                    <User size={14} className="text-violet-400" /> Customer Information
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Full Name</p>
                                        <div className="text-sm text-white font-medium">{order.full_name || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Email</p>
                                        <div className="text-sm text-gray-300">{order.customer_email || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Phone Number</p>
                                        <div className="text-sm text-gray-300">{order.phone || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-colors">
                                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                                    <CreditCard size={14} className="text-emerald-400" /> Payment & Timeline
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Transaction ID</p>
                                        <div className="text-sm text-white font-mono bg-black/20 px-2 py-0.5 rounded inline-block">{order.txnid || 'Generates on confirmation'}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Order Placed At</p>
                                        <div className="text-sm text-gray-300 flex items-center gap-1">
                                            <Calendar size={12} className="text-gray-500" />
                                            {new Date(order.created_at).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true, day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-colors">
                                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                                    <FileText size={14} className="text-blue-400" /> Financial Summary
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-300">
                                        <span>Item(s) Subtotal:</span>
                                        <span>₹{((order.total_amount + (order.discount_amount || 0)) / 1.18).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-300">
                                        <span>GST (18%):</span>
                                        <span className="text-yellow-400">₹{((order.total_amount + (order.discount_amount || 0)) - ((order.total_amount + (order.discount_amount || 0)) / 1.18)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-300">
                                        <span>Shipping:</span>
                                        <span className="text-emerald-400">Free</span>
                                    </div>
                                    {order.discount_amount > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-400 font-bold border-t border-white/5 pt-2">
                                            <span>
                                                Total Discount {order.coupon_code ? `(${order.coupon_code})` : ''}:
                                            </span>
                                            <span>- ₹{order.discount_amount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black text-emerald-400 pt-1 border-t border-white/10 mt-2">
                                        <span>Grand Total:</span>
                                        <span>₹{order.total_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <h3 className="text-lg font-bold text-white mb-4">Items in this order</h3>
                        <div className="space-y-4">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                                    {/* Product Image */}
                                    <div
                                        className="w-24 h-24 bg-black/40 rounded-xl border border-white/10 p-2 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-tronix-primary transition-colors"
                                        onClick={() => navigate(`/product/${item.product_id}`)}
                                    >
                                        {item.product ? (
                                            <img src={getImageUrl(item.product.image)} className="max-w-full max-h-full object-contain" alt={item.product.title} />
                                        ) : (
                                            <Package size={32} className="text-gray-600" />
                                        )}
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex-1 space-y-1">
                                        <h4
                                            className="text-lg font-bold text-blue-400 hover:text-blue-300 cursor-pointer line-clamp-2"
                                            onClick={() => navigate(`/product/${item.product_id}`)}
                                        >
                                            {item.product ? item.product.title : `Product ID: ${item.product_id}`}
                                            {item.bundle_id && (
                                                <span className="ml-2 bg-tronix-primary/20 text-tronix-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-tronix-primary/30">
                                                    Bundle
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-sm text-gray-400">Sold by: Tronix365</p>
                                        <div className="text-sm text-white font-medium mt-2">
                                            ₹{item.price_at_purchase || (item.product && (item.product.sale_price || item.product.price))}
                                        </div>
                                    </div>

                                    {/* Actions & Qty */}
                                    <div className="sm:text-right space-y-2 flex-shrink-0">
                                        <p className="text-sm text-gray-400">Qty: <span className="text-white font-medium">{item.quantity}</span></p>
                                        <button
                                            onClick={() => navigate(`/product/${item.product_id}`)}
                                            className="w-full sm:w-auto mt-2 bg-tronix-primary text-white hover:bg-violet-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Buy it again
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
