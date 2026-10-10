import React, { useState } from 'react';
import { 
    Package, 
    Calendar, 
    Search, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    AlertCircle, 
    Truck, 
    Building2, 
    Zap,
    Store
} from 'lucide-react';

const ORDER_STATUS_TABS = [
    { id: 'All', label: 'All Orders' },
    { id: 'confirmed', label: '✓ Payment Received' },
    { id: 'pending', label: '⏳ Awaiting Payment' },
    { id: 'bounced', label: '⚠ Payment Bounced' },
    { id: 'cancelled', label: '⊘ Payment Cancelled' },
    { id: 'failed', label: '✕ Payment Failed' },
    { id: 'shipped', label: '📦 Shipped' },
    { id: 'delivered', label: '🎉 Delivered' },
];

const getOrderBadge = (order) => {
    const status = (order.status || 'pending').toLowerCase();
    
    if (status === 'confirmed' || status === 'payment_received') {
        return {
            label: 'Payment Received',
            badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            barColor: 'bg-emerald-500',
            icon: CheckCircle2,
            iconColor: 'text-emerald-400'
        };
    }
    if (status === 'payment_bounced' || status === 'bounced') {
        return {
            label: 'Payment Bounced',
            badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            barColor: 'bg-rose-500',
            icon: AlertTriangle,
            iconColor: 'text-rose-400'
        };
    }
    if (status === 'payment_cancelled' || status === 'cancelled' || status === 'deleted') {
        return {
            label: 'Payment Cancelled',
            badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
            barColor: 'bg-orange-500',
            icon: XCircle,
            iconColor: 'text-orange-400'
        };
    }
    if (status === 'payment_failed' || status === 'failed') {
        return {
            label: 'Payment Failed',
            badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
            barColor: 'bg-red-500',
            icon: AlertCircle,
            iconColor: 'text-red-400'
        };
    }
    if (status === 'shipped' || status === 'out_for_delivery') {
        return {
            label: 'Dispatched / Shipped',
            badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            barColor: 'bg-blue-500',
            icon: Truck,
            iconColor: 'text-blue-400'
        };
    }
    if (status === 'delivered') {
        return {
            label: 'Delivered',
            badgeBg: 'bg-green-500/15 text-green-300 border-green-500/30',
            barColor: 'bg-green-500',
            icon: CheckCircle2,
            iconColor: 'text-green-400'
        };
    }
    
    // Default: Pending / Awaiting Payment
    return {
        label: 'Awaiting Payment',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        barColor: 'bg-amber-500',
        icon: Clock,
        iconColor: 'text-amber-400'
    };
};

const OrderTable = ({ 
    orders = [], 
    searchQuery = '', 
    orderStatusFilter = 'All', 
    setOrderStatusFilter, 
    setSelectedOrder, 
    hasMoreOrders = false, 
    loadMore, 
    loadingMore = false 
}) => {
    return (
        <div className="space-y-6">
            {/* Order Status Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs">
                {ORDER_STATUS_TABS.map((tab) => {
                    const isActive = orderStatusFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setOrderStatusFilter(tab.id)}
                            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                                isActive
                                    ? 'bg-violet-600 text-white border border-violet-400 shadow-violet-600/20'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Orders Feed */}
            <div className="space-y-3.5 mb-6">
                {orders.length > 0 ? (
                    orders.map((order, index) => {
                        const badge = getOrderBadge(order);
                        const StatusIcon = badge.icon;
                        const isB2B = Boolean(order.is_gst_invoice || order.company_name || order.gstin);
                        const isPickup = (order.shipping_method || '').toLowerCase() === 'pickup';
                        const isFreeShipping = Number(order.shipping_cost || 0) === 0 && !isPickup;

                        return (
                            <div
                                key={order.id || index}
                                onClick={() => setSelectedOrder(order)}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/[0.08] transition-all group flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden cursor-pointer hover:border-violet-500/40 shadow-sm"
                                title="Click to inspect order specifications, payment records, and dispatch actions"
                            >
                                {/* Left Color Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${badge.barColor}`} />

                                {/* Left Section: ID, Type Badges, Customer & Logistics */}
                                <div className="flex items-start gap-3 pl-2 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                                        <Package size={20} />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-white font-bold text-sm sm:text-base leading-tight">
                                                Order #order_tronix_{String(order.id).padStart(4, '0')}
                                            </h3>

                                            {/* Order Classification Badge */}
                                            {isB2B ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                                    <Building2 size={11} className="text-blue-400" />
                                                    B2B Business Order
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10 text-[10px] font-medium">
                                                    Standard Retail Order
                                                </span>
                                            )}

                                            {/* Store Pickup / Free Shipping Indicator */}
                                            {isPickup && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
                                                    <Store size={11} className="text-violet-400" />
                                                    Store Pickup (Ready in 2–3h)
                                                </span>
                                            )}
                                            {isFreeShipping && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                                    <Zap size={11} className="text-emerald-400" />
                                                    Free Shipping
                                                </span>
                                            )}

                                            <span className="text-xs text-gray-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                <Calendar size={12} />
                                                {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                            <span className="text-gray-300 font-medium">
                                                {order.full_name || order.customer_email}
                                            </span>
                                            {order.phone && <span>Ph: {order.phone}</span>}
                                            {order.company_name && (
                                                <span className="text-violet-300 font-semibold">
                                                    🏢 {order.company_name}
                                                </span>
                                            )}
                                            {order.txnid && (
                                                <span className="font-mono text-[11px] text-gray-500">
                                                    TXN: {order.txnid}
                                                </span>
                                            )}
                                        </div>

                                        {/* Cancellation / Bounce / Failure Reason Banner */}
                                        {order.cancellation_reason && (
                                            <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 font-medium">
                                                <AlertTriangle size={12} className="text-red-400 shrink-0" />
                                                <span>{order.cancellation_reason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Section: Amount, Items, and Detailed Payment Status */}
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:ml-auto mr-2 pl-2 lg:pl-0">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Total Amount</p>
                                        <p className="text-emerald-400 font-bold text-base sm:text-lg leading-tight">
                                            ₹{Number(order.total_amount || 0).toLocaleString()}
                                        </p>
                                        {order.coupon_code && (
                                            <p className="text-[10px] text-yellow-400/90 font-medium">
                                                Coupon: {order.coupon_code} (-₹{order.discount_amount})
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Items</p>
                                        <p className="text-white font-medium text-base sm:text-lg leading-tight">
                                            {Array.isArray(order.items) ? order.items.length : 0}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Payment & Order Status</p>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${badge.badgeBg}`}>
                                            <StatusIcon size={13} className={badge.iconColor} />
                                            {badge.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Action CTA */}
                                <div className="flex items-center gap-2 pl-2 lg:pl-0">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 rounded-xl text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 group-hover:text-violet-300"
                                    >
                                        <Search size={14} className="opacity-70" />
                                        <span>Manage Order</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-14 px-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                            <Search size={26} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No Orders Found</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto">
                            No orders match the selected filter {orderStatusFilter !== 'All' ? `"${orderStatusFilter}"` : ''} {searchQuery ? `or query "${searchQuery}"` : ''}.
                        </p>
                    </div>
                )}
            </div>

            {hasMoreOrders && (
                <div className="flex justify-center mt-4">
                    <button 
                        onClick={loadMore} 
                        disabled={loadingMore} 
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loadingMore ? 'Loading More Orders...' : 'Load More Orders'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrderTable;
