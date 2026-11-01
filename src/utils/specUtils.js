/**
 * Utility functions for parsing and formatting product technical specifications.
 * Supports:
 * - Key: Value
 * - Key | Value
 * - Key\tValue
 * - Alternating line pairs (Line 1 = Key, Line 2 = Value, as commonly pasted from websites)
 */

export const parseSpecsText = (text) => {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const hasDelimiters = lines.some(l => l.includes(':') || l.includes('|') || l.includes('\t'));

    if (hasDelimiters) {
        return lines.map(line => {
            let delimiter = ':';
            if (line.includes('|')) delimiter = '|';
            else if (line.includes('\t')) delimiter = '\t';
            else if (line.includes(':')) delimiter = ':';

            const idx = line.indexOf(delimiter);
            if (idx > 0) {
                const k = line.slice(0, idx).trim().replace(/^[-*•\s]+/, '');
                const v = line.slice(idx + 1).trim();
                return { key: k, value: v };
            }
            return { key: line.replace(/^[-*•\s]+/, ''), value: '-' };
        }).filter(s => s.key || s.value);
    } else {
        // Alternating line format: Line 1 = Key, Line 2 = Value
        const result = [];
        for (let i = 0; i < lines.length; i += 2) {
            const k = lines[i].replace(/^[-*•\s]+/, '');
            const v = (i + 1 < lines.length) ? lines[i + 1] : '-';
            result.push({ key: k, value: v });
        }
        return result;
    }
};

export const formatSpecsToText = (specs) => {
    if (!specs) return '';
    if (Array.isArray(specs)) {
        return specs
            .filter(s => s && (s.key || s.value))
            .map(s => `${s.key || ''}: ${s.value || ''}`)
            .join('\n');
    }
    if (typeof specs === 'object') {
        return Object.entries(specs)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n');
    }
    return String(specs);
};
