import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, Folder, Image as ImageIcon, Video, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MediaItem {
  id: string;
  driveUrl: string;
  tags: string[];
  folderPath: string;
  type: string;
}

interface FolderNode {
  name: string;
  path: string;
  children: Record<string, FolderNode>;
  items: MediaItem[];
}

const Home: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const { data, error } = await supabase.from('media').select('*');
        if (error) throw error;
        if (data) {
          setAllMedia(data as MediaItem[]);
        }
      } catch (error) {
        console.error("Error fetching media:", error);
      }
      setLoading(false);
    };
    fetchMedia();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setCurrentPath([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = allMedia.filter(item => 
      item.tags.some(tag => tag.toLowerCase().includes(term))
    );
    setSearchResults(results);
    setCurrentPath([]);
  }, [searchTerm, allMedia]);

  // Build Virtual Folder Tree based on search results
  const buildTree = (items: MediaItem[]) => {
    const root: FolderNode = { name: 'root', path: '', children: {}, items: [] };

    items.forEach(item => {
      const parts = item.folderPath.split('/').filter(p => p);
      let currentNode = root;

      parts.forEach((part, index) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            children: {},
            items: []
          };
        }
        currentNode = currentNode.children[part];
      });
      currentNode.items.push(item);
    });

    return root;
  };

  const getFolderAtCurrentPath = (tree: FolderNode, pathParts: string[]): FolderNode => {
    let current = tree;
    for (const part of pathParts) {
      if (current.children[part]) {
        current = current.children[part];
      } else {
        break;
      }
    }
    return current;
  };

  const tree = buildTree(searchResults);
  const currentFolder = getFolderAtCurrentPath(tree, currentPath);

  const navigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const navigateUp = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header / Search Bar */}
      <header className="bg-white shadow-sm py-8 px-4 relative">
        <div className="absolute top-4 right-4 flex space-x-4">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Admin Dashboard
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Pradarshani Media Search
          </h1>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg shadow-sm transition-shadow hover:shadow-md"
              placeholder="Search context (e.g. 'Name Kabir', 'Kabir is god Proof')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : !searchTerm.trim() ? (
          <div className="text-center py-20 text-gray-500 text-lg">
            Enter a search term to find media.
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-lg">
            No results found for "{searchTerm}".
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Breadcrumb Navigation */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center space-x-2 text-sm">
              <button 
                onClick={navigateToRoot}
                className="text-gray-500 hover:text-indigo-600 font-medium transition-colors"
              >
                Search Results
              </button>
              {currentPath.map((part, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <button 
                    onClick={() => navigateUp(idx)}
                    className={`font-medium transition-colors ${idx === currentPath.length - 1 ? 'text-gray-900' : 'text-gray-500 hover:text-indigo-600'}`}
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Folder / Items Grid */}
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                
                {/* Render subfolders */}
                {Object.values(currentFolder.children).map(childFolder => (
                  <button
                    key={childFolder.path}
                    onClick={() => navigateToFolder(childFolder.name)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-gray-50 transition-colors group text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Folder className="h-16 w-16 text-indigo-200 group-hover:text-indigo-400 transition-colors mb-3" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 line-clamp-2">
                      {childFolder.name}
                    </span>
                  </button>
                ))}

                {/* Render items in this folder */}
                {currentFolder.items.map(item => (
                  <a
                    key={item.id}
                    href={item.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-gray-50 transition-colors group text-center border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {item.type === 'video' ? (
                      <Video className="h-16 w-16 text-red-400 group-hover:text-red-500 transition-colors mb-3" />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-emerald-400 group-hover:text-emerald-500 transition-colors mb-3" />
                    )}
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {item.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
              
              {Object.keys(currentFolder.children).length === 0 && currentFolder.items.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  This folder is empty.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
