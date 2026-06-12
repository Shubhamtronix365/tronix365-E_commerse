import React from 'react';
import CategoryGrid from '../components/home/CategoryGrid';
import SEO from '../components/common/SEO';

const Categories = () => {
    return (
        <div className="min-h-screen pt-16">
            <SEO 
                title="Browse Components Categories" 
                description="Find the perfect microcontrollers, development boards, sensors, and robotics parts for your project categorized for easy browsing."
                keywords="electronics categories, sensors, microcontrollers, motors, batteries"
            />
            <div className="py-12 px-4 sm:px-6 lg:px-8 text-center bg-tronix-dark border-b border-white/5">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                    Explore Categories
                </h1>
                <p className="text-tronix-muted max-w-2xl mx-auto text-lg">
                    Find exactly what you need for your next project from our wide selection of components.
                </p>
            </div>

            {/* Re-using the grid component but ensuring it looks good on a standalone page */}
            <CategoryGrid />
        </div>
    );
};

export default Categories;
