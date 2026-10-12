import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DAYS_CONFIG, DayConfig } from '../utils/dayDataProcessor';
import { Calendar as CalendarIcon, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface Props {
  selectedDayId: string;
  onSelectDayId: (id: string) => void;
  daysConfig?: DayConfig[];
}

export const CalendarDatePicker: React.FC<Props> = ({
  selectedDayId,
  onSelectDayId,
  daysConfig
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeDays = daysConfig || DAYS_CONFIG;
  const currentDayConfig = activeDays.find(d => d.id === selectedDayId) || activeDays[0];

  // Helper to parse day, month (0-indexed), year from day.fullDateStr
  const parseDayDate = (dayCfg: DayConfig) => {
    const match = dayCfg.fullDateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1; // 0-indexed month
      let y = parseInt(match[3], 10);
      if (y < 100) y += 2000;
      return { d, m, y };
    }
    return null;
  };

  const initialParsed = parseDayDate(currentDayConfig) || { d: 1, m: 9, y: 2026 };
  const [currentYear, setCurrentYear] = useState(initialParsed.y);
  const [currentMonth, setCurrentMonth] = useState(initialParsed.m);

  // Sync calendar view month/year when selected day changes
  useEffect(() => {
    const parsed = parseDayDate(currentDayConfig);
    if (parsed) {
      setCurrentMonth(parsed.m);
      setCurrentYear(parsed.y);
    }
  }, [selectedDayId, currentDayConfig]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNamesVi = [
    'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư',
    'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám',
    'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
  ];

  // Days of week header: H B T N S B C (Hai, Ba, Tư, Năm, Sáu, Bảy, Chủ Nhật)
  const weekDays = ['H', 'B', 'T', 'N', 'S', 'B', 'C'];

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Build calendar matrix (Monday as first day of week)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDayOffset = (firstDayOfMonth + 6) % 7; // Mon = 0, Sun = 6

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Dynamically map schedule days from sheet link data: key "YYYY-M-D" -> DayConfig
  const dateMap: Record<string, DayConfig> = useMemo(() => {
    const map: Record<string, DayConfig> = {};
    activeDays.forEach(dayCfg => {
      const parsed = parseDayDate(dayCfg);
      if (parsed) {
        map[`${parsed.y}-${parsed.m}-${parsed.d}`] = dayCfg;
      }
    });
    return map;
  }, [activeDays]);

  // Build 42 grid cells (6 rows x 7 cols)
  const gridCells = [];

  // Previous month trailing days
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const key = `${prevYear}-${prevMonthIdx}-${dayNum}`;
    gridCells.push({
      day: dayNum,
      isCurrentMonth: false,
      year: prevYear,
      month: prevMonthIdx,
      dayConfig: dateMap[key] || null,
      isToday: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${currentYear}-${currentMonth}-${d}`;
    gridCells.push({
      day: d,
      isCurrentMonth: true,
      year: currentYear,
      month: currentMonth,
      dayConfig: dateMap[key] || null,
      isToday: false
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 42 - gridCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const key = `${nextYear}-${nextMonthIdx}-${d}`;
    gridCells.push({
      day: d,
      isCurrentMonth: false,
      year: nextYear,
      month: nextMonthIdx,
      dayConfig: dateMap[key] || null,
      isToday: false
    });
  }

  // Format date display for input (e.g. "01/10/2026")
  const parsedCurrent = parseDayDate(currentDayConfig);
  const formattedInputDate = parsedCurrent 
    ? `${parsedCurrent.d.toString().padStart(2, '0')}/${(parsedCurrent.m + 1).toString().padStart(2, '0')}/${parsedCurrent.y}`
    : currentDayConfig.fullDateStr;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Date Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-[#1A3A5C] text-white hover:bg-[#1B5EA6]/30 px-3.5 py-2 rounded-xl shadow-sm border border-[#1B5EA6]/70 transition-all font-sans cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3EA8E0] min-w-[210px]"
      >
        <span className="font-mono text-sm font-semibold tracking-tight text-white">
          {formattedInputDate}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#3EA8E0] bg-[#1B5EA6]/30 px-2 py-0.5 rounded-md border border-[#1B5EA6]/50">
            {currentDayConfig.name}
          </span>
          <CalendarIcon className="w-4 h-4 text-[#3EA8E0]" />
        </div>
      </button>

      {/* Popover Calendar View */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-76 bg-[#1A3A5C] text-white rounded-2xl shadow-2xl border-2 border-[#1B5EA6] p-4.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Calendar Header with Month/Year and navigation arrows */}
          <div className="flex items-center justify-between mb-3 px-1 border-b border-[#1B5EA6]/40 pb-2.5">
            <div className="font-bold text-sm text-white">
              {monthNamesVi[currentMonth]} {currentYear}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-[#1B5EA6]/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-[#1B5EA6]/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header (H B T N S B C) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-xs font-semibold text-[#3EA8E0]">
            {weekDays.map((wd, i) => (
              <div key={i} className="py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* 42 Calendar Cells Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {gridCells.map((cell, idx) => {
              const isMatchSelected = cell.dayConfig && cell.dayConfig.id === selectedDayId;
              const hasSchedule = !!cell.dayConfig;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!hasSchedule}
                  onClick={() => {
                    if (cell.dayConfig) {
                      onSelectDayId(cell.dayConfig.id);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all relative ${
                    isMatchSelected
                      ? 'bg-[#1B5EA6] text-white font-bold shadow-md shadow-[#1B5EA6]/50 ring-2 ring-[#3EA8E0]'
                      : hasSchedule
                      ? 'bg-[#1B5EA6]/30 text-[#3EA8E0] hover:bg-[#1B5EA6]/60 font-bold border border-[#1B5EA6]/60 cursor-pointer'
                      : !cell.isCurrentMonth
                      ? 'text-slate-600 cursor-not-allowed opacity-30'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>{cell.day}</span>
                  {hasSchedule && !isMatchSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#4CAF8A]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note: Dynamic date from sheet link */}
          <div className="mt-3 pt-2.5 border-t border-[#1B5EA6]/30 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4CAF8A]" />
              <span>Link Sheet tự động</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#3EA8E0] hover:underline font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
