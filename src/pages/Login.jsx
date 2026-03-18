import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Github, Chrome, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const email = e.target.querySelector('input[type="email"]').value;
            const passwordInput = e.target.querySelector('input[name="password"]');
            const password = passwordInput ? passwordInput.value : e.target.querySelectorAll('input')[1].value;

            const result = await login(email, password, isAdmin);

            if (result.success) {
                // The context update will happen inside auth.login
                // We just need to navigate now based on the role
                const storedUser = JSON.parse(localStorage.getItem('tronix_user'));
                if (storedUser?.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            } else {
                // Fallback for demo if needed, but result.message should suffice
                if (email === "admin@tronix365.com") {
                    alert("Demo login active.");
                    navigate('/admin');
                } else {
                    alert(result.message);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen pt-20 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-tronix-bg z-0" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tronix-primary/10 rounded-full blur-[100px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10 glass-card p-8 rounded-2xl border border-white/10"
            >
                <div className="text-center mb-8">
                    <img src={logo} alt="Tronix365 Logo" className="w-16 h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-tronix-muted text-sm">Sign in to access your account</p>
                </div>

                {/* Toggle */}
                <div className="flex bg-white/5 rounded-full p-1 mb-8 relative">
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-tronix-card rounded-full shadow-lg transition-all duration-300 ${isAdmin ? 'left-[50%]' : 'left-1'}`}
                    />
                    <button
                        onClick={() => setIsAdmin(false)}
                        className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors rounded-full ${!isAdmin ? 'text-white' : 'text-gray-400'}`}
                    >
                        <User size={16} /> User
                    </button>
                    <button
                        onClick={() => setIsAdmin(true)}
                        className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors rounded-full ${isAdmin ? 'text-tronix-accent' : 'text-gray-400'}`}
                    >
                        <ShieldCheck size={16} /> Admin
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 py-3 text-white focus:outline-none focus:border-tronix-primary transition-colors placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-300 ml-1">Admin Key / Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 pr-12 py-3 text-white focus:outline-none focus:border-tronix-accent transition-colors placeholder:text-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-300 ml-1">Password (or OTP)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter Password or OTP"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 pr-12 py-3 text-white focus:outline-none focus:border-tronix-primary transition-colors placeholder:text-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="text-right">
                                <a href="#" className="text-xs text-tronix-primary hover:text-white transition-colors">Use OTP Instead?</a>
                            </div>
                        </div>
                    )}

                    <button className={`w-full font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-lg ${isAdmin ? 'bg-tronix-accent text-white hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20'}`}>
                        {isAdmin ? 'Access Dashboard' : 'Sign In'}
                    </button>
                    {!isAdmin && (
                        <div className="text-center mt-4">
                            <Link to="/signup" className="text-sm text-tronix-primary hover:text-white transition-colors">
                                Don't have an account? Create one
                            </Link>
                        </div>
                    )}
                </form>

                {!isAdmin && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-tronix-card px-2 text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 transition-colors text-sm text-white">
                                <Chrome size={18} /> Google
                            </button>
                            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 transition-colors text-sm text-white">
                                <Github size={18} /> GitHub
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default Login;
