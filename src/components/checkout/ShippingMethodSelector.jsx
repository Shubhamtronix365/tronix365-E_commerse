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
                        <label
                            key={opt.id}
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
                    );
                })}
            </div>
        </div>
    );
};

export default ShippingMethodSelector;
