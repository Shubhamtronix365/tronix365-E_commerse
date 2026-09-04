import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, X as XIcon, ArrowLeft, ArrowRight, Star, ShieldCheck, Truck, Heart, Share2, FileText, Globe, Download, ExternalLink, Shield, HelpCircle, PackageCheck, Tag, Factory, Clock, Split } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCartAnimation } from '../context/CartAnimationContext';
import { motion } from 'framer-motion';
import { products as mockProducts } from '../data/mockData';
import ReviewSection from '../components/product/ReviewSection';
import QnASection from '../components/product/QnASection';
import client from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import RelatedProducts from '../components/product/RelatedProducts';
import SEO from '../components/common/SEO';
import ProductSchema from '../components/common/ProductSchema';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Image from '../components/common/Image';
import ShareModal from '../components/common/ShareModal';
import VariantSelector from '../components/product/VariantSelector';
import TowerOrderModal from '../components/towerOrder/TowerOrderModal';

const ProductDetails = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addToCart, addBundle } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { animateToCart } = useCartAnimation();
    const [product, setProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('description');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [bundles, setBundles] = useState([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isTowerModalOpen, setIsTowerModalOpen] = useState(false);
    const [requestedTowerQty, setRequestedTowerQty] = useState(10);


    useEffect(() => {
        const fetchProductData = async () => {
            try {
                const isId = /^\d+$/.test(slug);
                const endpoint = isId ? `/products/${slug}` : `/products/slug/${slug}`;
                const prodRes = await client.get(endpoint);
                const productData = prodRes.data;
                setProduct(productData);

                // Fetch bundles using product ID
                const bundlesRes = await client.get(`/products/${productData.id}/bundles`).catch(() => ({ data: [] }));
                setBundles(bundlesRes.data);
            } catch (error) {
                console.warn('Backend unavailable or product fetch error, checking local fallback:', error);
                const isId = /^\d+$/.test(slug);
                let found;
                if (isId) {
                    found = mockProducts.find(p => p.id === parseInt(slug));
                } else {
                    const { slugify } = await import('../utils/slugify');
                    const targetSlug = slug.toLowerCase().replace(/_/g, '-');
                    found = mockProducts.find(p => {
                        const pSlug = slugify(p.title);
                        return pSlug === slug || pSlug.replace(/_/g, '-') === targetSlug || (p.skv && p.skv.toLowerCase() === slug.toLowerCase());
                    });
                }
                setProduct(found || null);
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [slug]);

    const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });

    useEffect(() => {
        if (product?.id) {
            client.get(`/products/${product.id}/reviews`)
                .then(res => {
                    const data = res.data || [];
                    if (data.length > 0) {
                        const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
                        setReviewStats({ average: Math.round(avg * 10) / 10, count: data.length });
                    } else {
                        setReviewStats({ average: 0, count: 0 });
                    }
                })
                .catch(() => setReviewStats({ average: 0, count: 0 }));
        }
    }, [product?.id]);

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

    const handleSelectVariant = async (selectedVariant) => {
        if (!selectedVariant || selectedVariant.id === product.id) return;
        try {
            setLoading(true);
            const res = await client.get(`/products/${selectedVariant.id}`);
            setProduct(res.data);
            const { slugify } = await import('../utils/slugify');
            navigate(`/product/${slugify(res.data.title)}`, { replace: true });
        } catch (err) {
            console.error("Error switching variant:", err);
            toast.error("Failed to load selected variant");
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (e) => {
        const success = addToCart(product, quantity);
        if (success) {
            animateToCart(e.currentTarget.getBoundingClientRect());
            toast.success(`Added ${quantity} ${product.title} to cart!`);
        }
    };

    const isPlaceholderImage = (img) => {
        return !img || img.includes('placehold.co') || img.includes('No+Image') || img.includes('No Image');
    };
    const realProductImage = isPlaceholderImage(product.image) ? null : getImageUrl(product.image);

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <SEO
                title={`${product.title} | Buy Online`}
                description={product.description}
                image={realProductImage}
                url={`https://www.tronix365.in/e-commerse/product/${slug}`}
                type="product"
            />
            <ProductSchema
                name={product.title}
                description={product.description}
                image={realProductImage}
                price={product.price}
                sku={product.skv}
                category={product.category}
                inStock={product.stock > 0}
                url={`https://www.tronix365.in/e-commerse/product/${slug}`}
                ratingValue={reviewStats.average}
                reviewCount={reviewStats.count}
                productId={product.id}
            />
            <div className="max-w-7xl mx-auto">
                <Breadcrumbs category={product.category} productName={product.title} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
                    {/* Image Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-3xl p-8 flex items-center justify-center h-[320px] sm:h-[450px] lg:h-[500px] shadow-2xl shadow-violet-500/10 border border-white/20 overflow-hidden"
                    >
                        <Image
                            src={getImageUrl(product.image)}
                            alt={product.title}
                            title={product.title}
                            className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-xl"
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
                                    <Star
                                        key={star}
                                        size={16}
                                        fill={star <= Math.round(reviewStats.average) ? "currentColor" : "none"}
                                        className={star <= Math.round(reviewStats.average) ? "text-yellow-500" : "text-gray-600"}
                                    />
                                ))}
                            </div>
                            <span className="text-gray-400 text-sm font-medium">
                                ({reviewStats.count} {reviewStats.count === 1 ? 'Review' : 'Reviews'})
                            </span>
                            {product.tower_order_only ? (
                                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                    <Factory size={13} /> Factory On-Demand Only
                                </span>
                            ) : product.stock > 0 ? (
                                <span className="text-green-400 text-sm flex items-center gap-1">
                                    <Check size={16} /> In Stock ({product.stock})
                                </span>
                            ) : (
                                <span className="text-red-400 text-sm flex items-center gap-1">
                                    <XIcon size={16} /> Out of Stock
                                </span>
                            )}
                        </div>

                        {/* Interactive Variant Selector */}
                        <VariantSelector
                            product={product}
                            activeVariantId={product.id}
                            onSelectVariant={handleSelectVariant}
                        />

                        <div className="flex items-end gap-3 mb-6">
                            <div className="flex flex-col">
                                <span className="text-4xl font-bold text-white">
                                    ₹{product.price}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed mb-6 border-b border-white/10 pb-6">
                            {product.description}
                        </p>

                        {/* TOWER ORDER SOURCING ONLY MODE */}
                        {product.tower_order_only ? (
                            <div className="space-y-4 mb-8">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 to-purple-900/20 border border-violet-500/30 space-y-2">
                                    <div className="flex items-center gap-2 text-violet-300 font-bold text-xs uppercase tracking-wide">
                                        <Clock size={16} /> On-Demand Manufacturing Procurement
                                    </div>
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        This component is arranged directly through our manufacturing network upon order placement. Not sold via standard warehouse stock.
                                    </p>
                                    <div className="text-xs text-gray-300 flex flex-wrap items-center gap-4 pt-1 font-mono">
                                        <span>🏭 Factory Time: <strong className="text-white">{product.factory_lead_days || 7} Days</strong></span>
                                        <span>🚚 Shipping: <strong className="text-white">{product.shipping_lead_days || 3} Days</strong></span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setRequestedTowerQty(quantity);
                                        setIsTowerModalOpen(true);
                                    }}
                                    className="w-full font-extrabold py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-violet-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white flex items-center justify-center gap-3 shadow-2xl shadow-violet-600/40 text-base transition-all duration-300 hover:scale-[1.01] active:scale-98 border border-white/10"
                                >
                                    <Factory size={22} className="text-amber-300" />
                                    <span>Place Tower Order • Request Factory Quotation</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            /* STANDARD PRODUCT WITH SPLIT / TOWER ORDER CAPABILITY */
                            <div className="space-y-3 mb-8">
                                {quantity > (product.stock || 0) && (product.stock || 0) > 0 && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Split size={16} className="text-amber-400 flex-shrink-0" />
                                            <span>Only <strong>{product.stock} units</strong> in warehouse stock for immediate dispatch.</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setRequestedTowerQty(quantity);
                                                setIsTowerModalOpen(true);
                                            }}
                                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex-shrink-0 transition-colors"
                                        >
                                            Split / Tower Order
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
                                            onClick={() => setQuantity(quantity + 1)}
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
                                        title={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                    >
                                        <Heart size={24} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={() => setIsShareOpen(true)}
                                        className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-violet-600/30 hover:border-violet-500/50 text-white transition-colors cursor-pointer"
                                        title="Share Product"
                                    >
                                        <Share2 size={24} />
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
                                    className={`w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg ${product.stock > 0 ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                >
                                    {product.stock > 0 ? 'Proceed to Checkout' : 'Out of Stock'}
                                </button>

                                {/* High-Converting Human-Designed Tower Order / B2B Sourcing Banner Card */}
                                <div className="relative group overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-900/20 to-violet-900/30 p-4 transition-all duration-300 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-md shadow-amber-500/30 shrink-0 mt-0.5">
                                                <Factory size={20} className="transition-transform group-hover:rotate-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold text-sm tracking-wide">
                                                        Need Wholesale or Factory Pricing?
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                        B2B Tower Order
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-300 mt-0.5">
                                                    Name your target price, request bulk quantities, or split stock with direct factory indent.
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRequestedTowerQty(quantity > (product.stock || 0) ? quantity : Math.max(10, (product.stock || 0) * 2));
                                                setIsTowerModalOpen(true);
                                            }}
                                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-gray-950 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
                                        >
                                            <span>Place Tower Order</span>
                                            <ArrowRight size={14} className="stroke-[3]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}


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

                        {/* Bundles Section */}
                        {bundles.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <ShoppingCart className="text-tronix-accent" size={20} />
                                    Buy Together & Save
                                </h3>
                                <div className="space-y-4">
                                    {bundles.map(bundle => (
                                        <div key={bundle.id} className="bg-tronix-primary/5 border border-tronix-primary/20 rounded-xl p-4 hover:border-tronix-primary/50 transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="text-white font-bold">{bundle.name}</h4>
                                                    <p className="text-xs text-gray-400">{bundle.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-gray-500 line-through block">₹{bundle.original_price}</span>
                                                    <span className="text-lg font-bold text-tronix-accent">₹{bundle.bundle_price}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex -space-x-3 overflow-hidden">
                                                    {bundle.products.map(bp => (
                                                        <div key={bp.id || bp.product_id} className="inline-block h-8 w-8 rounded-full ring-2 ring-tronix-card bg-white p-1" title={bp.product?.title}>
                                                            <img src={getImageUrl(bp.product?.image)} alt="" className="h-full w-full object-contain" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => addBundle(bundle.id)}
                                                    className="bg-tronix-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-violet-600 transition-colors"
                                                >
                                                    Add Bundle to Cart
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* 7 Interactive Product Dossier Tabs */}
                <div className="mt-16 sm:mt-20">
                    <div className="flex items-center gap-4 sm:gap-8 border-b border-white/10 mb-8 overflow-x-auto custom-scrollbar pb-1">
                        {[
                            { id: 'description', label: 'Description', icon: FileText },
                            { id: 'specs', label: 'Specification', icon: Tag },
                            { id: 'warranty', label: 'Warranty', icon: Shield },
                            { id: 'reviews', label: 'Reviews', icon: Star },
                            { id: 'qna', label: 'QnA', icon: HelpCircle },
                            { id: 'attachments', label: 'Attachments', icon: Download },
                            { id: 'origin', label: 'Country Of Origin', icon: Globe }
                        ].map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pb-4 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 shrink-0 ${
                                        isActive ? 'text-violet-400 font-extrabold' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <IconComponent size={16} />
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-lg shadow-violet-500/50" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Panels */}
                    <div className="bg-tronix-card/40 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
                        {/* TAB 1: Description Panel */}
                        {activeTab === 'description' && (
                            <div className="space-y-8 text-gray-300 leading-relaxed text-sm">
                                {/* Main Description */}
                                <div>
                                    <p className="text-gray-200 text-sm sm:text-base leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>

                                {/* Applications */}
                                {(product.applications && product.applications.length > 0) ? (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <PackageCheck className="text-violet-400" size={18} /> Applications:
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-2 pl-2 text-gray-300">
                                            {product.applications.map((app, idx) => (
                                                <li key={idx} className="leading-snug">{app}</li>
                                            ))}
                                        </ol>
                                    </div>
                                ) : (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <PackageCheck className="text-violet-400" size={18} /> Applications:
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-2 pl-2 text-gray-300">
                                            <li>Internet of Things (IoT) terminal & smart controller.</li>
                                            <li>Robotics, Automation & STEM Education projects.</li>
                                            <li>DIY electronic creation & rapid prototyping.</li>
                                            <li>Smart home automation equipment.</li>
                                        </ol>
                                    </div>
                                )}

                                {/* Features */}
                                {(product.features && product.features.length > 0) && (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <Check className="text-emerald-400" size={18} /> Key Features:
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-2 pl-2 text-gray-300">
                                            {product.features.map((feat, idx) => (
                                                <li key={idx} className="leading-snug">{feat}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* Useful Link */}
                                {(product.useful_links && product.useful_links.length > 0) ? (
                                    <div className="space-y-2 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <ExternalLink className="text-sky-400" size={18} /> Useful Links:
                                        </h4>
                                        <div className="space-y-1.5 pl-2">
                                            {product.useful_links.map((link, idx) => (
                                                <a
                                                    key={idx}
                                                    href={typeof link === 'object' ? link.url : link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-violet-400 hover:text-violet-300 text-sm underline flex items-center gap-1.5 transition-colors"
                                                >
                                                    <span>{typeof link === 'object' ? (link.title || link.name || link.url) : link}</span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <ExternalLink className="text-sky-400" size={18} /> Useful Links:
                                        </h4>
                                        <a
                                            href={`https://docs.tronix365.in/${slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-violet-400 hover:text-violet-300 text-sm underline flex items-center gap-1.5 pl-2"
                                        >
                                            https://docs.tronix365.in/{slug} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}

                                {/* Package Includes */}
                                {(product.package_includes && product.package_includes.length > 0) ? (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <Truck className="text-amber-400" size={18} /> Package Includes:
                                        </h4>
                                        <div className="space-y-1.5 pl-2 text-gray-300 font-medium">
                                            {product.package_includes.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <Truck className="text-amber-400" size={18} /> Package Includes:
                                        </h4>
                                        <div className="space-y-1.5 pl-2 text-gray-300 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                <span>1x {product.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                <span>1x Quick Start Guide & Safety Manual</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: Specification Panel */}
                        {activeTab === 'specs' && (
                            <div>
                                {product.specs && Object.keys(product.specs).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        {Object.entries(product.specs).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between border-b border-white/10 py-3">
                                                <span className="text-gray-400 text-sm">{key}</span>
                                                <span className="text-white font-bold text-sm">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        <div className="flex items-center justify-between border-b border-white/10 py-3">
                                            <span className="text-gray-400 text-sm">Category</span>
                                            <span className="text-white font-bold text-sm">{product.category}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-white/10 py-3">
                                            <span className="text-gray-400 text-sm">SKU / Model</span>
                                            <span className="text-white font-bold text-sm font-mono">{product.skv || `TRX-${product.id}`}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-white/10 py-3">
                                            <span className="text-gray-400 text-sm">Stock Availability</span>
                                            <span className="text-emerald-400 font-bold text-sm">{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: Warranty Panel */}
                        {activeTab === 'warranty' && (
                            <div className="space-y-4 text-gray-300">
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <Shield className="text-violet-400 shrink-0" size={28} />
                                    <div>
                                        <h4 className="text-white font-bold text-base">Manufacturer Warranty Coverage</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {product.warranty_info || "Standard 6 Months Replacement Warranty against manufacturing defects"}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed pl-1">
                                    All products sold on Tronix365 undergo multi-stage QA testing before dispatch. Warranty covers component failures under normal operating parameters. Physical damage, burnt components due to improper wiring, or unauthorized modifications are excluded.
                                </p>
                            </div>
                        )}

                        {/* TAB 4: Reviews Panel */}
                        {activeTab === 'reviews' && (
                            <ReviewSection productId={product.id} onStatsChange={(newStats) => setReviewStats(newStats)} />
                        )}

                        {/* TAB 5: QnA Panel */}
                        {activeTab === 'qna' && (
                            <QnASection productId={product.id} />
                        )}

                        {/* TAB 6: Attachments Panel */}
                        {activeTab === 'attachments' && (
                            <div className="space-y-4">
                                {(product.attachments && product.attachments.length > 0) ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {product.attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={typeof att === 'object' ? att.url : att}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 flex items-center justify-between transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold">
                                                        <Download size={18} />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                                                            {typeof att === 'object' ? (att.name || att.title || 'PDF Attachment') : 'Download Datasheet PDF'}
                                                        </h5>
                                                        <span className="text-[10px] text-gray-400">PDF Technical Document</span>
                                                    </div>
                                                </div>
                                                <Download size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                                        <Download className="mx-auto text-violet-400" size={32} />
                                        <h4 className="text-sm font-bold text-white">Datasheet & Technical Documentation</h4>
                                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                                            Official PDF schematics, pinout diagrams, and software library code samples are available for instant download.
                                        </p>
                                        <a
                                            href={`https://docs.tronix365.in/datasheet-${product.id}.pdf`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-violet-500/20"
                                        >
                                            <Download size={14} /> Download Technical Datasheet (PDF)
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 7: Country Of Origin Panel */}
                        {activeTab === 'origin' && (
                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Country Of Origin</span>
                                    <h4 className="text-base font-extrabold text-white">
                                        {product.country_of_origin || "India (Designed & Assembled)"}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Complies with ISO 9001 quality standards and Indian RoHS electronics safety guidelines.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recommendations Section */}
                <RelatedProducts productId={product.id} category={product.category} />
            </div>

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                product={product}
            />

            {/* Tower Order Sourcing & Bulk Modal */}
            <TowerOrderModal
                isOpen={isTowerModalOpen}
                onClose={() => setIsTowerModalOpen(false)}
                product={product}
                initialQty={requestedTowerQty}
            />
        </div>
    );
};


export default ProductDetails;
