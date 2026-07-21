import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Cpu, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
    {
        id: 1,
        title: "Robotics Kits",
        subtitle: "Build. Code. Drive.",
        badge: "Featured Collection",
        description: "Complete DIY kits for beginners and advanced robotics enthusiasts. High-torque BO motors, chassis, sensor arrays & microcontrollers included.",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200",
        color: "from-orange-500 to-red-600",
        link: "/shop?category=Development+Boards",
        tag: "🤖 100+ Components Included"
    },
    {
        id: 2,
        title: "Next Gen Development",
        subtitle: "Raspberry Pi 5 & Arduino GIGA R1",
        badge: "New Release",
        description: "Experience the ultimate power of the latest microcontrollers and single-board computers for high-speed computing.",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
        color: "from-violet-600 to-fuchsia-600",
        link: "/shop?category=Development+Boards",
        tag: "⚡ Ultra-Fast Processing"
    },
    {
        id: 3,
        title: "IoT & Smart Sensors",
        subtitle: "Connect Everything",
        badge: "Top Rated",
        description: "Explore precision sensors, ESP32 Wi-Fi modules, and wireless transceivers to build the connected future of IoT.",
        image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=1200",
        color: "from-cyan-500 to-blue-600",
        link: "/shop?category=Sensors",
        tag: "📡 Wi-Fi & Bluetooth Ready"
    }
];

const HeroSlider = () => {
    const [current, setCurrent] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative h-[480px] sm:h-[540px] md:h-[620px] overflow-hidden bg-tronix-bg">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                >
                    {/* Ambient Blurred Background Glow */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-[120px]" />
                        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-600/20 blur-[120px]" />
                    </div>

                    {/* Background Fullscreen Image with Gradient Overlays */}
                    <div className="absolute inset-0">
                        <img
                            src={slides[current].image}
                            alt={slides[current].title}
                            className="w-full h-full object-cover object-center opacity-30 scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-tronix-bg via-tronix-bg/95 to-tronix-bg/70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-tronix-bg via-transparent to-transparent" />
                    </div>

                    {/* Main Content Layout */}
                    <div className="absolute inset-0 flex items-center z-10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                                
                                {/* Left Column: Text & CTA */}
                                <div className="lg:col-span-7">
                                    <motion.div
                                        initial={{ x: -30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1, duration: 0.5 }}
                                        className="flex items-center gap-2 mb-4"
                                    >
                                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${slides[current].color} shadow-lg shadow-violet-500/20 uppercase tracking-wider`}>
                                            <Sparkles size={13} className="animate-spin" />
                                            {slides[current].subtitle}
                                        </span>
                                    </motion.div>

                                    <motion.h1
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2, duration: 0.5 }}
                                        className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-white mb-4 sm:mb-6 leading-tight tracking-tight"
                                    >
                                        {slides[current].title}
                                    </motion.h1>

                                    <motion.p
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className="text-sm sm:text-base md:text-lg text-gray-300 mb-6 sm:mb-8 leading-relaxed max-w-xl"
                                    >
                                        {slides[current].description}
                                    </motion.p>

                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                        className="flex flex-wrap items-center gap-4"
                                    >
                                        <button
                                            onClick={() => navigate('/shop')}
                                            className="group flex items-center gap-2.5 bg-gradient-to-r from-tronix-primary to-violet-600 hover:from-violet-600 hover:to-indigo-600 text-white px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 cursor-pointer"
                                        >
                                            Explore Now
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </motion.div>
                                </div>

                                {/* Right Column: Vibrant Interactive Robotics Visual Banner */}
                                <div className="hidden lg:flex lg:col-span-5 justify-center relative">
                                    <motion.div
                                        initial={{ scale: 0.85, opacity: 0, y: 20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                                        className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden border border-white/15 bg-tronix-card/60 backdrop-blur-xl shadow-2xl shadow-violet-500/20 group cursor-pointer"
                                        onClick={() => navigate('/shop')}
                                    >
                                        {/* Image Display */}
                                        <img
                                            src={slides[current].image}
                                            alt={slides[current].title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-tronix-bg via-tronix-bg/30 to-transparent" />

                                        {/* Top Tag Badge */}
                                        <div className="absolute top-4 left-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-black/60 backdrop-blur-md border border-white/20 shadow-md">
                                                {slides[current].tag}
                                            </span>
                                        </div>

                                        {/* Floating Bottom Info Card */}
                                        <div className="absolute bottom-4 left-4 right-4 bg-tronix-bg/85 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                                            <div>
                                                <p className="text-[11px] text-tronix-accent font-bold uppercase tracking-wider">
                                                    {slides[current].badge}
                                                </p>
                                                <p className="text-sm font-bold text-white tracking-wide">
                                                    {slides[current].title}
                                                </p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-tronix-primary/20 border border-tronix-primary/40 flex items-center justify-center text-tronix-primary group-hover:bg-tronix-primary group-hover:text-white transition-colors">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Slider Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrent(index)}
                        className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                            index === current
                                ? 'bg-gradient-to-r from-tronix-primary to-violet-400 w-9'
                                : 'bg-white/30 hover:bg-white/60 w-2.5'
                        }`}
                        aria-label={`Slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default HeroSlider;
