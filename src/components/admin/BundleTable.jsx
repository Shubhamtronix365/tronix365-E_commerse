import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Box, IndianRupee, Search, CheckCircle2, XCircle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';

const defaultBundleState = {
    name: '',
    description: '',
    original_price: 0,
    bundle_price: '',
    product_ids: [],
    expiry_date: '',
    usage_limit: ''
};

const BundleTable = ({ products }) => {
    const [bundles, setBundles] = useState([]);
    const [availableProducts, setAvailableProducts] = useState(products || []);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState(null);
    const [newBundle, setNewBundle] = useState(defaultBundleState);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bundleToDelete, setBundleToDelete] = useState(null);

    useEffect(() => {
        fetchBundles();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            // Fetch all products to ensure admin has full visibility when setting bundles
            const res = await client.get('/products?limit=1000');
            setAvailableProducts(res.data);
        } catch (err) {
            console.error("Failed to load products for bundle setting:", err);
        }
    };

    const fetchBundles = async () => {
        try {
            const res = await client.get('/admin/bundles');
            setBundles(res.data);
        } catch (err) {
            toast.error("Failed to load bundles");
        } finally {
            setLoading(false);
        }
    };

    const toggleProductSelection = (product) => {
        setNewBundle(prev => {
            const isSelected = prev.product_ids.includes(product.id);
            if (isSelected) {
                return {
                    ...prev,
                    product_ids: prev.product_ids.filter(id => id !== product.id),
                    original_price: Math.max(0, prev.original_price - product.price),
                };
            } else {
                // Prevent adding the same product twice
                if (prev.product_ids.includes(product.id)) return prev;
                return {
                    ...prev,
                    product_ids: [...prev.product_ids, product.id],
                    original_price: prev.original_price + product.price,
                };
            }
        });
    };

    const getBundleStatus = (bundle) => {
        if (!bundle.is_active) return 'INACTIVE';
        if (bundle.expiry_date && new Date(bundle.expiry_date) < new Date()) return 'EXPIRED';
        if (bundle.usage_limit && bundle.used_count >= bundle.usage_limit) return 'LIMIT EXCEEDED';
        return 'ACTIVE';
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
            case 'INACTIVE':
                return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
            case 'EXPIRED':
                return 'bg-gray-500/10 text-gray-400 cursor-not-allowed';
            case 'LIMIT EXCEEDED':
                return 'bg-amber-500/10 text-amber-500 cursor-not-allowed';
            default:
                return 'bg-gray-500/10 text-gray-400';
        }
    };

    const handleToggleStatus = async (bundle) => {
        try {
            await client.put(`/admin/bundles/${bundle.id}`, { is_active: !bundle.is_active });
            toast.success(`Bundle ${!bundle.is_active ? 'activated' : 'deactivated'}`);
            fetchBundles();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const handleSaveBundle = async (e) => {
        e.preventDefault();
        
        if (!editingBundle && newBundle.product_ids.length < 2) {
            return toast.error("Select at least 2 products for a bundle");
        }
        
        try {
            const payload = {
                name: newBundle.name,
                description: newBundle.description,
                bundle_price: parseFloat(newBundle.bundle_price),
                expiry_date: newBundle.expiry_date ? new Date(newBundle.expiry_date).toISOString() : null,
                usage_limit: newBundle.usage_limit ? parseInt(newBundle.usage_limit) : null
            };

            if (editingBundle) {
                await client.put(`/admin/bundles/${editingBundle.id}`, payload);
                toast.success("Bundle updated successfully");
            } else {
                payload.original_price = newBundle.original_price;
                payload.product_ids = newBundle.product_ids;
                await client.post('/admin/bundles', payload);
                toast.success("Bundle created successfully");
            }
            setIsModalOpen(false);
            setEditingBundle(null);
            fetchBundles();
            setNewBundle(defaultBundleState);
        } catch (err) {
            toast.error("Failed to save bundle");
        }
    };

    const handleEdit = (bundle) => {
        setEditingBundle(bundle);
        setNewBundle({
            name: bundle.name,
            description: bundle.description || '',
            original_price: bundle.original_price,
            bundle_price: bundle.bundle_price.toString(),
            product_ids: bundle.products.map(p => p.product_id),
            expiry_date: bundle.expiry_date ? new Date(bundle.expiry_date).toISOString().split('T')[0] : '',
            usage_limit: bundle.usage_limit ? bundle.usage_limit.toString() : ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (bundle) => {
        setBundleToDelete(bundle);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteBundle = async () => {
        if (!bundleToDelete) return;
        try {
            await client.delete(`/admin/bundles/${bundleToDelete.id}`);
            toast.success("Bundle deleted successfully");
            fetchBundles();
        } catch (err) {
            toast.error("Failed to delete bundle");
        } finally {
            setIsDeleteModalOpen(false);
            setBundleToDelete(null);
        }
    };

    const filteredAvailableProducts = availableProducts.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="text-white">Loading bundles...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Product Bundles</h2>
                <button
                    onClick={() => {
                        setEditingBundle(null);
                        setNewBundle(defaultBundleState);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-tronix-accent text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    <Plus size={18} /> New Bundle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bundles.map((bundle) => (
                    <div key={bundle.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-tronix-primary/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {bundle.name}
                                    <button 
                                        onClick={() => {
                                            const status = getBundleStatus(bundle);
                                            if (status === 'ACTIVE' || status === 'INACTIVE') {
                                                handleToggleStatus(bundle);
                                            }
                                        }}
                                        disabled={getBundleStatus(bundle) === 'EXPIRED' || getBundleStatus(bundle) === 'LIMIT EXCEEDED'}
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${getStatusStyles(getBundleStatus(bundle))}`}
                                    >
                                        {getBundleStatus(bundle)}
                                    </button>
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">{bundle.description}</p>
                                <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500">
                                    <p>Used: <span className="text-gray-300 font-medium">{bundle.used_count || 0} / {bundle.usage_limit || '∞'}</span></p>
                                    {bundle.expiry_date && (
                                        <p>Expires: <span className="text-gray-300 font-medium">{new Date(bundle.expiry_date).toLocaleDateString()}</span></p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <div className="flex items-center gap-1 mb-1">
                                    <button 
                                        onClick={() => handleEdit(bundle)}
                                        className="p-1.5 text-gray-400 hover:text-tronix-primary hover:bg-tronix-primary/10 rounded-md transition-colors"
                                        title="Edit Bundle"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClick(bundle)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                        title="Delete Bundle"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 line-through">₹{bundle.original_price}</p>
                                    <p className="text-lg font-bold text-tronix-primary">₹{bundle.bundle_price}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {bundle.products.map(bp => (
                                <div key={bp.id || bp.product_id} className="bg-black/40 px-3 py-1 rounded-full text-xs text-gray-300 border border-white/5">
                                    {bp.product?.title || `Product #${bp.product_id}`}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-tronix-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 overflow-y-auto">
                                <h3 className="text-2xl font-bold text-white mb-6">
                                    {editingBundle ? 'Edit Product Bundle' : 'Create Product Bundle'}
                                </h3>
                                <form onSubmit={handleSaveBundle} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Bundle Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                    value={newBundle.name}
                                                    onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                                <textarea
                                                    rows="2"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                    value={newBundle.description}
                                                    onChange={(e) => setNewBundle({ ...newBundle, description: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Orig. Total</label>
                                                    <div className="text-xl font-bold text-gray-500">₹{newBundle.original_price}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Bundle Price</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        className="w-full bg-white/5 border border-emerald-500/50 rounded-lg px-4 py-2 text-white focus:outline-none"
                                                        value={newBundle.bundle_price}
                                                        onChange={(e) => setNewBundle({ ...newBundle, bundle_price: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-[#1A1A2E] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                        value={newBundle.expiry_date}
                                                        onChange={(e) => setNewBundle({ ...newBundle, expiry_date: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Usage Limit</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Unlimited"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                                                        value={newBundle.usage_limit}
                                                        onChange={(e) => setNewBundle({ ...newBundle, usage_limit: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex flex-col ${editingBundle ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <label className="block text-sm text-gray-400 mb-1">
                                                Select Products ({newBundle.product_ids.length})
                                                {editingBundle && <span className="ml-2 text-tronix-primary text-xs">(Cannot change after creation)</span>}
                                            </label>
                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search products..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto max-h-[250px] border border-white/5 rounded-lg divide-y divide-white/5">
                                                {filteredAvailableProducts.map(product => (
                                                    <div 
                                                        key={product.id}
                                                        onClick={() => toggleProductSelection(product)}
                                                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${newBundle.product_ids.includes(product.id) ? 'bg-tronix-primary/10' : 'hover:bg-white/5'}`}
                                                    >
                                                        <div>
                                                            <p className="text-xs font-medium text-white line-clamp-1">{product.title}</p>
                                                            <p className="text-[10px] text-gray-500">₹{product.price}</p>
                                                        </div>
                                                        {newBundle.product_ids.includes(product.id) ? 
                                                            <CheckCircle2 size={16} className="text-tronix-primary" /> : 
                                                            <Plus size={16} className="text-gray-600" />
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setEditingBundle(null);
                                            }}
                                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!editingBundle && newBundle.product_ids.length < 2}
                                            className="flex-1 px-4 py-3 rounded-xl bg-tronix-primary text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all font-display"
                                        >
                                            {editingBundle ? 'Save Changes' : 'Launch Bundle'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteBundle}
                title="Delete Bundle?"
                message={`Are you sure you want to delete bundle "${bundleToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default BundleTable;
