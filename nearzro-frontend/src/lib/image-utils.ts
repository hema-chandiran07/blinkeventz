import imageCompression from "browser-image-compression";

export const compressImage = async (file: File): Promise<File> => {
  // Prevent corrupting non-image formats like PDFs
  if (file.type === "application/pdf") {
    return file;
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Return original if compression somehow makes it larger or fails silently
    return compressedFile.size < file.size ? compressedFile : file;
  } catch (error) {
    console.error("Image compression failed:", error);
    // Fail gracefully by returning the original file instead of halting registration
    return file;
  }
};
