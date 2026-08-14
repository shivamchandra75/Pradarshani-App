import React from 'react';
import { Folder, BookOpen } from 'lucide-react';

interface FolderCardProps {
  name: string;
  subtitle: string;
  coverImageUrl?: string | null;
  /** If true, renders a book cover thumbnail instead of a folder icon */
  isBook?: boolean;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
}

/**
 * Reusable iOS Finder-style folder card used at every level of the folder tree.
 * Renders either a folder icon or a book cover thumbnail.
 */
export const FolderCard: React.FC<FolderCardProps> = ({
  name,
  subtitle,
  coverImageUrl,
  isBook = false,
  onClick,
  onEdit,
}) => {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-blue-50/40 hover:bg-blue-50 border border-blue-50/40 hover:border-blue-100 transition-all duration-200 text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-xs"
      >
      {isBook ? (
        /* Book Cover Thumbnail */
        <div className="w-12 h-16 sm:w-14 sm:h-18 bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-7 h-7 text-blue-400" />
          )}
        </div>
      ) : (
        /* Folder Icon */
        <div className="relative mb-2">
          <Folder className="w-12 h-12 sm:w-14 sm:h-14 text-blue-500 fill-blue-500 group-hover:scale-105 transition-transform duration-200" />
        </div>
      )}
      <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-blue-600 line-clamp-1">
        {name}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
        {subtitle}
      </span>
      </button>

      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Edit Book"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
};
