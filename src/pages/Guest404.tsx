import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

const Guest404: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-left space-y-4 max-w-lg w-full bg-white p-8 border border-gray-200 shadow-sm rounded-md font-mono">
        <div className="flex items-center gap-3 text-red-600 mb-6">
          <AlertCircle className="w-8 h-8" />
          <h1 className="text-2xl font-bold">404 Not Found</h1>
        </div>
        
        <div className="space-y-2 text-sm text-gray-700">
          <p><span className="font-bold">Error:</span> Route mismatch [ERR_NO_MATCH]</p>
          <p><span className="font-bold">Path:</span> {currentPath}</p>
          <p><span className="font-bold">Message:</span> The requested URL was not found on this server. The routing configuration failed to resolve a matching handler for this endpoint.</p>
        </div>
      </div>
    </div>
  );
};

export default Guest404;
