import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

const ProductTable = ({ 
    products, 
    searchQuery, 
    handleOpenEditModal, 
    handleDeleteClick, 
    hasMoreProducts, 
    loadMore, 
    loadingMore 
}) => {
    return (
        <>
            <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full text-left text-sm text-gray-400 mb-4 min-w-[600px]">
                    <thead className="bg-white/5 text-white uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4 rounded-l-lg">Product</th>
                            <th className="px-6 py-4">SKV</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 rounded-r-lg">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {products.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                                            <img src={getImageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="font-medium text-white line-clamp-1">{item.title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-300 font-mono text-xs">{item.skv || 'N/A'}</td>
                                <td className="px-6 py-4 truncate max-w-[120px]">{item.category}</td>
                                <td className="px-6 py-4 text-white">₹{item.price}</td>
                                <td className="px-6 py-4">{item.stock}</td>
                                <td className="px-6 py-4">
                                    {item.stock > 0 ? (
                                        <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-medium">In Stock</span>
                                    ) : (
                                        <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-medium">Out of Stock</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenEditModal(item)}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(item)}
                                            className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                    No products found matching "{searchQuery}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {hasMoreProducts && (
                <div className="flex justify-center mt-4">
                    <button onClick={loadMore} disabled={loadingMore} className="text-tronix-primary hover:underline disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More Products'}
                    </button>
                </div>
            )}
        </>
    );
};

export default ProductTable;
