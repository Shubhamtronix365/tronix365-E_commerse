import React from 'react';

const Skeleton = ({ className, variant = 'rect' }) => {
    const baseClasses = "bg-white/5 animate-pulse";
    const variantClasses = {
        rect: "rounded-lg",
        circle: "rounded-full",
        text: "rounded h-4 w-3/4"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
    );
};

export default Skeleton;
