import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Factory, 
    Truck, 
    Layers, 
    ShieldCheck, 
    Clock, 
    PhoneCall, 
    FileSpreadsheet, 
    CreditCard, 
    CheckCircle, 
    ArrowRight, 
    Search,
    Split,
    Sparkles,
    Send
} from 'lucide-react';
import client from '../api/client';
import ProductCard from '../components/product/ProductCard';
import TowerOrderModal from '../components/towerOrder/TowerOrderModal';
import SEO from '../components/common/SEO';
import { Link } from 'react-router-dom';

const TowerOrdersPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTowerProducts = async () => {
            try {
                setLoading(true);
                const res = await client.get('/tower-products');
                setProducts(res.data || []);
            } catch (err) {
                console.error('Failed to load tower products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTowerProducts();
    }, []);

    const filteredProducts = products.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.skv && p.skv.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openModalForProduct = (prod = null) => {
        setSelectedProduct(prod);
        setIsModalOpen(true);
    };

    // Reopen Tower Order Modal if user just returned from logging in with a saved draft
    useEffect(() => {
        try {
            const draft = sessionStorage.getItem('tronix_tower_order_draft');
            const token = localStorage.getItem('tronix_token');
            if (draft && token) {
                setIsModalOpen(true);
            }
        } catch (e) {}
    }, []);

    const steps = [
        {
            num: '01',
            title: 'Customer Place Tower Order',
            tag: 'On Website',
            desc: 'Submit your requirement with customer details, desired quantity, and target price.',
            icon: Factory,
            color: 'from-violet-500 to-indigo-500'
        },
        {
            num: '02',
            title: 'Sales Team Will Contact You',
            tag: 'Internal Review',
            desc: 'Our technical engineering team verifies specs and negotiates with manufacturing contacts.',
            icon: PhoneCall,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            num: '03',
            title: 'Send P.I. / Quotation',
            tag: 'Official Quote',
            desc: 'We issue an official Proforma Invoice detailing agreed unit prices, taxes, and lead time.',
            icon: FileSpreadsheet,
            color: 'from-amber-500 to-yellow-500'
        },
        {
            num: '04',
            title: 'Transfer Payment',
            tag: 'NEFT / RTGS / IMPS',
            desc: 'Direct corporate bank transfer via NEFT/RTGS/IMPS with transaction reference.',
            icon: CreditCard,
            color: 'from-purple-500 to-pink-500'
        },
        {
            num: '05',
            title: 'Amount Received & Factory Arranged',
            tag: 'Production Start',
            desc: 'Upon verification, material is scheduled with manufacturing contacts and quality tested.',
            icon: CheckCircle,
            color: 'from-emerald-500 to-teal-500'
        },
        {
            num: '06',
            title: 'We Ship Material',
            tag: 'Live Tracker on Website',
            desc: '# Lead Time: Factory production days + Shipping transit days with live courier tracking.',
            icon: Truck,
            color: 'from-orange-500 to-red-500'
        },
    ];

    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-16 px-3 sm:px-6 lg:px-8 text-tronix-text">
            <SEO
                title="Tower Order & On-Demand Sourcing | Tronix365"
                description="Place Tower Orders for high-volume, custom, or made-to-order industrial electronics. Directly connected with manufacturing plants."
            />

            <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
                {/* Hero Header */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950/40 via-purple-900/20 to-[#0c0c1e] border border-violet-500/20 p-6 sm:p-14 text-center">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-3xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles size={14} className="text-amber-400" />
                            Direct Factory Connectivity
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                            Tronix365 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300">Tower Orders</span>
                        </h1>
                        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                            Need high volume, out-of-stock, or custom manufactured industrial components? Place a <strong>Tower Order</strong> with your target price. If in stock, we ship immediately; if not, we arrange it directly via our direct manufacturing contacts.
                        </p>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => openModalForProduct(null)}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-600/25 transition-all flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> Place Custom Tower Order
                            </button>
                            <a
                                href="#process"
                                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-medium text-sm transition-all"
                            >
                                How the 6-Step Process Works
                            </a>
                        </div>
                    </div>
                </div>

                {/* 6-Step Interactive Workflow */}
                <div id="process" className="space-y-8">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Transparency & Reliability</span>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">The 6-Step Tower Order Lifecycle</h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-2">
                            Step 1 and Step 6 are fully tracked on the website. Steps 2 through 5 are handled transparently by our sales & engineering team.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {steps.map((s, idx) => {
                            const IconComponent = s.icon;
                            return (
                                <div 
                                    key={idx}
                                    className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} p-2.5 text-white flex items-center justify-center shadow-lg`}>
                                                <IconComponent size={24} />
                                            </div>
                                            <span className="text-2xl font-black text-white/10 group-hover:text-violet-500/20 transition-colors font-mono">
                                                {s.num}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                                    {s.tag}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-white mt-2 group-hover:text-violet-300 transition-colors">
                                                {s.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                                {s.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 space-y-2">
                        <div className="text-violet-400 font-bold text-lg flex items-center gap-2">
                            <Split size={20} /> Smart Split Fulfillment
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Need 100 units when only 10 are in warehouse? Ship the 10 units immediately, and place a Tower Order for the remaining 90 without stalling your production.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 space-y-2">
                        <div className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                            <ShieldCheck size={20} /> Target Price Feasibility
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Propose your target budget per unit. We connect directly with original manufacturing lines to match your commercial targets for bulk quantities.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 space-y-2">
                        <div className="text-cyan-400 font-bold text-lg flex items-center gap-2">
                            <Clock size={20} /> Precise # Lead Time Tracker
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            No guessing games. Track clear timelines: Factory Production Days + Shipping Transit Days with continuous milestone status updates.
                        </p>
                    </div>
                </div>

                {/* Sourcing Catalog Section */}
                <div className="space-y-6 pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Factory On-Demand Products</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Browse electronic components eligible for Tower Orders & bulk on-demand sourcing
                            </p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs text-gray-400 mt-3">Loading sourcing catalog...</p>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="relative group">
                                    <ProductCard product={p} />
                                    <button
                                        onClick={() => openModalForProduct(p)}
                                        className="mt-2 w-full py-1.5 px-3 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-lg text-xs font-semibold border border-violet-500/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Factory size={13} /> Place Tower Order
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center bg-white/5 rounded-2xl border border-white/10 max-w-xl mx-auto p-8 space-y-4">
                            <Factory size={40} className="text-gray-500 mx-auto" />
                            <h3 className="text-base font-bold text-white">Can't Find Your Exact Part?</h3>
                            <p className="text-xs text-gray-400">
                                We source custom PCBs, microcontrollers, passives, and assemblies through our direct factory partner network.
                            </p>
                            <button
                                onClick={() => openModalForProduct(null)}
                                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors"
                            >
                                Request Custom Sourcing Quote
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tower Order Modal */}
            <TowerOrderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
                initialQty={10}
            />
        </div>
    );
};

export default TowerOrdersPage;
