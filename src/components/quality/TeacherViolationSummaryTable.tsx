import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  BookOpen
} from 'lucide-react';
import { TeachingAuditItem } from '../../types';

export interface TeacherAuditStatItem {
  teacherName: string;
  teacherRank: string;
  subject: string;
  facilities: string[];
  totalAudits: number; // Tổng số lượt / ca đánh giá
  totalShifts: number; // Tổng số ca
  goodCount: number; // Số lượt đạt / tốt
  violationCount: number; // Số lượt vi phạm
  remindedCount: number; // Số lượt nhắc nhở (tương ứng giá trị 'Đã gửi' ở cột Gửi mail)
  violationRate: number; // Tỉ lệ vi phạm (%) = (violationCount / totalAudits) * 100
  reViolationCount: number; // Số lượt tái vi phạm = Math.max(0, violationCount - 1)
  reViolationRateOnAudits: number; // Tỉ lệ tái vi phạm trên tổng ca (%)
  reViolationRateOnViolations: number; // Tỉ lệ tái vi phạm trên tổng số vi phạm (%)
  isReViolator: boolean; // Có tái vi phạm không (violationCount >= 2)
  severeCount: number;
  topViolationCategory: string;
  statusBadge: 'safe' | 'warn' | 'danger';
}

interface TeacherViolationSummaryTableProps {
  items: TeachingAuditItem[];
  onSelectTeacher: (teacherName: string) => void;
  dateRangeText?: string;
}

type SortField =
  | 'violationCountAndRate'
  | 'teacherName'
  | 'subject'
  | 'totalAudits'
  | 'violationCount'
  | 'remindedCount'
  | 'violationRate'
  | 'reViolationCount'
  | 'reViolationRateOnAudits';

export const TeacherViolationSummaryTable: React.FC<TeacherViolationSummaryTableProps> = ({
  items,
  onSelectTeacher,
  dateRangeText,
}) => {
  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sorting State - default sort by violation count and violation rate descending
  const [sortField, setSortField] = useState<SortField>('violationCountAndRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Tooltip / explanation toggle
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(false);

  // 1. Group items by Teacher Name and calculate stats
  const allTeacherStats: TeacherAuditStatItem[] = useMemo(() => {
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        teacherRank: string;
        subject: string;
        facilities: Set<string>;
        totalAudits: number;
        totalShifts: number;
        goodCount: number;
        violationCount: number;
        remindedCount: number;
        severeCount: number;
        violationCategoryMap: Map<string, number>;
      }
    >();

    items.forEach((item) => {
      const tName = item.teacherName ? item.teacherName.trim() : '';
      if (!tName || tName === 'Chưa rõ' || tName === 'N/A') return;

      if (!teacherMap.has(tName)) {
        teacherMap.set(tName, {
          teacherName: tName,
          teacherRank: item.teacherRank || 'Bậc 01',
          subject: item.subject || 'Khác',
          facilities: new Set<string>(),
          totalAudits: 0,
          totalShifts: 0,
          goodCount: 0,
          violationCount: 0,
          remindedCount: 0,
          severeCount: 0,
          violationCategoryMap: new Map<string, number>(),
        });
      }

      const t = teacherMap.get(tName)!;
      t.totalAudits += 1;
      t.totalShifts += item.shiftCount || 1;
      if (item.facility) t.facilities.add(item.facility);
      if (item.teacherRank && (!t.teacherRank || t.teacherRank === 'Bậc 01')) {
        t.teacherRank = item.teacherRank;
      }
      if (item.subject && t.subject === 'Khác') {
        t.subject = item.subject;
      }

      // Đếm số lượt nhắc nhở từ cột Gửi mail (giá trị 'Đã gửi')
      const isReminded = item.emailSent === 'Đã gửi' || item.emailSent?.toLowerCase().includes('gửi');
      if (isReminded) {
        t.remindedCount += 1;
      }

      const isViol = item.result === 'Vi phạm';
      if (isViol) {
        t.violationCount += 1;
        if (item.isSevere) t.severeCount += 1;
        const cat = item.violationCategory || item.violationName || 'Vi phạm khác';
        t.violationCategoryMap.set(cat, (t.violationCategoryMap.get(cat) || 0) + 1);
      } else {
        t.goodCount += 1;
      }
    });

    return Array.from(teacherMap.values()).map((t) => {
      const vRate = t.totalAudits > 0 ? (t.violationCount / t.totalAudits) * 100 : 0;
      const reViolCount = Math.max(0, t.violationCount - 1);
      const reViolRateAudits = t.totalAudits > 0 ? (reViolCount / t.totalAudits) * 100 : 0;
      const reViolRateViolations = t.violationCount > 0 ? (reViolCount / t.violationCount) * 100 : 0;
      const isReViolator = t.violationCount >= 2;

      // Find top violation category
      let topCat = 'Không vi phạm';
      let maxCatCount = 0;
      t.violationCategoryMap.forEach((count, cat) => {
        if (count > maxCatCount) {
          maxCatCount = count;
          topCat = cat;
        }
      });

      let statusBadge: 'safe' | 'warn' | 'danger' = 'safe';
      if (t.violationCount >= 2) {
        statusBadge = 'danger'; // Tái vi phạm
      } else if (t.violationCount === 1) {
        statusBadge = 'warn'; // Vi phạm lần 1
      }

      return {
        teacherName: t.teacherName,
        teacherRank: t.teacherRank,
        subject: t.subject,
        facilities: Array.from(t.facilities),
        totalAudits: t.totalAudits,
        totalShifts: t.totalShifts,
        goodCount: t.goodCount,
        violationCount: t.violationCount,
        remindedCount: t.remindedCount,
        violationRate: Number(vRate.toFixed(1)),
        reViolationCount: reViolCount,
        reViolationRateOnAudits: Number(reViolRateAudits.toFixed(1)),
        reViolationRateOnViolations: Number(reViolRateViolations.toFixed(1)),
        isReViolator,
        severeCount: t.severeCount,
        topViolationCategory: topCat,
        statusBadge,
      };
    });
  }, [items]);

  // Count total teachers with violations
  const violatorCount = useMemo(() => {
    return allTeacherStats.filter((t) => t.violationCount > 0).length;
  }, [allTeacherStats]);

  // 2. Filtered list:
  // CHỈ hiển thị giáo viên có vi phạm (violationCount > 0) theo đúng yêu cầu cảnh báo
  const filteredTeacherStats = useMemo(() => {
    return allTeacherStats.filter((t) => {
      if (t.violationCount <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return t.teacherName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allTeacherStats, searchQuery]);

  const sortedTeacherStats = useMemo(() => {
    return [...filteredTeacherStats].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'violationCountAndRate' || sortField === 'violationCount') {
        // Tiêu chí 1: Số lỗi vi phạm
        cmp = a.violationCount - b.violationCount;
        // Tiêu chí 2: Tỉ lệ vi phạm (%)
        if (cmp === 0) {
          cmp = a.violationRate - b.violationRate;
        }
        // Tiêu chí 3: Số ca tái vi phạm
        if (cmp === 0) {
          cmp = a.reViolationCount - b.reViolationCount;
        }
        // Tiêu chí 4: Tổng số ca đánh giá
        if (cmp === 0) {
          cmp = a.totalAudits - b.totalAudits;
        }
      } else if (sortField === 'violationRate') {
        // Tiêu chí 1: Tỉ lệ vi phạm (%)
        cmp = a.violationRate - b.violationRate;
        // Tiêu chí 2: Số lỗi vi phạm
        if (cmp === 0) {
          cmp = a.violationCount - b.violationCount;
        }
        // Tiêu chí 3: Số ca tái vi phạm
        if (cmp === 0) {
          cmp = a.reViolationCount - b.reViolationCount;
        }
        // Tiêu chí 4: Tổng số ca đánh giá
        if (cmp === 0) {
          cmp = a.totalAudits - b.totalAudits;
        }
      } else if (sortField === 'reViolationCount') {
        cmp = a.reViolationCount - b.reViolationCount;
        if (cmp === 0) {
          cmp = a.violationCount - b.violationCount;
        }
        if (cmp === 0) {
          cmp = a.violationRate - b.violationRate;
        }
      } else if (sortField === 'reViolationRateOnAudits') {
        cmp = a.reViolationRateOnAudits - b.reViolationRateOnAudits;
        if (cmp === 0) {
          cmp = a.violationRate - b.violationRate;
        }
        if (cmp === 0) {
          cmp = a.violationCount - b.violationCount;
        }
      } else if (sortField === 'remindedCount') {
        cmp = a.remindedCount - b.remindedCount;
        if (cmp === 0) {
          cmp = a.violationCount - b.violationCount;
        }
        if (cmp === 0) {
          cmp = a.violationRate - b.violationRate;
        }
      } else if (sortField === 'totalAudits') {
        cmp = a.totalAudits - b.totalAudits;
        if (cmp === 0) {
          cmp = a.violationCount - b.violationCount;
        }
      } else if (sortField === 'teacherName') {
        cmp = a.teacherName.localeCompare(b.teacherName, 'vi');
      } else if (sortField === 'subject') {
        cmp = a.subject.localeCompare(b.subject, 'vi');
      }

      // Tie breaker if everything else is tied: sort by teacherName
      if (cmp === 0) {
        cmp = a.teacherName.localeCompare(b.teacherName, 'vi');
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredTeacherStats, sortField, sortOrder]);

  // 4. Pagination
  const totalItems = sortedTeacherStats.length;
  const effectivePageSize = pageSize === -1 ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedList = useMemo(() => {
    if (pageSize === -1) return sortedTeacherStats;
    const startIdx = (currentPageClamped - 1) * effectivePageSize;
    return sortedTeacherStats.slice(startIdx, startIdx + effectivePageSize);
  }, [sortedTeacherStats, currentPageClamped, effectivePageSize, pageSize]);

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (field === 'violationCount' || field === 'violationCountAndRate') {
      if (sortField === 'violationCountAndRate' || sortField === 'violationCount') {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField('violationCountAndRate');
        setSortOrder('desc');
      }
      return;
    }

    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden mt-6">
      {/* HEADER: CẢNH BÁO GIÁO VIÊN - TINH GỌN, KHÔNG MÀU MÈ */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-900 font-display">
                Cảnh báo giáo viên
              </h3>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {violatorCount} giáo viên vi phạm
              </span>
            </div>
            {dateRangeText && (
              <p className="text-[11px] text-slate-500 mt-0.5">{dateRangeText}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ô tìm kiếm giáo viên */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên giáo viên..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-3 pl-4 pr-2 text-center w-12">STT</th>
              
              {/* Teacher Name */}
              <th
                onClick={() => handleSort('teacherName')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors min-w-[180px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Họ và tên Giáo viên</span>
                  {sortField === 'teacherName' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Subject */}
              <th
                onClick={() => handleSort('subject')}
                className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-24"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Bộ môn</span>
                  {sortField === 'subject' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                  )}
                </div>
              </th>

              {/* Evaluated Shifts (Số ca đánh giá) */}
              <th
                onClick={() => handleSort('totalAudits')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[110px]"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Số ca đánh giá</span>
                  {sortField === 'totalAudits' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-slate-700" /> : <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Violation Count (Lượt vi phạm) */}
              <th
                onClick={() => handleSort('violationCount')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[120px]"
                title="Nhấn để sắp xếp theo Số lỗi vi phạm"
              >
                <div className="flex items-center justify-center gap-1.5 text-amber-900">
                  <span>Lượt vi phạm</span>
                  {(sortField === 'violationCountAndRate' || sortField === 'violationCount') ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Violation Rate (Tỉ lệ vi phạm) */}
              <th
                onClick={() => handleSort('violationRate')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[110px]"
                title="Nhấn để sắp xếp theo Tỉ lệ vi phạm"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Tỉ lệ vi phạm</span>
                  {sortField === 'violationRate' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-slate-700" /> : <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Repeat Violation Count (Số lần tái vi phạm) */}
              <th
                onClick={() => handleSort('reViolationCount')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[110px]"
              >
                <div className="flex items-center justify-center gap-1.5 text-rose-800">
                  <span>Lượt tái phạm</span>
                  {sortField === 'reViolationCount' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Repeat Violation Rate (Tỉ lệ tái vi phạm) */}
              <th
                onClick={() => handleSort('reViolationRateOnAudits')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[125px]"
              >
                <div className="flex items-center justify-center gap-1.5 text-rose-800">
                  <span>Tỉ lệ tái vi phạm</span>
                  {sortField === 'reViolationRateOnAudits' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              {/* Status Tag & Action */}
              <th className="py-3 px-3 text-center w-28">Trạng thái</th>
              <th className="py-3 pr-4 text-center w-24">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedList.map((t, index) => {
              const rowNum = (currentPageClamped - 1) * effectivePageSize + index + 1;

              return (
                <tr
                  key={t.teacherName}
                  onClick={() => onSelectTeacher(t.teacherName)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors group ${
                    t.isReViolator ? 'bg-rose-50/20' : ''
                  }`}
                >
                  {/* Row Number */}
                  <td className="py-3 pl-4 pr-2 text-center font-mono text-[11px] text-slate-400 font-medium">
                    {rowNum}
                  </td>

                  {/* Teacher Name */}
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors text-xs">
                      {t.teacherName}
                    </span>
                  </td>

                  {/* Subject */}
                  <td className="py-3 px-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium text-slate-600 bg-slate-100 border border-slate-200">
                      {t.subject === 'Cờ' ? 'Khối Cờ' : t.subject === 'Vẽ' ? 'Khối Vẽ' : t.subject}
                    </span>
                  </td>

                  {/* Total Audits */}
                  <td className="py-3 px-3 text-center font-mono text-xs text-slate-700 font-medium">
                    {t.totalAudits} ca
                  </td>

                  {/* Violations Count */}
                  <td className="py-3 px-3 text-center">
                    {t.violationCount > 0 ? (
                      <span className="inline-block font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 font-mono text-xs">
                        {t.violationCount} lượt
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400 text-xs">0</span>
                    )}
                  </td>

                  {/* Violation Rate */}
                  <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-slate-800">
                    {t.violationRate}%
                  </td>

                  {/* Repeat Violation Count (Số lần tái phạm) */}
                  <td className="py-3 px-3 text-center font-mono text-xs">
                    {t.reViolationCount > 0 ? (
                      <span className="font-bold text-rose-700">
                        {t.reViolationCount} lần
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  {/* Repeat Violation Rate (Tỉ lệ tái vi phạm) */}
                  <td className="py-3 px-3 text-center font-mono text-xs">
                    {t.isReViolator ? (
                      <span className="font-bold text-rose-700">
                        {t.reViolationRateOnAudits}%
                      </span>
                    ) : (
                      <span className="text-slate-400">0.0%</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 text-center">
                    {t.statusBadge === 'danger' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Tái vi phạm
                      </span>
                    ) : t.statusBadge === 'warn' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Vi phạm 1 lần
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200">
                        100% Chuẩn
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 pr-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeacher(t.teacherName);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      title={`Xem chi tiết lịch sử đánh giá của giáo viên ${t.teacherName}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chi tiết</span>
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedList.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-medium">
                      {searchQuery
                        ? 'Không tìm thấy giáo viên vi phạm nào phù hợp với từ khóa.'
                        : 'Không có giáo viên nào có vi phạm cần cảnh báo.'}
                    </span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-blue-600 font-bold hover:underline mt-1 cursor-pointer"
                      >
                        Xóa từ khóa tìm kiếm
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TABLE FOOTER / PAGINATION */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Hiển thị{' '}
            <strong className="font-bold text-slate-800">
              {totalItems > 0 ? (currentPageClamped - 1) * effectivePageSize + 1 : 0}
            </strong>{' '}
            -{' '}
            <strong className="font-bold text-slate-800">
              {Math.min(currentPageClamped * effectivePageSize, totalItems)}
            </strong>{' '}
            trên tổng số <strong className="font-bold text-slate-800">{totalItems}</strong> giáo viên vi phạm
          </span>

          {/* Page size selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 / trang</option>
              <option value={15}>15 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={-1}>Tất cả ({totalItems})</option>
            </select>
          </div>
        </div>

        {/* Page navigation buttons */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPageClamped <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 flex items-center gap-1 font-medium shadow-2xs cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-2 font-bold text-slate-700">
              Trang {currentPageClamped} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPageClamped >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 flex items-center gap-1 font-medium shadow-2xs cursor-pointer transition-colors"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
