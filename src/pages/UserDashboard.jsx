import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { 
    Package, 
    User, 
    LogOut, 
    ChevronRight, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Mail, 
    ShieldCheck, 
    Calendar, 
    Eye, 
    EyeOff, 
    Upload, 
    Camera,
    Factory,
    Truck,
    Split,
    CreditCard,
    FileSpreadsheet,
    ExternalLink,
    ArrowRight,
    RefreshCw,
    Layers,
    AlertCircle,
    Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const UserDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');

    // Tower Orders State
    const [towerOrders, setTowerOrders] = useState([]);
    const [towerLoading, setTowerLoading] = useState(false);
    const [towerFilter, setTowerFilter] = useState('all');
    const [activePaymentOrderId, setActivePaymentOrderId] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ mode: 'NEFT', utr: '', receiptUrl: '' });
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [recentlyUpdatedOrderId, setRecentlyUpdatedOrderId] = useState(null);
    const prevOrdersRef = useRef([]);

    // Profile Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', password: '', profile_picture: '' });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 5; // Smaller limit for user dashboard

    const fetchTowerOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setTowerLoading(true);
            const res = await client.get('/tower-orders/user');
            const newOrders = res.data || [];

            // Detect real-time status transitions
            if (prevOrdersRef.current && prevOrdersRef.current.length > 0) {
                newOrders.forEach(newO => {
                    const oldO = prevOrdersRef.current.find(o => o.id === newO.id);
                    if (oldO && oldO.status !== newO.status) {
                        const statusLabels = {
                            'requested': 'Inquiry Registered',
                            'contacted': 'Sales Review Initiated',
                            'quotation_sent': 'Quotation & P.I. Ready',
                            'payment_pending': 'Awaiting Payment',
                            'payment_received': 'Payment Received',
                            'in_production': 'Production / Factory Sourcing Active',
                            'shipped': 'Consignment Dispatched',
                            'delivered': 'Delivered'
                        };
                        const statusName = statusLabels[newO.status] || newO.status.replace('_', ' ');

                        toast.success(`Tower Order #${newO.order_number} status updated to: "${statusName}"!`, {
                            icon: '🏭',
                            duration: 6000,
                        });
                        setRecentlyUpdatedOrderId(newO.id);
                        setTimeout(() => setRecentlyUpdatedOrderId(null), 8000);
                    }
                });
            }

            prevOrdersRef.current = newOrders;
            setTowerOrders(newOrders);
        } catch (error) {
            if (!silent) {
                console.error("Failed to load tower orders:", error);
            }
        } finally {
            if (!silent) setTowerLoading(false);
        }
    }, []);

    // Real-Time Tower Orders Synchronization (cross-tab broadcast, window focus, storage sync, and smart polling)
    useEffect(() => {
        let channel = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('tronix_tower_orders_channel');
                channel.onmessage = (event) => {
                    if (event.data?.type === 'ORDER_STATUS_CHANGED' || event.data?.type === 'ORDER_UPDATED') {
                        fetchTowerOrders(true);
                    }
                };
            }
        } catch (e) {
            console.error('BroadcastChannel error:', e);
        }

        const handleStorageSync = (e) => {
            if (e.key === 'tronix_tower_order_update_trigger') {
                fetchTowerOrders(true);
            }
        };
        window.addEventListener('storage', handleStorageSync);

        const handleVisibilityFocus = () => {
            if (document.visibilityState === 'visible') {
                fetchTowerOrders(true);
            }
        };
        window.addEventListener('focus', handleVisibilityFocus);
        document.addEventListener('visibilitychange', handleVisibilityFocus);

        // Smart polling: every 3.5s when on tower_orders tab, 12s on other dashboard tabs
        const pollFrequency = activeTab === 'tower_orders' ? 3500 : 12000;
        const pollTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchTowerOrders(true);
            }
        }, pollFrequency);

        return () => {
            if (channel) channel.close();
            window.removeEventListener('storage', handleStorageSync);
            window.removeEventListener('focus', handleVisibilityFocus);
            document.removeEventListener('visibilitychange', handleVisibilityFocus);
            clearInterval(pollTimer);
        };
    }, [activeTab, fetchTowerOrders]);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('tronix_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Fetch Profile, Initial Orders, and Tower Orders concurrently
                const [profileRes, ordersRes, towerRes] = await Promise.all([
                    client.get('/profile'),
                    client.get(`/orders/user?skip=0&limit=${LIMIT}`),
                    client.get('/tower-orders/user').catch(() => ({ data: [] }))
                ]);

                setUser(profileRes.data);
                setOrders(ordersRes.data);
                const initialTowerOrders = towerRes.data || [];
                prevOrdersRef.current = initialTowerOrders;
                setTowerOrders(initialTowerOrders);
                if (ordersRes.data.length < LIMIT) setHasMore(false);

            } catch (error) {
                console.error("Dashboard error:", error);

                // If 401, token might be invalid
                if (error.response && error.response.status === 401) {
                    toast.error("Session expired. Please login again.");
                    localStorage.removeItem('tronix_token');
                    localStorage.removeItem('tronix_user');
                    navigate('/login');
                } else {
                    toast.error("Failed to load dashboard data");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleLoadMore = async () => {

        setLoadingMore(true);
        try {
            const nextSkip = page * LIMIT;
            const res = await client.get(`/orders/user?skip=${nextSkip}&limit=${LIMIT}`);
            const newOrders = res.data;

            setOrders(prev => [...prev, ...newOrders]);
            setPage(prev => prev + 1);
            if (newOrders.length < LIMIT) setHasMore(false);
        } catch (e) {
            toast.error("Failed to load more orders");
        } finally {
            setLoadingMore(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('tronix_token');
        localStorage.removeItem('tronix_user');
        localStorage.removeItem('user');
        localStorage.removeItem('tronix365_cart');
        setUser(null);
        navigate('/login');
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        setEditForm({ full_name: user?.full_name || '', password: '', profile_picture: user?.profile_picture || '' });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploadingImage(true);
        try {
            const res = await client.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditForm(prev => ({ ...prev, profile_picture: res.data.url }));
            toast.success('Image uploaded successfully! Click Save to apply.');
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Failed to upload image.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleUpdateProfile = async () => {
        setUpdating(true);
        try {
            const payload = {};
            if (editForm.full_name !== user?.full_name) payload.full_name = editForm.full_name;
            if (editForm.password) payload.password = editForm.password;
            if (editForm.profile_picture !== user?.profile_picture) payload.profile_picture = editForm.profile_picture;

            if (Object.keys(payload).length === 0) {
                setIsEditing(false);
                setUpdating(false);
                return;
            }

            const res = await client.put('/profile', payload);
            setUser(res.data);

            // update local storage
            const localUser = JSON.parse(localStorage.getItem('tronix_user') || '{}');
            localUser.name = res.data.full_name;
            localUser.profile_picture = res.data.profile_picture;
            localStorage.setItem('tronix_user', JSON.stringify(localUser));

            toast.success("Profile updated successfully!");
            setIsEditing(false);
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setUpdating(false);
        }
    };

    const handlePaymentSubmit = async (orderId) => {
        if (!paymentForm.utr.trim()) {
            toast.error("Please enter the NEFT/RTGS/IMPS Transaction reference (UTR)");
            return;
        }

        try {
            setSubmittingPayment(true);
            await client.post(`/tower-orders/${orderId}/payment-proof`, {
                payment_mode: paymentForm.mode,
                payment_ref_utr: paymentForm.utr.trim(),
                payment_receipt_url: paymentForm.receiptUrl || null
            });
            toast.success("Payment reference submitted! Accounts team will verify shortly.");
            setPaymentForm({ mode: 'NEFT', utr: '', receiptUrl: '' });
            setActivePaymentOrderId(null);
            fetchTowerOrders();
        } catch (error) {
            console.error("Failed to submit payment proof:", error);
            toast.error(error.response?.data?.detail || "Failed to submit payment details");
        } finally {
            setSubmittingPayment(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-24 text-center text-white">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-tronix-bg">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar */}
                    <div className="w-full md:w-64 space-y-4">
                        <div className="bg-tronix-card border border-white/10 rounded-xl p-6 text-center">
                            <div className="w-20 h-20 rounded-full mx-auto mb-4 relative overflow-hidden bg-tronix-primary/20 border-2 border-tronix-primary/30 flex items-center justify-center">
                                {user?.profile_picture ? (
                                    <img src={getImageUrl(user.profile_picture)} alt={user?.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-tronix-primary">
                                        {user?.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                        </div>

                        <div className="bg-tronix-card border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <Package size={20} /> My Orders
                            </button>
                            <button
                                onClick={() => setActiveTab('tower_orders')}
                                className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${activeTab === 'tower_orders' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <Factory size={20} /> Tower Orders
                                </span>
                                {towerOrders.length > 0 && (
                                    <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                        {towerOrders.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <User size={20} /> Profile Details
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={20} /> Logout
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {activeTab === 'orders' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-6">Order History</h2>

                                {/* Order Status Tabs */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['All', 'pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setOrderStatusFilter(status)}
                                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${orderStatusFilter === status
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
                                        {orders.filter(o => orderStatusFilter === 'All' || o.status === orderStatusFilter).map((order) => (
                                            <div
                                                key={order.id}
                                                onClick={() => navigate(`/order/${order.id}`)}
                                                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden cursor-pointer hover:border-violet-500/40"
                                                title="Click to view order details"
                                            >
                                                {/* Left Margin Accent Line */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'confirmed' ? 'bg-green-500' :
                                                    order.status === 'pending' ? 'bg-yellow-500' :
                                                        order.status === 'shipped' || order.status === 'out_for_delivery' ? 'bg-blue-500' :
                                                            order.status === 'delivered' ? 'bg-emerald-500' :
                                                                'bg-red-500'
                                                    }`}></div>

                                                {/* Left section: ID & Date */}
                                                <div className="flex items-center gap-4 pl-2">
                                                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 shrink-0">
                                                        <Package size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                                                            Order #order_tronix_{String(order.id).padStart(4, '0')}
                                                            <span className="text-xs font-normal text-gray-500 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                                <Calendar size={12} />
                                                                {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                            </span>
                                                        </h3>
                                                        {order.courier && (
                                                            <p className="text-xs text-blue-300 font-medium mt-0.5 flex items-center gap-1">
                                                                🚚 Courier: <strong className="text-white">{order.courier}</strong> {order.tracking_number ? `(${order.tracking_number})` : ''}
                                                            </p>
                                                        )}

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
                                                                order.status === 'shipped' || order.status === 'out_for_delivery' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                    order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                            }`}>
                                                            {order.status === 'confirmed' ? 'Order Confirmed' : order.status === 'pending' ? 'Pending Approval' : order.status === 'deleted' || order.status === 'cancelled' ? 'Cancelled (Refund 3-7 days)' : order.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Right Action Button */}
                                                <button
                                                    onClick={() => navigate(`/order/${order.id}`)}
                                                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 group-hover:bg-violet-500/20 group-hover:text-violet-300 group-hover:border-violet-500/30"
                                                >
                                                    <Eye size={16} className="opacity-70" />
                                                    <span>View Details</span>
                                                </button>
                                            </div>
                                        ))}

                                        {orders.filter(o => orderStatusFilter === 'All' || o.status === orderStatusFilter).length === 0 && (
                                            <div className="text-center py-12 px-4 bg-white/5 border border-white/10 rounded-2xl">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Package size={24} className="text-gray-500" />
                                                </div>
                                                <h3 className="text-lg font-medium text-white mb-1">No Orders Found</h3>
                                                <p className="text-gray-400 text-sm">You have no orders matching the '{orderStatusFilter}' status.</p>
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
                        )}

                        {/* TOWER ORDERS TAB */}
                        {activeTab === 'tower_orders' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                            <Factory className="text-violet-400" size={26} /> My Tower Orders
                                        </h2>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Track your on-demand procurement & bulk indent requests with factory lead time
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={fetchTowerOrders}
                                            disabled={towerLoading}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10"
                                            title="Refresh Orders"
                                        >
                                            <RefreshCw size={16} className={towerLoading ? 'animate-spin' : ''} />
                                        </button>
                                        <button
                                            onClick={() => navigate('/tower-orders')}
                                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/20 transition-all flex items-center gap-1.5"
                                        >
                                            <Send size={14} /> New Tower Order
                                        </button>
                                    </div>
                                </div>

                                {/* Status Filters */}
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'all', label: 'All Orders' },
                                        { id: 'requested', label: '1. Requested' },
                                        { id: 'contacted', label: '2. Under Review' },
                                        { id: 'quotation_sent', label: '3. Quotation Ready' },
                                        { id: 'payment_pending', label: '4. Payment Transfer' },
                                        { id: 'in_production', label: '5. Factory Sourcing' },
                                        { id: 'shipped', label: '6. Shipped' },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setTowerFilter(f.id)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${towerFilter === f.id ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                {towerLoading ? (
                                    <div className="py-16 text-center">
                                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-xs text-gray-400 mt-2">Loading your tower orders...</p>
                                    </div>
                                ) : towerOrders.filter(o => towerFilter === 'all' || o.status === towerFilter).length === 0 ? (
                                    <div className="p-12 text-center bg-white/5 border border-white/10 rounded-2xl space-y-4">
                                        <Factory size={44} className="mx-auto text-gray-500" />
                                        <div>
                                            <h3 className="text-lg font-bold text-white">No Tower Orders Found</h3>
                                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                                You have not placed any on-demand sourcing or bulk Tower Orders {towerFilter !== 'all' ? `with status '${towerFilter}'` : 'yet'}.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/tower-orders')}
                                            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors"
                                        >
                                            Explore Tower Orders & Sourcing
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {towerOrders
                                            .filter(o => towerFilter === 'all' || o.status === towerFilter)
                                            .map(order => {
                                                const stepIndexMap = {
                                                    'requested': 1,
                                                    'contacted': 2,
                                                    'quotation_sent': 3,
                                                    'payment_pending': 4,
                                                    'payment_received': 5,
                                                    'in_production': 5,
                                                    'shipped': 6,
                                                    'delivered': 6
                                                };
                                                const currentStep = stepIndexMap[order.status] || 1;

                                                return (
                                                    <div
                                                        key={order.id}
                                                        className={`p-6 rounded-2xl bg-white/5 border transition-all duration-500 space-y-6 shadow-xl ${
                                                            recentlyUpdatedOrderId === order.id
                                                                ? 'border-violet-400 ring-2 ring-violet-500/60 shadow-violet-500/25 bg-violet-950/20 animate-pulse'
                                                                : 'border-white/10 hover:border-violet-500/30'
                                                        }`}
                                                    >
                                                        {/* Header Info */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                                                                    <Factory size={20} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-bold text-white text-base tracking-wide">
                                                                            {order.order_number}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400">•</span>
                                                                        <span className="text-xs text-gray-400">
                                                                            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                                        Target Price: <strong className="text-tronix-accent">₹{order.target_price}/unit</strong> (Total Budget: ₹{order.target_total?.toLocaleString('en-IN')})
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Status Badge */}
                                                            <div>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                    order.status === 'shipped' || order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                                    order.status === 'in_production' || order.status === 'payment_received' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                                                                    order.status === 'quotation_sent' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                                    order.status === 'payment_pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                                                    order.status === 'contacted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                                    'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                                                }`}>
                                                                    Step {currentStep}: {order.status.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Product Details & Split fulfillment info */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="md:col-span-2 flex items-start gap-4">
                                                                {order.product_image && (
                                                                    <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                        <img src={order.product_image} alt="" className="max-h-full max-w-full object-contain" />
                                                                    </div>
                                                                )}
                                                                <div className="space-y-1">
                                                                    <h4 className="text-white font-bold text-sm line-clamp-1">{order.product_name}</h4>
                                                                    {order.product_sku && <p className="text-xs text-gray-400">SKU: <span className="font-mono text-gray-300">{order.product_sku}</span></p>}
                                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                                        <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold text-xs">
                                                                            Total Qty: {order.requested_qty} units
                                                                        </span>
                                                                        {order.immediate_qty > 0 && (
                                                                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                                                                                Split: {order.immediate_qty} Immediate + {order.backorder_qty} Factory Backorder
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1 text-xs text-gray-400">
                                                                <div className="text-gray-300 font-semibold text-[11px] uppercase">Destination</div>
                                                                <div>{order.customer_name} {order.company_name ? `(${order.company_name})` : ''}</div>
                                                                <div className="truncate">{order.delivery_city || 'City'}, {order.delivery_pincode || ''}</div>
                                                                <div>Ph: {order.customer_phone}</div>
                                                            </div>
                                                        </div>

                                                        {/* The 6-Step Visual Milestone Tracker */}
                                                        <div className="pt-2">
                                                            <div className="text-[11px] font-bold text-gray-400 uppercase mb-3 flex items-center justify-between">
                                                                <span>Order Progress Lifecycle</span>
                                                                <span className="text-violet-400">Step {currentStep} of 6</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                                {[
                                                                    { num: 1, name: '1. Placed', desc: 'Website Order' },
                                                                    { num: 2, name: '2. Contact', desc: 'Sales Review' },
                                                                    { num: 3, name: '3. Quotation', desc: 'P.I. Ready' },
                                                                    { num: 4, name: '4. Transfer', desc: 'NEFT/RTGS' },
                                                                    { num: 5, name: '5. Sourcing', desc: 'Factory Direct' },
                                                                    { num: 6, name: '6. Shipped', desc: 'Lead Tracker' },
                                                                ].map(s => {
                                                                    const isCompleted = currentStep > s.num;
                                                                    const isCurrent = currentStep === s.num;
                                                                    return (
                                                                        <div
                                                                            key={s.num}
                                                                            className={`p-2.5 rounded-xl text-center border transition-all ${
                                                                                isCurrent ? 'bg-violet-600/30 border-violet-500 text-white ring-2 ring-violet-500/20' :
                                                                                isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                                                                'bg-white/5 border-white/5 text-gray-500'
                                                                            }`}
                                                                        >
                                                                            <div className="text-xs font-bold">{s.name}</div>
                                                                            <div className="text-[10px] mt-0.5 opacity-80">{s.desc}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* STEP 6 LEAD TIME TRACKER (Always Visible On Website) */}
                                                        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-black/20 border border-violet-500/30 space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 text-violet-300 font-bold text-xs uppercase tracking-wide">
                                                                    <Truck size={16} /> # Lead Time Tracker (Factory + Shipping Time)
                                                                </div>
                                                                <div className="text-xs text-gray-300 font-mono">
                                                                    🏭 {order.factory_lead_days || 7}d Factory + 🚚 {order.shipping_lead_days || 3}d Transit
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                                                                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                                    <div className="text-gray-400 text-[10px]">Estimated Dispatch</div>
                                                                    <div className="font-bold text-white mt-0.5">
                                                                        {order.estimated_dispatch_date || (order.payment_status === 'verified' ? 'In Factory Production' : 'Pending Payment Verification')}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                                    <div className="text-gray-400 text-[10px]">Estimated Delivery</div>
                                                                    <div className="font-bold text-white mt-0.5">
                                                                        {order.estimated_delivery_date || 'Calculated on Dispatch'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                                    <div className="text-gray-400 text-[10px]">Courier Partner</div>
                                                                    <div className="font-bold text-emerald-400 mt-0.5">
                                                                        {order.courier_name || 'Assigned on Dispatch'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                                    <div className="text-gray-400 text-[10px]">Tracking Number</div>
                                                                    <div className="font-bold font-mono text-white mt-0.5">
                                                                        {order.tracking_number || 'Awaiting Shipment'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {order.tracking_url && (
                                                                <div className="pt-1 flex justify-end">
                                                                    <a
                                                                        href={order.tracking_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
                                                                    >
                                                                        <Truck size={14} /> Live Track Consignment <ExternalLink size={12} />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* STEP 3 & 4: QUOTATION & PAYMENT (NEFT/RTGS/IMPS) */}
                                                        {order.quoted_unit_price ? (
                                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                                                    <div>
                                                                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                                                            <FileSpreadsheet size={15} /> Proforma Invoice & Official Quotation
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                                            P.I. Number: <strong className="text-white font-mono">{order.pi_number}</strong>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-xs text-gray-400">Final Quoted Price</div>
                                                                        <div className="text-lg font-bold text-tronix-accent">
                                                                            ₹{order.quoted_unit_price} / unit
                                                                        </div>
                                                                        <div className="text-xs font-bold text-emerald-400">
                                                                            Total: ₹{order.quoted_total_amount?.toLocaleString('en-IN')}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Bank Details for NEFT/RTGS */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                                    <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                                                                        <div className="font-bold text-gray-300 uppercase text-[10px]">Beneficiary Bank Details (NEFT / RTGS / IMPS)</div>
                                                                        <div className="text-gray-400">Account Name: <strong className="text-white">Tronix365 Technologies Pvt Ltd</strong></div>
                                                                        <div className="text-gray-400">Bank: <strong className="text-white">HDFC Bank Ltd</strong></div>
                                                                        <div className="text-gray-400">Account No: <strong className="text-white font-mono">50200088912345</strong></div>
                                                                        <div className="text-gray-400">IFSC Code: <strong className="text-white font-mono">HDFC0001234</strong></div>
                                                                    </div>

                                                                    <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="font-bold text-gray-300 uppercase text-[10px]">Payment Verification Status</div>
                                                                            <div className="mt-1 text-xs">
                                                                                {order.payment_status === 'verified' ? (
                                                                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                                                        <CheckCircle size={14} /> Amount Verified (₹{order.payment_amount_received}). In Production.
                                                                                    </span>
                                                                                ) : order.payment_status === 'submitted' ? (
                                                                                    <span className="text-amber-400 font-bold flex items-center gap-1">
                                                                                        <Clock size={14} /> UTR '{order.payment_ref_utr}' Submitted. Verifying...
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-400 flex items-center gap-1">
                                                                                        <CreditCard size={14} /> Awaiting NEFT/RTGS transfer confirmation
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {order.payment_status !== 'verified' && (
                                                                            <button
                                                                                onClick={() => setActivePaymentOrderId(activePaymentOrderId === order.id ? null : order.id)}
                                                                                className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold underline text-left"
                                                                            >
                                                                                {activePaymentOrderId === order.id ? 'Cancel Reference Entry' : 'Submit / Update UTR Reference'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Submit Payment Proof Form */}
                                                                {activePaymentOrderId === order.id && (
                                                                    <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-500/30 space-y-3">
                                                                        <div className="font-bold text-xs text-white">Record Bank Transfer (NEFT / RTGS / IMPS)</div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                                                            <div>
                                                                                <label className="block text-gray-400 text-[11px] mb-1">Transfer Mode</label>
                                                                                <select
                                                                                    value={paymentForm.mode}
                                                                                    onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                                                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs"
                                                                                >
                                                                                    <option value="NEFT">NEFT</option>
                                                                                    <option value="RTGS">RTGS</option>
                                                                                    <option value="IMPS">IMPS</option>
                                                                                    <option value="UPI">UPI / NetBanking</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="sm:col-span-2">
                                                                                <label className="block text-gray-400 text-[11px] mb-1">Transaction UTR / Reference No. *</label>
                                                                                <input
                                                                                    type="text"
                                                                                    required
                                                                                    placeholder="e.g. HDFCN26090400123"
                                                                                    value={paymentForm.utr}
                                                                                    onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })}
                                                                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-2 pt-1">
                                                                            <button
                                                                                onClick={() => setActivePaymentOrderId(null)}
                                                                                className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handlePaymentSubmit(order.id)}
                                                                                disabled={submittingPayment}
                                                                                className="px-5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md"
                                                                            >
                                                                                {submittingPayment ? 'Submitting...' : 'Confirm Payment Transfer'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-400 flex items-center gap-2">
                                                                <Clock size={16} className="text-violet-400 flex-shrink-0" />
                                                                <span>Our sales engineering team is reviewing your requirement and will generate the official P.I. / Quotation shortly.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-6">

                                <div className="bg-tronix-card border border-white/10 rounded-xl p-8 shadow-xl relative overflow-hidden">
                                    {/* Decorative background element */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-tronix-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                                    <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/10 pb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">Profile Information</h2>
                                            <p className="text-gray-400 text-sm">Update and manage your account details</p>
                                        </div>
                                        <button
                                            onClick={handleEditToggle}
                                            className="bg-tronix-primary/20 text-tronix-primary hover:bg-tronix-primary hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-tronix-primary/10">
                                            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                        {/* Profile Picture Upload Field */}
                                        {isEditing && (
                                            <div className="bg-white/5 border border-white/5 p-5 rounded-xl transition-colors md:col-span-2">
                                                <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                    <Camera size={16} className="text-tronix-primary" />
                                                    Profile Picture
                                                </label>
                                                <div className="flex items-center gap-6">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-black/40 border border-white/20 flex-shrink-0 flex items-center justify-center">
                                                        {editForm.profile_picture ? (
                                                            <img src={getImageUrl(editForm.profile_picture)} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={32} className="text-gray-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            id="avatar-upload"
                                                            className="hidden"
                                                            onChange={handleImageUpload}
                                                            disabled={uploadingImage}
                                                        />
                                                        <label
                                                            htmlFor="avatar-upload"
                                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${uploadingImage ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-tronix-primary/20 text-tronix-primary hover:bg-tronix-primary hover:text-white border border-tronix-primary/30'}`}
                                                        >
                                                            <Upload size={16} />
                                                            {uploadingImage ? 'Uploading...' : 'Choose new image'}
                                                        </label>
                                                        <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Name Field */}
                                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                <User size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                                                Full Name
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.full_name}
                                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                />
                                            ) : (
                                                <div className="text-lg font-semibold text-white">
                                                    {user?.full_name || 'Not provided'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Email Field */}
                                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                <Mail size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                                                Email Address
                                            </label>
                                            <div className="text-lg font-semibold text-white opacity-70">
                                                {user?.email}
                                            </div>
                                            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                                                <CheckCircle size={12} /> Verified (Cannot Edit)
                                            </div>
                                        </div>

                                        {/* Password Field (Only in edit mode) */}
                                        {isEditing && (
                                            <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group md:col-span-2">
                                                <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                    <ShieldCheck size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                                                    Set New Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Leave blank to keep current password"
                                                        value={editForm.password}
                                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/20 rounded-lg px-4 pr-10 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Security & Role Field */}
                                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                <ShieldCheck size={16} className="text-tronix-accent group-hover:scale-110 transition-transform" />
                                                Account Role
                                            </label>
                                            <div className="mt-1">
                                                <span className="inline-flex items-center gap-1.5 bg-tronix-primary/20 border border-tronix-primary/30 text-tronix-primary px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm">
                                                    {user?.role}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Member Since Field (Mocked) */}
                                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                                <Calendar size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                                                Member Since
                                            </label>
                                            <div className="text-lg font-semibold text-white">
                                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                                Joined recently
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons Layer */}
                                    {isEditing && (
                                        <div className="mt-8 flex justify-end relative z-10 transition-all">
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={updating}
                                                className="bg-tronix-primary text-white hover:bg-violet-600 px-8 py-3 rounded-xl font-bold shadow-lg shadow-tronix-primary/20 transition-all disabled:opacity-50">
                                                {updating ? 'Saving Changes...' : 'Save Profile Changes'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Danger Zone */}
                                    <div className="mt-12 pt-8 border-t border-red-500/10 relative z-10">
                                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                                            <XCircle size={18} /> Danger Zone
                                        </h3>
                                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-red-500/5 border border-red-500/10 p-5 rounded-xl">
                                            <div>
                                                <p className="text-white font-medium">Delete Account</p>
                                                <p className="text-gray-400 text-sm mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                                            </div>
                                            <button className="flex-shrink-0 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors border border-red-500/20">
                                                Delete Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div >
                </div >
            </div >
        </div >
    );
};

export default UserDashboard;
