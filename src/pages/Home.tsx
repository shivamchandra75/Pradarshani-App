import React, { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { MediaItem } from '../types/database';
import { deleteMediaRecord } from '../services/mediaService';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { EditMediaModal } from '../components/EditMediaModal';
import { EditBookModal } from '../components/EditBookModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { FolderExplorer } from '../components/FolderExplorer';
import { type BookTreeNode } from '../services/mediaService';

export const Home: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Lightbox Modal state
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);

  // Admin Edit Modal state
  const [editingMediaItem, setEditingMediaItem] = useState<MediaItem | null>(null);

  // Admin Edit Book Modal state
  const [editingBook, setEditingBook] = useState<BookTreeNode | null>(null);

  // Delete confirmation modal state
  const [deletingMediaItem, setDeletingMediaItem] = useState<MediaItem | null>(null);

  // Trigger to refresh children components (like FolderExplorer)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleMediaSaved = async () => {
    setEditingMediaItem(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBookSaved = async () => {
    setEditingBook(null);
    // Triggering refresh to reload tree or cache
    // Note: FolderExplorer caches the tree but we can force it by remounting or just letting user refresh, 
    // but the easiest is to force reload tree via a window.location.reload() for a hard refresh of the sidebar
    // However, let's try just setting refreshTrigger which might be enough or we could reload.
    // For now, let's just trigger refreshTrigger and rely on the fact that they can navigate out and back in.
    setRefreshTrigger(prev => prev + 1);
    window.location.reload(); // Hard refresh to ensure folder tree is updated
  };

  // Confirm and execute delete
  const confirmDeleteMedia = async () => {
    if (!deletingMediaItem) return;
    try {
      await deleteMediaRecord(deletingMediaItem.id);
      toast.success('Media item deleted permanently!');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Failed to delete media item:', err);
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingMediaItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header & Search Bar */}
      <header className="bg-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4 mb-4">
          <h1 className="flex-1 text-3xl font-extrabold text-gray-900 tracking-tight">
            Praman
          </h1>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800  py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Dashboard
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-600 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-4">

          <div
            onClick={() => navigate('/search')}
            className="relative max-w-2xl mx-auto flex items-center bg-white border border-gray-300 rounded-full px-4 py-3.5 transition-all cursor-text"
          >
            <Search className="h-5 w-5 text-gray-400 shrink-0 mr-3" />
            <span className="text-base sm:text-lg text-gray-400 select-none">Tap here to search</span>
          </div>
        </div>
      </header>

      {/* Main Content: Folder Directory Explorer */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="pt-2">
          <FolderExplorer
            isAdmin={isAdmin}
            onSelectMedia={(item) => setActiveMediaItem(item)}
            onEditMedia={isAdmin ? (item) => setEditingMediaItem(item) : undefined}
            onDeleteMedia={isAdmin ? (item) => setDeletingMediaItem(item) : undefined}
            onEditBook={isAdmin ? (book) => setEditingBook(book) : undefined}
            refreshTrigger={refreshTrigger}
          />
        </div>
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

      {/* Admin Edit Book Modal */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
          onSaved={handleBookSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMediaItem && (
        <ConfirmModal
          title="Delete Proof Image"
          message="This action cannot be undone. The image and its associations will be permanently removed."
          confirmLabel="Delete Permanently"
          onConfirm={confirmDeleteMedia}
          onCancel={() => setDeletingMediaItem(null)}
        />
      )}
    </div>
  );
};

export default Home;
