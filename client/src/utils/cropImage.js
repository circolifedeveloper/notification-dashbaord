/** Same frame as the phone notification image (2:1 banner). Every upload is fitted to this size. */
export const NOTIFICATION_IMAGE = {
    width: 1080,
    height: 540,
    aspect: 2,
};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", () => reject(new Error("Could not load the image to crop")));
        image.src = src;
    });
}

/**
 * Crops the selected area and scales it to the mobile notification image size (1080×540).
 */
export async function getCroppedImageFile(imageSrc, croppedAreaPixels, fileName = "notification.jpg") {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = NOTIFICATION_IMAGE.width;
    canvas.height = NOTIFICATION_IMAGE.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not crop this image");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not crop this image"))), "image/jpeg", 0.9);
    });

    const base = fileName.replace(/\.[^.]+$/, "") || "notification";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
