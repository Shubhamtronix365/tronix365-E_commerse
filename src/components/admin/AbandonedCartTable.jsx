import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShoppingBag, Send, MailCheck, AlertCircle, Search, RefreshCw, Clock, DollarSign, Users } from 'lucide-react';
import client from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';
import Image from '../common/Image';
import Skeleton from '../common/Skeleton';

const AbandonedCartTable = ({ onRefreshStats }) => {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // userId or 'all'
    const [data, setData] = useState({ summary: {}, carts: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'sent'

    const fetchAbandonedCarts = async () => {
        setLoading(true);
        try {
            const res = await client.get('/admin/abandoned-carts');
            setData(res.data);
            if (onRefreshStats) onRefreshStats();
        } catch (error) {
            console.error('Failed to fetch abandoned carts:', error);
            toast.error('Failed to load abandoned carts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAbandonedCarts();
    }, []);

    const handleSendSingleReminder = async (userId, customerName) => {
        setActionLoading(userId);
        try {
            const res = await client.post(`/admin/abandoned-carts/${userId}/send`);
            toast.success(res.data.message || `Reminder sent to ${customerName}`);
            await fetchAbandonedCarts();
        } catch (error) {
            console.error('Failed to send reminder:', error);
            const msg = error.response?.data?.detail || 'Failed to dispatch recovery reminder';
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendAllReminders = async () => {
        if (!window.confirm('Send recovery email reminders with 5% discount vouchers to all eligible customers?')) {
            return;
        }

        setActionLoading('all');
        try {
            const res = await client.post('/admin/abandoned-carts/send-all');
            toast.success(res.data.message || 'Bulk reminder dispatch completed');
            await fetchAbandonedCarts();
        } catch (error) {
            console.error('Bulk dispatch failed:', error);
            const msg = error.response?.data?.detail || 'Failed to trigger bulk reminders';
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredCarts = (data.carts || []).filter((c) => {
        const matchesQuery =
            !searchQuery ||
            c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'pending' && !c.reminder_sent) ||
            (filterStatus === 'sent' && c.reminder_sent);

        return matchesQuery && matchesStatus;
    });

    const summary = data.summary || {
        total_abandoned_carts: 0,
        total_recoverable_revenue: 0,
        reminders_sent_count: 0,
        pending_reminders_count: 0
    };

    return (
        <div className="p-6 space-y-6">
            {/* Top Stat Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <ShoppingBag size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Abandoned Carts</p>
                        <p className="text-2xl font-bold text-white">{summary.total_abandoned_carts || 0}</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Recoverable Revenue</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            ₹{(summary.total_recoverable_revenue || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Pending Reminders</p>
                        <p className="text-2xl font-bold text-amber-400">{summary.pending_reminders_count || 0}</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <MailCheck size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Reminders Sent</p>
                        <p className="text-2xl font-bold text-cyan-400">{summary.reminders_sent_count || 0}</p>
                    </div>
                </div>
            </div>

            {/* Action Bar: Search, Filters & Bulk Send */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by customer or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary transition-colors"
                        />
                    </div>

                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                filterStatus === 'all' ? 'bg-tronix-primary text-white shadow' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            All ({data.carts?.length || 0})
                        </button>
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Pending ({summary.pending_reminders_count || 0})
                        </button>
                        <button
                            onClick={() => setFilterStatus('sent')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                filterStatus === 'sent' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Sent ({summary.reminders_sent_count || 0})
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAbandonedCarts}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleSendAllReminders}
                        disabled={actionLoading === 'all' || summary.pending_reminders_count === 0}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send size={15} className={actionLoading === 'all' ? 'animate-spin' : ''} />
                        <span>
                            {actionLoading === 'all'
                                ? 'Sending Reminders...'
                                : `Send All Reminders (${summary.pending_reminders_count || 0})`}
                        </span>
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="p-4">Customer</th>
                            <th className="p-4">Abandoned Products</th>
                            <th className="p-4">Cart Total</th>
                            <th className="p-4">Last Activity</th>
                            <th className="p-4">Recovery Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-4"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-40" /></td>
                                    <td className="p-4"><Skeleton className="h-10 w-48 rounded-lg" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                                    <td className="p-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-24 rounded-lg ml-auto" /></td>
                                </tr>
                            ))
                        ) : filteredCarts.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-gray-500">
                                    <ShoppingBag size={36} className="mx-auto mb-3 opacity-40 text-tronix-primary" />
                                    <p className="text-base font-semibold text-gray-400">No Abandoned Carts Found</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        All customer carts are either checked out or currently active.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredCarts.map((cart) => {
                                const isSendingThis = actionLoading === cart.user_id;
                                const lastActiveDate = cart.last_active
                                    ? new Date(cart.last_active).toLocaleString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                      })
                                    : 'Unknown';

                                const sentDate = cart.reminder_sent_at
                                    ? new Date(cart.reminder_sent_at).toLocaleDateString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                      })
                                    : null;

                                return (
                                    <tr key={cart.user_id} className="hover:bg-white/[0.02] transition-colors">
                                        {/* Customer */}
                                        <td className="p-4">
                                            <p className="font-semibold text-white">{cart.customer_name}</p>
                                            <p className="text-xs text-gray-400">{cart.customer_email}</p>
                                            {cart.customer_phone && (
                                                <p className="text-[11px] text-gray-500">{cart.customer_phone}</p>
                                            )}
                                        </td>

                                        {/* Items Preview */}
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5 max-w-sm">
                                                {cart.items.slice(0, 2).map((item) => (
                                                    <div key={item.cart_item_id} className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
                                                            <Image
                                                                src={getImageUrl(item.image)}
                                                                alt={item.title}
                                                                className="max-h-full max-w-full object-contain"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-300 truncate" title={item.title}>
                                                            {item.title} <span className="text-gray-500">×{item.quantity}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                                {cart.items.length > 2 && (
                                                    <span className="text-[11px] text-purple-400 font-medium pl-1">
                                                        +{cart.items.length - 2} more component{cart.items.length - 2 > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Cart Total */}
                                        <td className="p-4 font-bold text-emerald-400">
                                            ₹{cart.cart_total.toLocaleString()}
                                        </td>

                                        {/* Last Active */}
                                        <td className="p-4 text-xs text-gray-400">
                                            {lastActiveDate}
                                        </td>

                                        {/* Status */}
                                        <td className="p-4">
                                            {cart.reminder_sent ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <MailCheck size={12} />
                                                    Sent {sentDate ? `(${sentDate})` : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    <AlertCircle size={12} />
                                                    Pending Reminder
                                                </span>
                                            )}
                                        </td>

                                        {/* Action Button */}
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleSendSingleReminder(cart.user_id, cart.customer_name)}
                                                disabled={isSendingThis}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    cart.reminder_sent
                                                        ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                        : 'bg-tronix-primary/20 hover:bg-tronix-primary/30 text-tronix-primary border border-tronix-primary/40'
                                                } disabled:opacity-50 cursor-pointer`}
                                            >
                                                <Send size={13} className={isSendingThis ? 'animate-spin' : ''} />
                                                <span>
                                                    {isSendingThis
                                                        ? 'Sending...'
                                                        : cart.reminder_sent
                                                        ? 'Resend Reminder'
                                                        : 'Send Reminder'}
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AbandonedCartTable;
