import { useState, useEffect } from 'react';
import client from '../api/client';

export const DEFAULT_CATEGORIES = [
    { id: 'def-1', name: 'Development Boards', icon: 'CircuitBoard', color: 'from-violet-500 to-fuchsia-500', sort_order: 1, is_active: true },
    { id: 'def-2', name: 'Sensors',            icon: 'Wifi',         color: 'from-cyan-500 to-blue-500', sort_order: 2, is_active: true },
    { id: 'def-3', name: 'Modules',            icon: 'Cpu',          color: 'from-purple-500 to-pink-500', sort_order: 3, is_active: true },
    { id: 'def-4', name: 'Motors',             icon: 'Zap',          color: 'from-amber-500 to-orange-500', sort_order: 4, is_active: true },
    { id: 'def-5', name: 'Battery',            icon: 'Battery',      color: 'from-emerald-500 to-teal-500', sort_order: 5, is_active: true },
    { id: 'def-6', name: 'Displays',           icon: 'Monitor',      color: 'from-indigo-500 to-violet-500', sort_order: 6, is_active: true },
    { id: 'def-7', name: 'Miscellaneous',      icon: 'Package',      color: 'from-slate-400 to-slate-600', sort_order: 7, is_active: true },
    { id: 'def-8', name: 'Other',              icon: 'MoreHorizontal', color: 'from-rose-500 to-pink-600', sort_order: 8, is_active: true }
];

export const useCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await client.get('/categories');
            if (res.data && res.data.length > 0) {
                setCategories(res.data);
            } else {
                setCategories(DEFAULT_CATEGORIES);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            setCategories(DEFAULT_CATEGORIES);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

    return { categories: activeCategories, loading, error, refetch: fetchCategories };
};
