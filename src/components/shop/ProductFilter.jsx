import React from 'react';
import { Filter, SlidersHorizontal, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductFilter = ({
    categories,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy,
    showInStockOnly,
    setShowInStockOnly,
    isMobile = false
}) => {
    const [isSortOpen, setIsSortOpen] = React.useState(false);
    return (
        <div className={`bg-tronix-card/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 ${isMobile ? '' : 'sticky top-24'}`}>
            <div className="flex items-center gap-2 mb-6 text-white pb-4 border-b border-white/5">
                <SlidersHorizontal size={20} className="text-tronix-primary" />
                <h3 className="font-display font-bold text-lg">Filters</h3>
            </div>

            {/* Categories */}
            <div className="mb-8">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Categories</h4>
                <div className="space-y-2">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'All' ? 'bg-tronix-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        All Categories
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === category ? 'bg-tronix-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Price Range</h4>
                    <span className="text-xs text-tronix-accent bg-tronix-accent/10 px-2 py-1 rounded">
                        ₹0 - ₹{priceRange}
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tronix-primary"
                />
            </div>

            {/* Sort By */}
            <div className="mb-8 relative">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Sort By</h4>

                <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                    className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white hover:bg-white/10 transition-colors focus:border-tronix-primary outline-none"
                >
                    <span className="text-sm">
                        {sortBy === '' && 'Default'}
                        {sortBy === 'price_asc' && 'Price: Low to High'}
                        {sortBy === 'price_desc' && 'Price: High to Low'}
                        {sortBy === 'name_asc' && 'Name: A to Z'}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isSortOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute mt-2 w-full bg-tronix-card border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 backdrop-blur-xl"
                        >
                            {[
                                { value: '', label: 'Default' },
                                { value: 'price_asc', label: 'Price: Low to High' },
                                { value: 'price_desc', label: 'Price: High to Low' },
                                { value: 'name_asc', label: 'Name: A to Z' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSortBy(option.value);
                                        setIsSortOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === option.value ? 'bg-tronix-primary/20 text-tronix-primary font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Availability */}
            <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Availability</h4>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showInStockOnly ? 'bg-tronix-primary border-tronix-primary' : 'border-gray-600 group-hover:border-gray-500'}`}>
                        {showInStockOnly && <Check size={14} className="text-white" />}
                    </div>
                    <input
                        type="checkbox"
                        checked={showInStockOnly}
                        onChange={() => setShowInStockOnly(!showInStockOnly)}
                        className="hidden"
                    />
                    <span className={`text-sm ${showInStockOnly ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>In Stock Only</span>
                </label>
            </div>
        </div>
    );
};

export default ProductFilter;
