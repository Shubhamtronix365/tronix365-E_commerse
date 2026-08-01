import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, ExternalLink, Code, Cpu, Globe, User, MessageSquare, Send, Loader2 } from 'lucide-react';

export const AboutSection = () => {
    return (
        <section id="about" className="py-20 bg-gradient-to-b from-tronix-bg to-[#0a0a0f] relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-20 left-10 w-64 h-64 bg-tronix-primary rounded-full filter blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-20 right-10 w-64 h-64 bg-tronix-accent rounded-full filter blur-[100px] animate-pulse-slow delay-1000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Empowering Innovation</h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        We provide the building blocks for the future. From hobbyists to professional engineers, TRONIX365 is your partner in creation.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <Cpu size={32} />,
                            title: "Premium Components",
                            desc: "Sourced directly from trusted manufacturers to ensure reliability for your critical projects."
                        },
                        {
                            icon: <Code size={32} />,
                            title: "Open Source Spirit",
                            desc: "We believe in sharing knowledge. Our community is built on collaboration and open-source principles."
                        },
                        {
                            icon: <Globe size={32} />,
                            title: "Global Shipping",
                            desc: "Fast, tracked shipping worldwide so you can start building no matter where you are."
                        }
                    ].map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="bg-tronix-card/30 backdrop-blur-md border border-white/5 p-8 rounded-2xl hover:bg-tronix-card/50 hover:border-tronix-primary/30 transition-all group"
                        >
                            <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-tronix-primary mb-6 group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

import { useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';

export const ContactSection = () => {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Note: Reuse the same /contact endpoint. It expects name, email, message.
            // We can append subject to message or update backend. 
            // For now, let's prepend subject to message to avoid backend changes if backend schema is strict
            // Backend schema: name, email, message.
            const payload = {
                name: formData.name,
                email: formData.email,
                message: `Subject: ${formData.subject}\n\n${formData.message}`
            };

            const response = await client.post('/contact', payload);

            toast.success('Message sent successfully!');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Contact error:', error);
            const errMsg = error.response?.data?.detail || 'Failed to send message.';
            toast.error(errMsg);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" className="py-24 relative overflow-hidden bg-tronix-bg">
            {/* Animated Canvas Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 items-center">

                    {/* Contact Info Left Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-bold tracking-wide uppercase mb-6">
                                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                                Support & Inquiry
                            </div>
                            <h2 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-6 leading-tight">
                                Let's Build <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Together.</span>
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Have a question about a component? Need a bulk quote? Or just want to show off your latest project? Our engineering team is ready to help.
                            </p>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-white/5">
                            {[
                                { 
                                    icon: <MapPin size={24} />, 
                                    text: "Tronix365, Near Datta Mandir, Sinhgad College Campus, Vadgaon Budruk, Pune, Maharashtra 411041", 
                                    label: "Headquarters",
                                    href: "https://maps.app.goo.gl/V65P7a6YWds7MqNN6",
                                    external: true
                                },
                                { 
                                    icon: <Mail size={24} />, 
                                    text: "admin@tronix365.in", 
                                    label: "Email Support",
                                    href: "mailto:admin@tronix365.in" 
                                },
                                { 
                                    icon: <Phone size={24} />, 
                                    text: "+91 88301 53805", 
                                    label: "Sales & Inquiries",
                                    href: "tel:+918830153805" 
                                }
                            ].map((item, index) => (
                                <motion.a
                                    key={index}
                                    href={item.href}
                                    target={item.external ? "_blank" : undefined}
                                    rel={item.external ? "noopener noreferrer" : undefined}
                                    whileHover={{ x: 5 }}
                                    className="flex items-start gap-5 group cursor-pointer"
                                >
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-tronix-primary shrink-0 border border-white/5 group-hover:border-violet-500/30 group-hover:bg-violet-500/10 transition-all shadow-lg">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                                        <p className="text-base text-gray-200 group-hover:text-white font-medium transition-colors">{item.text}</p>
                                    </div>
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Premium Neo-Glass Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="lg:col-span-3 relative"
                    >
                        {/* Glowing Border Wrap */}
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-500/30 via-transparent to-blue-500/30 rounded-[2rem] blur opacity-50"></div>

                        <div className="bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Name Input */}
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Your Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-violet-400 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:bg-violet-500/5 outline-none transition-all shadow-inner"
                                                placeholder="Tronix"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Input */}
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-violet-400 transition-colors">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:bg-violet-500/5 outline-none transition-all shadow-inner"
                                                placeholder="[EMAIL_ADDRESS]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Subject Input */}
                                <div className="relative group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Subject</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-violet-400 transition-colors">
                                            <MessageSquare size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:bg-violet-500/5 outline-none transition-all shadow-inner"
                                            placeholder="What is this regarding?"
                                        />
                                    </div>
                                </div>

                                {/* Message Input */}
                                <div className="relative group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Message</label>
                                    <textarea
                                        rows={5}
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:bg-violet-500/5 outline-none transition-all resize-none shadow-inner"
                                        placeholder="Tell us about your project, issue, or bulk order requirements..."
                                    />
                                </div>

                                {/* Submit Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full relative overflow-hidden group bg-tronix-primary text-white font-bold text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                    <div className="flex items-center justify-center gap-2 relative z-10">
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Send Transmission
                                            </>
                                        )}
                                    </div>
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
