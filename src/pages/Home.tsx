import React, { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { MediaItem } from '../types/database';
import { deleteMediaRecord } from '../services/mediaService';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { EditMediaModal } from '../components/EditMediaModal';
import { FolderExplorer } from '../components/FolderExplorer';

export const Home: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Lightbox Modal state
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);

  // Admin Edit Modal state
  const [editingMediaItem, setEditingMediaItem] = useState<MediaItem | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handler after editing a media item (from folder explorer)
  const handleMediaSaved = async () => {
    setEditingMediaItem(null);
  };

  // Handler for deleting a media item from folder explorer cards
  const handleDeleteMedia = async (item: MediaItem) => {
    const confirmed = window.confirm('Are you sure you want to delete this media item permanently?');
    if (!confirmed) return;

    try {
      await deleteMediaRecord(item.id);
      toast.success('Media item deleted permanently!');
    } catch (err: any) {
      console.error('Failed to delete media item:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header & Search Bar */}
      <header className="bg-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Praman
          </h1>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Admin Dashboard
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
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
            onDeleteMedia={isAdmin ? (item) => handleDeleteMedia(item) : undefined}
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
    </div>
  );
};

export default Home;
