import React, { useState, useEffect } from 'react';
import { Star, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';

const ReviewSection = ({ productId, onStatsChange }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, count: 0 });

    // New Review State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Auth State
    const user = JSON.parse(localStorage.getItem('tronix_user'));
    const token = localStorage.getItem('tronix_token');
    const isLoggedIn = !!user && !!token;

    // Fetch Reviews
    const fetchReviews = async () => {
        try {
            const response = await client.get(`/products/${productId}/reviews`);
            const data = response.data;
            setReviews(data);

            // Calculate Stats
            if (data.length > 0) {
                const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
                const calculatedStats = { average: Math.round(avg * 10) / 10, count: data.length };
                setStats(calculatedStats);
                if (onStatsChange) onStatsChange(calculatedStats);
            } else {
                const calculatedStats = { average: 0, count: 0 };
                setStats(calculatedStats);
                if (onStatsChange) onStatsChange(calculatedStats);
            }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLoggedIn) {
            toast.error("You must be logged in to submit a review");
            return;
        }

        setSubmitting(true);

        try {
            // Include user_name for backwards compatibility with older backend versions
            const userName = user ? user.name || "Anonymous" : "Guest User";

            await client.post(`/products/${productId}/reviews`, {
                rating,
                comment,
                user_name: userName
            });

            toast.success('Review submitted successfully!');
            setComment('');
            setRating(5);
            fetchReviews(); // Refresh list
        } catch (error) {
            console.error('Error submitting review:', error);

            // FastApi returns validation errors as an array, which crashes React Hot Toast
            let errMsg = 'Failed to submit review';
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    errMsg = detail[0].msg;
                } else if (typeof detail === 'string') {
                    errMsg = detail;
                }
            }

            toast.error(errMsg);
        }
        finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Reviews Header / Stats */}
            <div className="bg-tronix-card/30 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-display font-bold text-white mb-2">Customer Reviews</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex text-yellow-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={20}
                                    fill={star <= Math.round(stats.average) ? "currentColor" : "none"}
                                    className={star <= Math.round(stats.average) ? "text-yellow-500" : "text-gray-600"}
                                />
                            ))}
                        </div>
                        <span className="text-2xl font-bold text-white">{stats.average.toFixed(1)}</span>
                        <span className="text-gray-400 text-sm">based on {stats.count} reviews</span>
                    </div>
                </div>

                {/* Write Review Button or Form Toggle could go here */}
            </div>

            {/* Write a Review Form */}
            <div className="bg-tronix-card/50 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Write a Review</h4>

                {!isLoggedIn ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                        <User size={32} className="mx-auto mb-3 text-gray-500" />
                        <p className="text-gray-300 mb-4">Please log in to share your thoughts about this product.</p>
                        <a href="/login" className="inline-block bg-tronix-primary hover:bg-violet-600 text-white font-medium px-6 py-2 rounded-lg transition-colors">
                            Log In to Review
                        </a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Rating</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            size={24}
                                            fill={star <= rating ? "currentColor" : "none"}
                                            className={star <= rating ? "text-yellow-500" : "text-gray-600 hover:text-yellow-500/50"}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Review</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                required
                                placeholder="Share your thoughts about this product..."
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tronix-primary outline-none transition-colors resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-tronix-primary hover:bg-violet-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : <><Send size={16} /> Submit Review</>}
                        </button>
                    </form>
                )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length > 0 ? (
                    reviews.map((review) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-tronix-card/30 border border-white/5 rounded-xl p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-tronix-primary">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-white font-medium">{review.user_name}</h5>
                                        <div className="text-xs text-tronix-muted mb-1">{review.user_email}</div>
                                        <div className="flex text-yellow-500 text-xs mt-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    fill={star <= review.rating ? "currentColor" : "none"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {review.comment}
                            </p>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl border-dashed">
                        No reviews yet. Be the first to share your experience!
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewSection;
