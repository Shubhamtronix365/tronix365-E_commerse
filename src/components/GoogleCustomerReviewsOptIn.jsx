import React, { useEffect } from 'react';

const DEFAULT_MERCHANT_ID = 5820417048;

/**
 * GoogleCustomerReviewsOptIn Component
 * Renders Google Customer Reviews opt-in survey prompt on order confirmation.
 * Merchant ID: 5820417048 (Tronix365)
 */
const GoogleCustomerReviewsOptIn = ({ order }) => {
    useEffect(() => {
        if (!order) return;

        const merchantId = Number(import.meta.env.VITE_GOOGLE_MERCHANT_ID || DEFAULT_MERCHANT_ID);
        const orderId = String(order.txnid || order.id || '');
        const email = order.customer_email || order.email || '';

        if (!orderId || !email) {
            console.warn('[GCR Opt-In] Missing order ID or email. Skipping Google Customer Reviews opt-in.');
            return;
        }

        // Format estimated delivery date (YYYY-MM-DD)
        let estDateStr = '';
        if (order.estimated_delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(order.estimated_delivery_date)) {
            estDateStr = order.estimated_delivery_date;
        } else {
            const baseDate = order.created_at ? new Date(order.created_at) : new Date();
            const estDate = new Date(baseDate);
            estDate.setDate(estDate.getDate() + 5); // Default 5 business days estimation
            const yyyy = estDate.getFullYear();
            const mm = String(estDate.getMonth() + 1).padStart(2, '0');
            const dd = String(estDate.getDate()).padStart(2, '0');
            estDateStr = `${yyyy}-${mm}-${dd}`;
        }

        const deliveryCountry = order.country_code || 'IN';

        // Extract product GTINs if present in order items
        const products = Array.isArray(order.items)
            ? order.items
                .map(item => {
                    const gtin = item.product?.gtin || item.product?.barcode || item.gtin;
                    return gtin ? { gtin: String(gtin) } : null;
                })
                .filter(Boolean)
            : [];

        const renderOptIn = () => {
            if (window.gapi && window.gapi.load) {
                window.gapi.load('surveyoptin', () => {
                    if (window.gapi.surveyoptin && window.gapi.surveyoptin.render) {
                        const optInConfig = {
                            merchant_id: merchantId,
                            order_id: orderId,
                            email: email,
                            delivery_country: deliveryCountry,
                            estimated_delivery_date: estDateStr,
                        };

                        if (products.length > 0) {
                            optInConfig.products = products;
                        }

                        console.log('[GCR Opt-In] Rendering Google Customer Reviews Opt-In Survey:', optInConfig);
                        window.gapi.surveyoptin.render(optInConfig);
                    }
                });
            }
        };

        // Attach function to window so platform.js onload callback can invoke it
        window.renderOptIn = renderOptIn;

        // Load platform.js if not already present in document
        if (window.gapi && window.gapi.load) {
            renderOptIn();
        } else {
            const scriptId = 'google-gcr-platform-js';
            let script = document.getElementById(scriptId);
            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            } else {
                script.addEventListener('load', renderOptIn);
            }
        }
    }, [order]);

    return null;
};

export default GoogleCustomerReviewsOptIn;
