import React from 'react';
import { RefreshCw, Download, Printer, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, ArrowLeft } from 'lucide-react';
import { formatDateVN } from '../data/cameraDataService';
import { GOOGLE_SHEET_ID, GOOGLE_SHEET_GID } from '../data/googleSheetSync';

interface HeaderProps {
  dateFrom: string;
  dateTo: string;
  onReset: () => void;
  onExportCSV: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  onRefreshData?: () => void;
  totalLiveRecords?: number;
  syncError?: string | null;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dateFrom,
  dateTo,
  onReset,
  onExportCSV,
  isSyncing = false,
  lastSyncTime,
  onRefreshData,
  totalLiveRecords,
  syncError,
  onBack
}) => {
  const handlePrint = () => {
    window.print();
  };

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit#gid=${GOOGLE_SHEET_GID}`;

  return (
    <header className="bg-[#0b1838] text-white shadow-md sticky top-0 z-30 transition-all border-b border-[#1c2c54]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between gap-2">
        {/* Brand & Optional Return Button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm hover:shadow"
              title="Quay lại Báo Cáo Giám Sát Giảng Dạy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Về Báo Cáo Giảng Dạy</span>
              <span className="sm:hidden">Quay lại</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3d7cff] to-[#22c3a6] flex items-center justify-center font-black text-white text-base shadow-sm ring-2 ring-white/10 flex-shrink-0">
            CV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-[15px] font-bold tracking-tight text-white line-clamp-1">
                Trung tâm Cờ Vua Sài Gòn
              </strong>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#2f6bff]/20 text-[#71a0ff] border border-[#2f6bff]/30">
                CVSG
              </span>
            </div>
            <span className="text-[#aebbd3] text-xs font-medium block mt-0.5 line-clamp-1">
              Báo cáo kỹ thuật & hiện trạng camera
            </span>
          </div>
        </div>

        {/* Top Meta & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#cbd4e7] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-[#8e9ebc]">Thời gian:</span>
            <span className="font-semibold text-white">
              {formatDateVN(dateFrom)} – {formatDateVN(dateTo)}
            </span>
          </div>

          {/* Google Sheet Live Sync Badge */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở Google Sheet dữ liệu gốc"
              className="flex items-center gap-1.5 text-xs text-[#6ee7b7] hover:text-white transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="hidden xl:inline text-white/80">Google Sheets:</span>
              <span className="font-semibold text-emerald-300">
                {isSyncing ? 'Đang cập nhật...' : totalLiveRecords ? `${totalLiveRecords.toLocaleString('vi-VN')} dòng` : 'Đã kết nối'}
              </span>
            </a>

            {lastSyncTime && !isSyncing && (
              <span className="text-[10px] text-white/50 hidden md:inline border-l border-white/10 pl-2">
                {lastSyncTime}
              </span>
            )}

            {/* Refresh Button */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isSyncing}
                title="Bấm để đồng bộ dữ liệu mới nhất từ Google Sheets"
                className={`p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer ${
                  isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#38bdf8]' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 sm:pl-3">
            <button
              onClick={onExportCSV}
              title="Xuất dữ liệu CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
            <button
              onClick={handlePrint}
              title="In báo cáo"
              className="p-1.5 text-[#cbd4e7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer hidden md:flex items-center justify-center"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onReset}
              title="Đặt lại bộ lọc"
              className="p-1.5 text-[#cbd4e7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {syncError && (
        <div className="bg-amber-600/90 text-white text-xs px-4 py-1 text-center font-medium flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{syncError} (Đang dùng dữ liệu lưu tạm)</span>
        </div>
      )}
    </header>
  );
};

