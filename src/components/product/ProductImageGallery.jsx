import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';
import Image from '../common/Image';

const ProductImageGallery = ({ product }) => {
    // Collect all valid images with backward compatibility
    const rawImages = Array.isArray(product?.images) && product.images.length > 0
        ? product.images
        : (product?.image ? [product.image] : []);
    const images = rawImages.filter(img => typeof img === 'string' && img.trim().length > 0);

    // Fallback if no images are available
    const displayImages = images.length > 0
        ? images
        : ['https://placehold.co/600x600/1e293b/94a3b8?text=Tronix365'];

    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxZoom, setLightboxZoom] = useState(1);

    const mainImageRef = useRef(null);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);

    // Reset index if product changes
    useEffect(() => {
        setActiveIndex(0);
    }, [product?.id]);

    // Handle desktop hover zoom coordinates
    const handleMouseMove = (e) => {
        if (!mainImageRef.current) return;
        const rect = mainImageRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setZoomPos({ x, y });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    // Navigation handlers
    const handlePrev = useCallback(() => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
    }, [displayImages.length]);

    const handleNext = useCallback(() => {
        setActiveIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
    }, [displayImages.length]);

    // Mobile touch swipe handling
    const handleTouchStart = (e) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diffX = touchStartX.current - touchEndX.current;
        if (Math.abs(diffX) > 40) {
            if (diffX > 0) {
                handleNext();
            } else {
                handlePrev();
            }
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Keyboard navigation when Lightbox is active
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setLightboxOpen(false);
                setLightboxZoom(1);
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, handlePrev, handleNext]);

    const activeImageUrl = getImageUrl(displayImages[activeIndex]);
    const hasMultiple = displayImages.length > 1;

    return (
        <div className="w-full flex flex-col-reverse lg:flex-row gap-3 sm:gap-4 items-start select-none">
            {/* Desktop Vertical Thumbnail Rail (Amazon / Myntra style) */}
            {hasMultiple && (
                <div className="hidden lg:flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1.5 py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {displayImages.map((img, idx) => {
                        const thumbUrl = getImageUrl(img);
                        const isActive = idx === activeIndex;
                        return (
                            <button
                                key={`thumb-desktop-${idx}`}
                                type="button"
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => setActiveIndex(idx)}
                                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 flex items-center justify-center transition-all duration-200 border-2 overflow-hidden flex-shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'border-violet-500 shadow-lg shadow-violet-500/25 ring-2 ring-violet-500/20 scale-[1.03]'
                                        : 'border-white/10 hover:border-violet-400/50 opacity-70 hover:opacity-100 hover:scale-[1.02]'
                                }`}
                                aria-label={`View product image ${idx + 1}`}
                            >
                                <img
                                    src={thumbUrl}
                                    alt={`${product?.title || 'Product'} thumbnail ${idx + 1}`}
                                    className="w-full h-full object-contain mix-blend-multiply"
                                    loading="lazy"
                                />
                                {isActive && (
                                    <div className="absolute inset-0 bg-violet-600/5 pointer-events-none" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Main Stage & Mobile View */}
            <div className="flex-1 w-full flex flex-col gap-3">
                <div
                    ref={mainImageRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-full bg-white rounded-3xl p-4 sm:p-8 flex items-center justify-center h-[290px] xs:h-[350px] sm:h-[450px] lg:h-[500px] shadow-2xl shadow-violet-500/10 border border-white/20 overflow-hidden cursor-crosshair group"
                >
                    {/* Active Image with smooth cross-fade */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0.3, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0.2, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full flex items-center justify-center pointer-events-none"
                            style={{
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transform: isHovering ? 'scale(2.1)' : 'scale(1)',
                                transition: isHovering ? 'transform 0.08s ease-out' : 'transform 0.3s ease-out',
                            }}
                        >
                            <Image
                                src={activeImageUrl}
                                alt={`${product?.title || 'Product'} - View ${activeIndex + 1}`}
                                title={product?.title}
                                width={700}
                                height={700}
                                loading="eager"
                                fetchPriority="high"
                                decoding="sync"
                                className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-xl"
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Lens Zoom Badge Indicator (Desktop on Hover) */}
                    {isHovering && (
                        <div className="hidden lg:flex absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full items-center gap-1.5 shadow-md pointer-events-none z-10 border border-white/10">
                            <ZoomIn size={12} className="text-violet-400" />
                            <span>2.1x Lens Zoom Active</span>
                        </div>
                    )}

                    {/* Image Counter Badge */}
                    {hasMultiple && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/15 z-10 flex items-center gap-1 shadow-sm">
                            <span className="text-violet-300">{activeIndex + 1}</span>
                            <span className="text-gray-400">/</span>
                            <span>{displayImages.length}</span>
                        </div>
                    )}

                    {/* Fullscreen Lightbox Trigger Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setLightboxOpen(true);
                            setLightboxZoom(1);
                        }}
                        className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-violet-600 text-white backdrop-blur-md border border-white/15 transition-all duration-200 z-10 shadow-md hover:scale-110 cursor-pointer"
                        title="Click to view full screen high resolution"
                        aria-label="Enlarge product image"
                    >
                        <Maximize2 size={16} />
                    </button>

                    {/* Desktop / Tablet Hover Navigation Arrows */}
                    {hasMultiple && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrev();
                                }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg hover:scale-110 cursor-pointer"
                                aria-label="Previous image"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg hover:scale-110 cursor-pointer"
                                aria-label="Next image"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile & Tablet Horizontal Thumbnails Rail */}
                {hasMultiple && (
                    <div className="flex lg:hidden overflow-x-auto gap-2.5 py-1.5 px-0.5 scrollbar-none w-full">
                        {displayImages.map((img, idx) => {
                            const thumbUrl = getImageUrl(img);
                            const isActive = idx === activeIndex;
                            return (
                                <button
                                    key={`thumb-mobile-${idx}`}
                                    type="button"
                                    onClick={() => setActiveIndex(idx)}
                                    className={`relative w-16 h-16 xs:w-18 xs:h-18 rounded-2xl bg-white p-1.5 flex items-center justify-center transition-all duration-200 border-2 overflow-hidden flex-shrink-0 cursor-pointer ${
                                        isActive
                                            ? 'border-violet-500 shadow-md shadow-violet-500/25 ring-2 ring-violet-500/20 scale-[1.02]'
                                            : 'border-white/10 opacity-60 hover:opacity-100'
                                    }`}
                                    aria-label={`Select product image ${idx + 1}`}
                                >
                                    <img
                                        src={thumbUrl}
                                        alt={`${product?.title || 'Product'} thumbnail ${idx + 1}`}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                        loading="lazy"
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* High-Resolution Fullscreen Lightbox Modal */}
            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
                    >
                        {/* Lightbox Header */}
                        <div className="flex items-center justify-between text-white border-b border-white/10 pb-3 z-20">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-sm sm:text-base text-gray-200 line-clamp-1 max-w-[200px] sm:max-w-md">
                                    {product?.title}
                                </span>
                                {hasMultiple && (
                                    <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-violet-300 font-medium">
                                        {activeIndex + 1} of {displayImages.length}
                                    </span>
                                )}
                            </div>

                            {/* Lightbox Zoom & Close Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.5))}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLightboxZoom((z) => Math.max(1, z - 0.5))}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                {lightboxZoom > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setLightboxZoom(1)}
                                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        title="Reset Zoom"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLightboxOpen(false);
                                        setLightboxZoom(1);
                                    }}
                                    className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors ml-2"
                                    title="Close Lightbox (Esc)"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Lightbox Center Stage */}
                        <div className="relative flex-1 flex items-center justify-center overflow-hidden my-3">
                            {hasMultiple && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="absolute left-2 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-20"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft size={28} />
                                </button>
                            )}

                            <motion.div
                                key={`lightbox-${activeIndex}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: lightboxZoom }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-[85vw] max-h-[70vh] flex items-center justify-center p-4 bg-white/5 rounded-3xl"
                            >
                                <img
                                    src={activeImageUrl}
                                    alt={`${product?.title || 'Product'} full view ${activeIndex + 1}`}
                                    className="max-h-[65vh] max-w-full object-contain rounded-2xl"
                                />
                            </motion.div>

                            {hasMultiple && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="absolute right-2 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-20"
                                    aria-label="Next image"
                                >
                                    <ChevronRight size={28} />
                                </button>
                            )}
                        </div>

                        {/* Lightbox Bottom Thumbnails Rail */}
                        {hasMultiple && (
                            <div className="flex justify-center items-center gap-2 overflow-x-auto py-2 z-20">
                                {displayImages.map((img, idx) => {
                                    const thumbUrl = getImageUrl(img);
                                    const isActive = idx === activeIndex;
                                    return (
                                        <button
                                            key={`lightbox-thumb-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                setActiveIndex(idx);
                                                setLightboxZoom(1);
                                            }}
                                            className={`w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center border-2 transition-all cursor-pointer ${
                                                isActive
                                                    ? 'border-violet-500 scale-105 ring-2 ring-violet-500/40'
                                                    : 'border-white/20 opacity-50 hover:opacity-100'
                                            }`}
                                        >
                                            <img
                                                src={thumbUrl}
                                                alt={`Thumbnail ${idx + 1}`}
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductImageGallery;
