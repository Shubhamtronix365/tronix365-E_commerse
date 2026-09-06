import React from 'react';
import { 
    Factory, 
    Truck, 
    Clock, 
    FileSpreadsheet, 
    CreditCard, 
    CheckCircle, 
    ExternalLink 
} from 'lucide-react';

const TowerOrdersSection = ({
    towerOrders,
    towerLoading,
    towerFilter,
    setTowerFilter,
    navigate,
    recentlyUpdatedOrderId,
    activePaymentOrderId,
    setActivePaymentOrderId,
    paymentForm,
    setPaymentForm,
    handlePaymentSubmit,
    submittingPayment,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tronix-card border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
                            <Factory size={22} />
                        </div>
                        Tower Orders & Sourcing Pipeline
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        Track your custom bulk orders, factory lead times, Proforma Invoices, and procurement stages.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/tower-orders')}
                    className="relative z-10 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-violet-600/25 transition-all"
                >
                    <Factory size={16} /> Place New Tower Order
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
                {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'requested', label: 'Requested' },
                    { id: 'contacted', label: 'Under Review' },
                    { id: 'quotation_sent', label: 'Quotation Ready' },
                    { id: 'payment_pending', label: 'Payment Pending' },
                    { id: 'in_production', label: 'In Production' },
                    { id: 'shipped', label: 'Shipped' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setTowerFilter(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            towerFilter === tab.id
                                ? 'bg-violet-600 text-white shadow-md'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {towerLoading ? (
                <div className="p-12 text-center bg-white/5 border border-white/10 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-2">Loading your tower orders...</p>
                </div>
            ) : towerOrders.filter(o => towerFilter === 'all' || o.status === towerFilter).length === 0 ? (
                <div className="p-12 text-center bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <Factory size={44} className="mx-auto text-gray-500" />
                    <div>
                        <h3 className="text-lg font-bold text-white">No Tower Orders Found</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                            You have not placed any on-demand sourcing or bulk Tower Orders {towerFilter !== 'all' ? `with status '${towerFilter}'` : 'yet'}.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/tower-orders')}
                        className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors"
                    >
                        Explore Tower Orders & Sourcing
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {towerOrders
                        .filter(o => towerFilter === 'all' || o.status === towerFilter)
                        .map(order => {
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
                                <div
                                    key={order.id}
                                    className={`p-6 rounded-2xl bg-white/5 border transition-all duration-500 space-y-6 shadow-xl ${
                                        recentlyUpdatedOrderId === order.id
                                            ? 'border-violet-400 ring-2 ring-violet-500/60 shadow-violet-500/25 bg-violet-950/20 animate-pulse'
                                            : 'border-white/10 hover:border-violet-500/30'
                                    }`}
                                >
                                    {/* Header Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                                                <Factory size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-white text-base tracking-wide">
                                                        {order.order_number}
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-400">
                                                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    Target Price: <strong className="text-tronix-accent">₹{order.target_price}/unit</strong> (Total Budget: ₹{order.target_total?.toLocaleString('en-IN')})
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                order.status === 'shipped' || order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                order.status === 'in_production' || order.status === 'payment_received' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                                                order.status === 'quotation_sent' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                order.status === 'payment_pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                                order.status === 'contacted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                            }`}>
                                                Step {currentStep}: {order.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Product Details & Split fulfillment info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2 flex items-start gap-4">
                                            {order.product_image && (
                                                <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    <img src={order.product_image} alt="" className="max-h-full max-w-full object-contain" />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <h4 className="text-white font-bold text-sm line-clamp-1">{order.product_name}</h4>
                                                {order.product_sku && <p className="text-xs text-gray-400">SKU: <span className="font-mono text-gray-300">{order.product_sku}</span></p>}
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold text-xs">
                                                        Total Qty: {order.requested_qty} units
                                                    </span>
                                                    {order.immediate_qty > 0 && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                                                            Split: {order.immediate_qty} Immediate + {order.backorder_qty} Factory Backorder
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1 text-xs text-gray-400">
                                            <div className="text-gray-300 font-semibold text-[11px] uppercase">Destination</div>
                                            <div>{order.customer_name} {order.company_name ? `(${order.company_name})` : ''}</div>
                                            <div className="truncate">{order.delivery_city || 'City'}, {order.delivery_pincode || ''}</div>
                                            <div>Ph: {order.customer_phone}</div>
                                        </div>
                                    </div>

                                    {/* The 6-Step Visual Milestone Tracker */}
                                    <div className="pt-2">
                                        <div className="text-[11px] font-bold text-gray-400 uppercase mb-3 flex items-center justify-between">
                                            <span>Order Progress Lifecycle</span>
                                            <span className="text-violet-400">Step {currentStep} of 6</span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {[
                                                { num: 1, name: '1. Placed', desc: 'Website Order' },
                                                { num: 2, name: '2. Contact', desc: 'Sales Review' },
                                                { num: 3, name: '3. Quotation', desc: 'P.I. Ready' },
                                                { num: 4, name: '4. Transfer', desc: 'NEFT/RTGS' },
                                                { num: 5, name: '5. Sourcing', desc: 'Factory Direct' },
                                                { num: 6, name: '6. Shipped', desc: 'Lead Tracker' },
                                            ].map(s => {
                                                const isCompleted = currentStep > s.num;
                                                const isCurrent = currentStep === s.num;
                                                return (
                                                    <div
                                                        key={s.num}
                                                        className={`p-2.5 rounded-xl text-center border transition-all ${
                                                            isCurrent ? 'bg-violet-600/30 border-violet-500 text-white ring-2 ring-violet-500/20' :
                                                            isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                                            'bg-white/5 border-white/5 text-gray-500'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-bold">{s.name}</div>
                                                        <div className="text-[10px] mt-0.5 opacity-80">{s.desc}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Step 6 Lead Time Tracker */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-black/20 border border-violet-500/30 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-violet-300 font-bold text-xs uppercase tracking-wide">
                                                <Truck size={16} /> # Lead Time Tracker (Factory + Shipping Time)
                                            </div>
                                            <div className="text-xs text-gray-300 font-mono">
                                                🏭 {order.factory_lead_days || 7}d Factory + 🚚 {order.shipping_lead_days || 3}d Transit
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-gray-400 text-[10px]">Estimated Dispatch</div>
                                                <div className="font-bold text-white mt-0.5">
                                                    {order.estimated_dispatch_date || (order.payment_status === 'verified' ? 'In Factory Production' : 'Pending Payment Verification')}
                                                </div>
                                            </div>
                                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-gray-400 text-[10px]">Estimated Delivery</div>
                                                <div className="font-bold text-white mt-0.5">
                                                    {order.estimated_delivery_date || 'Calculated on Dispatch'}
                                                </div>
                                            </div>
                                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-gray-400 text-[10px]">Courier Partner</div>
                                                <div className="font-bold text-emerald-400 mt-0.5">
                                                    {order.courier_name || 'Assigned on Dispatch'}
                                                </div>
                                            </div>
                                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-gray-400 text-[10px]">Tracking Number</div>
                                                <div className="font-bold font-mono text-white mt-0.5">
                                                    {order.tracking_number || 'Awaiting Shipment'}
                                                </div>
                                            </div>
                                        </div>

                                        {order.tracking_url && (
                                            <div className="pt-1 flex justify-end">
                                                <a
                                                    href={order.tracking_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
                                                >
                                                    <Truck size={14} /> Live Track Consignment <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 3 & 4: Quotation & Payment Details */}
                                    {order.quoted_unit_price ? (
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                                <div>
                                                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                                        <FileSpreadsheet size={15} /> Proforma Invoice & Official Quotation
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        P.I. Number: <strong className="text-white font-mono">{order.pi_number}</strong>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">Final Quoted Price</div>
                                                    <div className="text-lg font-bold text-tronix-accent">
                                                        ₹{order.quoted_unit_price} / unit
                                                    </div>
                                                    <div className="text-xs font-bold text-emerald-400">
                                                        Total: ₹{order.quoted_total_amount?.toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bank Details for NEFT/RTGS */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                                                    <div className="font-bold text-gray-300 uppercase text-[10px]">Beneficiary Bank Details (NEFT / RTGS / IMPS)</div>
                                                    <div className="text-gray-400">Account Name: <strong className="text-white">Tronix365 Technologies Pvt Ltd</strong></div>
                                                    <div className="text-gray-400">Bank: <strong className="text-white">HDFC Bank Ltd</strong></div>
                                                    <div className="text-gray-400">Account No: <strong className="text-white font-mono">50200088912345</strong></div>
                                                    <div className="text-gray-400">IFSC Code: <strong className="text-white font-mono">HDFC0001234</strong></div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col justify-between">
                                                    <div>
                                                        <div className="font-bold text-gray-300 uppercase text-[10px]">Payment Verification Status</div>
                                                        <div className="mt-1 text-xs">
                                                            {order.payment_status === 'verified' ? (
                                                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                                    <CheckCircle size={14} /> Amount Verified (₹{order.payment_amount_received}). In Production.
                                                                </span>
                                                            ) : order.payment_status === 'submitted' ? (
                                                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                                                    <Clock size={14} /> UTR '{order.payment_ref_utr}' Submitted. Verifying...
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 flex items-center gap-1">
                                                                    <CreditCard size={14} /> Awaiting NEFT/RTGS transfer confirmation
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {order.payment_status !== 'verified' && (
                                                        <button
                                                            onClick={() => setActivePaymentOrderId(activePaymentOrderId === order.id ? null : order.id)}
                                                            className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold underline text-left"
                                                        >
                                                            {activePaymentOrderId === order.id ? 'Cancel Reference Entry' : 'Submit / Update UTR Reference'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Submit Payment Proof Form */}
                                            {activePaymentOrderId === order.id && (
                                                <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-500/30 space-y-3">
                                                    <div className="font-bold text-xs text-white">Record Bank Transfer (NEFT / RTGS / IMPS)</div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                                        <div>
                                                            <label className="block text-gray-400 text-[11px] mb-1">Transfer Mode</label>
                                                            <select
                                                                value={paymentForm.mode}
                                                                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs"
                                                            >
                                                                <option value="NEFT">NEFT</option>
                                                                <option value="RTGS">RTGS</option>
                                                                <option value="IMPS">IMPS</option>
                                                                <option value="UPI">UPI / NetBanking</option>
                                                            </select>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-gray-400 text-[11px] mb-1">Transaction UTR / Reference No. *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="e.g. HDFCN26090400123"
                                                                value={paymentForm.utr}
                                                                onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })}
                                                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <button
                                                            onClick={() => setActivePaymentOrderId(null)}
                                                            className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handlePaymentSubmit(order.id)}
                                                            disabled={submittingPayment}
                                                            className="px-5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md"
                                                        >
                                                            {submittingPayment ? 'Submitting...' : 'Confirm Payment Transfer'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-400 flex items-center gap-2">
                                            <Clock size={16} className="text-violet-400 flex-shrink-0" />
                                            <span>Our sales engineering team is reviewing your requirement and will generate the official P.I. / Quotation shortly.</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};

export default TowerOrdersSection;
