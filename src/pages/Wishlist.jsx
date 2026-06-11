import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../utils/imageUtils';
import { slugify } from '../utils/slugify';
import Image from '../components/common/Image';

const Wishlist = () => {
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleMoveToCart = (product) => {
        const success = addToCart(product);
        if (success) {
            removeFromWishlist(product.id);
            toast.success(`Moved ${product.title} to cart`);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Heart className="text-tronix-accent" size={32} />
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white">My Wishlist</h1>
                </div>

                {wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {wishlistItems.map((product) => (
                            <motion.div
                                key={product.id}
                                whileHover={{ y: -5 }}
                                className="glass-card rounded-2xl overflow-hidden group relative"
                            >
                                <button
                                    onClick={() => removeFromWishlist(product.id)}
                                    className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-red-500/80 rounded-full text-white transition-colors backdrop-blur-sm"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <Link to={`/product/${slugify(product.title)}`} className="block">
                                    <div className="relative h-48 p-4 bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center">
                                        <Image
                                            src={getImageUrl(product.image)}
                                            alt={product.title}
                                            title={product.title}
                                            className="h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs text-tronix-primary font-bold mb-1 uppercase tracking-wider">{product.category}</p>
                                        <h3 className="text-white font-medium mb-2 line-clamp-2 min-h-[3rem] group-hover:text-tronix-accent transition-colors">
                                            {product.title}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-white">₹{product.price}</span>
                                            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">In Stock</span>
                                        </div>
                                    </div>
                                </Link>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleMoveToCart(product);
                                    }}
                                    className="w-full bg-white/5 hover:bg-tronix-primary text-white font-medium py-3 transition-colors flex items-center justify-center gap-2"
                                >
                                    Move to Cart
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <Heart size={48} className="mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
                        <Link to="/shop" className="text-tronix-primary hover:underline">Continue Shopping</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
