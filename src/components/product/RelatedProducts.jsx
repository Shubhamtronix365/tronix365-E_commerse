import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import client from '../../api/client';
import { Loader } from 'lucide-react';

const RelatedProducts = ({ productId }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                const response = await client.get(`/products/recommendations/${productId}`);
                setRecommendations(response.data);
            } catch (error) {
                console.error("Error fetching recommendations:", error);
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchRecommendations();
        }
    }, [productId]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader className="text-tronix-primary animate-spin" size={32} />
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <section className="mt-20">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-display font-bold text-white">You Might Also Like</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-tronix-primary/50 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
};

export default RelatedProducts;
