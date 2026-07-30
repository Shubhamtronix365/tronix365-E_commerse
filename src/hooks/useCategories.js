import { useState, useEffect } from 'react';
import client from '../api/client';

export const useCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await client.get('/categories');
            setCategories(res.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return { categories, loading, error, refetch: fetchCategories };
};
