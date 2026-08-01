import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Tag as TagIcon, Loader2, X, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import type { Tag, MediaItem } from '../types/database';
import { fetchAllTags, fetchMediaByTagId, deleteMediaRecord } from '../services/mediaService';
import { rankTagsByQuery } from '../utils/search';
import { ResultItemCard } from '../components/ResultItemCard';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { EditMediaModal } from '../components/EditMediaModal';

export const SearchResults: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [hideSuggestions, setHideSuggestions] = useState(false);

  const [mediaResults, setMediaResults] = useState<MediaItem[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Lightbox Modal state
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);

  // Admin Edit Modal state
  const [editingMediaItem, setEditingMediaItem] = useState<MediaItem | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const data = await fetchAllTags();
      setAllTags(data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Compute matching tags
  const matchingTags = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return rankTagsByQuery(allTags, searchTerm);
  }, [allTags, searchTerm]);

  const loadMediaForTag = useCallback(async (tagId: string) => {
    setLoadingMedia(true);
    try {
      const results = await fetchMediaByTagId(tagId);
      setMediaResults(results);
    } catch (err) {
      console.error('Error fetching media for tag:', err);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  // Fetch media when a tag is selected
  useEffect(() => {
    if (!selectedTag) {
      setMediaResults([]);
      return;
    }
    loadMediaForTag(selectedTag.id);
  }, [selectedTag, loadMediaForTag]);

  const handleSelectTag = (tag: Tag) => {
    setSelectedTag(tag);
    setSearchTerm(tag.name);
    setHideSuggestions(true);
    setSearchParams({ q: tag.name });
  };

  const handleMediaSaved = async () => {
    setEditingMediaItem(null);
    await loadTags();
    if (selectedTag) {
      await loadMediaForTag(selectedTag.id);
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    const confirmed = window.confirm('Are you sure you want to delete this media item permanently?');
    if (!confirmed) return;

    try {
      await deleteMediaRecord(item.id);
      toast.success('Media item deleted permanently!');
      await loadTags();
      if (selectedTag) {
        await loadMediaForTag(selectedTag.id);
      }
    } catch (err: any) {
      console.error('Failed to delete media item:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setHideSuggestions(false);
    setSearchParams(val.trim() ? { q: val } : {});
    if (!val.trim()) {
      setSelectedTag(null);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedTag(null);
    setHideSuggestions(false);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Search Header */}
      <header className="bg-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-full px-4 py-3  transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <Search className="h-5 w-5 text-gray-400 shrink-0 mr-3" />
            <input
              type="text"
              className="w-full bg-transparent border-none text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              placeholder="Search context (e.g. 'durga ke pati', 'durga ka pati')..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 shrink-0 ml-2 transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loadingTags ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : !searchTerm.trim() ? (
          <div className="text-center py-20 text-gray-400 text-base">
            Type any search query above to find matching topic tags.
          </div>
        ) : (
          <>
            {/* Tag Suggestions */}
            {!hideSuggestions && matchingTags.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fade-in">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                  <TagIcon className="w-4 h-4 text-indigo-500" />
                  <span>Select a matching tag below:</span>
                </h2>

                <div className="flex flex-wrap gap-2.5">
                  {matchingTags.map((tag) => {
                    const isSelected = selectedTag?.id === tag.id;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleSelectTag(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2 scale-105'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-100'
                        }`}
                      >
                        <span>{tag.name}</span>
                        {isSelected && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No tags found */}
            {!hideSuggestions && matchingTags.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-base bg-white rounded-2xl border border-gray-100 p-6">
                No tags found matching "{searchTerm}". Try different keywords.
              </div>
            )}

            {/* Search Result Items */}
            {selectedTag && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {mediaResults.length} {mediaResults.length === 1 ? 'item' : 'items'} found
                  </span>
                </div>

                {loadingMedia ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : mediaResults.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
                    No images found associated with tag {selectedTag.name}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mediaResults.map((item) => (
                      <ResultItemCard
                        key={item.id}
                        item={item}
                        onClick={() => setActiveMediaItem(item)}
                        onEdit={isAdmin ? () => setEditingMediaItem(item) : undefined}
                        onDelete={isAdmin ? () => handleDeleteMedia(item) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox Image Viewer Modal */}
      {activeMediaItem && (
        <ImageViewerModal
          imageUrl={activeMediaItem.image_url}
          bookName={activeMediaItem.book?.name}
          categoryReligion={[
            activeMediaItem.book?.category?.religion?.name,
            activeMediaItem.book?.category?.name,
          ]
            .filter(Boolean)
            .join(' / ')}
          description={activeMediaItem.description}
          onClose={() => setActiveMediaItem(null)}
        />
      )}

      {/* Admin Edit Media Modal */}
      {editingMediaItem && (
        <EditMediaModal
          item={editingMediaItem}
          onClose={() => setEditingMediaItem(null)}
          onSaved={handleMediaSaved}
        />
      )}
    </div>
  );
};

export default SearchResults;
