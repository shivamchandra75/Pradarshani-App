import React from 'react';
import type { MediaItem } from '../types/database';
import { BookOpen } from 'lucide-react';

interface ResultItemCardProps {
  item: MediaItem;
  onClick: () => void;
}

export const ResultItemCard: React.FC<ResultItemCardProps> = ({ item, onClick }) => {
  const bookName = item.book?.name || 'Unknown Book';
  const categoryName = item.book?.category?.name || '';
  const religionName = item.book?.category?.religion?.name || '';
  const coverUrl = item.book?.cover_image_url;

  const categoryReligionString = [religionName, categoryName].filter(Boolean).join(' / ');

  return (
    <div
      onClick={onClick}
      className="flex w-full bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden cursor-pointer transition-all duration-200 group hover:border-indigo-200"
    >
      {/* Column 1 (30% Horizontal Space) - Book Cover Image */}
      <div className="w-[30%] bg-gray-50 flex items-center justify-center border-r border-gray-100 relative min-h-[120px]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${bookName} cover`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-indigo-300 group-hover:text-indigo-500 transition-colors">
            <BookOpen className="w-10 h-10 mb-1" />
            <span className="text-[10px] text-gray-400 text-center font-medium">No Cover</span>
          </div>
        )}
      </div>

      {/* Column 2 (70% Horizontal Space) - Content Info */}
      <div className="w-[70%] p-4 flex flex-col justify-between">
        <div>
          {/* Row 1: Book Name */}
          <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {bookName}
          </h3>

          {/* Row 2: religion_name / book_category_name */}
          {categoryReligionString && (
            <p className="text-xs font-semibold text-indigo-600 mt-0.5 line-clamp-1">
              {categoryReligionString}
            </p>
          )}

          {/* Row 3: Description */}
          {item.description ? (
            <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic mt-2">No description provided.</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end">
          <span className="text-[11px] text-indigo-600 font-medium group-hover:underline">
            View Image →
          </span>
        </div>
      </div>
    </div>
  );
};
