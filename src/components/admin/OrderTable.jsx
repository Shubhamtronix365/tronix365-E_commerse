import React, { useState } from 'react';
import { Package, Calendar, Search, FileText } from 'lucide-react';
import TaxInvoiceModal from '../invoice/TaxInvoiceModal';

const OrderTable = ({ 
    orders, 
    searchQuery, 
    orderStatusFilter, 
    setOrderStatusFilter, 
    setSelectedOrder, 
    hasMoreOrders, 
    loadMore, 
    loadingMore 
}) => {
    const [invoiceOrder, setInvoiceOrder] = useState(null);
    return (
        <>
            {/* Order Status Tabs */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {['All', 'pending', 'confirmed', 'shipped', 'delivered', 'deleted'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setOrderStatusFilter(status)}
                        className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm ${orderStatusFilter === status
                            ? 'bg-violet-500 text-white border border-violet-400'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:text-white'
                            }`}
                    >
                        {status === 'All' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-4 mb-6">
                {orders.length > 0 ? (
                    orders.map((order, index) => (
                        <div
                            key={index}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/10 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden cursor-pointer hover:border-violet-500/40"
                            title="Click to view full order details & clickable product specs"
                        >
                            {/* Left Margin Accent Line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'confirmed' ? 'bg-green-500' :
                                order.status === 'pending' ? 'bg-yellow-500' :
                                    order.status === 'shipped' ? 'bg-blue-500' :
                                        order.status === 'delivered' ? 'bg-emerald-500' :
                                            'bg-red-500'
                                }`}></div>

                            {/* Left section: ID & Email & Date */}
                            <div className="flex items-center gap-2.5 sm:gap-3 pl-2">
                                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] sm:text-xs font-bold shrink-0">
                                    S.No. #{index + 1}
                                </span>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 shrink-0">
                                    <Package size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm sm:text-lg leading-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        Order #order_tronix_{String(order.id).padStart(4, '0')}
                                        <span className="text-xs font-normal text-gray-500 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            <Calendar size={12} />
                                            {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-0.5">{order.full_name || order.customer_email}</p>
                                </div>
                            </div>

                            {/* Middle section: Stats */}
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto mr-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Total Amount</p>
                                    <p className="text-emerald-400 font-bold sm:text-lg leading-tight">₹{order.total_amount.toLocaleString()}</p>
                                    {order.coupon_code && (
                                        <p className="text-[10px] text-yellow-400/80 font-medium mt-0.5">
                                            Coupon: {order.coupon_code} (-₹{order.discount_amount})
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Items</p>
                                    <p className="text-white font-medium sm:text-lg leading-tight">{Array.isArray(order.items) ? order.items.length : 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Status</p>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${order.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                            order.status === 'shipped' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInvoiceOrder(order);
                                    }}
                                    className="w-full sm:w-auto px-3.5 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl text-violet-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                    title="View & Print Official GST Tax Invoice"
                                >
                                    <FileText size={14} />
                                    <span>Tax Invoice</span>
                                </button>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 group-hover:bg-violet-500/20 group-hover:text-violet-300 group-hover:border-violet-500/30"
                                >
                                    <Search size={16} className="opacity-70" />
                                    <span>View Details</span>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 px-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={24} className="text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">No Orders Found</h3>
                        <p className="text-gray-400 text-sm">We couldn't find any orders matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
            {hasMoreOrders && (
                <div className="flex justify-center mt-4">
                    <button onClick={loadMore} disabled={loadingMore} className="text-tronix-primary hover:underline disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More Orders'}
                    </button>
                </div>
            )}

            <TaxInvoiceModal
                isOpen={Boolean(invoiceOrder)}
                onClose={() => setInvoiceOrder(null)}
                order={invoiceOrder}
            />
        </>
    );
};

export default OrderTable;
