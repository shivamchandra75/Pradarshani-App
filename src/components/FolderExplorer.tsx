import React, { useState, useEffect } from 'react';
import { Folder, BookOpen, ChevronRight, Home as HomeIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import type { MediaItem } from '../types/database';
import {
  fetchFolderTree,
  fetchMediaByBookId,
  type ReligionTreeNode,
  type CategoryTreeNode,
  type BookTreeNode,
} from '../services/mediaService';
import { ResultItemCard } from './ResultItemCard';

interface FolderExplorerProps {
  isAdmin: boolean;
  onSelectMedia: (item: MediaItem) => void;
  onEditMedia?: (item: MediaItem) => void;
  onDeleteMedia?: (item: MediaItem) => void;
}

export interface BreadcrumbStep {
  type: 'root' | 'religion' | 'category' | 'book';
  id: string;
  name: string;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  isAdmin,
  onSelectMedia,
  onEditMedia,
  onDeleteMedia,
}) => {
  const [tree, setTree] = useState<ReligionTreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);

  // Active path breadcrumb state
  const [path, setPath] = useState<BreadcrumbStep[]>([
    { type: 'root', id: 'root', name: 'Root' },
  ]);

  // Book proof images in-memory cache to avoid duplicate API calls
  const [bookMediaCache, setBookMediaCache] = useState<Record<string, MediaItem[]>>({});
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Fetch single nested directory tree on mount
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

  // Determine current active node based on path depth
  const currentLevel = path.length - 1; // 0 = Root, 1 = Religion, 2 = Category, 3 = Book

  const selectedReligion = level1Religion();
  const selectedCategory = level2Category();
  const selectedBook = level3Book();

  function level1Religion(): ReligionTreeNode | undefined {
    if (path.length > 1) {
      return tree.find((r) => r.id === path[1].id);
    }
    return undefined;
  }

  function level2Category(): CategoryTreeNode | undefined {
    const rel = level1Religion();
    if (rel && path.length > 2) {
      return rel.categories?.find((c) => c.id === path[2].id);
    }
    return undefined;
  }

  function level3Book(): BookTreeNode | undefined {
    const cat = level2Category();
    if (cat && path.length > 3) {
      return cat.books?.find((b) => b.id === path[3].id);
    }
    return undefined;
  }

  // Load media items when a Book is selected
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

  // Navigate breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  // Handle clicking a folder card
  const handleSelectReligion = (religion: ReligionTreeNode) => {
    setPath([
      { type: 'root', id: 'root', name: 'Root' },
      { type: 'religion', id: religion.id, name: religion.name },
    ]);
  };

  const handleSelectCategory = (category: CategoryTreeNode) => {
    setPath((prev) => [
      ...prev.slice(0, 2),
      { type: 'category', id: category.id, name: category.name },
    ]);
  };

  const handleSelectBook = (book: BookTreeNode) => {
    setPath((prev) => [
      ...prev.slice(0, 3),
      { type: 'book', id: book.id, name: book.name },
    ]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden transition-all">
      {/* 1. Compact 1-Line Breadcrumb Trail Header (iOS Finder style) */}
      <div className="bg-gray-50/60 border-b border-gray-100 px-3 sm:px-4 py-2.5 flex items-center space-x-1 overflow-x-auto no-scrollbar text-xs sm:text-sm font-medium whitespace-nowrap">
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

      {/* 2. iOS Finder-Style Content Body */}
      <div className="p-4 sm:p-5">
        {loadingTree ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* LEVEL 0: Root - Religion Folders */}
            {currentLevel === 0 && (
              <div>
                <div className="flex justify-end mb-3">
                  <span className="text-xs text-gray-400 font-medium">
                    {tree.length} {tree.length === 1 ? 'Religion' : 'Religions'}
                  </span>
                </div>

                {tree.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No religions found.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                    {tree.map((religion) => {
                      const categoryCount = religion.categories?.length || 0;
                      return (
                        <button
                          key={religion.id}
                          onClick={() => handleSelectReligion(religion)}
                          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-gray-50/60 hover:bg-blue-50/40 border border-gray-100 hover:border-blue-200 transition-all duration-200 group text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-xs"
                        >
                          {/* iOS Blue Finder Folder Icon */}
                          <div className="relative mb-2">
                            <Folder className="w-12 h-12 sm:w-14 sm:h-14 text-blue-500 fill-blue-500/20 group-hover:scale-105 transition-transform duration-200" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-blue-600 line-clamp-1">
                            {religion.name}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
                            {categoryCount} {categoryCount === 1 ? 'item' : 'items'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 1: Religion Selected - Category Folders */}
            {currentLevel === 1 && selectedReligion && (
              <div>
                <div className="flex justify-end mb-3">
                  <span className="text-xs text-gray-400 font-medium">
                    {selectedReligion.categories?.length || 0}{' '}
                    {(selectedReligion.categories?.length || 0) === 1 ? 'Category' : 'Categories'}
                  </span>
                </div>

                {(!selectedReligion.categories || selectedReligion.categories.length === 0) ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No categories under {selectedReligion.name}.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                    {selectedReligion.categories.map((category) => {
                      const bookCount = category.books?.length || 0;
                      return (
                        <button
                          key={category.id}
                          onClick={() => handleSelectCategory(category)}
                          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-gray-50/60 hover:bg-amber-50/40 border border-gray-100 hover:border-amber-200 transition-all duration-200 group text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-xs"
                        >
                          {/* iOS Amber Finder Folder Icon */}
                          <div className="relative mb-2">
                            <Folder className="w-12 h-12 sm:w-14 sm:h-14 text-amber-500 fill-amber-500/20 group-hover:scale-105 transition-transform duration-200" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-amber-600 line-clamp-1">
                            {category.name}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
                            {bookCount} {bookCount === 1 ? 'book' : 'books'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2: Category Selected - Book Folders */}
            {currentLevel === 2 && selectedCategory && (
              <div>
                <div className="flex justify-end mb-3">
                  <span className="text-xs text-gray-400 font-medium">
                    {selectedCategory.books?.length || 0}{' '}
                    {(selectedCategory.books?.length || 0) === 1 ? 'Book' : 'Books'}
                  </span>
                </div>

                {(!selectedCategory.books || selectedCategory.books.length === 0) ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No books under {selectedCategory.name}.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                    {selectedCategory.books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => handleSelectBook(book)}
                        className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-gray-50/60 hover:bg-indigo-50/40 border border-gray-100 hover:border-indigo-200 transition-all duration-200 group text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-xs"
                      >
                        {/* Book Asset / Cover Icon */}
                        <div className="w-12 h-16 sm:w-14 sm:h-18 bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-7 h-7 text-indigo-400" />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-indigo-600 line-clamp-1">
                          {book.name}
                        </span>
                        <span className="text-[10px] sm:text-xs text-indigo-500 font-medium mt-0.5">
                          Open →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 3: Book Selected - Attached Proof Images Grid */}
            {currentLevel === 3 && selectedBook && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500">
                    Attached Proof Images
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {(bookMediaCache[selectedBook.id] || []).length} items
                  </span>
                </div>

                {loadingMedia ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : (bookMediaCache[selectedBook.id] || []).length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No proof images attached to {selectedBook.name} yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(bookMediaCache[selectedBook.id] || []).map((item) => (
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
            )}
          </>
        )}
      </div>
    </div>
  );
};
