import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TimeSlotData, CampusTeacherSlot } from '../utils/dayDataProcessor';
import { BarChart3, Layers, GraduationCap, Palette, Clock, Filter, X } from 'lucide-react';
import { getCampusColor, CAMPUS_COLORS, normalizeCampus } from '../utils/campusColors';

interface Props {
  timeSlotsData: TimeSlotData[];
  dayName: string;
  allCampuses: string[];
}

export const TeacherHoursChart: React.FC<Props> = ({
  timeSlotsData,
  dayName,
  allCampuses
}) => {
  // Campus filter state: 'ALL' or campus name
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL');

  const [hoveredData, setHoveredData] = useState<{
    slot: string;
    campusItem: CampusTeacherSlot;
    slotTotal: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filtered slots data according to selectedCampus
  const processedSlotsData = useMemo(() => {
    if (selectedCampus === 'ALL') {
      return timeSlotsData;
    }
    return timeSlotsData.map(slot => {
      const matchCampus = slot.campuses.find(c => c.campus === selectedCampus);
      return {
        ...slot,
        totalTeachers: matchCampus ? matchCampus.total : 0,
        campuses: matchCampus ? [matchCampus] : []
      };
    });
  }, [timeSlotsData, selectedCampus]);

  // Active slots with classes or teachers
  const activeSlots = useMemo(() => {
    return processedSlotsData.filter(s => s.totalTeachers > 0 || s.campuses.length > 0);
  }, [processedSlotsData]);

  // Max teachers for horizontal scaling
  const maxTeachers = useMemo(() => {
    const max = Math.max(...activeSlots.map(s => s.totalTeachers), 5);
    return Math.ceil(max / (selectedCampus === 'ALL' ? 10 : 2)) * (selectedCampus === 'ALL' ? 10 : 2);
  }, [activeSlots, selectedCampus]);

  // Campuses list for the legend
  const campusLegendList = useMemo(() => {
    const set = new Set<string>();
    // Always include all predefined campuses with unique colors
    Object.keys(CAMPUS_COLORS).forEach(c => set.add(c));
    allCampuses.forEach(c => {
      const norm = normalizeCampus(c);
      if (norm) set.add(norm);
    });
    timeSlotsData.forEach(slot => {
      slot.campuses.forEach(c => {
        if (c.total > 0) {
          const norm = normalizeCampus(c.campus);
          if (norm) set.add(norm);
        }
      });
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(name => ({
        name,
        hex: getCampusColor(name).hex
      }));
  }, [timeSlotsData, allCampuses]);

  // All available campuses for filter dropdown
  const filterOptions = useMemo(() => {
    const all = Array.from(new Set([...allCampuses, ...campusLegendList.map(c => c.name)]));
    return all.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [allCampuses, campusLegendList]);

  // Horizontal grid steps
  const gridSteps = useMemo(() => {
    const step = maxTeachers <= 10 ? 2 : maxTeachers <= 30 ? 5 : maxTeachers <= 60 ? 10 : 20;
    const steps = [];
    for (let i = 0; i <= maxTeachers; i += step) {
      steps.push(i);
    }
    return steps;
  }, [maxTeachers]);

  // Compute smart floating coordinates immediately beside cursor
  const tooltipStyle = useMemo(() => {
    if (!mousePos) return { display: 'none' };
    const width = 520;
    const height = tooltipRef.current?.offsetHeight || 300;
    const spacing = 16;

    // Position horizontally next to the pointer
    let left = mousePos.x + spacing;

    if (typeof window !== 'undefined') {
      // If overflowing on the right, show immediately to the left of pointer
      if (left + width > window.innerWidth - 16) {
        left = mousePos.x - width - spacing;
      }
      // Ensure it stays on screen
      if (left < 16) left = 16;
    }

    // Position vertically: center right beside the pointer
    let top = mousePos.y - height / 2;
    if (typeof window !== 'undefined') {
      if (top + height > window.innerHeight - 16) {
        top = window.innerHeight - height - 16;
      }
      if (top < 16) top = 16;
    }

    return {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 32px)'
    };
  }, [mousePos, hoveredData]);

  return (
    <div className="bg-[#1A3A5C]/85 backdrop-blur-md border border-[#1B5EA6]/50 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/25 space-y-6 relative">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1B5EA6]/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#1B5EA6] text-white shadow-md shadow-[#1B5EA6]/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Biểu đồ Phân bổ Giáo viên theo Khung giờ</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {dayName} • Trục dọc: Khung giờ dạy • Trục ngang: Số lượng giáo viên có tên (Cờ + Vẽ) • Rê chuột để xem chi tiết
            </p>
          </div>
        </div>

        {/* BỘ LỌC THEO CƠ SỞ (CAMPUS FILTER) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#1A3A5C] border border-[#1B5EA6]/80 rounded-xl px-3 py-1.5 shadow-inner">
            <Filter className="w-4 h-4 text-[#3EA8E0] shrink-0" />
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">Lọc cơ sở:</span>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#3EA8E0] focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-[#1A3A5C] text-white font-bold">
                Tất cả cơ sở ({filterOptions.length})
              </option>
              {filterOptions.map((campus) => (
                <option key={campus} value={campus} className="bg-[#1A3A5C] text-slate-200">
                  {campus}
                </option>
              ))}
            </select>
          </div>

          {selectedCampus !== 'ALL' && (
            <button
              onClick={() => setSelectedCampus('ALL')}
              className="inline-flex items-center gap-1.5 text-xs bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-3 py-1.5 rounded-xl border border-[#3EA8E0]/40 transition-colors font-semibold cursor-pointer shadow-sm"
              title="Xem tất cả cơ sở"
            >
              <X className="w-3.5 h-3.5" />
              <span>Bỏ lọc ({selectedCampus})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Horizontal Bar Chart */}
      {activeSlots.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <p className="text-sm">Không có dữ liệu ca dạy cho cơ sở đã chọn trong ngày này.</p>
          {selectedCampus !== 'ALL' && (
            <button
              onClick={() => setSelectedCampus('ALL')}
              className="text-xs text-[#3EA8E0] hover:underline cursor-pointer"
            >
              Bấm vào đây để xem tất cả cơ sở
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Axis Scale Markers */}
          <div className="flex items-center gap-3 pl-32 sm:pl-40 pr-16 sm:pr-20 text-xs font-mono text-slate-300 border-b border-[#1B5EA6]/30 pb-2">
            <div className="flex-1 flex justify-between text-[11px] sm:text-xs font-semibold">
              {gridSteps.map((step) => (
                <span key={step} className="transform -translate-x-1/2">
                  {step} GV
                </span>
              ))}
            </div>
          </div>

          {/* Bar Rows */}
          <div className="space-y-3">
            {activeSlots.map((slotData) => {
              const slotTotal = slotData.totalTeachers;
              const barWidthPct = maxTeachers > 0 ? (slotTotal / maxTeachers) * 100 : 0;
              const isSlotActive = hoveredData?.slot === slotData.timeSlot;

              return (
                <div
                  key={slotData.timeSlot}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                    isSlotActive ? 'bg-[#1B5EA6]/25 ring-1 ring-[#3EA8E0]' : 'hover:bg-[#1B5EA6]/10'
                  }`}
                >
                  {/* Time slot label (Left Axis) */}
                  <div className="w-32 sm:w-40 text-right font-mono shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-sm sm:text-base font-bold tracking-tight transition-all ${
                      isSlotActive 
                        ? 'text-[#3EA8E0] font-extrabold bg-[#1A3A5C] border border-[#3EA8E0] shadow-sm' 
                        : 'text-white font-bold'
                    }`}>
                      {slotData.timeSlot}
                    </span>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="flex-1 bg-[#0d1b2a]/90 rounded-xl h-8 border border-[#1B5EA6]/40 relative overflow-hidden flex items-center p-0.5 shadow-inner">
                    {/* Vertical guideline markers */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5">
                      {gridSteps.map((step) => (
                        <div key={step} className="h-full border-r border-[#1B5EA6]/20" />
                      ))}
                    </div>

                    {/* Stacked bar segments container */}
                    <div
                      className="h-full flex rounded-lg overflow-hidden transition-all duration-300 shadow-md relative z-10"
                      style={{ width: `${Math.max(barWidthPct, slotTotal > 0 ? 3 : 0)}%` }}
                    >
                      {slotData.campuses
                        .filter(c => c.total > 0)
                        .map((c) => {
                          const segWidthPct = slotTotal > 0 ? (c.total / slotTotal) * 100 : 0;
                          const isHovered = hoveredData?.slot === slotData.timeSlot && hoveredData.campusItem.campus === c.campus;

                          return (
                            <div
                              key={c.campus}
                              className={`h-full transition-all duration-150 cursor-pointer relative border-r border-[#0d1b2a] last:border-r-0 opacity-100 hover:brightness-110 ${
                                isHovered ? 'ring-2 ring-white z-20 brightness-115 shadow-lg' : ''
                              }`}
                              style={{
                                width: `${segWidthPct}%`,
                                backgroundColor: c.hex
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampus(selectedCampus === c.campus ? 'ALL' : c.campus);
                              }}
                              onMouseMove={(e) => {
                                setMousePos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseEnter={(e) => {
                                setMousePos({ x: e.clientX, y: e.clientY });
                                setHoveredData({
                                  slot: slotData.timeSlot,
                                  campusItem: c,
                                  slotTotal
                                });
                              }}
                              onMouseLeave={() => {
                                setHoveredData(null);
                                setMousePos(null);
                              }}
                            />
                          );
                        })}
                    </div>

                    {slotTotal === 0 && (
                      <span className="text-[11px] text-slate-400 pl-3 italic">
                        Chưa có ca giảng dạy
                      </span>
                    )}
                  </div>

                  {/* Total Count Badge (Right Axis) */}
                  <div className="w-16 sm:w-20 text-left font-mono text-xs font-bold shrink-0">
                    {slotTotal > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#1B5EA6]/30 text-[#3EA8E0] border border-[#1B5EA6]/60">
                        {slotTotal} GV
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">0</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BẢNG HIỆN KẾ BÊN MŨI TÊN CHUỘT (FLOATING TOOLTIP VIA PORTAL TO BODY) */}
      {hoveredData && mousePos && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[999999] pointer-events-none w-[480px] sm:w-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] overflow-y-auto bg-[#1A3A5C] border-2 border-[#3EA8E0] rounded-2xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in duration-75 space-y-3.5"
          style={tooltipStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1B5EA6]/40">
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full shrink-0 shadow-md ring-2 ring-white/60"
                style={{ backgroundColor: hoveredData.campusItem.hex }}
              />
              <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                <span>{hoveredData.campusItem.campus}: </span>
                <span className="text-[#3EA8E0] font-black text-base sm:text-xl">
                  {hoveredData.campusItem.total} GV
                </span>
                <span className="text-slate-300 font-medium ml-1.5 text-xs sm:text-sm">
                  ({hoveredData.campusItem.chess} cờ; {hoveredData.campusItem.art} vẽ)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-mono text-slate-200 bg-[#1A3A5C] px-3 py-1.5 rounded-xl border border-[#1B5EA6]/60">
              <Clock className="w-3.5 h-3.5 text-[#3EA8E0]" />
              <span>Khung giờ: <strong className="text-white font-bold">{hoveredData.slot}</strong></span>
            </div>
          </div>

          {/* 2 Cột thông tin: Thông tin GV cờ & Thông tin GV vẽ */}
          <div className="grid grid-cols-2 gap-3">
            {/* THÔNG TIN GV CỜ (#F9C846) */}
            <div className="bg-[#1A3A5C] border border-[#F9C846]/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1B5EA6]/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F9C846] uppercase tracking-wide">
                  <GraduationCap className="w-4 h-4" />
                  <span>THÔNG TIN GV CỜ:</span>
                </div>
                <span className="text-xs font-bold font-mono text-[#F9C846] bg-[#F9C846]/15 px-2 py-0.5 rounded-lg border border-[#F9C846]/35">
                  {hoveredData.campusItem.chess} GV
                </span>
              </div>

              {Array.from(new Set(hoveredData.campusItem.chessTeachers)).length > 0 ? (
                <ul className="space-y-1.5 text-xs">
                  {Array.from(new Set(hoveredData.campusItem.chessTeachers)).map((teacher, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-slate-100 bg-[#1B5EA6]/25 px-2.5 py-1.5 rounded-lg border border-[#1B5EA6]/40 leading-snug font-medium"
                    >
                      <span className="text-[#F9C846] font-bold shrink-0 mt-0.5">•</span>
                      <span>{teacher}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  Không có
                </div>
              )}
            </div>

            {/* THÔNG TIN GV VẼ (#9B7FD4) */}
            <div className="bg-[#1A3A5C] border border-[#9B7FD4]/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1B5EA6]/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#9B7FD4] uppercase tracking-wide">
                  <Palette className="w-4 h-4" />
                  <span>THÔNG TIN GV VẼ:</span>
                </div>
                <span className="text-xs font-bold font-mono text-[#9B7FD4] bg-[#9B7FD4]/15 px-2 py-0.5 rounded-lg border border-[#9B7FD4]/35">
                  {hoveredData.campusItem.art} GV
                </span>
              </div>

              {Array.from(new Set(hoveredData.campusItem.artTeachers)).length > 0 ? (
                <ul className="space-y-1.5 text-xs">
                  {Array.from(new Set(hoveredData.campusItem.artTeachers)).map((teacher, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-slate-100 bg-[#1B5EA6]/25 px-2.5 py-1.5 rounded-lg border border-[#1B5EA6]/40 leading-snug font-medium"
                    >
                      <span className="text-[#9B7FD4] font-bold shrink-0 mt-0.5">•</span>
                      <span>{teacher}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  Không có
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CHÚ THÍCH MÀU CƠ SỞ */}
      <div className="pt-4 border-t border-[#1B5EA6]/40 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-[#3EA8E0]" />
            <span>Chú thích màu cơ sở (Bấm vào cơ sở để lọc nhanh):</span>
          </div>
        </div>

        {/* Legend Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {campusLegendList.map((c) => {
            const isSelected = selectedCampus === c.name;

            return (
              <button
                key={c.name}
                onClick={() => setSelectedCampus(isSelected ? 'ALL' : c.name)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-white border-white bg-[#1B5EA6] text-white font-bold shadow-lg scale-105'
                    : selectedCampus !== 'ALL'
                    ? 'opacity-40 bg-[#1A3A5C] border-[#1B5EA6]/30 text-slate-400 hover:opacity-80'
                    : 'bg-[#1A3A5C] hover:bg-[#1B5EA6]/40 border-[#1B5EA6]/50 text-slate-200 hover:text-white'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1.5 ring-white/30"
                  style={{ backgroundColor: c.hex }}
                />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
