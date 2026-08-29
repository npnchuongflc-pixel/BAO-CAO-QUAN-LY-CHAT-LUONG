import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface FacilityImageLightBoxModalProps {
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export const FacilityImageLightBoxModal: React.FC<FacilityImageLightBoxModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 truncate pr-4">{title || 'Ảnh Bằng Chứng Kiểm Tra'}</h3>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors"
              title="Mở ảnh gốc"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/10 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};
