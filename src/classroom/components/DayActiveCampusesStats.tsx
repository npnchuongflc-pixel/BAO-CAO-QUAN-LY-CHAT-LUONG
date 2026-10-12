import React, { useMemo, useState } from 'react';
import { SpreadsheetData } from '../types/sheet';
import { DayConfig, computeDayCampusStats, processDayData } from '../utils/dayDataProcessor';
import { Building2, Users, Crown, Palette, Award, X, ChevronRight } from 'lucide-react';

interface Props {
  data: SpreadsheetData;
  daysConfig: DayConfig[];
  selectedDayId: string;
}

export const DayActiveCampusesStats: React.FC<Props> = ({
  data,
  daysConfig,
  selectedDayId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cấu hình của ngày hiện tại
  const currentDayConfig = useMemo(() => {
    return daysConfig.find(d => d.id === selectedDayId) || daysConfig[0];
  }, [daysConfig, selectedDayId]);

  // Thống kê số cơ sở hoạt động cho đúng ngày đang chọn
  const dayStats = useMemo(() => {
    return computeDayCampusStats(data, currentDayConfig);
  }, [data, currentDayConfig]);

  // Thống kê tổng số giáo viên cho đúng ngày đang chọn
  const teacherStats = useMemo(() => {
    return processDayData(data, currentDayConfig);
  }, [data, currentDayConfig]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: SỐ CƠ SỞ HOẠT ĐỘNG (#3EA8E0) */}
        <div className="bg-gradient-to-br from-[#1A3A5C]/90 via-[#1A3A5C]/75 to-[#1B5EA6]/15 border border-[#1B5EA6]/40 hover:border-[#3EA8E0]/60 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle ambient glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#3EA8E0]/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-60" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cơ sở hoạt động
              </span>
              <div className="p-2.5 rounded-xl bg-[#3EA8E0]/15 text-[#3EA8E0] border border-[#3EA8E0]/30 shadow-sm group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-[#3EA8E0] tracking-tight">
                {dayStats.activeCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {dayStats.totalCount} CS
              </span>
              <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono ${
                dayStats.percentage >= 100 
                  ? 'bg-[#4CAF8A]/20 text-[#4CAF8A] border-[#4CAF8A]/40' 
                  : 'bg-[#F9C846]/20 text-[#F9C846] border-[#F9C846]/40'
              }`}>
                {dayStats.percentage}%
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1B5EA6]/30">
            <div className="w-full bg-[#1B5EA6]/30 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#3EA8E0] rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${dayStats.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300 mt-2 truncate font-medium">
              {dayStats.dayName} • {dayStats.activeCount === dayStats.totalCount ? `Toàn bộ ${dayStats.totalCount} cơ sở mở lớp` : 'Có cơ sở nghỉ'}
            </p>
          </div>
        </div>

        {/* CARD 2: TỔNG SỐ GIÁO VIÊN (#4CAF8A) - CÓ NÚT XEM PHÂN BỐ BẬC */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-br from-[#1A3A5C]/90 via-[#1A3A5C]/75 to-[#4CAF8A]/15 border border-[#1B5EA6]/40 hover:border-[#4CAF8A]/60 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:shadow-[0_8px_30px_rgba(76,175,138,0.2)]"
        >
          {/* Subtle ambient glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#4CAF8A]/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-60" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tổng số Giáo viên
              </span>
              <div className="p-2.5 rounded-xl bg-[#4CAF8A]/15 text-[#4CAF8A] border border-[#4CAF8A]/30 shadow-sm group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-[#4CAF8A] tracking-tight">
                {teacherStats.totalTeacherCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                giáo viên
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1B5EA6]/30 flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-medium font-mono">
              {teacherStats.chessTeacherCount} Cờ + {teacherStats.artTeacherCount} Vẽ = {teacherStats.totalTeacherCount}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4CAF8A] group-hover:translate-x-1 transition-transform bg-[#4CAF8A]/10 px-2.5 py-1 rounded-lg border border-[#4CAF8A]/30">
              <Award className="w-3.5 h-3.5" />
              <span>Xem phân bố bậc</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* CARD 3: TỔNG SỐ GV CỜ (#F9C846) */}
        <div className="bg-gradient-to-br from-[#1A3A5C]/90 via-[#1A3A5C]/75 to-[#F9C846]/15 border border-[#1B5EA6]/40 hover:border-[#F9C846]/60 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle ambient glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#F9C846]/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-60" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tổng số GV Cờ
              </span>
              <div className="p-2.5 rounded-xl bg-[#F9C846]/15 text-[#F9C846] border border-[#F9C846]/30 shadow-sm group-hover:scale-105 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-[#F9C846] tracking-tight">
                {teacherStats.chessTeacherCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                giáo viên
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1B5EA6]/30 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">{dayStats.dayName}</span>
            <span className="font-mono text-[#F9C846] font-semibold bg-[#F9C846]/10 px-2 py-0.5 rounded border border-[#F9C846]/25">
              {teacherStats.chessTeacherCount} GV ({teacherStats.chessAssignmentsCount || 0} ca dạy)
            </span>
          </div>
        </div>

        {/* CARD 4: TỔNG SỐ GV VẼ (#9B7FD4) */}
        <div className="bg-gradient-to-br from-[#1A3A5C]/90 via-[#1A3A5C]/75 to-[#9B7FD4]/15 border border-[#1B5EA6]/40 hover:border-[#9B7FD4]/60 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle ambient glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#9B7FD4]/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-60" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tổng số GV Vẽ
              </span>
              <div className="p-2.5 rounded-xl bg-[#9B7FD4]/15 text-[#9B7FD4] border border-[#9B7FD4]/30 shadow-sm group-hover:scale-105 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-[#9B7FD4] tracking-tight">
                {teacherStats.artTeacherCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                giáo viên
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1B5EA6]/30 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">{dayStats.dayName}</span>
            <span className="font-mono text-[#9B7FD4] font-semibold bg-[#9B7FD4]/10 px-2 py-0.5 rounded border border-[#9B7FD4]/25">
              {teacherStats.artTeacherCount} GV ({teacherStats.artAssignmentsCount || 0} ca dạy)
            </span>
          </div>
        </div>
      </div>

      {/* MODAL DIALOG: BẢNG PHÂN BỐ BẬC CHUYÊN MÔN TOÀN DIỆN */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-[#0d1b2a]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-[#1A3A5C] border border-[#1B5EA6] rounded-2xl max-w-3xl w-full p-6 shadow-2xl shadow-black/50 relative max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1B5EA6]/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#4CAF8A]/20 text-[#4CAF8A] border border-[#4CAF8A]/40">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Phân bố Giáo viên theo Bậc ({dayStats.dayName})
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dữ liệu thực tế từ Google Sheets • Mỗi giáo viên chỉ tính 1 lần dù dạy nhiều tiết/ca
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1B5EA6]/40 transition-colors cursor-pointer"
                title="Đóng bảng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-banner */}
            <div className="py-3 px-4 my-4 bg-[#1B5EA6]/20 border border-[#1B5EA6]/40 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
              <span className="text-slate-200">
                Tổng cộng: <strong className="text-[#4CAF8A] font-bold text-sm font-mono">{teacherStats.totalTeacherCount} Giáo viên</strong> ({teacherStats.chessTeacherCount} Cờ + {teacherStats.artTeacherCount} Vẽ)
              </span>
              <span className="font-mono text-slate-300">
                {teacherStats.totalAssignmentsCount || 0} ca dạy thực tế (1 GV dạy nhiều ca tính 1)
              </span>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 flex-1">
              {/* CỘT CỜ VUA (#F9C846) */}
              <div className="bg-[#1A3A5C]/80 border border-[#F9C846]/30 rounded-xl p-4 flex flex-col justify-between shadow-inner">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1B5EA6]/30 mb-3">
                    <div className="flex items-center gap-2 text-[#F9C846] font-bold text-sm">
                      <Crown className="w-4 h-4" />
                      <span>GIÁO VIÊN CỜ VUA</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#F9C846] bg-[#F9C846]/15 px-2.5 py-0.5 rounded-full border border-[#F9C846]/30">
                      {teacherStats.chessTeacherCount} GV ({teacherStats.chessAssignmentsCount || 0} ca dạy)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {teacherStats.chessRankBreakdown.map((item) => (
                      <div 
                        key={item.rank}
                        className="bg-[#1B5EA6]/15 rounded-xl p-2.5 border border-[#1B5EA6]/30"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${item.bgClass} ${item.textClass} ${item.borderClass}`}>
                            {item.label}
                          </span>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="font-black text-xs text-white">{item.uniqueTeachersCount} GV</span>
                            <span className="text-[10px] text-slate-400 font-sans">({item.totalAssignmentsCount} ca)</span>
                          </div>
                        </div>
                        <div className="w-full bg-[#1A3A5C] h-1.5 rounded-full overflow-hidden flex border border-[#1B5EA6]/30">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${item.barClass}`}
                            style={{ width: `${Math.max(item.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {teacherStats.chessRankBreakdown.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">Không có dữ liệu GV cờ</div>
                    )}
                  </div>
                </div>
              </div>

              {/* CỘT LỚP VẼ (#9B7FD4) */}
              <div className="bg-[#1A3A5C]/80 border border-[#9B7FD4]/30 rounded-xl p-4 flex flex-col justify-between shadow-inner">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1B5EA6]/30 mb-3">
                    <div className="flex items-center gap-2 text-[#9B7FD4] font-bold text-sm">
                      <Palette className="w-4 h-4" />
                      <span>GIÁO VIÊN LỚP VẼ</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#9B7FD4] bg-[#9B7FD4]/15 px-2.5 py-0.5 rounded-full border border-[#9B7FD4]/30">
                      {teacherStats.artTeacherCount} GV ({teacherStats.artAssignmentsCount || 0} ca dạy)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {teacherStats.artRankBreakdown.map((item) => (
                      <div 
                        key={item.rank}
                        className="bg-[#1B5EA6]/15 rounded-xl p-2.5 border border-[#1B5EA6]/30"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${item.bgClass} ${item.textClass} ${item.borderClass}`}>
                            {item.label}
                          </span>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="font-black text-xs text-white">{item.uniqueTeachersCount} GV</span>
                            <span className="text-[10px] text-slate-400 font-sans">({item.totalAssignmentsCount} ca)</span>
                          </div>
                        </div>
                        <div className="w-full bg-[#1A3A5C] h-1.5 rounded-full overflow-hidden flex border border-[#1B5EA6]/30">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${item.barClass}`}
                            style={{ width: `${Math.max(item.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {teacherStats.artRankBreakdown.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">Không có dữ liệu GV vẽ</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-[#1B5EA6]/40 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Đóng bảng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
