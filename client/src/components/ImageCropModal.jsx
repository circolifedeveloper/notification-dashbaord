import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { NOTIFICATION_IMAGE, getCroppedImageFile } from "../utils/cropImage.js";

export default function ImageCropModal({ src, fileName, onCancel, onConfirm }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [area, setArea] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const onCropComplete = useCallback((_unused, croppedPixels) => {
        setArea(croppedPixels);
    }, []);

    const confirm = async () => {
        if (!area) return;
        setBusy(true);
        setError("");
        try {
            onConfirm(await getCroppedImageFile(src, area, fileName));
        } catch (err) {
            setError(err.message || "Could not crop this image");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/50" onClick={busy ? undefined : onCancel} />
            <div className="card relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="text-base font-semibold text-slate-900">Fit to phone notification</h3>
                    <p className="text-xs text-slate-500">
                        Drag and zoom so the photo fills this box. This is the same size as the image on the mobile preview
                        ({NOTIFICATION_IMAGE.width}×{NOTIFICATION_IMAGE.height}).
                    </p>
                </div>
                <div className="bg-slate-800 px-8 py-6 sm:px-14">
                    <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: `${NOTIFICATION_IMAGE.aspect}` }}>
                        <Cropper
                            image={src}
                            crop={crop}
                            zoom={zoom}
                            aspect={NOTIFICATION_IMAGE.aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            restrictPosition
                            showGrid
                            objectFit="contain"
                            style={{
                                containerStyle: { width: "100%", height: "100%" },
                                cropAreaStyle: { border: "2px solid #fff", color: "rgba(0,0,0,0.45)" },
                            }}
                        />
                    </div>
                </div>
                <div className="space-y-4 px-5 py-4">
                    <label className="block text-xs font-medium text-slate-600">
                        Zoom
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(event) => setZoom(Number(event.target.value))}
                            className="mt-1 w-full accent-brand-600"
                        />
                    </label>
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                            Cancel
                        </button>
                        <button type="button" className="btn-primary" onClick={confirm} disabled={busy || !area}>
                            {busy ? "Preparing..." : "Use this image"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
