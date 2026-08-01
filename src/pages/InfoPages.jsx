import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone } from 'lucide-react';
import client from '../api/client';
import SEO from '../components/common/SEO';
import returnImage from '../assets/image.png';

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
                <a href="https://maps.app.goo.gl/V65P7a6YWds7MqNN6" target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 transition-colors p-6 rounded-xl flex flex-col items-center text-center group cursor-pointer border border-white/5 hover:border-violet-500/30">
                    <MapPin className="text-tronix-primary mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h3 className="text-white font-bold mb-2">Visit Us</h3>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">Tronix365, Near Datta Mandir<br />Sinhgad College Campus, Vadgaon Budruk<br />Pune, Maharashtra 411041</p>
                </a>
                <a href="mailto:admin@tronix365.in" className="bg-white/5 hover:bg-white/10 transition-colors p-6 rounded-xl flex flex-col items-center text-center group cursor-pointer border border-white/5 hover:border-violet-500/30">
                    <Mail className="text-tronix-primary mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h3 className="text-white font-bold mb-2">Email Us</h3>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">admin@tronix365.in<br />support@tronix365.in</p>
                </a>
                <a href="tel:+918830153805" className="bg-white/5 hover:bg-white/10 transition-colors p-6 rounded-xl flex flex-col items-center text-center group cursor-pointer border border-white/5 hover:border-violet-500/30">
                    <Phone className="text-tronix-primary mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h3 className="text-white font-bold mb-2">Call Us</h3>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">+91 88301 53805<br />Mon-Sat, 9:30am - 6:00pm</p>
                </a>
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

export const ReturnRefund = () => {
    const [openFaq, setOpenFaq] = useState(null);

    const faqs = [
        {
            q: "How can I return a damaged or faulty product?",
            a: "If you receive a damaged or faulty product, please notify us within 5 days of receiving your order. You can initiate a return by contacting our customer service team with details of the issue, and we'll guide you through the process. Remember to include the tracking number and courier details when you send the item back to us."
        },
        {
            q: "What conditions must be met for a product to be returnable?",
            a: "Products must be in their original condition and packaging, unmodified, and not subjected to neglect or misuse. Products that have been soldered, altered, or subjected to static discharge will not be accepted for return."
        },
        {
            q: "How long does it take to receive a replacement or refund?",
            a: "If your return is approved, we will ship a replacement within 2 working days. If a replacement cannot be provided, we will process a full refund, which can take between 5 to 7 business days to reflect in your account."
        },
        {
            q: "Are there any items that cannot be returned or refunded?",
            a: "Due to our strict quality policy, items that are purchased without a valid reason for return are generally not eligible for a return or refund. Please ensure you review the product specifications carefully before purchasing."
        },
        {
            q: "Can I cancel my order after it has been placed?",
            a: "Orders can only be cancelled if they are still in the \"Pending\" or \"Payment Verification\" status. Once an order progresses beyond these stages, it cannot be cancelled."
        },
        {
            q: "Are there any charges for cancelling an order?",
            a: "Yes, order cancellations may incur a 5.5% bank charge, depending on the payment method used. This is due to commissions retained by payment gateway providers even after a refund is processed."
        },
        {
            q: "Who decides on the final outcome of a refund request?",
            a: "All refund requests are subject to verification and approval by our team at TRONIX365. We reserve the right to take the final decision on all refund requests based on our assessment of the returned product and circumstances of the return."
        }
    ];

    return (
        <PageLayout 
            title="Return, Refund & Cancellation Policy"
            description="Read the comprehensive return, refund, and cancellation policies for Tronix365 products and orders."
            keywords="return policy, refund policy, order cancellation, Tronix365 policies"
        >
            <p className="text-gray-400 text-sm mb-8">Last Updated: January 2026</p>
            
            <p className="text-lg leading-relaxed mb-8">
                At <span className="text-tronix-primary font-bold">TRONIX365</span>, we assure our customers that we provide accurate descriptions and high-quality products as mentioned on our website. Please read our comprehensive return, refund, and cancellation policy below.
            </p>

            {/* Return & Refund Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-2">Return & Refund Policy</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div>
                        <h3 className="text-xl font-bold text-tronix-primary mb-4">Return Conditions</h3>
                        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
                            <li>Customers must report any damaged, mismatched, or faulty products within <strong>5 days</strong> of receiving the consignment.</li>
                            <li>Returned products will be subject to verification by our technical team.</li>
                            <li><strong>No warranty/return will apply</strong> if the product has been subject to misuse, static discharge, neglect, accidents, modifications, or has been soldered or altered in any way.</li>
                            <li>Customers are required to return the consignment properly packaged and must provide the tracking number and courier service details within the 5-day period.</li>
                        </ul>

                        <h3 className="text-xl font-bold text-tronix-primary mb-4">Refund and Replacement</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-300">
                            <li>If the returned item is verified and considered valid by our team, a replacement will be shipped within <strong>2 working days</strong>.</li>
                            <li>In cases where a replacement cannot be provided promptly (e.g., out of stock), a <strong>100% refund</strong> will be issued.</li>
                            <li>Refund processing may take up to <strong>5 - 7 business days</strong> to reflect in your account.</li>
                            <li>TRONIX365 reserves the right to take the final decision on all refund requests.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col items-center justify-center pt-4 md:pt-10">
                        <motion.div 
                            whileHover={{ scale: 1.03 }}
                            className="glass-card p-4 rounded-2xl border border-white/10 max-w-xs md:max-w-sm overflow-hidden flex items-center justify-center bg-tronix-card/25"
                        >
                            <img 
                                src={returnImage} 
                                alt="Return Packages and Shipments" 
                                className="w-full h-auto object-contain rounded-xl drop-shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                            />
                        </motion.div>
                        <p className="text-xs text-tronix-muted mt-3 text-center italic">
                            Ensure returned consignments are securely packaged.
                        </p>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-tronix-primary mt-8 mb-4">Limitations & Disclaimers</h3>
                <ul className="list-disc pl-6 space-y-3 text-gray-300">
                    <li><strong>No Reasons Return:</strong> Due to the nature of the electronic products we sell and our strict quality policy, order cancellations and returns without valid reasons are not allowed.</li>
                    <li><strong>Guarantee/Warranty:</strong> All items are delivered with standard warranty (unless otherwise specified on the product page) to protect customers from manufacturing defects. You agree to pay for return shipping on exchanges, and we will reimburse this cost upon verification of a defect.</li>
                    <li><strong>Third-Party Integration:</strong> We are not responsible for any damages or malfunctions caused by integrating our products with third-party hardware or software not explicitly recommended by us.</li>
                    <li><strong>Incorrect Usage:</strong> We do not take responsibility for damage caused due to incorrect installation, improper handling, or use beyond the recommended technical specifications.</li>
                    <li><strong>Unforeseen Circumstances:</strong> TRONIX365 is not liable for delays, damages, or failures caused by acts of God, natural disasters, transportation delays, courier mishandling, or customs issues.</li>
                    <li><strong>Limited Technical Support:</strong> Our products are intended for customers with sufficient technical knowledge. We do not offer extensive setup or debugging assistance beyond the basic documentation.</li>
                    <li><strong>Modifications:</strong> Any custom modifications or alterations to our products void all guarantees and responsibilities related to product functionality and safety.</li>
                    <li><strong>End-Use Responsibility:</strong> Customers are solely responsible for the end use of the product. TRONIX365 assumes no liability for any personal injury, property damage, or legal issues arising from use or misuse.</li>
                    <li><strong>Out of Stock:</strong> Replacements are subject to availability and may be delayed accordingly. If we cannot provide a replacement, we will issue a full refund.</li>
                </ul>
            </div>

            {/* Order Cancellation Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-2">Order Cancellation</h2>
                
                <h3 className="text-xl font-bold text-tronix-primary mt-6 mb-4">Conditions</h3>
                <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
                    <li>Orders can only be altered or cancelled if they are still in <strong>"Pending"</strong> or <strong>"Payment Verification"</strong> status.</li>
                    <li>Once an order has moved to a different status (e.g., Shipped or Processing), it cannot be altered or cancelled.</li>
                </ul>

                <h3 className="text-xl font-bold text-tronix-primary mt-6 mb-4">Cancellation Fees</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                    In some cases, order cancellation may attract a <strong>5.5% bank charge</strong>, depending on the payment method used. This is because payment gateway providers retain their transaction fees even if an order is cancelled and refunded.
                </p>
            </div>

            {/* FAQs Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-2">Frequently Asked Questions</h2>
                
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div 
                            key={index} 
                            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-300"
                        >
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left font-bold text-white hover:bg-white/5 transition-colors focus:outline-none"
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            >
                                <span>{faq.q}</span>
                                <span className="text-tronix-primary font-bold text-xl ml-4 shrink-0">
                                    {openFaq === index ? '−' : '+'}
                                </span>
                            </button>
                            {openFaq === index && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="px-6 pb-5 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-3"
                                >
                                    {faq.a}
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Need Help? / Contact Widget */}
            <div className="bg-gradient-to-r from-tronix-primary/10 to-violet-600/10 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Need Help or Have Questions?</h3>
                    <p className="text-gray-400 text-sm">Our support team is available Mon-Sat, 9:30 AM to 6:00 PM.</p>
                </div>
                <div className="flex flex-wrap gap-4 shrink-0">
                    <a 
                        href="tel:+918830153805" 
                        className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 rounded-xl border border-white/10 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Phone size={16} className="text-tronix-primary" />
                        +91 88301 53805
                    </a>
                    <a 
                        href="https://wa.me/918830153805" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold px-5 py-2.5 rounded-xl border border-[#25D366]/30 transition-colors flex items-center gap-2 text-sm"
                    >
                        WhatsApp
                    </a>
                    <a 
                        href="mailto:admin@tronix365.in" 
                        className="bg-tronix-primary hover:bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm shadow-lg shadow-tronix-primary/20"
                    >
                        <Mail size={16} />
                        admin@tronix365.in
                    </a>
                </div>
            </div>
        </PageLayout>
    );
};

