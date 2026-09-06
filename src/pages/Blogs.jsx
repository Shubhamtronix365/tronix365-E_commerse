import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    BookOpen,
    Search,
    Clock,
    Eye,
    EyeOff,
    Tag,
    Cpu,
    ArrowRight,
    Sparkles,
    Filter,
    Flame,
    Share2,
    Check,
    Layers,
    ChevronRight,
    Lock,
    Shield,
    X,
    KeyRound,
} from 'lucide-react';
import client from '../api/client';
import { getImageUrl, FALLBACK_BLOG_IMAGE } from '../utils/imageUtils';
import SEO from '../components/common/SEO';
import BlogShareModal from '../components/blog/BlogShareModal';

const Blogs = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [featuredPosts, setFeaturedPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Share Modal States
    const [selectedSharePost, setSelectedSharePost] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Blog Author Portal Modal States
    const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
    const [authorId, setAuthorId] = useState('');
    const [authorPassword, setAuthorPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loggingIn, setLoggingIn] = useState(false);

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('tronix_user') || '{}');
        } catch {
            return {};
        }
    })();
    const isAuthor = ['admin', 'blog_author'].includes(currentUser?.role);

    // Fetch category summary
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await client.get('/blogs/categories/summary');
                setCategories(res.data?.categories || []);
            } catch (err) {
                console.error('Error fetching blog categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Fetch featured hero posts
    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const res = await client.get('/blogs/featured?limit=3');
                setFeaturedPosts(res.data || []);
            } catch (err) {
                console.error('Error fetching featured blogs:', err);
            }
        };
        fetchFeatured();
    }, []);

    // Fetch published blogs
    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '12');
            if (selectedCategory && selectedCategory !== 'All') {
                params.append('category', selectedCategory);
            }
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const res = await client.get(`/blogs?${params.toString()}`);
            setPosts(res.data?.posts || []);
            setTotalPages(res.data?.total_pages || 1);
        } catch (err) {
            console.error('Error fetching blog list:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchBlogs();
    }, [selectedCategory]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBlogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, page]);

    const handleAuthorLogin = async (e) => {
        e.preventDefault();
        if (!authorId.trim() || !authorPassword.trim()) {
            return toast.error('Please enter Author ID and Password');
        }

        setLoggingIn(true);
        try {
            const res = await client.post('/blogs/author/login', {
                author_id: authorId.trim(),
                password: authorPassword,
            });

            localStorage.setItem('tronix_token', res.data.access_token);
            localStorage.setItem(
                'tronix_user',
                JSON.stringify({
                    email: res.data.email || res.data.author_id,
                    role: res.data.role,
                    full_name: res.data.user_name,
                })
            );

            toast.success(`Welcome to Blog Studio, ${res.data.user_name}!`);
            setIsAuthorModalOpen(false);
            navigate('/blog-studio');
        } catch (err) {
            console.error('Blog author login error:', err);
            const msg = err.response?.data?.detail || 'Invalid Author ID or Password';
            toast.error(msg);
        } finally {
            setLoggingIn(false);
        }
    };

    const heroPost = featuredPosts[0];

    return (
        <div className="min-h-screen pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-tronix-dark">
            <SEO
                title="Engineering & Tech Blog | Hardware Tutorials, Pinouts & IoT Guides"
                description="Deep dive electronics tutorials, Raspberry Pi & ESP32 guides, circuit schematics, pinouts, and hardware reviews written by engineers at Tronix365."
                keywords="electronics tutorials, robotics, IoT guides, ESP32 pinout, raspberry pi, circuit diagrams, hardware engineering"
                canonicalUrl={`${window.location.origin}/blogs`}
            />

            <div className="max-w-7xl mx-auto space-y-10">
                {/* Top Studio Access Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                        <Link to="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <ChevronRight size={14} />
                        <span className="text-tronix-accent font-medium">Engineering Blogs</span>
                    </div>

                    <button
                        onClick={() => {
                            if (isAuthor) {
                                navigate('/blog-studio');
                            } else {
                                setIsAuthorModalOpen(true);
                            }
                        }}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-tronix-accent/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-tronix-accent/35 border border-tronix-accent/50 hover:border-tronix-accent text-xs sm:text-sm font-semibold text-white shadow-lg shadow-tronix-accent/15 transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer"
                    >
                        <div className="w-6 h-6 rounded-lg bg-tronix-accent/20 border border-tronix-accent/40 flex items-center justify-center text-tronix-accent group-hover:scale-110 transition-transform">
                            <Shield size={14} />
                        </div>
                        <span className="font-semibold tracking-wide text-white group-hover:text-tronix-accent transition-colors">
                            {isAuthor ? 'Open Blog Studio' : 'Author / Team Login'}
                        </span>
                    </button>
                </div>

                {/* Header Title Section */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-tronix-accent/15 text-tronix-accent border border-tronix-accent/30 tracking-wide uppercase"
                    >
                        <Sparkles size={14} />
                        Engineering Knowledge Hub
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight leading-tight"
                    >
                        Hardware Guides, Robotics &{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-tronix-accent via-emerald-400 to-teal-300">
                            Embedded Tech
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto"
                    >
                        Deep dive tutorials, pinouts, circuit schematics, and hardware reviews written by engineers for makers and innovators.
                    </motion.p>
                </div>

                {/* Hero Spotlight Card (Featured Post) */}
                {heroPost && !searchQuery && selectedCategory === 'All' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="relative group rounded-2xl p-1 bg-gradient-to-r from-tronix-accent/40 via-emerald-500/20 to-teal-500/40 shadow-2xl"
                    >
                        <div className="bg-neutral-900/90 backdrop-blur-xl rounded-[14px] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            {/* Image side */}
                            <div className="lg:col-span-7 aspect-video sm:aspect-[16/9] rounded-xl overflow-hidden bg-black/40 border border-white/10 relative group-hover:border-tronix-accent/40 transition-colors">
                                {heroPost.cover_image ? (
                                    <img
                                        src={getImageUrl(heroPost.cover_image)}
                                        alt={heroPost.title}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 bg-neutral-950">
                                        <Cpu size={64} />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <span className="px-3 py-1 text-xs font-bold bg-amber-500 text-black rounded-full flex items-center gap-1 shadow-lg">
                                        <Flame size={14} /> Spotlight
                                    </span>
                                    <span className="px-3 py-1 text-xs font-semibold bg-black/70 backdrop-blur-md text-white rounded-full border border-white/15">
                                        {heroPost.category}
                                    </span>
                                </div>
                            </div>

                            {/* Content side */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {heroPost.reading_time_minutes || 5} min read
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Eye size={14} />
                                        {heroPost.views_count || 0} reads
                                    </span>
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white group-hover:text-tronix-accent transition-colors leading-snug">
                                    <Link to={`/blog/${heroPost.slug}`}>{heroPost.title}</Link>
                                </h2>

                                <p className="text-gray-300 text-sm sm:text-base line-clamp-3 leading-relaxed">
                                    {heroPost.summary ||
                                        'Explore in-depth technical implementation and hardware specifications...'}
                                </p>

                                <div className="pt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-tronix-accent/20 border border-tronix-accent/40 flex items-center justify-center font-bold text-sm text-tronix-accent">
                                            {heroPost.author_name?.[0] || 'T'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-white">
                                                {heroPost.author_name}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {heroPost.author_role || 'Hardware Engineer'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedSharePost(heroPost);
                                                setIsShareModalOpen(true);
                                            }}
                                            title="Share article"
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                                        >
                                            <Share2 size={13} />
                                            <span>Share</span>
                                        </button>
                                        <Link
                                            to={`/blog/${heroPost.slug}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-tronix-accent group-hover:translate-x-1 transition-transform"
                                        >
                                            Read Guide <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Filter and Search Bar */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                        {/* Category Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            <button
                                onClick={() => setSelectedCategory('All')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                    selectedCategory === 'All'
                                        ? 'bg-tronix-accent text-white shadow-lg shadow-tronix-accent/25'
                                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                All Articles
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.category}
                                    onClick={() => setSelectedCategory(cat.category)}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                                        selectedCategory === cat.category
                                            ? 'bg-tronix-accent text-white shadow-lg shadow-tronix-accent/25'
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span>{cat.category}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            selectedCategory === cat.category
                                                ? 'bg-black/30 text-white'
                                                : 'bg-white/10 text-gray-400'
                                        }`}
                                    >
                                        {cat.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-72 flex-shrink-0">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                                size={16}
                            />
                            <input
                                type="text"
                                placeholder="Search tutorials, pins, IoT..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Articles Bento Grid */}
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((idx) => (
                                <div
                                    key={idx}
                                    className="bg-neutral-900/60 border border-white/10 rounded-2xl p-4 animate-pulse space-y-4"
                                >
                                    <div className="aspect-video bg-white/5 rounded-xl"></div>
                                    <div className="h-4 bg-white/10 rounded w-1/3"></div>
                                    <div className="h-6 bg-white/10 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/5 rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-900/40 border border-white/10 rounded-2xl max-w-xl mx-auto space-y-3">
                            <BookOpen size={48} className="mx-auto text-gray-600 mb-2" />
                            <h3 className="text-xl font-bold text-white">No articles found</h3>
                            <p className="text-sm text-gray-400">
                                {searchQuery
                                    ? `No articles match "${searchQuery}". Try a different keyword.`
                                    : 'There are currently no articles published in this category.'}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-4 py-2 text-xs font-semibold bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post, index) => (
                                <motion.article
                                    key={post.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="group bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/10 hover:border-tronix-accent/40 rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all duration-300 hover:-translate-y-1"
                                >
                                    {/* Card Cover Image */}
                                    <Link
                                        to={`/blog/${post.slug}`}
                                        className="aspect-video bg-neutral-950 border-b border-white/10 overflow-hidden relative block"
                                    >
                                        {post.cover_image ? (
                                            <img
                                                src={getImageUrl(post.cover_image)}
                                                alt={post.title}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                                                }}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700 bg-neutral-950">
                                                <Cpu size={40} />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-black/70 backdrop-blur-md text-tronix-accent border border-tronix-accent/30 rounded-full">
                                                {post.category || 'Tutorial'}
                                            </span>
                                        </div>
                                    </Link>

                                    {/* Card Content */}
                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {post.reading_time_minutes || 5} min read
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Eye size={12} />
                                                    {post.views_count || 0} reads
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-white group-hover:text-tronix-accent transition-colors line-clamp-2 leading-snug">
                                                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                                            </h3>

                                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                                {post.summary || 'Click to view the full hardware engineering guide.'}
                                            </p>
                                        </div>

                                        {/* Footer Info */}
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-tronix-accent">
                                                    {post.author_name?.[0] || 'T'}
                                                </div>
                                                <span className="text-gray-300 font-medium truncate max-w-[120px]">
                                                    {post.author_name}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedSharePost(post);
                                                        setIsShareModalOpen(true);
                                                    }}
                                                    title="Share article"
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <Share2 size={13} />
                                                </button>
                                                <Link
                                                    to={`/blog/${post.slug}`}
                                                    className="text-tronix-accent font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                                >
                                                    Read <ChevronRight size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-10">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                                        page === p
                                            ? 'bg-tronix-accent text-white'
                                            : 'bg-neutral-900 border border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Author / Team Portal Login Modal */}
            <AnimatePresence>
                {isAuthorModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAuthorModalOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-left"
                        >
                            {/* Decorative ambient glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-tronix-accent/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tronix-accent/20 to-emerald-500/20 border border-tronix-accent/40 flex items-center justify-center text-tronix-accent">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-display font-bold text-white leading-tight">
                                            Blog Studio Access
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            Author & Engineering Team Portal
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAuthorModalOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="mt-4 text-xs text-gray-300 leading-relaxed">
                                Enter your system-generated author credentials to access the standalone publication dashboard, create hardware guides, pinout diagrams, and manage BOMs.
                            </p>

                            <form onSubmit={handleAuthorLogin} className="mt-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Author ID / System Email
                                    </label>
                                    <div className="relative">
                                        <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={authorId}
                                            onChange={(e) => setAuthorId(e.target.value)}
                                            placeholder="author_team@tronix365.in"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-tronix-accent focus:ring-1 focus:ring-tronix-accent text-sm text-white placeholder-gray-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Password / Access Key
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={authorPassword}
                                            onChange={(e) => setAuthorPassword(e.target.value)}
                                            placeholder="••••••••••••••••"
                                            required
                                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-tronix-accent focus:ring-1 focus:ring-tronix-accent text-sm text-white placeholder-gray-500 transition-all outline-none font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-gray-400 flex items-start gap-2">
                                    <Shield size={14} className="text-tronix-accent shrink-0 mt-0.5" />
                                    <span>
                                        Accounts are provisioned via the secure administrative script. Contact the engineering lead if you need new author credentials.
                                    </span>
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAuthorModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loggingIn}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-tronix-accent to-emerald-500 text-white text-xs font-semibold hover:brightness-110 shadow-lg shadow-tronix-accent/25 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {loggingIn ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                Enter Blog Studio
                                                <ArrowRight size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Share Modal */}
            <BlogShareModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setSelectedSharePost(null);
                }}
                post={selectedSharePost}
            />
        </div>
    );
};

export default Blogs;
