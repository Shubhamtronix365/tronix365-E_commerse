import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Edit, Plus, Info, Tag, Boxes, Package, List, DollarSign, 
    Image as ImageIcon, Loader, Save, Factory, Globe,
    Sliders, Trash2, ClipboardList, Sparkles, Star, ArrowLeft, ArrowRight, UploadCloud
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 text-white">
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
                        className="relative w-full max-w-4xl bg-tronix-card border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10 flex flex-col max-h-[90vh] overflow-hidden m-4"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-tronix-primary/20 flex items-center justify-center border border-tronix-primary/30">
                                    {editingProduct ? <Edit className="text-tronix-primary w-5 h-5" /> : <Plus className="text-tronix-primary w-5 h-5" />}
                                </div>
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form 
                                id="product-form" 
                                onSubmit={(e) => {
                                    console.log("DEBUG: product-form onSubmit event fired!");
                                    handleSaveProduct(e);
                                }} 
                                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                            >

                                {/* Left Column - Main Details */}
                                <div className="lg:col-span-8 space-y-5">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Info size={16} /> Basic Information
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
                                                        className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-md transition-colors"
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

                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <List size={16} /> Details & Features
                                        </h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Description</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Detailed description of the product..."
                                                value={newProduct.description || ''}
                                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none resize-none custom-scrollbar"
                                            />
                                        </div>

                                        {/* Specifications (One per line) & Features (One per line) - Option shown like in Image 2 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-violet-300 font-semibold">
                                                        <Sliders size={14} className="text-violet-400" /> Specifications
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
                                                    rows="3"
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
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-300 mb-1 pl-1">Warranty Info</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 6 Months Warranty"
                                                        value={newProduct.warranty_info || ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, warranty_info: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-300 mb-1 pl-1">Country Of Origin</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. India / Taiwan"
                                                        value={newProduct.country_of_origin || ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, country_of_origin: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-tronix-primary outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technical Specifications Panel - Providing BOTH Table View & Textarea View */}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Sliders size={16} /> Technical Specifications
                                                </h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                                                    {(newProduct.specs || []).length} {(newProduct.specs || []).length === 1 ? 'spec' : 'specs'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* View Mode Toggle: Table View (Image 1) vs Textarea View (Image 2) */}
                                                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSpecViewMode('table')}
                                                        className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
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
                                                        className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
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
                                                        className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-colors"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {specViewMode === 'textarea' ? (
                                            /* Option 2: Textarea / Quick Multiline Editor (Image 2 Style) */
                                            <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/10">
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span>Paste or edit specifications (one per line, e.g. <strong className="text-white">Key: Value</strong>, <strong className="text-white">Key | Value</strong>, or alternating lines):</span>
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
                                                                className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                                                            >
                                                                <Plus size={10} className="text-violet-400" />
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Option 1: Table / Row-by-Row Editor (Image 1 Style) */
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
                                                                    className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
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
                                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                                                    className="w-full py-2 border border-dashed border-white/15 hover:border-violet-500/50 rounded-xl bg-white/[0.02] hover:bg-violet-500/[0.05] text-xs font-semibold text-gray-300 hover:text-violet-300 flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Plus size={14} className="text-violet-400" />
                                                    Add Specification Row
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column - Pricing & Media */}
                                <div className="lg:col-span-4 space-y-5">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <DollarSign size={16} /> Pricing
                                            </h3>
                                            {newProduct.mrp && Number(newProduct.mrp) > Number(newProduct.price) && (
                                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                    {Math.round(((Number(newProduct.mrp) - Number(newProduct.price)) / Number(newProduct.mrp)) * 100)}% OFF
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1 pl-1 flex items-center justify-between">
                                                    <span>Selling Price (₹) <strong className="text-emerald-400">*</strong></span>
                                                    <span className="text-[11px] text-gray-500 font-normal">Active purchase price</span>
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
                                                        className="w-full bg-black/20 border border-emerald-500/30 rounded-xl pl-8 pr-4 py-2.5 text-emerald-400 placeholder-emerald-900/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-emerald-500/5 transition-all outline-none text-base font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1 pl-1 flex items-center justify-between">
                                                    <span>MRP (₹) <span className="text-gray-500 text-xs font-normal">(Optional)</span></span>
                                                    <span className="text-[11px] text-gray-500 font-normal">Strikethrough price</span>
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
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none text-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Live Price Strikethrough Preview */}
                                            {newProduct.price !== '' && (
                                                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1">
                                                    <div className="text-gray-400 font-medium">Storefront Display:</div>
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
                                                                (No strikethrough)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tower Order / Sourcing Settings */}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Factory size={16} /> Tower Order / Sourcing
                                        </h3>

                                        <div className="space-y-3 text-xs">
                                            <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={newProduct.tower_order_only || false}
                                                    onChange={(e) => setNewProduct({ ...newProduct, tower_order_only: e.target.checked })}
                                                    className="w-4 h-4 mt-0.5 rounded bg-black/40 border-white/20 text-violet-600 focus:ring-0"
                                                />
                                                <div>
                                                    <span className="font-semibold">Tower Order Only (On-Demand)</span>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                                        Not sold via immediate checkout. Only accepted via Tower Order inquiry with Target Price.
                                                    </p>
                                                </div>
                                            </label>

                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <div>
                                                    <label className="block text-gray-300 text-[11px] mb-1 pl-1">Factory Lead (Days)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="7"
                                                        value={newProduct.factory_lead_days ?? ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, factory_lead_days: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                        onBlur={() => setNewProduct({ ...newProduct, factory_lead_days: Math.max(1, parseInt(newProduct.factory_lead_days, 10) || 7) })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-300 text-[11px] mb-1 pl-1">Shipping Transit (Days)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="3"
                                                        value={newProduct.shipping_lead_days ?? ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, shipping_lead_days: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                        onBlur={() => setNewProduct({ ...newProduct, shipping_lead_days: Math.max(1, parseInt(newProduct.shipping_lead_days, 10) || 3) })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 text-[11px] mb-1 pl-1">Min. Order Qty for Tower Order (MOQ)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="1"
                                                    value={newProduct.moq ?? ''}
                                                    onChange={(e) => setNewProduct({ ...newProduct, moq: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
                                                    onBlur={() => setNewProduct({ ...newProduct, moq: Math.max(1, parseInt(newProduct.moq, 10) || 1) })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <ImageIcon size={16} className="text-violet-400" />
                                                <span>Product Images (1 to N Gallery)</span>
                                            </h3>
                                            <span className="text-xs bg-violet-500/20 text-violet-300 font-semibold px-2.5 py-0.5 rounded-full border border-violet-500/30">
                                                {currentImages.length} {currentImages.length === 1 ? 'Image' : 'Images'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-400">
                                            Upload multiple images or paste URLs. The 1st image is automatically used as the catalog cover. Drag or reorder any image to be the primary cover.
                                        </p>

                                        {/* Upload & Add Controls */}
                                        <div className="space-y-3">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageUpload}
                                            />

                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-600/20 disabled:opacity-50 cursor-pointer"
                                                >
                                                    {uploading ? (
                                                        <>
                                                            <Loader size={16} className="animate-spin" />
                                                            <span>Uploading Images...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UploadCloud size={16} />
                                                            <span>Upload Images (Select 1 or more)</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* URL Add Input */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Or paste image URL (e.g. https://...)"
                                                    value={imageUrlInput}
                                                    onChange={(e) => setImageUrlInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddUrlImage();
                                                        }
                                                    }}
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddUrlImage}
                                                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                                                >
                                                    <Plus size={15} /> Add URL
                                                </button>
                                            </div>
                                        </div>

                                        {/* Image Gallery Manager Grid */}
                                        {currentImages.length > 0 ? (
                                            <div className="space-y-3 pt-2">
                                                <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                                                    <span>Uploaded Gallery ({currentImages.length})</span>
                                                    <span className="text-[11px] text-gray-400">#1 is the Primary Cover</span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {currentImages.map((imgUrl, idx) => {
                                                        const isCover = idx === 0;
                                                        return (
                                                            <div
                                                                key={`admin-img-${idx}`}
                                                                className={`relative rounded-xl p-2 bg-black/40 border transition-all flex flex-col justify-between group ${
                                                                    isCover
                                                                        ? 'border-violet-500 ring-2 ring-violet-500/30'
                                                                        : 'border-white/10 hover:border-white/25'
                                                                }`}
                                                            >
                                                                {/* Image Thumbnail */}
                                                                <div className="w-full aspect-square rounded-lg bg-white p-1.5 flex items-center justify-center overflow-hidden mb-2 relative">
                                                                    <img
                                                                        src={getImageUrl(imgUrl)}
                                                                        alt={`Product view ${idx + 1}`}
                                                                        className="w-full h-full object-contain mix-blend-multiply"
                                                                    />
                                                                    {isCover && (
                                                                        <div className="absolute top-1 left-1 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                                                                            <Star size={10} className="fill-current" /> Cover
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                                                        #{idx + 1}
                                                                    </div>
                                                                </div>

                                                                {/* Controls Toolbar */}
                                                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                                                                    {!isCover ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetCover(idx)}
                                                                            className="text-[11px] text-violet-300 hover:text-white font-medium hover:underline flex items-center gap-0.5"
                                                                            title="Make this the Cover image"
                                                                        >
                                                                            <Star size={12} /> Set Cover
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[11px] text-violet-400 font-semibold">
                                                                            Primary
                                                                        </span>
                                                                    )}

                                                                    <div className="flex items-center gap-1 ml-auto">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMoveImage(idx, -1)}
                                                                            disabled={idx === 0}
                                                                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                                            title="Move backward"
                                                                        >
                                                                            <ArrowLeft size={12} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMoveImage(idx, 1)}
                                                                            disabled={idx === currentImages.length - 1}
                                                                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                                            title="Move forward"
                                                                        >
                                                                            <ArrowRight size={12} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveImage(idx)}
                                                                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors ml-1"
                                                                            title="Remove this image"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center bg-black/20">
                                                <ImageIcon className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-50" />
                                                <p className="text-xs text-gray-400 mb-1">No images uploaded yet</p>
                                                <p className="text-[11px] text-gray-500">
                                                    Click "Upload Images" above to add 1 to N high-resolution pictures for your customers.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl flex justify-end gap-3 rounded-b-2xl mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="product-form"
                                onClick={(e) => {
                                    console.log("DEBUG: product-form submit button onClick fired!");
                                }}
                                className="bg-tronix-primary hover:bg-violet-600 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {editingProduct ? 'Save Changes' : 'Create Product'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProductModal;
