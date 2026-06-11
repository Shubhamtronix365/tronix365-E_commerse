import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';

const Invoice = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await client.get(`/orders/${id}`);
                setOrder(res.data);

                // Print dialog automatically when data is loaded
                setTimeout(() => window.print(), 500);
            } catch (error) {
                console.error("Invoice fetch error:", error);
                toast.error("Failed to load invoice");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading invoice...</div>;
    }

    if (!order) {
        return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Invoice not found</div>;
    }

    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-16 max-w-4xl mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-200 pb-8 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-violet-700 tracking-tight">TRONIX<span className="text-gray-900">365</span></h1>
                    <p className="text-gray-500 text-sm mt-1">Order #order_tronix_{String(order.id).padStart(4, '0')}</p>
                    <p className="text-gray-500 text-sm">Date: {orderDate}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">INVOICE</h2>
                    <p className="text-gray-500 text-sm mt-1">Tronix365 Private Limited.</p>
                    <p className="text-gray-500 text-sm">123 Tech Avenue, Banglore, India</p>
                    <p className="text-gray-500 text-sm">support@tronix365.com</p>
                </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Billed To / Shipped To:</h3>
                    <p className="font-bold text-gray-800">{order.full_name || order.customer_email}</p>
                    {order.address_line && (
                        <p className="text-gray-600 mt-1">
                            {order.address_line}<br />
                            {order.city}, {order.state} {order.pincode}<br />
                            Ph: {order.phone}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Payment Details</h3>
                    <p className="font-bold text-gray-800">Status: {order.status === 'confirmed' ? 'Paid' : 'Pending'}</p>
                    <p className="text-gray-600 mt-1">Method: Online (PayU)</p>
                    <p className="text-gray-600">Txn ID: {order.txnid || 'N/A'}</p>
                </div>
            </div>

            {/* Order Items Table */}
            <table className="w-full text-left border-collapse mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-800">
                        <th className="py-3 text-gray-800 font-bold uppercase text-sm w-1/2">Item Description</th>
                        <th className="py-3 text-center text-gray-800 font-bold uppercase text-sm">Qty</th>
                        <th className="py-3 text-right text-gray-800 font-bold uppercase text-sm">Unit Price</th>
                        <th className="py-3 text-right text-gray-800 font-bold uppercase text-sm">Total</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {order.items.map((item, index) => {
                        const unitPrice = item.price_at_purchase || (item.product ? (item.product.sale_price || item.product.price) : 0);
                        const rowTotal = unitPrice * item.quantity;
                        return (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-4 font-medium">
                                    {item.product ? item.product.title : `Product ID: ${item.product_id}`}
                                </td>
                                <td className="py-4 text-center">{item.quantity}</td>
                                <td className="py-4 text-right">₹{unitPrice.toFixed(2)}</td>
                                <td className="py-4 text-right font-bold text-gray-900">₹{rowTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-1/2 md:w-1/3">
                    <div className="flex justify-between py-2 border-b border-gray-200 text-gray-600 text-sm">
                        <span>Subtotal (before tax):</span>
                        <span>₹{((order.total_amount + (order.discount_amount || 0)) / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200 text-gray-600 text-sm">
                        <span>GST (18%):</span>
                        <span>₹{((order.total_amount + (order.discount_amount || 0)) - ((order.total_amount + (order.discount_amount || 0)) / 1.18)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200 text-gray-600 text-sm">
                        <span>Shipping:</span>
                        <span>Free</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between py-2 border-b border-gray-200 text-emerald-600 font-bold text-sm">
                            <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}:</span>
                            <span>- ₹{order.discount_amount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-4 text-xl font-bold border-b-2 border-gray-800 text-gray-900">
                        <span>Total:</span>
                        <span>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
                <p className="font-bold text-gray-800 mb-1">Thank you for your business!</p>
                <p>If you have any questions concerning this invoice, contact our support team.</p>
                <p className="mt-4 no-print text-blue-500 text-xs">Press Ctrl+P (Windows) or Cmd+P (Mac) to print or save as PDF.</p>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none;
                    }
                    body {
                        background-color: white !important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default Invoice;
