import React, { useMemo, useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  ExternalLink,
  ImageOff,
  Maximize2,
  Filter,
} from 'lucide-react';
import { HygieneReport } from './facilityTypes';
import { getFacilityTargetDetail, matchAreaToTargetLabel } from '../../utils/facilityUtils';

export type DayComplianceStatus =
  | 'no_checkout'
  | 'incomplete'
  | 'complete'
  | 'off_or_unsynced'
  | 'upcoming'
  | 'insufficient_data';

export interface FacilityDayInspectionItem {
  report: HygieneReport;
  normalizedCategoryKey: string;
  hasRealPhoto: boolean;
  isDuplicateCategory: boolean;
}

export interface FacilityDayStatusRecord {
  iso: string;
  dayNum: number;
  shortDate: string; // DD/MM
  displayDate: string; // DD/MM/YYYY
  weekdayLabel: string;
  dailyTarget: number | null;
  isDayOff?: boolean;
  scheduleNote?: string;
  status: DayComplianceStatus;
  rawCount: number;
  photoCompletedItems: number;
  duplicatePhotosCount: number;
  missingCount: number;
  items: FacilityDayInspectionItem[];
}

interface FacilityDayInspectionModalProps {
  facilityName: string;
  initialDateIso: string;
  daysInMonth: FacilityDayStatusRecord[];
  monthLabel: string;
  onClose: () => void;
  onSelectFacilityFilter?: (facilityName: string) => void;
}

const STATUS_META: Record<
  DayComplianceStatus,
  { label: string; colorClass: string; bgClass: string; barDotClass: string }
> = {
  no_checkout: {
    label: 'Không làm',
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
    barDotClass: 'bg-rose-500 text-white border-rose-600',
  },
  incomplete: {
    label: 'Làm thiếu',
    colorClass: 'text-amber-800',
    bgClass: 'bg-amber-50 border-amber-200',
    barDotClass: 'bg-amber-500 text-white border-amber-600',
  },
  complete: {
    label: 'Làm đủ',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
    barDotClass: 'bg-emerald-500 text-white border-emerald-600',
  },
  off_or_unsynced: {
    label: 'Ngày nghỉ / Chưa đồng bộ',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
    barDotClass: 'bg-slate-300 text-slate-700 border-slate-400',
  },
  upcoming: {
    label: 'Chưa đến hạn',
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50 border-slate-200',
    barDotClass: 'bg-slate-100 text-slate-400 border-slate-200',
  },
  insufficient_data: {
    label: 'Chưa đủ dữ liệu',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
    barDotClass: 'bg-slate-300 text-slate-700 border-slate-400',
  },
};

export const FacilityDayInspectionModal: React.FC<FacilityDayInspectionModalProps> = ({
  facilityName,
  initialDateIso,
  daysInMonth,
  monthLabel,
  onClose,
  onSelectFacilityFilter,
}) => {
  const [selectedIso, setSelectedIso] = useState<string>(() => {
    const found = daysInMonth.find(d => d.iso === initialDateIso);
    if (found) return found.iso;
    const ended = [...daysInMonth].reverse().find(d => d.status !== 'upcoming');
    return ended?.iso || daysInMonth[0]?.iso || initialDateIso;
  });
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  const selectedDay = useMemo(
    () => daysInMonth.find(d => d.iso === selectedIso) || daysInMonth[0] || null,
    [daysInMonth, selectedIso],
  );

  const targetDetail = useMemo(() => getFacilityTargetDetail(facilityName), [facilityName]);

  const checklistBreakdown = useMemo(() => {
    if (!selectedDay || !targetDetail || selectedDay.dailyTarget === null) return null;

    // Group unique photo-completed categories on selectedDay
    const uniquePhotoCategories: { categoryKey: string; label: string }[] = [];
    const seen = new Set<string>();

    selectedDay.items.forEach(item => {
      if (!item.hasRealPhoto || seen.has(item.normalizedCategoryKey)) return;
      seen.add(item.normalizedCategoryKey);
      uniquePhotoCategories.push({
        categoryKey: item.normalizedCategoryKey,
        label: item.report.khuVuc || item.normalizedCategoryKey,
      });
    });

    const rows = targetDetail.items.map(reqItem => {
      const matchedCount = uniquePhotoCategories.filter(cat =>
        matchAreaToTargetLabel(cat.label, reqItem.label),
      ).length;
      const missing = Math.max(0, reqItem.count - matchedCount);
      return {
        label: reqItem.label,
        required: reqItem.count,
        completed: matchedCount,
        missing,
      };
    });

    const baseItemsSum = targetDetail.items.reduce((sum, it) => sum + it.count, 0);
    const noPhotoItems = selectedDay.items.filter(it => !it.hasRealPhoto);

    return {
      rows,
      baseItemsSum,
      noPhotoItems,
    };
  }, [selectedDay, targetDetail]);

  if (!selectedDay) return null;
  const meta = STATUS_META[selectedDay.status];
  const effectiveStatusLabel =
    selectedDay.status === 'off_or_unsynced' && selectedDay.isDayOff
      ? 'Ngày nghỉ (Không có lớp)'
      : meta.label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1B5EA6]/10 border border-[#1B5EA6]/20 flex items-center justify-center text-[#1B5EA6] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {facilityName}
                </h3>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className={`text-xs font-bold ${meta.colorClass}`}>{effectiveStatusLabel}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {selectedDay.weekdayLabel}, {selectedDay.displayDate}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Hạng mục có ảnh:{' '}
                  <strong className="font-mono tabular-nums text-slate-800">
                    {selectedDay.isDayOff
                      ? '0/0 (Ngày nghỉ)'
                      : selectedDay.dailyTarget !== null
                      ? `${selectedDay.photoCompletedItems}/${selectedDay.dailyTarget}`
                      : 'Chưa đủ dữ liệu'}
                  </strong>
                </span>
                {selectedDay.scheduleNote && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#1B5EA6] font-medium">
                      Lưu ý: {selectedDay.scheduleNote}
                    </span>
                  </>
                )}
                {selectedDay.duplicatePhotosCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 font-medium">
                      {selectedDay.duplicatePhotosCount} ảnh gửi lại cùng hạng mục (không cộng lượt)
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng cửa sổ chi tiết"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Day Strip of Current Month */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-700">Chọn ngày trong {monthLabel}:</span>
            <span>Đỏ: Không làm · Cam: Làm thiếu · Xanh: Làm đủ · Xám: Nghỉ / Chưa đồng bộ</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {daysInMonth.map(d => {
              const isSelected = d.iso === selectedDay.iso;
              const dMeta = STATUS_META[d.status];
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => setSelectedIso(d.iso)}
                  className={`min-w-[26px] h-7 px-1 rounded-md text-[11px] font-mono tabular-nums font-bold border transition-all cursor-pointer shrink-0 ${
                    dMeta.barDotClass
                  } ${isSelected ? 'ring-2 ring-offset-1 ring-[#1B5EA6] scale-105' : 'opacity-85 hover:opacity-100'}`}
                  title={`Ngày ${d.displayDate}: ${
                    d.status === 'off_or_unsynced' && d.isDayOff ? 'Ngày nghỉ (Không có lớp)' : dMeta.label
                  }${
                    d.dailyTarget !== null && d.status !== 'upcoming' && d.status !== 'off_or_unsynced' && d.status !== 'insufficient_data'
                      ? ` (${d.photoCompletedItems}/${d.dailyTarget})`
                      : ''
                  }`}
                >
                  {d.dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40 custom-scrollbar">
          {/* Status summary notice when insufficient / off */}
          {(selectedDay.status === 'insufficient_data' || selectedDay.status === 'off_or_unsynced' || selectedDay.status === 'upcoming') && (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">{effectiveStatusLabel}</p>
                <p className="mt-0.5 leading-relaxed">
                  {selectedDay.status === 'upcoming'
                    ? 'Ngày này chưa đến hạn chốt báo cáo trong ngày.'
                    : selectedDay.isDayOff
                    ? `Cơ sở không có lịch học trong ngày ${selectedDay.weekdayLabel} này${
                        selectedDay.scheduleNote ? ` (${selectedDay.scheduleNote})` : ''
                      }, nên không tính là không làm hay thiếu ảnh.`
                    : 'Chưa xác định đủ lịch phải làm, chỉ tiêu hạng mục hoặc dữ liệu đồng bộ cho ngày này nên không tính là cơ sở không làm.'}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Hạng mục thiếu */}
          {selectedDay.dailyTarget !== null &&
            selectedDay.status !== 'upcoming' &&
            selectedDay.status !== 'off_or_unsynced' &&
            selectedDay.status !== 'insufficient_data' && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    {selectedDay.missingCount > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      Đối chiếu hạng mục có ảnh ({selectedDay.photoCompletedItems}/{selectedDay.dailyTarget})
                    </span>
                  </h4>
                  {selectedDay.missingCount > 0 ? (
                    <span className="text-xs font-bold text-rose-700 font-mono tabular-nums">
                      Thiếu {selectedDay.missingCount} lượt
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700">Đạt chỉ tiêu ngày</span>
                  )}
                </div>

                {checklistBreakdown ? (
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {checklistBreakdown.rows.map((row, idx) => {
                      const isRowMissing = row.missing > 0;
                      return (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isRowMissing ? (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 truncate">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                            <span className="text-slate-600">
                              {row.completed}/{row.required}
                            </span>
                            {isRowMissing ? (
                              <span className="text-rose-600 font-bold w-16 text-right">
                                Thiếu {row.missing}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold w-16 text-right">Đủ</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {selectedDay.scheduleNote ? (
                      <div className="px-3.5 py-2 text-[11px] text-[#1B5EA6] bg-sky-50/60">
                        * Định mức áp dụng {selectedDay.weekdayLabel}:{' '}
                        <strong className="font-mono">{selectedDay.dailyTarget}</strong> ảnh/ngày (Lưu ý: {selectedDay.scheduleNote}).
                      </div>
                    ) : selectedDay.dailyTarget > checklistBreakdown.baseItemsSum ? (
                      <div className="px-3.5 py-2 text-[11px] text-slate-500 bg-slate-50/70">
                        * Chỉ tiêu cuối tuần của cơ sở là{' '}
                        <strong className="font-mono text-slate-700">{selectedDay.dailyTarget}</strong> ảnh/ngày (tăng{' '}
                        {selectedDay.dailyTarget - checklistBreakdown.baseItemsSum} lượt so với danh mục ngày thường).
                      </div>
                    ) : null}
                    {checklistBreakdown.noPhotoItems.length > 0 && (
                      <div className="px-3.5 py-2 text-[11px] text-amber-800 bg-amber-50/60">
                        * Có {checklistBreakdown.noPhotoItems.length} dòng báo cáo không kèm ảnh thật (không được tính là hạng mục có ảnh).
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                    Chưa có danh mục khu vực chi tiết cho cơ sở này. Tổng hoàn thành có ảnh:{' '}
                    <strong className="font-mono">{selectedDay.photoCompletedItems}/{selectedDay.dailyTarget}</strong>.
                  </div>
                )}
              </div>
            )}

          {/* Section 2: Ảnh đã gửi */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#1B5EA6]" />
                <span>Danh sách báo cáo &amp; ảnh đã gửi ({selectedDay.items.length} bản ghi)</span>
              </h4>
            </div>

            {selectedDay.items.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                Không có báo cáo hoặc ảnh nào được gửi lên trong ngày {selectedDay.displayDate}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDay.items.map((item, idx) => {
                  const r = item.report;
                  return (
                    <div
                      key={`${r.id}-${idx}`}
                      className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 shadow-2xs"
                    >
                      {/* Thumbnail */}
                      {item.hasRealPhoto ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              url: r.linkAnh,
                              title: `${facilityName} · ${r.khuVuc} (${selectedDay.displayDate})`,
                            })
                          }
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group cursor-pointer"
                          title="Bấm để phóng to ảnh"
                        >
                          <img
                            src={r.linkAnh}
                            alt={r.khuVuc}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      ) : (
                        <div className="w-20 h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <ImageOff className="w-5 h-5" />
                          <span className="text-[10px] mt-1 font-medium">Thiếu ảnh</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 leading-snug line-clamp-2">
                            {r.khuVuc || 'Chưa rõ hạng mục'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            {r.gio || '--:--'} · {r.nguoiKiemTra || 'Chưa rõ'}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          {item.isDuplicateCategory ? (
                            <span className="text-amber-700 font-semibold">
                              Gửi lại (không cộng lượt)
                            </span>
                          ) : item.hasRealPhoto ? (
                            <span className="text-emerald-700 font-semibold">Tính 1 lượt có ảnh</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">Không có ảnh thật</span>
                          )}

                          {item.hasRealPhoto && (
                            <a
                              href={r.linkAnh}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[#1B5EA6] hover:underline font-medium shrink-0"
                            >
                              <span>Mở gốc</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          {onSelectFacilityFilter ? (
            <button
              type="button"
              onClick={() => {
                onSelectFacilityFilter(facilityName);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#1B5EA6] border border-slate-300 font-semibold transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc toàn trang theo cơ sở này</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Inline Photo Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4"
          onClick={e => {
            e.stopPropagation();
            setPreviewPhoto(null);
          }}
        >
          <div className="max-w-3xl w-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white text-xs sm:text-sm font-semibold">
              <span className="truncate">{previewPhoto.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhoto.url}
              alt={previewPhoto.title}
              className="max-h-[80vh] w-auto rounded-xl border border-white/20 shadow-2xl object-contain bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
