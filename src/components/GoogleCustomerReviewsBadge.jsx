import React, { useEffect } from 'react';

const DEFAULT_MERCHANT_ID = 5820417048;

/**
 * GoogleCustomerReviewsBadge Component
 * Displays Google Customer Reviews participation badge & seller rating.
 * Merchant ID: 5820417048 (Tronix365)
 */
const GoogleCustomerReviewsBadge = ({ position = 'BOTTOM_LEFT', region = 'IN' }) => {
    useEffect(() => {
        const merchantId = Number(import.meta.env.VITE_GOOGLE_MERCHANT_ID || DEFAULT_MERCHANT_ID);

        const initBadge = () => {
            if (window.__gcr_badge_initialized) {
                return;
            }
            if (window.merchantwidget && window.merchantwidget.start) {
                window.__gcr_badge_initialized = true;
                console.log('[GCR Badge] Initializing Google Customer Reviews Badge:', {
                    merchant_id: merchantId,
                    position,
                    region
                });
                try {
                    window.merchantwidget.start({
                        merchant_id: merchantId,
                        position: position,
                        region: region
                    });
                } catch (err) {
                    console.error('[GCR Badge] Error starting merchant widget:', err);
                }
            }
        };

        const scriptId = 'merchantWidgetScript';
        let script = document.getElementById(scriptId);

        if (window.merchantwidget && window.merchantwidget.start) {
            initBadge();
        } else {
            if (script) {
                script.addEventListener('load', initBadge);
            } else {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = 'https://www.gstatic.com/shopping/merchant/merchantwidget.js';
                script.defer = true;
                script.addEventListener('load', initBadge);
                document.head.appendChild(script);
            }

            // Polling fallback if event listener misses load
            let attempts = 0;
            const interval = setInterval(() => {
                attempts += 1;
                if (window.merchantwidget && window.merchantwidget.start) {
                    initBadge();
                    clearInterval(interval);
                } else if (attempts >= 10) {
                    clearInterval(interval);
                }
            }, 300);

            return () => {
                clearInterval(interval);
                if (script) {
                    script.removeEventListener('load', initBadge);
                }
            };
        }

        return () => {
            if (script) {
                script.removeEventListener('load', initBadge);
            }
        };
    }, [position, region]);

    return null;
};

export default GoogleCustomerReviewsBadge;
