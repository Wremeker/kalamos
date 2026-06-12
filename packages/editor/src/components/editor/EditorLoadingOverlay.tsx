import React from 'react';
import { Loader2 } from 'lucide-react';

interface EditorLoadingOverlayProps {
  isLoading: boolean;
}

export const EditorLoadingOverlay: React.FC<EditorLoadingOverlayProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Blur backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50"
        style={{ opacity: 0.9 }}
      />
      
      {/* Spinner */}
      <div className="relative z-10">
        <Loader2 
          className="h-12 w-12 animate-spin text-[#0086F4]" 
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
};

