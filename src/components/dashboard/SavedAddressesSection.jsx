import React from 'react';
import { 
    MapPin, 
    Plus, 
    Edit2, 
    Trash2, 
    Check, 
    ShieldCheck, 
    Building, 
    Home, 
    Warehouse, 
    Factory, 
    X 
} from 'lucide-react';

const SavedAddressesSection = ({
    addresses,
    addressLoading,
    handleOpenAddAddress,
    handleOpenEditAddress,
    handleDeleteAddress,
    handleSetDefaultAddress,
    getAddressIcon,
    isAddressModalOpen,
    setIsAddressModalOpen,
    editingAddressId,
    addressForm,
    setAddressForm,
    handleSaveAddress,
    handlePincodeLookup,
    isPincodeLoading,
    savingAddress,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tronix-card border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tronix-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 sm:gap-3">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-tronix-primary/20 border border-tronix-primary/30 text-tronix-primary">
                            <MapPin size={20} />
                        </div>
                        Saved Addresses
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        Manage your delivery destinations for 1-click checkout and faster custom tower orders.
                    </p>
                </div>
                <button
                    onClick={handleOpenAddAddress}
                    className="relative z-10 bg-tronix-primary hover:bg-violet-600 text-white px-5 py-3 sm:py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-tronix-primary/25 transition-all w-full sm:w-fit min-h-[44px]"
                >
                    <Plus size={18} />
                    <span>Add New Address</span>
                </button>
            </div>

            {addressLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {[1, 2].map(n => (
                        <div key={n} className="bg-tronix-card/60 border border-white/5 rounded-2xl p-4 sm:p-6 animate-pulse space-y-4">
                            <div className="h-5 bg-white/10 rounded w-1/3"></div>
                            <div className="h-4 bg-white/5 rounded w-2/3"></div>
                            <div className="h-16 bg-white/5 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            ) : addresses.length === 0 ? (
                <div className="bg-tronix-card border border-dashed border-white/15 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-4 border border-white/10">
                        <MapPin size={28} className="text-tronix-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Saved Addresses Yet</h3>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-md mb-6">
                        Save your home, office, factory, or warehouse addresses to automatically prefill delivery info at checkout!
                    </p>
                    <button
                        onClick={handleOpenAddAddress}
                        className="bg-tronix-primary hover:bg-violet-600 text-white px-6 py-3 sm:py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-tronix-primary/25 transition-all w-full sm:w-auto min-h-[44px]"
                    >
                        <Plus size={18} />
                        <span>Add Your First Address</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {addresses.map((addr) => (
                        <div
                            key={addr.id}
                            className={`relative rounded-2xl p-4 sm:p-6 border transition-all flex flex-col justify-between ${
                                addr.is_default
                                    ? 'bg-gradient-to-b from-tronix-primary/10 via-tronix-card to-tronix-card border-tronix-primary/50 shadow-xl shadow-tronix-primary/10 ring-1 ring-tronix-primary/30'
                                    : 'bg-tronix-card border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5">
                                            {getAddressIcon(addr.label)}
                                            {addr.label || 'Home'}
                                        </span>
                                        {addr.is_default && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                                                <Check size={12} /> Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleOpenEditAddress(addr)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/5"
                                            title="Edit Address"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAddress(addr.id)}
                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
                                            title="Delete Address"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white">{addr.full_name}</h3>
                                <p className="text-gray-400 text-sm mt-0.5">{addr.phone}</p>

                                <p className="text-gray-300 text-sm mt-3 leading-relaxed">
                                    {addr.address_line}
                                    {addr.landmark && <span className="block text-gray-400 text-xs mt-0.5">Landmark: {addr.landmark}</span>}
                                </p>
                                <p className="text-gray-400 text-sm font-medium mt-1">
                                    {addr.city}, {addr.state} - <span className="text-white font-mono">{addr.pincode}</span>
                                </p>

                                {addr.is_gst_invoice && addr.gstin && (
                                    <div className="mt-3.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                                        <Building size={14} className="text-tronix-primary flex-shrink-0" />
                                        <div className="truncate">
                                            <span className="text-gray-400">GSTIN: </span>
                                            <span className="text-violet-300 font-mono font-bold">{addr.gstin}</span>
                                            {addr.company_name && <span className="text-gray-400"> ({addr.company_name})</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                {!addr.is_default ? (
                                    <button
                                        onClick={() => handleSetDefaultAddress(addr.id)}
                                        className="text-xs font-semibold text-tronix-primary hover:text-white hover:bg-tronix-primary/20 px-3 py-1.5 rounded-lg border border-tronix-primary/30 transition-all"
                                    >
                                        Set as Default
                                    </button>
                                ) : (
                                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-emerald-400" /> Primary Shipping Address
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Address Modal */}
            {isAddressModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-xl bg-tronix-card border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl my-auto">
                        <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-white/10 pb-3 sm:pb-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    <MapPin size={20} className="text-tronix-primary" />
                                    {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">Provide accurate delivery & contact details</p>
                            </div>
                            <button
                                onClick={() => setIsAddressModalOpen(false)}
                                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAddress} className="space-y-4 sm:space-y-5">
                            {/* Address Label / Type */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Address Type</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {['Home', 'Office', 'Factory', 'Warehouse', 'Other'].map((lbl) => (
                                        <button
                                            type="button"
                                            key={lbl}
                                            onClick={() => setAddressForm(prev => ({ ...prev, label: lbl }))}
                                            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all gap-1 min-h-[44px] ${
                                                addressForm.label === lbl
                                                    ? 'bg-tronix-primary/20 border-tronix-primary text-white shadow-md shadow-tronix-primary/20'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {lbl === 'Home' && <Home size={16} />}
                                            {lbl === 'Office' && <Building size={16} />}
                                            {lbl === 'Factory' && <Factory size={16} />}
                                            {lbl === 'Warehouse' && <Warehouse size={16} />}
                                            {lbl === 'Other' && <MapPin size={16} />}
                                            <span className="text-[11px] sm:text-xs">{lbl}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">Recipient Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="name"
                                        value={addressForm.full_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">10-Digit Mobile Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="tel"
                                        value={addressForm.phone}
                                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                                        placeholder="9876543210"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* PIN code, City, State */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium flex items-center justify-between">
                                        <span>PIN Code *</span>
                                        {isPincodeLoading && <span className="text-[10px] text-tronix-primary animate-pulse">Detecting...</span>}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="postal-code"
                                        value={addressForm.pincode}
                                        onChange={(e) => handlePincodeLookup(e.target.value.replace(/\D/g, ''))}
                                        placeholder="411001"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary font-mono text-base sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">City / District *</label>
                                    <input
                                        type="text"
                                        required
                                        value={addressForm.city}
                                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                        placeholder="Pune"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">State *</label>
                                    <input
                                        type="text"
                                        required
                                        value={addressForm.state}
                                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                        placeholder="Maharashtra"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Address Line */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-medium">Flat / House No., Building, Street, Area *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={addressForm.address_line}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                                    placeholder="e.g. Flat 402, Surya Heights, Near Tech Park, Wakad"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm resize-none"
                                />
                            </div>

                            {/* Landmark */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-medium">Landmark (Optional)</label>
                                <input
                                    type="text"
                                    value={addressForm.landmark}
                                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                                    placeholder="e.g. Opposite Metro Pillar 144"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-primary text-base sm:text-sm"
                                />
                            </div>

                            {/* GST & B2B Billing Toggle */}
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={addressForm.is_gst_invoice}
                                        onChange={(e) => setAddressForm({ ...addressForm, is_gst_invoice: e.target.checked })}
                                        className="w-4 h-4 rounded text-tronix-primary bg-black/40 border-white/20 focus:ring-0"
                                    />
                                    <span className="text-xs font-semibold text-gray-200">
                                        Add GSTIN for Business (B2B Tax Invoicing)
                                    </span>
                                </label>

                                {addressForm.is_gst_invoice && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">Company / Firm Name</label>
                                            <input
                                                type="text"
                                                value={addressForm.company_name}
                                                onChange={(e) => setAddressForm({ ...addressForm, company_name: e.target.value })}
                                                placeholder="e.g. Tronix Automation Pvt Ltd"
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-tronix-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">GSTIN (15 Characters)</label>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                value={addressForm.gstin}
                                                onChange={(e) => setAddressForm({ ...addressForm, gstin: e.target.value.toUpperCase() })}
                                                placeholder="27AAAAA0000A1Z5"
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-tronix-primary uppercase"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Default Address Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={addressForm.is_default}
                                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                    className="w-4 h-4 rounded text-tronix-primary bg-black/40 border-white/20 focus:ring-0"
                                />
                                <span className="text-xs text-gray-300">Set as my default delivery address</span>
                            </label>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsAddressModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingAddress}
                                    className="px-6 py-2.5 rounded-xl bg-tronix-primary hover:bg-violet-600 text-white font-semibold text-sm shadow-lg shadow-tronix-primary/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {savingAddress ? 'Saving...' : (editingAddressId ? 'Update Address' : 'Save Address')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedAddressesSection;
