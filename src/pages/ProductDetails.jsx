import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, X as XIcon, ArrowLeft, Star, ShieldCheck, Truck, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCartAnimation } from '../context/CartAnimationContext';
import { motion } from 'framer-motion';
import { products as mockProducts } from '../data/mockData';
import ReviewSection from '../components/product/ReviewSection';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import RelatedProducts from '../components/product/RelatedProducts';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { animateToCart } = useCartAnimation();
    const [product, setProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('specs');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Use axios with 2000ms timeout
                const response = await client.get(`/products/${id}`, { timeout: 2000 });
                setProduct(response.data);
            } catch (error) {
                console.warn('Backend unavailable, falling back to mock data:', error);
                const found = mockProducts.find(p => p.id === parseInt(id));
                setProduct(found || null);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 text-center text-white">
                <p>Loading product...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen pt-24 text-center text-white">
                <p>Product not found.</p>
                <Link to="/shop" className="text-tronix-primary hover:underline mt-4 inline-block">Back to Shop</Link>
            </div>
        );
    }

    const handleAddToCart = (e) => {
        const success = addToCart(product, quantity);
        if (success) {
            animateToCart(e.currentTarget.getBoundingClientRect());
            toast.success(`Added ${quantity} ${product.title} to cart!`);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Link to="/shop" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Shop
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Image Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-tronix-card/50 border border-white/5 rounded-2xl p-8 flex items-center justify-center h-[500px]"
                    >
                        <img
                            src={getImageUrl(product.image)}
                            alt={product.title}
                            className="max-h-full max-w-full object-contain drop-shadow-2xl"
                        />
                    </motion.div>

                    {/* Product Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="mb-2 text-tronix-primary font-medium tracking-wide uppercase text-sm">
                            {product.category}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                            {product.title}
                        </h1>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex text-yellow-500">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={16} fill="currentColor" />
                                ))}
                            </div>
                            <span className="text-gray-400 text-sm">(12 Reviews)</span>
                            <span className="text-gray-400 text-sm">(12 Reviews)</span>
                            {product.stock > 0 ? (
                                <span className="text-green-400 text-sm flex items-center gap-1">
                                    <Check size={16} /> In Stock ({product.stock})
                                </span>
                            ) : (
                                <span className="text-red-400 text-sm flex items-center gap-1">
                                    <XIcon size={16} /> Out of Stock
                                </span>
                            )}
                        </div>

                        <div className="flex items-end gap-3 mb-8">
                            <div className="flex flex-col">
                                <span className="text-4xl font-bold text-white">
                                    ₹{product.price}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed mb-8 border-b border-white/10 pb-8">
                            {product.description}
                        </p>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex items-center border border-white/10 rounded-lg">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-4 py-2 text-white hover:bg-white/5 transition-colors"
                                >
                                    -
                                </button>
                                <span className="px-4 py-2 text-white font-medium border-x border-white/10">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                    className="px-4 py-2 text-white hover:bg-white/5 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                disabled={product.stock === 0}
                                className={`flex-1 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg ${product.stock > 0 ? 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                                <ShoppingCart size={20} /> {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                            <button
                                onClick={() => {
                                    toggleWishlist(product);
                                    if (isInWishlist(product.id)) {
                                        toast.error('Removed from Wishlist');
                                    } else {
                                        toast.success('Added to Wishlist');
                                    }
                                }}
                                className={`p-3 rounded-lg border border-white/10 transition-colors ${isInWishlist(product.id) ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                            >
                                <Heart size={24} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const success = addToCart(product, quantity);
                                if (success) {
                                    navigate('/cart');
                                }
                            }}
                            disabled={product.stock === 0}
                            className={`w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-8 shadow-lg ${product.stock > 0 ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        >
                            {product.stock > 0 ? 'Proceed to Checkout' : 'Out of Stock'}
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 border border-white/5 rounded-xl bg-white/5">
                                <Truck className="text-tronix-accent" size={24} />
                                <div>
                                    <div className="text-white font-medium text-sm">Fast Delivery</div>
                                    <div className="text-gray-500 text-xs">Same Day Delivery</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 border border-white/5 rounded-xl bg-white/5">
                                <ShieldCheck className="text-tronix-accent" size={24} />
                                <div>
                                    <div className="text-white font-medium text-sm">Warranty</div>
                                    <div className="text-gray-500 text-xs">Manufacturer Warranty</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Spec Tabs */}
                <div className="mt-20">
                    <div className="flex items-center gap-8 border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('specs')}
                            className={`pb-4 text-lg font-medium transition-colors relative ${activeTab === 'specs' ? 'text-tronix-primary' : 'text-gray-400 hover:text-white'}`}
                        >
                            Specifications
                            {activeTab === 'specs' && (
                                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tronix-primary" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`pb-4 text-lg font-medium transition-colors relative ${activeTab === 'reviews' ? 'text-tronix-primary' : 'text-gray-400 hover:text-white'}`}
                        >
                            Reviews
                            {activeTab === 'reviews' && (
                                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tronix-primary" />
                            )}
                        </button>
                    </div>

                    <div className="bg-tronix-card/30 rounded-2xl p-8 border border-white/5">
                        {activeTab === 'specs' ? (
                            <div>
                                {product.features && product.features.length > 0 ? (
                                    <div className="mb-8">
                                        <h3 className="text-white font-bold mb-4">Features</h3>
                                        <ul className="list-disc list-inside space-y-2 text-gray-300">
                                            {product.features.map((feature, index) => (
                                                <li key={index}>{feature}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {product.specs && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        {Object.entries(product.specs).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between border-b border-white/5 py-3">
                                                <span className="text-gray-400">{key}</span>
                                                <span className="text-white font-medium">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ReviewSection productId={product.id} />
                        )}
                    </div>
                </div>

                {/* Recommendations Section */}
                <RelatedProducts productId={id} />
            </div>
        </div>
    );
};

export default ProductDetails;
