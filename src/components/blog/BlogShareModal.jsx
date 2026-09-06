import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Send, Mail, QrCode, ExternalLink, Sparkles, BookOpen, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl, FALLBACK_BLOG_IMAGE } from '../../utils/imageUtils';

const BlogShareModal = ({ isOpen, onClose, post }) => {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);

    if (!post) return null;

    // Generate canonical blog post URL
    const getShareUrl = () => {
        if (typeof window === 'undefined') return '';
        const origin = window.location.origin;
        const pathPrefix = window.location.pathname.startsWith('/e-commerse') ? '/e-commerse' : '';
        return `${origin}${pathPrefix}/blog/${post.slug}`;
    };

    const shareUrl = getShareUrl();

    const handleCopy = async (e) => {
        if (e) e.stopPropagation();
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Article link copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            toast.success('Article link copied!');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${post.title} | Tronix365 Engineering Blog`,
                    text: post.summary || `Read "${post.title}" on Tronix365!`,
                    url: shareUrl,
                });
                toast.success('Shared successfully!');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Native share error:', err);
                }
            }
        } else {
            handleCopy();
        }
    };

    const textPayload = `Read "${post.title}" on Tronix365: ${shareUrl}`;

    const socialChannels = [
        {
            name: 'WhatsApp',
            color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white',
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(textPayload)}`,
        },
        {
            name: 'Telegram',
            color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500 hover:text-white',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out "${post.title}" on Tronix365!`)}`,
        },
        {
            name: 'X (Twitter)',
            color: 'bg-neutral-800 text-gray-200 border-white/20 hover:bg-white hover:text-black',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Read "${post.title}" on @Tronix365`)}&url=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: 'LinkedIn',
            color: 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: 'Facebook',
            color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600 hover:text-white',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: 'Email',
            color: 'bg-tronix-accent/20 text-tronix-accent border-tronix-accent/30 hover:bg-tronix-accent hover:text-white',
            url: `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`Hey,\n\nI thought you might like this engineering guide on Tronix365:\n\n${post.title}\n\nRead it here: ${shareUrl}`)}`,
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 text-white">
                    {/* Glassmorphic Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-lg max-h-[90vh] bg-neutral-900 border border-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 space-y-4 sm:space-y-5 overflow-y-auto my-auto"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-tronix-accent/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-tronix-accent/20 border border-tronix-accent/30 flex items-center justify-center text-tronix-accent shrink-0">
                                    <Share2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 leading-tight truncate">
                                        Share Engineering Guide
                                        <Sparkles size={14} className="text-tronix-accent animate-pulse shrink-0" />
                                    </h3>
                                    <p className="text-[11px] text-gray-400 truncate">
                                        Share with hardware engineers, colleagues, or students
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Article Card Dossier Header */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-16 h-16 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden shrink-0">
                                {post.cover_image ? (
                                    <img
                                        src={getImageUrl(post.cover_image)}
                                        alt={post.title}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        <BookOpen size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-tronix-accent uppercase tracking-wider block">
                                    {post.category || 'Tutorial'}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug">
                                    {post.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 flex-wrap">
                                    <span>{post.author_name || 'Tronix365'}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                        <Clock size={11} /> {post.reading_time_minutes || 5} min read
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Shareable Link Box */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                Canonical Article Link
                            </label>
                            <div className="flex items-center gap-2 bg-black/60 border border-white/20 rounded-xl p-1.5 pl-3">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-transparent border-none text-xs text-tronix-accent font-mono flex-1 focus:outline-none truncate select-all"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                                        copied
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-gradient-to-r from-tronix-accent to-emerald-500 hover:brightness-110 text-white shadow-lg shadow-tronix-accent/20'
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
                                Direct Social Channels
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {socialChannels.map((channel) => (
                                    <a
                                        key={channel.name}
                                        href={channel.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${channel.color}`}
                                    >
                                        <Send size={13} className="shrink-0" />
                                        <span>{channel.name}</span>
                                    </a>
                                ))}
                                {typeof navigator !== 'undefined' && navigator.share && (
                                    <button
                                        onClick={handleNativeShare}
                                        className="col-span-2 sm:col-span-1 px-3 py-2.5 rounded-xl border border-tronix-accent/40 bg-tronix-accent/10 text-tronix-accent hover:bg-tronix-accent hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
                                className="text-gray-400 hover:text-tronix-accent font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <QrCode size={15} />
                                <span>{showQr ? 'Hide QR Code' : 'Show Shareable QR Code'}</span>
                            </button>
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-tronix-accent hover:underline font-semibold flex items-center gap-1"
                            >
                                Preview Link <ExternalLink size={12} />
                            </a>
                        </div>

                        {/* QR Code Card */}
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
                                            alt="Article QR Code"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-600 font-semibold text-center">
                                        Scan with phone camera to open guide
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BlogShareModal;
