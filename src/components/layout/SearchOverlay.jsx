import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShoppingBag, ArrowRight, Loader } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';
import Skeleton from '../common/Skeleton';
import { slugify } from '../../utils/slugify';

const SearchOverlay = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim()) {
                setIsLoading(true);
                try {
                    const response = await client.get(`/products/search?q=${encodeURIComponent(query)}`);
                    setResults(response.data);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Handle Escape and Cmd+K keys
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (!isOpen) {
                    // This logic would need to be in a parent or a global state 
                    // to open it, but we can at least handle focus here if needed.
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isOpen]);

    const handleResultClick = (product) => {
        onClose();
        navigate(`/product/${slugify(product.title)}`);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-[#0F172A]/90 backdrop-blur-xl flex justify-center pt-24 px-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-tronix-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden h-fit max-h-[70vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input Area */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-4 relative">
                            <Search className="text-gray-400" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search products, categories, or brands..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-500"
                            />
                            {isLoading ? (
                                <Loader className="text-tronix-primary animate-spin" size={20} />
                            ) : query && (
                                <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Results Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {isLoading ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 py-2">Searching...</p>
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-white/5">
                                            <Skeleton className="w-12 h-12" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton variant="text" className="w-1/2" />
                                                <Skeleton variant="text" className="w-1/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : results.length > 0 ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 py-2">Products</p>
                                    {results.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleResultClick(product)}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center p-1 shrink-0">
                                                <img src={getImageUrl(product.image)} alt={product.title} className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-medium truncate group-hover:text-tronix-primary transition-colors">{product.title}</h4>
                                                <p className="text-xs text-gray-400">{product.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-tronix-accent font-bold">₹{product.price}</p>
                                                {product.sale_price && (
                                                    <p className="text-[10px] text-gray-500 line-through">₹{product.mrp}</p>
                                                )}
                                            </div>
                                            <ArrowRight size={16} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            ) : query.trim() && !isLoading ? (
                                <div className="p-8 text-center">
                                    <ShoppingBag className="mx-auto text-gray-700 mb-3" size={40} />
                                    <p className="text-gray-400">No results found for "<span className="text-white">{query}</span>"</p>
                                    <p className="text-sm text-gray-500 mt-1">Try checking for typos or use more general terms.</p>
                                </div>
                            ) : !query.trim() && (
                                <div className="p-8 text-center">
                                    <Search className="mx-auto text-gray-700 mb-3" size={40} />
                                    <p className="text-gray-400 italic">Start typing to search the Tronix365 catalog...</p>
                                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                                        {['Laptop', 'Headphones', 'Camera', 'Watch'].map(tag => (
                                            <button 
                                                key={tag}
                                                onClick={() => setQuery(tag)}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs text-gray-400 hover:text-white transition-all"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-3 bg-white/[0.02] border-t border-white/10 flex justify-between items-center text-[10px] text-gray-500">
                            <div className="flex gap-3">
                                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">ESC</kbd> to close</span>
                                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↵</kbd> to select</span>
                            </div>
                            <span className="font-display font-bold tracking-tighter text-gray-700">TRONIX365 SEARCH</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchOverlay;
