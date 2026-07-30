import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Check, X, CircuitBoard, Wifi, Cpu, Zap, Battery, Monitor, Package, MoreHorizontal, Layers, Tag, Box, ArrowUpDown } from 'lucide-react';
import client from '../../api/client';

export const AVAILABLE_ICONS = [
    { name: 'CircuitBoard', label: 'Circuit Board', icon: CircuitBoard },
    { name: 'Wifi', label: 'Wifi / Sensor', icon: Wifi },
    { name: 'Cpu', label: 'Cpu / Module', icon: Cpu },
    { name: 'Zap', label: 'Zap / Motor', icon: Zap },
    { name: 'Battery', label: 'Battery', icon: Battery },
    { name: 'Monitor', label: 'Monitor / Display', icon: Monitor },
    { name: 'Package', label: 'Package / Misc', icon: Package },
    { name: 'MoreHorizontal', label: 'More / Other', icon: MoreHorizontal },
    { name: 'Layers', label: 'Layers', icon: Layers },
    { name: 'Tag', label: 'Tag', icon: Tag },
    { name: 'Box', label: 'Box', icon: Box }
];

export const ICON_MAP = AVAILABLE_ICONS.reduce((acc, curr) => {
    acc[curr.name] = curr.icon;
    return acc;
}, {});

export const COLOR_OPTIONS = [
    { label: 'Violet to Fuchsia', value: 'from-violet-500 to-fuchsia-500' },
    { label: 'Cyan to Blue', value: 'from-cyan-500 to-blue-500' },
    { label: 'Purple to Pink', value: 'from-purple-500 to-pink-500' },
    { label: 'Amber to Orange', value: 'from-amber-500 to-orange-500' },
    { label: 'Emerald to Teal', value: 'from-emerald-500 to-teal-500' },
    { label: 'Indigo to Violet', value: 'from-indigo-500 to-violet-500' },
    { label: 'Slate to Gray', value: 'from-slate-400 to-slate-600' },
    { label: 'Rose to Pink', value: 'from-rose-500 to-pink-600' }
];

const CategoryTable = ({ categories, onRefresh }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        icon: 'Package',
        color: 'from-slate-400 to-slate-600',
        sort_order: 0,
        is_active: true
    });

    const resetForm = () => {
        setForm({
            name: '',
            icon: 'Package',
            color: 'from-slate-400 to-slate-600',
            sort_order: 0,
            is_active: true
        });
        setEditingCategory(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (cat) => {
        setEditingCategory(cat);
        setForm({
            name: cat.name,
            icon: cat.icon || 'Package',
            color: cat.color || 'from-slate-400 to-slate-600',
            sort_order: cat.sort_order || 0,
            is_active: cat.is_active ?? true
        });
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Category name is required');
            return;
        }

        setLoading(true);
        try {
            if (editingCategory) {
                await client.put(`/admin/categories/${editingCategory.id}`, form);
                toast.success('Category updated successfully');
            } else {
                await client.post('/admin/categories', form);
                toast.success('Category created successfully');
            }
            setIsAddModalOpen(false);
            resetForm();
            onRefresh();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || 'Failed to save category');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
        try {
            await client.delete(`/admin/categories/${id}`);
            toast.success('Category deleted successfully');
            onRefresh();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || 'Failed to delete category');
        }
    };

    return (
        <div className="bg-tronix-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Categories Management</h2>
                    <p className="text-sm text-gray-400 mt-1">Manage, add, and reorder store product categories</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center justify-center gap-2 bg-tronix-primary hover:bg-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 text-sm"
                >
                    <Plus size={18} /> Add Category
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <th className="p-4">Sort</th>
                            <th className="p-4">Icon & Preview</th>
                            <th className="p-4">Category Name</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                    No categories found. Click "Add Category" above to create one!
                                </td>
                            </tr>
                        ) : (
                            categories.map((cat) => {
                                const IconComponent = ICON_MAP[cat.icon] || Package;
                                return (
                                    <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-mono text-gray-400">{cat.sort_order}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} bg-opacity-20 text-white border border-white/10`}>
                                                    <IconComponent size={20} />
                                                </div>
                                                <span className="text-xs text-gray-500 font-mono">{cat.icon}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-semibold text-white">{cat.name}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cat.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                                                {cat.is_active ? 'Active' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenEdit(cat)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                                                title="Edit Category"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                title="Delete Category"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-tronix-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-lg font-bold text-white">
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Miscellaneous"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-tronix-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Icon
                                </label>
                                <select
                                    value={form.icon}
                                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-tronix-primary outline-none"
                                >
                                    {AVAILABLE_ICONS.map((ic) => (
                                        <option key={ic.name} value={ic.name} className="bg-tronix-card text-white">
                                            {ic.label} ({ic.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Gradient Color Theme
                                </label>
                                <select
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-tronix-primary outline-none"
                                >
                                    {COLOR_OPTIONS.map((c) => (
                                        <option key={c.value} value={c.value} className="bg-tronix-card text-white">
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Sort Order
                                    </label>
                                    <input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-tronix-primary outline-none"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer pb-3">
                                        <input
                                            type="checkbox"
                                            checked={form.is_active}
                                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                            className="w-4 h-4 accent-tronix-primary"
                                        />
                                        <span className="text-sm text-gray-300 font-medium">Is Active</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-tronix-primary hover:bg-violet-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg"
                                >
                                    {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryTable;
