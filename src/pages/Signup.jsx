import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft, RefreshCw, Loader, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../api/client';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';

const Signup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signup, loginWithGoogle, loginWithOTPResponse } = useAuth();

    const searchParams = new URLSearchParams(location.search);
    const prefilledEmail = searchParams.get('email') || '';
    const redirectUrl = searchParams.get('redirect') || location.state?.from || '/';

    const [formData, setFormData] = useState({
        full_name: '',
        email: prefilledEmail,
        password: '',
        confirmPassword: ''
    });
    
    // OTP Flow State variables
    const [otpStep, setOtpStep] = useState(1); // 1: Signup form, 2: OTP verification
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(120);
    const [resendCountdown, setResendCountdown] = useState(30);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signupSession, setSignupSession] = useState(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const queryEmail = searchParams.get('email');
        if (queryEmail && !formData.email) {
            setFormData(prev => ({ ...prev, email: queryEmail }));
        }
    }, [location.search]);

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        const result = await loginWithGoogle(credentialResponse.credential);
        setLoading(false);
        if (result.success) {
            toast.success('Signed up with Google successfully!');
            navigate(redirectUrl);
        } else {
            toast.error(result.message || 'Google signup failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
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
                if (result.data?.status === 'otp_required') {
                    toast.success('Verification OTP sent to your email!');
                    setOtpStep(2);
                    setSignupSession(result.data?.signup_session);
                    setCountdown(120);
                    setResendCountdown(30);
                    setOtp(['', '', '', '', '', '']);
                    // Focus first OTP input box after render
                    setTimeout(() => {
                        const firstInput = document.getElementById('otp-0');
                        if (firstInput) firstInput.focus();
                    }, 100);
                } else {
                    toast.success('Signup successful!');
                    navigate('/login');
                }
            } else {
                toast.error(`Signup failed: ${result.message}`);
            }
        } catch (err) {
            console.error("Signup Error:", err);
            toast.error('Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCountdown > 0) return;
        setLoading(true);
        try {
            await client.post('/auth/resend-otp', { email: formData.email });
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
            setLoading(false);
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
            const response = await client.post('/auth/verify-otp', { 
                email: formData.email, 
                otp: otpString,
                signup_session: signupSession
            });
            loginWithOTPResponse(response.data);
            toast.success("Account successfully created and verified!");
            navigate(redirectUrl);
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
            {/* LEFT COLUMN: AUTH FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-6 lg:py-8 bg-tronix-bg relative overflow-y-auto w-full lg:h-full">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-tronix-primary/10 rounded-full blur-[100px] pointer-events-none" />
                
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className="w-full max-w-md relative z-10 glass-card p-6 rounded-2xl border border-white/10"
                >
                    <div className="text-center">
                        <img src={logo} alt="Tronix365 Logo" className="w-12 h-12 mx-auto mb-4 md:hidden" />
                        <h2 className="text-3xl font-display font-bold text-white mb-2">
                            {otpStep === 2 ? 'Verify Email' : 'Create Account'}
                        </h2>
                        <p className="text-gray-400">
                            {otpStep === 2 ? 'Verify email to activate your account' : 'Join the future of electronics'}
                        </p>
                    </div>

                    {otpStep === 2 ? (
                        // OTP Verification Form
                        <form onSubmit={handleVerifyOTP} className="space-y-4 mt-6">
                            {/* Spam Folder Warning Alert */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 text-center leading-relaxed font-medium">
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
                                        <ArrowLeft size={12} /> {formData.email}
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
                                        'Verify & Complete Signup'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={resendCountdown > 0 || loading}
                                    onClick={handleResendOTP}
                                    className="w-full bg-white/5 border border-white/10 text-white font-semibold py-2.5 rounded-xl transition-colors hover:bg-white/10 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? (
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
                        // Signup Form
                        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
                            <div className="space-y-2.5">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        name="full_name"
                                        type="text"
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all placeholder:text-gray-600 text-sm"
                                        placeholder="Full Name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all placeholder:text-gray-600 text-sm"
                                        placeholder="Email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="block w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all placeholder:text-gray-600 text-sm"
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-tronix-primary transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        className="block w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tronix-primary/50 focus:border-transparent transition-all placeholder:text-gray-600 text-sm"
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-tronix-primary hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tronix-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : "Create Account"}
                            </button>

                            <div className="relative my-3">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                    <span className="bg-tronix-card px-4 text-gray-500 font-bold text-[10px]">Fast Registration</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-2">
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

                            <div className="text-center mt-2">
                                <Link to={`/login${location.search}`} className="font-medium text-tronix-primary hover:text-white transition-colors text-sm">
                                    Already have an account? Sign in
                                </Link>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>

            {/* RIGHT COLUMN: HERO PANEL */}
            <div className="hidden lg:flex flex-col justify-between p-8 lg:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 border-l border-white/5 relative overflow-y-auto lg:h-full">
                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-tronix-primary/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
                
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
                            Join the Ecosystem
                        </span>
                        <h2 className="text-4xl font-display font-bold text-white leading-tight">
                            Start Building Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">IoT Vision Today</span>
                        </h2>
                        <p className="text-gray-400 mt-4 text-sm leading-relaxed">
                            Create an account to gain access to premium developer tools, customizable component lists, order history, and instant order tracking notifications. Only high-grade microcontroller modules.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-4 mt-8">
                        {[
                            { title: "Personalized Catalog", desc: "Save components to lists and receive notifications when stock is updated." },
                            { title: "Secure Checkout", desc: "Fully protected transactions using advanced encryption standards." },
                            { title: "24/7 Builder Support", desc: "Expert technical documentation and community forums." }
                        ].map((feat, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: 20 }}
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
        </div>
    );
};

export default Signup;
