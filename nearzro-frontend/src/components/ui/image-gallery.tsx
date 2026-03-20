'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ImageItem {
  url: string;
  alt: string;
  caption?: string;
}

export interface ImageGalleryProps {
  images: ImageItem[];
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: number;
  aspectRatio?: string;
  lightbox?: boolean;
  zoom?: boolean;
  download?: boolean;
  upload?: boolean;
  multiple?: boolean;
  maxSize?: number; // MB
  acceptedTypes?: string[];
  onUpload?: (files: File[]) => void;
  onDelete?: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  className?: string;
}

export function ImageGallery({
  images,
  layout = 'grid',
  columns = 3,
  aspectRatio = 'aspect-square',
  lightbox = true,
  zoom = true,
  download = true,
  upload = false,
  multiple = true,
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  onUpload,
  onDelete,
  onReorder,
  className = '',
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = (index: number) => {
    if (lightbox) {
      setSelectedImage(index);
      setZoomLevel(1);
    }
  };

  const handleDownload = (image: ImageItem, index: number) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.caption || `image-${index + 1}`;
    link.target = '_blank';
    link.click();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index && onReorder) {
      onReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      acceptedTypes.includes(file.type)
    );
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    if (!upload || !onUpload) return;

    const validFiles = files.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Accepted: ${acceptedTypes.join(', ')}`);
        return false;
      }
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File too large: ${file.name}. Max size: ${maxSize}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const layoutClasses = {
    grid: `grid grid-cols-${columns} gap-4`,
    masonry: 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4',
    carousel: 'flex overflow-x-auto gap-4 snap-x snap-mandatory',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Upload Area */}
      {upload && (
        <div
          className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            {multiple
              ? 'Drag and drop images here, or click to select multiple files'
              : 'Drag and drop an image here, or click to select a file'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Max size: {maxSize}MB | Formats: {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            Select Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Image Grid */}
      <div className={layoutClasses[layout]}>
        {images.map((image, index) => (
          <div
            key={image.url + index}
            className={`relative group cursor-pointer transition-transform ${
              layout === 'carousel' ? 'snap-center flex-shrink-0 w-80' : ''
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
            onClick={() => handleImageClick(index)}
            onDragStart={onReorder ? (e) => handleDragStart(e, index) : undefined}
            onDragOver={onReorder ? (e) => handleDragOver(e, index) : undefined}
            onDragEnd={handleDragEnd}
            draggable={onReorder ? true : undefined}
          >
            <div className={`relative overflow-hidden rounded-lg bg-gray-100 ${aspectRatio}`}>
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {zoom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(index);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white"
                    title="Zoom"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                )}
                {download && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(image, index);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(index);
                    }}
                    className="p-2 bg-red-500/90 rounded-full hover:bg-red-500"
                    title="Delete"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {image.caption && (
              <p className="mt-2 text-sm text-gray-600 text-center truncate">{image.caption}</p>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2">No images yet</p>
          {upload && <p className="text-sm">Upload images to get started</p>}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage !== null && lightbox && (
        <LightboxModal
          image={images[selectedImage]}
          index={selectedImage}
          total={images.length}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          onClose={() => setSelectedImage(null)}
          onPrevious={() => setSelectedImage(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1))}
          onNext={() => setSelectedImage(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0))}
          onDownload={() => handleDownload(images[selectedImage], selectedImage)}
          showZoom={zoom}
          showDownload={download}
        />
      )}
    </div>
  );
}

// ==================== Lightbox Modal ====================

interface LightboxModalProps {
  image: ImageItem;
  index: number;
  total: number;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
  showZoom: boolean;
  showDownload: boolean;
}

function LightboxModal({
  image,
  index,
  total,
  zoomLevel,
  setZoomLevel,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  showZoom,
  showDownload,
}: LightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-screen p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative flex items-center justify-center">
          <img
            src={image.url}
            alt={image.alt}
            className="max-h-[80vh] max-w-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between text-white">
            <span className="text-sm">
              {index + 1} / {total}
            </span>
            {image.caption && (
              <span className="text-sm text-white/80">{image.caption}</span>
            )}
            <div className="flex items-center gap-2">
              {showZoom && (
                <>
                  <button
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                    className="p-2 hover:bg-white/20 rounded"
                    title="Zoom out"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                    className="p-2 hover:bg-white/20 rounded"
                    title="Zoom in"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </>
              )}
              {showDownload && (
                <button
                  onClick={onDownload}
                  className="p-2 hover:bg-white/20 rounded"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        {total > 1 && (
          <>
            <button
              onClick={onPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-white/80 hover:text-white hover:bg-white/10 rounded-r"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-white/80 hover:text-white hover:bg-white/10 rounded-l"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ImageGallery;
