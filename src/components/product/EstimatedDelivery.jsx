import React, { useState, useEffect } from 'react';
import { MapPin, Truck, Plane, Zap, Package, AlertCircle, Loader2 } from 'lucide-react';

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDeliveryDate = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    return `${dayName}, ${getOrdinal(dayNum)} ${monthName}`;
};

const EstimatedDelivery = () => {
    const [pincode, setPincode] = useState(() => {
        return localStorage.getItem('tronix_delivery_pincode') || '411041';
    });
    const [inputPincode, setInputPincode] = useState(() => {
        return localStorage.getItem('tronix_delivery_pincode') || '411041';
    });
    const [location, setLocation] = useState('Pune, MAHARASHTRA');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasChecked, setHasChecked] = useState(true);

    const checkPincode = async (pin) => {
        const cleanPin = pin.trim();
        if (!/^\d{6}$/.test(cleanPin)) {
            setError('Please enter a valid 6-digit PIN code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
            const data = await res.json();
            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
                const po = data[0].PostOffice[0];
                const loc = `${po.District || po.Name}, ${(po.State || '').toUpperCase()}`;
                setLocation(loc);
                setPincode(cleanPin);
                localStorage.setItem('tronix_delivery_pincode', cleanPin);
                setHasChecked(true);
            } else {
                // Fallback for known regional zones if postal API doesn't find
                if (cleanPin.startsWith('411')) {
                    setLocation('Pune, MAHARASHTRA');
                } else if (cleanPin.startsWith('400')) {
                    setLocation('Mumbai, MAHARASHTRA');
                } else {
                    setLocation(`PIN ${cleanPin}, INDIA`);
                }
                setPincode(cleanPin);
                localStorage.setItem('tronix_delivery_pincode', cleanPin);
                setHasChecked(true);
            }
        } catch (err) {
            // Offline or network error fallback
            if (cleanPin.startsWith('411')) {
                setLocation('Pune, MAHARASHTRA');
            } else {
                setLocation(`PIN ${cleanPin}, INDIA`);
            }
            setPincode(cleanPin);
            setHasChecked(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pincode && pincode.length === 6) {
            checkPincode(pincode);
        }
    }, []);

    const isPune = pincode.startsWith('411') || location.toLowerCase().includes('pune');
    const isMaharashtra = pincode.startsWith('40') || pincode.startsWith('41') || pincode.startsWith('42') || pincode.startsWith('43') || pincode.startsWith('44') || location.toLowerCase().includes('maharashtra');

    const airDate = isPune ? formatDeliveryDate(1) : (isMaharashtra ? formatDeliveryDate(2) : formatDeliveryDate(3));
    const surfaceDate = isPune ? formatDeliveryDate(2) : (isMaharashtra ? formatDeliveryDate(3) : formatDeliveryDate(5));

    const currentHour = new Date().getHours();
    const isBefore2PM = currentHour < 14;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-4 my-6">
            {/* Header and Input Form */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                    <MapPin className="text-red-400" size={18} />
                    <span>Check estimated delivery</span>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        checkPincode(inputPincode);
                    }}
                    className="flex gap-2"
                >
                    <div className="relative flex-1">
                        <input
                            type="text"
                            maxLength={6}
                            value={inputPincode}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setInputPincode(val);
                                if (error) setError('');
                            }}
                            placeholder="Enter 6-digit Pincode"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary transition-all font-mono"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || inputPincode.length !== 6}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-sm transition-all flex items-center justify-center min-w-[80px]"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Check'}
                    </button>
                </form>

                {error && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Results Block */}
            {hasChecked && !loading && (
                <div className="space-y-3 pt-2 border-t border-white/5 text-xs sm:text-sm">
                    {/* Destination location */}
                    <div className="flex items-center gap-2 text-gray-300 font-medium">
                        <Package className="text-amber-400 shrink-0" size={16} />
                        <span>Delivering to <strong className="text-white">{location}</strong></span>
                    </div>

                    {/* BlueDart Air / Express Option */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                            <Plane className="text-emerald-400 shrink-0" size={16} />
                            <span>Estimated Delivery by {airDate}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-emerald-300/80 pl-6">
                            Delivery via BlueDart Air / Express Dispatch
                        </p>
                    </div>

                    {/* Standard Shipping */}
                    <div className="flex items-center gap-2 text-gray-400 pl-1">
                        <Truck className="text-amber-500 shrink-0" size={16} />
                        <span>Or by <strong className="text-gray-200">{surfaceDate}</strong> - Standard Shipping</span>
                    </div>
                    {/* Pune Next Day Delivery Highlight */}
                    {isPune && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                            <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs sm:text-sm">
                                <Zap className="text-amber-400 shrink-0" size={16} />
                                <span>Next Day Delivery in Pune</span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-amber-200/90 pl-6 leading-relaxed">
                                Order today and get guaranteed next day delivery between 10:00 AM and 6:00 PM with express local dispatch.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EstimatedDelivery;
