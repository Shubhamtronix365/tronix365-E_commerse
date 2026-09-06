import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
    LogOut,
    ArrowLeft,
    Shield,
    Sliders,
    Compass,
    Check,
    Image as ImageIcon,
    Video,
    User,
    Play,
    Film,
    Settings,
    Key,
    Lock,
    Mail,
} from 'lucide-react';
import client from '../api/client';
import { getImageUrl, formatBlogHtml } from '../utils/imageUtils';
import ConfirmModal from '../components/admin/ConfirmModal';

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
    { id: 'hardware_guide', label: 'Hardware Guide', desc: 'Pinout tables, schematic notes & step-by-step assembly' },
    { id: 'article', label: 'Editorial Article', desc: 'Standard technical layout for reviews & engineering insights' },
    { id: 'project_showcase', label: 'Project Showcase', desc: 'Interactive project gallery with component BOM & specs' },
];

const BlogStudio = () => {
    const navigate = useNavigate();
    const [authorUser, setAuthorUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('tronix_user') || '{}');
        } catch {
            return {};
        }
    });

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
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [insertingMedia, setInsertingMedia] = useState(false);

    // Media Modal States
    const [isImageInsertModalOpen, setIsImageInsertModalOpen] = useState(false);
    const [insertImageFile, setInsertImageFile] = useState(null);
    const [insertImageCaption, setInsertImageCaption] = useState('');
    const [insertImageWidth, setInsertImageWidth] = useState('100%');

    const [isVideoInsertModalOpen, setIsVideoInsertModalOpen] = useState(false);
    const [videoMode, setVideoMode] = useState('url'); // 'url' or 'upload'
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [insertVideoFile, setInsertVideoFile] = useState(null);

    // Author Account & Credentials Settings Modal States
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        current_password: '',
        new_email: '',
        new_password: '',
        confirm_new_password: '',
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const contentImageInputRef = useRef(null);
    const contentVideoInputRef = useRef(null);
    const contentTextareaRef = useRef(null);

    // Form State
    const [form, setForm] = useState({
        title: '',
        slug: '',
        summary: '',
        content: '',
        category: 'Tutorials',
        layout_type: 'hardware_guide',
        cover_image: '',
        author_name: authorUser?.full_name || 'Tronix365 Engineering Team',
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

    // Authorization verification
    useEffect(() => {
        const token = localStorage.getItem('tronix_token');
        const user = authorUser;
        if (!token || !user || !['admin', 'blog_author'].includes(user.role)) {
            toast.error('Access restricted. Please log in with your Blog Author credentials.');
            navigate('/blogs');
        }
    }, [authorUser, navigate]);

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
            console.error('Error fetching blog studio posts:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error('Session expired or unauthorized. Please re-login.');
                navigate('/blogs');
            } else {
                toast.error('Failed to load posts');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [statusFilter, categoryFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPosts();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleLogout = () => {
        localStorage.removeItem('tronix_token');
        localStorage.removeItem('tronix_user');
        toast.success('Logged out from Blog Studio');
        navigate('/blogs');
    };

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
            author_name: authorUser?.full_name || 'Tronix365 Engineering Team',
            author_role: 'Hardware Specialist',
            author_avatar: '',
            tags: ['ESP32', 'Robotics', 'Tutorial'],
            reading_time_minutes: 5,
            is_published: true,
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
            layout_type: post.layout_type || 'hardware_guide',
            cover_image: post.cover_image || '',
            author_name: post.author_name || authorUser?.full_name || 'Tronix365 Engineering Team',
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

    const handleSavePost = async (e, overridePublished = null) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!form.title.trim()) return toast.error('Please enter an article title');
        if (!form.content.trim()) return toast.error('Please enter article content');

        const finalIsPublished = overridePublished !== null ? overridePublished : form.is_published;
        const payload = { ...form, is_published: finalIsPublished };

        try {
            if (editingPostId) {
                await client.put(`/admin/blogs/${editingPostId}`, payload);
                if (authorUser?.role === 'blog_author' && finalIsPublished) {
                    toast.success('🚀 Article submitted for Admin review! It will go live once an administrator approves it.');
                } else if (finalIsPublished) {
                    toast.success('Article updated & published live!');
                } else {
                    toast.success('Article saved as draft (hidden from public)');
                }
            } else {
                await client.post('/admin/blogs', payload);
                if (authorUser?.role === 'blog_author' && finalIsPublished) {
                    toast.success('🚀 Article submitted for Admin review! It will go live once an administrator approves it.');
                } else if (finalIsPublished) {
                    toast.success('🚀 Article published live to Blog Hub!');
                } else {
                    toast.success('Article saved as draft (hidden from public)');
                }
            }
            setIsEditorOpen(false);
            fetchPosts();
        } catch (error) {
            console.error('Error saving post in Blog Studio:', error);
            const msg = error.response?.data?.detail || 'Failed to save blog post';
            toast.error(msg);
        }
    };

    const handleTogglePublish = async (post) => {
        try {
            const res = await client.post(`/admin/blogs/${post.id}/toggle-publish`);
            toast.success(res.data?.message || 'Status updated');
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === post.id
                        ? { ...p, is_published: res.data.is_published, status: res.data.status }
                        : p
                )
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
            toast.success('Image converted to WebP and uploaded!');
        } catch (error) {
            console.error('Error uploading blog image:', error);
            toast.error('Failed to upload image. Allowed formats: PNG, JPG, WEBP, GIF');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAuthorAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Avatar image must be under 5MB');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        setUploadingAvatar(true);
        try {
            const res = await client.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setForm((prev) => ({ ...prev, author_avatar: res.data.url }));
            toast.success('Author profile photo uploaded successfully!');
        } catch (err) {
            console.error('Author avatar upload error:', err);
            toast.error('Failed to upload author photo');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const getYouTubeEmbedUrl = (url) => {
        try {
            if (url.includes('youtu.be/')) {
                const id = url.split('youtu.be/')[1]?.split('?')[0];
                return `https://www.youtube-nocookie.com/embed/${id}`;
            }
            if (url.includes('watch?v=')) {
                const id = url.split('watch?v=')[1]?.split('&')[0];
                return `https://www.youtube-nocookie.com/embed/${id}`;
            }
            if (url.includes('/embed/')) {
                return url;
            }
            return url;
        } catch {
            return url;
        }
    };

    const handleInsertImageSubmit = async (e) => {
        e.preventDefault();
        if (!insertImageFile) {
            toast.error('Please select an image file to upload');
            return;
        }
        if (insertImageFile.size > 10 * 1024 * 1024) {
            toast.error('Image size must be under 10MB');
            return;
        }

        setInsertingMedia(true);
        const formData = new FormData();
        formData.append('file', insertImageFile);
        try {
            const res = await client.post('/upload/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const imgUrl = getImageUrl(res.data.url) || res.data.url;
            const caption = insertImageCaption.trim();
            const widthClass =
                insertImageWidth === '50%'
                    ? 'max-w-md mx-auto'
                    : insertImageWidth === '75%'
                    ? 'max-w-2xl mx-auto'
                    : 'w-full';

            const figureHtml = `<figure class="my-8 ${widthClass} text-center flex flex-col items-center">
  <img src="${imgUrl}" alt="${caption || 'Hardware Guide Step'}" class="rounded-xl border border-white/10 shadow-xl max-w-full h-auto max-h-[650px] object-contain mx-auto" />
  ${caption ? `<figcaption class="text-xs text-gray-400 mt-2.5 italic">${caption}</figcaption>` : ''}
</figure>`;

            insertSnippet(figureHtml);
            toast.success('Image inserted into article!');
            setIsImageInsertModalOpen(false);
            setInsertImageFile(null);
            setInsertImageCaption('');
        } catch (err) {
            console.error('Error inserting content image:', err);
            toast.error('Failed to upload and insert image');
        } finally {
            setInsertingMedia(false);
        }
    };

    const handleInsertVideoSubmit = async (e) => {
        e.preventDefault();
        if (videoMode === 'url') {
            const url = videoUrlInput.trim();
            if (!url) {
                toast.error('Please enter a video URL');
                return;
            }
            const embedUrl = getYouTubeEmbedUrl(url);
            const videoHtml = `<div class="my-8 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
  <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;
            insertSnippet(videoHtml);
            toast.success('Video player embedded into article!');
            setIsVideoInsertModalOpen(false);
            setVideoUrlInput('');
        } else {
            if (!insertVideoFile) {
                toast.error('Please choose an MP4/WebM video file');
                return;
            }
            if (insertVideoFile.size > 30 * 1024 * 1024) {
                toast.error('Video file size exceeds 30MB limit');
                return;
            }
            setInsertingMedia(true);
            const formData = new FormData();
            formData.append('file', insertVideoFile);
            try {
                const res = await client.post('/upload/media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const videoUrl = getImageUrl(res.data.url) || res.data.url;
                const videoHtml = `<div class="my-8 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
  <video controls class="w-full max-h-[650px] rounded-xl" preload="metadata">
    <source src="${videoUrl}" type="video/mp4" />
    Your browser does not support the video tag.
  </video>
</div>`;
                insertSnippet(videoHtml);
                toast.success('Uploaded video inserted into article!');
                setIsVideoInsertModalOpen(false);
                setInsertVideoFile(null);
            } catch (err) {
                console.error('Error uploading video:', err);
                toast.error('Failed to upload video file (max 30MB)');
            } finally {
                setInsertingMedia(false);
            }
        }
    };

    const handleAddTag = () => {
        const clean = newTagInput.trim();
        if (clean && !form.tags.includes(clean)) {
            setForm((prev) => ({ ...prev, tags: [...prev.tags, clean] }));
            setNewTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
    };

    const handleAddComponent = () => {
        if (!newComponent.name.trim()) return toast.error('Enter component name');
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

    const insertSnippet = (snippet) => {
        const textarea = contentTextareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart ?? textarea.value.length;
            const end = textarea.selectionEnd ?? textarea.value.length;
            const currentVal = textarea.value || form.content || '';
            const textBefore = currentVal.substring(0, start);
            const textAfter = currentVal.substring(end);

            const prefix =
                textBefore.length === 0 || textBefore.endsWith('\n\n')
                    ? ''
                    : textBefore.endsWith('\n')
                    ? '\n'
                    : '\n\n';
            const suffix =
                textAfter.length === 0 || textAfter.startsWith('\n\n')
                    ? ''
                    : textAfter.startsWith('\n')
                    ? '\n'
                    : '\n\n';

            const newContent = `${textBefore}${prefix}${snippet}${suffix}${textAfter}`;
            setForm((prev) => ({ ...prev, content: newContent }));

            setTimeout(() => {
                textarea.focus();
                const newPos = start + prefix.length + snippet.length;
                textarea.setSelectionRange(newPos, newPos);
            }, 50);
        } else {
            setForm((prev) => ({
                ...prev,
                content: prev.content ? `${prev.content}\n\n${snippet}` : snippet,
            }));
        }
    };

    const handleOpenSettings = () => {
        setSettingsForm({
            current_password: '',
            new_email: authorUser.email || authorUser.author_id || '',
            new_password: '',
            confirm_new_password: '',
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setIsSettingsModalOpen(true);
    };

    const getPasswordRules = (pwd) => ({
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        lower: /[a-z]/.test(pwd),
        digit: /\d/.test(pwd),
        special: /[!@#$%^&*()_=+\[\]{};:'",.<>/?\\|`~-]/.test(pwd),
    });

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (!settingsForm.current_password) {
            toast.error('Current password is required to verify your identity');
            return;
        }

        const currentEmail = (authorUser.email || authorUser.author_id || '').toLowerCase().trim();
        const enteredEmail = (settingsForm.new_email || '').toLowerCase().trim();
        const emailChanged = enteredEmail && enteredEmail !== currentEmail;
        const passwordChanged = Boolean(settingsForm.new_password && settingsForm.new_password.trim());

        if (!emailChanged && !passwordChanged) {
            toast.error('Please enter a new email address or new password to update');
            return;
        }

        if (passwordChanged) {
            const rules = getPasswordRules(settingsForm.new_password);
            if (!rules.length || !rules.upper || !rules.lower || !rules.digit || !rules.special) {
                toast.error('New password must satisfy all 5 strong password requirements');
                return;
            }
            if (settingsForm.new_password !== settingsForm.confirm_new_password) {
                toast.error('New passwords do not match');
                return;
            }
        }

        setIsSavingSettings(true);
        try {
            const payload = {
                current_password: settingsForm.current_password,
                new_email: emailChanged ? enteredEmail : null,
                new_password: passwordChanged ? settingsForm.new_password : null,
            };

            const res = await client.put('/blogs/author/credentials', payload);
            const { access_token, user_name, role, email } = res.data;

            if (access_token) {
                localStorage.setItem('tronix_token', access_token);
                client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            }

            const updatedUser = {
                ...(authorUser || {}),
                email: email,
                full_name: user_name,
                role: role,
                author_id: email,
            };
            localStorage.setItem('tronix_user', JSON.stringify(updatedUser));
            setAuthorUser(updatedUser);

            toast.success('Author credentials updated successfully!');
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error('Error updating author credentials:', error);
            toast.error(error.response?.data?.detail || 'Failed to update credentials');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const totalCount = posts.length;
    const publishedCount = posts.filter((p) => p.is_published && p.status === 'published').length;
    const pendingCount = posts.filter((p) => p.status === 'pending_approval').length;
    const draftCount = posts.filter((p) => p.status !== 'published' && p.status !== 'pending_approval').length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);

    return (
        <div className="min-h-screen bg-tronix-dark text-white pt-20 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Top Studio Header */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-tronix-accent to-emerald-400 p-0.5 shadow-lg shadow-tronix-accent/20">
                            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-tronix-accent">
                                <BookOpen size={28} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                                    Tronix365 Blog Studio
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tronix-accent/20 text-tronix-accent border border-tronix-accent/40">
                                    Author Portal
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Logged in as <span className="text-white font-medium">{authorUser.email || authorUser.author_id}</span> ({authorUser.role})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                        <button
                            onClick={handleOpenSettings}
                            className="px-4 py-2 rounded-xl bg-tronix-accent/10 hover:bg-tronix-accent/20 border border-tronix-accent/30 text-xs font-semibold text-tronix-accent hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                            <Settings size={16} />
                            Account Settings
                        </button>

                        <Link
                            to="/blogs"
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Compass size={16} />
                            View Public Hub
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <BookOpen size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Total Articles</p>
                            <h4 className="text-2xl font-bold text-white mt-0.5">{totalCount}</h4>
                        </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <CheckCircle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Live / Published</p>
                            <h4 className="text-2xl font-bold text-white mt-0.5">{publishedCount}</h4>
                        </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Clock size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Pending Review</p>
                            <h4 className="text-2xl font-bold text-white mt-0.5">{pendingCount}</h4>
                        </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-gray-400">
                            <Edit3 size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Drafts</p>
                            <h4 className="text-2xl font-bold text-white mt-0.5">{draftCount}</h4>
                        </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Eye size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Cumulative Reads</p>
                            <h4 className="text-2xl font-bold text-white mt-0.5">{totalViews}</h4>
                        </div>
                    </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-neutral-900/60 border border-white/10 p-4 rounded-xl">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Filter by title, slug..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-tronix-accent w-64"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-tronix-accent"
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published Live</option>
                            <option value="pending_approval">Pending Admin Approval ({pendingCount})</option>
                            <option value="draft">Drafts Only</option>
                            <option value="rejected">Needs Revision</option>
                        </select>

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
                            title="Refresh articles"
                            className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-tronix-accent to-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl hover:brightness-110 shadow-lg shadow-tronix-accent/25 transition-all cursor-pointer"
                    >
                        <Plus size={18} />
                        <span>Create New Article</span>
                    </button>
                </div>

                {/* Posts Table */}
                <div className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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
                                                <span>Loading articles...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : posts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <BookOpen size={40} className="text-gray-600 mb-1" />
                                                <p className="text-base text-gray-300 font-medium">No articles found</p>
                                                <p className="text-xs text-gray-500">
                                                    Click "Create New Article" to write your first technical guide.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    posts.map((post) => (
                                        <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-lg bg-neutral-950 border border-white/10 overflow-hidden flex-shrink-0">
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
                                                {post.status === 'published' || (post.is_published && post.status !== 'rejected' && post.status !== 'pending_approval') ? (
                                                    <button
                                                        onClick={() => handleTogglePublish(post)}
                                                        title="Click to unpublish article to draft"
                                                        className="px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        Published Live
                                                    </button>
                                                ) : post.status === 'pending_approval' ? (
                                                    <div className="space-y-1">
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                                            title="Submitted for admin approval. Will be published upon admin review."
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                            Pending Approval
                                                        </span>
                                                        <p className="text-[10px] text-amber-300/70">Awaiting Admin Review</p>
                                                    </div>
                                                ) : post.status === 'rejected' ? (
                                                    <div className="space-y-1">
                                                        <button
                                                            onClick={() => handleTogglePublish(post)}
                                                            title="Click to re-submit for admin approval"
                                                            className="px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                            Needs Revision
                                                        </button>
                                                        {post.rejection_reason && (
                                                            <p className="text-[10px] text-red-300/80 italic max-w-xs truncate" title={post.rejection_reason}>
                                                                Feedback: {post.rejection_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleTogglePublish(post)}
                                                        title={authorUser?.role === 'blog_author' ? 'Click to submit for admin approval' : 'Click to publish'}
                                                        className="px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                                        Draft
                                                    </button>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-center font-mono text-gray-300 font-medium">
                                                {post.views_count || 0}
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
                                                            title="View Live Article"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
                        <div className="bg-neutral-900 border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-tronix-accent/20 border border-tronix-accent/40 flex items-center justify-center text-tronix-accent">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {editingPostId ? 'Edit Article' : 'Compose Technical Article'}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            Auto-sanitized HTML and live WebP image processing
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex bg-black/50 border border-white/10 rounded-lg p-1 text-xs font-medium">
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
                                    <form id="studio-form" onSubmit={handleSavePost} className="space-y-6">
                                        {/* Title & Slug */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                    Article Title *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Interfacing OLED Displays with STM32"
                                                    value={form.title}
                                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                    URL Slug (Auto-generated if empty)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="interfacing-oled-displays-stm32"
                                                    value={form.slug}
                                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent font-mono text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Category, Layout Style & Reading Time */}
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
                                                    Layout Architecture
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
                                                    Reading Time (Minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    value={form.reading_time_minutes}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            reading_time_minutes: parseInt(e.target.value) || 5,
                                                        })
                                                    }
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-tronix-accent"
                                                />
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Article Summary / Hook
                                            </label>
                                            <textarea
                                                rows="2"
                                                placeholder="A compelling 1-2 sentence overview of this tutorial..."
                                                value={form.summary}
                                                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-tronix-accent text-sm"
                                            />
                                        </div>

                                        {/* Cover Image */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Cover Image
                                            </label>
                                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                                <div className="w-full sm:flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Image URL or click upload"
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

                                        {/* Content & Markdown Quick Toolbar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                                    Article Content (Rich HTML / Markdown) *
                                                </label>
                                                <span className="text-[11px] text-gray-500">
                                                    Script tags and insecure event handlers are filtered automatically
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-neutral-950 border border-white/10 rounded-t-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => insertSnippet('<h2>Section Heading</h2>\n<p>Enter detailed hardware explanation or steps...</p>')}
                                                    className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-xs text-white font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    H2 Heading
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertSnippet('<h3>Subheading Title</h3>\n<p>Enter technical subsection details...</p>')}
                                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded cursor-pointer transition-colors"
                                                >
                                                    H3 Sub
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertSnippet('<p>Write paragraph details here...</p>')}
                                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded cursor-pointer transition-colors"
                                                >
                                                    Paragraph
                                                </button>

                                                <div className="h-4 w-px bg-white/15 mx-1" />

                                                {/* In-Between Image Upload Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsImageInsertModalOpen(true)}
                                                    className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                                                >
                                                    <ImageIcon size={13} />
                                                    Insert Image
                                                </button>

                                                {/* In-Between Video Embed Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsVideoInsertModalOpen(true)}
                                                    className="px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                                                >
                                                    <Video size={13} />
                                                    Insert Video
                                                </button>

                                                <div className="h-4 w-px bg-white/15 mx-1" />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        insertSnippet(
                                                            '<pre><code class="language-cpp">\n// Hardware source code snippet\nvoid setup() {\n  \n}\n</code></pre>'
                                                        )
                                                    }
                                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Code size={12} /> Code
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        insertSnippet(
                                                            '<table class="table-auto w-full text-left">\n  <thead>\n    <tr><th>Pin Name</th><th>GPIO</th><th>Function</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>SDA</td><td>GPIO 21</td><td>I2C Data</td></tr>\n    <tr><td>SCL</td><td>GPIO 22</td><td>I2C Clock</td></tr>\n  </tbody>\n</table>'
                                                        )
                                                    }
                                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded cursor-pointer transition-colors"
                                                >
                                                    Pinout Table
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        insertSnippet(
                                                            '<blockquote>\n  <strong>Pro Tip:</strong> Decouple sensitive analog lines with a 100nF ceramic capacitor placed adjacent to the IC VDD pin.\n</blockquote>'
                                                        )
                                                    }
                                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-xs text-amber-300 rounded cursor-pointer transition-colors"
                                                >
                                                    Pro Tip
                                                </button>
                                            </div>

                                            <textarea
                                                ref={contentTextareaRef}
                                                rows="14"
                                                required
                                                placeholder="Write your article here, or use the quick buttons above to insert headings, images, videos, tables, and code snippets wherever your cursor is placed..."
                                                value={form.content}
                                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                                className="w-full bg-black/50 border border-white/10 border-t-0 rounded-b-lg p-4 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-tronix-accent resize-y"
                                            />
                                        </div>

                                        {/* Hardware Components (BOM) */}
                                        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Cpu size={16} className="text-tronix-accent" />
                                                    <h4 className="text-sm font-semibold text-white">
                                                        Hardware Bill of Materials (BOM)
                                                    </h4>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    Linked items appear in the reader with direct shop buttons
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Part Name (e.g. STM32 BluePill)"
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
                                                    + Add Part
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

                                        {/* Tags */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Article Tags
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

                                        {/* Author Meta & Profile Photo */}
                                        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-tronix-accent" />
                                                    <h4 className="text-sm font-semibold text-white">Author Profile & Credentials</h4>
                                                </div>
                                                <span className="text-[11px] text-gray-400">Displayed at the top of the published guide</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                                                {/* Author Avatar Upload */}
                                                <div className="sm:col-span-4 flex items-center gap-3">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 border border-white/20 shrink-0 shadow-md flex items-center justify-center text-tronix-accent font-bold">
                                                        {form.author_avatar ? (
                                                            <img
                                                                src={getImageUrl(form.author_avatar)}
                                                                alt={form.author_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            form.author_name?.[0]?.toUpperCase() || 'A'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            disabled={uploadingAvatar}
                                                            onClick={() => avatarInputRef.current?.click()}
                                                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                                                        >
                                                            <UploadCloud size={14} />
                                                            {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                                                        </button>
                                                        <input
                                                            type="file"
                                                            ref={avatarInputRef}
                                                            onChange={handleAuthorAvatarUpload}
                                                            accept="image/*"
                                                            className="hidden"
                                                        />
                                                        <span className="text-[10px] text-gray-500 block mt-1">Photo / Avatar</span>
                                                    </div>
                                                </div>

                                                {/* Author Name */}
                                                <div className="sm:col-span-4">
                                                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                                        Author Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Vedhathiri"
                                                        value={form.author_name}
                                                        onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-tronix-accent"
                                                    />
                                                </div>

                                                {/* Author Role */}
                                                <div className="sm:col-span-4">
                                                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                                        Author Designation
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Author / Hardware Specialist"
                                                        value={form.author_role}
                                                        onChange={(e) => setForm({ ...form, author_role: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-tronix-accent"
                                                    />
                                                </div>
                                            </div>

                                            {/* Publishing Flags */}
                                            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        id="studio_is_published"
                                                        checked={form.is_published}
                                                        onChange={(e) =>
                                                            setForm({ ...form, is_published: e.target.checked })
                                                        }
                                                        className="w-4 h-4 rounded text-tronix-accent focus:ring-0 bg-black/40 border-white/20 cursor-pointer"
                                                    />
                                                    <label
                                                        htmlFor="studio_is_published"
                                                        className="text-xs font-medium text-white cursor-pointer"
                                                    >
                                                        Publish Article Immediately
                                                    </label>
                                                </div>

                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        id="studio_featured"
                                                        checked={form.featured}
                                                        onChange={(e) =>
                                                            setForm({ ...form, featured: e.target.checked })
                                                        }
                                                        className="w-4 h-4 rounded text-amber-400 focus:ring-0 bg-black/40 border-white/20 cursor-pointer"
                                                    />
                                                    <label
                                                        htmlFor="studio_featured"
                                                        className="text-xs font-medium text-white cursor-pointer"
                                                    >
                                                        Pin to Spotlight Hero Card
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                ) : (
                                    /* Live Preview */
                                    <div className="space-y-6 max-w-3xl mx-auto py-4">
                                        <div className="space-y-4 border-b border-white/10 pb-6">
                                            <div className="flex items-start gap-3">
                                                <span className="w-8 h-1.5 bg-red-500 rounded-full mt-3 shrink-0 shadow-sm shadow-red-500/50" />
                                                <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight leading-snug">
                                                    {form.title || 'Untitled Hardware Guide'}
                                                </h1>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-400 border-b border-white/5 pb-2">
                                                <span className="font-semibold text-gray-200">
                                                    Published <span className="text-gray-400 font-normal">Today (Preview)</span>
                                                </span>
                                                <span>•</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tronix-accent/15 text-tronix-accent border border-tronix-accent/30">
                                                    {form.category}
                                                </span>
                                                <span>•</span>
                                                <span>{form.reading_time_minutes || 5} min read</span>
                                            </div>

                                            {/* Author Meta Preview */}
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 border border-white/15 shrink-0 shadow-md flex items-center justify-center text-tronix-accent font-bold">
                                                    {form.author_avatar ? (
                                                        <img
                                                            src={getImageUrl(form.author_avatar)}
                                                            alt={form.author_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        form.author_name?.[0]?.toUpperCase() || 'A'
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white leading-tight">{form.author_name || 'Author Name'}</h4>
                                                    <p className="text-xs text-gray-400 font-medium mt-0.5">{form.author_role || 'Author'}</p>
                                                </div>
                                            </div>

                                            {form.summary && (
                                                <p className="text-sm text-gray-300 leading-relaxed font-normal pt-1">
                                                    {form.summary}
                                                </p>
                                            )}
                                        </div>

                                        {form.cover_image && (
                                            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video max-h-80 shadow-2xl">
                                                <img
                                                    src={getImageUrl(form.cover_image)}
                                                    alt={form.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        <div
                                            className="prose prose-invert prose-emerald max-w-none text-gray-200 text-sm sm:text-base leading-relaxed space-y-4 [&_figure]:my-6 [&_figure]:rounded-xl [&_figure]:overflow-hidden [&_figure]:border [&_figure]:border-white/10 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-lg [&_img]:object-contain [&_img]:mx-auto [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-gray-400 [&_figcaption]:mt-2 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-xl [&_iframe]:border [&_iframe]:border-white/10 [&_video]:w-full [&_video]:rounded-xl [&_video]:border [&_video]:border-white/10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:pt-4 [&_h2]:border-b [&_h2]:border-white/10 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-tronix-accent [&_p]:text-gray-300 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-white/5 [&_th]:p-2.5 [&_td]:p-2.5"
                                            dangerouslySetInnerHTML={{ __html: formatBlogHtml(form.content) }}
                                        />

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
                            <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between bg-white/[0.02] gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditorOpen(false)}
                                    className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                                    {authorUser?.role === 'blog_author' && (
                                        <span className="text-[11px] text-amber-300/80 hidden md:inline">
                                            Submissions route to Admin Dashboard for approval
                                        </span>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => handleSavePost(e, false)}
                                            className="px-4 py-2 border border-white/15 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-2"
                                        >
                                            <EyeOff size={15} />
                                            <span>Save as Draft</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => handleSavePost(e, true)}
                                            className="px-5 py-2 rounded-lg bg-gradient-to-r from-tronix-accent to-emerald-500 text-white font-semibold text-sm hover:brightness-110 shadow-lg shadow-tronix-accent/25 transition-all cursor-pointer flex items-center gap-2"
                                        >
                                            <Eye size={15} />
                                            <span>
                                                {authorUser?.role === 'blog_author'
                                                    ? editingPostId
                                                        ? 'Submit Updates for Admin Review'
                                                        : '🚀 Submit for Admin Approval'
                                                    : editingPostId
                                                    ? 'Update & Publish Live'
                                                    : '🚀 Publish Live to Blog Hub'}
                                            </span>
                                        </button>
                                    </div>
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
                    message={`Are you sure you want to delete "${postToDelete?.title}"? This will permanently remove the article and its slug.`}
                    confirmText="Delete Article"
                    type="danger"
                />

                {/* Controlled In-Content Image Insertion Modal */}
                <AnimatePresence>
                    {isImageInsertModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl relative"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <ImageIcon size={18} />
                                        </div>
                                        <h3 className="text-base font-bold text-white">Insert Image into Article</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsImageInsertModalOpen(false)}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleInsertImageSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Select Image File * (Max 10MB)
                                        </label>
                                        <input
                                            type="file"
                                            ref={contentImageInputRef}
                                            accept="image/*"
                                            onChange={(e) => setInsertImageFile(e.target.files?.[0] || null)}
                                            className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25 cursor-pointer bg-black/40 border border-white/10 rounded-xl p-2"
                                        />
                                        <span className="text-[11px] text-gray-500 mt-1 block">
                                            Auto-optimized & converted to WebP format.
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Caption / Figure Note (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CD4017 Decade Counter Pin Diagram on Breadboard"
                                            value={insertImageCaption}
                                            onChange={(e) => setInsertImageCaption(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-tronix-accent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                            Layout & Size
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['100%', '75%', '50%'].map((w) => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => setInsertImageWidth(w)}
                                                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                        insertImageWidth === w
                                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                                            : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    {w === '100%' ? 'Full Width' : w === '75%' ? 'Medium (75%)' : 'Compact (50%)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setIsImageInsertModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={insertingMedia || !insertImageFile}
                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-xs hover:brightness-110 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            {insertingMedia ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                'Upload & Insert Image'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Controlled In-Content Video Embed Modal */}
                <AnimatePresence>
                    {isVideoInsertModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl relative"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Video size={18} />
                                        </div>
                                        <h3 className="text-base font-bold text-white">Insert Video Player</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsVideoInsertModalOpen(false)}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Mode Switcher */}
                                <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('url')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            videoMode === 'url'
                                                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        YouTube / Web Link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('upload')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            videoMode === 'upload'
                                                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Upload MP4 / WebM
                                    </button>
                                </div>

                                <form onSubmit={handleInsertVideoSubmit} className="space-y-4">
                                    {videoMode === 'url' ? (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Video URL *
                                            </label>
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={videoUrlInput}
                                                onChange={(e) => setVideoUrlInput(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-tronix-accent font-mono"
                                            />
                                            <span className="text-[11px] text-gray-500 mt-1.5 block">
                                                Supports YouTube, YouTube Shorts, Vimeo, and direct video links.
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                                Select Video File * (Max 30MB)
                                            </label>
                                            <input
                                                type="file"
                                                ref={contentVideoInputRef}
                                                accept="video/mp4,video/webm"
                                                onChange={(e) => setInsertVideoFile(e.target.files?.[0] || null)}
                                                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/15 file:text-blue-300 hover:file:bg-blue-500/25 cursor-pointer bg-black/40 border border-white/10 rounded-xl p-2"
                                            />
                                            <span className="text-[11px] text-gray-500 mt-1.5 block">
                                                Permitted formats: MP4, WebM (H.264 / VP9 codec recommended).
                                            </span>
                                        </div>
                                    )}

                                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setIsVideoInsertModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={insertingMedia || (videoMode === 'url' ? !videoUrlInput.trim() : !insertVideoFile)}
                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-xs hover:brightness-110 shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            {insertingMedia ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Embed Video Player'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Author Account & Credentials Settings Modal */}
                <AnimatePresence>
                    {isSettingsModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                className="bg-neutral-900 border border-white/10 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                            >
                                {/* Modal Header */}
                                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-neutral-950/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-tronix-accent/15 border border-tronix-accent/30 flex items-center justify-center text-tronix-accent shrink-0">
                                            <Settings size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-base text-white">
                                                Author Account Settings
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                Change your login email ID and password
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsSettingsModalOpen(false)}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Current Identity Banner */}
                                <div className="px-5 pt-4">
                                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                                                Current Active Login ID
                                            </span>
                                            <span className="text-xs font-semibold text-white mt-0.5 block truncate">
                                                {authorUser.email || authorUser.author_id}
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tronix-accent/20 text-tronix-accent border border-tronix-accent/30 shrink-0">
                                            {authorUser.role || 'blog_author'}
                                        </span>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
                                    {/* Current Password Field (Mandatory) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Lock size={12} className="text-tronix-accent" />
                                            Current Password *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                required
                                                value={settingsForm.current_password}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, current_password: e.target.value })}
                                                placeholder="Enter current password to authorize"
                                                className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-tronix-accent pr-9"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            Required to verify ownership before modifying credentials.
                                        </span>
                                    </div>

                                    <div className="border-t border-white/5 pt-3 space-y-3">
                                        {/* New Email Address */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Mail size={12} className="text-blue-400" />
                                                New Email ID / Login Access ID
                                            </label>
                                            <input
                                                type="email"
                                                value={settingsForm.new_email}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, new_email: e.target.value })}
                                                placeholder="new_author@tronix365.in"
                                                className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-tronix-accent"
                                            />
                                            <span className="text-[10px] text-gray-500">
                                                Leave unchanged if you only wish to reset your password.
                                            </span>
                                        </div>

                                        {/* New Password */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Key size={12} className="text-emerald-400" />
                                                New Strong Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={settingsForm.new_password}
                                                    onChange={(e) => setSettingsForm({ ...settingsForm, new_password: e.target.value })}
                                                    placeholder="Create strong password (min. 8 chars)"
                                                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-tronix-accent pr-9"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                                >
                                                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>

                                            {/* Interactive Password Strength & 5-point Checklist */}
                                            {settingsForm.new_password && (() => {
                                                const rules = getPasswordRules(settingsForm.new_password);
                                                const score = Object.values(rules).filter(Boolean).length;
                                                const barColor = score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-amber-500' : 'bg-emerald-500';
                                                const strengthText = score <= 2 ? 'Weak' : score <= 4 ? 'Moderate' : 'Strong & Secure';
                                                return (
                                                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 mt-1">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span className="text-gray-400">Security Strength:</span>
                                                            <span className={`font-semibold ${score === 5 ? 'text-emerald-400' : score >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                {strengthText} ({score}/5)
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                                                            {[1, 2, 3, 4, 5].map((lvl) => (
                                                                <div
                                                                    key={lvl}
                                                                    className={`h-full rounded-full transition-all duration-300 ${lvl <= score ? barColor : 'bg-transparent'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[10px]">
                                                            <span className={`flex items-center gap-1 ${rules.length ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {rules.length ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />} 8+ Characters
                                                            </span>
                                                            <span className={`flex items-center gap-1 ${rules.upper ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {rules.upper ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />} Uppercase (A-Z)
                                                            </span>
                                                            <span className={`flex items-center gap-1 ${rules.lower ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {rules.lower ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />} Lowercase (a-z)
                                                            </span>
                                                            <span className={`flex items-center gap-1 ${rules.digit ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {rules.digit ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />} Number (0-9)
                                                            </span>
                                                            <span className={`flex items-center gap-1 sm:col-span-2 ${rules.special ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {rules.special ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />} Special symbol (!@#$%...)
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <span className="text-[10px] text-gray-500">
                                                Leave blank if you only wish to change your email ID.
                                            </span>
                                        </div>

                                        {/* Confirm New Password */}
                                        {settingsForm.new_password && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Check size={12} className="text-emerald-400" />
                                                    Confirm New Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        value={settingsForm.confirm_new_password}
                                                        onChange={(e) => setSettingsForm({ ...settingsForm, confirm_new_password: e.target.value })}
                                                        placeholder="Confirm new password"
                                                        className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-tronix-accent pr-9"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setIsSettingsModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingSettings}
                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-tronix-accent to-emerald-500 hover:from-tronix-accent hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-tronix-accent/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSavingSettings ? (
                                                <>
                                                    <RefreshCw className="animate-spin" size={14} />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={14} />
                                                    Save Credentials
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BlogStudio;
