import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
    {
        id: 1,
        title: "Next Gen Development",
        subtitle: "Raspberry Pi 5 & Arduino GIGA R1",
        description: "Experience the power of the latest microcontrollers and single-board computers.",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000",
        color: "from-violet-600 to-fuchsia-600"
    },
    {
        id: 2,
        title: "IoT Solutions",
        subtitle: "Connect Everything",
        description: "Sensors, ESP32, and LoRa modules to build the connected future.",
        image: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&q=80&w=2000",
        color: "from-cyan-600 to-blue-600"
    },
    {
        id: 3,
        title: "Robotics Kits",
        subtitle: "Build. Code. Drive.",
        description: "Complete kits for beginners and advanced robotics enthusiasts.",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=2000",
        color: "from-orange-600 to-red-600"
    }
];

const HeroSlider = () => {
    const [current, setCurrent] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative h-[420px] sm:h-[500px] md:h-[600px] overflow-hidden bg-tronix-bg">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                        <img
                            src={slides[current].image}
                            alt={slides[current].title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-tronix-bg via-tronix-bg/90 sm:via-tronix-bg/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-tronix-bg via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex items-center z-10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                            <div className="max-w-2xl">
                                <motion.div
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                >
                                    <span className={`inline-block px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r ${slides[current].color} mb-3 sm:mb-4 uppercase tracking-wider shadow-lg shadow-violet-500/20`}>
                                        {slides[current].subtitle}
                                    </span>
                                </motion.div>

                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3, duration: 0.5 }}
                                    className="text-3xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight"
                                >
                                    {slides[current].title}
                                </motion.h1>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                    className="text-sm sm:text-base md:text-lg text-gray-300 mb-6 sm:mb-8 leading-relaxed max-w-lg"
                                >
                                    {slides[current].description}
                                </motion.p>

                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                    onClick={() => navigate('/shop')}
                                    className="group flex items-center gap-2 bg-tronix-primary hover:bg-violet-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full text-sm sm:text-base font-bold transition-all shadow-xl shadow-violet-500/25 cursor-pointer"
                                >
                                    Explore Now
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrent(index)}
                        className={`h-3 rounded-full transition-all cursor-pointer ${
                            index === current ? 'bg-tronix-primary w-8' : 'bg-white/30 hover:bg-white/50 w-3'
                        }`}
                        aria-label={`Slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default HeroSlider;
