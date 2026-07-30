import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  
  const [driveUrl, setDriveUrl] = useState('');
  const [tags, setTags] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [type, setType] = useState('image');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-red-600">Access Denied. You must be an admin.</p>
      </div>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      
      const { error: insertError } = await supabase.from('media').insert([
        {
          driveUrl,
          tags: tagArray,
          folderPath,
          type,
        }
      ]);
      if (insertError) throw insertError;
      
      setMessage('Successfully added to database!');
      setDriveUrl('');
      setTags('');
      setFolderPath('');
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6">Add New Media</h2>
          
          {message && (
            <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Google Drive URL (Anyone with link can view)</label>
              <input
                type="url"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Media Type</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Kabir is god Proof, Name Kabir, Supreme God"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Folder Path</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Veda/Rigveda"
              />
              <p className="mt-1 text-xs text-gray-500">Use forward slashes for nested folders.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Media'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
