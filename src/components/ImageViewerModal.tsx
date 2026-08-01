import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  bookName?: string;
  categoryReligion?: string;
  description?: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  bookName,
  categoryReligion,
  description,
  onClose,
}) => {
  const [showControls, setShowControls] = useState(true);

  // Zoom & Pan States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Refs for tracking touch & mouse gestures
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  // Last tap time for double-tap detection
  const lastTapRef = useRef<number>(0);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for Touch Drag + Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // Single finger touch - check double tap or drag
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap!
        if (scale > 1) {
          handleResetZoom();
        } else {
          setScale(2.5);
        }
      } else {
        if (scale > 1) {
          isDraggingRef.current = true;
          startPosRef.current = {
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          };
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 4);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      // Panning
      setPosition({
        x: e.touches[0].clientX - startPosRef.current.x,
        y: e.touches[0].clientY - startPosRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
    isDraggingRef.current = false;
  };

  // Toggle Controls visibility on click
  const handleViewportClick = () => {
    setShowControls((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-fade-in">
      {/* 1. TOP FLOATING HEADER BAR */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent text-white transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Separate Back Button */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md rounded-full text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Center: Title & Category */}
        <div className="text-center px-4 max-w-md truncate">
          <h2 className="text-base sm:text-lg font-bold text-white truncate">
            {bookName || 'Proof Image'}
          </h2>
          {categoryReligion && (
            <p className="text-xs text-indigo-300 font-medium truncate">{categoryReligion}</p>
          )}
        </div>

        {/* Right: Actions (Open in new tab + Reset Zoom) */}
        <div className="flex items-center space-x-2">
          {scale > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md rounded-full text-xs font-semibold text-white transition-colors shadow-sm"
            title="Open original image in new tab"
          >
            <span>Open</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. CENTER IMAGE VIEWPORT */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center relative cursor-pointer overflow-hidden touch-none"
        onClick={handleViewportClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt={description || bookName || 'Full screen proof image'}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-full max-w-full object-contain pointer-events-auto"
        />

        {/* Zoom Level Indicator */}
        {scale > 1 && (
          <div className="absolute top-16 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white/90 font-mono z-10 pointer-events-none">
            {scale.toFixed(1)}x
          </div>
        )}
      </div>

      {/* 3. BOTTOM FLOATING DESCRIPTION OVERLAY */}
      {description && (
        <div
          className={`absolute bottom-0 inset-x-0 z-20 px-6 py-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-3xl mx-auto bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
            <p className="text-sm sm:text-base text-gray-100 leading-relaxed font-normal">
              {description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
