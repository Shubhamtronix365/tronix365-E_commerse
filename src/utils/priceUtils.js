/**
 * Utility functions for currency formatting, decimal rounding, and tax calculations.
 * Ensures consistent 2-decimal precision across cart, checkout, payments, and invoices.
 */

/**
 * Accurately round a number or string representation to 2 decimal places.
 * Avoids IEEE 754 floating point arithmetic errors like 65.46000000000001.
 *
 * @param {number|string} num
 * @returns {number}
 */
export const roundToTwo = (num) => {
    const val = Number(num);
    if (isNaN(val)) return 0;
    return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Format a number to standard INR currency display with exactly 2 decimal places.
 * Examples:
 *   formatCurrency(65.44) ->  65.44
 *   formatCurrency(65.46000000000001) -> 65.46
 *   formatCurrency(100) -> 100.00
 *   formatCurrency(1250.5) -> 1,250.50
 *
 * @param {number|string} num
 * @returns {string}
 */
export const formatCurrency = (num) => {
    const val = roundToTwo(num);
    return val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Format a price with at most 2 decimal digits.
 * If forceDecimals is false and value is an integer, it omits trailing zeroes (e.g. 100).
 * If value has decimals or forceDecimals is true, it shows 2 decimal places (e.g. 55.46).
 *
 * @param {number|string} num
 * @param {boolean} forceDecimals
 * @returns {string}
 */
export const formatPrice = (num, forceDecimals = false) => {
    const val = roundToTwo(num);
    if (!forceDecimals && Number.isInteger(val)) {
        return val.toLocaleString('en-IN');
    }
    return val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Calculate CGST (9%), SGST (9%), Total GST (18%), and Grand Total
 * strictly rounded to 2 decimal places.
 *
 * @param {number} taxableBase - Base price after discounts, before GST
 * @param {number} shippingCost - Shipping fee
 * @returns {{ taxableBase: number, cgst: number, sgst: number, gst: number, grandTotal: number }}
 */
export const calculateTaxAndTotals = (taxableBase = 0, shippingCost = 0) => {
    const base = Math.max(0, roundToTwo(taxableBase));
    const shipping = Math.max(0, roundToTwo(shippingCost));
    const cgst = roundToTwo(base * 0.09);
    const sgst = roundToTwo(base * 0.09);
    const gst = roundToTwo(cgst + sgst);
    const grandTotal = roundToTwo(base + gst + shipping);

    return {
        taxableBase: base,
        cgst,
        sgst,
        gst,
        grandTotal,
    };
};
