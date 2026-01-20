import { supabase } from '../lib/supabase';

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
    quality: number = 0.7
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
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

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Uploads a file to Supabase Storage with automatic path generation.
 */
export const uploadAsset = async (
    file: File | Blob,
    bucket: 'avatars' | 'documents' | 'tasks',
    fileName: string
): Promise<string> => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            upsert: true,
            contentType: file instanceof File ? file.type : 'image/jpeg'
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
};
