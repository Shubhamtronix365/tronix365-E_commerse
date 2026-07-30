import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { ICON_MAP } from '../admin/CategoryTable';

const CategoryGrid = () => {
    const { categories, loading } = useCategories();

    if (loading) {
        return (
            <section className="py-20 text-center text-gray-400">
                Loading categories...
            </section>
        );
    }

    if (!categories || categories.length === 0) {
        return null; // Hide category grid if admin hasn't created any categories yet
    }

    return (
        <section className="py-20 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-tronix-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tronix-accent/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                        Shop By <span className="text-transparent bg-clip-text bg-gradient-to-r from-tronix-primary to-tronix-accent">Category</span>
                    </h2>
                    <p className="text-tronix-muted max-w-2xl mx-auto">
                        Explore our wide range of electronic components, carefully categorized for your convenience.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categories.filter(c => c.is_active !== false).map((cat) => {
                        const IconComponent = ICON_MAP[cat.icon] || Package;
                        const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
                        return (
                            <Link to={`/category/${slug}`} key={cat.id}>
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center h-full group"
                                >
                                    <div className={`p-4 rounded-full bg-gradient-to-br ${cat.color || 'from-slate-400 to-slate-600'} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                        <IconComponent className="text-white w-8 h-8" />
                                    </div>
                                    <h3 className="text-white font-medium mb-1 group-hover:text-tronix-primary transition-colors">{cat.name}</h3>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CategoryGrid;
