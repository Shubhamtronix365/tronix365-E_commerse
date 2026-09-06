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
    Send,
    MapPin,
    Plus,
    Trash2,
    Edit2,
    Building,
    Home,
    Warehouse,
    Check,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import OrdersSection from '../components/dashboard/OrdersSection';
import TowerOrdersSection from '../components/dashboard/TowerOrdersSection';
import SavedAddressesSection from '../components/dashboard/SavedAddressesSection';
import ProfileSection from '../components/dashboard/ProfileSection';

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

    // Saved Addresses State
    const [addresses, setAddresses] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({
        label: 'Home',
        full_name: '',
        phone: '',
        address_line: '',
        landmark: '',
        pincode: '',
        city: '',
        state: '',
        is_default: false,
        is_gst_invoice: false,
        company_name: '',
        gstin: ''
    });

    const fetchAddresses = useCallback(async () => {
        try {
            setAddressLoading(true);
            const res = await client.get('/addresses');
            setAddresses(res.data || []);
        } catch (err) {
            console.error('Failed to load saved addresses:', err);
        } finally {
            setAddressLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('tronix_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Fetch Profile, Initial Orders, Tower Orders, and Saved Addresses concurrently
                const [profileRes, ordersRes, towerRes, addressRes] = await Promise.all([
                    client.get('/profile'),
                    client.get(`/orders/user?skip=0&limit=${LIMIT}`),
                    client.get('/tower-orders/user').catch(() => ({ data: [] })),
                    client.get('/addresses').catch(() => ({ data: [] }))
                ]);

                setUser(profileRes.data);
                setOrders(ordersRes.data);
                const initialTowerOrders = towerRes.data || [];
                prevOrdersRef.current = initialTowerOrders;
                setTowerOrders(initialTowerOrders);
                setAddresses(addressRes.data || []);
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

    // Address Action Handlers
    const handleOpenAddAddress = () => {
        setEditingAddressId(null);
        setAddressForm({
            label: 'Home',
            full_name: user?.full_name || '',
            phone: '',
            address_line: '',
            landmark: '',
            pincode: '',
            city: '',
            state: '',
            is_default: addresses.length === 0,
            is_gst_invoice: false,
            company_name: '',
            gstin: ''
        });
        setIsAddressModalOpen(true);
    };

    const handleOpenEditAddress = (addr) => {
        setEditingAddressId(addr.id);
        setAddressForm({
            label: addr.label || 'Home',
            full_name: addr.full_name,
            phone: addr.phone,
            address_line: addr.address_line,
            landmark: addr.landmark || '',
            pincode: addr.pincode,
            city: addr.city,
            state: addr.state,
            is_default: addr.is_default || false,
            is_gst_invoice: addr.is_gst_invoice || false,
            company_name: addr.company_name || '',
            gstin: addr.gstin || ''
        });
        setIsAddressModalOpen(true);
    };

    const handlePincodeLookup = async (pin) => {
        setAddressForm(prev => ({ ...prev, pincode: pin }));
        if (pin.length === 6 && /^\d+$/.test(pin)) {
            setIsPincodeLoading(true);
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();
                if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                    const { District, State } = data[0].PostOffice[0];
                    setAddressForm(prev => ({
                        ...prev,
                        city: District || prev.city,
                        state: State || prev.state
                    }));
                }
            } catch (err) {
                console.error("Pincode API error:", err);
            } finally {
                setIsPincodeLoading(false);
            }
        }
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        if (!addressForm.full_name.trim()) {
            toast.error("Please enter recipient full name");
            return;
        }
        if (!addressForm.phone.trim() || addressForm.phone.trim().length < 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }
        if (!addressForm.address_line.trim()) {
            toast.error("Please enter complete street address");
            return;
        }
        if (!addressForm.pincode.trim() || addressForm.pincode.trim().length !== 6) {
            toast.error("Please enter a valid 6-digit postal PIN code");
            return;
        }
        if (!addressForm.city.trim() || !addressForm.state.trim()) {
            toast.error("Please enter city and state");
            return;
        }

        try {
            setSavingAddress(true);
            if (editingAddressId) {
                await client.put(`/addresses/${editingAddressId}`, addressForm);
                toast.success("Address updated successfully!");
            } else {
                await client.post('/addresses', addressForm);
                toast.success("New address saved to address book!");
            }
            setIsAddressModalOpen(false);
            fetchAddresses();
        } catch (err) {
            console.error("Failed to save address:", err);
            toast.error(err.response?.data?.detail || "Failed to save address. Please try again.");
        } finally {
            setSavingAddress(false);
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm("Are you sure you want to delete this delivery address?")) return;
        try {
            await client.delete(`/addresses/${addressId}`);
            toast.success("Address removed");
            fetchAddresses();
        } catch (err) {
            console.error("Failed to delete address:", err);
            toast.error("Failed to delete address");
        }
    };

    const handleSetDefaultAddress = async (addressId) => {
        try {
            await client.put(`/addresses/${addressId}/set-default`);
            toast.success("Set as default delivery address!");
            fetchAddresses();
        } catch (err) {
            console.error("Failed to set default address:", err);
            toast.error("Failed to set default address");
        }
    };

    const getAddressIcon = (label) => {
        switch (label?.toLowerCase()) {
            case 'home': return <Home size={15} className="text-violet-400" />;
            case 'office': return <Building size={15} className="text-cyan-400" />;
            case 'factory': return <Factory size={15} className="text-amber-400" />;
            case 'warehouse': return <Warehouse size={15} className="text-emerald-400" />;
            default: return <MapPin size={15} className="text-pink-400" />;
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-24 text-center text-white">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-3 sm:px-6 lg:px-8 bg-tronix-bg">
            <div className="max-w-7xl mx-auto">

                {/* Mobile Profile & Tab Bar (< md) */}
                <div className="md:hidden space-y-3 mb-6">
                    {/* Compact Profile Header */}
                    <div className="bg-tronix-card border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full relative overflow-hidden bg-tronix-primary/20 border-2 border-tronix-primary/30 flex items-center justify-center flex-shrink-0">
                                {user?.profile_picture ? (
                                    <img src={getImageUrl(user.profile_picture)} alt={user?.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-tronix-primary">
                                        {user?.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-white truncate">{user?.full_name}</h2>
                                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    {/* Mobile Horizontal Scrolling Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                activeTab === 'orders'
                                    ? 'bg-tronix-primary text-white border-tronix-primary shadow-md shadow-tronix-primary/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <Package size={15} />
                            <span>My Orders</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tower_orders')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                activeTab === 'tower_orders'
                                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <Factory size={15} />
                            <span>Tower Orders</span>
                            {towerOrders.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    activeTab === 'tower_orders' ? 'bg-white text-violet-700' : 'bg-violet-600 text-white'
                                }`}>
                                    {towerOrders.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('addresses')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                activeTab === 'addresses'
                                    ? 'bg-tronix-primary text-white border-tronix-primary shadow-md shadow-tronix-primary/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <MapPin size={15} />
                            <span>Addresses</span>
                            {addresses.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    activeTab === 'addresses' ? 'bg-white text-violet-700' : 'bg-tronix-primary text-white'
                                }`}>
                                    {addresses.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                activeTab === 'profile'
                                    ? 'bg-tronix-primary text-white border-tronix-primary shadow-md shadow-tronix-primary/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <User size={15} />
                            <span>Profile</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">

                    {/* Desktop Sidebar (hidden on mobile) */}
                    <div className="hidden md:block w-64 space-y-4 flex-shrink-0">
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
                            <h2 className="text-xl font-bold text-white truncate">{user?.full_name}</h2>
                            <p className="text-gray-400 text-sm truncate">{user?.email}</p>
                        </div>

                        <div className="bg-tronix-card border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <Package size={20} /> My Orders
                            </button>
                            <button
                                onClick={() => setActiveTab('tower_orders')}
                                className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${activeTab === 'tower_orders' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:bg-white/5'}`}
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
                                onClick={() => setActiveTab('addresses')}
                                className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${activeTab === 'addresses' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <MapPin size={20} /> Saved Addresses
                                </span>
                                {addresses.length > 0 && (
                                    <span className="bg-tronix-primary text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                        {addresses.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === 'profile' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:bg-white/5'}`}
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
                    <div className="flex-1 min-w-0">
                        {activeTab === 'orders' && (
                            <OrdersSection
                                orders={orders}
                                orderStatusFilter={orderStatusFilter}
                                setOrderStatusFilter={setOrderStatusFilter}
                                navigate={navigate}
                                hasMore={hasMore}
                                loadingMore={loadingMore}
                                handleLoadMore={handleLoadMore}
                            />
                        )}

                        {/* TOWER ORDERS TAB */}
                        {activeTab === 'tower_orders' && (
                            <TowerOrdersSection
                                towerOrders={towerOrders}
                                towerLoading={towerLoading}
                                towerFilter={towerFilter}
                                setTowerFilter={setTowerFilter}
                                navigate={navigate}
                                recentlyUpdatedOrderId={recentlyUpdatedOrderId}
                                activePaymentOrderId={activePaymentOrderId}
                                setActivePaymentOrderId={setActivePaymentOrderId}
                                paymentForm={paymentForm}
                                setPaymentForm={setPaymentForm}
                                handlePaymentSubmit={handlePaymentSubmit}
                                submittingPayment={submittingPayment}
                            />
                        )}

                        {activeTab === 'addresses' && (
                            <SavedAddressesSection
                                addresses={addresses}
                                addressLoading={addressLoading}
                                handleOpenAddAddress={handleOpenAddAddress}
                                handleOpenEditAddress={handleOpenEditAddress}
                                handleDeleteAddress={handleDeleteAddress}
                                handleSetDefaultAddress={handleSetDefaultAddress}
                                getAddressIcon={getAddressIcon}
                                isAddressModalOpen={isAddressModalOpen}
                                setIsAddressModalOpen={setIsAddressModalOpen}
                                editingAddressId={editingAddressId}
                                addressForm={addressForm}
                                setAddressForm={setAddressForm}
                                handleSaveAddress={handleSaveAddress}
                                handlePincodeLookup={handlePincodeLookup}
                                isPincodeLoading={isPincodeLoading}
                                savingAddress={savingAddress}
                            />
                        )}

                        {activeTab === 'profile' && (
                            <ProfileSection
                                user={user}
                                isEditing={isEditing}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                uploadingImage={uploadingImage}
                                handleEditToggle={handleEditToggle}
                                handleImageUpload={handleImageUpload}
                                handleUpdateProfile={handleUpdateProfile}
                                updating={updating}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                            />
                        )}
                    </div >
                </div >
            </div >
        </div >
    );
};

export default UserDashboard;
