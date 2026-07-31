import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ShoppingCart, Eye, Heart, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';
import Image from '../common/Image';
import ShareModal from '../common/ShareModal';

const ProductCard = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { animateToCart } = useCartAnimation();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const isWishlisted = isInWishlist(product.id);

    const handleAddToCart = (e) => {
        e.preventDefault();
        addToCart(product);
        animateToCart(e.currentTarget.getBoundingClientRect());
        toast.success(`Added ${product.title} to cart`);
    };

    const handleOpenShare = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsShareOpen(true);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative bg-tronix-card border border-white/5 rounded-2xl overflow-hidden hover:border-tronix-primary/50 transition-all duration-300 h-full flex flex-col"
            >
                {/* Image Container */}
                <Link 
                    to={`/product/${slugify(product.title)}`} 
                    className="relative h-48 overflow-hidden bg-tronix-dark/60 p-3 flex items-center justify-center cursor-pointer group-hover:opacity-95 transition-opacity border-b border-white/5"
                >
                    <div className="w-full h-full bg-white rounded-xl p-2.5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                        <Image
                            src={getImageUrl(product.image)}
                            alt={product.title}
                            title={product.title}
                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                        />
                    </div>

                    {/* Out of Stock Overlay */}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10 backdrop-blur-[2px]">
                            <span className="bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                Out of Stock
                            </span>
                        </div>
                    )}

                    {/* Desktop Hover Indicator Buttons */}
                    <div className={`absolute inset-0 bg-black/35 opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px] ${product.stock === 0 ? 'hidden' : ''}`}>
                        <div className="p-3 bg-tronix-primary text-white rounded-full shadow-lg shadow-tronix-primary/40 transform scale-90 lg:group-hover:scale-100 transition-transform duration-300">
                            <Eye size={20} />
                        </div>
                        <button
                            onClick={handleOpenShare}
                            className="p-3 bg-white/10 hover:bg-violet-600 text-white rounded-full shadow-lg backdrop-blur-md border border-white/20 transform scale-90 lg:group-hover:scale-100 transition-all duration-300"
                            title="Share Product Link"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                </Link>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="text-xs text-tronix-primary font-medium mb-1 flex items-center justify-between">
                            <span>{product.category}</span>
                            <button 
                                onClick={handleOpenShare}
                                className="text-gray-400 hover:text-violet-400 p-1 rounded transition-colors lg:hidden"
                                title="Share Product"
                            >
                                <Share2 size={14} />
                            </button>
                        </div>
                        <Link to={`/product/${slugify(product.title)}`} className="block mb-2">
                            <h3 className="text-white font-medium text-base leading-tight line-clamp-2 group-hover:text-tronix-primary transition-colors">
                                {product.title}
                            </h3>
                        </Link>
                        
                        {/* Price section */}
                        <div className="flex items-center gap-2 mt-2">
                            {product.mrp && Number(product.mrp) > Number(product.price) ? (
                                <>
                                    <span className="text-sm font-bold text-tronix-accent">₹{product.price}</span>
                                    <span className="text-xs text-tronix-muted line-through">₹{product.mrp}</span>
                                </>
                            ) : (
                                <span className="text-sm font-bold text-tronix-accent">₹{product.price}</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                            onClick={handleAddToCart}
                            disabled={product.stock === 0}
                            className="flex-1 bg-white/5 hover:bg-tronix-primary text-white text-xs font-bold py-2 px-3 rounded-lg border border-white/10 hover:border-tronix-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-white/5 cursor-pointer"
                        >
                            <ShoppingCart size={14} /> Add
                        </button>
                        <button
                            onClick={handleOpenShare}
                            className="p-2 rounded-lg bg-white/5 hover:bg-violet-600/30 border border-white/10 hover:border-violet-500/50 text-gray-300 hover:text-violet-300 transition-colors cursor-pointer"
                            title="Share Product"
                        >
                            <Share2 size={16} />
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
                            className={`p-2 rounded-lg transition-colors border ${isWishlisted ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-tronix-muted hover:text-white'} cursor-pointer`}
                            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                            <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Share Modal Popup */}
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                product={product}
            />
        </>
    );
};

export default ProductCard;
