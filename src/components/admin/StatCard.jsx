import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    return (
        <div className="bg-tronix-card border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm font-medium">{title}</span>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <Icon className={`${color}`} size={18} />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
            {subtitle && (
                <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default StatCard;
