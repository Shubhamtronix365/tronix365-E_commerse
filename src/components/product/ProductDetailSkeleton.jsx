import React from 'react';
import Skeleton from '../common/Skeleton';

const ProductDetailSkeleton = () => {
    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-28 lg:pb-12 px-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumbs Placeholder */}
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton variant="text" className="w-16 h-4" />
                    <span className="text-gray-600">/</span>
                    <Skeleton variant="text" className="w-24 h-4" />
                    <span className="text-gray-600">/</span>
                    <Skeleton variant="text" className="w-36 h-4" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
                    {/* Left Column: Product Image Gallery Skeleton */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-center h-[320px] sm:h-[450px] lg:h-[500px]">
                            <Skeleton className="w-3/4 h-3/4 rounded-2xl" />
                        </div>
                        {/* Thumbnail Strip */}
                        <div className="flex gap-3">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="w-16 h-16 rounded-xl" />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Product Info & Actions Skeleton */}
                    <div className="flex flex-col space-y-6">
                        {/* Category Chip */}
                        <Skeleton variant="text" className="w-24 h-5" />

                        {/* Title */}
                        <div className="space-y-2">
                            <Skeleton variant="text" className="w-full h-8" />
                            <Skeleton variant="text" className="w-2/3 h-8" />
                        </div>

                        {/* Rating & Reviews */}
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} variant="circle" className="w-4 h-4" />
                                ))}
                            </div>
                            <Skeleton variant="text" className="w-20 h-4" />
                        </div>

                        {/* Price & Stock status */}
                        <div className="flex items-baseline gap-4 py-2 border-y border-white/5">
                            <Skeleton variant="rect" className="w-32 h-10 rounded-lg" />
                            <Skeleton variant="rect" className="w-20 h-6 rounded-lg" />
                        </div>

                        {/* Quantity & Add to Cart Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <Skeleton variant="rect" className="w-32 h-12 rounded-xl" />
                            <Skeleton variant="rect" className="flex-1 h-12 rounded-xl" />
                            <Skeleton variant="rect" className="w-12 h-12 rounded-xl" />
                        </div>

                        {/* Feature Badges */}
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                    <Skeleton variant="circle" className="w-6 h-6 shrink-0" />
                                    <Skeleton variant="text" className="w-24 h-4" />
                                </div>
                            ))}
                        </div>

                        {/* Description / Tabs Preview */}
                        <div className="space-y-3 pt-4">
                            <Skeleton variant="text" className="w-full h-4" />
                            <Skeleton variant="text" className="w-5/6 h-4" />
                            <Skeleton variant="text" className="w-3/4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailSkeleton;
