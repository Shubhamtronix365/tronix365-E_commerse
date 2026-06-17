import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Cpu, Rotate3d, Layers, Gauge } from 'lucide-react';

// Video & Image assets
import webmVideo from '../../assets/Tronix1_optimized.webm';
import mp4Video from '../../assets/Tronix1_optimized.mp4';
import previewImage from '../../assets/Tronix1_preview.png';

const ThreeDShowcase = () => {
    const sectionRef = useRef(null);
    
    // Set up scroll tracking for subtle 3D parallax effects
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // Create smooth spring animations for scroll movements to prevent jitter
    const springConfig = { mass: 0.1, stiffness: 80, damping: 20 };
    
    // Parallax values
    const rawScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.95]);
    const scale = useSpring(rawScale, springConfig);

    const rawRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [8, 0, -8]);
    const rotateX = useSpring(rawRotateX, springConfig);

    const rawY = useTransform(scrollYProgress, [0, 1], [40, -40]);
    const y = useSpring(rawY, springConfig);

    return (
        <section 
            ref={sectionRef} 
            className="relative py-20 bg-tronix-dark overflow-hidden border-b border-white/5"
            style={{ perspective: "1000px" }}
        >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-tronix-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-tronix-accent/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tronix-primary/10 border border-tronix-primary/20 text-tronix-primary text-xs font-semibold tracking-wider uppercase mb-4"
                    >
                        <Rotate3d size={14} className="animate-spin-slow" />
                        Next-Gen Visualisation
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight"
                    >
                        Explore Hardware in <span className="neon-text font-extrabold">3D Depth</span>
                    </motion.h2>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-gray-400 text-sm sm:text-base md:text-lg"
                    >
                        Our components are designed to meet exact tolerance metrics. Play, scroll, and preview our modules rendered in photorealistic high-fidelity layouts.
                    </motion.p>
                </div>

                {/* Responsive Bento Grid Showcase Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left Panel: Tech Stats & Features */}
                    <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">
                        
                        {/* Stat Card 1 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5 }}
                            whileHover={{ y: -4 }}
                            className="glass-card p-6 rounded-2xl flex items-start gap-4"
                        >
                            <div className="p-3 rounded-xl bg-tronix-primary/10 border border-tronix-primary/20 text-tronix-primary flex-shrink-0">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-base mb-1">Dual-Core Architecture</h4>
                                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                                    Integrated with ESP32-S3 modules offering powerful Tensilica dual-core processing capabilities.
                                </p>
                            </div>
                        </motion.div>

                        {/* Stat Card 2 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            whileHover={{ y: -4 }}
                            className="glass-card p-6 rounded-2xl flex items-start gap-4"
                        >
                            <div className="p-3 rounded-xl bg-tronix-accent/10 border border-tronix-accent/20 text-tronix-accent flex-shrink-0">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-base mb-1">Multi-Layer PCBs</h4>
                                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                                    Professional-grade 4-layer boards routing clean analog traces with ground planes to minimize signal interference.
                                </p>
                            </div>
                        </motion.div>

                        {/* Stat Card 3 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            whileHover={{ y: -4 }}
                            className="glass-card p-6 rounded-2xl flex items-start gap-4"
                        >
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                                <Gauge size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-base mb-1">Ultra-Low Power</h4>
                                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                                    Supports deep-sleep states down to 10µA, making it perfect for battery-driven remote IoT nodes.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Panel: The 3D Video Viewport with Scroll-Parallax */}
                    <div className="lg:col-span-8 order-1 lg:order-2 flex justify-center items-center">
                        <motion.div 
                            style={{ 
                                scale, 
                                rotateX, 
                                y,
                                transformStyle: "preserve-3d" 
                            }}
                            className="w-full relative glass-card p-2 sm:p-3 rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-tronix-card/20"
                        >
                            {/* Neon Outline Border Animation */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-tronix-primary/20 via-transparent to-tronix-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />

                            {/* Video Wrapper (Forces specific aspect ratio to prevent CLS) */}
                            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/40 shadow-inner">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="auto"
                                    poster={previewImage}
                                    className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 ease-out"
                                >
                                    <source src={webmVideo} type="video/webm" />
                                    <source src={mp4Video} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>

                                {/* Glare Effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-30 pointer-events-none" />
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default ThreeDShowcase;
