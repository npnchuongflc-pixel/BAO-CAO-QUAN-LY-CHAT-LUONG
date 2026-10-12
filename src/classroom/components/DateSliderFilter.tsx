import React, { useRef } from 'react';
import { DayConfig, DAYS_CONFIG } from '../utils/dayDataProcessor';
import { Calendar, ChevronLeft, ChevronRight, Sliders, Sparkles } from 'lucide-react';

interface Props {
  selectedDayId: string;
  onSelectDayId: (id: string) => void;
}

export const DateSliderFilter: React.FC<Props> = ({
  selectedDayId,
  onSelectDayId
}) => {
  const currentIndex = DAYS_CONFIG.findIndex(d => d.id === selectedDayId);
  const safeIndex = currentIndex !== -1 ? currentIndex : 3; // default Thu 5
  const currentDay = DAYS_CONFIG[safeIndex];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (DAYS_CONFIG[idx]) {
      onSelectDayId(DAYS_CONFIG[idx].id);
    }
  };

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

  // Percentage for progress fill on slider track
  const progressPercent = (safeIndex / (DAYS_CONFIG.length - 1)) * 100;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Thanh lọc kéo thứ ngày</span>
              <span className="text-[10px] normal-case font-normal px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                Kéo thanh trượt để đổi ngày
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Chọn nhanh lịch dạy Cờ vua & Lớp vẽ theo từng mốc thời gian
            </p>
          </div>
        </div>

        {/* Current Selected Value Pill (Highlighted as requested) */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600/30 to-blue-600/30 border border-sky-400/50 text-white shadow-lg shadow-sky-950/40">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Đang chọn:</span>
            <span className="text-sm font-extrabold text-sky-300 tracking-tight font-mono">
              {currentDay.fullDateStr}
            </span>
            {currentDay.isInitialTab && (
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded font-bold uppercase">
                Tab gốc
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Drag Slider Track Container */}
      <div className="space-y-4 pt-1">
        {/* Slider Controls with Prev/Next buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={safeIndex <= 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 hover:text-white"
            title="Ngày trước đó"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Interactive Range Slider Track */}
          <div className="relative flex-1 py-4">
            {/* Custom Background Track */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 bg-slate-800/90 rounded-full border border-slate-700/80 overflow-hidden">
              {/* Active filled gradient portion */}
              <div
                className="h-full bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Stepper Dots along track */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1">
              {DAYS_CONFIG.map((day, idx) => {
                const isPassed = idx <= safeIndex;
                const isCurrent = idx === safeIndex;

                return (
                  <div
                    key={day.id}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                      isCurrent
                        ? 'bg-white border-sky-400 scale-125 shadow-lg shadow-sky-500/50'
                        : isPassed
                        ? 'bg-sky-400 border-sky-600'
                        : 'bg-slate-700 border-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            {/* Real HTML Range Input overlaid with transparent styling */}
            <input
              type="range"
              min="0"
              max={DAYS_CONFIG.length - 1}
              step="1"
              value={safeIndex}
              onChange={handleSliderChange}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-8 opacity-0 cursor-grab active:cursor-grabbing z-20"
              aria-label="Thanh lọc kéo thứ ngày"
            />
          </div>

          <button
            onClick={handleNext}
            disabled={safeIndex >= DAYS_CONFIG.length - 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 hover:text-white"
            title="Ngày tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clickable Step Labels Below the Slider Track */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
          {DAYS_CONFIG.map((day, idx) => {
            const isSelected = safeIndex === idx;

            return (
              <button
                key={day.id}
                onClick={() => onSelectDayId(day.id)}
                className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-sky-600/30 text-sky-200 border-sky-400/80 shadow-md ring-1 ring-sky-400/50 font-bold'
                    : 'bg-slate-850/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-800/80'
                }`}
              >
                <div className="text-xs tracking-tight font-medium">
                  {day.name}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                  {day.fullDateStr.replace(/^(Thứ \d|Chủ Nhật)\s*/, '')}
                </div>
                {day.isInitialTab && (
                  <div className="mt-1 text-[8px] uppercase tracking-tighter text-amber-400 font-bold">
                    ★ Tab gốc
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
