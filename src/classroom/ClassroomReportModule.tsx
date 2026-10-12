import React, { useState, useEffect, useMemo } from 'react';
import { SpreadsheetData } from './types/sheet';
import { DAYS_CONFIG, processDayData, DayConfig, getDynamicDaysConfig } from './utils/dayDataProcessor';
import { syncLiveSheetsFromLink } from './utils/googleSheetsSync';
import { 
  getStoredTeacherChanges, 
  saveTeacherChanges, 
  detectRealTeacherChangesFromLiveSync,
  updateBaselineSnapshot,
  TeacherChangeRecord 
} from './utils/teacherChangeTracker';
import { CalendarDatePicker } from './components/CalendarDatePicker';
import { TeacherChangeAlertBox } from './components/TeacherChangeAlertBox';
import { DayActiveCampusesStats } from './components/DayActiveCampusesStats';
import { TeacherHoursChart } from './components/TeacherHoursChart';
import { TeacherListView } from './components/TeacherListView';
import { DutyWeeklyView } from './components/DutyWeeklyView';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Calendar,
  RefreshCw,
  ArrowLeft,
  Github,
  BookOpen,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

export const GITHUB_REPO_URL = 'https://github.com/ctvgiamsatcvsg-cmyk/BAO-CAO-LOP-HOC.git';
export const GOOGLE_SHEET_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE/edit?usp=sharing';

interface ClassroomReportModuleProps {
  onBack?: () => void;
}

export const ClassroomReportModule: React.FC<ClassroomReportModuleProps> = ({ onBack }) => {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    // Tự động mở đúng ngày thực tế hôm nay (Thứ 7 / CN / ngày trong tuần)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
    const dayMap: Record<number, string> = {
      0: 'cn',
      1: 'thu2',
      2: 'thu3',
      3: 'thu4',
      4: 'thu5',
      5: 'thu6',
      6: 'thu7',
    };
    return dayMap[dayOfWeek] || 'thu7';
  });

  const [extraView, setExtraView] = useState<'schedule' | 'teachers' | 'duty'>('schedule');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Ban đầu');
  const [teacherChanges, setTeacherChanges] = useState<TeacherChangeRecord[]>(() => getStoredTeacherChanges());

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let loadedData: SpreadsheetData | null = null;

      // Tier 1: Thử gọi API proxy nội bộ /api/all-sheets
      try {
        const res = await fetch(`/api/all-sheets?t=${Date.now()}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json && json.sheets && Object.keys(json.sheets).length > 0) {
            loadedData = json as SpreadsheetData;
          }
        }
      } catch (e) {
        // Tiếp tục thử các nguồn dự phòng tiếp theo
      }

      // Tier 2: Thử tải file tĩnh /data/all_sheets.json
      if (!loadedData) {
        try {
          const res = await fetch(`/data/all_sheets.json?t=${Date.now()}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (json && json.sheets && Object.keys(json.sheets).length > 0) {
              loadedData = json as SpreadsheetData;
            }
          }
        } catch (e) {
          // Tiếp tục thử bundled module
        }
      }

      // Tier 3: Nhập dữ liệu đóng gói tĩnh sẵn trong bundle (chạy hoàn hảo 100% trên Cloudflare Workers/Pages)
      if (!loadedData) {
        try {
          const bundledModule = await import('./data/defaultSheetsData.json');
          const defaultData = (bundledModule.default || bundledModule) as unknown as SpreadsheetData;
          if (defaultData && defaultData.sheets && Object.keys(defaultData.sheets).length > 0) {
            loadedData = defaultData;
          }
        } catch (bundleErr) {
          console.warn('Lỗi tải bundled fallback data:', bundleErr);
        }
      }

      // Tier 4: Nếu cả 3 nguồn trên đều không có, tự động đồng bộ trực tiếp từ Google Sheets công khai
      if (!loadedData) {
        try {
          const initialSkeleton: SpreadsheetData = {
            spreadsheetId: '1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE',
            sheets: {},
            sheetList: []
          };
          const { updatedData } = await syncLiveSheetsFromLink(initialSkeleton, DAYS_CONFIG);
          if (updatedData && Object.keys(updatedData.sheets).length > 0) {
            loadedData = updatedData;
          }
        } catch (syncErr) {
          console.error('Lỗi tự động fetch Google Sheets live:', syncErr);
        }
      }

      if (isMounted) {
        if (loadedData) {
          setData(loadedData);
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        }
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Tính toán dynamic ngày tháng theo từng sheet thực tế
  const daysConfig: DayConfig[] = useMemo(() => {
    if (!data) return DAYS_CONFIG;
    return getDynamicDaysConfig(data);
  }, [data]);

  // Cấu hình của ngày đang chọn
  const selectedDayConfig = useMemo(() => {
    return daysConfig.find((d) => d.id === selectedDayId) || daysConfig[0];
  }, [daysConfig, selectedDayId]);

  // Dữ liệu tính toán của ngày đang chọn
  const processedStats = useMemo(() => {
    if (!data) {
      return {
        timeSlotsData: [],
        campusSummary: [],
        subjectSummary: { chess: { count: 0, hours: 0 }, art: { count: 0, hours: 0 } },
        totalClasses: 0,
        totalHours: 0,
        allCampusesInDay: []
      };
    }
    return processDayData(data, selectedDayConfig);
  }, [data, selectedDayConfig]);

  // Hàm đồng bộ trực tiếp song song từ Google Sheets
  const handleLiveSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const baseData: SpreadsheetData = data || {
        spreadsheetId: '1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE',
        sheets: {},
        sheetList: []
      };
      const { updatedData, syncedCount } = await syncLiveSheetsFromLink(baseData, daysConfig, selectedDayConfig);
      if (syncedCount > 0) {
        setData(updatedData);
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        try {
          const { changes: newChanges, newBaseline } = detectRealTeacherChangesFromLiveSync(updatedData, daysConfig);
          if (newChanges.length > 0) {
            setTeacherChanges((prev) => {
              const combined = [...newChanges, ...prev];
              saveTeacherChanges(combined);
              return combined;
            });
            updateBaselineSnapshot(newBaseline);
          }
        } catch (changeErr) {
          console.warn('Lỗi kiểm tra thay đổi giáo viên:', changeErr);
        }
      }
    } catch (err) {
      console.error('Lỗi sync live:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-slate-900/90 text-white rounded-2xl p-8 space-y-4 shadow-xl">
        <RefreshCw className="w-10 h-10 animate-spin text-[#3EA8E0]" />
        <h3 className="text-lg font-bold">Đang tải Báo Cáo Lớp Học & Điều Phối Ca Dạy...</h3>
        <p className="text-sm text-slate-400">Đang khởi tạo 20 Sheet điều phối CLB Cờ Vua Sài Gòn</p>
      </div>
    );
  }

  if (!data || Object.keys(data.sheets || {}).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-[#0d1b2a] text-white rounded-2xl p-8 space-y-4 shadow-xl text-center border border-slate-700/60">
        <RefreshCw className="w-12 h-12 text-[#3EA8E0]" />
        <h3 className="text-lg font-bold">Đang chuẩn bị dữ liệu lớp học</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Chưa nhận được phản hồi dữ liệu ban đầu. Vui lòng nhấn nút bên dưới để tải trực tiếp từ Google Sheets.
        </p>
        <button
          type="button"
          onClick={handleLiveSync}
          disabled={isSyncing}
          className="px-5 py-2.5 bg-[#4CAF8A] hover:bg-[#439c7a] text-slate-900 font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Đang tải dữ liệu...' : 'Tải lại dữ liệu Google Sheets'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0d1b2a] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#1A3A5C]/95 backdrop-blur-md border-b border-[#1B5EA6]/60 px-4 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0d1b2a]/60 hover:bg-[#1B5EA6] text-slate-300 hover:text-white border border-[#1B5EA6]/60 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
              title="Quay lại Báo Cáo Camera & Chất Lượng Giảng Dạy"
            >
              <ArrowLeft className="w-4 h-4 text-[#3EA8E0]" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5EA6] to-[#3EA8E0] flex items-center justify-center shadow-md shadow-[#1B5EA6]/40 shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-base md:text-lg text-white tracking-wide">
                BÁO CÁO LỚP HỌC & ĐIỀU PHỐI CA DẠY
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4CAF8A]/20 text-[#4CAF8A] border border-[#4CAF8A]/40 uppercase tracking-wider">
                BAO-CAO-LOP-HOC
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block">
              Hệ thống điều phối 20 sheet, lịch ca dạy, trực ban &amp; danh bạ giáo viên CLB Cờ Vua Sài Gòn
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Links */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Views Tabs */}
          <div className="bg-[#0d1b2a]/70 p-1 rounded-xl border border-[#1B5EA6]/60 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setExtraView('schedule')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                extraView === 'schedule'
                  ? 'bg-[#1B5EA6] text-white shadow-md shadow-[#1B5EA6]/50'
                  : 'text-slate-300 hover:text-white hover:bg-[#1A3A5C]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#3EA8E0]" />
              <span>Biểu Đồ Ca Dạy</span>
            </button>

            <button
              type="button"
              onClick={() => setExtraView('teachers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                extraView === 'teachers'
                  ? 'bg-[#1B5EA6] text-white shadow-md shadow-[#1B5EA6]/50'
                  : 'text-slate-300 hover:text-white hover:bg-[#1A3A5C]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#F9C846]" />
              <span>Danh Bạ 466 GV</span>
            </button>

            <button
              type="button"
              onClick={() => setExtraView('duty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                extraView === 'duty'
                  ? 'bg-[#1B5EA6] text-white shadow-md shadow-[#1B5EA6]/50'
                  : 'text-slate-300 hover:text-white hover:bg-[#1A3A5C]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#4CAF8A]" />
              <span>Trực Ban Tuần</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleLiveSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4CAF8A] hover:bg-[#439c7a] active:scale-95 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md shadow-[#4CAF8A]/20 cursor-pointer disabled:opacity-50"
            title="Đồng bộ lại dữ liệu tức thì từ Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang tải...' : 'Đồng bộ'}</span>
          </button>

          {/* Direct Link to GitHub */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-600 transition-all shadow-sm cursor-pointer"
            title="Mở kho mã nguồn báo cáo trên GitHub"
          >
            <Github className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden md:inline">GitHub</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Direct Link to Google Sheets Source */}
          <a
            href={GOOGLE_SHEET_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3A5C] hover:bg-[#1B5EA6] text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-[#1B5EA6]/60 transition-all shadow-sm cursor-pointer"
            title="Mở Google Sheet gốc chứa 20 Tab điều phối"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#3EA8E0]" />
            <span className="hidden md:inline">Google Sheet</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 1. THANH LỌC CHỌN NGÀY */}
        <section className="bg-[#1A3A5C] border border-[#1B5EA6]/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3EA8E0]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Thanh lọc thứ ngày:
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Chọn nhanh các ngày trong tuần hoặc mở lịch tra cứu (ngày tự động đồng bộ theo link Google Sheet)
              </p>
            </div>

            {/* Calendar Date Picker Dropdown & Fast Stepper */}
            <div className="flex flex-wrap items-center gap-2.5">
              <CalendarDatePicker
                selectedDayId={selectedDayId}
                onSelectDayId={(id) => {
                  setSelectedDayId(id);
                  if (extraView !== 'schedule') setExtraView('schedule');
                }}
                daysConfig={daysConfig}
              />

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1 bg-[#1A3A5C] p-1 rounded-xl border border-[#1B5EA6]">
                <button
                  type="button"
                  onClick={() => {
                    const idx = daysConfig.findIndex((d) => d.id === selectedDayId);
                    if (idx > 0) setSelectedDayId(daysConfig[idx - 1].id);
                  }}
                  disabled={selectedDayId === daysConfig[0].id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1B5EA6]/40 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Ngày trước"
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = daysConfig.findIndex((d) => d.id === selectedDayId);
                    if (idx < daysConfig.length - 1) setSelectedDayId(daysConfig[idx + 1].id);
                  }}
                  disabled={selectedDayId === daysConfig[daysConfig.length - 1].id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1B5EA6]/40 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Ngày kế tiếp"
                >
                  Sau ›
                </button>
              </div>
            </div>
          </div>

          {/* Quick-day chips */}
          <div className="pt-3 border-t border-[#1B5EA6]/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-300 mr-1">Chọn nhanh:</span>
              {daysConfig.map((day) => {
                const isSelected = selectedDayId === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setSelectedDayId(day.id);
                      if (extraView !== 'schedule') setExtraView('schedule');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs transition-all font-semibold border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1B5EA6] text-white font-bold border-[#3EA8E0] shadow-md shadow-[#1B5EA6]/40 scale-102'
                        : 'bg-[#1A3A5C] hover:bg-[#1B5EA6]/30 text-slate-300 hover:text-white border-[#1B5EA6]/50'
                    }`}
                  >
                    <span>{day.name}</span>
                    <span className="ml-1 text-[11px] opacity-90 font-mono">({day.date})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#1A3A5C] px-3 py-1.5 rounded-xl border border-[#1B5EA6]/50">
              <span className="w-2 h-2 rounded-full bg-[#4CAF8A] shrink-0" />
              <span>Link Sheet tự động • Cập nhật lúc {lastSyncTime}</span>
            </div>
          </div>

          {/* Ô CẢNH BÁO THAY ĐỔI NGƯỜI THEO NGÀY */}
          <TeacherChangeAlertBox
            changes={teacherChanges}
            selectedDayId={selectedDayId}
            selectedDayName={selectedDayConfig.name}
            selectedDayDate={selectedDayConfig.date}
            selectedDayFullDate={selectedDayConfig.fullDateStr}
            onClearDayChanges={(dayId) => {
              const filtered = teacherChanges.filter((c) => c.dayId !== dayId);
              setTeacherChanges(filtered);
              saveTeacherChanges(filtered);
            }}
            onClearSingleChange={(changeId) => {
              const filtered = teacherChanges.filter((c) => c.id !== changeId);
              setTeacherChanges(filtered);
              saveTeacherChanges(filtered);
            }}
          />
        </section>

        {/* THỐNG KÊ SỐ CƠ SỞ HOẠT ĐỘNG TRÊN TỔNG SỐ CƠ SỞ THEO NGÀY */}
        {data && (
          <DayActiveCampusesStats
            data={data}
            daysConfig={daysConfig}
            selectedDayId={selectedDayId}
          />
        )}

        {extraView === 'schedule' ? (
          /* BIỂU ĐỒ PHÂN BỔ GIÁO VIÊN THEO KHUNG GIỜ */
          <section>
            <TeacherHoursChart
              timeSlotsData={processedStats.timeSlotsData}
              dayName={`${selectedDayConfig.name} (${selectedDayConfig.date})`}
              allCampuses={processedStats.allCampusesInDay}
            />
          </section>
        ) : extraView === 'teachers' ? (
          /* Danh bạ 466 Giáo viên */
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Danh bạ Giáo viên Toàn Hệ Thống</h2>
                <p className="text-xs text-slate-400">Tra cứu nhanh họ tên, bậc chuyên môn, phân loại môn Cờ / Vẽ, SĐT và Email</p>
              </div>
              <button
                type="button"
                onClick={() => setExtraView('schedule')}
                className="text-xs bg-[#1A3A5C] hover:bg-[#1B5EA6]/40 text-[#3EA8E0] px-3 py-1.5 rounded-lg border border-[#1B5EA6]/50 transition-colors cursor-pointer"
              >
                Quay lại Biểu đồ
              </button>
            </div>
            {data && <TeacherListView sheet={data.sheets['492309054']} />}
          </section>
        ) : (
          /* Trực ban theo tuần */
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Lịch Trực Ban Tuần &amp; Bổ Sung Nhân Sự</h2>
                <p className="text-xs text-slate-400">Thông tin ca trực ban toàn bộ các cơ sở trong tuần</p>
              </div>
              <button
                type="button"
                onClick={() => setExtraView('schedule')}
                className="text-xs bg-[#1A3A5C] hover:bg-[#1B5EA6]/40 text-[#3EA8E0] px-3 py-1.5 rounded-lg border border-[#1B5EA6]/50 transition-colors cursor-pointer"
              >
                Quay lại Biểu đồ
              </button>
            </div>
            {data && <DutyWeeklyView sheet={data.sheets['467135540']} />}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1B5EA6]/30 bg-[#1A3A5C]/60 py-4 px-4 md:px-8 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <span>Hệ thống Điều phối Lớp học &amp; Giáo viên Cờ Vua Sài Gòn • Dữ liệu tự động cập nhật từ Google Sheets</span>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Kho GitHub BAO-CAO-LOP-HOC</span>
          </a>
        </div>
      </footer>
    </div>
  );
};
export default ClassroomReportModule;
