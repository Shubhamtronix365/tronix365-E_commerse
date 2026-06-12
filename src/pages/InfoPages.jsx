import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone } from 'lucide-react';
import client from '../api/client';
import SEO from '../components/common/SEO';

const PageLayout = ({ title, description, keywords, children }) => (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <SEO title={title} description={description} keywords={keywords} />
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-tronix-card/50 border border-white/5 rounded-2xl p-8 md:p-12"
            >
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-8 border-b border-white/10 pb-4">
                    {title}
                </h1>
                <div className="prose prose-invert max-w-none text-gray-300">
                    {children}
                </div>
            </motion.div>
        </div>
    </div>
);

export const About = () => (
    <PageLayout 
        title="About Us"
        description="Learn about Tronix365, our mission, guaranteed quality, and expert technical support for electronics makers and hobbyists."
        keywords="about Tronix365, electronics store, Arduino supplier, IoT components"
    >
        <p className="text-lg leading-relaxed mb-6">
            Welcome to <span className="text-tronix-primary font-bold">TRONIX365</span>, your premier destination for electronics components, development boards, and DIY kits. Founded in 2024, we are a team of passionate engineers and makers dedicated to empowering the innovator in everyone.
        </p>
        <p className="mb-6">
            Our mission is simple: to make high-quality electronics accessible, affordable, and easy to use. Whether you are a student just starting with Arduino, a hobbyist building a home automation system, or a professional engineer prototyping a new product, we have the tools you need.
        </p>
        <h3 className="text-xl font-bold text-white mt-8 mb-4">Why Choose Us?</h3>
        <ul className="list-disc pl-6 space-y-2">
            <li><strong>Quality Guaranteed:</strong> We source only from trusted manufacturers.</li>
            <li><strong>Fast Shipping:</strong> Orders processed within 24 hours.</li>
            <li><strong>Expert Support:</strong> Our team is here to help you with your projects.</li>
            <li><strong>Community Focused:</strong> We believe in open source and sharing knowledge.</li>
        </ul>
    </PageLayout>
);

export const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await client.post('/contact', formData);
            toast.success('Message sent successfully!');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error('Contact error:', error);
            toast.error('Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageLayout 
            title="Contact Us"
            description="Get in touch with Tronix365 support for product questions, order help, and sales. Contact via email, phone, or live form."
            keywords="contact Tronix365, support email, customer service, electronics help"
        >
            <p className="text-lg mb-8">
                Have a question about a product? Need help with an order? We'd love to hear from you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/5 p-6 rounded-xl flex flex-col items-center text-center">
                    <MapPin className="text-tronix-primary mb-4" size={32} />
                    <h3 className="text-white font-bold mb-2">Visit Us</h3>
                    <p className="text-sm">123 Tech Park, Innovation St<br />Silicon Valley, India</p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl flex flex-col items-center text-center">
                    <Mail className="text-tronix-primary mb-4" size={32} />
                    <h3 className="text-white font-bold mb-2">Email Us</h3>
                    <p className="text-sm">support@tronix365.com<br />sales@tronix365.com</p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl flex flex-col items-center text-center">
                    <Phone className="text-tronix-primary mb-4" size={32} />
                    <h3 className="text-white font-bold mb-2">Call Us</h3>
                    <p className="text-sm">+91 98765 43210<br />Mon-Fri, 9am - 6pm</p>
                </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none"
                        placeholder="tronix"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none"
                        placeholder="abc@example"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Message</label>
                    <textarea
                        rows={4}
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tronix-primary outline-none"
                        placeholder="How can we help?"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-tronix-primary hover:bg-violet-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Sending...' : 'Send Message'}
                </button>
            </form>
        </PageLayout>
    );
};

export const Terms = () => (
    <PageLayout 
        title="Terms & Conditions"
        description="Read the terms and conditions for purchasing genuine electronic components and using the Tronix365 platform."
        keywords="terms and conditions, user agreement, shopping policies"
    >
        <p className="mb-4">Last Updated: January 2026</p>
        <h3 className="text-xl font-bold text-white mt-6 mb-2">1. Acceptance of Terms</h3>
        <p className="mb-4">By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h3 className="text-xl font-bold text-white mt-6 mb-2">2. Use License</h3>
        <p className="mb-4">Permission is granted to temporarily download one copy of the materials (information or software) on TRONIX365's website for personal, non-commercial transitory viewing only.</p>

        <h3 className="text-xl font-bold text-white mt-6 mb-2">3. Disclaimer</h3>
        <p className="mb-4">The materials on TRONIX365's website are provided "as is". TRONIX365 makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.</p>
    </PageLayout>
);

export const Privacy = () => (
    <PageLayout 
        title="Privacy Policy"
        description="Review the privacy policy of Tronix365. We protect your personal data and ensure secure transactions."
        keywords="privacy policy, data protection, secure shopping"
    >
        <p className="mb-4">Last Updated: January 2026</p>
        <p className="mb-6">Your privacy is important to us. It is TRONIX365's policy to respect your privacy regarding any information we may collect from you across our website.</p>

        <h3 className="text-xl font-bold text-white mt-6 mb-2">Information We Collect</h3>
        <p className="mb-4">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>

        <h3 className="text-xl font-bold text-white mt-6 mb-2">How We Use Information</h3>
        <p className="mb-4">We use the information we collect to operate and maintain our website, send you newsletters (if subscribed), and process your orders.</p>

        <h3 className="text-xl font-bold text-white mt-6 mb-2">Security</h3>
        <p className="mb-4">We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it.</p>
    </PageLayout>
);
