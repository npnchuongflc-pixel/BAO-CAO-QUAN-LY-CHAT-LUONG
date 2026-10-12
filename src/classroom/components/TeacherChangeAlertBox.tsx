import React, { useState, useMemo } from 'react';
import { TeacherChangeRecord, isValidChangeAlertForDay } from '../utils/teacherChangeTracker';
import { 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Trash2
} from 'lucide-react';

interface Props {
  changes: TeacherChangeRecord[];
  selectedDayId: string;
  selectedDayName: string;
  selectedDayDate: string;
  selectedDayFullDate?: string;
  onClearDayChanges?: (dayId: string) => void;
  onClearSingleChange?: (changeId: string) => void;
}

export const TeacherChangeAlertBox: React.FC<Props> = ({
  changes,
  selectedDayId,
  selectedDayName,
  selectedDayDate,
  selectedDayFullDate,
  onClearDayChanges,
  onClearSingleChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // CHỈ CẢNH BÁO KHI NGÀY SỬA TRÙNG VỚI NGÀY THỰC TẾ
  const dayChanges = useMemo(() => {
    return changes.filter(c => isValidChangeAlertForDay(c, selectedDayId, selectedDayDate, selectedDayFullDate));
  }, [changes, selectedDayId, selectedDayDate, selectedDayFullDate]);

  return (
    <div className="pt-2 border-t border-[#1B5EA6]/30">
      {dayChanges.length > 0 ? (
        /* Ô CẢNH BÁO KHI CÓ THAY ĐỔI NGƯỜI THỰC TẾ (#F2775A) */
        <div className="bg-gradient-to-r from-[#1A3A5C] to-[#1B5EA6]/20 border border-[#F2775A]/50 rounded-xl p-3 transition-all shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="p-1 rounded-md bg-[#F2775A]/20 text-[#F2775A] border border-[#F2775A]/40 shrink-0">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-[#F2775A] uppercase tracking-wide">
                Cảnh báo thay đổi ({selectedDayName}):
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F2775A]/20 text-[#F2775A] border border-[#F2775A]/40 font-mono">
                {dayChanges.length} lượt đổi thực tế
              </span>
              <span className="hidden sm:inline text-xs text-slate-300">
                • Chỉ cảnh báo khi ngày sửa trùng với ngày thực tế
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onClearDayChanges && (
                <button
                  type="button"
                  onClick={() => onClearDayChanges(selectedDayId)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-200 hover:text-[#4CAF8A] bg-[#1A3A5C] hover:bg-[#4CAF8A]/20 border border-[#1B5EA6]/60 hover:border-[#4CAF8A]/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Đã xem và xác nhận các thay đổi này"
                >
                  <Check className="w-3.5 h-3.5 text-[#4CAF8A]" />
                  <span>Đã duyệt</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-[#1B5EA6]/30 transition-colors cursor-pointer"
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Danh sách các lượt đổi người */}
          {isExpanded && (
            <div className="mt-2.5 space-y-2">
              {dayChanges.map((change) => (
                <div
                  key={change.id}
                  className="bg-[#0d1b2a]/80 border border-[#F2775A]/30 hover:border-[#F2775A]/60 rounded-xl p-2.5 transition-all text-xs shadow-sm"
                >
                  {/* Hàng 1: Đổi ai thành ai & Thời gian đổi */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#F9C846] uppercase tracking-wide">
                        Đổi:
                      </span>
                      <span className="bg-[#F2775A]/15 text-[#F2775A] line-through px-2 py-0.5 rounded-lg text-xs font-medium border border-[#F2775A]/35">
                        {change.oldTeacher}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#F9C846] shrink-0" />
                      <span className="bg-[#4CAF8A]/20 text-[#4CAF8A] px-2 py-0.5 rounded-lg text-xs font-bold border border-[#4CAF8A]/40">
                        {change.newTeacher}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <div className="flex items-center gap-1 text-[11px] text-[#F9C846] font-mono bg-[#1B5EA6]/30 px-2 py-0.5 rounded-lg border border-[#F9C846]/30">
                        <Clock className="w-3 h-3 text-[#F9C846]" />
                        <span>{change.changeTime}</span>
                      </div>
                      {onClearSingleChange && (
                        <button
                          type="button"
                          onClick={() => onClearSingleChange(change.id)}
                          className="text-slate-400 hover:text-[#F2775A] p-1 transition-colors rounded hover:bg-[#F2775A]/10 cursor-pointer"
                          title="Xóa lượt đổi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Cơ sở, Ca dạy & Bộ môn */}
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-300 pt-1.5 mt-1.5 border-t border-[#1B5EA6]/30 font-medium">
                    <span className="text-[#3EA8E0] font-semibold">📍 {change.campus}</span>
                    <span>Ca: <strong className="text-white font-mono">{change.timeSlot}</strong> ({change.subject})</span>
                    <span>Vị trí: <strong className="text-white">{change.role}</strong></span>
                    {change.note && (
                      <span className="text-slate-400 italic">({change.note})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Ô TRẠNG THÁI GỌN GÀNG KHI CHƯA CÓ THAY ĐỔI (#4CAF8A) */
        <div className="flex items-center justify-between gap-2 bg-[#1A3A5C]/80 border border-[#4CAF8A]/35 rounded-xl px-3 py-2 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-slate-200 truncate">
            <CheckCircle2 className="w-4 h-4 text-[#4CAF8A] shrink-0" />
            <span className="truncate">
              <strong className="text-[#4CAF8A]">Cảnh báo ({selectedDayName}):</strong> Chưa có thay đổi nhân sự trong ngày thực tế • Toàn bộ GV đúng theo link Google Sheet
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#4CAF8A] shrink-0 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#4CAF8A] shrink-0" />
            <span className="hidden sm:inline font-semibold">Tự động đồng bộ</span>
          </div>
        </div>
      )}
    </div>
  );
};
