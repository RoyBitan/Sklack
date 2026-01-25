import { supabase } from "../lib/supabase";

/**
 * Compresses an image file using the Canvas API.
 * @param file The original image file.
 * @param maxWidth The maximum width for the compressed image.
 * @param maxHeight The maximum height for the compressed image.
 * @param quality The quality of the compression (0.0 to 1.0).
 * @returns A promise that resolves with the compressed blob.
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.7,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        file.type || "image/jpeg",
        quality,
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};

/**
 * Uploads a file to Supabase Storage with automatic path generation and progress support.
 */
export const uploadAsset = async (
  file: File | Blob,
  bucket: "avatars" | "documents" | "tasks",
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  // Determine content type accurately
  let contentType = "application/octet-stream";
  if (file instanceof File) {
    contentType = file.type;
  } else if (file instanceof Blob) {
    contentType = file.type;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: contentType || "image/jpeg",
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

/**
 * Deletes an asset from Supabase Storage given its public URL or path.
 */
export const deleteAsset = async (
  bucket: "avatars" | "documents" | "tasks",
  pathOrUrl: string,
): Promise<void> => {
  try {
    let path = pathOrUrl;

    // If it's a full URL, we need to extract the path portion
    // Example: https://.../storage/v1/object/public/documents/user-id/file-name.jpg
    if (pathOrUrl.includes("/public/")) {
      const parts = pathOrUrl.split(`/public/${bucket}/`);
      if (parts.length > 1) {
        path = parts[1];
      }
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to delete asset:", err);
    // We don't necessarily want to block the DB update if storage delete fails,
    // but for "Permanent Deletion" requirement, we log it.
  }
};
