import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ImageLightBoxModalProps {
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

export const ImageLightBoxModal: React.FC<ImageLightBoxModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-800">
          <h4 className="text-sm font-bold text-slate-800 truncate pr-4 font-display">
            {title}
          </h4>
          <div className="flex items-center space-x-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Mở trong tab mới</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image content */}
        <div className="p-4 flex items-center justify-center bg-slate-100 max-h-[80vh] overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80';
            }}
          />
        </div>
      </div>
    </div>
  );
};
