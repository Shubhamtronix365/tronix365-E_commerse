import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    BookOpen,
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle,
    Clock,
    UploadCloud,
    Tag,
    Cpu,
    ExternalLink,
    Sparkles,
    Layout,
    Layers,
    FileText,
    Code,
    List,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    X,
} from 'lucide-react';
import client from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';
import ConfirmModal from './ConfirmModal';

const CATEGORIES = [
    'Tutorials',
    'Hardware Review',
    'Robotics & AI',
    'IoT & Embedded',
    'Power & Battery',
    '3D Printing & CNC',
    'Industry News',
];

const LAYOUTS = [
    { id: 'article', label: 'Editorial Article', desc: 'Sleek standard layout for reviews & engineering insights' },
    { id: 'hardware_guide', label: 'Hardware Guide', desc: 'Features pinouts, schematic notes & step-by-step schematics' },
    { id: 'project_showcase', label: 'Project Showcase', desc: 'Bento gallery with interactive specs & component BOM' },
];

const BlogAdminManager = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState(null);
    const [postToDelete, setPostToDelete] = useState(null);
    const [editorTab, setEditorTab] = useState('edit'); // 'edit' or 'preview'
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Form State
    const [form, setForm] = useState({
        title: '',
        slug: '',
        summary: '',
        content: '',
        category: 'Tutorials',
        layout_type: 'hardware_guide',
        cover_image: '',
        author_name: 'Tronix365 Engineering Team',
        author_role: 'Hardware Specialist',
        author_avatar: '',
        tags: [],
        reading_time_minutes: 5,
        is_published: false,
        featured: false,
        components_used: [],
        meta_title: '',
        meta_description: '',
    });

    const [newTagInput, setNewTagInput] = useState('');
    const [newComponent, setNewComponent] = useState({ name: '', sku: '', link: '' });

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (search) params.append('search', search);

            const res = await client.get(`/admin/blogs?${params.toString()}`);
            setPosts(res.data?.posts || []);
        } catch (error) {
            console.error('Error fetching admin blogs:', error);
            toast.error('Failed to load blog posts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [statusFilter, categoryFilter]);

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPosts();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleOpenCreateModal = () => {
        setEditingPostId(null);
        setForm({
            title: '',
            slug: '',
            summary: '',
            content: `<h2>Project Overview</h2>
<p>Write an engaging overview for this hardware engineering guide...</p>

<h3>Required Tools & Setup</h3>
<ul>
  <li>ESP32 Development Board</li>
  <li>Breadboard & Jumper Wires</li>
  <li>USB-C Data Cable</li>
</ul>

<h3>Step 1: Circuit Assembly</h3>
<p>Connect pin <strong>GPIO 21 (SDA)</strong> and <strong>GPIO 22 (SCL)</strong> to your sensor.</p>

<pre><code class="language-cpp">// Initialize I2C Communication
Wire.begin(21, 22);
Serial.println("Sensor Initialized Successfully");</code></pre>`,
            category: 'Tutorials',
            layout_type: 'hardware_guide',
            cover_image: '',
            author_name: 'Tronix365 Engineering Team',
            author_role: 'Hardware Specialist',
            author_avatar: '',
            tags: ['ESP32', 'Robotics', 'Tutorial'],
            reading_time_minutes: 5,
            is_published: false,
            featured: false,
            components_used: [],
            meta_title: '',
            meta_description: '',
        });
        setEditorTab('edit');
        setIsEditorOpen(true);
    };

    const handleOpenEditModal = (post) => {
        setEditingPostId(post.id);
        setForm({
            title: post.title || '',
            slug: post.slug || '',
            summary: post.summary || '',
            content: post.content || '',
            category: post.category || 'Tutorials',
            layout_type: post.layout_type || 'article',
            cover_image: post.cover_image || '',
            author_name: post.author_name || 'Tronix365 Engineering Team',
            author_role: post.author_role || 'Hardware Specialist',
            author_avatar: post.author_avatar || '',
            tags: Array.isArray(post.tags) ? post.tags : [],
            reading_time_minutes: post.reading_time_minutes || 5,
            is_published: !!post.is_published,
            featured: !!post.featured,
            components_used: Array.isArray(post.components_used) ? post.components_used : [],
            meta_title: post.meta_title || '',
            meta_description: post.meta_description || '',
        });
        setEditorTab('edit');
        setIsEditorOpen(true);
    };

    const handleSavePost = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            return toast.error('Please enter a blog title');
        }
        if (!form.content.trim()) {
            return toast.error('Please provide blog content');
        }

        try {
            if (editingPostId) {
                await client.put(`/admin/blogs/${editingPostId}`, form);
                toast.success('Blog post updated successfully');
            } else {
                await client.post('/admin/blogs', form);
                toast.success('Blog post published / created successfully');
            }
            setIsEditorOpen(false);
            fetchPosts();
        } catch (error) {
            console.error('Error saving blog post:', error);
            const msg = error.response?.data?.detail || 'Failed to save blog post';
            toast.error(msg);
        }
    };

    const handleTogglePublish = async (post) => {
        try {
            const res = await client.post(`/admin/blogs/${post.id}/toggle-publish`);
            toast.success(res.data?.message || 'Status updated');
            setPosts((prev) =>
                prev.map((p) => (p.id === post.id ? { ...p, is_published: res.data.is_published } : p))
            );
        } catch (error) {
            console.error('Error toggling publish status:', error);
            toast.error('Failed to change publish status');
        }
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;
        try {
            await client.delete(`/admin/blogs/${postToDelete.id}`);
            toast.success('Blog post deleted');
            setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
            setPostToDelete(null);
        } catch (error) {
            console.error('Error deleting blog post:', error);
            toast.error('Failed to delete blog post');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setUploadingImage(true);

        try {
            const res = await client.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const imageUrl = res.data.url;
            setForm((prev) => ({ ...prev, cover_image: imageUrl }));
            toast.success('Cover image converted to WebP and uploaded!');
        } catch (error) {
            console.error('Error uploading blog image:', error);
            toast.error('Failed to upload image. Allowed formats: PNG, JPG, WEBP, GIF');
        } finally {
            setUploadingImage(false);
        }
    };

    // Helper to add tag
    const handleAddTag = () => {
        const clean = newTagInput.trim();
        if (clean && !form.tags.includes(clean)) {
            setForm((prev) => ({ ...prev, tags: [...prev.tags, clean] }));
            setNewTagInput('');
        }
    };

    // Helper to remove tag
    const handleRemoveTag = (tagToRemove) => {
        setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
    };

    // Helper to add hardware component
    const handleAddComponent = () => {
        if (!newComponent.name.trim()) {
            return toast.error('Enter component name');
        }
        setForm((prev) => ({
            ...prev,
            components_used: [...prev.components_used, { ...newComponent }],
        }));
        setNewComponent({ name: '', sku: '', link: '' });
    };

    const handleRemoveComponent = (idx) => {
        setForm((prev) => ({
            ...prev,
            components_used: prev.components_used.filter((_, i) => i !== idx),
        }));
    };

    // Helper to insert markdown/HTML snippets into content
    const insertSnippet = (snippet) => {
        setForm((prev) => ({
            ...prev,
            content: prev.content ? `${prev.content}\n\n${snippet}` : snippet,
        }));
    };

    // Calculate quick stats
    const totalCount = posts.length;
    const publishedCount = posts.filter((p) => p.is_published).length;
    const draftCount = posts.filter((p) => !p.is_published).length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-tronix-card/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Total Posts</p>
                        <h4 className="text-2xl font-bold text-white mt-0.5">{totalCount}</h4>
                    </div>
                </div>

                <div className="bg-tronix-card/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Published</p>
                        <h4 className="text-2xl font-bold text-white mt-0.5">{publishedCount}</h4>
                    </div>
                </div>

                <div className="bg-tronix-card/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Drafts</p>
                        <h4 className="text-2xl font-bold text-white mt-0.5">{draftCount}</h4>
                    </div>
                </div>

                <div className="bg-tronix-card/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Eye size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Total Reads</p>
                        <h4 className="text-2xl font-bold text-white mt-0.5">{totalViews}</h4>
                    </div>
                </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-tronix-card/40 border border-white/10 p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by title, slug..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-tronix-accent w-64"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-tronix-accent"
                    >
                        <option value="all">All Statuses</option>
                        <option value="published">Published Only</option>
                        <option value="draft">Drafts Only</option>
                    </select>

                    {/* Category filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-tronix-accent"
                    >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={fetchPosts}
                        title="Refresh blogs"
                        className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-tronix-accent to-emerald-500 text-white font-medium px-4 py-2 rounded-lg hover:brightness-110 shadow-lg shadow-tronix-accent/20 transition-all cursor-pointer"
                >
                    <Plus size={18} />
                    <span>Create New Post</span>
                </button>
            </div>

            {/* Posts Table */}
            <div className="bg-tronix-card/40 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Article</th>
                                <th className="px-6 py-4">Category & Layout</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Reads</th>
                                <th className="px-6 py-4">Updated</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="animate-spin text-tronix-accent" size={24} />
                                            <span>Loading blog articles...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <BookOpen size={36} className="text-gray-600 mb-1" />
                                            <p className="text-base text-gray-300 font-medium">No blog posts found</p>
                                            <p className="text-xs text-gray-500">
                                                Click "Create New Post" to publish your first engineering tutorial or guide.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-lg bg-neutral-900 border border-white/10 overflow-hidden flex-shrink-0">
                                                    {post.cover_image ? (
                                                        <img
                                                            src={getImageUrl(post.cover_image)}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                            <Cpu size={22} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 max-w-sm">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-white font-medium text-sm truncate group-hover:text-tronix-accent transition-colors">
                                                            {post.title}
                                                        </h4>
                                                        {post.featured && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                                                                Featured
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                        /blog/{post.slug}
                                                    </p>
                                                    {post.tags && post.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {post.tags.slice(0, 3).map((t, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400"
                                                                >
                                                                    #{t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                                                    {post.category || 'General'}
                                                </span>
                                                <div className="text-[11px] text-gray-500 capitalize">
                                                    {post.layout_type?.replace('_', ' ') || 'article'}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleTogglePublish(post)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                                                    post.is_published
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        post.is_published ? 'bg-emerald-400' : 'bg-amber-400'
                                                    }`}
                                                ></span>
                                                {post.is_published ? 'Published' : 'Draft'}
                                            </button>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-gray-300 font-medium">
                                                {post.views_count || 0}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-xs text-gray-400">
                                            {post.updated_at
                                                ? new Date(post.updated_at).toLocaleDateString('en-IN', {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric',
                                                  })
                                                : '-'}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {post.is_published && (
                                                    <a
                                                        href={`/blog/${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View Live Public Post"
                                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEditModal(post)}
                                                    title="Edit Post"
                                                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setPostToDelete(post)}
                                                    title="Delete Post"
                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rich Editor & Live Preview Modal */}
            {isEditorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-tronix-card border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-tronix-accent/20 border border-tronix-accent/40 flex items-center justify-center text-tronix-accent">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {editingPostId ? 'Edit Blog Article' : 'Create New Engineering Blog'}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        All content is strictly sanitized and images are auto-optimized.
                                    </p>
                                </div>
                            </div>

                            {/* View switcher: Edit vs Live Preview */}
                            <div className="flex items-center gap-3">
                                <div className="flex bg-black/40 border border-white/10 rounded-lg p-1 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('edit')}
                                        className={`px-3 py-1.5 rounded-md transition-all ${
                                            editorTab === 'edit'
                                                ? 'bg-tronix-accent text-white font-semibold'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Edit Content
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('preview')}
                                        className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                            editorTab === 'preview'
                                                ? 'bg-tronix-accent text-white font-semibold'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Eye size={14} />
                                        Live Preview
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsEditorOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {editorTab === 'edit' ? (
                                <form id="blog-form" onSubmit={handleSavePost} className="space-y-6">
                                    {/* Row 1: Title & Custom Slug */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Article Title *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Complete Guide to ESP32 Autonomous Navigation"
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                URL Slug (Auto-generated if blank)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="esp32-autonomous-robot-guide"
                                                value={form.slug}
                                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Category, Layout & Reading Time */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Category
                                            </label>
                                            <select
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-tronix-accent"
                                            >
                                                {CATEGORIES.map((c) => (
                                                    <option key={c} value={c} className="bg-neutral-900 text-white">
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Layout Style
                                            </label>
                                            <select
                                                value={form.layout_type}
                                                onChange={(e) => setForm({ ...form, layout_type: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-tronix-accent"
                                            >
                                                {LAYOUTS.map((l) => (
                                                    <option key={l.id} value={l.id} className="bg-neutral-900 text-white">
                                                        {l.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Reading Time (Mins)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={form.reading_time_minutes}
                                                onChange={(e) =>
                                                    setForm({ ...form, reading_time_minutes: parseInt(e.target.value) || 5 })
                                                }
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-tronix-accent"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Summary / Excerpt */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Article Excerpt / Summary
                                        </label>
                                        <textarea
                                            rows="2"
                                            placeholder="A 1-2 sentence hook highlighting what engineers or makers will build..."
                                            value={form.summary}
                                            onChange={(e) => setForm({ ...form, summary: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent text-sm"
                                        />
                                    </div>

                                    {/* Row 4: Cover Image with Upload or URL */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Cover Image
                                        </label>
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="w-full sm:flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="https://... or click upload"
                                                    value={form.cover_image}
                                                    onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-tronix-accent font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={uploadingImage}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors flex-shrink-0 cursor-pointer"
                                                >
                                                    <UploadCloud size={16} />
                                                    {uploadingImage ? 'Converting...' : 'Upload WebP'}
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleImageUpload}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                            </div>

                                            {form.cover_image && (
                                                <div className="w-16 h-12 rounded-lg border border-white/15 overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={getImageUrl(form.cover_image)}
                                                        alt="Cover Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 5: Formatting Toolbar & Rich Content Editor */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                                Article Content (HTML / Rich Format) *
                                            </label>
                                            <span className="text-[11px] text-gray-500">
                                                Scripts and malicious handlers are stripped automatically
                                            </span>
                                        </div>

                                        {/* Formatting Quick Buttons */}
                                        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-900 border border-white/10 rounded-t-lg">
                                            <button
                                                type="button"
                                                onClick={() => insertSnippet('<h3>Subheading Title</h3>')}
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded"
                                            >
                                                H3
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertSnippet('<p>Paragraph text here...</p>')}
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded"
                                            >
                                                P
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    insertSnippet(
                                                        '<pre><code class="language-cpp">\n// Enter hardware source code\nvoid setup() {\n  \n}\n</code></pre>'
                                                    )
                                                }
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded flex items-center gap-1"
                                            >
                                                <Code size={12} /> Code Block
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    insertSnippet(
                                                        '<table class="table-auto w-full text-left">\n  <thead>\n    <tr><th>Pin Name</th><th>GPIO</th><th>Function</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>SDA</td><td>GPIO 21</td><td>I2C Data</td></tr>\n    <tr><td>SCL</td><td>GPIO 22</td><td>I2C Clock</td></tr>\n  </tbody>\n</table>'
                                                    )
                                                }
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded"
                                            >
                                                Pinout Table
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    insertSnippet(
                                                        '<blockquote>\n  <strong>Pro Tip:</strong> Ensure a shared ground between your motor driver and the microcontroller logic pins.\n</blockquote>'
                                                    )
                                                }
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-amber-300/90 rounded"
                                            >
                                                Tip Callout
                                            </button>
                                        </div>

                                        <textarea
                                            rows="12"
                                            required
                                            value={form.content}
                                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 border-t-0 rounded-b-lg p-4 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-tronix-accent resize-y"
                                        />
                                    </div>

                                    {/* Components Used Builder (Tutorial to Cart Linkage) */}
                                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Cpu size={16} className="text-tronix-accent" />
                                                <h4 className="text-sm font-semibold text-white">
                                                    Hardware Components Used (BOM)
                                                </h4>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                Add parts so readers can add them directly to cart!
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                            <input
                                                type="text"
                                                placeholder="Component Name (e.g. ESP32-WROOM)"
                                                value={newComponent.name}
                                                onChange={(e) =>
                                                    setNewComponent({ ...newComponent, name: e.target.value })
                                                }
                                                className="sm:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                            <input
                                                type="text"
                                                placeholder="SKU / Model"
                                                value={newComponent.sku}
                                                onChange={(e) =>
                                                    setNewComponent({ ...newComponent, sku: e.target.value })
                                                }
                                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddComponent}
                                                className="bg-tronix-accent/20 hover:bg-tronix-accent/30 text-tronix-accent border border-tronix-accent/30 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
                                            >
                                                + Add Component
                                            </button>
                                        </div>

                                        {form.components_used.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {form.components_used.map((comp, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300"
                                                    >
                                                        <span className="font-medium text-white">{comp.name}</span>
                                                        {comp.sku && (
                                                            <span className="text-[10px] text-gray-500 font-mono">
                                                                ({comp.sku})
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveComponent(idx)}
                                                            className="text-gray-500 hover:text-red-400"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags Chip Adder */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Topic Tags
                                        </label>
                                        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-black/40 border border-white/10 rounded-lg">
                                            {form.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-xs text-gray-200"
                                                >
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="text-gray-400 hover:text-red-400"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add tag and hit Enter..."
                                                    value={newTagInput}
                                                    onChange={(e) => setNewTagInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddTag();
                                                        }
                                                    }}
                                                    className="bg-transparent border-none text-xs text-white placeholder-gray-600 focus:outline-none px-2 py-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddTag}
                                                    className="text-xs text-tronix-accent font-semibold px-2 py-0.5 hover:underline"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Author & Publishing Controls */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Author Name
                                            </label>
                                            <input
                                                type="text"
                                                value={form.author_name}
                                                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Author Role
                                            </label>
                                            <input
                                                type="text"
                                                value={form.author_role}
                                                onChange={(e) => setForm({ ...form, author_role: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 pt-6">
                                            <input
                                                type="checkbox"
                                                id="is_published"
                                                checked={form.is_published}
                                                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                                                className="w-4 h-4 rounded text-tronix-accent focus:ring-0 bg-black/40 border-white/20 cursor-pointer"
                                            />
                                            <label htmlFor="is_published" className="text-sm font-medium text-white cursor-pointer">
                                                Publish Immediately
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-3 pt-6">
                                            <input
                                                type="checkbox"
                                                id="featured"
                                                checked={form.featured}
                                                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                                className="w-4 h-4 rounded text-amber-400 focus:ring-0 bg-black/40 border-white/20 cursor-pointer"
                                            />
                                            <label htmlFor="featured" className="text-sm font-medium text-white cursor-pointer">
                                                Hero Spotlight (Featured)
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                /* Live Preview Tab */
                                <div className="space-y-6 max-w-3xl mx-auto py-4">
                                    <div className="space-y-3 border-b border-white/10 pb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-tronix-accent/20 text-tronix-accent border border-tronix-accent/30">
                                                {form.category}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {form.reading_time_minutes} min read
                                            </span>
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                                            {form.title || 'Untitled Blog Post'}
                                        </h1>
                                        {form.summary && (
                                            <p className="text-base text-gray-300 leading-relaxed">
                                                {form.summary}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 pt-2">
                                            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-tronix-accent">
                                                {form.author_name?.[0] || 'T'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{form.author_name}</p>
                                                <p className="text-xs text-gray-400">{form.author_role}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {form.cover_image && (
                                        <div className="rounded-xl overflow-hidden border border-white/10 aspect-video max-h-80">
                                            <img
                                                src={getImageUrl(form.cover_image)}
                                                alt={form.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Render Sanitized Content */}
                                    <div
                                        className="prose prose-invert prose-emerald max-w-none text-gray-200 text-sm sm:text-base leading-relaxed space-y-4"
                                        dangerouslySetInnerHTML={{ __html: form.content }}
                                    />

                                    {/* Components Used Preview */}
                                    {form.components_used?.length > 0 && (
                                        <div className="border-t border-white/10 pt-6">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                                                Required Hardware Components
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {form.components_used.map((comp, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-white">{comp.name}</p>
                                                            {comp.sku && (
                                                                <p className="text-xs text-gray-400 font-mono">
                                                                    SKU: {comp.sku}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-tronix-accent font-semibold flex items-center gap-1">
                                                            View Part <ArrowRight size={12} />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <button
                                type="button"
                                onClick={() => setIsEditorOpen(false)}
                                className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    form="blog-form"
                                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-tronix-accent to-emerald-500 text-white font-medium text-sm hover:brightness-110 shadow-lg shadow-tronix-accent/20 transition-all cursor-pointer"
                                >
                                    {editingPostId ? 'Save Changes' : 'Save & Publish Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={!!postToDelete}
                onClose={() => setPostToDelete(null)}
                onConfirm={confirmDeletePost}
                title="Delete Blog Article?"
                message={`Are you sure you want to delete "${postToDelete?.title}"? This will permanently remove the article and its SEO URL.`}
                confirmText="Delete Article"
                type="danger"
            />
        </div>
    );
};

export default BlogAdminManager;
