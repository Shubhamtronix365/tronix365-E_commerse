import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, User, LogOut, ChevronRight, Clock, CheckCircle, XCircle, Mail, ShieldCheck, Calendar, Eye, EyeOff, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

const UserDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');

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

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('tronix_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Fetch Profile and Initial Orders concurrently
                const [profileRes, ordersRes] = await Promise.all([
                    client.get('/profile'),
                    client.get(`/orders/user?skip=0&limit=${LIMIT}`)
                ]);

                setUser(profileRes.data);
                setOrders(ordersRes.data);
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
                        {activeTab === 'orders' ? (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-6">Order History</h2>

                                {/* Order Status Tabs */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['All', 'pending', 'confirmed', 'shipped', 'delivered', 'deleted'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setOrderStatusFilter(status)}
                                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${orderStatusFilter === status
                                                ? 'bg-violet-500 text-white border border-violet-400'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:text-white'
                                                }`}
                                        >
                                            {status === 'All' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
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
                                                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                                            >
                                                {/* Left Margin Accent Line */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'confirmed' ? 'bg-green-500' :
                                                    order.status === 'pending' ? 'bg-yellow-500' :
                                                        order.status === 'shipped' ? 'bg-blue-500' :
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
                                                        <Link
                                                            to={`/invoice/${order.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 transition-colors text-sm mt-0.5 inline-flex items-center gap-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
                                                            Download Invoice
                                                        </Link>
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
                                                            {order.status === 'confirmed' ? 'Order Confirmed' : order.status === 'pending' ? 'Pending Approval' : order.status === 'deleted' ? 'Cancelled (Refund in 3-7 days)' : order.status}
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
                        ) : (
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
