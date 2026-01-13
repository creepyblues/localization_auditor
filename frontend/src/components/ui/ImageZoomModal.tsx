'use client';

import { useEffect, useState, useCallback } from 'react';
import { Toast } from './Toast';

interface ImageZoomModalProps {
  imageSrc: string;
  imageAlt?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ZOOM_STEP = 25;
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const DEFAULT_ZOOM = 100;

export function ImageZoomModal({ imageSrc, imageAlt = 'Screenshot', isOpen, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const showZoomToast = useCallback((newZoom: number) => {
    setToastMessage(`Zoom: ${newZoom}%`);
    setShowToast(true);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      if (newZoom !== prev) showZoomToast(newZoom);
      return newZoom;
    });
  }, [showZoomToast]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      if (newZoom !== prev) showZoomToast(newZoom);
      return newZoom;
    });
  }, [showZoomToast]);

  const handleReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    showZoomToast(DEFAULT_ZOOM);
  }, [showZoomToast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleReset();
          break;
      }
    },
    [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setZoom(DEFAULT_ZOOM);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
            title="Zoom out (-)"
          >
            −
          </button>
          <span className="px-3 py-2 text-sm font-medium min-w-[60px] text-center border-x border-gray-200">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
            title="Zoom in (+)"
          >
            +
          </button>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          title="Reset zoom (0)"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
          title="Close (Esc)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image Container */}
      <div
        className="max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          className="transition-transform duration-200 origin-center"
          style={{ transform: `scale(${zoom / 100})` }}
          draggable={false}
        />
      </div>

      {/* Toast */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
