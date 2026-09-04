import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Factory, 
    PhoneCall, 
    FileSpreadsheet, 
    CreditCard, 
    CheckCircle, 
    Truck, 
    Clock, 
    User, 
    MapPin, 
    ExternalLink, 
    DollarSign,
    Save,
    Calendar,
    AlertCircle
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';

const TowerOrderAdminModal = ({ 
    isOpen, 
    onClose, 
    order, 
    onOrderUpdated 
}) => {
    if (!isOpen || !order) return null;

    const [activeSection, setActiveSection] = useState('overview'); // overview, sales, quote, payment, shipment
    const [loading, setLoading] = useState(false);

    // Form states
    const [salesNotes, setSalesNotes] = useState(order.sales_rep_notes || '');
    const [orderStatus, setOrderStatus] = useState(order.status || 'requested');

    // Quotation (Step 3)
    const [quotedPrice, setQuotedPrice] = useState(order.quoted_unit_price || order.target_price || 0);
    const [quotedTotal, setQuotedTotal] = useState(order.quoted_total_amount || (order.target_price * order.requested_qty) || 0);
    const [piNumber, setPiNumber] = useState(order.pi_number || `PI-${order.order_number}`);
    const [factoryLead, setFactoryLead] = useState(order.factory_lead_days || 7);
    const [shippingLead, setShippingLead] = useState(order.shipping_lead_days || 3);
    const [piFileUrl, setPiFileUrl] = useState(order.pi_file_url || '');
    const [quoteNotes, setQuoteNotes] = useState(order.quotation_notes || '100% advance via NEFT/RTGS prior to factory procurement dispatch.');

    // Payment (Step 5)
    const [verifiedAmount, setVerifiedAmount] = useState(order.payment_amount_received || quotedTotal || 0);

    // Shipment (Step 6)
    const [courierName, setCourierName] = useState(order.courier_name || 'BlueDart Express');
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
    const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || '');
    const [estDeliveryDate, setEstDeliveryDate] = useState(order.estimated_delivery_date || '');

    useEffect(() => {
        if (order) {
            setSalesNotes(order.sales_rep_notes || '');
            setOrderStatus(order.status || 'requested');
            setQuotedPrice(order.quoted_unit_price || order.target_price || 0);
            setQuotedTotal(order.quoted_total_amount || Math.round(Number(order.target_price || 0) * Number(order.requested_qty || 0)));
            setPiNumber(order.pi_number || `PI-${order.order_number}`);
            setFactoryLead(order.factory_lead_days || 7);
            setShippingLead(order.shipping_lead_days || 3);
            setPiFileUrl(order.pi_file_url || '');
            setQuoteNotes(order.quotation_notes || '100% advance via NEFT/RTGS prior to factory procurement dispatch.');
            setVerifiedAmount(order.payment_amount_received || order.quoted_total_amount || (order.target_price * order.requested_qty) || 0);
            setCourierName(order.courier_name || 'BlueDart Express');
            setTrackingNumber(order.tracking_number || '');
            setTrackingUrl(order.tracking_url || '');
            setEstDeliveryDate(order.estimated_delivery_date || '');
        }
    }, [order]);

    // Recalculate quoted total when price changes
    const handleQuotedPriceChange = (price) => {
        setQuotedPrice(price);
        setQuotedTotal(Math.round(Number(price) * Number(order.requested_qty)));
    };

    const broadcastTowerOrderUpdate = (orderId, newStatus) => {
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const ch = new BroadcastChannel('tronix_tower_orders_channel');
                ch.postMessage({ type: 'ORDER_STATUS_CHANGED', orderId, status: newStatus, timestamp: Date.now() });
                ch.close();
            }
        } catch (e) {
            // ignore
        }
        try {
            localStorage.setItem('tronix_tower_order_update_trigger', `${orderId}_${newStatus}_${Date.now()}`);
        } catch (e) {
            // ignore
        }
    };

    // Step 2 Action: Update Status & Sales Notes
    const handleSaveSalesNotes = async () => {
        try {
            setLoading(true);
            const res = await client.put(`/admin/tower-orders/${order.id}/status`, {
                status: orderStatus,
                sales_rep_notes: salesNotes
            });
            toast.success("Sales review notes updated!");
            broadcastTowerOrderUpdate(order.id, res.data.status);
            onOrderUpdated(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    // Step 3 Action: Issue Quotation
    const handleIssueQuotation = async () => {
        if (!quotedPrice || quotedPrice <= 0) {
            toast.error("Please specify a valid quoted price");
            return;
        }

        try {
            setLoading(true);
            const res = await client.put(`/admin/tower-orders/${order.id}/quotation`, {
                pi_number: piNumber,
                quoted_unit_price: Number(quotedPrice),
                quoted_total_amount: Number(quotedTotal),
                quotation_notes: quoteNotes,
                pi_file_url: piFileUrl || null,
                factory_lead_days: Number(factoryLead),
                shipping_lead_days: Number(shippingLead),
            });
            toast.success("Quotation & Proforma Invoice issued!");
            broadcastTowerOrderUpdate(order.id, res.data.status);
            onOrderUpdated(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to issue quotation");
        } finally {
            setLoading(false);
        }
    };

    // Step 5 Action: Verify NEFT/RTGS Payment
    const handleVerifyPayment = async () => {
        if (!verifiedAmount || verifiedAmount <= 0) {
            toast.error("Please enter the confirmed amount received");
            return;
        }

        try {
            setLoading(true);
            const res = await client.put(`/admin/tower-orders/${order.id}/verify-payment`, {
                payment_amount_received: Number(verifiedAmount),
                payment_status: "verified",
                status: "in_production"
            });
            toast.success("Payment confirmed! Order moved to In-Production / Factory Sourcing.");
            broadcastTowerOrderUpdate(order.id, res.data.status);
            onOrderUpdated(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to verify payment");
        } finally {
            setLoading(false);
        }
    };

    // Step 6 Action: Ship Material
    const handleSaveShipment = async () => {
        if (!trackingNumber.trim()) {
            toast.error("Please enter the courier tracking number");
            return;
        }

        try {
            setLoading(true);
            const res = await client.put(`/admin/tower-orders/${order.id}/shipment`, {
                courier_name: courierName,
                tracking_number: trackingNumber.trim(),
                tracking_url: trackingUrl || null,
                estimated_delivery_date: estDeliveryDate || null,
                status: "shipped"
            });
            toast.success("Material marked as Shipped with live tracker updated!");
            broadcastTowerOrderUpdate(order.id, res.data.status);
            onOrderUpdated(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update shipment");
        } finally {
            setLoading(false);
        }
    };

    const stepIndexMap = {
        'requested': 1,
        'contacted': 2,
        'quotation_sent': 3,
        'payment_pending': 4,
        'payment_received': 5,
        'in_production': 5,
        'shipped': 6,
        'delivered': 6
    };
    const currentStep = stepIndexMap[order.status] || 1;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121226] border border-violet-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative text-white max-h-[92vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-900/40 to-indigo-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                            <Factory size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white font-mono">
                                    {order.order_number}
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    order.status === 'shipped' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                    order.status === 'in_production' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                                    order.status === 'quotation_sent' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                    order.status === 'payment_pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                    'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                }`}>
                                    Step {currentStep}: {order.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Customer: <strong>{order.customer_name}</strong> {order.company_name ? `• ${order.company_name}` : ''} • Ph: {order.customer_phone}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper Navigation */}
                <div className="px-6 py-2.5 bg-black/30 border-b border-white/5 flex gap-2 overflow-x-auto text-xs">
                    {[
                        { id: 'overview', label: '1. Order Overview', icon: Factory },
                        { id: 'sales', label: '2. Sales Contact', icon: PhoneCall },
                        { id: 'quote', label: '3. P.I. / Quotation', icon: FileSpreadsheet },
                        { id: 'payment', label: '4 & 5. Payment Verify', icon: CreditCard },
                        { id: 'shipment', label: '6. Shipment & Lead Time', icon: Truck },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSection === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id)}
                                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                    isActive 
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon size={14} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {/* SECTION 1: OVERVIEW */}
                    {activeSection === 'overview' && (
                        <div className="space-y-6">
                            {/* Product & Quantities Card */}
                            <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {order.product_image && (
                                        <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            <img src={order.product_image} alt="" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-white text-base">{order.product_name}</h4>
                                        <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                                            {order.product_sku && <span>SKU: <strong className="text-gray-200 font-mono">{order.product_sku}</strong></span>}
                                            <span>Requested Qty: <strong className="text-white">{order.requested_qty} units</strong></span>
                                        </div>
                                        {order.immediate_qty > 0 && (
                                            <div className="mt-2 text-xs font-semibold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 inline-block">
                                                Split Requirement: {order.immediate_qty} Immediate in-stock + {order.backorder_qty} Factory Backorder
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                                    <div className="text-xs text-gray-400">Customer Target Price</div>
                                    <div className="text-xl font-bold text-tronix-accent">₹{order.target_price} / unit</div>
                                    <div className="text-xs font-bold text-emerald-400">Total Budget: ₹{order.target_total?.toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Customer & Delivery Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                    <div className="text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                        <User size={14} /> Customer Contact
                                    </div>
                                    <div>Name: <strong className="text-white">{order.customer_name}</strong></div>
                                    <div>Email: <strong className="text-white">{order.customer_email}</strong></div>
                                    <div>Phone: <strong className="text-white">{order.customer_phone}</strong></div>
                                    {order.company_name && <div>Company: <strong className="text-white">{order.company_name}</strong></div>}
                                    {order.gstin && <div>GSTIN: <strong className="text-white font-mono">{order.gstin}</strong></div>}
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                    <div className="text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                        <MapPin size={14} /> Delivery Destination
                                    </div>
                                    <div>Address: <span className="text-gray-300">{order.delivery_address || 'Not specified'}</span></div>
                                    <div>City: <span className="text-gray-300">{order.delivery_city || '-'}, {order.delivery_state || '-'}</span></div>
                                    <div>Pincode: <span className="text-white font-mono">{order.delivery_pincode || '-'}</span></div>
                                    {order.required_by_date && (
                                        <div className="text-amber-400 pt-1">
                                            Required By: <strong>{order.required_by_date}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {order.customer_notes && (
                                <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-xs space-y-1">
                                    <div className="font-bold text-gray-300">Customer Project Notes / Specifications:</div>
                                    <p className="text-gray-400 italic">"{order.customer_notes}"</p>
                                </div>
                            )}

                            {/* Quick Action Bar */}
                            <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between">
                                <div className="text-xs text-gray-300">
                                    Current Stage: <strong>Step {currentStep} ({order.status})</strong>
                                </div>
                                <button
                                    onClick={() => setActiveSection(currentStep === 1 ? 'sales' : currentStep === 2 ? 'quote' : currentStep === 3 ? 'payment' : 'shipment')}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5"
                                >
                                    Proceed to Next Action →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: SALES CONTACT */}
                    {activeSection === 'sales' && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                                <div className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                                    <PhoneCall size={16} /> Step 2: Sales Team Will Contact Customer
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Contact customer via phone <strong>({order.customer_phone})</strong> or email <strong>({order.customer_email})</strong> to discuss part specifications, target price feasibility, and factory MOQ.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Workflow Status</label>
                                    <select
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="w-full sm:w-64 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-xs"
                                    >
                                        <option value="requested">1. Requested (New)</option>
                                        <option value="contacted">2. Contacted (Under Sales Review)</option>
                                        <option value="quotation_sent">3. Quotation Sent</option>
                                        <option value="payment_pending">4. Payment Pending</option>
                                        <option value="in_production">5. In Production / Sourcing</option>
                                        <option value="shipped">6. Shipped</option>
                                        <option value="delivered">Completed / Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Sales Engineering Discussion Notes
                                    </label>
                                    <textarea
                                        rows="4"
                                        placeholder="Enter customer call outcome, part specifications discussed, manufacturing supplier feedback..."
                                        value={salesNotes}
                                        onChange={(e) => setSalesNotes(e.target.value)}
                                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500"
                                    />
                                </div>

                                {order.contacted_at && (
                                    <div className="text-[11px] text-gray-400">
                                        First Contacted At: <span className="text-white">{new Date(order.contacted_at).toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSaveSalesNotes}
                                        disabled={loading}
                                        className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/25"
                                    >
                                        <Save size={14} /> Save Sales Notes & Status
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: PROFORMA INVOICE / QUOTATION */}
                    {activeSection === 'quote' && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                                <div className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                                    <FileSpreadsheet size={16} /> Step 3: Send P.I. / Quotation
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Finalize the negotiated unit price, lead time breakdown, and upload or provide the Proforma Invoice reference.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Customer Target Price</label>
                                    <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 text-gray-400 font-bold">
                                        ₹{order.target_price} / unit
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Final Quoted Price (₹ / unit) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={quotedPrice}
                                        onChange={(e) => handleQuotedPriceChange(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-sm focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Final Quoted Total Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={quotedTotal}
                                        onChange={(e) => setQuotedTotal(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Proforma Invoice (P.I.) Number</label>
                                    <input
                                        type="text"
                                        value={piNumber}
                                        onChange={(e) => setPiNumber(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Factory Lead Time (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={factoryLead}
                                        onChange={(e) => setFactoryLead(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Shipping Transit (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={shippingLead}
                                        onChange={(e) => setShippingLead(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold"
                                    />
                                </div>
                            </div>

                            <div className="text-xs space-y-3">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">P.I. PDF Document URL (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="https://... /uploads/pi-1001.pdf"
                                        value={piFileUrl}
                                        onChange={(e) => setPiFileUrl(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Quotation / Payment Terms</label>
                                    <input
                                        type="text"
                                        value={quoteNotes}
                                        onChange={(e) => setQuoteNotes(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleIssueQuotation}
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/25"
                                >
                                    <FileSpreadsheet size={14} /> Issue Quotation & Proforma Invoice
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4 & 5: PAYMENT VERIFICATION */}
                    {activeSection === 'payment' && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                                <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                                    <CreditCard size={16} /> Step 4 & 5: Money Transfer & Amount Received
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Customer transfers funds via NEFT / RTGS / IMPS. Verify bank statement transaction reference and confirm amount received to initiate factory manufacturing.
                                </p>
                            </div>

                            {/* Customer Submitted Transfer Details */}
                            <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2 text-xs">
                                <div className="font-bold text-gray-300 uppercase text-[11px]">Customer Submitted Bank Proof</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                    <div>Transfer Mode: <strong className="text-white">{order.payment_mode || 'Not submitted yet'}</strong></div>
                                    <div className="sm:col-span-2">UTR Reference: <strong className="text-amber-400 font-mono">{order.payment_ref_utr || 'Awaiting customer entry'}</strong></div>
                                </div>
                                {order.payment_receipt_url && (
                                    <div className="pt-1">
                                        <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline flex items-center gap-1">
                                            View Customer Receipt Attachment <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Amount Confirmation Form */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-1">Confirmed Amount Received (₹) *</label>
                                        <input
                                            type="number"
                                            value={verifiedAmount}
                                            onChange={(e) => setVerifiedAmount(e.target.value)}
                                            className="w-full p-2.5 bg-black/30 border border-emerald-500/40 rounded-xl text-emerald-400 font-bold text-base focus:outline-none"
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 flex flex-col justify-center">
                                        <span>Quoted Order Total: <strong>₹{order.quoted_total_amount || (order.target_price * order.requested_qty)}</strong></span>
                                        <span className="mt-1">Confirming funds will automatically transition order to <strong>In Production / Factory Sourcing</strong> and schedule lead times.</span>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleVerifyPayment}
                                        disabled={loading}
                                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25"
                                    >
                                        <CheckCircle size={14} /> Confirm Amount Received & Start Factory Sourcing
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 6: SHIPMENT & LEAD TIME */}
                    {activeSection === 'shipment' && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                                <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                                    <Truck size={16} /> Step 6: We Will Ship Material (# Lead Time Tracker)
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Dispatch consignment and provide courier tracking link for the customer's live website tracker.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Courier Service Provider *</label>
                                    <input
                                        type="text"
                                        value={courierName}
                                        onChange={(e) => setCourierName(e.target.value)}
                                        placeholder="e.g. BlueDart, Delhivery, DTDC"
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Tracking / AWB Number *</label>
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="e.g. BD987654321IN"
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Live Tracking URL</label>
                                    <input
                                        type="text"
                                        value={trackingUrl}
                                        onChange={(e) => setTrackingUrl(e.target.value)}
                                        placeholder="https://track.bluedart.com/..."
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Estimated Delivery Date</label>
                                    <input
                                        type="date"
                                        value={estDeliveryDate}
                                        onChange={(e) => setEstDeliveryDate(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSaveShipment}
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25"
                                >
                                    <Truck size={14} /> Dispatch Consignment & Update Live Tracker
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default TowerOrderAdminModal;
