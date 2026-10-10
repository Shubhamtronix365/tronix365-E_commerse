/**
 * Utilities for formatting order date/time and calculating
 * 2–3 hour preparation / pickup windows for free shipping and office pickup orders.
 */

export function parseOrderDate(dateVal) {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
}

export function formatOrderDateTime(dateVal) {
    const d = parseOrderDate(dateVal);
    if (!d) return 'N/A';
    return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export function formatOrderTimeOnly(dateVal) {
    const d = parseOrderDate(dateVal);
    if (!d) return 'N/A';
    return d.toLocaleString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export function getEstimatedReadyWindow(dateVal) {
    const d = parseOrderDate(dateVal);
    if (!d) return null;

    const start = new Date(d.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(d.getTime() + 3 * 60 * 60 * 1000);

    const startStr = formatOrderTimeOnly(start);
    const endStr = formatOrderTimeOnly(end);

    return {
        startTime: startStr,
        endTime: endStr,
        windowText: `${startStr} – ${endStr}`
    };
}

export function isPickupOrFreeShipping(order) {
    if (!order) return { isPickup: false, isFreeShipping: false, isEligible: false };

    const method = String(order.shipping_method || '').toLowerCase().trim();
    const cost = Number(order.shipping_cost ?? -1);

    const isPickup = method === 'pickup' || method.includes('pickup') || method.includes('store');
    const isFreeShipping = (!isPickup) && (
        method === 'free' ||
        method.includes('free') ||
        cost === 0
    );

    return {
        isPickup,
        isFreeShipping,
        isEligible: isPickup || isFreeShipping
    };
}
