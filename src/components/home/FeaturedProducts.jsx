import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import ProductCard from '../product/ProductCard';
import ProductCardSkeleton from '../product/ProductCardSkeleton';
import client from '../../api/client';

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
        <section className="py-20 bg-tronix-dark border-t border-white/5 relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-tronix-primary mb-2">
                            <Zap size={20} />
                            <span className="font-bold text-sm tracking-wider uppercase">Trending Now</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-tronix-primary to-tronix-accent">Products</span></h2>
                    </div>
                    <Link to="/shop" className="hidden md:flex items-center gap-2 text-white hover:text-tronix-primary transition-colors font-medium">
                        View All Products <ArrowRight size={20} />
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
                    <Link to="/shop" className="inline-flex items-center gap-2 text-white bg-tronix-card border border-white/10 px-6 py-3 rounded-full hover:bg-tronix-primary transition-colors font-medium">
                        View All Products <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
