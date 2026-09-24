import React from 'react';
import { ArrowLeft, Video, AlertCircle } from 'lucide-react';

interface HeaderProps {
  dateFrom?: string;
  dateTo?: string;
  onReset?: () => void;
  onExportCSV?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  onRefreshData?: () => void;
  totalLiveRecords?: number;
  syncError?: string | null;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onBack,
  syncError
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Clean Back Button & Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98] whitespace-nowrap"
              title="Quay lại Báo Cáo Giám Sát Giảng Dạy"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span>Về Báo Cáo Giảng Dạy</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Hiện Trạng &amp; Sự Cố Camera
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Hệ thống theo dõi kỹ thuật và khắc phục sự cố camera cơ sở
              </p>
            </div>
          </div>
        </div>
      </div>

      {syncError && (
        <div className="bg-amber-500 text-white text-xs px-4 py-1 text-center font-medium flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{syncError} (Đang dùng dữ liệu lưu tạm)</span>
        </div>
      )}
    </header>
  );
};

