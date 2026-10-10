import { Package, Calendar, Eye, FileText, Clock, Store, Zap } from 'lucide-react';
import TaxInvoiceModal from '../invoice/TaxInvoiceModal';
import { formatOrderDateTime, isPickupOrFreeShipping } from '../../utils/orderUtils';

const OrdersSection = ({
    orders,
    orderStatusFilter,
    setOrderStatusFilter,
    navigate,
    hasMore,
    loadingMore,
    handleLoadMore,
}) => {
    const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

    const filteredOrders = orders.filter(
        (o) => orderStatusFilter === 'All' || o.status === orderStatusFilter
    );

    return (
        <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Order History</h2>

            {/* Order Status Tabs - Scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none sm:flex-wrap">
                {['All', 'pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setOrderStatusFilter(status)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                            orderStatusFilter === status
                                ? 'bg-violet-500 text-white border border-violet-400'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:text-white'
                        }`}
                    >
                        {status === 'All' ? 'All Orders' : status.replace('_', ' ').toUpperCase()}
                    </button>
                ))}
            </div>

            {orders.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                    <Package size={48} className="mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
                    <button
                        onClick={() => navigate('/shop')}
                        className="text-tronix-primary hover:text-white transition-colors"
                    >
                        Start shopping
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => navigate(`/order/${order.id}`)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden cursor-pointer hover:border-violet-500/40"
                            title="Click to view order details"
                        >
                            {/* Left Margin Accent Line */}
                            <div
                                className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    order.status === 'confirmed'
                                        ? 'bg-green-500'
                                        : order.status === 'pending'
                                        ? 'bg-yellow-500'
                                        : order.status === 'shipped' || order.status === 'out_for_delivery'
                                        ? 'bg-blue-500'
                                        : order.status === 'delivered'
                                        ? 'bg-emerald-500'
                                        : 'bg-red-500'
                                }`}
                            ></div>

                            {/* Left section: ID & Date */}
                            <div className="flex items-center gap-4 pl-2">
                                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 shrink-0">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                                        Order #order_tronix_{String(order.id).padStart(4, '0')}
                                        <span className="text-xs font-normal text-gray-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            <Clock size={12} className="text-violet-400" />
                                            {formatOrderDateTime(order.created_at)}
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {isPickupOrFreeShipping(order).isPickup && (
                                            <span className="text-[11px] font-bold text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-md border border-violet-500/30 flex items-center gap-1">
                                                <Store size={11} className="text-violet-400" />
                                                Store Pickup (Ready in 2–3 hrs)
                                            </span>
                                        )}
                                        {isPickupOrFreeShipping(order).isFreeShipping && (
                                            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                                                <Zap size={11} className="text-emerald-400" />
                                                Free Shipping (Ready in 2–3 hrs)
                                            </span>
                                        )}
                                        {order.courier && (
                                            <p className="text-xs text-blue-300 font-medium flex items-center gap-1">
                                                🚚 <strong className="text-white">{order.courier}</strong>{' '}
                                                {order.tracking_number ? `(${order.tracking_number})` : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle section: Stats */}
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto mr-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">
                                        Total Amount
                                    </p>
                                    <p className="text-emerald-400 font-bold sm:text-lg leading-tight">
                                        ₹{order.total_amount.toLocaleString()}
                                    </p>
                                    {order.coupon_code && (
                                        <p className="text-[10px] text-yellow-400/80 font-medium mt-0.5">
                                            Coupon: {order.coupon_code} (-₹{order.discount_amount})
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">
                                        Items
                                    </p>
                                    <p className="text-white font-medium sm:text-lg leading-tight">
                                        {Array.isArray(order.items) ? order.items.length : 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                        Status
                                    </p>
                                    <span
                                        className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${
                                            order.status === 'confirmed' || order.status === 'payment_received'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : order.status === 'payment_bounced'
                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                                : order.status === 'payment_cancelled'
                                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                                : order.status === 'payment_failed'
                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                : order.status === 'pending'
                                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                : order.status === 'shipped' || order.status === 'out_for_delivery'
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                : order.status === 'delivered'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}
                                    >
                                        {order.status === 'confirmed'
                                            ? 'Order Confirmed'
                                            : order.status === 'payment_received'
                                            ? 'Payment Received'
                                            : order.status === 'payment_bounced'
                                            ? 'Payment Bounced'
                                            : order.status === 'payment_cancelled'
                                            ? 'Payment Cancelled'
                                            : order.status === 'payment_failed'
                                            ? 'Payment Failed'
                                            : order.status === 'pending'
                                            ? 'Awaiting Payment'
                                            : order.status === 'deleted' || order.status === 'cancelled'
                                            ? 'Cancelled'
                                            : order.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {/* Bill / Tax Invoice generation button temporarily hidden
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoiceOrder(order);
                                    }}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl text-violet-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                    title="View & Download Official GST Tax Invoice"
                                >
                                    <FileText size={15} />
                                    <span>Tax Invoice</span>
                                </button>
                                */}
                                <button
                                    onClick={() => navigate(`/order/${order.id}`)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 group-hover:bg-violet-500/20 group-hover:text-violet-300 group-hover:border-violet-500/30"
                                >
                                    <Eye size={16} className="opacity-70" />
                                    <span>View Details</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* TaxInvoiceModal temporarily hidden
                    <TaxInvoiceModal
                        isOpen={Boolean(selectedInvoiceOrder)}
                        onClose={() => setSelectedInvoiceOrder(null)}
                        order={selectedInvoiceOrder}
                    />
                    */}

                    {filteredOrders.length === 0 && (
                        <div className="text-center py-12 px-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={24} className="text-gray-500" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">No Orders Found</h3>
                            <p className="text-gray-400 text-sm">
                                You have no orders matching the '{orderStatusFilter}' status.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors disabled:opacity-50"
                    >
                        {loadingMore ? 'Loading...' : 'Load Older Orders'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersSection;
