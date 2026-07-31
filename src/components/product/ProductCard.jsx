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
                className="group relative bg-tronix-card border border-white/5 rounded-2xl overflow-hidden hover:border-tronix-primary/50 transition-all duration-300 h-full flex flex-col justify-between"
            >
                {/* Image & Quick Action Overlay Container */}
                <div className="relative h-44 sm:h-48 overflow-hidden bg-tronix-dark/60 p-3 flex items-center justify-center border-b border-white/5">
                    {/* Top Floating Glassmorphic Action Bar (Share & Wishlist) */}
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
                        <button
                            onClick={handleOpenShare}
                            className="p-1.5 rounded-full text-gray-300 hover:text-violet-300 hover:bg-white/15 transition-all cursor-pointer"
                            title="Share Product Link"
                        >
                            <Share2 size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleWishlist(product);
                                if (isWishlisted) {
                                    toast.error('Removed from Wishlist');
                                } else {
                                    toast.success('Added to Wishlist');
                                }
                            }}
                            className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                isWishlisted 
                                    ? 'text-red-500 bg-red-500/20' 
                                    : 'text-gray-300 hover:text-white hover:bg-white/15'
                            }`}
                            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                            <Heart size={14} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Main Image Link */}
                    <Link 
                        to={`/product/${slugify(product.title)}`} 
                        className="w-full h-full bg-white rounded-xl p-2.5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden"
                    >
                        <Image
                            src={getImageUrl(product.image)}
                            alt={product.title}
                            title={product.title}
                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                        />
                    </Link>

                    {/* Out of Stock Overlay */}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10 backdrop-blur-[2px]">
                            <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                Out of Stock
                            </span>
                        </div>
                    )}

                    {/* Desktop Hover Quick View Indicator */}
                    <div className={`absolute inset-0 bg-black/35 opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px] pointer-events-none ${product.stock === 0 ? 'hidden' : ''}`}>
                        <div className="p-3 bg-tronix-primary text-white rounded-full shadow-lg shadow-tronix-primary/40 transform scale-90 lg:group-hover:scale-100 transition-transform duration-300">
                            <Eye size={20} />
                        </div>
                    </div>
                </div>

                {/* Content Details */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <div className="text-[11px] sm:text-xs text-tronix-primary font-medium mb-1 truncate">
                            {product.category || 'Electronics'}
                        </div>
                        <Link to={`/product/${slugify(product.title)}`} className="block">
                            <h3 className="text-white font-medium text-xs sm:text-sm md:text-base leading-snug line-clamp-2 group-hover:text-tronix-primary transition-colors min-h-[2.5rem]">
                                {product.title}
                            </h3>
                        </Link>
                        
                        {/* Price Section */}
                        <div className="flex items-center gap-2 mt-2">
                            {product.mrp && Number(product.mrp) > Number(product.price) ? (
                                <>
                                    <span className="text-sm sm:text-base font-bold text-tronix-accent">₹{Number(product.price).toLocaleString()}</span>
                                    <span className="text-xs text-tronix-muted line-through">₹{Number(product.mrp).toLocaleString()}</span>
                                </>
                            ) : (
                                <span className="text-sm sm:text-base font-bold text-tronix-accent">₹{Number(product.price).toLocaleString()}</span>
                            )}
                        </div>
                    </div>

                    {/* Full Width Responsive Add to Cart Button */}
                    <div>
                        <button
                            onClick={handleAddToCart}
                            disabled={product.stock === 0}
                            className="w-full bg-white/5 hover:bg-tronix-primary text-white text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl border border-white/10 hover:border-tronix-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-white/5 cursor-pointer shadow-sm"
                        >
                            <ShoppingCart size={15} />
                            <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
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
