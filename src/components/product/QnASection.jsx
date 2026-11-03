import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    HelpCircle, Send, CheckCircle2, User, MessageSquare, 
    Sparkles, Trash2, Edit3, Lock, ShieldCheck, Clock, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const QnASection = ({ productId }) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Admin inline response states
    const isAdmin = user?.role === 'admin';
    const [answeringId, setAnsweringId] = useState(null);
    const [adminAnswerText, setAdminAnswerText] = useState('');
    const [adminIsFaq, setAdminIsFaq] = useState(false);
    const [isSavingAnswer, setIsSavingAnswer] = useState(false);

    // Fetch product Q&A from backend
    const fetchQuestions = async () => {
        if (!productId) return;
        try {
            const res = await client.get(`/products/${productId}/qna`);
            setQuestions(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch product Q&A:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [productId]);

    // Handle customer question submit
    const handleSubmitQuestion = async (e) => {
        e.preventDefault();
        const clean = newQuestion.trim();
        if (!clean) return;

        if (!isAuthenticated) {
            toast.error("Please log in to ask a question");
            return;
        }

        setIsSubmitting(true);
        try {
            await client.post(`/products/${productId}/qna`, { question: clean });
            setNewQuestion('');
            toast.success("Your question has been submitted! Our technical team will answer shortly.");
            await fetchQuestions();
        } catch (error) {
            console.error("Error submitting question:", error);
            const errDetail = error.response?.data?.detail || "Failed to submit question. Please try again.";
            toast.error(typeof errDetail === 'string' ? errDetail : "Failed to submit question");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle admin publishing/editing an answer
    const handleSaveAdminAnswer = async (qnaId) => {
        const clean = adminAnswerText.trim();
        if (!clean) {
            toast.error("Answer cannot be empty");
            return;
        }

        setIsSavingAnswer(true);
        try {
            await client.put(`/qna/${qnaId}/answer`, {
                answer: clean,
                is_faq: adminIsFaq
            });
            toast.success("Answer published successfully!");
            setAnsweringId(null);
            setAdminAnswerText('');
            await fetchQuestions();
        } catch (error) {
            console.error("Error publishing answer:", error);
            toast.error(error.response?.data?.detail || "Failed to publish answer");
        } finally {
            setIsSavingAnswer(false);
        }
    };

    // Handle admin deleting a question
    const handleDeleteQuestion = async (qnaId) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            await client.delete(`/qna/${qnaId}`);
            toast.success("Question deleted");
            setQuestions(prev => prev.filter(q => q.id !== qnaId));
        } catch (error) {
            console.error("Error deleting question:", error);
            toast.error("Failed to delete question");
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'Recently';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return 'Recently';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <HelpCircle className="text-violet-400" size={20} />
                        <span>Customer Questions & Answers</span>
                        <span className="text-xs font-mono font-semibold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                            {questions.length}
                        </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Real technical answers from the Tronix365 engineering team and community.
                    </p>
                </div>
            </div>

            {/* Question Submission Section */}
            {isAuthenticated ? (
                /* Authenticated User Question Input */
                <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <MessageSquare size={16} className="text-violet-400" />
                            <span>Ask a Technical Question About This Product</span>
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                            Posting as <strong className="text-violet-300">{user?.name || user?.email}</strong>
                        </span>
                    </div>

                    <form onSubmit={handleSubmitQuestion} className="space-y-3">
                        <textarea
                            rows="2"
                            placeholder="e.g. Can this sensor module be powered with 3.3V logic? Does it require pull-up resistors?"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="w-full bg-black/40 border border-white/15 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                        />
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-gray-500">
                                Answers are published globally to help the maker community.
                            </span>
                            <button
                                type="submit"
                                disabled={isSubmitting || !newQuestion.trim()}
                                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
                            >
                                <Send size={13} />
                                <span>{isSubmitting ? 'Submitting...' : 'Post Question'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Non-Authenticated Login Prompt */
                <div className="p-4 sm:p-5 rounded-2xl bg-violet-950/25 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                            <Lock size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Have a technical question about this product?</h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Please log in to submit your question. Our engineering support desk answers verified customer questions promptly.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        state={{ from: location.pathname }}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/25 shrink-0 text-center flex items-center justify-center gap-1.5"
                    >
                        <span>Log In to Ask</span>
                    </Link>
                </div>
            )}

            {/* Questions & Answers List (Globally Visible to Everyone) */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 space-y-2">
                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-gray-400">Loading product questions...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                        <HelpCircle className="w-10 h-10 text-gray-600 mx-auto" />
                        <p className="text-sm font-semibold text-gray-300">No questions asked yet</p>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            Have a question regarding microcontroller pinout, logic levels, or compatibility? Be the first to ask!
                        </p>
                    </div>
                ) : (
                    questions.map((q) => {
                        const isAnswering = answeringId === q.id;
                        return (
                            <div
                                key={q.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                                    q.is_faq
                                        ? 'bg-violet-950/15 border-violet-500/30'
                                        : 'bg-white/5 border-white/10'
                                }`}
                            >
                                {/* Question Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-xs shrink-0">
                                                Q
                                            </span>
                                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                                {q.question}
                                            </h4>
                                            {q.is_faq && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Sparkles size={10} className="fill-current" /> Pinned FAQ
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-[11px] text-gray-400 pl-7 flex items-center gap-2">
                                            <span>Asked by <strong className="text-gray-300">{q.user_name || 'Customer'}</strong></span>
                                            <span>•</span>
                                            <span>{formatDate(q.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Admin Action Buttons (Reply / Edit / Delete) */}
                                    {isAdmin && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isAnswering) {
                                                        setAnsweringId(null);
                                                    } else {
                                                        setAnsweringId(q.id);
                                                        setAdminAnswerText(q.answer || '');
                                                        setAdminIsFaq(Boolean(q.is_faq));
                                                    }
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-600 border border-violet-500/30 text-violet-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                title="Reply or edit official answer as Admin"
                                            >
                                                <Edit3 size={12} />
                                                <span>{q.answer ? 'Edit Answer' : 'Reply as Admin'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 transition-colors cursor-pointer"
                                                title="Delete this question"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Official Answer Panel (if present) */}
                                {q.answer && !isAnswering && (
                                    <div className="ml-2 sm:ml-7 p-3.5 sm:p-4 rounded-xl bg-violet-500/10 border border-violet-500/25 space-y-1.5">
                                        <div className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                                            {q.answer}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-violet-500/15 text-[11px]">
                                            <div className="font-semibold text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 size={13} />
                                                <span>Official Answer from {q.answered_by || 'Tronix365 Support'}</span>
                                            </div>
                                            {q.answered_at && (
                                                <span className="text-gray-400 text-[10px]">
                                                    {formatDate(q.answered_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Pending Technical Review Banner (if unanswered) */}
                                {!q.answer && !isAnswering && (
                                    <div className="ml-2 sm:ml-7 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-2">
                                        <Clock size={14} className="shrink-0 text-amber-400" />
                                        <span>Under technical review. Our engineers will reply shortly.</span>
                                    </div>
                                )}

                                {/* Admin Inline Answer Form (When replying or editing) */}
                                {isAnswering && (
                                    <div className="ml-2 sm:ml-7 p-4 rounded-xl bg-black/40 border border-violet-500/50 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-violet-300">
                                            <span className="flex items-center gap-1.5">
                                                <ShieldCheck size={14} /> Official Admin Response
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAnsweringId(null)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>

                                        <textarea
                                            rows="3"
                                            placeholder="Write comprehensive engineering answer for this product..."
                                            value={adminAnswerText}
                                            onChange={(e) => setAdminAnswerText(e.target.value)}
                                            className="w-full bg-black/60 border border-white/15 focus:border-violet-500 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none resize-none"
                                        />

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={adminIsFaq}
                                                    onChange={(e) => setAdminIsFaq(e.target.checked)}
                                                    className="w-4 h-4 rounded bg-black/40 border-white/20 text-violet-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span className="font-semibold text-amber-300">Mark as Featured Product FAQ</span>
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setAnsweringId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSavingAnswer || !adminAnswerText.trim()}
                                                    onClick={() => handleSaveAdminAnswer(q.id)}
                                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check size={14} />
                                                    <span>{isSavingAnswer ? 'Publishing...' : 'Publish Answer'}</span>
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
        </div>
    );
};

export default QnASection;
