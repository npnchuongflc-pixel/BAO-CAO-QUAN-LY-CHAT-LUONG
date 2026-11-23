import React, { useMemo, useState } from 'react';
import { CalendarX2, Building2, Calendar, Search, X, Filter, CheckCircle2 } from 'lucide-react';

export interface MissingFacilityDayItem {
  coSo: string;
  ngay: string; // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  shortDate: string; // DD/MM
  dailyTarget: number;
}

interface MissingDaysModalProps {
  items: MissingFacilityDayItem[];
  periodLabel: string;
  endedDaysCount: number;
  onClose: () => void;
  onSelectFacility: (facilityName: string) => void;
}

export const MissingDaysModal: React.FC<MissingDaysModalProps> = ({
  items,
  periodLabel,
  endedDaysCount,
  onClose,
  onSelectFacility,
}) => {
  const [groupBy, setGroupBy] = useState<'facility' | 'date'>('facility');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      it =>
        it.coSo.toLowerCase().includes(q) ||
        it.displayDate.toLowerCase().includes(q) ||
        it.ngay.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const groupedByFacility = useMemo(() => {
    const map = new Map<string, MissingFacilityDayItem[]>();
    filteredItems.forEach(item => {
      const list = map.get(item.coSo) || [];
      list.push(item);
      map.set(item.coSo, list);
    });
    return Array.from(map.entries())
      .map(([coSo, days]) => ({
        coSo,
        days: [...days].sort((a, b) => b.ngay.localeCompare(a.ngay)),
      }))
      .sort((a, b) => b.days.length - a.days.length || a.coSo.localeCompare(b.coSo, 'vi'));
  }, [filteredItems]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, { displayDate: string; facilities: MissingFacilityDayItem[] }>();
    filteredItems.forEach(item => {
      const existing = map.get(item.ngay) || { displayDate: item.displayDate, facilities: [] };
      existing.facilities.push(item);
      map.set(item.ngay, existing);
    });
    return Array.from(map.entries())
      .map(([ngay, val]) => ({
        ngay,
        displayDate: val.displayDate,
        facilities: [...val.facilities].sort((a, b) => a.coSo.localeCompare(b.coSo, 'vi')),
      }))
      .sort((a, b) => b.ngay.localeCompare(a.ngay));
  }, [filteredItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <CalendarX2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
                Cơ Sở Không Thực Hiện Check Out ({items.length} lượt bị bỏ trống)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {periodLabel} • Đếm số lượt bị bỏ trống trên {endedDaysCount} ngày đã kết thúc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên cơ sở hoặc ngày (VD: 15/11)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B5EA6] focus:bg-white transition-all"
            />
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setGroupBy('facility')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                groupBy === 'facility'
                  ? 'bg-white text-[#1B5EA6] shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Theo cơ sở ({groupedByFacility.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('date')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                groupBy === 'date'
                  ? 'bg-white text-[#1B5EA6] shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Theo ngày ({groupedByDate.length})</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <p className="font-bold text-sm">
                {items.length === 0
                  ? 'Không có ngày nào bị bỏ trống trong kỳ đã kết thúc!'
                  : 'Không tìm thấy kết quả phù hợp với từ khóa.'}
              </p>
            </div>
          ) : groupBy === 'facility' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {groupedByFacility.map(group => (
                <div
                  key={group.coSo}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#1B5EA6] shrink-0" />
                        <span className="font-bold text-sm text-slate-900">{group.coSo}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                        Bỏ trống {group.days.length} lượt
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {group.days.map(d => (
                        <span
                          key={d.ngay}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50/70 border border-rose-200/80 text-rose-800 text-[11px] font-semibold font-mono"
                          title={`Ngày ${d.displayDate} (Định mức ${d.dailyTarget} lượt)`}
                        >
                          <Calendar className="w-3 h-3 text-rose-500" />
                          {d.displayDate}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectFacility(group.coSo);
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-[#1B5EA6] hover:text-white text-slate-700 border border-slate-200 hover:border-[#1B5EA6] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Xem chi tiết cơ sở này</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByDate.map(dateGroup => (
                <div
                  key={dateGroup.ngay}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold text-sm text-slate-900">
                        Ngày {dateGroup.displayDate}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                      {dateGroup.facilities.length} lượt không check out
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {dateGroup.facilities.map(item => (
                      <button
                        key={`${dateGroup.ngay}-${item.coSo}`}
                        type="button"
                        onClick={() => {
                          onSelectFacility(item.coSo);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-[#1B5EA6]/10 border border-slate-200 hover:border-[#1B5EA6]/40 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.coSo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>* Mỗi lượt bị bỏ trống là 1 ngày đã kết thúc mà cơ sở chưa thực hiện Check out.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
