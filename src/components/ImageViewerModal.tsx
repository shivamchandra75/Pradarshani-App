import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{bookName || 'Image Viewer'}</h3>
            {categoryReligion && (
              <p className="text-xs text-indigo-600 font-medium">{categoryReligion}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Image View */}
        <div className="flex-1 bg-gray-950 flex items-center justify-center p-4 overflow-auto min-h-[300px]">
          <img
            src={imageUrl}
            alt={description || bookName || 'Proof image'}
            className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Modal Description Footer */}
        {description && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
