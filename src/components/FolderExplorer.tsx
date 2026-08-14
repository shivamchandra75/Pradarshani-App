import React, { useState, useEffect } from 'react';
import { ChevronRight, Home as HomeIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import type { MediaItem } from '../types/database';
import {
  fetchFolderTree,
  fetchMediaByBookId,
  type ReligionTreeNode,
  type CategoryTreeNode,
  type BookTreeNode,
} from '../services/mediaService';
import { FolderCard } from './FolderCard';
import { ResultItemCard } from './ResultItemCard';

interface FolderExplorerProps {
  isAdmin: boolean;
  onSelectMedia: (item: MediaItem) => void;
  onEditMedia?: (item: MediaItem) => void;
  onDeleteMedia?: (item: MediaItem) => void;
  refreshTrigger?: number;
}

interface BreadcrumbStep {
  type: 'root' | 'religion' | 'category' | 'book';
  id: string;
  name: string;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  isAdmin,
  onSelectMedia,
  onEditMedia,
  onDeleteMedia,
  refreshTrigger = 0,
}) => {
  const [tree, setTree] = useState<ReligionTreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const [path, setPath] = useState<BreadcrumbStep[]>([
    { type: 'root', id: 'root', name: 'Root' },
  ]);

  // Book proof images in-memory cache to avoid duplicate API calls
  const [bookMediaCache, setBookMediaCache] = useState<Record<string, MediaItem[]>>({});
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const data = await fetchFolderTree();
      setTree(data);
    } catch (err) {
      console.error('Error fetching folder tree:', err);
    } finally {
      setLoadingTree(false);
    }
  };

  // Derive selected nodes from path
  const currentLevel = path.length - 1;

  function getSelectedReligion(): ReligionTreeNode | undefined {
    return path.length > 1 ? tree.find((r) => r.id === path[1].id) : undefined;
  }

  function getSelectedCategory(): CategoryTreeNode | undefined {
    const rel = getSelectedReligion();
    return rel && path.length > 2 ? rel.categories?.find((c) => c.id === path[2].id) : undefined;
  }

  function getSelectedBook(): BookTreeNode | undefined {
    const cat = getSelectedCategory();
    return cat && path.length > 3 ? cat.books?.find((b) => b.id === path[3].id) : undefined;
  }

  const selectedReligion = getSelectedReligion();
  const selectedCategory = getSelectedCategory();
  const selectedBook = getSelectedBook();

  // Load media items when a Book folder is opened
  useEffect(() => {
    if (currentLevel === 3 && selectedBook) {
      const bookId = selectedBook.id;
      if (!bookMediaCache[bookId]) {
        setLoadingMedia(true);
        fetchMediaByBookId(bookId)
          .then((items) => {
            setBookMediaCache((prev) => ({ ...prev, [bookId]: items }));
          })
          .catch((err) => console.error('Error fetching book media:', err))
          .finally(() => setLoadingMedia(false));
      }
    }
  }, [currentLevel, selectedBook, bookMediaCache]);

  // Handle refresh trigger to clear cache and force refetch
  useEffect(() => {
    if (refreshTrigger > 0 && currentLevel === 3 && selectedBook) {
      setBookMediaCache((prev) => {
        const next = { ...prev };
        delete next[selectedBook.id];
        return next;
      });
    }
  }, [refreshTrigger]);

  // Navigation handlers
  const navigateToBreadcrumb = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  const openReligion = (religion: ReligionTreeNode) => {
    setPath([
      { type: 'root', id: 'root', name: 'Root' },
      { type: 'religion', id: religion.id, name: religion.name },
    ]);
  };

  const openCategory = (category: CategoryTreeNode) => {
    setPath((prev) => [
      ...prev.slice(0, 2),
      { type: 'category', id: category.id, name: category.name },
    ]);
  };

  const openBook = (book: BookTreeNode) => {
    setPath((prev) => [
      ...prev.slice(0, 3),
      { type: 'book', id: book.id, name: book.name },
    ]);
  };

  // Derive what to render: a folder grid or media items
  const renderFolderGrid = () => {
    if (currentLevel === 0) {
      // Root → Religion folders
      const items = tree;
      return renderFolderLevel(
        items.map((r) => ({
          id: r.id,
          name: r.name,
          subtitle: `${r.categories?.length || 0} ${(r.categories?.length || 0) === 1 ? 'category' : 'categories'}`,
          onClick: () => openReligion(r),
        })),
        `${items.length} ${items.length === 1 ? 'Religion' : 'Religions'}`,
        items.length === 0 ? 'No religions found.' : undefined,
      );
    }

    if (currentLevel === 1 && selectedReligion) {
      // Religion → Category folders
      const items = selectedReligion.categories || [];
      return renderFolderLevel(
        items.map((c) => ({
          id: c.id,
          name: c.name,
          subtitle: `${c.books?.length || 0} ${(c.books?.length || 0) === 1 ? 'book' : 'books'}`,
          onClick: () => openCategory(c),
        })),
        `${items.length} ${items.length === 1 ? 'Category' : 'Categories'}`,
        items.length === 0 ? `No categories under ${selectedReligion.name}.` : undefined,
      );
    }

    if (currentLevel === 2 && selectedCategory) {
      // Category → Book folders
      const items = selectedCategory.books || [];
      return renderFolderLevel(
        items.map((b) => ({
          id: b.id,
          name: b.name,
          subtitle: 'Open →',
          isBook: true,
          coverImageUrl: b.cover_image_url,
          onClick: () => openBook(b),
        })),
        `${items.length} ${items.length === 1 ? 'Book' : 'Books'}`,
        items.length === 0 ? `No books under ${selectedCategory.name}.` : undefined,
      );
    }

    return null;
  };

  const renderFolderLevel = (
    folders: Array<{
      id: string;
      name: string;
      subtitle: string;
      isBook?: boolean;
      coverImageUrl?: string | null;
      onClick: () => void;
    }>,
    countLabel: string,
    emptyMessage?: string,
  ) => (
    <div>
      <div className="flex justify-end mb-3">
        <span className="text-xs text-gray-400 font-medium">{countLabel}</span>
      </div>
      {emptyMessage ? (
        <div className="py-12 text-center text-gray-400 text-sm">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
          {folders.map((f) => (
            <FolderCard
              key={f.id}
              name={f.name}
              subtitle={f.subtitle}
              isBook={f.isBook}
              coverImageUrl={f.coverImageUrl}
              onClick={f.onClick}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderBookMedia = () => {
    if (currentLevel !== 3 || !selectedBook) return null;

    const items = bookMediaCache[selectedBook.id] || [];

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-gray-500">Attached Proof Images</span>
          <span className="text-xs text-gray-400 font-medium">{items.length} items</span>
        </div>

        {loadingMedia ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100">
            <ImageIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            No proof images attached to {selectedBook.name} yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <ResultItemCard
                key={item.id}
                item={item}
                onClick={() => onSelectMedia(item)}
                onEdit={isAdmin && onEditMedia ? () => onEditMedia(item) : undefined}
                onDelete={isAdmin && onDeleteMedia ? () => onDeleteMedia(item) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden transition-all">
      {/* Compact 1-Line Breadcrumb */}
      <div className="bg-gray-50/60 border-b border-gray-100 px-3 sm:px-4 py-2.5 flex items-center flex-wrap gap-y-1 space-x-1 text-xs sm:text-sm font-medium">
        {path.map((step, idx) => {
          const isLast = idx === path.length - 1;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              <button
                type="button"
                onClick={() => navigateToBreadcrumb(idx)}
                className={`flex items-center space-x-1 py-1 px-2 rounded-md transition-all shrink-0 ${
                  isLast
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                {idx === 0 && <HomeIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                <span>{step.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5">
        {loadingTree ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {renderFolderGrid()}
            {renderBookMedia()}
          </>
        )}
      </div>
    </div>
  );
};
