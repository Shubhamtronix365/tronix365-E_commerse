import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Send, Mail, QrCode, ExternalLink, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';

const ShareModal = ({ isOpen, onClose, product }) => {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);

    if (!product) return null;

    // Generate clean canonical product URL
    const getProductUrl = () => {
        if (typeof window === 'undefined') return '';
        const origin = window.location.origin;
        const slug = slugify(product.title);
        // Retain router path prefix if present
        const pathPrefix = window.location.pathname.startsWith('/e-commerse') ? '/e-commerse' : '';
        return `${origin}${pathPrefix}/product/${slug}`;
    };

    const shareUrl = getProductUrl();

    const handleCopy = async (e) => {
        if (e) e.stopPropagation();
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Product link copied to clipboard!");
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            toast.success("Product link copied!");
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${product.title} | Tronix365`,
                    text: `Check out ${product.title} on Tronix365 for ₹${product.price}!`,
                    url: shareUrl
                });
                toast.success("Shared successfully!");
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Native share error:", err);
                }
            }
        } else {
            handleCopy();
        }
    };

    const textPayload = `Check out ${product.title} on Tronix365 (₹${product.price}): ${shareUrl}`;

    const socialChannels = [
        {
            name: 'WhatsApp',
            color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white',
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(textPayload)}`
        },
        {
            name: 'Telegram',
            color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500 hover:text-white',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out ${product.title} (₹${product.price}) on Tronix365!`)}`
        },
        {
            name: 'X (Twitter)',
            color: 'bg-gray-700/40 text-gray-200 border-white/20 hover:bg-white hover:text-black',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${product.title} on @Tronix365`)}&url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Facebook',
            color: 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Email',
            color: 'bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500 hover:text-white',
            url: `mailto:?subject=${encodeURIComponent(`Check out ${product.title} on Tronix365`)}&body=${encodeURIComponent(`Hey,\n\nI found this product on Tronix365:\n\n${product.title}\nPrice: ₹${product.price}\n\nCheck it out here: ${shareUrl}`)}`
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 text-white">
                    {/* Glassmorphic Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content Box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-lg max-h-[90vh] bg-gray-900 border border-violet-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl shadow-violet-500/20 z-10 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar my-auto"
                    >
                        {/* Background glow accent */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                                    <Share2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 leading-tight">
                                        Share Product
                                        <Sparkles size={14} className="text-violet-400 animate-pulse" />
                                    </h3>
                                    <p className="text-[11px] text-gray-400">Share this component with colleagues or clients</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Product Card Dossier Header */}
                        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                <img
                                    src={getImageUrl(product.image)}
                                    alt={product.title}
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">
                                    {product.category || 'Electronics'}
                                </span>
                                <h4 className="text-sm font-bold text-white truncate leading-snug">
                                    {product.title}
                                </h4>
                                <div className="text-emerald-400 font-extrabold text-xs mt-0.5">
                                    ₹{Number(product.price).toLocaleString()}
                                    {product.mrp && Number(product.mrp) > Number(product.price) && (
                                        <span className="text-gray-500 line-through text-[11px] ml-2">₹{product.mrp}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* One-Click Copy Input Bar */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                Shareable Link
                            </label>
                            <div className="flex items-center gap-2 bg-black/60 border border-white/20 rounded-2xl p-1.5 pl-3">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-transparent border-none text-xs text-violet-300 font-mono flex-1 focus:outline-none truncate"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                        copied
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                                    }`}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Social Share Buttons Grid */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Direct Share Channels
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {socialChannels.map((channel) => (
                                    <a
                                        key={channel.name}
                                        href={channel.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${channel.color}`}
                                    >
                                        <Send size={13} className="shrink-0" />
                                        <span>{channel.name}</span>
                                    </a>
                                ))}
                                {typeof navigator !== 'undefined' && navigator.share && (
                                    <button
                                        onClick={handleNativeShare}
                                        className="col-span-2 sm:col-span-1 px-3 py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={13} />
                                        <span>More Apps...</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* QR Code Toggle Section */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                            <button
                                onClick={() => setShowQr(!showQr)}
                                className="text-gray-400 hover:text-violet-400 font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <QrCode size={16} />
                                <span>{showQr ? 'Hide QR Code' : 'Show Shareable QR Code'}</span>
                            </button>
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 hover:underline"
                            >
                                Preview Link <ExternalLink size={12} />
                            </a>
                        </div>

                        {/* QR Code Display Card */}
                        <AnimatePresence>
                            {showQr && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center space-y-2"
                                >
                                    <div className="w-36 h-36 border-2 border-gray-900 rounded-xl p-2 bg-white flex items-center justify-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
                                            alt="Product QR Code"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-600 font-semibold text-center">Scan with mobile camera to view product</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
