import React from 'react';
import HeroSlider from '../components/home/HeroSlider';
import FeaturedProducts from '../components/home/FeaturedProducts';
import { AboutSection, ContactSection } from '../components/home/InfoSections';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';
import SEO from '../components/common/SEO';

const Home = () => {
    return (
        <main className="min-h-screen pt-16">
            <SEO 
                title="Premium Electronic Components & IoT Modules" 
                description="Shop genuine Arduino boards, ESP32 modules, sensors, motors, and IoT displays at Tronix365. Best price and fast delivery in India." 
                keywords="Arduino, ESP32, IoT Modules, Sensors, Robotics, Tronix365"
            />
            <HeroSlider />

            {/* Brand Highlight Section */}
            <section className="py-12 bg-white/5 border-y border-white/10 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-6"
                    >
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl p-4 glass-card border border-white/20 shadow-2xl shadow-tronix-primary/20 flex items-center justify-center">
                            <img src={logo} alt="Tronix365 Brand Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
                                Official <span className="text-tronix-primary">TRONIX365</span> Partner
                            </h2>
                            <p className="text-gray-400 max-w-md">
                                Your trusted source for high-quality electronics, microcontrollers, and innovative project kits.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex gap-4"
                    >
                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-tronix-primary font-bold text-xl">100%</p>
                            <p className="text-xs text-gray-400 uppercase tracking-widest">Genuine</p>
                        </div>
                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-tronix-accent font-bold text-xl">24/7</p>
                            <p className="text-xs text-gray-400 uppercase tracking-widest">Support</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Featured Products Section - now a component */}
            <FeaturedProducts />

            {/* Banner / Call to Action */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000"
                        alt="Electronics Banner"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-tronix-bg via-tronix-bg/80 to-transparent" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                        Build Your <span className="text-tronix-primary">Dreams</span>
                    </h2>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-10">
                        From Arduino to Raspberry Pi, we have everything you need to bring your ideas to life. Start building today.
                    </p>
                    <Link to="/shop" className="inline-block bg-tronix-primary hover:bg-violet-600 text-white font-bold px-10 py-4 rounded-full text-lg shadow-lg shadow-violet-500/30 transition-all hover:scale-105">
                        Start Shopping
                    </Link>
                </div>
            </section>

            {/* Info Sections */}
            <AboutSection />
            <ContactSection />
        </main>
    );
};

export default Home;
