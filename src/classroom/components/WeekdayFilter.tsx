import React from 'react';
import { DAYS_CONFIG, DayConfig } from '../utils/dayDataProcessor';
import { Calendar, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface Props {
  selectedDayId: string;
  onSelectDayId: (id: string) => void;
}

export const WeekdayFilter: React.FC<Props> = ({
  selectedDayId,
  onSelectDayId
}) => {
  const currentIndex = DAYS_CONFIG.findIndex(d => d.id === selectedDayId);
  const safeIndex = currentIndex !== -1 ? currentIndex : 3; // Default Thu 5
  const currentDay = DAYS_CONFIG[safeIndex];

  const handlePrev = () => {
    if (safeIndex > 0) {
      onSelectDayId(DAYS_CONFIG[safeIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (safeIndex < DAYS_CONFIG.length - 1) {
      onSelectDayId(DAYS_CONFIG[safeIndex + 1].id);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-3.5">
      {/* Top Header: Title & Active Day Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span>Lọc theo Thứ trong tuần</span>
              <span className="text-[10px] normal-case font-medium px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                Mỗi thứ tự động gộp cả 2 sheet Cờ & Vẽ làm 1
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Chọn Thứ để xem lịch phân công giáo viên toàn hệ thống
            </p>
          </div>
        </div>

        {/* Current Active Day Indicator & Quick Steppers */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-sky-500/40 text-xs">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Đang xem:</span>
            <span className="font-bold text-sky-300">{currentDay.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">(Cờ + Vẽ)</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={handlePrev}
              disabled={safeIndex <= 0}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Thứ trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={safeIndex >= DAYS_CONFIG.length - 1}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Thứ kế tiếp"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Weekday Buttons (Thứ 2 -> Chủ Nhật) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {DAYS_CONFIG.map((day) => {
          const isSelected = selectedDayId === day.id;

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelectDayId(day.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-600/30 ring-2 ring-sky-400/50 scale-[1.02] z-10'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                {day.name}
              </span>
              <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                Cờ & Vẽ
              </span>
              {day.isInitialTab && (
                <span className={`mt-1 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  Tab gốc
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
