import React from 'react';
import { ShieldCheck, Trash2, Lock, Loader, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';

const CheckoutOrderSummary = ({
    appliedCoupon,
    setAppliedCoupon,
    couponCode,
    setCouponCode,
    handleApplyCoupon,
    isApplyingCoupon,
    standaloneItems,
    bundleGroups,
    selectedItems,
    subtotal,
    totalDiscount,
    cgst,
    sgst,
    activeShipping,
    totalAmount,
    user,
    loading,
    handlePayment,
}) => {
    return (
        <>
            {/* Desktop / Large Screen Summary Card */}
            <div className="bg-tronix-card border border-white/10 rounded-xl sm:rounded-2xl p-6 shadow-xl sticky top-28">
                <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

                {/* Promo / Coupon Box */}
                <div className="mb-6">
                    <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider font-bold">
                        Promo Code
                    </label>
                    {!appliedCoupon ? (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Enter Code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-24 py-3 text-sm text-white focus:border-tronix-primary outline-none transition-colors placeholder:text-gray-500"
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={isApplyingCoupon || !couponCode}
                                className="absolute right-1.5 top-1.5 bottom-1.5 bg-tronix-primary hover:bg-violet-600 text-white px-4 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {isApplyingCoupon ? '...' : 'Apply'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-emerald-400 font-bold text-sm tracking-wide">
                                        {appliedCoupon.code}
                                    </p>
                                    <p className="text-emerald-500/80 text-[10px] uppercase font-bold">
                                        Successfully Applied
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponCode('');
                                    toast.success('Coupon removed');
                                }}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                title="Remove Coupon"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Items List */}
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {standaloneItems.map((item) => (
                        <div key={item.cart_item_id || item.id} className="flex gap-3 items-start">
                            <div className="w-12 h-12 bg-white/5 rounded-md flex-shrink-0 flex items-center justify-center p-1">
                                <img
                                    src={getImageUrl(item.image)}
                                    alt={item.title}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300 truncate">{item.title}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-medium text-white">₹{item.price * item.quantity}</p>
                        </div>
                    ))}

                    {Object.values(bundleGroups).map((group) => (
                        <div
                            key={`bundle-${group.id}`}
                            className="bg-tronix-primary/5 rounded-lg border border-tronix-primary/20 p-3"
                        >
                            <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
                                <div>
                                    <span className="text-[10px] font-bold text-tronix-primary uppercase tracking-wider block mb-0.5">
                                        Bundle Deal
                                    </span>
                                    <p className="text-sm text-white font-bold">{group.bundle_name}</p>
                                    <p className="text-xs text-gray-500">Qty: {group.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 line-through block">
                                        ₹{group.original_price * group.quantity}
                                    </span>
                                    <span className="text-sm font-bold text-tronix-accent">
                                        ₹{group.bundle_price * group.quantity}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {group.items.map((bi) => (
                                    <div
                                        key={bi.cart_item_id || bi.id}
                                        className="flex items-center gap-1.5 bg-white/5 rounded px-1.5 py-1"
                                    >
                                        <img
                                            src={getImageUrl(bi.image)}
                                            alt={bi.title}
                                            className="w-4 h-4 object-contain"
                                        />
                                        <span className="text-[10px] text-gray-400 capitalize max-w-[80px] truncate">
                                            {bi.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-white/10 pt-4 space-y-2 mb-6">
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>Items ({selectedItems.length}):</span>
                        <span>₹{subtotal}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-400 text-sm font-medium">
                            <span>Discount:</span>
                            <span>- ₹{totalDiscount}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>CGST (9%):</span>
                        <span>₹{cgst}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>SGST (9%):</span>
                        <span>₹{sgst}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>Shipping ({activeShipping.label}):</span>
                        <span className={activeShipping.cost === 0 ? 'text-emerald-400' : 'text-white'}>
                            {activeShipping.cost === 0 ? 'FREE' : `₹${activeShipping.cost}`}
                        </span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10 mt-2">
                        <span>Order Total:</span>
                        <span className="text-tronix-accent">₹{totalAmount}</span>
                    </div>
                </div>

                {!user && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl flex items-center gap-2.5 text-xs text-yellow-300 mb-3">
                        <Lock size={15} className="text-yellow-400 shrink-0" />
                        <span>
                            <strong>Guest Checkout:</strong> You can enter delivery details above. Clicking below will prompt you to log in to finalize payment and track your order.
                        </span>
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading
                        ? 'Redirecting to PayU...'
                        : user
                        ? 'Proceed to Secure Payment'
                        : 'Log In to Place Order & Pay'}
                    {!user && <Lock size={16} className="text-black" />}
                </button>

                <p className="text-xs text-center text-gray-500 mt-3">
                    By placing your order, you agree to Tronix365's privacy notice and conditions of use.
                </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-400 mt-4">
                <ShieldCheck className="text-tronix-primary" size={20} />
                <span>Safe and Secure Payments. 100% Authentic products.</span>
            </div>

            {/* Mobile Sticky Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-[11px] text-gray-400 font-medium leading-none">Total Payable</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black text-tronix-accent">₹{totalAmount}</span>
                            <span className="text-[10px] text-gray-400">(incl. GST)</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={loading}
                        className="flex-1 max-w-[240px] bg-yellow-500 hover:bg-yellow-400 active:scale-98 text-black font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-1.5 text-sm min-h-[44px]"
                    >
                        {loading ? (
                            <>
                                <Loader size={16} className="animate-spin text-black" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <span>{user ? 'Pay Now' : 'Log In to Pay'}</span>
                                {user ? (
                                    <ChevronRight size={18} className="stroke-[2.5]" />
                                ) : (
                                    <Lock size={16} className="text-black" />
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default CheckoutOrderSummary;
