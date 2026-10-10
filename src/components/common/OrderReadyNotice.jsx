import React from 'react';
import { Clock, Store, Zap, MapPin, Sparkles } from 'lucide-react';
import { formatOrderDateTime, getEstimatedReadyWindow, isPickupOrFreeShipping } from '../../utils/orderUtils';

export default function OrderReadyNotice({ order, className = "" }) {
    if (!order) return null;

    const { isPickup, isFreeShipping, isEligible } = isPickupOrFreeShipping(order);
    if (!isEligible) return null;

    const orderedTimeStr = formatOrderDateTime(order.created_at);
    const readyWindow = getEstimatedReadyWindow(order.created_at);

    if (isPickup) {
        return (
            <div className={`relative overflow-hidden rounded-2xl border-2 border-violet-500/50 bg-gradient-to-br from-violet-950/60 via-purple-900/40 to-slate-900/90 p-5 sm:p-6 shadow-[0_0_25px_rgba(139,92,246,0.25)] ${className}`}>
                {/* Ambient glow accent */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

                <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-300 shrink-0 shadow-inner">
                        <Store className="w-6 h-6 animate-pulse text-violet-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-violet-500/20 text-violet-300 border border-violet-500/40">
                                <Sparkles size={12} className="text-violet-400" />
                                Store / Office Pickup
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⏱️ Ready in 2–3 Hours
                            </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                            Your order will be ready for pickup within <span className="text-violet-300 underline decoration-violet-400/60 underline-offset-4">2–3 hours</span> from order time!
                        </h3>

                        <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                            Our Pune facility team has received your order and is currently testing and packaging your components.
                        </p>

                        {/* Order Timeline Highlight Box */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 border border-violet-500/30 rounded-xl p-3.5">
                            <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-violet-400 shrink-0" />
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Ordered Time</p>
                                    <p className="text-sm font-bold text-white">{orderedTimeStr}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Estimated Ready Window</p>
                                    <p className="text-sm font-black text-emerald-400">
                                        {readyWindow ? readyWindow.windowText : "Within 2–3 Hours"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-violet-200/90 font-medium bg-violet-950/40 px-3 py-1.5 rounded-lg border border-violet-800/40">
                            <MapPin size={14} className="text-violet-400 shrink-0" />
                            <span>Pickup Desk: <strong>Tronix365 Pune Office</strong> &nbsp;|&nbsp; Operating Hours: <strong>9:30 AM – 6:00 PM</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/60 via-teal-900/40 to-slate-900/90 p-5 sm:p-6 shadow-[0_0_25px_rgba(16,185,129,0.25)] ${className}`}>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

            <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                    <Zap className="w-6 h-6 animate-pulse text-emerald-300" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <Sparkles size={12} className="text-emerald-400" />
                            Free Shipping Priority
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ⚡ Prepared in 2–3 Hours
                        </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                        Your free shipping order will be packed & ready in <span className="text-emerald-300 underline decoration-emerald-400/60 underline-offset-4">2–3 hours</span> from order time!
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                        We have prioritized your order for swift assembly and dispatch from our fulfillment warehouse.
                    </p>

                    {/* Order Timeline Highlight Box */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 border border-emerald-500/30 rounded-xl p-3.5">
                        <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Ordered Time</p>
                                <p className="text-sm font-bold text-white">{orderedTimeStr}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Estimated Ready Window</p>
                                <p className="text-sm font-black text-emerald-400">
                                    {readyWindow ? readyWindow.windowText : "Within 2–3 Hours"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
