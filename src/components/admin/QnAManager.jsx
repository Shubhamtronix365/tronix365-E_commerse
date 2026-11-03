import React, { useState, useEffect } from 'react';
import { 
    HelpCircle, Plus, Search, CheckCircle2, Clock, Trash2, Edit3, 
    Sparkles, X, Check, ExternalLink, Filter, MessageSquare, Tag, Boxes, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';
import { slugify } from '../../utils/slugify';

const QnAManager = ({ products = [] }) => {
    const [qnaList, setQnaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'answered', 'faqs'
    const [selectedProductId, setSelectedProductId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for adding pre-populated FAQ
    const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
    const [faqProductId, setFaqProductId] = useState('');
    const [faqQuestion, setFaqQuestion] = useState('');
    const [faqAnswer, setFaqAnswer] = useState('');
    const [faqIsPinned, setFaqIsPinned] = useState(true);
    const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);

    // Inline answering state
    const [replyingId, setReplyingId] = useState(null);
    const [replyAnswerText, setReplyAnswerText] = useState('');
    const [replyIsFaq, setReplyIsFaq] = useState(false);
    const [isSavingReply, setIsSavingReply] = useState(false);

    // Fetch all Q&A from backend
    const fetchAllQnA = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter === 'pending') params.status = 'pending';
            if (statusFilter === 'answered') params.status = 'answered';
            if (selectedProductId) params.product_id = selectedProductId;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await client.get('/admin/qna', { params });
            let data = Array.isArray(res.data) ? res.data : [];
            if (statusFilter === 'faqs') {
                data = data.filter(item => item.is_faq);
            }
            setQnaList(data);
        } catch (error) {
            console.error('Failed to fetch admin Q&A:', error);
            toast.error('Failed to load questions list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllQnA();
    }, [statusFilter, selectedProductId]);

    // Handle Search trigger
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchAllQnA();
    };

    // Publish / Edit official reply
    const handleSaveReply = async (qnaId) => {
        const clean = replyAnswerText.trim();
        if (!clean) {
            toast.error('Answer cannot be empty');
            return;
        }

        setIsSavingReply(true);
        try {
            await client.put(`/qna/${qnaId}/answer`, {
                answer: clean,
                is_faq: replyIsFaq
            });
            toast.success('Answer published successfully!');
            setReplyingId(null);
            setReplyAnswerText('');
            await fetchAllQnA();
        } catch (error) {
            console.error('Error saving answer:', error);
            toast.error(error.response?.data?.detail || 'Failed to save answer');
        } finally {
            setIsSavingReply(false);
        }
    };

    // Delete question
    const handleDeleteQnA = async (qnaId) => {
        if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;
        try {
            await client.delete(`/qna/${qnaId}`);
            toast.success('Question deleted successfully');
            setQnaList(prev => prev.filter(q => q.id !== qnaId));
        } catch (error) {
            console.error('Error deleting question:', error);
            toast.error('Failed to delete question');
        }
    };

    // Create Pre-populated Product FAQ
    const handleCreateFaq = async (e) => {
        e.preventDefault();
        if (!faqProductId) {
            toast.error('Please select a product');
            return;
        }
        if (!faqQuestion.trim()) {
            toast.error('Please enter a question');
            return;
        }

        setIsSubmittingFaq(true);
        try {
            await client.post('/admin/qna', {
                product_id: Number(faqProductId),
                question: faqQuestion.trim(),
                answer: faqAnswer.trim() || null,
                is_faq: faqIsPinned
            });

            toast.success('Product FAQ published to storefront!');
            setIsAddFaqOpen(false);
            setFaqQuestion('');
            setFaqAnswer('');
            setFaqProductId('');
            setFaqIsPinned(true);
            await fetchAllQnA();
        } catch (error) {
            console.error('Error creating product FAQ:', error);
            toast.error(error.response?.data?.detail || 'Failed to create FAQ');
        } finally {
            setIsSubmittingFaq(false);
        }
    };

    // Statistics counts
    const totalCount = qnaList.length;
    const pendingCount = qnaList.filter(q => !q.answer).length;
    const answeredCount = qnaList.filter(q => !!q.answer).length;
    const faqsCount = qnaList.filter(q => q.is_faq).length;

    const formatDate = (isoString) => {
        if (!isoString) return 'Recently';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Recently';
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-tronix-card border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-gray-400 font-medium">All Questions</span>
                        <h4 className="text-2xl font-bold text-white mt-1">{totalCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                        <MessageSquare size={18} />
                    </div>
                </div>

                <div className="bg-tronix-card border border-amber-500/30 bg-amber-500/[0.03] rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-amber-300 font-medium">Pending Answers</span>
                        <h4 className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Clock size={18} />
                    </div>
                </div>

                <div className="bg-tronix-card border border-emerald-500/30 bg-emerald-500/[0.03] rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-emerald-300 font-medium">Answered</span>
                        <h4 className="text-2xl font-bold text-emerald-400 mt-1">{answeredCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 size={18} />
                    </div>
                </div>

                <div className="bg-tronix-card border border-violet-500/30 bg-violet-500/[0.03] rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-violet-300 font-medium">Featured FAQs</span>
                        <h4 className="text-2xl font-bold text-violet-400 mt-1">{faqsCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center">
                        <Sparkles size={18} />
                    </div>
                </div>
            </div>

            {/* Filter, Search & Add FAQ Action Toolbar */}
            <div className="bg-tronix-card border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start">
                        {[
                            { id: 'all', label: 'All Questions' },
                            { id: 'pending', label: 'Pending Reply' },
                            { id: 'answered', label: 'Answered' },
                            { id: 'faqs', label: 'Pinned FAQs' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    statusFilter === tab.id
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Add Product FAQ Action Button */}
                    <button
                        type="button"
                        onClick={() => setIsAddFaqOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-600/20 border border-violet-400/30 cursor-pointer shrink-0"
                    >
                        <Plus size={16} />
                        <span>Add Product FAQ / Q&A</span>
                    </button>
                </div>

                {/* Search Bar & Product Filter Dropdown */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                            <input
                                type="text"
                                placeholder="Search questions, answers, customer email, or product..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            Search
                        </button>
                    </form>

                    <div className="md:col-span-4">
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-violet-500 outline-none cursor-pointer"
                        >
                            <option value="" className="bg-tronix-card text-white">All Products ({products.length})</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id} className="bg-tronix-card text-white">
                                    {p.title} ({p.sku || p.skv || `#${p.id}`})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Questions Feed */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-16 bg-tronix-card border border-white/10 rounded-2xl space-y-3">
                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-gray-400">Loading questions & answers...</p>
                    </div>
                ) : qnaList.length === 0 ? (
                    <div className="text-center py-16 bg-tronix-card border border-white/10 rounded-2xl space-y-3">
                        <HelpCircle className="w-12 h-12 text-gray-600 mx-auto" />
                        <h4 className="text-base font-bold text-white">No questions found</h4>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                            No product questions match the current filter. You can add common technical FAQs to products using the button above.
                        </p>
                    </div>
                ) : (
                    qnaList.map((item) => {
                        const isReplying = replyingId === item.id;
                        return (
                            <div
                                key={item.id}
                                className={`p-5 rounded-2xl border transition-all space-y-4 bg-tronix-card ${
                                    item.is_faq
                                        ? 'border-violet-500/30 shadow-lg shadow-violet-500/5'
                                        : !item.answer
                                        ? 'border-amber-500/30'
                                        : 'border-white/10'
                                }`}
                            >
                                {/* Item Header: Product Details & Badges */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        {/* Product Thumbnail */}
                                        <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                            <img
                                                src={getImageUrl(item.product_image)}
                                                alt={item.product_title || 'Product'}
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`/product/${slugify(item.product_title || String(item.product_id))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs sm:text-sm font-bold text-white hover:text-violet-400 transition-colors flex items-center gap-1"
                                                >
                                                    <span>{item.product_title || `Product #${item.product_id}`}</span>
                                                    <ExternalLink size={12} className="text-gray-400" />
                                                </a>
                                                {item.product_sku && (
                                                    <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded">
                                                        {item.product_sku}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                                <span>From: <strong className="text-gray-200">{item.user_name || 'Customer'}</strong> ({item.user_email || 'No email'})</span>
                                                <span>•</span>
                                                <span>{formatDate(item.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badges & Action Toolbar */}
                                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                        {item.is_faq && (
                                            <span className="text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Sparkles size={11} className="fill-current text-amber-400" /> FAQ
                                            </span>
                                        )}

                                        {!item.answer ? (
                                            <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Clock size={11} /> Pending Reply
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle2 size={11} /> Answered
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isReplying) {
                                                    setReplyingId(null);
                                                } else {
                                                    setReplyingId(item.id);
                                                    setReplyAnswerText(item.answer || '');
                                                    setReplyIsFaq(Boolean(item.is_faq));
                                                }
                                            }}
                                            className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Edit3 size={12} />
                                            <span>{item.answer ? 'Edit Answer' : 'Reply'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteQnA(item.id)}
                                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 transition-colors cursor-pointer"
                                            title="Delete question"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Question Text */}
                                <div className="space-y-1">
                                    <div className="flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                                            Q
                                        </span>
                                        <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                                            {item.question}
                                        </p>
                                    </div>
                                </div>

                                {/* Published Answer Display (if not editing) */}
                                {item.answer && !isReplying && (
                                    <div className="ml-7 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
                                        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                                            {item.answer}
                                        </p>
                                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-violet-500/15">
                                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                <span>Answered by {item.answered_by || 'Technical Desk'}</span>
                                            </span>
                                            {item.answered_at && (
                                                <span>{formatDate(item.answered_at)}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Inline Admin Reply Form */}
                                {isReplying && (
                                    <div className="ml-7 p-4 rounded-xl bg-black/40 border border-violet-500/50 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-violet-300">
                                            <span>Official Store Response</span>
                                            <button
                                                type="button"
                                                onClick={() => setReplyingId(null)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>

                                        <textarea
                                            rows="3"
                                            placeholder="Write official technical response for this product..."
                                            value={replyAnswerText}
                                            onChange={(e) => setReplyAnswerText(e.target.value)}
                                            className="w-full bg-black/60 border border-white/15 focus:border-violet-500 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none resize-none"
                                        />

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={replyIsFaq}
                                                    onChange={(e) => setReplyIsFaq(e.target.checked)}
                                                    className="w-4 h-4 rounded bg-black/40 border-white/20 text-violet-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span className="font-semibold text-amber-300">Mark as Featured Product FAQ</span>
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyingId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSavingReply || !replyAnswerText.trim()}
                                                    onClick={() => handleSaveReply(item.id)}
                                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check size={14} />
                                                    <span>{isSavingReply ? 'Publishing...' : 'Publish Answer'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal: Add Pre-Populated Product FAQ */}
            {isAddFaqOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative w-full max-w-xl bg-tronix-card border border-white/15 rounded-2xl shadow-2xl p-6 space-y-5 m-2 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="text-violet-400" size={20} />
                                <span>Add Product FAQ / Q&A</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddFaqOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFaq} className="space-y-4">
                            {/* Product Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                    Target Product <span className="text-rose-400">*</span>
                                </label>
                                <select
                                    required
                                    value={faqProductId}
                                    onChange={(e) => setFaqProductId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none cursor-pointer"
                                >
                                    <option value="" className="bg-tronix-card text-white">Select a product from catalog...</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-tronix-card text-white">
                                            {p.title} ({p.sku || p.skv || `#${p.id}`})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Question Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                    Question Text <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Can this board be programmed using PlatformIO or Arduino IDE?"
                                    value={faqQuestion}
                                    onChange={(e) => setFaqQuestion(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                                />
                            </div>

                            {/* Official Answer Textarea */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                    Official Answer (Optional - can be answered later)
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="e.g. Yes! Fully compatible with Arduino IDE 2.0 and VS Code PlatformIO. Simply select the board from the boards manager."
                                    value={faqAnswer}
                                    onChange={(e) => setFaqAnswer(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none resize-none"
                                />
                            </div>

                            {/* Pinned FAQ Checkbox */}
                            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={faqIsPinned}
                                    onChange={(e) => setFaqIsPinned(e.target.checked)}
                                    className="w-4 h-4 rounded bg-black/40 border-white/20 text-violet-600 focus:ring-0 cursor-pointer"
                                />
                                <div>
                                    <span className="font-semibold text-amber-300">Mark as Featured Product FAQ</span>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Pinned FAQs appear right at the top of the Q&A tab on the product details page.
                                    </p>
                                </div>
                            </label>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsAddFaqOpen(false)}
                                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingFaq}
                                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-600/25 cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingFaq ? (
                                        <>
                                            <Loader size={15} className="animate-spin" />
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            <span>Publish Product FAQ</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QnAManager;
