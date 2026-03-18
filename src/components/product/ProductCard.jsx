import React from 'react';
import toast from 'react-hot-toast';
import { ShoppingCart, Eye, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { getImageUrl } from '../../utils/imageUtils';

const ProductCard = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { animateToCart } = useCartAnimation();
    const isWishlisted = isInWishlist(product.id);

    const handleAddToCart = (e) => {
        e.preventDefault();
        addToCart(product);
        animateToCart(e.currentTarget.getBoundingClientRect());
        toast.success(`Added ${product.title} to cart`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative bg-tronix-card border border-white/5 rounded-2xl overflow-hidden hover:border-tronix-primary/50 transition-all duration-300 h-full flex flex-col"
        >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden bg-white/5 p-4 flex items-center justify-center">
                <img
                    src={getImageUrl(product.image)}
                    alt={product.title}
                    className="h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />

                {/* Out of Stock Overlay */}
                {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Out of Stock
                        </span>
                    </div>
                )}

                {/* Overlay Actions */}
                <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-sm ${product.stock === 0 ? 'hidden' : ''}`}>
                    <Link to={`/product/${product.id}`} className="p-2 bg-white text-tronix-dark rounded-full hover:bg-tronix-primary hover:text-white transition-colors" title="View Details">
                        <Eye size={20} />
                    </Link>
                    <button
                        onClick={handleAddToCart}
                        className="p-2 bg-tronix-primary text-white rounded-full hover:bg-violet-600 transition-colors"
                        title="Add to Cart"
                    >
                        <ShoppingCart size={20} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            toggleWishlist(product);
                            if (isWishlisted) {
                                toast.error('Removed from Wishlist');
                            } else {
                                toast.success('Added to Wishlist');
                            }
                        }}
                        className={`p-2 rounded-full transition-colors ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-tronix-dark hover:bg-red-500 hover:text-white'}`}
                    >
                        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-tronix-primary font-medium mb-1">{product.category}</div>
                <Link to={`/product/${product.id}`} className="block">
                    <h3 className="text-white font-medium text-lg leading-tight mb-2 line-clamp-2 group-hover:text-tronix-primary transition-colors">
                        {product.title}
                    </h3>
                </Link>
                <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                        onClick={handleAddToCart}
                        disabled={product.stock === 0}
                        className="flex-1 bg-white/5 hover:bg-tronix-primary text-white text-xs font-bold py-2 px-3 rounded-lg border border-white/10 hover:border-tronix-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-white/5"
                    >
                        <ShoppingCart size={14} /> Add
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            toggleWishlist(product);
                            if (isWishlisted) {
                                toast.error('Removed from Wishlist');
                            } else {
                                toast.success('Added to Wishlist');
                            }
                        }}
                        className={`p-2 rounded-lg transition-colors border ${isWishlisted ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-tronix-muted hover:text-white'}`}
                        title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                        <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;
