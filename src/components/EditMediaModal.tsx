import React, { useState, useEffect, useRef } from 'react';
import type { MediaItem, Religion, BookCategory, Book, Tag } from '../types/database';
import { X, Upload, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SearchableSelect, type SelectOption } from './SearchableSelect';
import { compressImageIfNeeded } from '../utils/imageCompression';
import {
  fetchReligions,
  addReligion,
  fetchCategoriesByReligion,
  addCategory,
  fetchBooksByCategory,
  addBook,
  fetchAllTags,
  addTag,
  fetchTagIdsForMedia,
  uploadImageFile,
  updateMediaRecord,
} from '../services/mediaService';

interface EditMediaModalProps {
  item: MediaItem;
  onClose: () => void;
  onSaved: () => void;
}

export const EditMediaModal: React.FC<EditMediaModalProps> = ({ item, onClose, onSaved }) => {
  // Form states initialized with item values
  const [description, setDescription] = useState(item.description || '');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>(item.image_url);

  // Relational cascading states
  const [religions, setReligions] = useState<Religion[]>([]);
  const [selectedReligionId, setSelectedReligionId] = useState<string>(
    item.book?.category?.religion?.id || ''
  );

  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    item.book?.category?.id || ''
  );

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>(item.book?.id || '');

  // Book cover creation modal for inline new book
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookCoverFile, setNewBookCoverFile] = useState<File | null>(null);

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearchInput, setTagSearchInput] = useState('');

  // UI state & auto-scroll ref
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to error/success message when set
  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message]);

  // Load initial options & attached tag IDs
  useEffect(() => {
    loadReligions();
    loadTags();
    loadAttachedTagIds();
  }, []);

  const loadReligions = async () => {
    try {
      const data = await fetchReligions();
      setReligions(data);
    } catch (err: any) {
      console.error('Error fetching religions:', err);
    }
  };

  const loadTags = async () => {
    try {
      const data = await fetchAllTags(false);
      setAllTags(data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };

  const loadAttachedTagIds = async () => {
    try {
      const ids = await fetchTagIdsForMedia(item.id);
      setSelectedTagIds(ids);
    } catch (err: any) {
      console.error('Error loading attached tag IDs:', err);
    }
  };

  // Load categories when religion changes
  useEffect(() => {
    if (selectedReligionId) {
      fetchCategoriesByReligion(selectedReligionId)
        .then(setCategories)
        .catch(console.error);
    } else {
      setCategories([]);
    }
  }, [selectedReligionId]);

  // Load books when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchBooksByCategory(selectedCategoryId)
        .then(setBooks)
        .catch(console.error);
    } else {
      setBooks([]);
    }
  }, [selectedCategoryId]);

  const handleReplacementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReplacementFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  // Add new religion inline
  const handleAddNewReligion = async (name: string) => {
    const newRel = await addReligion(name);
    setReligions(prev => [...prev, newRel]);
    setSelectedReligionId(newRel.id);
  };

  // Add new category inline
  const handleAddNewCategory = async (name: string) => {
    if (!selectedReligionId) return;
    const newCat = await addCategory(name, selectedReligionId);
    setCategories(prev => [...prev, newCat]);
    setSelectedCategoryId(newCat.id);
  };

  // Create new book with optional book cover
  const handleCreateNewBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim() || !selectedCategoryId) return;

    setLoading(true);
    try {
      let coverUrl: string | null = null;
      if (newBookCoverFile) {
        const compressedFile = await compressImageIfNeeded(newBookCoverFile);
        coverUrl = await uploadImageFile(compressedFile, 'covers');
      }

      const createdBook = await addBook(newBookName, selectedCategoryId, coverUrl);
      setBooks(prev => [...prev, createdBook]);
      setSelectedBookId(createdBook.id);

      setNewBookName('');
      setNewBookCoverFile(null);
      setShowAddBookModal(false);
      toast.success(`Book "${createdBook.name}" created!`);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to create book: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Add new tag inline
  const handleAddNewTag = async () => {
    if (!tagSearchInput.trim()) return;
    try {
      const newTag = await addTag(tagSearchInput.trim());
      setAllTags(prev => [...prev, newTag]);
      setSelectedTagIds(prev => [...prev, newTag.id]);
      setTagSearchInput('');
      toast.success(`Tag #${newTag.name} created!`);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to create tag: ${err.message}` });
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Save changes handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      return setMessage({ type: 'error', text: 'Please select a Book.' });
    }
    if (selectedTagIds.length === 0) {
      return setMessage({ type: 'error', text: 'Please attach at least one tag.' });
    }

    setLoading(true);
    setMessage(null);

    try {
      let finalImageUrl = item.image_url;
      if (replacementFile) {
        const compressedFile = await compressImageIfNeeded(replacementFile);
        finalImageUrl = await uploadImageFile(compressedFile, 'proofs');
      }

      await updateMediaRecord(item.id, {
        imageUrl: finalImageUrl,
        description: description,
        bookId: selectedBookId,
        tagIds: selectedTagIds,
      });

      toast.success('Media item successfully updated!');
      setMessage({ type: 'success', text: 'Media item successfully updated!' });
      setTimeout(() => {
        onSaved();
      }, 500);
    } catch (err: any) {
      console.error('Update Error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update media item.' });
    } finally {
      setLoading(false);
    }
  };

  // Option lists for SearchableSelect
  const religionOptions: SelectOption[] = religions.map(r => ({ id: r.id, name: r.name }));
  const categoryOptions: SelectOption[] = categories.map(c => ({ id: c.id, name: c.name }));
  const bookOptions: SelectOption[] = books.map(b => ({
    id: b.id,
    name: b.name,
    image_url: b.cover_image_url,
  }));

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearchInput.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Media Properties</h3>
            <p className="text-xs text-gray-500">Modify proof image, tags, or book linkage</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {message && (
            <div
              ref={messageRef}
              className={`p-4 rounded-xl flex items-center space-x-3 transition-all ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-100 animate-bounce-once'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <form id="edit-media-form" onSubmit={handleSave} className="space-y-6">
            {/* 1. Image Preview & Replace */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Uploaded Proof Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <img
                  src={previewImageUrl}
                  alt="Proof preview"
                  className="w-32 h-32 object-contain rounded-lg border border-gray-300 bg-white shadow-sm"
                />
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-gray-500">
                    Replace this proof image by selecting a new file from your device:
                  </p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer shadow-sm transition-all">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>{replacementFile ? 'Change Selected File' : 'Upload Replacement Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReplacementFileChange}
                    />
                  </label>
                  {replacementFile && (
                    <p className="text-xs text-indigo-600 font-medium truncate">
                      Selected: {replacementFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter context, details, or notes about this proof image..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 3. Relational Selects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect
                label="Religion *"
                options={religionOptions}
                selectedValue={selectedReligionId}
                onChange={setSelectedReligionId}
                onAddNew={handleAddNewReligion}
                placeholder="Select Religion"
              />

              <SearchableSelect
                label="Book Category *"
                options={categoryOptions}
                selectedValue={selectedCategoryId}
                onChange={setSelectedCategoryId}
                onAddNew={handleAddNewCategory}
                placeholder={selectedReligionId ? 'Select Category' : 'Select Religion first'}
                disabled={!selectedReligionId}
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-800">Book Name *</label>
                  {selectedCategoryId && (
                    <button
                      type="button"
                      onClick={() => setShowAddBookModal(true)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Book</span>
                    </button>
                  )}
                </div>
                <SearchableSelect
                  options={bookOptions}
                  selectedValue={selectedBookId}
                  onChange={setSelectedBookId}
                  placeholder={selectedCategoryId ? 'Select Book' : 'Select Category first'}
                  disabled={!selectedCategoryId}
                />
              </div>
            </div>

            {/* 4. Tags Management */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Attached Tags (Add/Remove)
              </label>

              {/* Selected Tag Pills */}
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTagIds.map((id) => {
                  const tag = allTags.find((t) => t.id === id);
                  if (!tag) return null;
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full"
                    >
                      <span>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleTagSelection(tag.id)}
                        className="hover:text-indigo-950 ml-1"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Tag Search & Add Bar */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Filter or type new tag..."
                  value={tagSearchInput}
                  onChange={(e) => setTagSearchInput(e.target.value)}
                />
                {tagSearchInput.trim() &&
                  !allTags.some((t) => t.name.toLowerCase() === tagSearchInput.toLowerCase().trim()) && (
                    <button
                      type="button"
                      onClick={handleAddNewTag}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Tag</span>
                    </button>
                  )}
              </div>

              {/* Tag Options Grid */}
              <div className="mt-3 max-h-32 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50 flex flex-wrap gap-2">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagSelection(tag.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {tag.name} {isSelected && '✓'}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-500 italic">No tags match. Type above to add a new tag.</span>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions - Vertically Stacked */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2.5">
          <button
            type="submit"
            form="edit-media-form"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Changes</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full text-center py-2.5 px-6 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Modal for Creating New Book with Book Cover */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Book</h3>
              <button onClick={() => setShowAddBookModal(false)}>
                <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBook} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Book Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Rigved, Yajurved, Gita..."
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Book Cover Image (Thumbnail)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewBookCoverFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow"
                >
                  {loading ? 'Saving...' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
