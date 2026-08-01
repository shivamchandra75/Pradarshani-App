import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Tag as TagIcon, LogOut, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { Tag, MediaItem } from '../types/database';
import { fetchAllTags, fetchMediaByTagId, deleteMediaRecord } from '../services/mediaService';
import { rankTagsByQuery } from '../utils/search';
import { ResultItemCard } from '../components/ResultItemCard';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { EditMediaModal } from '../components/EditMediaModal';

export const Home: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
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

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Compute matching tags based on token overlap algorithm
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

  // Handler when user taps a suggested tag
  const handleSelectTag = (tag: Tag) => {
    setSelectedTag(tag);
    setSearchTerm(tag.name); // Set input text to selected tag name
    setHideSuggestions(true); // Hide suggestions component once tag is chosen
  };

  // Handler after editing a media item
  const handleMediaSaved = async () => {
    setEditingMediaItem(null);
    await loadTags();
    if (selectedTag) {
      await loadMediaForTag(selectedTag.id);
    }
  };

  // Handler for deleting a media item directly from card
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

  // Reset or change search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setHideSuggestions(false); // Show suggestions while user is actively typing
    if (!val.trim()) {
      setSelectedTag(null);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedTag(null);
    setHideSuggestions(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header & Search Bar */}
      <header className="pt-8 px-4 relative">
        <div className="flex max-w-2xl px-2 mx-auto gap-4">
          <h1 className="flex-1 text-4xl font-extrabold text-gray-900 tracking-tight">Praman</h1>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-4 pt-4">

          {/* Search Input Box */}
          <div className="relative max-w-2xl mx-auto flex items-center bg-white border border-gray-300 rounded-full px-4 py-3.5 shadow-sm hover:shadow-md transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <Search className="h-5 w-5 text-gray-400 shrink-0 mr-3" />
            <input
              type="text"
              className="w-full bg-transparent border-none text-base sm:text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              placeholder="Search context (e.g. 'durga ke pati', 'durga ka pati')..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 shrink-0 ml-2 transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loadingTags ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : !searchTerm.trim() ? (
          <div className="text-center py-20 text-gray-400 text-base">
            Type any search query above to find matching topic tags.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Step 1: Matching Tag Suggestions (Shown only when actively searching and not hidden) */}
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

            {/* If actively searching but no matching tags found */}
            {!hideSuggestions && matchingTags.length === 0 && (
              <div className="text-center py-16 text-gray-500 text-base bg-white rounded-2xl border border-gray-100 p-6">
                No tags found matching "{searchTerm}". Try different keywords.
              </div>
            )}

            {/* Step 2: Result Items List (Displayed when a tag is selected) */}
            {selectedTag && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    Results for <span className="text-indigo-600">{selectedTag.name}</span>
                  </h3>
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
          </div>
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

export default Home;
