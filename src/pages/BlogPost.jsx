import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Clock,
    Eye,
    Tag,
    Cpu,
    ArrowLeft,
    Share2,
    Copy,
    Check,
    Twitter,
    Linkedin,
    MessageCircle,
    Calendar,
    ChevronRight,
    Bookmark,
    ExternalLink,
    ListFilter,
    ShieldCheck,
    Send,
} from 'lucide-react';
import client from '../api/client';
import { getImageUrl, formatBlogHtml, FALLBACK_BLOG_IMAGE } from '../utils/imageUtils';
import SEO from '../components/common/SEO';
import ArticleSchema from '../components/common/ArticleSchema';
import BlogShareModal from '../components/blog/BlogShareModal';

const BlogPost = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [headings, setHeadings] = useState([]);
    const contentRef = useRef(null);

    // Scroll progress tracker
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const currentProgress = (window.scrollY / totalHeight) * 100;
                setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch blog post by slug
    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await client.get(`/blogs/${slug}`);
                setPost(res.data);
            } catch (err) {
                console.error('Error fetching blog post:', err);
                setError(err.response?.status === 404 ? 'Blog article not found' : 'Failed to load blog article');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
        window.scrollTo(0, 0);
    }, [slug]);

    // Extract table of contents from rendered content
    useEffect(() => {
        if (!post || !contentRef.current) return;

        const headingElements = contentRef.current.querySelectorAll('h2, h3');
        const items = [];
        headingElements.forEach((el, index) => {
            const id = el.id || `heading-${index}`;
            el.id = id;
            items.push({
                id,
                text: el.innerText,
                level: el.tagName.toLowerCase(),
            });
        });
        setHeadings(items);

        // Add copy button to pre code blocks
        const codeBlocks = contentRef.current.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            if (pre.querySelector('.code-copy-btn')) return; // already added
            const btn = document.createElement('button');
            btn.className =
                'code-copy-btn absolute top-2 right-2 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-gray-300 font-sans cursor-pointer transition-colors';
            btn.innerText = 'Copy Code';
            btn.onclick = () => {
                const code = pre.querySelector('code')?.innerText || pre.innerText;
                navigator.clipboard.writeText(code);
                btn.innerText = 'Copied!';
                setTimeout(() => {
                    btn.innerText = 'Copy Code';
                }, 2000);
            };
            pre.style.position = 'relative';
            pre.appendChild(btn);
        });
    }, [post]);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        toast.success('Article link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleShareTwitter = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Read "${post?.title}" on Tronix365:`);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    const handleShareWhatsApp = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Check out this engineering guide on Tronix365: ${post?.title} ${window.location.href}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const handleShareLinkedIn = () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-tronix-dark text-white">
                <div className="w-12 h-12 border-4 border-tronix-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 text-sm">Loading engineering guide...</p>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-tronix-dark text-white">
                <div className="text-center max-w-md space-y-4">
                    <h2 className="text-2xl font-bold text-white">Article Not Found</h2>
                    <p className="text-gray-400 text-sm">
                        The requested guide or article could not be located, or it might be in draft mode.
                    </p>
                    <Link
                        to="/blogs"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tronix-accent text-white font-medium text-sm hover:brightness-110 transition-all"
                    >
                        <ArrowLeft size={16} /> Back to All Articles
                    </Link>
                </div>
            </div>
        );
    }

    const formattedDate = post.created_at
        ? new Date(post.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : 'Recent';

    const canonicalBlogUrl = `https://www.tronix365.in/e-commerse/blog/${post.slug}`;
    const articleImage = post.cover_image ? getImageUrl(post.cover_image) : 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png';

    return (
        <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-tronix-dark">
            {/* Open Graph & Search Engine Meta Tags */}
            <SEO
                title={`${post.title} | Engineering Guide`}
                description={post.summary || 'Detailed hardware tutorial, pinouts, and code implementation.'}
                keywords={post.tags && post.tags.length > 0 ? post.tags.join(', ') : 'electronics, IoT, Arduino, robotics, hardware tutorial'}
                image={articleImage}
                url={canonicalBlogUrl}
                type="article"
            />

            {/* Google Search Structured JSON-LD Data */}
            <ArticleSchema
                title={post.title}
                description={post.summary}
                image={articleImage}
                datePublished={post.created_at}
                dateModified={post.updated_at}
                authorName={post.author_name}
                authorRole={post.author_role}
                category={post.category}
                tags={post.tags}
                slug={post.slug}
                url={canonicalBlogUrl}
            />

            {/* Top Reading Progress Bar */}
            <div
                className="fixed top-0 left-0 h-1 bg-gradient-to-r from-tronix-accent to-emerald-400 z-50 transition-all duration-75"
                style={{ width: `${scrollProgress}%` }}
            />

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Breadcrumbs & Navigation */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link to="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <ChevronRight size={12} />
                        <Link to="/blogs" className="hover:text-white transition-colors">
                            Blogs
                        </Link>
                        <ChevronRight size={12} />
                        <span className="text-tronix-accent font-medium">{post.category}</span>
                        <ChevronRight size={12} />
                        <span className="text-gray-500 truncate max-w-[200px]">{post.title}</span>
                    </div>

                    <Link
                        to="/blogs"
                        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Blogs
                    </Link>
                </div>

                {/* Article Header Section matching engineering journal layout */}
                <div className="max-w-4xl space-y-5">
                    <div className="flex items-start gap-3">
                        <span className="w-8 h-1.5 bg-red-500 rounded-full mt-3 sm:mt-4 shrink-0 shadow-sm shadow-red-500/50" />
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-snug">
                            {post.title}
                        </h1>
                    </div>

                    {/* Published Date Line & Quick Stats */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1 pb-3 border-b border-white/10 text-xs text-gray-400">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-gray-200">
                                Published <span className="text-gray-300 font-normal">{formattedDate}</span>
                            </span>
                            <span>•</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-tronix-accent/15 text-tronix-accent border border-tronix-accent/30">
                                {post.category}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock size={13} /> {post.reading_time_minutes || 5} min read
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Eye size={13} /> {post.views_count || 1} views
                            </span>
                        </div>

                        {/* Share buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                title="Share Guide"
                                className="px-2.5 py-1.5 bg-tronix-accent/15 hover:bg-tronix-accent/25 border border-tronix-accent/30 text-tronix-accent rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold active:scale-95"
                            >
                                <Share2 size={13} />
                                <span>Share</span>
                            </button>
                            <button
                                onClick={handleCopyUrl}
                                title="Copy Article URL"
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
                            >
                                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={handleShareWhatsApp}
                                title="Share on WhatsApp"
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors cursor-pointer"
                            >
                                <MessageCircle size={14} />
                            </button>
                            <button
                                onClick={handleShareTwitter}
                                title="Share on X"
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors cursor-pointer"
                            >
                                <Twitter size={14} />
                            </button>
                            <button
                                onClick={handleShareLinkedIn}
                                title="Share on LinkedIn"
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-500 transition-colors cursor-pointer"
                            >
                                <Linkedin size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Author Meta Box with Uploaded Photo & Name */}
                    <div className="flex items-center gap-3.5 py-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/15 shrink-0 shadow-md relative flex items-center justify-center font-bold text-lg text-tronix-accent bg-gradient-to-br from-tronix-accent/20 to-emerald-500/20">
                            <span>{post.author_name?.[0]?.toUpperCase() || 'A'}</span>
                            {post.author_avatar && (
                                <img
                                    src={getImageUrl(post.author_avatar)}
                                    alt={post.author_name}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-white leading-tight">{post.author_name}</h4>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{post.author_role || 'Author'}</p>
                        </div>
                    </div>

                    {post.summary && (
                        <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-normal pt-1">
                            {post.summary}
                        </p>
                    )}
                </div>

                {/* Cover Image */}
                {post.cover_image && (
                    <div className="max-w-5xl rounded-2xl overflow-hidden border border-white/10 aspect-video max-h-[500px] shadow-2xl">
                        <img
                            src={getImageUrl(post.cover_image)}
                            alt={post.title}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                            }}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Main Content Layout: Two Columns (Sticky Sidebar + Article) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-6">
                    {/* Left Sticky Sidebar (TOC & Hardware Parts) */}
                    <aside className="lg:col-span-4 order-2 lg:order-1 space-y-6">
                        {/* Table of Contents */}
                        {headings.length > 0 && (
                            <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-5 sticky top-24 space-y-4 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-white font-semibold text-sm pb-2 border-b border-white/10">
                                    <ListFilter size={16} className="text-tronix-accent" />
                                    <span>Table of Contents</span>
                                </div>
                                <nav className="space-y-1 text-xs max-h-72 overflow-y-auto pr-1">
                                    {headings.map((h) => (
                                        <a
                                            key={h.id}
                                            href={`#${h.id}`}
                                            className={`block py-1.5 transition-colors ${
                                                h.level === 'h3'
                                                    ? 'pl-4 text-gray-500 hover:text-white'
                                                    : 'text-gray-300 hover:text-tronix-accent font-medium'
                                            }`}
                                        >
                                            {h.text}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {/* Components Used / BOM Card */}
                        {post.components_used && post.components_used.length > 0 && (
                            <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                        <Cpu size={16} className="text-tronix-accent" />
                                        <span>Components Used (BOM)</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {post.components_used.length} parts
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {post.components_used.map((comp, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:border-tronix-accent/30 transition-colors"
                                        >
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-semibold text-white truncate">
                                                    {comp.name}
                                                </p>
                                                {comp.sku && (
                                                    <p className="text-[10px] text-gray-400 font-mono">
                                                        SKU: {comp.sku}
                                                    </p>
                                                )}
                                            </div>
                                            <Link
                                                to={comp.link && comp.link.trim() ? comp.link : `/shop?search=${encodeURIComponent(comp.sku || comp.name)}`}
                                                className="px-2.5 py-1 text-[11px] font-semibold bg-tronix-accent/20 hover:bg-tronix-accent/30 text-tronix-accent border border-tronix-accent/30 rounded-lg flex-shrink-0 transition-colors"
                                            >
                                                View Part
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Verified Badge */}
                        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-300">
                            <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-white">Verified Hardware Design</p>
                                <p className="text-gray-400 text-[11px] mt-0.5">
                                    Tested on physical prototypes by the Tronix365 engineering lab.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Right Article Body */}
                    <article className="lg:col-span-8 order-1 lg:order-2">
                        <div
                            ref={contentRef}
                            className="blog-content-body prose prose-invert prose-emerald max-w-none text-gray-200 text-base leading-relaxed space-y-6 [&_figure]:my-8 [&_figure]:rounded-2xl [&_figure]:overflow-hidden [&_figure]:border [&_figure]:border-white/10 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:shadow-xl [&_img]:object-contain [&_img]:mx-auto [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-gray-400 [&_figcaption]:mt-2.5 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-2xl [&_iframe]:border [&_iframe]:border-white/10 [&_iframe]:shadow-xl [&_video]:w-full [&_video]:rounded-2xl [&_video]:border [&_video]:border-white/10 [&_video]:shadow-xl [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:pt-6 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-white/10 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-tronix-accent [&_h3]:pt-4 [&_p]:text-gray-300 [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:bg-white/5 [&_th]:p-3 [&_th]:text-left [&_th]:border-b [&_th]:border-white/10 [&_td]:p-3 [&_td]:border-b [&_td]:border-white/5"
                            dangerouslySetInnerHTML={{ __html: formatBlogHtml(post.content) }}
                        />

                        {/* Article Topic Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="pt-8 mt-12 border-t border-white/10 space-y-3">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Topics & Tags
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {post.tags.map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
                                        >
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interactive Share Bento Box */}
                        <div className="pt-8 mt-12 border-t border-white/10 bg-white/[0.02] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Share2 size={18} className="text-tronix-accent" />
                                        Found this guide helpful? Share with engineers!
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Share this tutorial with fellow developers, makers, and IoT builders.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tronix-accent text-black font-semibold text-xs hover:bg-tronix-accent/90 transition-all shadow-lg shadow-tronix-accent/20 cursor-pointer flex-shrink-0"
                                >
                                    <Share2 size={14} />
                                    <span>Share Article</span>
                                </button>
                            </div>
                        </div>
                    </article>
                </div>

                {/* Related Articles Section */}
                {post.related_posts && post.related_posts.length > 0 && (
                    <div className="pt-16 border-t border-white/10 space-y-8">
                        <div>
                            <span className="text-xs font-semibold text-tronix-accent uppercase tracking-wider">
                                Continue Reading
                            </span>
                            <h3 className="text-2xl font-display font-bold text-white mt-1">
                                Related Guides & Articles
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {post.related_posts.map((related) => (
                                <Link
                                    key={related.id}
                                    to={`/blog/${related.slug}`}
                                    className="group bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/10 hover:border-tronix-accent/40 rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all"
                                >
                                    <div className="aspect-video bg-neutral-950 overflow-hidden relative">
                                        {related.cover_image ? (
                                            <img
                                                src={getImageUrl(related.cover_image)}
                                                alt={related.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700 bg-neutral-950">
                                                <Cpu size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-black/70 backdrop-blur-md text-tronix-accent border border-tronix-accent/30 rounded-full">
                                                {related.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                                        <h4 className="text-sm font-bold text-white group-hover:text-tronix-accent transition-colors line-clamp-2">
                                            {related.title}
                                        </h4>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-white/5">
                                            <span>{related.reading_time_minutes || 5} min read</span>
                                            <span className="text-tronix-accent flex items-center gap-0.5 font-medium">
                                                Read <ChevronRight size={12} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Blog Share Modal */}
                <BlogShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    post={post}
                />
            </div>
        </div>
    );
};

export default BlogPost;
