import React from 'react';

const ShippingMethodSelector = ({
    shippingOptions,
    selectedShipping,
    setSelectedShipping,
}) => {
    return (
        <div className="bg-tronix-card border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <span className="bg-tronix-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    2
                </span>
                <h2 className="text-xl font-bold text-white">Shipping Method</h2>
            </div>
            <div className="space-y-3">
                {shippingOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = selectedShipping === opt.id;
                    return (
                        <div key={opt.id} className="space-y-2">
                            <label
                                className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                                    isActive
                                        ? 'border-tronix-primary bg-tronix-primary/10'
                                        : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="checkout_shipping"
                                    value={opt.id}
                                    checked={isActive}
                                    onChange={() => {
                                        setSelectedShipping(opt.id);
                                        try {
                                            sessionStorage.setItem('tronix_shipping', opt.id);
                                        } catch {}
                                    }}
                                    className="w-5 h-5 accent-tronix-primary"
                                />
                                <Icon
                                    size={20}
                                    className={isActive ? 'text-tronix-primary' : 'text-gray-500'}
                                />
                                <div className="flex-1">
                                    <p
                                        className={`font-semibold text-sm ${
                                            isActive ? 'text-white' : 'text-gray-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{opt.desc}</p>
                                </div>
                                <span
                                    className={`font-bold text-sm shrink-0 ${
                                        opt.cost === 0
                                            ? 'text-emerald-400'
                                            : isActive
                                            ? 'text-tronix-accent'
                                            : 'text-gray-400'
                                    }`}
                                >
                                    {opt.cost === 0 ? 'FREE' : `₹${opt.cost}`}
                                </span>
                            </label>

                            {isActive && (opt.id === 'pickup' || opt.cost === 0) && (
                                <div className={`text-xs p-3 rounded-xl border flex items-center gap-2.5 shadow-md ${
                                    opt.id === 'pickup'
                                        ? 'bg-violet-950/60 text-violet-200 border-violet-500/50'
                                        : 'bg-emerald-950/60 text-emerald-200 border-emerald-500/50'
                                }`}>
                                    <span className="text-lg shrink-0">{opt.id === 'pickup' ? '🏬' : '⚡'}</span>
                                    <div>
                                        <p className="font-extrabold uppercase tracking-wide text-[11px] mb-0.5 text-white">
                                            ⏱️ Ready in 2–3 Hours Guaranteed
                                        </p>
                                        <p className="text-gray-300 text-[11px] leading-relaxed">
                                            {opt.id === 'pickup'
                                                ? 'Your order will be tested and ready for pickup at our Pune office within 2–3 hours from order placement time.'
                                                : 'Your free shipping order will be packed and dispatched from our facility within 2–3 hours from order placement time.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ShippingMethodSelector;
