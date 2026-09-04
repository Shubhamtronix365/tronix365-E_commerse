import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { ICON_MAP } from '../admin/CategoryTable';

// Fallback lookup table to guarantee appropriate icon and gradient for all electronic categories
const CATEGORY_STYLE_DEFAULTS = {
    'wheels': { icon: 'Disc', color: 'from-amber-500 to-yellow-500' },
    'wheel': { icon: 'Disc', color: 'from-amber-500 to-yellow-500' },
    'socket': { icon: 'Plug', color: 'from-blue-500 to-indigo-500' },
    'sockets': { icon: 'Plug', color: 'from-blue-500 to-indigo-500' },
    'miscellaneous': { icon: 'Shapes', color: 'from-fuchsia-500 to-purple-600' },
    'misc': { icon: 'Shapes', color: 'from-fuchsia-500 to-purple-600' },
    'modules': { icon: 'Cpu', color: 'from-purple-500 to-pink-500' },
    'module': { icon: 'Cpu', color: 'from-purple-500 to-pink-500' },
    'connector': { icon: 'Cable', color: 'from-cyan-500 to-teal-500' },
    'connectors': { icon: 'Cable', color: 'from-cyan-500 to-teal-500' },
    'keypad': { icon: 'Keyboard', color: 'from-emerald-500 to-teal-600' },
    'keypads': { icon: 'Keyboard', color: 'from-emerald-500 to-teal-600' },
    'switches': { icon: 'ToggleLeft', color: 'from-rose-500 to-red-500' },
    'switch': { icon: 'ToggleLeft', color: 'from-rose-500 to-red-500' },
    'cables': { icon: 'Cable', color: 'from-indigo-500 to-blue-600' },
    'cable': { icon: 'Cable', color: 'from-indigo-500 to-blue-600' },
    'other': { icon: 'MoreHorizontal', color: 'from-pink-500 to-rose-600' },
    'led': { icon: 'Sun', color: 'from-yellow-400 to-amber-500' },
    'relays': { icon: 'ToggleLeft', color: 'from-red-500 to-rose-600' },
    'relay': { icon: 'ToggleLeft', color: 'from-red-500 to-rose-600' },
    'motors': { icon: 'Zap', color: 'from-amber-500 to-orange-500' },
    'motor': { icon: 'Zap', color: 'from-amber-500 to-orange-500' },
    'sensors': { icon: 'Wifi', color: 'from-cyan-500 to-blue-500' },
    'sensor': { icon: 'Wifi', color: 'from-cyan-500 to-blue-500' },
    'displays': { icon: 'Monitor', color: 'from-indigo-500 to-violet-500' },
    'display': { icon: 'Monitor', color: 'from-indigo-500 to-violet-500' },
    'battery': { icon: 'Battery', color: 'from-emerald-500 to-teal-500' },
    'batteries': { icon: 'Battery', color: 'from-emerald-500 to-teal-500' },
    'development boards': { icon: 'CircuitBoard', color: 'from-violet-500 to-fuchsia-500' }
};

const resolveCategoryVisuals = (cat) => {
    const norm = (cat.name || '').toLowerCase().trim();
    const fallback = CATEGORY_STYLE_DEFAULTS[norm] || {};

    // 1. Icon resolution: Prefer cat.icon if valid & not default 'Package'; otherwise use fallback
    let iconKey = cat.icon;
    if (!iconKey || iconKey === 'Package' || !ICON_MAP[iconKey]) {
        iconKey = fallback.icon || iconKey || 'Shapes';
    }
    const IconComponent = ICON_MAP[iconKey] || ICON_MAP['Shapes'] || Package;

    // 2. Color resolution: Prefer cat.color if valid & not default slate; otherwise use fallback
    let colorGradient = cat.color;
    if (!colorGradient || colorGradient === 'from-slate-400 to-slate-600') {
        colorGradient = fallback.color || 'from-violet-500 to-indigo-600';
    }

    return { IconComponent, colorGradient };
};

const CategoryGrid = () => {
    const { categories } = useCategories();

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

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
                    {categories.filter(c => c.is_active !== false).map((cat) => {
                        const { IconComponent, colorGradient } = resolveCategoryVisuals(cat);
                        const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
                        return (
                            <Link to={`/category/${slug}`} key={cat.id || cat.name}>
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center h-full group border border-white/5 hover:border-tronix-primary/40 transition-all shadow-lg hover:shadow-tronix-primary/10"
                                >
                                    <div className={`p-4 rounded-full bg-gradient-to-br ${colorGradient} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                                        <IconComponent className="text-white w-8 h-8" />
                                    </div>
                                    <h3 className="text-white font-medium mb-1 group-hover:text-tronix-primary transition-colors capitalize">{cat.name}</h3>
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
