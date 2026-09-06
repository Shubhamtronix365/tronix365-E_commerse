import React from 'react';
import { 
    User, 
    Mail, 
    ShieldCheck, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Camera, 
    Upload, 
    Eye, 
    EyeOff 
} from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

const ProfileSection = ({
    user,
    isEditing,
    editForm,
    setEditForm,
    uploadingImage,
    handleEditToggle,
    handleImageUpload,
    handleUpdateProfile,
    updating,
    showPassword,
    setShowPassword,
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-tronix-card border border-white/10 rounded-xl p-8 shadow-xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-tronix-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Profile Information</h2>
                        <p className="text-gray-400 text-sm">Update and manage your account details</p>
                    </div>
                    <button
                        onClick={handleEditToggle}
                        className="bg-tronix-primary/20 text-tronix-primary hover:bg-tronix-primary hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-tronix-primary/10"
                    >
                        {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Profile Picture Upload Field */}
                    {isEditing && (
                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl transition-colors md:col-span-2">
                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                <Camera size={16} className="text-tronix-primary" />
                                Profile Picture
                            </label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-black/40 border border-white/20 flex-shrink-0 flex items-center justify-center">
                                    {editForm.profile_picture ? (
                                        <img src={getImageUrl(editForm.profile_picture)} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="avatar-upload"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                    />
                                    <label
                                        htmlFor="avatar-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${uploadingImage ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-tronix-primary/20 text-tronix-primary hover:bg-tronix-primary hover:text-white border border-tronix-primary/30'}`}
                                    >
                                        <Upload size={16} />
                                        {uploadingImage ? 'Uploading...' : 'Choose new image'}
                                    </label>
                                    <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Name Field */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                        <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                            <User size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                            Full Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tronix-primary"
                            />
                        ) : (
                            <div className="text-lg font-semibold text-white">
                                {user?.full_name || 'Not provided'}
                            </div>
                        )}
                    </div>

                    {/* Email Field */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                        <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                            <Mail size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                            Email Address
                        </label>
                        <div className="text-lg font-semibold text-white opacity-70">
                            {user?.email}
                        </div>
                        <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={12} /> Verified (Cannot Edit)
                        </div>
                    </div>

                    {/* Password Field (Only in edit mode) */}
                    {isEditing && (
                        <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group md:col-span-2">
                            <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                                <ShieldCheck size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                                Set New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Leave blank to keep current password"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 pr-10 py-2 text-white focus:outline-none focus:border-tronix-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Security & Role Field */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                        <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                            <ShieldCheck size={16} className="text-tronix-accent group-hover:scale-110 transition-transform" />
                            Account Role
                        </label>
                        <div className="mt-1">
                            <span className="inline-flex items-center gap-1.5 bg-tronix-primary/20 border border-tronix-primary/30 text-tronix-primary px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm">
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    {/* Member Since Field */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-xl hover:bg-white/10 transition-colors group">
                        <label className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-3">
                            <Calendar size={16} className="text-tronix-primary group-hover:scale-110 transition-transform" />
                            Member Since
                        </label>
                        <div className="text-lg font-semibold text-white">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Joined recently
                        </div>
                    </div>
                </div>

                {/* Action Buttons Layer */}
                {isEditing && (
                    <div className="mt-8 flex justify-end relative z-10 transition-all">
                        <button
                            onClick={handleUpdateProfile}
                            disabled={updating}
                            className="bg-tronix-primary text-white hover:bg-violet-600 px-8 py-3 rounded-xl font-bold shadow-lg shadow-tronix-primary/20 transition-all disabled:opacity-50"
                        >
                            {updating ? 'Saving Changes...' : 'Save Profile Changes'}
                        </button>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="mt-12 pt-8 border-t border-red-500/10 relative z-10">
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                        <XCircle size={18} /> Danger Zone
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-red-500/5 border border-red-500/10 p-5 rounded-xl">
                        <div>
                            <p className="text-white font-medium">Delete Account</p>
                            <p className="text-gray-400 text-sm mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                        </div>
                        <button className="flex-shrink-0 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors border border-red-500/20">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSection;
