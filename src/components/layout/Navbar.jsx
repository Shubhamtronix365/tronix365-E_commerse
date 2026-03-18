import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, LogOut, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo.png';
import SearchOverlay from './SearchOverlay';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { user, logout } = useAuth();
    const { cartCount } = useCart();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 group">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-transform group-hover:scale-110">
                                <img src={logo} alt="Tronix365 Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-display font-bold text-lg sm:text-xl tracking-wider text-white">
                                TRONIX<span className="text-tronix-primary">365</span>
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/" className="text-gray-300 hover:text-tronix-primary transition-colors">Home</Link>
                            <Link to="/shop" className="text-gray-300 hover:text-tronix-primary transition-colors">Shop</Link>
                            <Link to="/categories" className="text-gray-300 hover:text-tronix-primary transition-colors">Categories</Link>
                        </div>

                        {/* Actions */}
                        <div className="hidden md:flex items-center space-x-6">
                            <button 
                                onClick={() => setIsSearchOpen(true)}
                                className="text-gray-300 hover:text-tronix-primary transition-colors p-2 bg-white/5 rounded-full border border-white/5"
                                title="Search (Cmd+K)"
                            >
                                <Search size={20} />
                            </button>
                            <Link to="/wishlist" className="text-gray-300 hover:text-tronix-accent transition-colors">
                                <Heart size={20} />
                            </Link>
                            <Link to="/cart" id="navbar-cart-icon" className="relative text-gray-300 hover:text-tronix-primary transition-colors">
                                <ShoppingCart size={20} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-tronix-primary text-xs w-5 h-5 rounded-full flex items-center justify-center text-white font-bold animate-pulse">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            {user ? (
                                <div className="flex items-center gap-2">
                                    <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all">
                                        <User size={18} className="text-tronix-accent" />
                                        <span className="text-sm">{user.role === 'admin' ? 'System Manager' : (user.full_name || user.name || 'User')}</span>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                        Login
                                    </Link>
                                    <Link to="/signup" className="flex items-center gap-2 bg-tronix-primary hover:bg-violet-600 px-4 py-2 rounded-full text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/20">
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300">
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-tronix-bg/95 backdrop-blur-xl border-t border-white/10"
                        >
                            <div className="px-4 pt-2 pb-6 space-y-2">
                                <Link to="/" className="block py-3 text-base font-medium text-white border-b border-white/5">Home</Link>
                                <Link to="/shop" className="block py-3 text-base font-medium text-gray-300 border-b border-white/5">Shop</Link>
                                <Link to="/categories" className="block py-3 text-base font-medium text-gray-300 border-b border-white/5">Categories</Link>
                                {user ? (
                                    <div className="pt-4 border-t border-white/5 mt-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 text-tronix-primary font-medium">
                                                <User size={20} /> <span className="truncate max-w-[150px]">{user.full_name || user.name || 'User'}</span>
                                            </Link>
                                            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-2">
                                                <LogOut size={20} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-around bg-white/5 rounded-xl p-3">
                                            <button onClick={() => { setIsOpen(false); setIsSearchOpen(true); }} className="p-2"><Search size={22} className="text-gray-300" /></button>
                                            <Link to="/wishlist" className="p-2" onClick={() => setIsOpen(false)}><Heart size={22} className="text-gray-300" /></Link>
                                            <Link to="/cart" className="p-2 relative" onClick={() => setIsOpen(false)}>
                                                <ShoppingCart size={22} className="text-gray-300" />
                                                {cartCount > 0 && (
                                                    <span className="absolute top-1 right-1 bg-tronix-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-white font-bold">
                                                        {cartCount}
                                                    </span>
                                                )}
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-4 space-y-4 border-t border-white/5 mt-2">
                                        <div className="flex items-center justify-around bg-white/5 rounded-xl p-3">
                                            <button onClick={() => { setIsOpen(false); setIsSearchOpen(true); }} className="p-2"><Search size={22} className="text-gray-300" /></button>
                                            <Link to="/wishlist" className="p-2" onClick={() => setIsOpen(false)}><Heart size={22} className="text-gray-300" /></Link>
                                            <Link to="/cart" className="p-2 relative" onClick={() => setIsOpen(false)}>
                                                <ShoppingCart size={22} className="text-gray-300" />
                                                {cartCount > 0 && (
                                                    <span className="absolute top-1 right-1 bg-tronix-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-white font-bold">
                                                        {cartCount}
                                                    </span>
                                                )}
                                            </Link>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Link
                                                to="/login"
                                                onClick={() => setIsOpen(false)}
                                                className="text-center py-3 rounded-xl bg-white/5 text-white text-sm font-medium border border-white/10"
                                            >
                                                Login
                                            </Link>
                                            <Link
                                                to="/signup"
                                                onClick={() => setIsOpen(false)}
                                                className="text-center py-3 rounded-xl bg-tronix-primary text-white text-sm font-bold shadow-lg shadow-violet-500/20"
                                            >
                                                Sign Up
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav >
        </>
    );
};

export default Navbar;
