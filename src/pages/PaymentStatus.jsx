import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    CheckCircle, 
    XCircle, 
    ArrowLeft, 
    RefreshCw, 
    ShoppingBag, 
    Package, 
    Calendar, 
    MapPin, 
    CreditCard,
    AlertCircle,
    Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const PaymentStatus = () => {
    const [searchParams] = useSearchParams();
    const txnid = searchParams.get('txnid');
    const navigate = useNavigate();
    const { clearCart } = useCart();

    const [order, setOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [retrying, setRetrying] = useState(false);

    // Determine status based on URL path
    const isSuccess = window.location.pathname.includes('success');

    // Fetch order details by Transaction ID
    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!txnid) {
                setLoadingOrder(false);
                return;
            }
            try {
                const response = await client.get(`/orders/transaction/${txnid}`);
                setOrder(response.data);
            } catch (err) {
                console.error("Error fetching order:", err);
            } finally {
                setLoadingOrder(false);
            }
        };

        fetchOrderDetails();
    }, [txnid]);

    // Clear cart on success
    useEffect(() => {
        if (isSuccess) {
            clearCart();
        }
    }, [isSuccess]);

    // Handle Payment Retry
    const handleRetryPayment = async () => {
        if (!order) return;
        setRetrying(true);
        try {
            // 1. Request new PayU parameters and hash
            const response = await client.post(`/payment/retry/${order.id}`);
            const data = response.data;

            toast.success("Initiating secure payment retry...");

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
                phone: data.phone,
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
            console.error("Payment retry error:", error);
            toast.error(error.response?.data?.detail || "Payment retry failed. Please try again from Cart.");
            setRetrying(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4 bg-[#0F172A] flex items-center justify-center">
            <div className="max-w-3xl w-full space-y-6">
                
                {/* Header Card */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-tronix-card border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-tronix-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    
                    <div className="flex justify-center mb-6">
                        {isSuccess ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: 360 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <CheckCircle className="text-emerald-500 w-24 h-24 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <XCircle className="text-red-500 w-24 h-24 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
                            </motion.div>
                        )}
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
                        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
                    </h1>

                    <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm sm:text-base">
                        {isSuccess
                            ? "Thank you! Your transaction completed successfully. An invoice and confirmation email has been sent."
                            : "We couldn't process your payment. Your cart remains intact, and you can try again below."}
                    </p>

                    {txnid && (
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full text-xs text-gray-300">
                            <span className="font-semibold text-gray-500 uppercase">Transaction ID:</span>
                            <span className="font-mono text-tronix-accent">{txnid}</span>
                        </div>
                    )}
                </motion.div>

                {/* Loading / Order Details Card */}
                {txnid && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-tronix-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        {loadingOrder ? (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                                <Loader size={32} className="animate-spin text-tronix-primary" />
                                <p>Loading purchase details...</p>
                            </div>
                        ) : order ? (
                            <div>
                                {/* Summary Header */}
                                <div className="p-6 border-b border-white/10 bg-white/[0.02] flex flex-wrap justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <Package className="text-tronix-primary" size={22} />
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order Reference</p>
                                            <p className="text-white font-bold">#order_tronix_{String(order.id).padStart(4, '0')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-gray-400" size={20} />
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order Date</p>
                                            <p className="text-white font-medium text-sm">
                                                {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items list */}
                                <div className="p-6 border-b border-white/10 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Items Purchased</h3>
                                    {order.items && order.items.map((item) => (
                                        <div key={item.id} className="flex gap-4 items-center justify-between">
                                            <div className="flex gap-3 items-center min-w-0">
                                                <div className="w-12 h-12 bg-white/5 rounded-lg flex-shrink-0 flex items-center justify-center p-1 border border-white/5">
                                                    <img src={getImageUrl(item.product?.image)} className="max-w-full max-h-full object-contain" alt="Product" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{item.product?.title || 'Product Item'}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-white">₹{item.price_at_purchase * item.quantity}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Address & Bill Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2">
                                    {/* Shipping Address */}
                                    <div className="p-6 border-b md:border-b-0 md:border-r border-white/10 space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                            <MapPin size={14} className="text-tronix-primary" /> Shipping Address
                                        </h4>
                                        <p className="text-sm font-bold text-white">{order.full_name}</p>
                                        <p className="text-sm text-gray-400">{order.address_line}</p>
                                        <p className="text-sm text-gray-400">{order.city}, {order.state} - {order.pincode}</p>
                                        <p className="text-sm text-gray-400">Mobile: {order.phone}</p>
                                    </div>

                                    {/* Bill Breakdown */}
                                    <div className="p-6 space-y-3 bg-white/[0.01]">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                            <CreditCard size={14} className="text-tronix-accent" /> Payment Summary
                                        </h4>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Subtotal:</span>
                                            <span>₹{order.total_amount - Math.round(order.total_amount * 0.18 / 1.18)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>GST (18%):</span>
                                            <span>₹{Math.round(order.total_amount * 0.18 / 1.18)}</span>
                                        </div>
                                        {order.coupon_code && (
                                            <div className="flex justify-between text-xs text-emerald-400">
                                                <span>Coupon Discount ({order.coupon_code}):</span>
                                                <span>- ₹{order.discount_amount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                                            <span>Paid Amount:</span>
                                            <span className="text-tronix-accent">₹{order.total_amount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-red-400 flex items-center gap-2 justify-center">
                                <AlertCircle size={20} />
                                <p>Failed to retrieve summary for this order record.</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Actions Row */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    {isSuccess ? (
                        <>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex-1 bg-tronix-primary hover:bg-violet-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-tronix-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <ShoppingBag size={18} />
                                Track Order Details
                            </button>
                            <Link
                                to="/shop"
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl border border-white/10 transition-all text-center flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                Continue Shopping
                            </Link>
                        </>
                    ) : (
                        <>
                            {order && (
                                <button
                                    onClick={handleRetryPayment}
                                    disabled={retrying}
                                    className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {retrying ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Redirecting to Gateway...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={18} />
                                            Retry Secure Payment
                                        </>
                                    )}
                                </button>
                            )}
                            <Link
                                to="/cart"
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl border border-white/10 transition-all text-center flex items-center justify-center gap-2"
                            >
                                <ShoppingBag size={18} />
                                Back to Shopping Cart
                            </Link>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default PaymentStatus;
