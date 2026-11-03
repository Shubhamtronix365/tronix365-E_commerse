import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Edit, Plus, Info, Tag, Boxes, Package, List, DollarSign, 
    Image as ImageIcon, Loader, Save, Factory, Globe,
    Sliders, Trash2, ClipboardList, Sparkles, Star, ArrowLeft, ArrowRight, UploadCloud, Check
} from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';
import { useCategories } from '../../hooks/useCategories';
import { parseSpecsText, formatSpecsToText } from '../../utils/specUtils';

const ProductModal = ({
    isOpen,
    onClose,
    editingProduct,
    newProduct,
    setNewProduct,
    handleSaveProduct,
    handleImageUpload,
    uploading,
    fileInputRef
}) => {
    const { categories } = useCategories();
    const [specViewMode, setSpecViewMode] = useState('table'); // 'table' or 'textarea'
    const [imageUrlInput, setImageUrlInput] = useState('');

    const currentImages = Array.isArray(newProduct.images) && newProduct.images.length > 0
        ? newProduct.images.filter(img => typeof img === 'string' && img.trim().length > 0)
        : (newProduct.image ? [newProduct.image] : []);

    const handleSetCover = (index) => {
        if (index === 0) return;
        const list = [...currentImages];
        const [selected] = list.splice(index, 1);
        list.unshift(selected);
        setNewProduct(prev => ({
            ...prev,
            images: list,
            image: list[0] || ''
        }));
    };

    const handleMoveImage = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= currentImages.length) return;
        const list = [...currentImages];
        const temp = list[index];
        list[index] = list[newIndex];
        list[newIndex] = temp;
        setNewProduct(prev => ({
            ...prev,
            images: list,
            image: list[0] || ''
        }));
    };

    const handleRemoveImage = (index) => {
        const list = currentImages.filter((_, i) => i !== index);
        setNewProduct(prev => ({
            ...prev,
            images: list,
            image: list[0] || ''
        }));
    };

    const handleDeletePrimaryImage = () => {
        if (currentImages.length === 0) return;
        handleRemoveImage(0);
    };

    const handleClearAllImages = () => {
        if (window.confirm('Are you sure you want to delete all images from this product gallery?')) {
            setNewProduct(prev => ({
                ...prev,
                images: [],
                image: ''
            }));
        }
    };

    const handleAddUrlImage = (e) => {
        if (e) e.preventDefault();
        const clean = (imageUrlInput || '').trim();
        if (!clean) return;
        const list = [...currentImages, clean];
        setNewProduct(prev => ({
            ...prev,
            images: list,
            image: prev.image || list[0] || ''
        }));
        setImageUrlInput('');
    };

    const handleSpecsTextChange = (e) => {
        const text = e.target.value;
        const parsed = parseSpecsText(text);
        setNewProduct(prev => ({
            ...prev,
            specsText: text,
            specs: parsed
        }));
    };

    const handleAddSpecRow = () => {
        const currentSpecs = Array.isArray(newProduct.specs) ? newProduct.specs : [];
        const updated = [...currentSpecs, { key: '', value: '' }];
        setNewProduct(prev => ({
            ...prev,
            specs: updated,
            specsText: formatSpecsToText(updated)
        }));
    };

    const handleAddSpecPreset = (presetKey) => {
        const currentSpecs = Array.isArray(newProduct.specs) ? newProduct.specs : [];
        if (currentSpecs.some(s => s.key?.toLowerCase() === presetKey.toLowerCase())) return;
        const updated = [...currentSpecs, { key: presetKey, value: '' }];
        setNewProduct(prev => ({
            ...prev,
            specs: updated,
            specsText: formatSpecsToText(updated)
        }));
    };

    const handleUpdateSpecRow = (index, field, val) => {
        const currentSpecs = Array.isArray(newProduct.specs) ? [...newProduct.specs] : [];
        if (!currentSpecs[index]) return;
        currentSpecs[index] = { ...currentSpecs[index], [field]: val };
        setNewProduct(prev => ({
            ...prev,
            specs: currentSpecs,
            specsText: formatSpecsToText(currentSpecs)
        }));
    };

    const handleDeleteSpecRow = (index) => {
        const currentSpecs = Array.isArray(newProduct.specs) ? [...newProduct.specs] : [];
        currentSpecs.splice(index, 1);
        setNewProduct(prev => ({
            ...prev,
            specs: currentSpecs,
            specsText: formatSpecsToText(currentSpecs)
        }));
    };

    const handleClearAllSpecs = () => {
        setNewProduct(prev => ({
            ...prev,
            specs: [],
            specsText: ''
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 text-white">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-5xl xl:max-w-6xl bg-tronix-card border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10 flex flex-col max-h-[92vh] overflow-hidden m-2 sm:m-4"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/5">
                            <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-tronix-primary/20 flex items-center justify-center border border-tronix-primary/30">
                                    {editingProduct ? <Edit className="text-tronix-primary w-5 h-5" /> : <Plus className="text-tronix-primary w-5 h-5" />}
                                </div>
                                <span>{editingProduct ? 'Edit Product' : 'Add New Product'}</span>
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Close modal"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
                            <form 
                                id="product-form" 
                                onSubmit={handleSaveProduct} 
                                className="space-y-6"
                            >
                                {/* Top Row: Basic Info (Left) + Pricing & Tower Order (Right) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Basic Info Column */}
                                    <div className="lg:col-span-7 space-y-5">
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Info size={16} className="text-violet-400" /> Basic Information
                                            </h3>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Product Title</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                                        <Tag size={18} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. Arduino Uno R3"
                                                        value={newProduct.title}
                                                        onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                                                    />
                                                </div>
                                                {newProduct.title && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 font-mono bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5 overflow-hidden">
                                                        <Globe size={13} className="text-violet-400 shrink-0" />
                                                        <span className="text-violet-400 font-semibold shrink-0">Storefront URL:</span>
                                                        <span className="truncate text-gray-300">
                                                            /product/<strong className="text-white">{slugify(newProduct.title)}</strong>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Category</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                                            <Boxes size={18} />
                                                        </div>
                                                        <select
                                                            value={newProduct.category}
                                                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none appearance-none"
                                                        >
                                                            {categories.length === 0 ? (
                                                                <option value={newProduct.category || ''} className="bg-tronix-card text-white">
                                                                    {newProduct.category || 'Select Category'}
                                                                </option>
                                                            ) : (
                                                                categories.map((cat) => (
                                                                    <option key={cat.id} value={cat.name} className="bg-tronix-card text-white">
                                                                        {cat.name}
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">SKU / Part Number</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                                            <Tag size={18} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. TRX-ESP32-WROVER"
                                                            value={newProduct.sku || ''}
                                                            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                        <span>Stock Quantity</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewProduct({ ...newProduct, stock: 0 })}
                                                            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            Out of Stock
                                                        </button>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                                            <Package size={18} />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            required
                                                            placeholder="0"
                                                            value={newProduct.stock === 0 ? 0 : newProduct.stock || ''}
                                                            onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing & Tower Order Column */}
                                    <div className="lg:col-span-5 space-y-5">
                                        {/* Pricing Card */}
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                    <DollarSign size={16} className="text-emerald-400" /> Pricing
                                                </h3>
                                                {newProduct.mrp && Number(newProduct.mrp) > Number(newProduct.price) && (
                                                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                        {Math.round(((Number(newProduct.mrp) - Number(newProduct.price)) / Number(newProduct.mrp)) * 100)}% OFF
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-300 mb-1 pl-1 flex items-center justify-between">
                                                        <span>Selling Price (₹) <strong className="text-emerald-400">*</strong></span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 font-bold">
                                                            ₹
                                                        </div>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            required
                                                            placeholder="0.00"
                                                            value={newProduct.price === '' ? '' : newProduct.price}
                                                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            className="w-full bg-black/20 border border-emerald-500/30 rounded-xl pl-8 pr-3 py-2 text-emerald-400 placeholder-emerald-900/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-emerald-500/5 transition-all outline-none text-base font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-300 mb-1 pl-1 flex items-center justify-between">
                                                        <span>MRP (₹) <span className="text-gray-500 text-[10px]">(Strikethrough)</span></span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold">
                                                            ₹
                                                        </div>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            placeholder="e.g. 499.00"
                                                            value={newProduct.mrp === '' || newProduct.mrp === null ? '' : newProduct.mrp}
                                                            onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Live Price Strikethrough Preview */}
                                            {newProduct.price !== '' && (
                                                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1">
                                                    <div className="text-gray-400 font-medium">Storefront Display Preview:</div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-base font-bold text-white">
                                                            ₹{Number(newProduct.price || 0).toFixed(2)}
                                                        </span>
                                                        {newProduct.mrp && Number(newProduct.mrp) > Number(newProduct.price) ? (
                                                            <>
                                                                <span className="text-xs text-gray-500 line-through">
                                                                    ₹{Number(newProduct.mrp).toFixed(2)}
                                                                </span>
                                                                <span className="text-[10px] text-emerald-400 font-semibold">
                                                                    (Save ₹{(Number(newProduct.mrp) - Number(newProduct.price)).toFixed(2)})
                                                                </span>
                                                            </>
                                                        ) : newProduct.mrp && Number(newProduct.mrp) <= Number(newProduct.price) ? (
                                                            <span className="text-[10px] text-amber-400">
                                                                (MRP should be higher than Selling Price)
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-500">
                                                                (No strikethrough price)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tower Order / Sourcing Settings */}
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                                            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                                                <Factory size={15} /> Tower Order / Sourcing Settings
                                            </h3>

                                            <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={newProduct.tower_order_only || false}
                                                    onChange={(e) => setNewProduct({ ...newProduct, tower_order_only: e.target.checked })}
                                                    className="w-4 h-4 mt-0.5 rounded bg-black/40 border-white/20 text-violet-600 focus:ring-0 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="text-xs font-semibold">Tower Order Only (On-Demand)</span>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                                        Requires sourcing inquiry; direct checkout disabled.
                                                    </p>
                                                </div>
                                            </label>

                                            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                                                <div>
                                                    <label className="block text-gray-300 text-[10px] mb-1 pl-1">Factory Lead</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="7d"
                                                        value={newProduct.factory_lead_days ?? ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, factory_lead_days: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                        onBlur={() => setNewProduct({ ...newProduct, factory_lead_days: Math.max(1, parseInt(newProduct.factory_lead_days, 10) || 7) })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-300 text-[10px] mb-1 pl-1">Shipping Lead</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="3d"
                                                        value={newProduct.shipping_lead_days ?? ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, shipping_lead_days: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                        onBlur={() => setNewProduct({ ...newProduct, shipping_lead_days: Math.max(1, parseInt(newProduct.shipping_lead_days, 10) || 3) })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-300 text-[10px] mb-1 pl-1">MOQ</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        value={newProduct.moq ?? ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, moq: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                        onBlur={() => setNewProduct({ ...newProduct, moq: Math.max(1, parseInt(newProduct.moq, 10) || 1) })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FULL WIDTH SECTION: Product Image Gallery (1 to N Multi-Angle Showcase) */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg shadow-black/20">
                                    {/* Gallery Header with Info & Actions */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                                                <ImageIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                                                        Product Images Gallery
                                                    </h3>
                                                    <span className="text-xs bg-violet-500/20 text-violet-300 font-semibold px-2.5 py-0.5 rounded-full border border-violet-500/30 font-mono">
                                                        {currentImages.length} {currentImages.length === 1 ? 'Image' : 'Images'}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full hidden sm:inline-block">
                                                        CDN Powered
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Image #1 is the <strong className="text-amber-300 font-semibold">Primary Cover</strong> shown across storefront, catalog, and cart. You can set any image as primary, reorder views, or delete individual images.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Header Actions: Delete Primary Image & Clear All Images */}
                                        {currentImages.length > 0 && (
                                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={handleDeletePrimaryImage}
                                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                                    title="Delete the #1 Primary Cover image (the next image will automatically become primary cover)"
                                                >
                                                    <Trash2 size={13} className="text-rose-400" />
                                                    <span>Delete Primary Cover</span>
                                                </button>

                                                {currentImages.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAllImages}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                                        title="Remove all images from this product"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Clear All</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Controls & Direct CDN URL Bar */}
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                        />

                                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                                            {/* Primary Upload Button */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-600/20 border border-violet-400/30 disabled:opacity-50 cursor-pointer shrink-0"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader size={16} className="animate-spin text-white" />
                                                        <span>Uploading to CDN...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud size={16} />
                                                        <span>Upload Images (Device to CDN)</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Direct CDN URL Input Bar */}
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Or paste direct CDN image URL (e.g. https://res.cloudinary.com/...)"
                                                    value={imageUrlInput}
                                                    onChange={(e) => setImageUrlInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddUrlImage();
                                                        }
                                                    }}
                                                    className="flex-1 bg-black/30 border border-white/15 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddUrlImage}
                                                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-violet-600 border border-white/15 hover:border-violet-500 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                                >
                                                    <Plus size={15} />
                                                    <span>Add URL</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Gallery Grid Display */}
                                    {currentImages.length > 0 ? (
                                        <div className="space-y-3 pt-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                {currentImages.map((imgUrl, idx) => {
                                                    const isCover = idx === 0;
                                                    const isCdn = typeof imgUrl === 'string' && (imgUrl.startsWith('http://') || imgUrl.startsWith('https://'));
                                                    return (
                                                        <div
                                                            key={`admin-img-${idx}`}
                                                            className={`relative rounded-2xl p-3 bg-black/40 border transition-all flex flex-col justify-between group ${
                                                                isCover
                                                                    ? 'border-violet-500 bg-violet-950/20 ring-2 ring-violet-500/40 shadow-xl shadow-violet-500/10'
                                                                    : 'border-white/10 hover:border-white/25 bg-black/30 hover:bg-white/[0.02]'
                                                            }`}
                                                        >
                                                            {/* Card Header: Position & Badge */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    {isCover ? (
                                                                        <div className="bg-gradient-to-r from-amber-500/25 to-violet-500/25 border border-amber-400/40 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                                            <Star size={11} className="fill-amber-400 text-amber-400" />
                                                                            <span>Primary Cover</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-[11px] font-medium text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                                                            View #{idx + 1}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1">
                                                                    {isCdn && (
                                                                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                                            CDN
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                                                        #{idx + 1}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Thumbnail Image Box */}
                                                            <div className="w-full h-44 rounded-xl bg-white p-2.5 flex items-center justify-center overflow-hidden relative shadow-inner my-1 border border-white/10">
                                                                <img
                                                                    src={getImageUrl(imgUrl)}
                                                                    alt={`Product view ${idx + 1}`}
                                                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
                                                                />
                                                            </div>

                                                            {/* Primary Cover Action Button */}
                                                            <div className="mt-2.5">
                                                                {!isCover ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSetCover(idx)}
                                                                        className="w-full py-1.5 px-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 hover:border-violet-500 text-violet-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                                                        title="Make this image the #1 Primary Cover"
                                                                    >
                                                                        <Star size={13} className="text-amber-400" />
                                                                        <span>Set as Primary Cover</span>
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 select-none">
                                                                        <Star size={13} className="fill-amber-400 text-amber-400" />
                                                                        <span>Active Primary Cover</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Toolbar: Move Left, Move Right, and Delete Button */}
                                                            <div className="flex items-center justify-between gap-1.5 pt-2.5 mt-2 border-t border-white/10">
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMoveImage(idx, -1)}
                                                                        disabled={idx === 0}
                                                                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-0.5 text-[11px] font-medium cursor-pointer"
                                                                        title="Move image left / earlier"
                                                                    >
                                                                        <ArrowLeft size={12} />
                                                                        <span>Left</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMoveImage(idx, 1)}
                                                                        disabled={idx === currentImages.length - 1}
                                                                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-0.5 text-[11px] font-medium cursor-pointer"
                                                                        title="Move image right / later"
                                                                    >
                                                                        <span>Right</span>
                                                                        <ArrowRight size={12} />
                                                                    </button>
                                                                </div>

                                                                {/* Explicit Delete Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveImage(idx)}
                                                                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-300 hover:text-white transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer ml-auto"
                                                                    title={isCover ? "Delete Primary Cover (the next image will automatically become primary cover)" : "Delete this image from gallery"}
                                                                >
                                                                    <Trash2 size={12} />
                                                                    <span>{isCover ? 'Delete Cover' : 'Delete'}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Interactive + Add Image Tile at the end of the grid */}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    className="rounded-2xl border-2 border-dashed border-violet-500/30 hover:border-violet-400 bg-white/[0.02] hover:bg-violet-600/10 flex flex-col items-center justify-center gap-2 p-5 text-center cursor-pointer transition-all group min-h-[220px]"
                                                    title="Click to upload another product image to CDN"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-violet-600/20 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center transition-all text-violet-400 shadow-sm border border-violet-500/30">
                                                        <Plus size={24} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-violet-300 group-hover:text-white">
                                                        + Add Another Image
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 group-hover:text-gray-400">
                                                        PNG, JPG, WEBP to CDN
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Empty State */
                                        <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-black/20 space-y-3">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                                                <ImageIcon size={28} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-200">No product images added yet</p>
                                                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                                    Upload multiple product pictures or paste CDN links. High quality multi-angle views dramatically increase customer conversion.
                                                </p>
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                                                >
                                                    <Plus size={16} />
                                                    <span>Upload First Image to CDN</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* FULL WIDTH SECTION: Details & Features */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <List size={16} className="text-violet-400" /> Details & Features
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Description</label>
                                        <textarea
                                            rows="3"
                                            placeholder="Detailed description of the product..."
                                            value={newProduct.description || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none resize-none custom-scrollbar text-sm"
                                        />
                                    </div>

                                    {/* Specifications (One per line) & Features (One per line) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-violet-300 font-semibold">
                                                    <Sliders size={14} className="text-violet-400" /> Specifications Quick Input
                                                </span>
                                                <span className="text-xs text-gray-400 font-normal">One per line (Key: Value)</span>
                                            </label>
                                            <textarea
                                                rows="4"
                                                placeholder="Operating Voltage: 3.3V to 5V DC&#10;Clock Speed: 16 MHz&#10;Microcontroller: ATmega328P&#10;Dimensions: 68.6 x 53.4 mm"
                                                value={newProduct.specsText || ''}
                                                onChange={handleSpecsTextChange}
                                                className="w-full bg-black/20 border border-violet-500/25 focus:border-tronix-primary rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs custom-scrollbar"
                                            />
                                            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1 px-1">
                                                <span className="text-violet-300">{(newProduct.specs || []).length} specs parsed</span>
                                                <span className="text-gray-400">Synced with Table Editor below ↓</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Features</span>
                                                <span className="text-xs text-gray-500 font-normal">One per line</span>
                                            </label>
                                            <textarea
                                                rows="4"
                                                placeholder="e.g. ESP32-based Wi-Fi/Bluetooth&#10;16M Flash, 8M PSRAM"
                                                value={newProduct.features || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, features: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Applications</span>
                                                <span className="text-xs text-gray-500 font-normal">One per line</span>
                                            </label>
                                            <textarea
                                                rows="3"
                                                placeholder="e.g. IoT Terminal Controller&#10;STEM Education&#10;DIY Creation"
                                                value={newProduct.applications || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, applications: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Package Includes</span>
                                                <span className="text-xs text-gray-500 font-normal">One per line</span>
                                            </label>
                                            <textarea
                                                rows="3"
                                                placeholder="e.g. 1x M5Stack Core2 Board&#10;1x Type-C USB (20cm)"
                                                value={newProduct.package_includes || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, package_includes: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Useful Links</span>
                                                <span className="text-xs text-gray-500 font-normal">Title | URL</span>
                                            </label>
                                            <textarea
                                                rows="2"
                                                placeholder="e.g. Official Docs | https://docs.m5stack.com"
                                                value={newProduct.useful_links || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, useful_links: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Attachments / PDF Datasheets</span>
                                                <span className="text-xs text-gray-500 font-normal">Name | PDF URL</span>
                                            </label>
                                            <textarea
                                                rows="2"
                                                placeholder="e.g. Core2 Datasheet PDF | https://example.com/sheet.pdf"
                                                value={newProduct.attachments || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, attachments: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none resize-none font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1 pl-1">Warranty Info</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 6 Months Tronix Warranty"
                                                value={newProduct.warranty_info || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, warranty_info: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1 pl-1">Country Of Origin</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. India / Taiwan / USA"
                                                value={newProduct.country_of_origin || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, country_of_origin: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* FULL WIDTH SECTION: Technical Specifications Panel (Table & Textarea Dual View) */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Sliders size={16} className="text-violet-400" /> Technical Specifications
                                            </h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                                                {(newProduct.specs || []).length} {(newProduct.specs || []).length === 1 ? 'spec' : 'specs'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* View Mode Toggle: Table View vs Textarea View */}
                                            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setSpecViewMode('table')}
                                                    className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        specViewMode === 'table'
                                                            ? 'bg-violet-600 text-white font-medium shadow-sm'
                                                            : 'text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    <Sliders size={12} /> Table View (Row Editor)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSpecViewMode('textarea')}
                                                    className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        specViewMode === 'textarea'
                                                            ? 'bg-violet-600 text-white font-medium shadow-sm'
                                                            : 'text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    <ClipboardList size={12} /> Textarea View (One per line)
                                                </button>
                                            </div>
                                            {(newProduct.specs || []).length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllSpecs}
                                                    className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                                                >
                                                    Clear All Specs
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {specViewMode === 'textarea' ? (
                                        /* Option 2: Textarea / Quick Multiline Editor */
                                        <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/10">
                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                                <span>Paste or edit specifications (one per line, e.g. <strong className="text-white">Key: Value</strong> or <strong className="text-white">Key | Value</strong>):</span>
                                            </div>
                                            <textarea
                                                rows="7"
                                                placeholder="Operating Voltage: 3.3V to 5V DC&#10;Clock Speed: 16 MHz&#10;Microcontroller: ATmega328P&#10;Flash Memory: 32 KB&#10;Digital I/O Pins: 14&#10;Dimensions: 68.6 x 53.4 mm"
                                                value={newProduct.specsText || ''}
                                                onChange={handleSpecsTextChange}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary outline-none font-mono text-xs leading-relaxed custom-scrollbar"
                                            />
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-400">
                                                <span>{(newProduct.specs || []).length} specifications parsed in real time into database format.</span>
                                                <span className="text-violet-400">Automatically syncs with Table View!</span>
                                            </div>
                                            {/* Preset chips for fast entry */}
                                            <div className="pt-2 border-t border-white/5 space-y-1.5">
                                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                    <Sparkles size={11} className="text-amber-400" /> Insert Common Specification Presets:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['Operating Voltage', 'Current Rating', 'Microcontroller / Chip', 'Dimensions', 'Weight', 'Interface / Protocol', 'Pin Count', 'Operating Temperature'].map((preset) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => handleAddSpecPreset(preset)}
                                                            className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Plus size={10} className="text-violet-400" />
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Option 1: Table / Row-by-Row Editor */
                                        <div className="space-y-3">
                                            {/* Quick Chip Suggestions */}
                                            {(newProduct.specs || []).length === 0 && (
                                                <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 space-y-2">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                        <Sparkles size={13} className="text-amber-400" />
                                                        <span>Quick Add Common Electronics Specifications:</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {['Operating Voltage', 'Current Rating', 'Microcontroller / Chip', 'Dimensions', 'Weight', 'Interface / Protocol', 'Pin Count', 'Operating Temperature'].map((preset) => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                onClick={() => handleAddSpecPreset(preset)}
                                                                className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Plus size={11} className="text-violet-400" />
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rows */}
                                            {(newProduct.specs || []).length > 0 && (
                                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                                    <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                        <div className="col-span-5">Specification / Parameter (Key)</div>
                                                        <div className="col-span-6">Value / Details</div>
                                                        <div className="col-span-1 text-center">Action</div>
                                                    </div>
                                                    {(newProduct.specs || []).map((spec, index) => (
                                                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-black/20 p-1.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                            <div className="col-span-5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. Operating Voltage"
                                                                    value={spec.key || ''}
                                                                    onChange={(e) => handleUpdateSpecRow(index, 'key', e.target.value)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-6">
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. 3.3V to 5V DC"
                                                                    value={spec.value || ''}
                                                                    onChange={(e) => handleUpdateSpecRow(index, 'value', e.target.value)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteSpecRow(index)}
                                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                                    title="Delete specification"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add Row Button */}
                                            <button
                                                type="button"
                                                onClick={handleAddSpecRow}
                                                className="w-full py-2 border border-dashed border-white/15 hover:border-violet-500/50 rounded-xl bg-white/[0.02] hover:bg-violet-500/[0.05] text-xs font-semibold text-gray-300 hover:text-violet-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Plus size={14} className="text-violet-400" />
                                                Add Specification Row
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-5 sm:p-6 border-t border-white/10 bg-black/30 backdrop-blur-xl flex justify-end gap-3 rounded-b-2xl mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="product-form"
                                className="bg-tronix-primary hover:bg-violet-600 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={18} />
                                <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProductModal;
