import React from 'react';
import { Settings, User, Lock, Check, Loader, Save } from 'lucide-react';

const AdminSettings = ({
    profileForm,
    setProfileForm,
    handleUpdateProfile,
    updatingProfile
}) => {
    return (
        <div className="max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="text-tronix-primary" size={20} /> Admin Account Settings
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Admin Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <User size={18} />
                            </div>
                            <input
                                type="email"
                                required
                                value={profileForm.email}
                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">This email is used for admin login and communication.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Leave blank to keep current"
                                    value={profileForm.password}
                                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5 pl-1">Confirm New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <Check size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Confirm your new password"
                                    value={profileForm.confirmPassword}
                                    onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-tronix-primary focus:ring-1 focus:ring-tronix-primary focus:bg-white/5 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={updatingProfile}
                        className="bg-tronix-primary hover:bg-violet-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2 disabled:opacity-50"
                    >
                        {updatingProfile ? (
                            <>
                                <Loader className="animate-spin" size={18} /> Updating...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
