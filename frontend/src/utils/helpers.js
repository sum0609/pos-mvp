
import { api, toCents, fromCents } from '../api';
export const currency = (cents) => `£${fromCents(cents)}`;


export const isCategoryAvailable = (from, to) => {
    // 1. Safety Check: If time is missing, assume it's available 24/7
    if (!from || !to) return true; 

    try {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [fromH, fromM] = from.split(':').map(Number);
        const [toH, toM] = to.split(':').map(Number);

        const fromTime = fromH * 60 + fromM;
        const hideTime = toH * 60 + toM;

        return currentTime >= fromTime && currentTime <= hideTime;
    } catch (err) {
        console.error("Time format error:", err);
        return true; // Fallback to showing the menu if calculation fails
    }
};


export const toSentenceCase = (str) => {
    if (!str) return "";
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};