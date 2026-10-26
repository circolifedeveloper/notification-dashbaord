import axios from "axios";

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || "/circolife-api/api/v1/constant/upload-files";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an image through the Circolife upload-files API.
 * Resolves to { url, key, fileName, mimeType }; `url` is a presigned S3 link, `key` the stored path.
 */
export async function uploadImage(file, onProgress) {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error("Only JPG, PNG or WEBP images are allowed");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 5 MB or smaller");

    const form = new FormData();
    form.append("file", file);

    try {
        const response = await axios.post(UPLOAD_URL, form, {
            withCredentials: false,
            timeout: 60000,
            onUploadProgress: (event) => {
                if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
            },
        });
        const data = response.data?.data;
        if (!data?.url) throw new Error("Upload API did not return an image URL");
        return { url: data.url, key: data.key, fileName: file.name, mimeType: file.type };
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message || "Image upload failed");
    }
}
