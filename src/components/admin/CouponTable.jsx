import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Tag, Percent, IndianRupee, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';

const defaultCouponState = {
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: 0,
    expiry_date: '',
    usage_limit: ''
};

const CouponTable = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [newCoupon, setNewCoupon] = useState(defaultCouponState);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState(null);

    const getCouponStatus = (coupon) => {
        if (!coupon.is_active) return 'INACTIVE';
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) return 'EXPIRED';
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return 'LIMIT EXCEEDED';
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

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await client.get('/admin/coupons');
            setCoupons(res.data);
        } catch (err) {
            toast.error("Failed to load coupons");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newCoupon,
                discount_value: parseFloat(newCoupon.discount_value),
                min_purchase: parseFloat(newCoupon.min_purchase),
                usage_limit: newCoupon.usage_limit ? parseInt(newCoupon.usage_limit) : null,
                expiry_date: new Date(newCoupon.expiry_date).toISOString()
            };
            
            if (editingCoupon) {
                await client.put(`/admin/coupons/${editingCoupon.id}`, payload);
                toast.success("Coupon updated successfully");
            } else {
                await client.post('/admin/coupons', payload);
                toast.success("Coupon created successfully");
            }
            
            setIsModalOpen(false);
            setEditingCoupon(null);
            fetchCoupons();
            setNewCoupon(defaultCouponState);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to save coupon");
        }
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setNewCoupon({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value.toString(),
            min_purchase: coupon.min_purchase.toString(),
            expiry_date: new Date(coupon.expiry_date).toISOString().split('T')[0],
            usage_limit: coupon.usage_limit ? coupon.usage_limit.toString() : ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (coupon) => {
        setCouponToDelete(coupon);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteCoupon = async () => {
        if (!couponToDelete) return;
        try {
            await client.delete(`/admin/coupons/${couponToDelete.id}`);
            toast.success("Coupon deleted successfully");
            fetchCoupons();
        } catch (err) {
            toast.error("Failed to delete coupon");
        } finally {
            setIsDeleteModalOpen(false);
            setCouponToDelete(null);
        }
    };

    const handleToggleStatus = async (coupon) => {
        try {
            await client.put(`/admin/coupons/${coupon.id}`, { is_active: !coupon.is_active });
            toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`);
            fetchCoupons();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <div className="text-white">Loading coupons...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Manage Coupons</h2>
                <button
                    onClick={() => {
                        setEditingCoupon(null);
                        setNewCoupon(defaultCouponState);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-tronix-accent text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    <Plus size={18} /> Create Coupon
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 text-gray-400 text-sm uppercase tracking-wider">
                            <th className="px-4 py-3 font-medium">Code</th>
                            <th className="px-4 py-3 font-medium">Discount</th>
                            <th className="px-4 py-3 font-medium">Min Purchase</th>
                            <th className="px-4 py-3 font-medium">Expiry</th>
                            <th className="px-4 py-3 font-medium">Used</th>
                            <th className="px-4 py-3 font-medium text-center">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {coupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Tag size={16} className="text-tronix-primary" />
                                        <span className="text-white font-mono font-bold tracking-wider">{coupon.code}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-white">
                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                                </td>
                                <td className="px-4 py-4 text-gray-400">
                                    ₹{coupon.min_purchase}
                                </td>
                                <td className="px-4 py-4 text-gray-400 flex items-center gap-2">
                                    <Calendar size={14} />
                                    {new Date(coupon.expiry_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4 text-gray-400">
                                    {coupon.used_count} / {coupon.usage_limit || '∞'}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button 
                                        onClick={() => {
                                            const status = getCouponStatus(coupon);
                                            if (status === 'ACTIVE' || status === 'INACTIVE') {
                                                handleToggleStatus(coupon);
                                            }
                                        }}
                                        disabled={getCouponStatus(coupon) === 'EXPIRED' || getCouponStatus(coupon) === 'LIMIT EXCEEDED'}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${getStatusStyles(getCouponStatus(coupon))}`}
                                    >
                                        {getCouponStatus(coupon)}
                                    </button>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                        <button 
                                            onClick={() => handleEdit(coupon)}
                                            className="p-2 text-gray-400 hover:text-tronix-primary hover:bg-tronix-primary/10 rounded-lg transition-colors"
                                            title="Edit Coupon"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(coupon)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete Coupon"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-tronix-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-white mb-6">
                                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                                </h3>
                                <form onSubmit={handleSaveCoupon} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Coupon Code</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. SAVE20"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                            value={newCoupon.code}
                                            onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                            disabled={!!editingCoupon} // Usually don't allow changing code after creation
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                                            <select
                                                className="w-full bg-[#1A1A2E] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                                value={newCoupon.discount_type}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                                            >
                                                <option value="percentage" className="bg-[#1A1A2E] text-white">Percentage</option>
                                                <option value="fixed" className="bg-[#1A1A2E] text-white">Fixed Amount</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Value</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="number"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                                                    value={newCoupon.discount_value}
                                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                    {newCoupon.discount_type === 'percentage' ? <Percent size={14} /> : <IndianRupee size={14} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Min Purchase</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                                                value={newCoupon.min_purchase}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, min_purchase: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Usage Limit</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                                                value={newCoupon.usage_limit}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                                            value={newCoupon.expiry_date}
                                            onChange={(e) => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setEditingCoupon(null);
                                            }}
                                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 rounded-xl bg-tronix-primary text-black font-bold hover:opacity-90 transition-all"
                                        >
                                            {editingCoupon ? 'Save Changes' : 'Create Coupon'}
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
                onConfirm={confirmDeleteCoupon}
                title="Delete Coupon?"
                message={`Are you sure you want to delete coupon "${couponToDelete?.code}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default CouponTable;
