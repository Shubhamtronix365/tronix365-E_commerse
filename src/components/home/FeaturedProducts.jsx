import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import ProductCard from '../product/ProductCard';
import ProductCardSkeleton from '../product/ProductCardSkeleton';
import client from '../../api/client';
import featuredBg from '../../assets/featured_bg.png';

const FeaturedProducts = () => {
    const [featuredProducts, setFeaturedProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const response = await client.get('/products?limit=4');
                setFeaturedProducts(response.data);
            } catch (error) {
                console.error("Error fetching featured products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeatured();
    }, []);

    return (
        <section className="py-20 md:py-28 relative overflow-hidden bg-[#070919]">
            {/* High-Tech Background Image & Ambient Effects */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <img 
                    src={featuredBg} 
                    alt="Featured Section Tech Background" 
                    className="w-full h-full object-cover object-center opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#070919]/40 via-transparent to-[#070919]/60" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-lg backdrop-blur-md">
                            <Zap size={14} className="text-purple-400 animate-pulse" />
                            <span>TRENDING NOW</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">
                            Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400">Products</span>
                        </h2>
                        <p className="text-slate-300/80 text-sm md:text-base mt-2 max-w-xl font-normal">
                            Discover our handpicked selection of high-quality development boards and modules.
                        </p>
                    </div>
                    <Link 
                        to="/shop" 
                        className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900/70 border border-slate-700/80 hover:border-purple-500/60 text-white hover:text-purple-300 text-sm font-medium transition-all shadow-xl backdrop-blur-md hover:scale-105"
                    >
                        <span>View All Products</span>
                        <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {loading ? (
                        [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
                    ) : (
                        featuredProducts.map(product => (
                            <div key={product.id} className="h-full">
                                <ProductCard product={product} />
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <Link 
                        to="/shop" 
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900/80 border border-slate-700 hover:border-purple-500/60 text-white text-sm font-medium transition-all shadow-xl backdrop-blur-md"
                    >
                        <span>View All Products</span>
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
