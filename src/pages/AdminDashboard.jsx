import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Package, Users, DollarSign, TrendingUp, Plus, Search, Edit, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

// Modular Components
import StatCard from '../components/admin/StatCard';
import ProductTable from '../components/admin/ProductTable';
import OrderTable from '../components/admin/OrderTable';
import ProductModal from '../components/admin/ProductModal';
import OrderModal from '../components/admin/OrderModal';
import AdminSettings from '../components/admin/AdminSettings';
import CouponTable from '../components/admin/CouponTable';
import BundleTable from '../components/admin/BundleTable';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [stats, setStats] = useState({ total_revenue: 0, total_orders: 0, total_products: 0, active_users: 0, growth: 0 });

    // Data States
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');

    // Admin Profile States
    const [profileForm, setProfileForm] = useState({
        email: JSON.parse(localStorage.getItem('tronix_user') || '{}').email || '',
        password: '',
        confirmPassword: ''
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const filteredProducts = products.filter(p =>
        (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.skv && p.skv.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredOrders = orders.filter(o => {
        const matchesSearch = (o.id && o.id.toString().includes(searchQuery.toLowerCase())) ||
            (o.customer_email && o.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (o.status && o.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (o.full_name && o.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = orderStatusFilter === 'All' ||
            (o.status && o.status.toLowerCase() === orderStatusFilter.toLowerCase());

        return matchesSearch && matchesStatus;
    });

    // Pagination States
    const [productsPage, setProductsPage] = useState(1);
    const [ordersPage, setOrdersPage] = useState(1);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [hasMoreOrders, setHasMoreOrders] = useState(true);
    const LIMIT = 10;

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // Initial Load
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch Stats
                const statsRes = await client.get('/admin/stats');
                setStats(statsRes.data);

                // Fetch Initial Products
                const prodRes = await client.get(`/products?skip=0&limit=${LIMIT}`);
                setProducts(prodRes.data);
                if (prodRes.data.length < LIMIT) setHasMoreProducts(false);

                // Fetch Initial Orders
                const ordRes = await client.get(`/orders?skip=0&limit=${LIMIT}`);
                setOrders(ordRes.data);
                if (ordRes.data.length < LIMIT) setHasMoreOrders(false);

            } catch (error) {
                console.error('Error fetching admin data:', error);
                // Fallback to mock/zeros if backend fails (graceful degradation)
                setError("Failed to load dashboard data. Ensure backend is running.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            if (activeTab === 'products') {
                const nextSkip = productsPage * LIMIT;
                const res = await client.get(`/products?skip=${nextSkip}&limit=${LIMIT}`);
                const newItems = res.data;

                setProducts(prev => [...prev, ...newItems]);
                setProductsPage(prev => prev + 1);
                if (newItems.length < LIMIT) setHasMoreProducts(false);
            } else {
                const nextSkip = ordersPage * LIMIT;
                const res = await client.get(`/orders?skip=${nextSkip}&limit=${LIMIT}`);
                const newItems = res.data;

                setOrders(prev => [...prev, ...newItems]);
                setOrdersPage(prev => prev + 1);
                if (newItems.length < LIMIT) setHasMoreOrders(false);
            }
        } catch (err) {
            toast.error("Failed to load more items");
        } finally {
            setLoadingMore(false);
        }
    };

    // Add/Edit Product Modal State
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null); // Track if editing
    const [newProduct, setNewProduct] = useState({
        title: '', category: 'Development Boards', price: '', mrp: '', description: '', image: '', features: ''
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setNewProduct({ title: '', category: 'Development Boards', price: '', mrp: '', description: '', image: '', features: '' });
        setIsAddProductOpen(true);
    };

    const handleOpenEditModal = (product) => {
        setEditingProduct(product);
        setNewProduct({
            ...product,
            features: product.features && Array.isArray(product.features) ? product.features.join('\n') : ''
        }); // Pre-fill form
        setIsAddProductOpen(true);
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...newProduct,
                price: newProduct.price === '' ? 0 : Number(newProduct.price),
                mrp: newProduct.mrp === '' ? null : Number(newProduct.mrp),
                stock: newProduct.stock === '' ? 0 : Number(newProduct.stock)
            };
            
            if (typeof payload.features === 'string') {
                payload.features = payload.features.split('\n').map(f => f.trim()).filter(f => f);
            }

            if (editingProduct) {
                // Update existing
                const res = await client.put(`/products/${editingProduct.id}`, payload);
                setProducts(products.map(p => p.id === editingProduct.id ? res.data : p));
                toast.success('Product updated successfully');
            } else {
                // Create new
                const res = await client.post('/products', payload);
                setProducts([res.data, ...products]);
                toast.success('Product added successfully');
            }
            setIsAddProductOpen(false);
            setNewProduct({ title: '', category: 'Development Boards', price: '', mrp: '', description: '', image: '', features: '' });
        } catch (error) {
            console.error("Save product error:", error);
            toast.error('Failed to save product');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const res = await client.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setNewProduct({ ...newProduct, image: res.data.url });
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteProduct = async () => {
        if (!productToDelete) return;
        try {
            await client.delete(`/products/${productToDelete.id}`);
            setProducts(products.filter(p => p.id !== productToDelete.id));
            toast.success('Product deleted successfully');
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        } catch (error) {
            console.error("Delete product error:", error);
            toast.error('Failed to delete product');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
            return toast.error("Passwords do not match");
        }

        setUpdatingProfile(true);
        try {
            const payload = {
                email: profileForm.email,
            };
            if (profileForm.password) {
                payload.password = profileForm.password;
            }

            const res = await client.put('/profile', payload);

            // Sync with localStorage
            const user = JSON.parse(localStorage.getItem('tronix_user') || '{}');
            const updatedUser = { ...user, ...res.data };
            localStorage.setItem('tronix_user', JSON.stringify(updatedUser));

            toast.success("Profile updated successfully");
            setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error) {
            console.error("Profile update error:", error);
            const errMsg = error.response?.data?.detail || "Failed to update profile";
            toast.error(errMsg);
        } finally {
            setUpdatingProfile(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-24 text-center text-white">Loading dashboard...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen pt-24 text-center text-red-500">
                <p>Error: {error}</p>
                <p className="text-gray-400 text-sm mt-2">Make sure the backend server is running on port 8000.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">Admin Dashboard</h1>
                        <p className="text-tronix-muted">Manage your inventory, orders and analytics.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-2 bg-tronix-accent text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            <Plus size={18} /> Add Product
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 mt-4">
                    <StatCard 
                        title="Total Revenue" 
                        value={`₹${stats.total_revenue.toLocaleString()}`} 
                        icon={DollarSign} 
                        color="text-emerald-500" 
                    />
                    <StatCard 
                        title="Total Orders" 
                        value={stats.total_orders} 
                        icon={Package} 
                        color="text-violet-500" 
                    />
                    <StatCard 
                        title="Active Users" 
                        value={stats.active_users} 
                        icon={Users} 
                        color="text-purple-500" 
                    />
                    <StatCard 
                        title="Monthly Growth" 
                        value={`${stats.growth > 0 ? '+' : ''}${stats.growth || 0}%`} 
                        icon={TrendingUp} 
                        color={stats.growth >= 0 ? 'text-emerald-500' : 'text-red-500'} 
                    />
                </div>

                {/* Content Area */}
                <div className="bg-tronix-card border border-white/5 rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                    <div className="border-b border-white/5 p-4 flex items-center justify-between">
                        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Products
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Orders
                            </button>
                            <button
                                onClick={() => setActiveTab('coupons')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'coupons' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Coupons
                            </button>
                            <button
                                onClick={() => setActiveTab('bundles')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'bundles' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Bundles
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Settings
                            </button>
                        </div>

                        <div className="relative mt-4 sm:mt-0 w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-tronix-primary w-full sm:w-64 transition-all focus:sm:w-72"
                            />
                        </div>
                    </div>

                    <div className="p-6 flex-1">
                        {activeTab === 'products' && (
                            <ProductTable 
                                products={filteredProducts}
                                searchQuery={searchQuery}
                                handleOpenEditModal={handleOpenEditModal}
                                handleDeleteClick={handleDeleteClick}
                                hasMoreProducts={hasMoreProducts}
                                loadMore={loadMore}
                                loadingMore={loadingMore}
                            />
                        )}

                        {activeTab === 'orders' && (
                            <OrderTable 
                                orders={filteredOrders}
                                searchQuery={searchQuery}
                                orderStatusFilter={orderStatusFilter}
                                setOrderStatusFilter={setOrderStatusFilter}
                                setSelectedOrder={setSelectedOrder}
                                hasMoreOrders={hasMoreOrders}
                                loadMore={loadMore}
                                loadingMore={loadingMore}
                            />
                        )}

                        {activeTab === 'coupons' && (
                            <CouponTable />
                        )}

                        {activeTab === 'bundles' && (
                            <BundleTable products={products} />
                        )}

                        {activeTab === 'settings' && (
                            <AdminSettings 
                                profileForm={profileForm}
                                setProfileForm={setProfileForm}
                                handleUpdateProfile={handleUpdateProfile}
                                updatingProfile={updatingProfile}
                            />
                        )}
                    </div>
                </div>
            </div>
            {/* Add/Edit Product Modal */}
            <ProductModal 
                isOpen={isAddProductOpen}
                onClose={() => setIsAddProductOpen(false)}
                editingProduct={editingProduct}
                newProduct={newProduct}
                setNewProduct={setNewProduct}
                handleSaveProduct={handleSaveProduct}
                handleImageUpload={handleImageUpload}
                uploading={uploading}
                fileInputRef={fileInputRef}
            />

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-tronix-card border border-white/10 rounded-2xl w-full max-w-sm p-6 relative text-center">
                        <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Product?</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-medium">{productToDelete?.title}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteProduct}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            <OrderModal 
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
            />

        </div >
    );
};

export default AdminDashboard;
