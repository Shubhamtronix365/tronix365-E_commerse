import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { products as mockProducts } from '../../data/mockData';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';

const SearchOverlay = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    // Fetch products when opened
    useEffect(() => {
        if (isOpen) {
            client.get('/products')
                .then(res => {
                    const data = res.data;
                    if (data.length > 0) {
                        setAllProducts(data);
                    } else {
                        setAllProducts(mockProducts);
                    }
                })
                .catch((err) => {
                    console.error("Search failed, using mock data:", err);
                    setAllProducts(mockProducts);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.trim() === '') {
            setResults([]);
        } else {
            const filtered = allProducts.filter(product =>
                product.title.toLowerCase().includes(query.toLowerCase()) ||
                product.category.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
        }
    }, [query]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';

            // Handle Escape key
            const handleEsc = (e) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose} // Close on backdrop click
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24"
                >
                    <div
                        className="w-full max-w-3xl px-4"
                        onClick={(e) => e.stopPropagation()} // Prevent close when clicking content
                    >
                        {/* Close Button - Correctly Positioned */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>

                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="relative mb-8">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tronix-primary" size={24} />
                                <input
                                    type="text"
                                    placeholder="Search for components, boards, sensors..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-tronix-card/80 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-tronix-primary transition-all shadow-2xl shadow-tronix-primary/10"
                                />
                            </div>

                            {/* Results */}
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {results.length > 0 ? (
                                    results.map(product => (
                                        <Link
                                            key={product.id}
                                            to={`/product/${slugify(product.title)}`}
                                            onClick={onClose}
                                            className="flex items-center gap-4 bg-tronix-card/50 hover:bg-tronix-card border border-white/5 hover:border-tronix-primary/30 p-4 rounded-xl transition-all group"
                                        >
                                            <img src={getImageUrl(product.image)} alt={product.title} className="w-16 h-16 object-contain bg-white/5 p-2 rounded-lg" />
                                            <div className="flex-1">
                                                <h4 className="text-white font-medium group-hover:text-tronix-primary transition-colors">{product.title}</h4>
                                                <p className="text-sm text-gray-400">{product.category}</p>
                                            </div>
                                            <span className="text-tronix-accent font-bold">₹{product.price}</span>
                                            <ArrowRight size={20} className="text-gray-500 group-hover:text-white -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                        </Link>
                                    ))
                                ) : query && (
                                    <div className="text-center text-gray-400 py-8">
                                        No results found for "{query}"
                                    </div>
                                )}

                                {!query && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Arduino', 'Raspberry Pi', 'Sensors', 'Motors', 'ESP32'].map(term => (
                                            <button
                                                key={term}
                                                onClick={() => setQuery(term)}
                                                className="text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
                                            >
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchOverlay;
