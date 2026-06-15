import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../api/client';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';

const Signup = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const { signup, login, loginWithGoogle } = useAuth();

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        const result = await loginWithGoogle(credentialResponse.credential);
        setLoading(false);
        if (result.success) {
            toast.success('Signed up with Google successfully!');
            navigate('/');
        } else {
            toast.error(result.message || 'Google signup failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const result = await signup({
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name
            });

            if (result.success) {
                // Auto login after successful signup
                const loginResult = await login(formData.email, formData.password);
                if (loginResult.success) {
                    navigate('/');
                } else {
                    navigate('/login');
                }
            } else {
                setError(result.message);
                toast.error(`Signup failed: ${result.message}`);
            }
        } catch (err) {
            console.error("Signup Error:", err);
            setError('Registration failed');
            toast.error('Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-tronix-primary/20 rounded-full blur-[100px] -z-10" />

            <div
                className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl border border-white/10 relative z-10"
            >
                <div className="text-center">
                    <img src={logo} alt="Tronix365 Logo" className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
                    <p className="text-gray-400">Join the future of electronics</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                <User size={20} />
                            </div>
                            <input
                                name="full_name"
                                type="text"
                                required
                                className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all"
                                placeholder="Full Name"
                                value={formData.full_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                <Mail size={20} />
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-tronix-primary hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tronix-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                    >
                        {loading ? <Loader className="animate-spin" /> : "Create Account"}
                    </button>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-widest">
                            <span className="bg-tronix-card px-4 text-gray-500 font-bold">Fast Registration</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-[280px] hover:scale-[1.02] transition-transform">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error('Google Sign Up Failed')}
                                theme="filled_black"
                                shape="pill"
                                text="signup_with"
                                width="280"
                            />
                        </div>
                    </div>

                    <div className="text-center">
                        <Link to="/login" className="font-medium text-tronix-primary hover:text-white transition-colors text-sm">
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
