import React from 'react';
import Skeleton from '../common/Skeleton';

const ProductCardSkeleton = () => {
    return (
        <div className="bg-tronix-card border border-white/5 rounded-2xl overflow-hidden h-full flex flex-col p-4 space-y-4">
            {/* Image Placeholder */}
            <Skeleton className="h-48 w-full" />
            
            {/* Category Placeholder */}
            <Skeleton variant="text" className="w-1/3" />
            
            {/* Title Placeholder */}
            <div className="space-y-2">
                <Skeleton variant="text" className="w-full" />
                <Skeleton variant="text" className="w-1/2" />
            </div>
            
            {/* Bottom Section Placeholder */}
            <div className="mt-auto flex justify-between items-center pt-4">
                <Skeleton variant="rect" className="h-8 w-20" />
                <Skeleton variant="circle" className="h-8 w-8" />
            </div>
        </div>
    );
};

export default ProductCardSkeleton;
