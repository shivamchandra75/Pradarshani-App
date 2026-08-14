import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateBook, uploadImageFile, type BookTreeNode } from '../services/mediaService';
import { compressImageIfNeeded } from '../utils/imageCompression';

interface EditBookModalProps {
  book: BookTreeNode;
  onClose: () => void;
  onSaved: () => void;
}

export const EditBookModal: React.FC<EditBookModalProps> = ({ book, onClose, onSaved }) => {
  const [bookName, setBookName] = useState(book.name);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(book.cover_image_url || null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message]);

  const handleReplacementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReplacementFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) {
      return setMessage({ type: 'error', text: 'Book name cannot be empty.' });
    }

    setLoading(true);
    setMessage(null);

    try {
      let finalImageUrl = book.cover_image_url;
      
      if (replacementFile) {
        const compressedFile = await compressImageIfNeeded(replacementFile);
        finalImageUrl = await uploadImageFile(compressedFile, 'covers');
      }

      await updateBook(book.id, {
        name: bookName,
        coverImageUrl: finalImageUrl,
      });

      toast.success('Book updated successfully!');
      setMessage({ type: 'success', text: 'Book updated successfully!' });
      
      setTimeout(() => {
        onSaved();
      }, 500);
    } catch (err: any) {
      console.error('Update Error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update book.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Book</h3>
            <p className="text-xs text-gray-500">Modify book name or cover image</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[70vh]">
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

          <form id="edit-book-form" onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Book Name *
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Book Cover Image (Thumbnail)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt="Cover preview"
                    className="w-20 h-28 object-cover rounded-lg border border-gray-300 bg-white shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-28 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center text-xs text-gray-500 text-center p-2">
                    No Cover
                  </div>
                )}
                
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-gray-500">
                    Select a new file from your device to replace this cover:
                  </p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer shadow-sm transition-all">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>{replacementFile ? 'Change File' : 'Upload New Cover'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReplacementFileChange}
                    />
                  </label>
                  {replacementFile && (
                    <p className="text-xs text-indigo-600 font-medium truncate">
                      {replacementFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2.5">
          <button
            type="submit"
            form="edit-book-form"
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
    </div>
  );
};
