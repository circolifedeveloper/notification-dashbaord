import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import NotificationImage from "./NotificationImage.jsx";
import { remainingLabel } from "../utils/countdown.js";
import { screenLabel } from "../utils/format.js";

export default function PhonePreview({ title, body, category, content = [] }) {
    const image = content.find((item) => item.type === "image" && item.url);
    const buttons = content.filter((item) => item.type === "button");
    const countdown = content.find((item) => item.type === "countdown" && item.endsAt);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!countdown) return undefined;
        const timer = setInterval(() => setTick((value) => value + 1), 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    return (
        <div className="mx-auto w-full max-w-[300px] rounded-[2.2rem] border-8 border-slate-800 bg-slate-800 shadow-xl">
            <div className="rounded-[1.6rem] bg-gradient-to-b from-slate-100 to-slate-200 px-3 pt-6 pb-8">
                <p className="mb-4 text-center text-3xl font-light text-slate-700">9:41</p>
                <div className="overflow-hidden rounded-2xl bg-white/95 shadow">
                    <div className="flex items-center gap-2 px-3 pt-3 text-[11px] text-slate-500">
                        <span className="rounded bg-brand-600 p-0.5 text-white">
                            <Icon name="bell" className="h-3 w-3" />
                        </span>
                        <span className="font-medium">Circolife</span>
                        <span>· now</span>
                        {category && <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{category}</span>}
                    </div>
                    <div className="px-3 pt-1 pb-3">
                        <p className="text-sm font-semibold break-words text-slate-900">{title || "Notification title"}</p>
                        <p className="text-xs break-words whitespace-pre-line text-slate-600">{body || "Your message will appear here."}</p>
                    </div>
                    {image && <NotificationImage src={image.url} />}
                    {countdown && (
                        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-medium tracking-wide text-amber-800 uppercase">
                                {countdown.label || "Offer ends in"}
                            </p>
                            <p className="font-mono text-sm font-semibold text-amber-900">{remainingLabel(countdown.endsAt)}</p>
                        </div>
                    )}
                    {buttons.length > 0 && (
                        <div className="flex divide-x divide-slate-100 border-t border-slate-100">
                            {buttons.map((item, index) => (
                                <span key={index} className="flex-1 py-2 text-center">
                                    <span className="block text-xs font-medium text-brand-600">{item.label || "Open"}</span>
                                    {item.screen && <span className="block text-[10px] text-slate-400">→ {screenLabel(item.screen)}</span>}
                                    {item.url && <span className="block truncate px-1 text-[10px] text-slate-400">↗ {item.url}</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
