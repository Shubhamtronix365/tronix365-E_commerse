import React from 'react';
import { motion } from 'framer-motion';
import { Check, Layers } from 'lucide-react';

const VariantSelector = ({ product, activeVariantId, onSelectVariant }) => {
    if (!product?.variants || product.variants.length <= 1) {
        return null;
    }

    const variants = product.variants;
    const variantType = variants[0]?.variant_type || 'Variant Option';

    return (
        <div className="my-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
                <Layers size={16} className="text-purple-400" />
                <span className="text-xs uppercase font-bold tracking-wider text-gray-300">
                    Select {variantType}:
                </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => {
                    const isSelected = v.id === activeVariantId;
                    const isOutOfStock = v.stock === 0;

                    return (
                        <motion.button
                            key={v.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onSelectVariant(v)}
                            className={`relative px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border cursor-pointer ${
                                isSelected
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/40'
                                    : 'bg-slate-900/80 text-gray-300 border-white/10 hover:border-purple-400/50 hover:bg-slate-800'
                            } ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSelected && <Check size={14} className="text-white" />}
                            <span>{v.variant_name || v.title}</span>
                            <span className={`text-[10px] ml-1 font-semibold ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                                ₹{v.price}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default VariantSelector;
