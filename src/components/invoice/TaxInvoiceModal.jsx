import React, { useRef } from 'react';
import { Printer, X, Download, CheckCircle, Building2, Package, ShieldCheck, FileText } from 'lucide-react';

// Helper: Convert Indian Rupee numbers to Words
const numberToWordsINR = (num) => {
    if (!num || isNaN(num)) return 'Zero';
    const a = [
        '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
        'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'Hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else {
            str += a[n];
        }
        return str.trim();
    };

    let n = Math.floor(num);
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;

    let res = '';
    if (crore) res += inWords(crore) + ' Crore ';
    if (lakh) res += inWords(lakh) + ' Lakh ';
    if (thousand) res += inWords(thousand) + ' Thousand ';
    if (hundred) res += inWords(hundred);

    const paise = Math.round((num - Math.floor(num)) * 100);
    let paiseStr = '';
    if (paise > 0) {
        paiseStr = ` and ${inWords(paise)} Paise`;
    }

    return `Rupees ${res.trim()}${paiseStr} Only`;
};

// Category to HSN Code mapper for electronics
const getHSNCode = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('sensor')) return '9031';
    if (cat.includes('board') || cat.includes('controller') || cat.includes('ic')) return '8542';
    if (cat.includes('battery') || cat.includes('power') || cat.includes('adapter')) return '8504';
    if (cat.includes('motor') || cat.includes('servo')) return '8501';
    if (cat.includes('display') || cat.includes('screen') || cat.includes('lcd') || cat.includes('oled')) return '8528';
    if (cat.includes('wireless') || cat.includes('iot') || cat.includes('bluetooth') || cat.includes('wifi')) return '8517';
    return '8542'; // Default Electronics IC/Parts HSN
};

const TaxInvoiceModal = ({ isOpen, onClose, order }) => {
    const printRef = useRef();

    if (!isOpen || !order) return null;

    const handlePrint = () => {
        window.print();
    };

    const invoiceNumber = `TRONIX-INV-${String(order.id).padStart(6, '0')}`;
    const orderRef = `#order_tronix_${String(order.id).padStart(4, '0')}`;
    const formattedDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : new Date().toLocaleDateString('en-IN');

    // Tax & Place of supply logic
    const customerState = (order.state || '').trim().toLowerCase();
    const isMaharashtra = customerState === 'maharashtra' || customerState === 'mh' || !customerState;

    const totalAmount = parseFloat(order.total_amount || 0);
    const shippingCost = parseFloat(order.shipping_cost || 0);
    const discountAmount = parseFloat(order.discount_amount || 0);
    const gstAmount = parseFloat(order.gst_amount || 0);
    const taxableSubtotal = parseFloat(order.subtotal_before_gst || (totalAmount - shippingCost - gstAmount));

    const cgstAmount = isMaharashtra ? gstAmount / 2 : 0;
    const sgstAmount = isMaharashtra ? gstAmount / 2 : 0;
    const igstAmount = isMaharashtra ? 0 : gstAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
            {/* Print Isolation Style Block */}
            <style type="text/css">{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #tronix-tax-invoice-printable, #tronix-tax-invoice-printable * {
                        visibility: visible;
                    }
                    #tronix-tax-invoice-printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="relative w-full max-w-4xl bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden my-6 border border-gray-200 print:border-none print:shadow-none print:rounded-none print:my-0">
                {/* Modal Header Bar (Hidden in Print) */}
                <div className="no-print bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base">GST Tax Invoice Preview</h3>
                            <p className="text-xs text-gray-400">Order Ref: {orderRef} | {invoiceNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <Printer size={16} />
                            <span>Print / Save as PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* A4 Printable Document Area */}
                <div id="tronix-tax-invoice-printable" ref={printRef} className="p-6 sm:p-10 bg-white text-gray-800 text-xs sm:text-sm">
                    {/* Header Row: Company Info & Tax Invoice Title */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-900 pb-5 mb-5 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-extrabold text-2xl tracking-wider text-slate-900">
                                    TRONIX<span className="text-violet-600">365</span>
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase">
                                    Verified Store
                                </span>
                            </div>
                            <p className="font-bold text-gray-900 text-sm">Tronix365 Technologies Private Limited</p>
                            <p className="text-gray-600 text-xs max-w-sm mt-0.5">
                                Plot No. 12, Electronics Tech Zone, Hinjawadi Phase 1,<br />
                                Pune, Maharashtra - 411057, India
                            </p>
                            <p className="text-gray-600 text-xs mt-1">
                                <strong>GSTIN:</strong> 27AABCT3650Q1Z5 &nbsp;|&nbsp; <strong>State Code:</strong> 27 (Maharashtra)
                            </p>
                            <p className="text-gray-600 text-xs">
                                <strong>Email:</strong> support@tronix365.in &nbsp;|&nbsp; <strong>Web:</strong> www.tronix365.in
                            </p>
                        </div>

                        <div className="sm:text-right">
                            <h1 className="text-2xl sm:text-3xl font-black uppercase text-gray-900 tracking-tight">
                                TAX INVOICE
                            </h1>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                                (Original for Recipient)
                            </p>
                            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 inline-block sm:text-right space-y-1">
                                <p className="text-xs text-gray-600">
                                    <strong>Invoice No:</strong> <span className="font-mono text-gray-900 font-bold">{invoiceNumber}</span>
                                </p>
                                <p className="text-xs text-gray-600">
                                    <strong>Invoice Date:</strong> {formattedDate}
                                </p>
                                <p className="text-xs text-gray-600">
                                    <strong>Order ID:</strong> {orderRef}
                                </p>
                                <p className="text-xs text-gray-600">
                                    <strong>Place of Supply:</strong> {order.state || 'Maharashtra (27)'}
                                </p>
                                {order.txnid && (
                                    <p className="text-xs text-gray-600 font-mono">
                                        <strong>Txn Ref:</strong> {order.txnid}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer & Billing Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-5 mb-5 border-b border-gray-200">
                        {/* Bill To */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                                <Building2 size={14} className="text-violet-600" />
                                {order.is_gst_invoice ? 'B2B Customer & Tax Billing' : 'Billed To'}
                            </h2>
                            {order.is_gst_invoice && order.company_name ? (
                                <>
                                    <p className="font-bold text-gray-900 text-sm">{order.company_name}</p>
                                    <p className="text-xs text-gray-700 font-semibold mt-0.5">
                                        GSTIN: <span className="font-mono text-violet-700 font-bold">{order.gstin}</span>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {order.company_address || order.address_line}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Contact: {order.full_name} ({order.phone || 'N/A'})
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-gray-900 text-sm">{order.full_name || 'Retail Customer'}</p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {order.address_line}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {order.city}, {order.state} - {order.pincode}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        <strong>Phone:</strong> {order.phone || 'N/A'} &nbsp;|&nbsp; <strong>Email:</strong> {order.customer_email || 'N/A'}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Ship To */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                                <Package size={14} className="text-emerald-600" />
                                Shipped To
                            </h2>
                            <p className="font-bold text-gray-900 text-sm">{order.full_name || 'N/A'}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {order.address_line}
                            </p>
                            <p className="text-xs text-gray-600">
                                {order.city}, {order.state} - {order.pincode}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                <strong>Logistics Partner:</strong> {order.courier || 'Standard Courier'}
                                {order.tracking_number ? ` (${order.tracking_number})` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900 text-white text-[11px] uppercase tracking-wider">
                                    <th className="py-2.5 px-3 rounded-l-lg">#</th>
                                    <th className="py-2.5 px-3">Item Description</th>
                                    <th className="py-2.5 px-3 text-center">HSN</th>
                                    <th className="py-2.5 px-3 text-center">Qty</th>
                                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                                    <th className="py-2.5 px-3 text-right">Taxable</th>
                                    {isMaharashtra ? (
                                        <>
                                            <th className="py-2.5 px-2 text-right">CGST (9%)</th>
                                            <th className="py-2.5 px-2 text-right">SGST (9%)</th>
                                        </>
                                    ) : (
                                        <th className="py-2.5 px-2 text-right">IGST (18%)</th>
                                    )}
                                    <th className="py-2.5 px-3 text-right rounded-r-lg">Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {order.items && order.items.map((item, index) => {
                                    const qty = item.quantity || 1;
                                    const price = item.price_at_purchase || (item.product && item.product.price) || 0;
                                    const itemTaxable = (price * qty) / 1.18; // approx taxable before 18% GST
                                    const itemCgst = isMaharashtra ? itemTaxable * 0.09 : 0;
                                    const itemSgst = isMaharashtra ? itemTaxable * 0.09 : 0;
                                    const itemIgst = isMaharashtra ? 0 : itemTaxable * 0.18;
                                    const itemTotal = price * qty;
                                    const hsn = getHSNCode(item.product?.category);

                                    return (
                                        <tr key={index} className="hover:bg-gray-50/50 text-xs">
                                            <td className="py-3 px-3 text-gray-500">{index + 1}</td>
                                            <td className="py-3 px-3 font-semibold text-gray-900">
                                                {item.product?.title || `Product ID: ${item.product_id}`}
                                                {item.product?.skv && (
                                                    <span className="block text-[10px] text-gray-500 font-mono">
                                                        SKU: {item.product.skv}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center text-gray-600 font-mono">{hsn}</td>
                                            <td className="py-3 px-3 text-center font-bold text-gray-900">{qty}</td>
                                            <td className="py-3 px-3 text-right text-gray-700">
                                                ₹{(price / 1.18).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-3 text-right text-gray-700">
                                                ₹{itemTaxable.toFixed(2)}
                                            </td>
                                            {isMaharashtra ? (
                                                <>
                                                    <td className="py-3 px-2 text-right text-gray-600">
                                                        ₹{itemCgst.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-2 text-right text-gray-600">
                                                        ₹{itemSgst.toFixed(2)}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="py-3 px-2 text-right text-gray-600">
                                                    ₹{itemIgst.toFixed(2)}
                                                </td>
                                            )}
                                            <td className="py-3 px-3 text-right font-bold text-gray-900">
                                                ₹{itemTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary & Amount in Words */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t-2 border-gray-900 mb-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Amount in Words (INR)
                            </p>
                            <p className="text-sm font-extrabold text-gray-900 italic bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {numberToWordsINR(totalAmount)}
                            </p>

                            <div className="mt-4 text-xs text-gray-500 space-y-1">
                                <p><strong>Payment Status:</strong> Paid / Electronic Confirmation</p>
                                <p><strong>Reverse Charge Applicable:</strong> No</p>
                                <p><strong>HSN Summary:</strong> Electronic Components & Microcontrollers (GST 18%)</p>
                            </div>
                        </div>

                        {/* Totals Table */}
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between text-gray-600">
                                <span>Taxable Amount (Goods Subtotal):</span>
                                <span className="font-mono font-medium">₹{taxableSubtotal.toFixed(2)}</span>
                            </div>
                            {isMaharashtra ? (
                                <>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Central GST (CGST 9%):</span>
                                        <span className="font-mono font-medium">₹{cgstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>State GST (SGST 9%):</span>
                                        <span className="font-mono font-medium">₹{sgstAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-gray-600">
                                    <span>Integrated GST (IGST 18%):</span>
                                    <span className="font-mono font-medium">₹{igstAmount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600">
                                <span>Shipping & Logistics Fee:</span>
                                <span className="font-mono font-medium">
                                    {shippingCost > 0 ? `₹${shippingCost.toFixed(2)}` : 'FREE (₹0.00)'}
                                </span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>Discount Voucher ({order.coupon_code || 'PROMO'}):</span>
                                    <span className="font-mono">- ₹{discountAmount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t-2 border-gray-900">
                                <span>Invoice Total:</span>
                                <span className="font-mono text-lg text-slate-950">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Digital Signature */}
                    <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-[11px] text-gray-500">
                        <div className="max-w-md space-y-1">
                            <p className="font-bold text-gray-700">Terms & Conditions:</p>
                            <p>1. Goods once sold are covered under a 7-day warranty against manufacturing defects.</p>
                            <p>2. Components with soldered headers, altered firmware, or physical damage cannot be returned.</p>
                            <p>3. This is a computer-generated tax invoice and requires no physical signature.</p>
                        </div>

                        <div className="text-center sm:text-right">
                            <div className="inline-block border border-emerald-500/30 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold mb-2">
                                <ShieldCheck size={14} className="inline mr-1 text-emerald-600" />
                                Computer Generated Document
                            </div>
                            <p className="font-bold text-gray-900">For Tronix365 Technologies Pvt. Ltd.</p>
                            <p className="text-[10px] text-gray-500">Authorized Signatory</p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions (Hidden in Print) */}
                <div className="no-print bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-emerald-500" />
                        Valid tax document for input credit (ITC) and institutional claims.
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print / Save PDF</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxInvoiceModal;
