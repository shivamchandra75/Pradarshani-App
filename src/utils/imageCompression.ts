import imageCompression from 'browser-image-compression';

export const compressImageIfNeeded = async (file: File): Promise<File> => {
  const maxSizeInMB = 0.2; // 200KB limit for compression
  
  // Only apply compression if image size is above 200kb
  if (file.size / 1024 / 1024 <= maxSizeInMB) {
    return file;
  }

  const options = {
    maxSizeMB: maxSizeInMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8 // Tweak for better quality retention while reducing size up to 90%
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile as File;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original if compression fails
  }
};
