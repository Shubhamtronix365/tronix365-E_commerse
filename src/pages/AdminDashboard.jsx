import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import ConfirmModal from '../components/admin/ConfirmModal';
import CategoryTable from '../components/admin/CategoryTable';
import TowerOrderTable from '../components/admin/TowerOrderTable';
import TowerOrderAdminModal from '../components/admin/TowerOrderAdminModal';
import AbandonedCartTable from '../components/admin/AbandonedCartTable';
import BlogAdminManager from '../components/admin/BlogAdminManager';
import { useCategories } from '../hooks/useCategories';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('products');
    const { categories, refetch: refetchCategories } = useCategories();
    const [stats, setStats] = useState({ total_revenue: 0, total_orders: 0, total_products: 0, active_users: 0, growth: 0 });

    // Data States
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedTowerOrder, setSelectedTowerOrder] = useState(null);
    const [abandonedCartsCount, setAbandonedCartsCount] = useState(0);

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

    const isFirstMount = useRef(true);

    const filteredOrders = orders.filter(o => {
        if (orderStatusFilter === 'All') return true;
        const s = (o.status || '').toLowerCase();
        const f = orderStatusFilter.toLowerCase();
        if (f === 'failed') return s === 'failed' || s === 'payment_failed';
        if (f === 'bounced') return s === 'bounced' || s === 'payment_bounced';
        if (f === 'cancelled') return s === 'cancelled' || s === 'payment_cancelled' || s === 'deleted';
        if (f === 'confirmed') return s === 'confirmed' || s === 'payment_received';
        if (f === 'shipped') return s === 'shipped' || s === 'out_for_delivery';
        return s === f;
    });

    // Product Management State (High-Capacity Pagination & Filtering)
    const [productPage, setProductPage] = useState(1);
    const [productPageSize, setProductPageSize] = useState(50);
    const [productSearch, setProductSearch] = useState('');
    const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
    const [productCategory, setProductCategory] = useState('All');
    const [productStockFilter, setProductStockFilter] = useState('all');
    const [productSortBy, setProductSortBy] = useState('id_desc');
    const [totalProductsCount, setTotalProductsCount] = useState(0);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Orders Pagination State
    const [ordersPage, setOrdersPage] = useState(1);
    const [hasMoreOrders, setHasMoreOrders] = useState(true);
    const ORDERS_LIMIT = 10;

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // Debounce product search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedProductSearch(productSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

    // Fetch Products (Server-side Pagination, Filters, and Search)
    const fetchAdminProducts = useCallback(async () => {
        setLoadingProducts(true);
        try {
            const isShowAll = productPageSize === 'all' || productPageSize === 0;
            const limit = isShowAll ? 0 : Number(productPageSize);
            const skip = isShowAll ? 0 : (productPage - 1) * limit;

            const params = new URLSearchParams();
            params.append('skip', String(skip));
            params.append('limit', String(limit));
            if (debouncedProductSearch && debouncedProductSearch.trim()) {
                params.append('search', debouncedProductSearch.trim());
            }
            if (productCategory && productCategory !== 'All') {
                params.append('category', productCategory);
            }
            if (productStockFilter === 'in_stock') {
                params.append('in_stock_only', 'true');
            }
            if (productSortBy) {
                params.append('sort_by', productSortBy);
            }

            const res = await client.get(`/products?${params.toString()}`);
            setProducts(res.data);

            const countHeader = res.headers['x-total-count'];
            if (countHeader !== undefined && countHeader !== null) {
                setTotalProductsCount(parseInt(countHeader, 10));
            } else {
                setTotalProductsCount(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch admin products:", err);
            toast.error("Failed to load products");
        } finally {
            setLoadingProducts(false);
        }
    }, [productPage, productPageSize, debouncedProductSearch, productCategory, productStockFilter, productSortBy]);

    // Trigger product fetch whenever query parameters change
    useEffect(() => {
        fetchAdminProducts();
    }, [fetchAdminProducts]);

    // Debounced orders search
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const ordRes = await client.get(`/orders?skip=0&limit=${ORDERS_LIMIT}&search=${searchQuery}`);
                setOrders(ordRes.data);
                setOrdersPage(1);
                setHasMoreOrders(ordRes.data.length >= ORDERS_LIMIT);
            } catch (error) {
                console.error("Error searching orders:", error);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Initial Load (Dashboard Stats, Orders, Abandoned Carts)
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch Stats
                const statsRes = await client.get('/admin/stats');
                setStats(statsRes.data);

                // Fetch Initial Orders
                const ordRes = await client.get(`/orders?skip=0&limit=${ORDERS_LIMIT}`);
                setOrders(ordRes.data);
                if (ordRes.data.length < ORDERS_LIMIT) setHasMoreOrders(false);

                // Fetch Pending Abandoned Carts Count
                try {
                    const cartRes = await client.get('/admin/abandoned-carts');
                    if (cartRes.data?.summary?.pending_reminders_count !== undefined) {
                        setAbandonedCartsCount(cartRes.data.summary.pending_reminders_count);
                    }
                } catch (e) {}

            } catch (error) {
                console.error('Error fetching admin data:', error);
                setError("Failed to load dashboard data. Ensure backend is running.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Load more for Orders
    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const nextSkip = ordersPage * ORDERS_LIMIT;
            const res = await client.get(`/orders?skip=${nextSkip}&limit=${ORDERS_LIMIT}&search=${searchQuery}`);
            const newItems = res.data;

            setOrders(prev => [...prev, ...newItems]);
            setOrdersPage(prev => prev + 1);
            if (newItems.length < ORDERS_LIMIT) setHasMoreOrders(false);
        } catch (err) {
            toast.error("Failed to load more orders");
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
        setNewProduct({ 
            title: '', 
            category: 'Development Boards', 
            price: '', 
            mrp: '', 
            description: '', 
            image: '', 
            features: '',
            applications: '',
            package_includes: '',
            useful_links: '',
            attachments: '',
            warranty_info: '',
            country_of_origin: ''
        });
        setIsAddProductOpen(true);
    };

    const handleOpenEditModal = (product) => {
        setEditingProduct(product);
        setNewProduct({
            ...product,
            features: product.features && Array.isArray(product.features) ? product.features.join('\n') : (product.features || ''),
            applications: product.applications && Array.isArray(product.applications) ? product.applications.join('\n') : (product.applications || ''),
            package_includes: product.package_includes && Array.isArray(product.package_includes) ? product.package_includes.join('\n') : (product.package_includes || ''),
            useful_links: product.useful_links && Array.isArray(product.useful_links) 
                ? product.useful_links.map(l => typeof l === 'object' ? `${l.title || l.name || ''} | ${l.url || ''}` : l).join('\n') 
                : (product.useful_links || ''),
            attachments: product.attachments && Array.isArray(product.attachments) 
                ? product.attachments.map(a => typeof a === 'object' ? `${a.name || a.title || ''} | ${a.url || ''}` : a).join('\n') 
                : (product.attachments || ''),
            warranty_info: product.warranty_info || '',
            country_of_origin: product.country_of_origin || ''
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
            if (typeof payload.applications === 'string') {
                payload.applications = payload.applications.split('\n').map(f => f.trim()).filter(f => f);
            }
            if (typeof payload.package_includes === 'string') {
                payload.package_includes = payload.package_includes.split('\n').map(f => f.trim()).filter(f => f);
            }
            if (typeof payload.useful_links === 'string') {
                payload.useful_links = payload.useful_links.split('\n').map(line => {
                    const parts = line.split('|');
                    if (parts.length > 1) {
                        return { title: parts[0].trim(), url: parts[1].trim() };
                    }
                    return { title: 'Documentation Link', url: line.trim() };
                }).filter(l => l.url);
            }
            if (typeof payload.attachments === 'string') {
                payload.attachments = payload.attachments.split('\n').map(line => {
                    const parts = line.split('|');
                    if (parts.length > 1) {
                        return { name: parts[0].trim(), url: parts[1].trim() };
                    }
                    return { name: 'Download Attachment / Datasheet', url: line.trim() };
                }).filter(a => a.url);
            }

            if (editingProduct) {
                // Update existing
                const res = await client.put(`/products/${editingProduct.id}`, payload);
                setProducts(prev => prev.map(p => p.id === editingProduct.id ? res.data : p));
                toast.success('Product updated successfully');
            } else {
                // Create new
                await client.post('/products', payload);
                toast.success('Product added successfully');
                fetchAdminProducts();
                setStats(prev => ({ ...prev, total_products: (prev.total_products || 0) + 1 }));
            }
            setIsAddProductOpen(false);
            setNewProduct({ 
                title: '', category: 'Development Boards', price: '', mrp: '', description: '', image: '', features: '',
                applications: '', package_includes: '', useful_links: '', attachments: '', warranty_info: '', country_of_origin: ''
            });
        } catch (error) {
            console.error("DEBUG: Save product error:", error);
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
            setNewProduct(prev => ({ ...prev, image: res.data.url }));
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
            setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
            setTotalProductsCount(prev => Math.max(0, prev - 1));
            setStats(prev => ({ ...prev, total_products: Math.max(0, (prev.total_products || 1) - 1) }));
            toast.success('Product deleted successfully');
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
            fetchAdminProducts();
        } catch (error) {
            console.error("Delete product error:", error);
            toast.error('Failed to delete product');
        }
    };

    const handleUpdateOrderStatus = async (orderId, statusPayload) => {
        try {
            const originalOrder = orders.find(o => o.id === orderId);
            const prevStatus = originalOrder ? originalOrder.status : 'pending';

            const payload = typeof statusPayload === 'string' ? { status: statusPayload } : statusPayload;
            const newStatus = payload.status || prevStatus;

            const res = await client.put(`/admin/orders/${orderId}/status`, payload);
            
            // Update orders list state with all fields returned from API
            const updatedOrderData = res.data ? { ...originalOrder, ...res.data, status: newStatus } : { ...originalOrder, ...payload, status: newStatus };

            setOrders(orders.map(o => o.id === orderId ? updatedOrderData : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(updatedOrderData);
            }

            // Adjust stock in the local products state to match the backend updates
            if (originalOrder && originalOrder.items) {
                let stockDiff = 0;
                if (newStatus === 'confirmed' && prevStatus === 'pending') {
                    stockDiff = -1; // Deduct stock
                } else if (['deleted', 'cancelled'].includes(newStatus) && ['confirmed', 'shipped', 'delivered', 'out_for_delivery'].includes(prevStatus)) {
                    stockDiff = 1;  // Restore stock
                }

                if (stockDiff !== 0) {
                    setProducts(prevProducts =>
                        prevProducts.map(p => {
                            const orderItem = originalOrder.items.find(item => item.product_id === p.id);
                            if (orderItem) {
                                return {
                                    ...p,
                                    stock: Math.max(0, p.stock + (orderItem.quantity * stockDiff))
                                };
                            }
                            return p;
                        })
                    );
                }
            }

            toast.success(`Order marked as ${newStatus.replace('_', ' ').toUpperCase()} & notification dispatched!`);
        } catch (error) {
            console.error("Update order status error:", error);
            const statusCode = error.response?.status;
            const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
            
            if (statusCode === 401) {
                toast.error('Session expired. Please log in again as admin.');
            } else if (statusCode === 403) {
                toast.error('Access denied. Admin privileges required.');
            } else if (statusCode === 404) {
                toast.error('Order not found on server.');
            } else if (statusCode === 422) {
                toast.error(`Validation error: ${detail}`);
            } else if (statusCode === 500) {
                toast.error(`Server error: ${detail}`);
            } else {
                toast.error(`Failed to update order status: ${detail || 'Unknown error'}`);
            }
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
                    <div className="border-b border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                                onClick={() => setActiveTab('tower_orders')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'tower_orders' ? 'bg-tronix-accent/20 text-tronix-accent border border-tronix-accent/40 font-semibold' : 'text-gray-400 hover:text-white'}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-tronix-accent"></span>
                                Tower Orders
                            </button>
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Categories
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
                                onClick={() => setActiveTab('abandoned_carts')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'abandoned_carts'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span>Abandoned Carts</span>
                                {abandonedCartsCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-amber-500 text-black font-bold text-[10px] rounded-full">
                                        {abandonedCartsCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('blogs')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'blogs'
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span>Blogs & Tutorials</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Settings
                            </button>
                        </div>

                        {activeTab === 'orders' && (
                            <div className="relative mt-4 sm:mt-0 w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-tronix-primary w-full sm:w-64 transition-all focus:sm:w-72"
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-6 flex-1">
                        {activeTab === 'products' && (
                            <ProductTable 
                                products={products}
                                totalProducts={totalProductsCount}
                                searchQuery={productSearch}
                                setSearchQuery={setProductSearch}
                                categoryFilter={productCategory}
                                setCategoryFilter={setProductCategory}
                                stockFilter={productStockFilter}
                                setStockFilter={setProductStockFilter}
                                sortBy={productSortBy}
                                setSortBy={setProductSortBy}
                                pageSize={productPageSize}
                                setPageSize={setProductPageSize}
                                currentPage={productPage}
                                setCurrentPage={setProductPage}
                                categories={categories}
                                loading={loadingProducts}
                                onRefresh={fetchAdminProducts}
                                handleOpenEditModal={handleOpenEditModal}
                                handleDeleteClick={handleDeleteClick}
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

                        {activeTab === 'tower_orders' && (
                            <TowerOrderTable 
                                onSelectOrder={(ord) => setSelectedTowerOrder(ord)} 
                            />
                        )}

                        {activeTab === 'categories' && (
                            <CategoryTable categories={categories} onRefresh={refetchCategories} />
                        )}

                        {activeTab === 'coupons' && (
                            <CouponTable />
                        )}

                        {activeTab === 'bundles' && (
                            <BundleTable products={products} />
                        )}

                        {activeTab === 'abandoned_carts' && (
                            <AbandonedCartTable onRefreshStats={async () => {
                                try {
                                    const cartRes = await client.get('/admin/abandoned-carts');
                                    if (cartRes.data?.summary?.pending_reminders_count !== undefined) {
                                        setAbandonedCartsCount(cartRes.data.summary.pending_reminders_count);
                                    }
                                } catch (e) {}
                            }} />
                        )}

                        {activeTab === 'blogs' && (
                            <BlogAdminManager />
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
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteProduct}
                title="Delete Product?"
                message={`Are you sure you want to delete "${productToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />

            {/* Order Details Modal */}
            <OrderModal 
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                onUpdateOrderStatus={handleUpdateOrderStatus}
            />

            {/* Tower Order Admin Modal */}
            <TowerOrderAdminModal 
                isOpen={!!selectedTowerOrder}
                onClose={() => setSelectedTowerOrder(null)}
                order={selectedTowerOrder}
                onOrderUpdated={() => {
                    // Refreshes table on update
                    setSelectedTowerOrder(null);
                }}
            />

        </div >
    );
};

export default AdminDashboard;
