import React, { useState } from 'react';
import { 
    Edit, 
    Trash2, 
    ExternalLink, 
    Copy, 
    Check, 
    Search, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight, 
    Filter, 
    Layers, 
    Boxes, 
    AlertTriangle, 
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';
import toast from 'react-hot-toast';

const ProductTable = ({ 
    products = [], 
    totalProducts = 0,
    searchQuery = '', 
    setSearchQuery,
    categoryFilter = 'All',
    setCategoryFilter,
    stockFilter = 'all',
    setStockFilter,
    sortBy = 'id_desc',
    setSortBy,
    pageSize = 50,
    setPageSize,
    currentPage = 1,
    setCurrentPage,
    categories = [],
    loading = false,
    onRefresh,
    handleOpenEditModal, 
    handleDeleteClick
}) => {
    const [copiedSku, setCopiedSku] = useState(null);

    const handleCopySku = (sku) => {
        if (!sku) return;
        navigator.clipboard.writeText(sku);
        setCopiedSku(sku);
        toast.success(`Copied SKU: ${sku}`, { duration: 1500 });
        setTimeout(() => setCopiedSku(null), 2000);
    };

    // Calculate pagination values
    const isShowAll = pageSize === 'all' || pageSize === 0;
    const effectiveLimit = isShowAll ? (totalProducts || products.length || 1) : Number(pageSize);
    const totalCount = totalProducts > 0 ? totalProducts : products.length;
    const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(totalCount / effectiveLimit));

    // Ensure valid current page
    const validPage = Math.min(Math.max(1, currentPage), totalPages);

    const startItem = totalCount === 0 ? 0 : isShowAll ? 1 : (validPage - 1) * effectiveLimit + 1;
    const endItem = isShowAll ? totalCount : Math.min(validPage * effectiveLimit, totalCount);

    // Filter products locally for stock filter if needed
    const displayedProducts = products.filter(p => {
        if (stockFilter === 'in_stock') return p.stock > 0;
        if (stockFilter === 'low_stock') return p.stock > 0 && p.stock <= 10;
        if (stockFilter === 'out_of_stock') return p.stock <= 0;
        return true;
    });

    // Generate page numbers window
    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [1];
        if (validPage > 3) pages.push('...');
        const start = Math.max(2, validPage - 1);
        const end = Math.min(totalPages - 1, validPage + 1);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (validPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    const hasActiveFilters = searchQuery || categoryFilter !== 'All' || stockFilter !== 'all' || sortBy !== 'id_desc';

    const handleResetFilters = () => {
        if (setSearchQuery) setSearchQuery('');
        if (setCategoryFilter) setCategoryFilter('All');
        if (setStockFilter) setStockFilter('all');
        if (setSortBy) setSortBy('id_desc');
        if (setCurrentPage) setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* ── Top Controls & Filter Bar ─────────────────────────────── */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title, SKU, category..."
                            value={searchQuery}
                            onChange={(e) => {
                                if (setSearchQuery) setSearchQuery(e.target.value);
                                if (setCurrentPage) setCurrentPage(1);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    if (setSearchQuery) setSearchQuery('');
                                    if (setCurrentPage) setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Quick Category & Sort Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Category Dropdown */}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                            <Layers size={14} className="text-gray-400" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    if (setCategoryFilter) setCategoryFilter(e.target.value);
                                    if (setCurrentPage) setCurrentPage(1);
                                }}
                                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-2"
                            >
                                <option value="All" className="bg-slate-900 text-white">All Categories</option>
                                {categories.map((c) => {
                                    const cName = typeof c === 'object' ? c.name : c;
                                    return (
                                        <option key={cName} value={cName} className="bg-slate-900 text-white">
                                            {cName}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                            <Filter size={14} className="text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    if (setSortBy) setSortBy(e.target.value);
                                    if (setCurrentPage) setCurrentPage(1);
                                }}
                                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-2"
                            >
                                <option value="id_desc" className="bg-slate-900 text-white">Newest First</option>
                                <option value="id_asc" className="bg-slate-900 text-white">Oldest First</option>
                                <option value="name_asc" className="bg-slate-900 text-white">Title (A to Z)</option>
                                <option value="name_desc" className="bg-slate-900 text-white">Title (Z to A)</option>
                                <option value="price_asc" className="bg-slate-900 text-white">Price (Low to High)</option>
                                <option value="price_desc" className="bg-slate-900 text-white">Price (High to Low)</option>
                                <option value="stock_desc" className="bg-slate-900 text-white">Stock (High to Low)</option>
                                <option value="stock_asc" className="bg-slate-900 text-white">Stock (Low to High)</option>
                            </select>
                        </div>

                        {/* Page Size Selector */}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                            <Boxes size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-400 hidden sm:inline">Per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                    if (setPageSize) setPageSize(val);
                                    if (setCurrentPage) setCurrentPage(1);
                                }}
                                className="bg-transparent text-xs font-bold text-tronix-accent focus:outline-none cursor-pointer pr-1"
                            >
                                <option value={25} className="bg-slate-900 text-white">25</option>
                                <option value={50} className="bg-slate-900 text-white">50</option>
                                <option value={100} className="bg-slate-900 text-white">100</option>
                                <option value={250} className="bg-slate-900 text-white">250</option>
                                <option value="all" className="bg-slate-900 text-white">All ({totalCount || '300+'})</option>
                            </select>
                        </div>

                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50"
                                title="Refresh products list"
                            >
                                <RefreshCw size={15} className={loading ? "animate-spin text-tronix-primary" : ""} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Stock Filter Pills & Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium mr-1">Stock Status:</span>
                        <button
                            onClick={() => { if (setStockFilter) setStockFilter('all'); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                stockFilter === 'all'
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            All ({totalCount})
                        </button>
                        <button
                            onClick={() => { if (setStockFilter) setStockFilter('in_stock'); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                stockFilter === 'in_stock'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                        >
                            <CheckCircle2 size={12} /> In Stock
                        </button>
                        <button
                            onClick={() => { if (setStockFilter) setStockFilter('low_stock'); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                stockFilter === 'low_stock'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            }`}
                        >
                            <AlertTriangle size={12} /> Low Stock (≤10)
                        </button>
                        <button
                            onClick={() => { if (setStockFilter) setStockFilter('out_of_stock'); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                stockFilter === 'out_of_stock'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            }`}
                        >
                            Out of Stock
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                            Showing <strong className="text-white">{startItem}–{endItem}</strong> of <strong className="text-tronix-accent">{totalCount}</strong> products
                        </span>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="text-xs text-tronix-primary hover:underline font-semibold"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Products Data Table ───────────────────────────────────── */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 shadow-xl">
                <table className="w-full text-left text-sm text-gray-400 min-w-[700px]">
                    <thead className="bg-white/5 text-white uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="px-4 py-3.5 text-center w-16">#</th>
                            <th className="px-6 py-3.5">Product Title</th>
                            <th className="px-6 py-3.5">SKU / MPN</th>
                            <th className="px-6 py-3.5">Category</th>
                            <th className="px-6 py-3.5">Price / MRP</th>
                            <th className="px-6 py-3.5 text-center">Stock</th>
                            <th className="px-6 py-3.5 text-center">Status</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-gray-400">
                                    <div className="inline-flex items-center gap-2">
                                        <RefreshCw size={18} className="animate-spin text-tronix-primary" />
                                        <span>Loading products catalog...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : displayedProducts.map((item, index) => {
                            const serialNo = isShowAll ? (index + 1) : ((validPage - 1) * effectiveLimit + index + 1);
                            const itemSlug = item.slug || slugify(item.title);

                            return (
                                <tr key={item.id} className="hover:bg-white/[0.04] transition-colors group">
                                    {/* Serial Number */}
                                    <td className="px-4 py-3.5 text-center font-mono font-bold text-violet-300 text-xs">
                                        #{serialNo}
                                    </td>

                                    {/* Product Title & Thumbnail */}
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:border-violet-500/50 transition-colors">
                                                <img 
                                                    src={getImageUrl(item.image)} 
                                                    alt={item.title} 
                                                    className="w-full h-full object-contain p-0.5" 
                                                    onError={(e) => {
                                                        e.target.src = "https://placehold.co/100x100?text=No+Img";
                                                    }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <a
                                                    href={`/product/${itemSlug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-white hover:text-tronix-primary transition-colors line-clamp-1 flex items-center gap-1.5"
                                                    title="Click to view product on storefront"
                                                >
                                                    <span>{item.title}</span>
                                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-tronix-primary shrink-0" />
                                                </a>
                                                <p className="text-[11px] text-gray-500 font-mono mt-0.5">ID: {item.id}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* SKU / SKV */}
                                    <td className="px-6 py-3.5 font-mono text-xs">
                                        {item.skv ? (
                                            <button
                                                onClick={() => handleCopySku(item.skv)}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                                                title="Click to copy SKU"
                                            >
                                                <span>{item.skv}</span>
                                                {copiedSku === item.skv ? (
                                                    <Check size={12} className="text-emerald-400" />
                                                ) : (
                                                    <Copy size={12} className="opacity-60" />
                                                )}
                                            </button>
                                        ) : (
                                            <span className="text-gray-600">—</span>
                                        )}
                                    </td>

                                    {/* Category */}
                                    <td className="px-6 py-3.5">
                                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 truncate max-w-[140px]">
                                            {item.category || 'General'}
                                        </span>
                                    </td>

                                    {/* Price & MRP */}
                                    <td className="px-6 py-3.5">
                                        <div className="font-bold text-white">₹{Number(item.price || item.sale_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                        {item.mrp && Number(item.mrp) > Number(item.price) && (
                                            <div className="text-[11px] text-gray-500 line-through">
                                                ₹{Number(item.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </td>

                                    {/* Stock Count */}
                                    <td className="px-6 py-3.5 text-center font-bold font-mono">
                                        {item.stock}
                                    </td>

                                    {/* Stock Badge */}
                                    <td className="px-6 py-3.5 text-center">
                                        {item.stock > 10 ? (
                                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                In Stock
                                            </span>
                                        ) : item.stock > 0 ? (
                                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                Low ({item.stock})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                Out of Stock
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <a
                                                href={`/product/${itemSlug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                                                title="View on storefront"
                                            >
                                                <ExternalLink size={15} />
                                            </a>
                                            <button
                                                onClick={() => handleOpenEditModal(item)}
                                                className="p-2 bg-white/5 hover:bg-blue-500/20 rounded-xl text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Edit product"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(item)}
                                                className="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-colors"
                                                title="Delete product"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {!loading && displayedProducts.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-gray-500">
                                    <div className="max-w-sm mx-auto space-y-2">
                                        <p className="text-base font-bold text-gray-400">No products found</p>
                                        <p className="text-xs text-gray-500">
                                            {searchQuery 
                                                ? `No results matching "${searchQuery}". Try a different keyword.`
                                                : "No products match the selected filters."}
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={handleResetFilters}
                                                className="mt-3 px-4 py-1.5 rounded-lg bg-tronix-primary text-white text-xs font-bold hover:bg-violet-600 transition-colors"
                                            >
                                                Clear All Filters
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Modern Pagination Controls ────────────────────────────── */}
            {totalPages > 1 && !isShowAll && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-xs text-gray-400">
                        Page <strong className="text-white">{validPage}</strong> of <strong className="text-white">{totalPages}</strong> ({totalCount} total products)
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* First Page */}
                        <button
                            onClick={() => setCurrentPage && setCurrentPage(1)}
                            disabled={validPage <= 1 || loading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
                            title="First page"
                        >
                            <ChevronsLeft size={16} />
                        </button>

                        {/* Previous Page */}
                        <button
                            onClick={() => setCurrentPage && setCurrentPage(validPage - 1)}
                            disabled={validPage <= 1 || loading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
                            title="Previous page"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Numbered Page Buttons */}
                        <div className="flex items-center gap-1 px-1">
                            {getPageNumbers().map((p, i) => {
                                if (p === '...') {
                                    return <span key={`dots-${i}`} className="px-2 text-gray-500 text-xs">…</span>;
                                }
                                const isCurrent = p === validPage;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage && setCurrentPage(p)}
                                        disabled={loading}
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                            isCurrent
                                                ? 'bg-tronix-primary text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Page */}
                        <button
                            onClick={() => setCurrentPage && setCurrentPage(validPage + 1)}
                            disabled={validPage >= totalPages || loading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
                            title="Next page"
                        >
                            <ChevronRight size={16} />
                        </button>

                        {/* Last Page */}
                        <button
                            onClick={() => setCurrentPage && setCurrentPage(totalPages)}
                            disabled={validPage >= totalPages || loading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
                            title="Last page"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Note when Show All is active */}
            {isShowAll && (
                <div className="p-3 bg-violet-950/40 border border-violet-500/30 rounded-xl flex items-center justify-between text-xs text-violet-200">
                    <span>✨ All <strong>{totalCount}</strong> products are loaded in the view. Scroll through the table to inspect all inventory.</span>
                    <button
                        onClick={() => {
                            if (setPageSize) setPageSize(50);
                            if (setCurrentPage) setCurrentPage(1);
                        }}
                        className="font-bold underline text-violet-300 hover:text-white"
                    >
                        Switch to 50 / page
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductTable;
