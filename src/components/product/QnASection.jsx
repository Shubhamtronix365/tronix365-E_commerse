import React, { useState } from 'react';
import { HelpCircle, Send, CheckCircle2, User, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const QnASection = ({ productId }) => {
    const [questions, setQuestions] = useState([
        {
            id: 1,
            question: "Is this board compatible with Arduino IDE 2.0?",
            askedBy: "Rohan M.",
            date: "2 days ago",
            answer: "Yes, fully compatible! You can install the official board manager package and program it using Arduino IDE 2.0 or VS Code PlatformIO.",
            answeredBy: "Tronix365 Technical Team"
        },
        {
            id: 2,
            question: "What is the operating voltage range?",
            askedBy: "Vikram S.",
            date: "1 week ago",
            answer: "The operating voltage is 3.3V, but the built-in USB Type-C port accepts 5V input safely with onboard voltage regulation.",
            answeredBy: "Tronix365 Support"
        }
    ]);
    const [newQuestion, setNewQuestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitQuestion = (e) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;

        setIsSubmitting(true);
        setTimeout(() => {
            const added = {
                id: Date.now(),
                question: newQuestion.trim(),
                askedBy: "You (Verified Customer)",
                date: "Just now",
                answer: null,
                answeredBy: null
            };
            setQuestions([added, ...questions]);
            setNewQuestion('');
            setIsSubmitting(false);
            toast.success("Your question has been submitted! Our technical team will answer shortly.");
        }, 600);
    };

    return (
        <div className="space-y-6">
            {/* Question Submission Box */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle size={18} className="text-violet-400" /> Have a question about this product?
                </h4>
                <form onSubmit={handleSubmitQuestion} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                        type="text"
                        placeholder="Ask a technical or compatibility question..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting || !newQuestion.trim()}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
                    >
                        <Send size={14} /> Ask Question
                    </button>
                </form>
            </div>

            {/* Questions & Answers List */}
            <div className="space-y-4">
                {questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                        No questions asked yet. Be the first to ask!
                    </div>
                ) : (
                    questions.map((q) => (
                        <div key={q.id} className="p-4.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                                        <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px]">Q</span>
                                        {q.question}
                                    </div>
                                    <div className="text-[11px] text-gray-400 pl-7 flex items-center gap-2">
                                        <span>Asked by {q.askedBy}</span>
                                        <span>•</span>
                                        <span>{q.date}</span>
                                    </div>
                                </div>
                            </div>

                            {q.answer ? (
                                <div className="ml-6 p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-1">
                                    <div className="text-xs text-gray-200 leading-relaxed">
                                        {q.answer}
                                    </div>
                                    <div className="text-[10px] font-bold text-violet-300 flex items-center gap-1">
                                        <CheckCircle2 size={12} className="text-emerald-400" />
                                        Answered by {q.answeredBy}
                                    </div>
                                </div>
                            ) : (
                                <div className="ml-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                                    <MessageSquare size={13} /> Question under review by technical team...
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default QnASection;
