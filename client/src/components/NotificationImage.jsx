import { NOTIFICATION_IMAGE } from "../utils/cropImage.js";

/** Renders an image in the same 2:1 slot as the phone notification. */
export default function NotificationImage({ src, alt = "", className = "" }) {
    if (!src) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 ${className}`}
                style={{ aspectRatio: `${NOTIFICATION_IMAGE.aspect}` }}
            >
                No image
            </div>
        );
    }
    return (
        <div className={`overflow-hidden bg-slate-100 ${className}`} style={{ aspectRatio: `${NOTIFICATION_IMAGE.aspect}` }}>
            <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover"
                onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                }}
            />
        </div>
    );
}
