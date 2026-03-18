import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="bg-tronix-card border border-white/5 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{title}</span>
                <Icon className={`${color}`} size={20} />
            </div>
            <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
    );
};

export default StatCard;
