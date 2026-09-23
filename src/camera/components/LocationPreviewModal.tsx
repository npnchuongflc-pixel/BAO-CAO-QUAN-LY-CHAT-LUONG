import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Check,
  MapPin,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  getDriveDirectImageUrl,
  getDrivePreviewIframeUrl,
  extractDriveFileId
} from '../data/cameraLocations';

export interface LocationPreviewData {
  camera: string;
  site?: string;
  url: string;
}

interface LocationPreviewModalProps {
  data: LocationPreviewData | null;
  onClose: () => void;
}

export const LocationPreviewModal: React.FC<LocationPreviewModalProps> = ({
  data,
  onClose
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'image' | 'iframe'>('image');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Reset controls when camera changes
  useEffect(() => {
    if (data) {
      setZoom(1);
      setRotation(0);
      setViewMode('image');
      setIsLoading(true);
      setLoadError(false);
      setCopied(false);
    }
  }, [data]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  const directImageUrl = getDriveDirectImageUrl(data.url);
  const iframePreviewUrl = getDrivePreviewIframeUrl(data.url);
  const fileId = extractDriveFileId(data.url);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(data.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col overflow-hidden border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#0f172a] text-base tracking-tight">
                  Vị trí {data.camera}
                </span>
                {data.site && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    <MapPin className="w-3 h-3 text-[#19a78e]" />
                    {data.site}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#64748b] truncate mt-0.5">
                Sơ đồ & hình ảnh thực tế mô tả vị trí lắp đặt
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Switcher */}
            {directImageUrl && iframePreviewUrl && (
              <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs mr-1">
                <button
                  type="button"
                  onClick={() => setViewMode('image')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    viewMode === 'image'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem dạng ảnh nét cao với công cụ phóng to / xoay"
                >
                  Ảnh trực tiếp
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('iframe')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    viewMode === 'iframe'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem qua khung Google Drive"
                >
                  Khung Drive
                </button>
              </div>
            )}

            {/* Open Google Drive in new tab */}
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở ảnh gốc trong tab Google Drive mới"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Mở Drive</span>
            </a>

            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Sao chép link vị trí"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-700 font-bold">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Chép link</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors ml-1"
              title="Đóng (Phím Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center select-none">
          {/* Zoom & Rotate floating controls for Image view mode */}
          {viewMode === 'image' && !loadError && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-lg text-white text-xs">
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Phóng to (+25%)"
                className="p-1.5 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Thu nhỏ (-25%)"
                className="p-1.5 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Trở về tỉ lệ chuẩn"
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-[11px] font-semibold px-2"
              >
                Chuẩn
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                title="Xoay ảnh 90 độ"
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xoay</span>
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !loadError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/70 text-white">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-300">
                Đang tải hình ảnh vị trí {data.camera}...
              </p>
            </div>
          )}

          {/* View Mode: High-res Direct Image */}
          {viewMode === 'image' && directImageUrl && !loadError ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={directImageUrl}
                alt={`Vị trí camera ${data.camera} - ${data.site || ''}`}
                referrerPolicy="no-referrer"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError(true);
                  // Automatically switch to Drive preview iframe if direct image fails
                  setViewMode('iframe');
                }}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-h-full max-w-full object-contain rounded-lg shadow-xl cursor-grab active:cursor-grabbing"
              />
            </div>
          ) : viewMode === 'iframe' || loadError ? (
            /* View Mode: Google Drive Preview Iframe */
            <div className="w-full h-full flex flex-col bg-white">
              {iframePreviewUrl ? (
                <iframe
                  src={iframePreviewUrl}
                  title={`Google Drive Preview - ${data.camera}`}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; fullscreen"
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-700 bg-slate-50">
                  <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                  <h4 className="font-bold text-base text-slate-900 mb-1">
                    Không thể hiển thị ảnh xem trực tiếp
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mb-4">
                    Đường link vị trí này không hỗ trợ hiển thị trực tiếp hoặc yêu cầu quyền truy cập Google Drive.
                  </p>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <span>Mở liên kết trong Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-white">
              <ImageIcon className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-sm font-medium text-slate-300 mb-4">
                Chưa có ảnh nhúng trực tiếp cho camera này
              </p>
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
              >
                <span>Mở trong Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748b]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Ảnh vị trí camera <strong className="text-slate-900">{data.camera}</strong> ({data.site || 'Hệ thống'}). Dùng thanh công cụ góc trên để phóng to, xoay hoặc xem khung Drive.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Đóng
            </button>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <span>Xem trên Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
