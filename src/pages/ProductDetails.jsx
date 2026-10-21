import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, X as XIcon, ArrowLeft, ArrowRight, Star, ShieldCheck, Truck, Heart, Share2, FileText, Globe, Download, ExternalLink, Shield, HelpCircle, PackageCheck, Tag, Factory, Clock, Split, Zap, Copy } from 'lucide-react';
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
import ProductFaqSchema from '../components/common/ProductFaqSchema';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Image from '../components/common/Image';
import ShareModal from '../components/common/ShareModal';
import VariantSelector from '../components/product/VariantSelector';
import TowerOrderModal from '../components/towerOrder/TowerOrderModal';
import ProductDetailSkeleton from '../components/product/ProductDetailSkeleton';
import EstimatedDelivery from '../components/product/EstimatedDelivery';
import { slugify } from '../utils/slugify';
import { formatPrice } from '../utils/priceUtils';

const parseFeature = (feat) => {
    if (!feat) return null;
    if (typeof feat === 'object') {
        const entries = Object.entries(feat);
        if (entries.length > 0) {
            const [k, v] = entries[0];
            if (!v || v === '""') return null;
            return { key: k.trim(), value: String(v).trim() };
        }
    }
    let str = String(feat).trim();
    // Strip curly braces and extraneous quotes
    str = str.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    str = str.replace(/^"+/, '').replace(/"+$/, '').trim();
    
    // Fix common unicode mojibake
    str = str.replace(/Â°/g, '°')
             .replace(/Â±/g, '±')
             .replace(/Âµ/g, 'µ')
             .replace(/â€“/g, '–')
             .replace(/â€”/g, '—');

    if (!str) return null;

    // Check if it's "Key": "Value" or Key: Value
    const kvMatch = str.match(/^["']?([^"':]+)["']?\s*:\s*["']?(.*?)["']?$/);
    if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim().replace(/^"+/, '').replace(/"+$/, '').replace(/\}$/, '').trim();
        if (!value || value === '""') return null;
        return { key, value };
    }

    return { key: null, value: str };
};

const parseProductSpecs = (specs, product) => {
    let rawObj = specs;

    // 1. If specs is a string, attempt JSON parse or regex matching
    if (typeof rawObj === 'string') {
        const cleanStr = rawObj.trim().replace(/\.$/, '');
        try {
            rawObj = JSON.parse(cleanStr);
        } catch {
            const matches = [...cleanStr.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)];
            if (matches.length > 0) {
                return matches.map(m => [
                    m[1].replace(/^[{"'\s]+|[}"'\s:]+$/g, '').trim(),
                    m[2].replace(/^[{"'\s]+|[}"'\s,.]+$/g, '').trim()
                ]).filter(([k, v]) => k && v);
            }
        }
    }

    // 2. If object with 1 key that holds a smashed JSON string (e.g. '{"Part Number": ...}')
    if (rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj)) {
        const keys = Object.keys(rawObj);
        if (keys.length === 1) {
            const onlyKey = keys[0];
            const onlyVal = rawObj[onlyKey];
            if (onlyKey.includes('{') || String(onlyVal).includes('}') || String(onlyVal).includes(':')) {
                let fullStr = `${onlyKey}: ${onlyVal}`.trim().replace(/\.$/, '');
                if (fullStr.includes('}{')) {
                    fullStr = fullStr.split('}{')[0];
                }
                if (!fullStr.startsWith('{')) fullStr = '{' + fullStr;
                if (!fullStr.endsWith('}')) fullStr = fullStr + '}';
                try {
                    rawObj = JSON.parse(fullStr);
                } catch {
                    const matches = [...fullStr.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)];
                    if (matches.length > 0) {
                        return matches.map(m => [
                            m[1].replace(/^[{"'\s]+|[}"'\s:]+$/g, '').trim(),
                            m[2].replace(/^[{"'\s]+|[}"'\s,.]+$/g, '').trim()
                        ]).filter(([k, v]) => k && v);
                    }
                }
            }
        }
    }

    // 3. If array of items: [{ key, value }] or ["Key: Value"]
    if (Array.isArray(rawObj)) {
        const result = [];
        for (const item of rawObj) {
            if (Array.isArray(item) && item.length >= 2) {
                result.push([String(item[0]).trim(), String(item[1]).trim()]);
            } else if (item && typeof item === 'object') {
                const k = item.key || item.name || Object.keys(item)[0];
                const v = item.value || item.val || item[k];
                if (k && v) result.push([String(k).trim(), String(v).trim()]);
            } else if (typeof item === 'string') {
                const colonIdx = item.indexOf(':');
                if (colonIdx > 0) {
                    result.push([item.slice(0, colonIdx).trim(), item.slice(colonIdx + 1).trim()]);
                }
            }
        }
        if (result.length > 0) return result;
    }

    // 4. Normal object: clean up any residual quotes or curly braces from keys/values
    if (rawObj && typeof rawObj === 'object' && Object.keys(rawObj).length > 0) {
        const entries = Object.entries(rawObj)
            .map(([k, v]) => {
                const cleanKey = String(k)
                    .replace(/^[{"'\s]+|[}"'\s:]+$/g, '')
                    .replace(/Â°/g, '°')
                    .replace(/â€“/g, '–')
                    .trim();
                const cleanVal = String(v)
                    .replace(/^[{"'\s]+|[}"'\s,.]+$/g, '')
                    .replace(/Â°/g, '°')
                    .replace(/â€“/g, '–')
                    .trim();
                return [cleanKey, cleanVal];
            })
            .filter(([k, v]) => k && v);

        if (entries.length > 0) return entries;
    }

    // 5. Fallback rich technical specification table (so EVERY product has a pristine table)
    const fallback = [];
    if (product?.title) fallback.push(['Product Name', product.title]);
    if (product?.category) fallback.push(['Category', product.category]);
    if (product?.sku || product?.skv) fallback.push(['SKU / Part Number', product.sku || product.skv || `TRX-${product.id}`]);
    fallback.push(['Condition', '100% Brand New Genuine Component']);
    fallback.push(['Stock Availability', (product?.stock || 0) > 0 ? `${product.stock} Units In Stock` : 'Out of Stock']);
    if (product?.weight) fallback.push(['Approximate Weight', `${product.weight * 1000}g`]);
    if (product?.warranty_info) fallback.push(['Warranty', product.warranty_info]);
    if (product?.country_of_origin) fallback.push(['Country of Origin', product.country_of_origin]);
    fallback.push(['Procurement Mode', product?.tower_order_only ? 'Factory Tower Order' : 'Standard Delivery Stock']);
    return fallback;
};

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
    const [copiedSku, setCopiedSku] = useState(false);

    const handleCopySku = (e) => {
        if (e) e.preventDefault();
        const skuCode = product?.sku || product?.skv;
        if (!skuCode) return;
        navigator.clipboard.writeText(skuCode);
        setCopiedSku(true);
        toast.success(`Copied SKU: ${skuCode}`, { duration: 2000 });
        setTimeout(() => setCopiedSku(false), 2000);
    };


    useEffect(() => {
        const fetchProductData = async () => {
            try {
                const isId = /^\d+$/.test(slug);
                const endpoint = isId ? `/products/${slug}` : `/products/slug/${slug}`;
                let prodRes;
                try {
                    prodRes = await client.get(endpoint);
                } catch (err) {
                    if (!isId) {
                        try {
                            const cleanSlug = slug.replace(/-amp-/g, '-').replace(/-and-/g, '-');
                            prodRes = await client.get(`/products/slug/${cleanSlug}`);
                        } catch (err2) {
                            // Fallback to fuzzy search matching product words
                            const searchWords = slug.replace(/[-_]+/g, ' ').replace(/\b(and|amp|for|the|with)\b/gi, '').trim();
                            if (searchWords) {
                                const searchRes = await client.get(`/products/search?q=${encodeURIComponent(searchWords)}`);
                                if (searchRes.data && searchRes.data.length > 0) {
                                    prodRes = { data: searchRes.data[0] };
                                } else {
                                    throw err2;
                                }
                            } else {
                                throw err2;
                            }
                        }
                    } else {
                        throw err;
                    }
                }
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
                    const targetSlug = slug.toLowerCase().replace(/_/g, '-').replace(/-amp-/g, '-').replace(/-and-/g, '-');
                    found = mockProducts.find(p => {
                        const pSlug = slugify(p.title);
                        const cleanPSlug = pSlug.replace(/-amp-/g, '-').replace(/-and-/g, '-');
                        return pSlug === slug || pSlug.replace(/_/g, '-') === targetSlug || cleanPSlug === targetSlug || (p.skv && p.skv.toLowerCase() === slug.toLowerCase());
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

    // Reopen Tower Order Modal if user just returned from logging in with a saved draft
    useEffect(() => {
        try {
            const draft = sessionStorage.getItem('tronix_tower_order_draft');
            const token = localStorage.getItem('tronix_token');
            if (draft && token) {
                const parsed = JSON.parse(draft);
                if (!parsed.product_id || (product && parsed.product_id === product.id)) {
                    setIsTowerModalOpen(true);
                }
            }
        } catch (e) {}
    }, [product]);

    // Automatically normalize URL to canonical slug if accessed via ID or mismatch
    useEffect(() => {
        if (product && product.title) {
            const canonicalSlug = slugify(product.title);
            if (slug !== canonicalSlug) {
                navigate(`/product/${canonicalSlug}`, { replace: true });
            }
        }
    }, [product, slug, navigate]);

    if (loading) {
        return <ProductDetailSkeleton />;
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
        if (product.stock === 0) {
            toast.error('This product is currently out of stock');
            return;
        }
        const safeQty = Math.max(1, parseInt(quantity, 10) || 1);
        if (String(quantity) !== String(safeQty)) {
            setQuantity(safeQty);
        }
        const success = addToCart(product, safeQty);
        if (success) {
            animateToCart(e.currentTarget.getBoundingClientRect());
        }
    };

    const isPlaceholderImage = (img) => {
        return !img || img.includes('placehold.co') || img.includes('No+Image') || img.includes('No Image');
    };
    const realProductImage = isPlaceholderImage(product.image) ? null : getImageUrl(product.image);

    const canonicalProductSlug = product?.title ? slugify(product.title) : slug;
    const canonicalProductUrl = `https://www.tronix365.in/e-commerse/product/${canonicalProductSlug}`;

    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-28 lg:pb-12 px-3 sm:px-6 lg:px-8">
            <SEO
                title={`${product.title} | Buy Online at Best Price India`}
                description={product.description || `Buy ${product.title} online at Tronix365. Genuine ${product.category} component with fast delivery across India. Best price for ${product.title}.`}
                keywords={`${product.title}, buy ${product.title} India, ${product.category} online, electronic components, ${product.skv || product.title}, Tronix365`}
                image={realProductImage}
                url={canonicalProductUrl}
                type="product"
            />
            <ProductSchema
                name={product.title}
                description={product.description}
                image={realProductImage}
                price={product.price}
                sku={product.sku || product.skv}
                category={product.category}
                inStock={product.stock > 0}
                url={canonicalProductUrl}
                ratingValue={reviewStats.average}
                reviewCount={reviewStats.count}
                productId={product.id}
            />
            <ProductFaqSchema product={product} />
            <div className="max-w-7xl mx-auto">
                <Breadcrumbs category={product.category} productName={product.title} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
                    {/* Image Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-3xl p-4 sm:p-8 flex items-center justify-center h-[280px] xs:h-[340px] sm:h-[450px] lg:h-[500px] shadow-2xl shadow-violet-500/10 border border-white/20 overflow-hidden"
                    >
                        <Image
                            src={getImageUrl(product.image)}
                            alt={product.title}
                            title={product.title}
                            width={600}
                            height={600}
                            loading="eager"
                            fetchPriority="high"
                            decoding="sync"
                            className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-xl"
                        />
                    </motion.div>

                    {/* Product Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="text-tronix-primary font-medium tracking-wide uppercase text-sm">
                                {product.category}
                            </div>
                            {(product.sku || product.skv) && (
                                <button
                                    type="button"
                                    onClick={handleCopySku}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer group/sku shadow-sm"
                                    title="Click to copy SKU / Part Number"
                                >
                                    <Tag size={13} className="text-violet-400" />
                                    <span className="text-gray-400 font-sans text-[11px] font-medium">SKU:</span>
                                    <span className="text-violet-200 font-bold">{product.sku || product.skv}</span>
                                    {copiedSku ? (
                                        <Check size={12} className="text-emerald-400 ml-0.5" />
                                    ) : (
                                        <Copy size={12} className="opacity-50 group-hover/sku:opacity-100 transition-opacity ml-0.5" />
                                    )}
                                </button>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-4 break-words">
                            {product.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
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
                                    ₹{formatPrice(product.price)}
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
                                        setRequestedTowerQty(Math.max(1, parseInt(quantity, 10) || 1));
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
                                {(parseInt(quantity, 10) || 1) > (product.stock || 0) && (product.stock || 0) > 0 && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Split size={16} className="text-amber-400 flex-shrink-0" />
                                            <span>Only <strong>{product.stock} units</strong> in warehouse stock for immediate dispatch.</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setRequestedTowerQty(Math.max(1, parseInt(quantity, 10) || 1));
                                                setIsTowerModalOpen(true);
                                            }}
                                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex-shrink-0 transition-colors"
                                        >
                                            Split / Tower Order
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Controls & Utilities Row */}
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 select-none">Qty:</span>
                                            <div className="flex items-center bg-white/[0.04] sm:bg-white/5 border border-white/10 rounded-xl p-0.5 sm:p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(quantity, 10) || 1;
                                                        if (current > 1) {
                                                            setQuantity(current - 1);
                                                        }
                                                    }}
                                                    disabled={product.stock === 0 || (parseInt(quantity, 10) || 1) <= 1}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] rounded-lg bg-white/5 flex items-center justify-center font-bold text-base transition-all active:scale-90 ${
                                                        product.stock === 0 || (parseInt(quantity, 10) || 1) <= 1
                                                            ? 'text-gray-600 cursor-not-allowed opacity-50'
                                                            : 'text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20'
                                                    }`}
                                                    aria-label="Decrease quantity"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={quantity}
                                                    disabled={product.stock === 0}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            setQuantity('');
                                                            return;
                                                        }
                                                        if (!/^\d+$/.test(val)) return;

                                                        const normalized = val.length > 1 && val.startsWith('0')
                                                            ? String(parseInt(val, 10))
                                                            : val;

                                                        const parsed = parseInt(normalized, 10);
                                                        if (isNaN(parsed)) return;

                                                        const maxStock = product.stock || 0;
                                                        if (maxStock > 0 && parsed > maxStock) {
                                                            toast.error(`Only ${maxStock} items available in stock. For bulk orders, use Tower Order below!`, { id: 'pd-stock-limit' });
                                                            setQuantity(maxStock);
                                                        } else {
                                                            setQuantity(normalized);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const maxStock = product.stock || 0;
                                                        const parsed = parseInt(quantity, 10);
                                                        if (!quantity || isNaN(parsed) || parsed < 1) {
                                                            setQuantity(1);
                                                        } else if (maxStock > 0 && parsed > maxStock) {
                                                            toast.error(`Only ${maxStock} items available in stock.`, { id: 'pd-stock-limit' });
                                                            setQuantity(maxStock);
                                                        } else {
                                                            setQuantity(parsed);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="w-14 sm:w-16 py-1 sm:py-1.5 text-center text-white font-bold text-base bg-transparent border-x border-white/10 focus:outline-none focus:bg-white/5"
                                                    aria-label="Quantity"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(quantity, 10) || 0;
                                                        const maxStock = product.stock || 0;
                                                        if (maxStock > 0 && current >= maxStock) {
                                                            toast.error(`Only ${maxStock} items available in stock`, { id: 'pd-stock-limit' });
                                                        } else {
                                                            setQuantity(current + 1);
                                                        }
                                                    }}
                                                    disabled={product.stock === 0 || (product.stock > 0 && (parseInt(quantity, 10) || 1) >= product.stock)}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] rounded-lg bg-white/5 flex items-center justify-center font-bold text-base transition-all active:scale-90 ${
                                                        product.stock === 0 || (product.stock > 0 && (parseInt(quantity, 10) || 1) >= product.stock)
                                                            ? 'text-gray-600 cursor-not-allowed opacity-50'
                                                            : 'text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20'
                                                    }`}
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Wishlist & Share Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    toggleWishlist(product);
                                                    if (isInWishlist(product.id)) {
                                                        toast.error('Removed from Wishlist');
                                                    } else {
                                                        toast.success('Added to Wishlist');
                                                    }
                                                }}
                                                className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                                                    isInWishlist(product.id)
                                                        ? 'bg-red-500/10 border-red-500 text-red-500 shadow-sm shadow-red-500/20'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'
                                                }`}
                                                title={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                                aria-label={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                            >
                                                <Heart size={20} className="sm:w-[22px] sm:h-[22px]" fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsShareOpen(true)}
                                                className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-xl border border-white/10 bg-white/5 hover:bg-violet-600/30 hover:border-violet-500/50 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                                                title="Share Product"
                                                aria-label="Share Product"
                                            >
                                                <Share2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Primary CTA Action Buttons (Dual Column on Desktop/Tablet, Clean Responsive Stack/Grid on Mobile) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={product.stock === 0}
                                            className={`w-full min-h-[48px] sm:min-h-[50px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                                                product.stock > 0
                                                    ? 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20 active:bg-violet-700'
                                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                                            }`}
                                        >
                                            <ShoppingCart size={19} />
                                            <span>{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (product.stock === 0) {
                                                    toast.error('This product is currently out of stock');
                                                    return;
                                                }
                                                const currentQty = Math.max(1, parseInt(quantity, 10) || 1);
                                                if (String(quantity) !== String(currentQty)) {
                                                    setQuantity(currentQty);
                                                }
                                                const success = addToCart(product, currentQty);
                                                if (success) {
                                                    navigate('/cart');
                                                }
                                            }}
                                            disabled={product.stock === 0}
                                            className={`w-full min-h-[48px] sm:min-h-[50px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                                                product.stock > 0
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:bg-emerald-700'
                                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                                            }`}
                                        >
                                            <Zap size={19} className="fill-current" />
                                            <span>{product.stock > 0 ? 'Buy Now • Checkout' : 'Out of Stock'}</span>
                                        </button>
                                    </div>
                                </div>

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
                                                setRequestedTowerQty((parseInt(quantity, 10) || 1) > (product.stock || 0) ? (parseInt(quantity, 10) || 1) : Math.max(10, (product.stock || 0) * 2));
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

                        {/* Pincode Delivery Estimator */}
                        <EstimatedDelivery />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 border border-white/5 rounded-xl bg-white/5">
                                <Truck className="text-tronix-accent" size={24} />
                                <div>
                                    <div className="text-white font-medium text-sm">Fast Delivery</div>
                                    <div className="text-gray-400 text-xs">Next Day Delivery in Pune</div>
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
                                                    <span className="text-xs text-gray-500 line-through block">₹{formatPrice(bundle.original_price)}</span>
                                                    <span className="text-lg font-bold text-tronix-accent">₹{formatPrice(bundle.bundle_price)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex -space-x-3 overflow-hidden">
                                                    {bundle.products.map(bp => (
                                                        <div key={bp.id || bp.product_id} className="inline-block h-8 w-8 rounded-full ring-2 ring-tronix-card bg-white p-1" title={bp.product?.title}>
                                                            <img src={getImageUrl(bp.product?.image)} alt={bp.product?.title || 'Bundle item'} width={32} height={32} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => addBundle(bundle.id)}
                                                    className="bg-tronix-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-violet-600 transition-colors"
                                                >
                                                    Add Deal
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
                    <div className="bg-tronix-card/40 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/10 shadow-2xl overflow-hidden">
                        {/* TAB 1: Description Panel */}
                        {activeTab === 'description' && (() => {
                            // Clean and normalize features
                            const rawFeatures = product.features || [];
                            const cleanFeatures = (Array.isArray(rawFeatures) ? rawFeatures : [rawFeatures])
                                .map(feat => parseFeature(feat))
                                .filter(Boolean);

                            // Clean Package Includes (Filter out any Safety Manual or Start Guide)
                            const rawIncludes = (product.package_includes && product.package_includes.length > 0)
                                ? product.package_includes
                                : [`1x ${product.title}`];
                            const filteredIncludes = rawIncludes.filter(item => {
                                const lower = String(item).toLowerCase();
                                return !lower.includes('quick start') && !lower.includes('safety manual') && !lower.includes('start guide') && !lower.includes('manual');
                            });
                            const finalPackageIncludes = filteredIncludes.length > 0 ? filteredIncludes : [`1x ${product.title}`];

                            return (
                                <div className="space-y-8 text-gray-300 leading-relaxed text-sm">
                                    {/* Main Description Intro Paragraph */}
                                    {product.description && (
                                        <div>
                                            <p className="text-gray-200 text-sm sm:text-base leading-relaxed">
                                                {product.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* 1. KEY FEATURES FIRST */}
                                    {cleanFeatures.length > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-white/10">
                                            <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                                <Check className="text-emerald-400" size={18} /> Key Features:
                                            </h4>
                                            <ol className="list-decimal list-inside space-y-2 pl-2 text-gray-300">
                                                {cleanFeatures.map((feat, idx) => (
                                                    <li key={idx} className="leading-snug">
                                                        {feat.key ? (
                                                            <span>
                                                                <strong className="text-white font-semibold">{feat.key}:</strong>{' '}
                                                                <span>{feat.value}</span>
                                                            </span>
                                                        ) : (
                                                            <span>{feat.value}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                    {/* 2. PACKAGE INCLUDES (NO SAFETY MANUAL) */}
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                                            <Truck className="text-amber-400" size={18} /> Package Includes:
                                        </h4>
                                        <div className="space-y-1.5 pl-2 text-gray-300 font-medium">
                                            {finalPackageIncludes.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* TAB 2: Specification Panel (TABLE FORMAT) */}
                        {activeTab === 'specs' && (() => {
                            const specsList = parseProductSpecs(product.specs, product);

                            return (
                                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/10 bg-white/5 text-gray-300 text-xs uppercase tracking-wider">
                                                    <th scope="col" className="px-5 sm:px-6 py-3.5 font-bold w-1/3 sm:w-1/4">Specification</th>
                                                    <th scope="col" className="px-5 sm:px-6 py-3.5 font-bold">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {specsList.map(([key, value], idx) => (
                                                    <tr 
                                                        key={idx} 
                                                        className={`transition-colors hover:bg-white/[0.04] ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}
                                                    >
                                                        <td className="px-5 sm:px-6 py-3.5 text-gray-400 font-medium text-xs sm:text-sm border-r border-white/5 whitespace-nowrap sm:whitespace-normal">
                                                            {key}
                                                        </td>
                                                        <td className="px-5 sm:px-6 py-3.5 text-white font-semibold text-xs sm:text-sm">
                                                            {String(value)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

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

            {/* Mobile Sticky Action Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 shadow-2xl safe-area-bottom">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Price</span>
                        <div className="text-xl font-black text-white leading-tight">₹{formatPrice(product.price)}</div>
                        {product.stock > 0 && !product.tower_order_only ? (
                            <span className="text-[10px] text-emerald-400 font-medium">In Stock</span>
                        ) : product.tower_order_only ? (
                            <span className="text-[10px] text-amber-400 font-medium">Tower Order</span>
                        ) : (
                            <span className="text-[10px] text-red-400 font-medium">Out of Stock</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        {product.tower_order_only ? (
                            <button
                                onClick={() => {
                                    setRequestedTowerQty(Math.max(1, parseInt(quantity, 10) || 1));
                                    setIsTowerModalOpen(true);
                                }}
                                className="w-full min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                            >
                                <Factory size={16} />
                                <span>Tower Order</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={product.stock === 0}
                                    className={`min-h-[44px] py-2.5 px-3.5 rounded-xl border border-white/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                        product.stock > 0
                                            ? 'bg-white/10 text-white hover:bg-white/15'
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                    aria-label="Add to cart"
                                >
                                    <ShoppingCart size={16} />
                                    <span>Add{quantity && Number(quantity) > 1 ? ` (${quantity})` : ''}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        if (product.stock === 0) {
                                            toast.error('This product is currently out of stock');
                                            return;
                                        }
                                        const currentQty = Math.max(1, parseInt(quantity, 10) || 1);
                                        if (String(quantity) !== String(currentQty)) {
                                            setQuantity(currentQty);
                                        }
                                        const success = addToCart(product, currentQty);
                                        if (success) {
                                            navigate('/cart');
                                        }
                                    }}
                                    disabled={product.stock === 0}
                                    className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                                        product.stock > 0
                                            ? 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/25'
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    <Zap size={15} className="fill-current" />
                                    <span>{product.stock > 0 ? 'Buy Now' : 'Out of Stock'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
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
