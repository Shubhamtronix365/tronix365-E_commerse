import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, ShieldCheck, Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import client from '../api/client';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // OTP Flow State variables
    const [otpStep, setOtpStep] = useState(1); // 1: Email & Password, 2: 6-digit OTP
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(120);
    const [resendCountdown, setResendCountdown] = useState(30);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const { login, loginWithGoogle, loginWithOTPResponse } = useAuth();

    // OTP 2-Minute Expiration Countdown Timer
    useEffect(() => {
        let timer;
        if (otpStep === 2 && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpStep, countdown]);

    // OTP 30-Second Resend Countdown Timer
    useEffect(() => {
        let timer;
        if (otpStep === 2 && resendCountdown > 0) {
            timer = setInterval(() => {
                setResendCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpStep, resendCountdown]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        const result = await loginWithGoogle(credentialResponse.credential);
        if (result.success) {
            toast.success('Google Login successful!');
            navigate('/');
        } else {
            toast.error(result.message || 'Google Login failed');
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await login(email, password, isAdmin);
            if (result.success) {
                if (result.otpRequired) {
                    toast.success('Credentials verified. OTP sent to your email!');
                    setOtpStep(2);
                    setCountdown(120);
                    setResendCountdown(30);
                    setOtp(['', '', '', '', '', '']);
                    // Focus first OTP input box after render
                    setTimeout(() => {
                        const firstInput = document.getElementById('otp-0');
                        if (firstInput) firstInput.focus();
                    }, 100);
                } else {
                    toast.success('Login successful!');
                    const storedUserStr = localStorage.getItem('tronix_user');
                    let role = 'user';
                    if (storedUserStr) {
                        try {
                            const storedUser = JSON.parse(storedUserStr);
                            role = storedUser?.role;
                        } catch (e) {
                            console.error('Error parsing stored user', e);
                        }
                    }
                    if (role === 'admin' || isAdmin) {
                        navigate('/admin');
                    } else {
                        navigate('/');
                    }
                }
            } else {
                toast.error(result.message || 'Login failed.');
            }
        } catch (error) {
            console.error('Unexpected login error:', error);
            toast.error('An unexpected error occurred during login.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCountdown > 0) return;
        setIsSubmitting(true);
        try {
            await client.post('/auth/resend-otp', { email });
            toast.success("A new OTP has been sent to your email.");
            setCountdown(120);
            setResendCountdown(30);
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => {
                const firstInput = document.getElementById('otp-0');
                if (firstInput) firstInput.focus();
            }, 100);
        } catch (error) {
            console.error("Error resending OTP:", error);
            toast.error(error.response?.data?.detail || "Failed to resend OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join("");
        if (otpString.length < 6) {
            toast.error("Please enter the full 6-digit OTP.");
            return;
        }
        if (countdown === 0) {
            toast.error("OTP has expired. Please request a new one.");
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const response = await client.post('/auth/verify-otp', { email, otp: otpString });
            loginWithOTPResponse(response.data);
            toast.toast = toast.success("Successfully logged in!");
            
            // Check redirect role
            const role = response.data?.role;
            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast.error(error.response?.data?.detail || "Invalid OTP. Please try again.");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return false;

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Auto focus next input box
        if (element.value !== "" && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === "Backspace" && otp[index] === "" && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) {
                prevInput.focus();
                const newOtp = [...otp];
                newOtp[index - 1] = "";
                setOtp(newOtp);
            }
        }
    };

    return (
        <div className="min-h-screen lg:h-screen lg:overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-tronix-bg relative overflow-hidden">
            {/* LEFT COLUMN: HERO PANEL */}
            <div className="hidden lg:flex flex-col justify-between p-8 lg:p-12 bg-gradient-to-br from-violet-950 via-slate-900 to-black border-r border-white/5 relative overflow-y-auto lg:h-full">
                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-tronix-primary/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <img src={logo} alt="Tronix365 Logo" className="w-10 h-10 object-contain" />
                    <span className="font-display font-bold text-xl text-white tracking-wider uppercase">Tronix<span className="text-tronix-primary">365</span></span>
                </div>

                <div className="my-auto relative z-10 max-w-lg space-y-6 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-tronix-primary bg-tronix-primary/10 rounded-full border border-tronix-primary/20 inline-block mb-4">
                            IoT & Robotics Command Center
                        </span>
                        <h2 className="text-4xl font-display font-bold text-white leading-tight">
                            Explore the Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">Advanced Electronics</span>
                        </h2>
                        <p className="text-gray-400 mt-4 text-sm leading-relaxed">
                            Tronix365 is your ultimate ecosystem for high-precision sensors, microcontrollers, robust development boards, and premium robotics accessories. Log in to access your dashboard, track your orders, and construct your next masterpiece.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-4 mt-8">
                        {[
                            { title: "Curated IoT Ecosystem", desc: "Top-tier modules, sensors, and chips verified by experts." },
                            { title: "Accelerated Delivery", desc: "Express logistics ensuring your parts arrive exactly when needed." },
                            { title: "Developer Dashboard", desc: "Manage projects, orders, and review custom system schematics." }
                        ].map((feat, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.2 + 0.4 }}
                                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-tronix-primary/30 transition-all hover:bg-white/10 group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-tronix-primary/15 border border-tronix-primary/20 flex items-center justify-center text-tronix-primary font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                                    0{idx+1}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white text-sm group-hover:text-tronix-primary transition-colors">{feat.title}</h4>
                                    <p className="text-xs text-gray-400 mt-1">{feat.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-gray-500">
                    © {new Date().getFullYear()} Tronix365 Enterprise. All hardware rights reserved.
                </div>
            </div>

            {/* RIGHT COLUMN: AUTH FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-6 lg:py-8 bg-tronix-bg relative overflow-y-auto w-full lg:h-full">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-tronix-primary/10 rounded-full blur-[100px] pointer-events-none" />
                
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className="w-full max-w-md relative z-10 glass-card p-5 md:p-6 rounded-2xl border border-white/10"
                >
                    <div className="text-center mb-4 md:mb-6">
                        <img src={logo} alt="Tronix365 Logo" className="w-12 h-12 mx-auto mb-4 md:hidden" />
                        <h1 className="text-3xl font-display font-bold text-white mb-2">
                            {otpStep === 2 ? 'Two-Factor OTP' : 'Welcome Back'}
                        </h1>
                        <p className="text-tronix-muted text-sm">
                            {otpStep === 2 ? 'Verify email to complete sign in' : 'Sign in to access your account'}
                        </p>
                    </div>

                    {/* Toggle Admin / User (only visible at Step 1) */}
                    {otpStep === 1 && (
                        <div className="flex bg-white/5 rounded-full p-1 mb-4 md:mb-6 relative">
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-tronix-card rounded-full shadow-lg transition-all duration-300 ${isAdmin ? 'left-[50%]' : 'left-1'}`}
                            />
                            <button
                                onClick={() => { setIsAdmin(false); }}
                                className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors rounded-full ${!isAdmin ? 'text-white' : 'text-gray-400'}`}
                            >
                                <User size={16} /> User
                            </button>
                            <button
                                onClick={() => { setIsAdmin(true); }}
                                className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors rounded-full ${isAdmin ? 'text-tronix-accent' : 'text-gray-400'}`}
                            >
                                <ShieldCheck size={16} /> Admin
                            </button>
                        </div>
                    )}

                    {otpStep === 2 ? (
                        // OTP Verification Form
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            {/* Spam Folder Warning Alert */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 text-center leading-relaxed font-medium mb-3">
                                ⚠️ If you don't see the code, please check your **Spam / Junk** folder.
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-medium text-gray-300">Enter 6-Digit OTP</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setOtpStep(1)}
                                        className="text-xs text-tronix-primary hover:text-white flex items-center gap-1 transition-colors"
                                    >
                                        <ArrowLeft size={12} /> {email}
                                    </button>
                                </div>
                                
                                {/* 6-Digit box elements */}
                                <div className="flex justify-between gap-2">
                                    {otp.map((data, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            maxLength="1"
                                            value={data}
                                            onChange={(e) => handleOtpChange(e.target, index)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                            className="w-12 h-12 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-tronix-primary transition-all"
                                        />
                                    ))}
                                </div>
                                
                                {/* Countdown Timers */}
                                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                                    <span>Expires in: <strong className={countdown < 30 ? "text-red-400 animate-pulse" : "text-white"}>{formatTime(countdown)}</strong></span>
                                    <span>{countdown === 0 && <span className="text-red-400 font-semibold">OTP Expired</span>}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button 
                                    type="submit"
                                    disabled={isVerifyingOtp || countdown === 0}
                                    className="w-full bg-tronix-primary text-white font-bold py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg hover:bg-violet-600 shadow-violet-500/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isVerifyingOtp ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={18} /> Verifying...
                                        </>
                                    ) : (
                                        'Verify & Login'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={resendCountdown > 0 || isSubmitting}
                                    onClick={handleResendOTP}
                                    className="w-full bg-white/5 border border-white/10 text-white font-semibold py-2.5 rounded-xl transition-colors hover:bg-white/10 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={16} /> Resending...
                                        </>
                                    ) : resendCountdown > 0 ? (
                                        `Resend OTP in ${resendCountdown}s`
                                    ) : (
                                        'Resend OTP'
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Credentials Form
                        <form onSubmit={handleLoginSubmit} className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-300 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 py-2.5 text-white focus:outline-none focus:border-tronix-primary transition-colors placeholder:text-gray-600 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-300 ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 pr-12 py-2.5 text-white focus:outline-none focus:border-tronix-primary transition-colors placeholder:text-gray-600 text-sm"
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

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full font-bold py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 text-sm ${isAdmin ? 'bg-tronix-accent text-white hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-tronix-primary text-white hover:bg-violet-600 shadow-violet-500/20'}`}
                            >
                                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : (isAdmin ? 'Access Dashboard' : 'Sign In')}
                            </button>
                            {!isAdmin && (
                                <div className="text-center mt-2.5">
                                    <Link to="/signup" className="text-sm text-tronix-primary hover:text-white transition-colors">
                                        Don't have an account? Create one
                                    </Link>
                                </div>
                            )}
                        </form>
                    )}

                    {!isAdmin && otpStep === 1 && (
                        <>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                    <span className="bg-tronix-card px-4 text-gray-500 font-bold text-[10px]">Quick Access</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <div className="w-full max-w-[280px] hover:scale-[1.02] transition-transform">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error('Google Login Failed')}
                                        theme="filled_black"
                                        shape="pill"
                                        text="continue_with"
                                        width="280"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Secure Single Sign-On</p>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
