import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import ProductFilter from '../components/shop/ProductFilter';
import { categories, products as mockProducts } from '../data/mockData';
import client from '../api/client';

const Shop = () => {
    const { category } = useParams();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Initialize category from URL if present
    useEffect(() => {
        if (category) {
            // Robust matching: Find the category where slugified name matches the URL param
            const targetCategory = categories.find(c =>
                c.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
            );

            if (targetCategory) {
                setSelectedCategory(targetCategory);
            } else {
                // If param doesn't match known categories, maybe it's "all" or invalid
                if (category.toLowerCase() === 'all') {
                    setSelectedCategory('All');
                }
            }
        } else {
            // If accessed via /shop, ensure 'All' is selected
            setSelectedCategory('All');
        }
    }, [category]);

    const [priceRange, setPriceRange] = useState(10000);
    const [sortBy, setSortBy] = useState('');
    const [showInStockOnly, setShowInStockOnly] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 12;

    const [error, setError] = useState(null);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Initial Load & Filter Change
    useEffect(() => {
        fetchProducts(1, true);
    }, [selectedCategory, priceRange, sortBy, showInStockOnly, window.location.search]);

    const fetchProducts = async (pageToFetch, reset = false) => {
        if (reset) {
            setLoading(true);
            setPage(1);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const params = {
                skip: (pageToFetch - 1) * LIMIT,
                limit: LIMIT
            };

            // Add Filters
            const searchParams = new URLSearchParams(window.location.search);
            const searchQuery = searchParams.get('search');

            if (selectedCategory !== 'All') params.category = selectedCategory;
            if (priceRange < 10000) params.max_price = priceRange;
            if (sortBy) params.sort_by = sortBy;
            if (searchQuery) params.search = searchQuery;

            const response = await client.get('/products', { params });
            let data = response.data;

            // Client-side Stock Filter (Ideally this should be backend too, but keeping for consistency)
            if (showInStockOnly) {
                data = data.filter(p => p.stock > 0);
            }

            if (data.length < LIMIT) {
                setHasMore(false);
            }

            if (reset) {
                setProducts(data);
                setFilteredProducts(data); // Keeping filteredProducts for compatibility if needed, but distinct mainly for client-side search which we replaced
            } else {
                setProducts(prev => [...prev, ...data]);
                setFilteredProducts(prev => [...prev, ...data]);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load products.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, false);
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                            {new URLSearchParams(window.location.search).get('search') ? `Search Results: "${new URLSearchParams(window.location.search).get('search')}"` : 'Shop Components'}
                        </h1>
                        <p className="text-gray-400">Browse our collection of premium electronics.</p>
                    </div>

                    <button
                        onClick={() => setIsMobileFilterOpen(true)}
                        className="md:hidden flex items-center gap-2 bg-tronix-card border border-white/10 px-4 py-2 rounded-lg text-white font-medium hover:bg-white/5 transition-colors"
                    >
                        <Filter size={18} /> Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
                        <ProductFilter
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            priceRange={priceRange}
                            setPriceRange={setPriceRange}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            showInStockOnly={showInStockOnly}
                            setShowInStockOnly={setShowInStockOnly}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        {/* Loading State */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <ProductCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-10">{error}</div>
                        ) : filteredProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                                {hasMore && (
                                    <div className="mt-12 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loadingMore ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <Filter size={48} className="mb-4 opacity-50" />
                                <h3 className="text-xl font-bold mb-2">No products found</h3>
                                <p>Try adjusting your search or filters.</p>
                                <button
                                    onClick={() => { setSelectedCategory('All'); setPriceRange(10000); }}
                                    className="mt-4 text-tronix-primary hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Filter Drawer */}
                <AnimatePresence>
                    {isMobileFilterOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-80 bg-tronix-bg border-l border-white/10 z-50 lg:hidden p-6 overflow-y-auto"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-display font-bold text-xl text-white">Filters</h3>
                                    <button onClick={() => setIsMobileFilterOpen(false)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                                <ProductFilter
                                    categories={categories}
                                    selectedCategory={selectedCategory}
                                    setSelectedCategory={setSelectedCategory}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    showInStockOnly={showInStockOnly}
                                    setShowInStockOnly={setShowInStockOnly}
                                />
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full mt-8 bg-tronix-primary text-white font-bold py-3 rounded-xl hover:bg-violet-600 transition-colors"
                                >
                                    Show Results
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Shop;
