export function remainingParts(endsAt, now = Date.now()) {
    const ms = new Date(endsAt).getTime() - now;
    if (Number.isNaN(ms) || ms <= 0) return null;
    const totalSeconds = Math.floor(ms / 1000);
    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

export function remainingLabel(endsAt, now = Date.now()) {
    const parts = remainingParts(endsAt, now);
    if (!parts) return "Ended";
    const pad = (value) => String(value).padStart(2, "0");
    if (parts.days > 0) return `${parts.days}d ${pad(parts.hours)}h ${pad(parts.minutes)}m`;
    return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
