import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ChevronRight, Award } from 'lucide-react';
import logo from '../../assets/logo.png';

const Footer = () => {
    return (
        <footer className="relative bg-tronix-dark/95 border-t border-white/5 pt-20 pb-10 overflow-hidden mt-12">
            {/* Background Glow Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-tronix-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand & Identity */}
                    <div className="space-y-6 lg:col-span-1 border-r-0 lg:border-r border-white/5 lg:pr-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img src={logo} alt="Tronix365 Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="font-display font-bold text-2xl tracking-wider text-white">
                                    TRONIX<span className="text-transparent bg-clip-text bg-gradient-to-r from-tronix-primary to-violet-400">365</span>
                                </span>
                            </div>
                            <p className="text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-500 text-sm font-medium tracking-wide leading-relaxed">
                                Transforming Innovative Ideas Into Reality
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <Award size={14} className="text-tronix-accent" />
                            <span className="text-tronix-accent text-xs font-bold tracking-widest uppercase">
                                Since 2017
                            </span>
                        </div>

                        {/* Social Links */}
                        <div className="flex gap-4 pt-2">
                            {/* Instagram */}
                            <a href="https://www.instagram.com/tronix365?utm_source=qr&igsh=MXBpODJkcWc3d3Vveg==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#E1306C]/20 hover:text-[#E1306C] hover:-translate-y-1 box-border border border-white/5 hover:border-[#E1306C]/50 transition-all duration-300 group">
                                <svg className="w-5 h-5 group-hover:animate-pulse" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <path fill="currentColor" fillRule="evenodd" d="M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm5-3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm7.597 2.214a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2h-.01a1 1 0 0 1-1-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-5 3a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z" clipRule="evenodd" />
                                </svg>
                            </a>
                            {/* WhatsApp */}
                            <a href="https://wa.me/8830153805" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#25D366]/20 hover:text-[#25D366] hover:-translate-y-1 box-border border border-white/5 hover:border-[#25D366]/50 transition-all duration-300 group">
                                <svg className="w-5 h-5 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12c0 1.82.48 3.53 1.31 5.02L2 22l5.12-1.31C8.58 21.48 10.24 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.55 0-3.02-.42-4.31-1.16l-.31-.18-3.21.82.86-3.13-.19-.32C4.34 14.88 3.96 13.47 3.96 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.53-6.04c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.11-.23-.18-.48-.3z" clipRule="evenodd" />
                                </svg>
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/company/tronix365/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#0A66C2]/20 hover:text-[#0A66C2] hover:-translate-y-1 box-border border border-white/5 hover:border-[#0A66C2]/50 transition-all duration-300 group">
                                <svg className="w-5 h-5 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Explore */}
                    <div>
                        <h3 className="text-white font-display font-bold mb-6 text-lg relative inline-block">
                            Explore
                            <span className="absolute -bottom-2 left-0 w-1/2 h-0.5 bg-tronix-primary rounded-full"></span>
                        </h3>
                        <ul className="space-y-3">
                            <li><Link to="/about" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> About Us</Link></li>
                            <li><Link to="/shop" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> Shop Products</Link></li>
                            <li><Link to="/contact" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> Contact Us</Link></li>
                            <li><Link to="/terms" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> Terms & Conditions</Link></li>
                            <li><Link to="/privacy" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> Privacy Policy</Link></li>
                            <li><Link to="/return-refund" className="group flex items-center text-gray-400 hover:text-white text-sm transition-colors"><ChevronRight size={16} className="text-tronix-primary opacity-0 group-hover:opacity-100 -ml-4 group-hover:mx-1 transition-all" /> Return & Refund Policy</Link></li>
                        </ul>
                    </div>

                    {/* Direct Contact */}
                    <div>
                        <h3 className="text-white font-display font-bold mb-6 text-lg relative inline-block">
                            Contact Info
                            <span className="absolute -bottom-2 left-0 w-1/2 h-0.5 bg-tronix-accent rounded-full"></span>
                        </h3>
                        <ul className="space-y-5">
                            <li>
                                <a href="mailto:admin@tronix365.in" className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-tronix-primary/20 group-hover:border-tronix-primary/50 transition-all shrink-0">
                                        <Mail size={18} className="text-gray-400 group-hover:text-tronix-primary transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-0.5">Drop an Email</p>
                                        <p className="text-gray-300 group-hover:text-white text-sm font-medium transition-colors">admin@tronix365.in</p>
                                    </div>
                                </a>
                            </li>
                            <li>
                                <a href="tel:+918830153805" className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-tronix-accent/20 group-hover:border-tronix-accent/50 transition-all shrink-0">
                                        <Phone size={18} className="text-gray-400 group-hover:text-tronix-accent transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-0.5">Call Us Now</p>
                                        <p className="text-gray-300 group-hover:text-white text-sm font-medium transition-colors">+91 88301 53805</p>
                                    </div>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Address & Leadership */}
                    <div>
                        <h3 className="text-white font-display font-bold mb-6 text-lg relative inline-block">
                            Headquarters
                            <span className="absolute -bottom-2 left-0 w-1/2 h-0.5 bg-violet-500 rounded-full"></span>
                        </h3>
                        <a href="https://maps.app.goo.gl/V65P7a6YWds7MqNN6" target="_blank" rel="noopener noreferrer" className="group block mb-6">
                            <div className="flex items-start gap-3 text-gray-400 group-hover:text-gray-200 transition-colors text-sm leading-relaxed mb-3">
                                <MapPin size={20} className="text-violet-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="block font-medium text-gray-300 group-hover:text-white mb-1">Tronix365</span>
                                    Near Datta Mandir, Sinhgad College Campus, Vadgaon Budruk,<br />Pune, Maharashtra 411041
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 group-hover:text-violet-300 uppercase tracking-wider ml-8 bg-violet-500/10 px-3 py-1 rounded-md border border-violet-500/20 shadow-sm transition-all group-hover:shadow-violet-500/20">
                                <MapPin size={12} /> View on Google Maps
                            </span>
                        </a>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 hover:bg-white/10 transition-all cursor-default">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tronix-primary to-violet-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0">
                                M
                            </div>
                            <div>
                                <p className="text-[10px] text-tronix-primary uppercase tracking-widest font-bold mb-0.5">Founder & CEO</p>
                                <p className="text-white font-medium text-sm">Mangesh Sanjay Adsule</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-xs font-medium text-center md:text-left">
                        &copy; 2025 Tronix365. All rights reserved. Prepared with ❤️ for developers and makers.
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <Link to="/return-refund" className="hover:text-white transition-colors">Return & Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
