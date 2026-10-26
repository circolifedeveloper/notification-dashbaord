import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from "../api/upload.js";
import ImageCropModal from "./ImageCropModal.jsx";
import NotificationImage from "./NotificationImage.jsx";
import Icon from "./Icon.jsx";

/** Single image picker. `value` is { url, key, fileName, mimeType } or null. */
export default function ImageUpload({ value, onChange, onUploadingChange }) {
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [draft, setDraft] = useState(null);
    const uploading = progress !== null;

    const pickFile = (file) => {
        if (!file) return;
        if (!IMAGE_TYPES.includes(file.type)) {
            toast.error("Only JPG, PNG or WEBP images are allowed");
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error("Image must be 5 MB or smaller");
            return;
        }
        setDraft({ src: URL.createObjectURL(file), fileName: file.name });
        if (inputRef.current) inputRef.current.value = "";
    };

    const closeDraft = () => {
        if (draft?.src) URL.revokeObjectURL(draft.src);
        setDraft(null);
    };

    const uploadCropped = async (file) => {
        closeDraft();
        setProgress(0);
        onUploadingChange?.(true);
        try {
            const image = await uploadImage(file, setProgress);
            onChange(image);
            toast.success("Image uploaded");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProgress(null);
            onUploadingChange?.(false);
        }
    };

    const onDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        if (!uploading) pickFile(event.dataTransfer.files?.[0]);
    };

    const fileInput = (
        <input
            ref={inputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0])}
        />
    );

    return (
        <>
            {value?.url ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <NotificationImage src={value.url} alt="Notification" className="w-full rounded-lg border border-slate-200 sm:w-64" />
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-medium text-slate-800">{value.fileName || "Uploaded image"}</p>
                        {value.key && <p className="truncate text-xs text-slate-500">Path: {value.key}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
                                {uploading ? `Uploading ${progress}%` : "Replace"}
                            </button>
                            <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-rose-600" onClick={() => onChange(null)} disabled={uploading}>
                                <Icon name="trash" className="h-3.5 w-3.5" />
                                Remove
                            </button>
                        </div>
                    </div>
                    {fileInput}
                </div>
            ) : (
                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => !uploading && inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !uploading && inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
                        dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
                    }`}
                >
                    {uploading ? (
                        <div className="w-full max-w-xs">
                            <p className="mb-2 text-sm font-medium text-slate-700">Uploading... {progress}%</p>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-2 rounded-full bg-brand-50 p-2.5 text-brand-600">
                                <Icon name="plus" className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-800">Click or drag an image here</p>
                            <p className="text-xs text-slate-500">JPG, PNG or WEBP, up to 5 MB. You can crop and fit it before upload.</p>
                        </>
                    )}
                    {fileInput}
                </div>
            )}
            {draft && (
                <ImageCropModal src={draft.src} fileName={draft.fileName} onCancel={closeDraft} onConfirm={uploadCropped} />
            )}
        </>
    );
}
