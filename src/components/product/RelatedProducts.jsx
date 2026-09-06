import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import client from '../../api/client';
import { Sparkles } from 'lucide-react';
import { products as mockProducts } from '../../data/mockData';

const RelatedProducts = ({ productId, category }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                // Primary endpoint: backend category recommendation algorithm
                const response = await client.get(`/products/recommendations/${productId}`);
                let list = response.data || [];

                // If backend recommendations are fewer than 3, fallback fetch by category
                if (list.length < 3 && category) {
                    const catRes = await client.get('/products', {
                        params: { category, limit: 8 }
                    });
                    const catProducts = (catRes.data || []).filter(p => p.id !== productId);
                    
                    // Merge unique products
                    const existingIds = new Set(list.map(p => p.id));
                    for (const p of catProducts) {
                        if (!existingIds.has(p.id) && p.id !== productId) {
                            list.push(p);
                            existingIds.add(p.id);
                        }
                        if (list.length >= 4) break;
                    }
                }

                setRecommendations(list.slice(0, 4));
            } catch (error) {
                console.warn("Error fetching recommendations, using category fallback:", error);
                // Fallback to local mock data matching category
                const localSameCategory = mockProducts.filter(
                    p => p.id !== productId && (!category || p.category?.toLowerCase() === category.toLowerCase())
                );
                const localFallback = localSameCategory.length >= 3 
                    ? localSameCategory 
                    : mockProducts.filter(p => p.id !== productId);
                setRecommendations(localFallback.slice(0, 4));
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchRecommendations();
        }
    }, [productId, category]);

    if (loading) {
        return (
            <section className="mt-16 sm:mt-24 border-t border-white/10 pt-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                                Related Products {category ? <span className="text-purple-400 font-normal">in {category}</span> : null}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400">
                                Explore complementary components and modules in the same category
                            </p>
                        </div>
                    </div>
                    <div className="hidden md:block flex-1 max-w-xs h-px bg-gradient-to-r from-purple-500/40 to-transparent ml-6"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))}
                </div>
            </section>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                            Related Products {category ? <span className="text-purple-400 font-normal">in {category}</span> : null}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Explore complementary components and modules in the same category
                        </p>
                    </div>
                </div>
                <div className="hidden md:block flex-1 max-w-xs h-px bg-gradient-to-r from-purple-500/40 to-transparent ml-6"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.slice(0, 4).map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
};

export default RelatedProducts;
