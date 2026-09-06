import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    FileSpreadsheet,
    UploadCloud,
    FileText,
    CheckCircle2,
    AlertCircle,
    ShoppingCart,
    ArrowRight,
    Download,
    Layers,
    Package,
    Plus,
    Minus,
    RefreshCw,
    Sparkles,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../utils/imageUtils';

const SAMPLE_CSV_CONTENT = `Part Name / Query,Quantity,Target SKU
Arduino Uno R3,2,ARD-UNO-R3
ESP32 Development Board,5,ESP32-DEV-32S
HC-SR04 Ultrasonic Sensor,10,SN-HCSR04
SG90 Servo Motor,4,
16x2 LCD Display I2C,3,
`;

const BOMUpload = () => {
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
    const [rawText, setRawText] = useState(
        `Arduino Uno R3, 2\nESP32 Development Board, 5\nHC-SR04 Ultrasonic Sensor, 10\nSG90 Servo Motor, 4\n16x2 LCD Display, 3`
    );
    const [fileName, setFileName] = useState('');
    const [isMatching, setIsMatching] = useState(false);
    const [bomResult, setBomResult] = useState(null);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    // Download Sample CSV
    const handleDownloadSample = () => {
        const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'tronix365_sample_bom.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Sample BOM CSV downloaded!");
    };

    // Parse Text/Lines into { query, quantity, sku }
    const parseLines = (text) => {
        const lines = text.split('\n');
        const items = [];

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#') || line.toLowerCase().startsWith('part name')) {
                continue;
            }

            // Check comma or tab separated
            const parts = line.includes('\t') ? line.split('\t') : line.split(',');
            if (parts.length >= 2) {
                const query = parts[0].trim();
                const qtyParsed = parseInt(parts[1].trim(), 10);
                const quantity = isNaN(qtyParsed) || qtyParsed <= 0 ? 1 : qtyParsed;
                const sku = parts[2] ? parts[2].trim() : null;
                if (query) items.push({ query, quantity, sku });
            } else {
                // Check format: "5x ESP32" or "ESP32 x5"
                const multiplierMatch = line.match(/^(\d+)\s*[xX*]\s*(.+)$/);
                const trailingMatch = line.match(/^(.+?)\s*[xX*]\s*(\d+)$/);

                if (multiplierMatch) {
                    items.push({
                        query: multiplierMatch[2].trim(),
                        quantity: parseInt(multiplierMatch[1], 10) || 1,
                    });
                } else if (trailingMatch) {
                    items.push({
                        query: trailingMatch[1].trim(),
                        quantity: parseInt(trailingMatch[2], 10) || 1,
                    });
                } else {
                    items.push({ query: line, quantity: 1 });
                }
            }
        }
        return items;
    };

    // Handle File Drop / Selection
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                setRawText(content);
                triggerMatching(content);
            }
        };
        reader.readAsText(file);
    };

    // Trigger Matching with backend
    const triggerMatching = async (textToParse = rawText) => {
        const parsedItems = parseLines(textToParse);
        if (parsedItems.length === 0) {
            toast.error("Please provide at least one component name.");
            return;
        }

        setIsMatching(true);
        try {
            const res = await client.post('/bom/match', { items: parsedItems });
            setBomResult(res.data);
            toast.success(`Matched ${res.data.matched_count} of ${res.data.total_requested} parts!`);
        } catch (error) {
            console.error("BOM Match Error:", error);
            toast.error("Failed to match BOM items. Please try again.");
        } finally {
            setIsMatching(false);
        }
    };

    // Update quantity in result
    const handleQuantityChange = (index, delta) => {
        if (!bomResult) return;
        const newResults = [...bomResult.results];
        const item = newResults[index];
        const newQty = Math.max(1, (item.requested_quantity || 1) + delta);
        item.requested_quantity = newQty;
        item.in_stock = (item.stock_available || 0) >= newQty;

        // Recalculate estimated total
        const newTotal = newResults.reduce((sum, r) => {
            if (r.matched_product) {
                const p = r.matched_product.sale_price || r.matched_product.price;
                return sum + p * r.requested_quantity;
            }
            return sum;
        }, 0);

        setBomResult({
            ...bomResult,
            results: newResults,
            estimated_total: Math.round(newTotal * 100) / 100,
        });
    };

    // Swap matched product with an alternative
    const handleSwapProduct = (index, alternativeProduct) => {
        if (!bomResult) return;
        const newResults = [...bomResult.results];
        const currentItem = newResults[index];

        const prevMatched = currentItem.matched_product;
        currentItem.matched_product = alternativeProduct;
        currentItem.status = 'partial_match';
        currentItem.stock_available = alternativeProduct.stock;
        currentItem.in_stock = (alternativeProduct.stock || 0) >= currentItem.requested_quantity;

        // Add previous product to alternatives if not already there
        if (prevMatched) {
            currentItem.alternatives = [
                prevMatched,
                ...currentItem.alternatives.filter((a) => a.id !== alternativeProduct.id),
            ];
        }

        // Recalculate estimated total
        const newTotal = newResults.reduce((sum, r) => {
            if (r.matched_product) {
                const p = r.matched_product.sale_price || r.matched_product.price;
                return sum + p * r.requested_quantity;
            }
            return sum;
        }, 0);

        setBomResult({
            ...bomResult,
            results: newResults,
            estimated_total: Math.round(newTotal * 100) / 100,
        });
        toast.success(`Swapped with "${alternativeProduct.title}"`);
    };

    // Bulk Add to Cart
    const handleAddAllToCart = async (inStockOnly = false) => {
        if (!bomResult || bomResult.results.length === 0) return;

        const itemsToAdd = bomResult.results.filter((r) => {
            if (!r.matched_product) return false;
            if (inStockOnly && !r.in_stock) return false;
            return true;
        });

        if (itemsToAdd.length === 0) {
            toast.error("No items available to add to cart.");
            return;
        }

        setIsAddingToCart(true);
        let addedCount = 0;

        try {
            for (const item of itemsToAdd) {
                const productObj = {
                    id: item.matched_product.id,
                    title: item.matched_product.title,
                    price: item.matched_product.sale_price || item.matched_product.price,
                    image: item.matched_product.image,
                    stock: item.matched_product.stock,
                };
                await addToCart(productObj, item.requested_quantity);
                addedCount += item.requested_quantity;
            }

            toast.success(`Added ${addedCount} units to cart!`);
            navigate('/cart');
        } catch (err) {
            console.error("Failed adding BOM items to cart:", err);
            toast.error("Some items could not be added. Please verify cart.");
        } finally {
            setIsAddingToCart(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-tronix-bg">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Hero / Header */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 border border-white/10 p-6 sm:p-10">
                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider mb-4">
                            <Sparkles size={14} className="text-violet-400" />
                            Electronics & Robotics Lab Tool
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                            Quick <span className="text-violet-400">Bill of Materials (BOM)</span> Uploader
                        </h1>
                        <p className="mt-3 text-gray-300 text-sm sm:text-base leading-relaxed">
                            Upload your project spreadsheet or paste your components list. Our intelligent engine automatically matches SKUs, product titles, and stock availability so you can order everything in one click.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleDownloadSample}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                            >
                                <Download size={16} />
                                <span>Download Sample Template (.csv)</span>
                            </button>
                            <Link
                                to="/tower-orders"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-violet-300 hover:text-white transition-colors"
                            >
                                <span>Need factory indent / bulk non-stock parts? Try Tower Orders</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Input Workspace */}
                <div className="bg-tronix-card border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
                    {/* Mode Tabs */}
                    <div className="flex border-b border-white/10 mb-6 gap-6">
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`pb-3 font-semibold text-sm sm:text-base transition-colors flex items-center gap-2 border-b-2 ${
                                activeTab === 'upload'
                                    ? 'border-violet-500 text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        >
                            <UploadCloud size={18} />
                            <span>Upload File (CSV / TXT)</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('paste')}
                            className={`pb-3 font-semibold text-sm sm:text-base transition-colors flex items-center gap-2 border-b-2 ${
                                activeTab === 'paste'
                                    ? 'border-violet-500 text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        >
                            <FileText size={18} />
                            <span>Quick Paste Text</span>
                        </button>
                    </div>

                    {/* Tab 1: Upload */}
                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            <label className="border-2 border-dashed border-white/20 hover:border-violet-500/60 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/5 hover:bg-violet-900/10">
                                <FileSpreadsheet size={48} className="text-violet-400 mb-4 animate-pulse" />
                                <span className="text-white font-bold text-base sm:text-lg mb-1">
                                    {fileName ? fileName : 'Drag & drop or browse your CSV file'}
                                </span>
                                <span className="text-gray-400 text-xs sm:text-sm">
                                    Supports .csv and .txt with columns: Part Name, Quantity, SKU
                                </span>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}

                    {/* Tab 2: Paste */}
                    {activeTab === 'paste' && (
                        <div className="space-y-4">
                            <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider">
                                Paste components list (One item per line with optional quantity)
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={6}
                                placeholder={`Arduino Uno, 2\nESP32, 5\nHC-SR04, 10\nSG90 Servo, 4`}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-mono focus:border-violet-500 focus:outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-400">
                                Formats supported: <code className="text-violet-300">ESP32, 5</code> or <code className="text-violet-300">5x ESP32</code> or <code className="text-violet-300">ESP32 [TAB] 5</code>
                            </p>
                        </div>
                    )}

                    {/* Action Trigger */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => triggerMatching()}
                            disabled={isMatching}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-violet-900/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw size={16} className={isMatching ? 'animate-spin' : ''} />
                            <span>{isMatching ? 'Analyzing & Matching Parts...' : 'Analyze & Match BOM'}</span>
                        </button>
                    </div>
                </div>

                {/* Match Review Section */}
                {bomResult && (
                    <div className="bg-tronix-card border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                        {/* Summary Metrics Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Total Requested</p>
                                <p className="text-2xl font-black text-white">{bomResult.total_requested} items</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                <p className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-1">Matched in Catalog</p>
                                <p className="text-2xl font-black text-emerald-300">{bomResult.matched_count} items</p>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                <p className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-1">Ready In Stock</p>
                                <p className="text-2xl font-black text-blue-300">{bomResult.in_stock_count} items</p>
                            </div>
                            <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl">
                                <p className="text-xs uppercase font-bold text-violet-400 tracking-wider mb-1">Estimated Total</p>
                                <p className="text-2xl font-black text-violet-300">₹{bomResult.estimated_total.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                                        <th className="py-3 px-3">#</th>
                                        <th className="py-3 px-3">Requested Query</th>
                                        <th className="py-3 px-3">Matched Product</th>
                                        <th className="py-3 px-3 text-center">Status</th>
                                        <th className="py-3 px-3 text-center">Quantity</th>
                                        <th className="py-3 px-3 text-right">Unit Price</th>
                                        <th className="py-3 px-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {bomResult.results.map((res, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                                            <td className="py-4 px-3 text-white font-medium">
                                                <span>{res.original_query}</span>
                                            </td>
                                            <td className="py-4 px-3">
                                                {res.matched_product ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 p-1 flex-shrink-0 flex items-center justify-center">
                                                            {res.matched_product.image ? (
                                                                <img
                                                                    src={getImageUrl(res.matched_product.image)}
                                                                    alt={res.matched_product.title}
                                                                    className="max-w-full max-h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Package size={20} className="text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-semibold line-clamp-1">
                                                                {res.matched_product.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                                {res.matched_product.sku && (
                                                                    <span className="font-mono">SKU: {res.matched_product.sku}</span>
                                                                )}
                                                                <span>Stock: {res.stock_available}</span>
                                                            </div>

                                                            {/* Alternative Swapper */}
                                                            {res.alternatives && res.alternatives.length > 0 && (
                                                                <div className="mt-1">
                                                                    <select
                                                                        onChange={(e) => {
                                                                            const alt = res.alternatives.find(
                                                                                (a) => String(a.id) === e.target.value
                                                                            );
                                                                            if (alt) handleSwapProduct(idx, alt);
                                                                        }}
                                                                        className="bg-black/30 border border-white/10 rounded text-[11px] text-violet-300 py-0.5 px-1.5 focus:outline-none"
                                                                        defaultValue=""
                                                                    >
                                                                        <option value="" disabled>
                                                                            Swap with alternative ({res.alternatives.length})...
                                                                        </option>
                                                                        {res.alternatives.map((alt) => (
                                                                            <option key={alt.id} value={alt.id}>
                                                                                {alt.title} (₹{alt.sale_price || alt.price}, Stock: {alt.stock})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500 text-xs italic">
                                                        No exact catalog match found
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-3 text-center">
                                                {res.status === 'exact_match' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={12} /> Exact
                                                    </span>
                                                ) : res.status === 'partial_match' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        <CheckCircle2 size={12} /> Matched
                                                    </span>
                                                ) : res.status === 'out_of_stock' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <AlertCircle size={12} /> Out of Stock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                                        <AlertCircle size={12} /> Missing
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-3 text-center">
                                                <div className="inline-flex items-center bg-black/30 border border-white/10 rounded-lg p-1">
                                                    <button
                                                        onClick={() => handleQuantityChange(idx, -1)}
                                                        className="p-1 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="px-2 text-white font-bold text-xs">
                                                        {res.requested_quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(idx, 1)}
                                                        className="p-1 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-4 px-3 text-right font-mono text-gray-300">
                                                {res.matched_product
                                                    ? `₹${(res.matched_product.sale_price || res.matched_product.price).toFixed(2)}`
                                                    : '-'}
                                            </td>
                                            <td className="py-4 px-3 text-right font-mono font-bold text-white">
                                                {res.matched_product
                                                    ? `₹${(
                                                          (res.matched_product.sale_price || res.matched_product.price) *
                                                          res.requested_quantity
                                                      ).toFixed(2)}`
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Bulk Action Controls */}
                        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-gray-400">
                                Have unlisted or missing items? You can order non-inventory parts directly with{' '}
                                <Link to="/tower-orders" className="text-violet-400 font-bold hover:underline">
                                    B2B Tower Orders ➔
                                </Link>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => handleAddAllToCart(true)}
                                    disabled={isAddingToCart || bomResult.in_stock_count === 0}
                                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Add In-Stock Items ({bomResult.in_stock_count})
                                </button>
                                <button
                                    onClick={() => handleAddAllToCart(false)}
                                    disabled={isAddingToCart || bomResult.matched_count === 0}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    <ShoppingCart size={16} />
                                    <span>
                                        {isAddingToCart
                                            ? 'Adding to Cart...'
                                            : `Add All Matched to Cart (₹${bomResult.estimated_total.toLocaleString('en-IN')})`}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BOMUpload;
