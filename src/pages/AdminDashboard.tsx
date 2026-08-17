import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {  Upload, Plus, X, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect';
import type { Religion, BookCategory, Book, Tag } from '../types/database';
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
  uploadImageFile,
  createMediaRecord,
} from '../services/mediaService';

export const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // Cascading relational states
  const [religions, setReligions] = useState<Religion[]>([]);
  const [selectedReligionId, setSelectedReligionId] = useState('');

  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');

  // Book cover creation modal for new book
  const [newBookName, setNewBookName] = useState('');
  const [newBookCoverFile, setNewBookCoverFile] = useState<File | null>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearchInput, setTagSearchInput] = useState('');

  // UI status & auto-scroll ref
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to error/success message whenever it changes
  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message]);

  // Auto-scroll to error/success message whenever it changes
  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message]);

  // Load initial religions and tags
  useEffect(() => {
    loadReligions();
    loadTags();
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

  // Load categories when religion changes
  useEffect(() => {
    setSelectedCategoryId('');
    setSelectedBookId('');
    setCategories([]);
    setBooks([]);

    if (selectedReligionId) {
      fetchCategoriesByReligion(selectedReligionId)
        .then(setCategories)
        .catch(console.error);
    }
  }, [selectedReligionId]);

  // Load books when category changes
  useEffect(() => {
    setSelectedBookId('');
    setBooks([]);

    if (selectedCategoryId) {
      fetchBooksByCategory(selectedCategoryId)
        .then(setBooks)
        .catch(console.error);
    }
  }, [selectedCategoryId]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-red-600 font-semibold">Access Denied. Admin privileges required.</p>
      </div>
    );
  }

  // Handle Proof Image File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
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
      toast.success(`Book "${createdBook.name}" created successfully!`);
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
      toast.success(`Tag "${newTag.name}" created!`);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to create tag: ${err.message}` });
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Main Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      return setMessage({ type: 'error', text: 'Please select an image file to upload.' });
    }
    if (!selectedBookId) {
      return setMessage({ type: 'error', text: 'Please select a Book.' });
    }
    if (selectedTagIds.length === 0) {
      return setMessage({ type: 'error', text: 'Please select or add at least one tag.' });
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Compress image and Upload proof image to Supabase Storage
      const compressedFile = await compressImageIfNeeded(selectedFile);
      const uploadedUrl = await uploadImageFile(compressedFile, 'proofs');

      // 2. Insert media record & link tags in DB
      await createMediaRecord(uploadedUrl, description, selectedBookId, selectedTagIds);

      // Trigger Toast notification
      toast.success('Media proof successfully uploaded and linked!');
      setMessage({ type: 'success', text: 'Media proof successfully uploaded and linked!' });

      // Reset form completely for a fresh start
      setSelectedFile(null);
      setImagePreviewUrl(null);
      setDescription('');
      setSelectedReligionId('');
      setSelectedCategoryId('');
      setSelectedBookId('');
      setSelectedTagIds([]);
      setTagSearchInput('');
      setCategories([]);
      setBooks([]);
    } catch (err: any) {
      console.error('Submit Error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to upload media.' });
    } finally {
      setLoading(false);
    }
  };

  // Format options for SearchableSelect
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
    <div className="min-h-screen pb-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-start items-center my-6 gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-800 bg-gray-100  hover:bg-gray-200 rounded-full transition-colors shrink-0"
            title="Back to Home"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <h2 className="text-3xl font-extrabold text-gray-900">Dashboard</h2>
        </div>

        <div className="rounded-2xl">
          {message && (
            <div
              ref={messageRef}
              className={`p-4 mb-6 rounded-xl flex items-center space-x-3 transition-all ${
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Device Image Picker */}
            <div>
              <h4 className='font-semibold'>Proof Image</h4>
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                Upload from device gallery
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all overflow-hidden relative">
                  {imagePreviewUrl ? (
                    <div className="w-full h-full relative group">
                      <img
                        src={imagePreviewUrl}
                        alt="Selected Preview"
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                        Click to change image
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-indigo-400 mb-2" />
                      <p className="mb-1 text-sm text-gray-700 font-medium">
                        Click here to upload
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            {/* 2. Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter context, details, or notes about this proof image..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 3. Cascading Selects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Religion Select */}
              <SearchableSelect
                label="Religion"
                options={religionOptions}
                selectedValue={selectedReligionId}
                onChange={setSelectedReligionId}
                onAddNew={handleAddNewReligion}
                placeholder="Select Religion"
              />

              {/* Book Category Select */}
              <SearchableSelect
                label="Book Category"
                options={categoryOptions}
                selectedValue={selectedCategoryId}
                onChange={setSelectedCategoryId}
                onAddNew={handleAddNewCategory}
                placeholder={selectedReligionId ? 'Select Category' : 'Select Religion first'}
                disabled={!selectedReligionId}
              />

              {/* Book Name Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-800">Book Name</label>
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

            {/* 4. Multi-Tag Selection */}
            <div className="pt-2">
              <h4 className='font-semibold'>Tags</h4>
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                 Select existing or type new
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
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Tag Search & Add Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Filter or type new tag (e.g. durga pati)..."
                  value={tagSearchInput}
                  onChange={(e) => setTagSearchInput(e.target.value)}
                />
                {tagSearchInput.trim() &&
                  !allTags.some((t) => t.name.toLowerCase() === tagSearchInput.toLowerCase().trim()) && (
                    <button
                      type="button"
                      onClick={handleAddNewTag}
                      className="px-4 py-2 min-w-fit bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Tag</span>
                    </button>
                  )}
              </div>

              {/* Tag Options Grid */}
              <div className="mt-3 max-h-36 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50 flex flex-wrap gap-2">
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
                  <span className="text-xs text-gray-500 italic">No tags match. Click "Add Tag" above to create it.</span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-6 border border-transparent rounded-xl text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md transition-all"
              >
                {loading ? 'Uploading & Saving...' : 'Upload Media Proof'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal for Creating New Book with Book Cover */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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

export default AdminDashboard;
