'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { X, ZoomIn, ZoomOut, Download, RotateCw, FileText, Image as ImageIcon } from 'lucide-react';

interface DocumentViewerProps {
  documentUrl: string;
  docType: string;
  onClose: () => void;
}

export function DocumentViewer({ documentUrl, docType, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPDF = documentUrl.toLowerCase().endsWith('.pdf') || 
                docType.toLowerCase().includes('pdf');
  
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentUrl);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kyc-document-${Date.now()}${isPDF ? '.pdf' : '.jpg'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            {isPDF ? (
              <FileText className="h-6 w-6 text-red-600" />
            ) : isImage ? (
              <ImageIcon className="h-6 w-6 text-blue-600" />
            ) : (
              <FileText className="h-6 w-6 text-neutral-600" />
            )}
            <div>
              <h2 className="text-lg font-bold text-neutral-900">KYC Document Viewer</h2>
              <p className="text-sm text-neutral-600">Type: {docType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto bg-neutral-100 p-8 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
              <p className="text-neutral-600">Loading document...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-red-600 font-medium">Failed to load document</p>
              <p className="text-sm text-neutral-600 mt-2">The document may be unavailable or corrupted</p>
            </div>
          )}

          {!loading && !error && isPDF && (
            <iframe
              src={documentUrl}
              className="w-full h-full border rounded-lg shadow-lg"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center center' }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
            />
          )}

          {!loading && !error && isImage && (
            <img
              src={documentUrl}
              alt="KYC Document"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center center' }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
            />
          )}

          {!loading && !error && !isPDF && !isImage && (
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600">Preview not available for this file type</p>
              <Button onClick={handleDownload} className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>Use mouse wheel or buttons to zoom</span>
            <span>Drag to pan when zoomed in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
