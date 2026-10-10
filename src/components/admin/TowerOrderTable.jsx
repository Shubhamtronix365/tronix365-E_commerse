import React, { useState, useEffect } from 'react';
import { 
    Factory, 
    Calendar, 
    Search, 
    Clock, 
    User, 
    DollarSign, 
    ArrowRight, 
    CheckCircle, 
    Truck, 
    FileText, 
    RefreshCw,
    ShieldAlert,
    Zap,
    Split,
    Layers
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
    { label: 'All Statuses', value: 'all' },
    { label: '1. Inquiries / Requested', value: 'requested' },
    { label: '2. Sales Contacted', value: 'contacted' },
    { label: '3. Quotation Sent', value: 'quotation_sent' },
    { label: '4. Payment UTR Submitted', value: 'payment_pending' },
    { label: '5. In Production / Sourcing', value: 'in_production' },
    { label: '6. Shipped / Dispatched', value: 'shipped' },
    { label: 'Completed', value: 'completed' },
];

const getStatusBadge = (status) => {
    switch (status) {
        case 'requested':
            return {
                label: 'Step 1: New Inquiry',
                bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                dot: 'bg-amber-400'
            };
        case 'contacted':
            return {
                label: 'Step 2: Contacted',
                bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                dot: 'bg-sky-400'
            };
        case 'quotation_sent':
            return {
                label: 'Step 3: P.I. Sent',
                bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
                dot: 'bg-indigo-400'
            };
        case 'payment_pending':
            return {
                label: 'Step 4: UTR Submitted',
                bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                dot: 'bg-purple-400 animate-pulse'
            };
        case 'in_production':
            return {
                label: 'Step 5: In Production',
                bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
                dot: 'bg-cyan-400 animate-spin'
            };
        case 'shipped':
            return {
                label: 'Step 6: Dispatched',
                bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                dot: 'bg-emerald-400'
            };
        case 'completed':
            return {
                label: 'Delivered / Complete',
                bg: 'bg-green-500/15 text-green-400 border-green-500/30',
                dot: 'bg-green-400'
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                bg: 'bg-red-500/15 text-red-400 border-red-500/30',
                dot: 'bg-red-400'
            };
        default:
            return {
                label: status || 'Pending',
                bg: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
                dot: 'bg-gray-400'
            };
    }
};

const TowerOrderTable = ({ onSelectOrder }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'split', 'pure_query'
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchTowerOrders = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            const res = await client.get('/admin/tower-orders', { params });
            setOrders(res.data || []);
        } catch (error) {
            console.error('Failed to fetch tower orders:', error);
            toast.error('Failed to load Tower Orders from server');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTowerOrders();
    }, [statusFilter]);

    // Real-time synchronization for Admin Table
    useEffect(() => {
        let channel = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('tronix_tower_orders_channel');
                channel.onmessage = (event) => {
                    if (event.data?.type === 'ORDER_STATUS_CHANGED' || event.data?.type === 'ORDER_UPDATED') {
                        fetchTowerOrders();
                    }
                };
            }
        } catch (e) {
            // ignore
        }

        const handleStorage = (e) => {
            if (e.key === 'tronix_tower_order_update_trigger') {
                fetchTowerOrders();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            if (channel) channel.close();
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchTowerOrders();
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchTowerOrders();
    };

    // Filter by Order Type
    const displayedOrders = orders.filter((ord) => {
        const isSplit = Boolean(ord.immediate_qty && ord.immediate_qty > 0);
        if (typeFilter === 'split') return isSplit;
        if (typeFilter === 'pure_query') return !isSplit;
        return true;
    });

    const splitCount = orders.filter(o => o.immediate_qty && o.immediate_qty > 0).length;
    const pureCount = orders.filter(o => !o.immediate_qty || o.immediate_qty === 0).length;

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Factory className="text-tronix-accent" size={22} />
                        B2B Tower Orders & Factory Indent Queries
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Manage B2B factory orders, split orders (Payment + Factory Query), P.I. quotes, and lead times.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by TO ID, customer, item..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary"
                        />
                    </form>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                        title="Refresh list"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Order Type Tabs (Payment + B2B Query vs Pure Query) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        typeFilter === 'all'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                >
                    All Sourcing Orders ({orders.length})
                </button>
                <button
                    onClick={() => setTypeFilter('split')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        typeFilter === 'split'
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-extrabold'
                            : 'bg-white/5 text-amber-300 hover:text-white border border-amber-500/20'
                    }`}
                >
                    <span className="text-sm">⚡</span>
                    <span>Payment + B2B Query (Split)</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-bold">{splitCount}</span>
                </button>
                <button
                    onClick={() => setTypeFilter('pure_query')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        typeFilter === 'pure_query'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 font-extrabold'
                            : 'bg-white/5 text-purple-300 hover:text-white border border-purple-500/20'
                    }`}
                >
                    <span className="text-sm">🏭</span>
                    <span>Pure B2B Tower Queries</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-bold">{pureCount}</span>
                </button>
            </div>

            {/* Status Step Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs">
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                            statusFilter === f.value
                                ? 'bg-tronix-accent text-white shadow-lg shadow-tronix-accent/20'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Loading / Empty / Content */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <div className="w-8 h-8 border-2 border-tronix-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Fetching factory tower orders...</span>
                </div>
            ) : displayedOrders.length === 0 ? (
                <div className="p-12 text-center bg-white/5 border border-white/10 rounded-2xl">
                    <Factory className="mx-auto text-gray-600 mb-3" size={40} />
                    <h3 className="text-base font-semibold text-white">No Tower Orders Found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        No orders match the selected filter. As soon as customers request bulk or backorder quotes, they will populate here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {displayedOrders.map((ord) => {
                        const badge = getStatusBadge(ord.status);
                        const isPaymentSubmitted = ord.status === 'payment_pending' && ord.payment_utr_number;
                        const isSplit = Boolean(ord.immediate_qty && ord.immediate_qty > 0);
                        const backorderQty = ord.backorder_qty || Math.max(0, ord.requested_qty - (ord.immediate_qty || 0));

                        return (
                            <div
                                key={ord.id}
                                onClick={() => onSelectOrder(ord)}
                                className="group relative bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-tronix-accent/50 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer overflow-hidden shadow-sm"
                            >
                                {/* Active Left Indicator */}
                                <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                                    isSplit ? 'bg-amber-400' :
                                    ord.status === 'in_production' ? 'bg-cyan-400' :
                                    ord.status === 'shipped' ? 'bg-emerald-400' :
                                    ord.status === 'payment_pending' ? 'bg-purple-400' :
                                    ord.status === 'quotation_sent' ? 'bg-indigo-400' :
                                    'bg-violet-400'
                                }`} />

                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pl-2">
                                    {/* Order Info & Product */}
                                    <div className="space-y-2.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-white group-hover:text-tronix-accent transition-colors">
                                                {ord.order_number}
                                            </span>

                                            {/* Primary Type Badge: Payment + B2B Query vs Pure B2B Query */}
                                            {isSplit ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500/20 to-teal-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                                                    <span>⚡</span> Payment + B2B Query
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm">
                                                    <span>🏭</span> B2B Tower Query
                                                </span>
                                            )}

                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                                {badge.label}
                                            </span>

                                            {isPaymentSubmitted && (
                                                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                                    UTR: {ord.payment_utr_number}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-tronix-accent shrink-0 mt-0.5">
                                                <Factory size={18} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-gray-100 transition-colors">
                                                    {ord.product_name}
                                                </h4>

                                                {/* Split Breakdown Chips or Pure Sourcing Chips */}
                                                {isSplit ? (
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                                                            ✓ Immediate Payment: {ord.immediate_qty} units (In-Stock)
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold">
                                                            🏭 Factory Query: {backorderQty} units (Backorder)
                                                        </span>
                                                        <span className="text-gray-400 text-xs">
                                                            Total: <strong className="text-white">{ord.requested_qty} units</strong>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                                                            🏭 Bulk Sourcing Inquiry: {ord.requested_qty} units
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                                    <span>Target Price: <strong className="text-white">₹{Number(ord.target_price || 0).toLocaleString()} / unit</strong></span>
                                                    {ord.target_total && (
                                                        <span className="text-emerald-400 font-medium">Budget: ₹{Number(ord.target_total).toLocaleString()}</span>
                                                    )}
                                                    {ord.quoted_unit_price && (
                                                        <span className="text-tronix-accent font-semibold">
                                                            Quoted: ₹{Number(ord.quoted_unit_price).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer & Lead Time Details */}
                                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 text-xs text-gray-400 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                                        <div className="min-w-[150px]">
                                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Customer & Business</p>
                                            <p className="text-white font-medium">{ord.customer_name}</p>
                                            <p className="text-gray-400 text-[11px]">{ord.customer_phone}</p>
                                            {ord.company_name && (
                                                <p className="text-violet-300 text-[11px] font-semibold truncate max-w-[150px]">🏢 {ord.company_name}</p>
                                            )}
                                        </div>

                                        <div className="min-w-[130px]">
                                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Lead Time</p>
                                            <div className="flex items-center gap-1 text-white">
                                                <Clock size={13} className="text-amber-400" />
                                                <span>{(ord.factory_lead_days || 7) + (ord.shipping_lead_days || 3)} Days total</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                                {ord.factory_lead_days || 7}d factory + {ord.shipping_lead_days || 3}d ship
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectOrder(ord);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-tronix-accent text-white rounded-lg text-xs font-semibold transition-all group-hover:bg-tronix-accent"
                                            >
                                                Manage Flow <ArrowRight size={13} />
                                            </button>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {new Date(ord.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TowerOrderTable;
