import React from 'react';
import { X, ExternalLink, Image as ImageIcon, Download } from 'lucide-react';

interface EvidenceModalProps {
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  if (!imageUrl) return null;

  // Convert Google Drive view URL to direct embeddable preview or direct link
  let embedUrl = imageUrl;
  if (imageUrl.includes('drive.google.com/file/d/')) {
    const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold truncate max-w-md">{title || 'Ảnh Minh Chứng Vi Phạm'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở link gốc trên Drive
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer iframe / image container */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-2 min-h-[480px]">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full min-h-[500px] rounded-lg border-0 bg-slate-900"
            allow="autoplay"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Liên kết Drive: <span className="font-mono text-slate-300">{imageUrl}</span></span>
          <span>Nhấn ESC hoặc nút Đóng để thoát</span>
        </div>
      </div>
    </div>
  );
};
