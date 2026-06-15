import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Plus, Info, Tag, Boxes, Package, List, DollarSign, Image as ImageIcon, Loader, Save } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

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
                            <form id="product-form" onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

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
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                        <option className="bg-tronix-card text-white">Development Boards</option>
                                                        <option className="bg-tronix-card text-white">Sensors</option>
                                                        <option className="bg-tronix-card text-white">Modules</option>
                                                        <option className="bg-tronix-card text-white">Motors</option>
                                                        <option className="bg-tronix-card text-white">Battery</option>
                                                        <option className="bg-tronix-card text-white">Displays</option>
                                                    </select>
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
                                                value={newProduct.description}
                                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none resize-none custom-scrollbar"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1 flex items-center justify-between">
                                                <span>Features</span>
                                                <span className="text-xs text-gray-500 font-normal">One per line</span>
                                            </label>
                                            <textarea
                                                rows="4"
                                                placeholder="e.g. Wi-Fi Enabled&#10;Bluetooth 5.0&#10;Rechargeable Battery"
                                                value={newProduct.features}
                                                onChange={(e) => setNewProduct({ ...newProduct, features: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none resize-none custom-scrollbar font-mono text-sm leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Pricing & Media */}
                                <div className="lg:col-span-4 space-y-5">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <DollarSign size={16} /> Pricing
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Selling Price (₹)</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                                                        ₹
                                                    </div>
                                                    <input
                                                        type="number"
                                                        required
                                                        placeholder="0.00"
                                                        value={newProduct.price}
                                                        onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                                        className="w-full bg-black/20 border border-emerald-500/30 rounded-xl pl-8 pr-4 py-3 text-emerald-400 placeholder-emerald-900/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-emerald-500/5 transition-all outline-none text-lg font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <ImageIcon size={16} /> Media
                                        </h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Product Image</label>

                                            {/* Image Preview Block */}
                                            <div className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-white/10 mb-3 bg-black/20 flex flex-col items-center justify-center relative overflow-hidden group">
                                                {newProduct.image ? (
                                                    <>
                                                        <img src={getImageUrl(newProduct.image)} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-colors flex items-center gap-2 font-medium shadow-xl"
                                                                disabled={uploading}
                                                            >
                                                                <Edit size={18} /> Change Image
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2">
                                                            <ImageIcon className="text-gray-400 w-6 h-6" />
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-3">No image selected</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="bg-tronix-primary/20 hover:bg-tronix-primary/30 text-tronix-primary border border-tronix-primary/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium mx-auto text-sm"
                                                            disabled={uploading}
                                                        >
                                                            <Plus size={16} /> Upload Image
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Upload Overlay */}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                                                        <Loader className="w-8 h-8 text-tronix-primary animate-spin mb-2" />
                                                        <span className="text-sm font-medium text-white">Uploading...</span>
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />

                                            {/* Manual URL Input — hidden for data URI (base64 uploads) */}
                                            {!newProduct.image?.startsWith('data:') && (
                                                <div className="relative mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Or paste image URL here..."
                                                        value={newProduct.image || ''}
                                                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
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
