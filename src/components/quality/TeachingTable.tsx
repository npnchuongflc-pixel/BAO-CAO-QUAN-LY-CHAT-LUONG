import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Flame,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Clock,
  Filter
} from 'lucide-react';
import { TeachingAuditItem } from '../../types';

interface TeachingTableProps {
  items: TeachingAuditItem[];
  onSelectItem: (item: TeachingAuditItem) => void;
  onOpenEvidence: (imageUrl: string, title: string) => void;
}

export const TeachingTable: React.FC<TeachingTableProps> = ({
  items,
  onSelectItem,
  onOpenEvidence,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [tableSearch, setTableSearch] = useState('');
  const [quickTab, setQuickTab] = useState<'all' | 'violations' | 'severe' | 'pending'>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (quickTab === 'violations' && item.result !== 'Vi phạm') return false;
      if (quickTab === 'severe' && !item.isSevere) return false;
      if (quickTab === 'pending' && (item.result !== 'Vi phạm' || item.status === 'Đã xử lý')) return false;

      // Table search
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const match =
          item.teacherName.toLowerCase().includes(q) ||
          item.facility.toLowerCase().includes(q) ||
          item.violationName.toLowerCase().includes(q) ||
          item.violationCategory.toLowerCase().includes(q) ||
          item.evaluatorNote.toLowerCase().includes(q) ||
          item.detailedViolation.toLowerCase().includes(q) ||
          item.evaluator.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [items, quickTab, tableSearch]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleTabChange = (tab: typeof quickTab) => {
    setQuickTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="card panel p-5 border border-slate-200/80 shadow-sm bg-white">
      {/* Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Nhật Ký Đánh Giá Giảng Dạy &amp; Minh Chứng Xử Lý
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu ghi nhận từ camera giám sát, biên bản kiểm định và liên kết ảnh chụp minh chứng
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              quickTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => handleTabChange('all')}
          >
            Tất cả ({items.length.toLocaleString('vi-VN')})
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              quickTab === 'violations'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => handleTabChange('violations')}
          >
            <AlertTriangle className="w-3 h-3" />
            Ca Vi Phạm ({items.filter((i) => i.result === 'Vi phạm').length})
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              quickTab === 'severe'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => handleTabChange('severe')}
          >
            <Flame className="w-3 h-3" />
            Nghiêm trọng ({items.filter((i) => i.isSevere).length})
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              quickTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => handleTabChange('pending')}
          >
            Chưa xử lý
          </button>
        </div>
      </div>

      {/* Search & Page Size */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo GV, cơ sở, lỗi, ghi chú CTV..."
            value={tableSearch}
            onChange={(e) => {
              setTableSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Hiển thị:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            <option value={15}>15 dòng / trang</option>
            <option value={25}>25 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
            <option value={100}>100 dòng / trang</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Thời gian</th>
              <th className="py-2.5 px-3">Cơ sở</th>
              <th className="py-2.5 px-3">Giáo viên</th>
              <th className="py-2.5 px-2">Bậc</th>
              <th className="py-2.5 px-2">Môn</th>
              <th className="py-2.5 px-2">Ca</th>
              <th className="py-2.5 px-2 text-center">Kết quả</th>
              <th className="py-2.5 px-3">Lỗi &amp; Mô tả chi tiết</th>
              <th className="py-2.5 px-2 text-center">Minh chứng</th>
              <th className="py-2.5 px-3 text-center">Trạng thái xử lý</th>
              <th className="py-2.5 px-2 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((item) => {
              const isViolation = item.result === 'Vi phạm';
              const hasEvidence = !!item.evidenceImage && item.evidenceImage.startsWith('http');

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isSevere ? 'bg-rose-50/30' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{item.dateStr || 'Chưa rõ'}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.dayOfWeek} • {item.startTime}-{item.endTime}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {item.facility}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{item.teacherName}</div>
                    <div className="text-[10px] text-slate-400">ĐG: {item.evaluator}</div>
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{item.teacherRank}</td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.subject === 'Cờ'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {item.subject}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 font-semibold">{item.shiftCount} ca</td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        isViolation
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {item.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-[260px]">
                    {isViolation ? (
                      <div>
                        <div className="font-bold text-rose-700 flex items-center gap-1">
                          {item.isSevere && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-rose-600 text-white font-black animate-pulse">
                              NGHIÊM TRỌNG
                            </span>
                          )}
                          {item.violationName || item.violationCategory}
                        </div>
                        {item.evaluatorNote && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 italic">
                            "{item.evaluatorNote}"
                          </p>
                        )}
                        {item.detailedViolation && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            Chi tiết: {item.detailedViolation}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Đạt chuẩn 6 tiêu chí</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {hasEvidence ? (
                      <button
                        type="button"
                        onClick={() => onOpenEvidence(item.evidenceImage, `Minh chứng ca dạy - ${item.teacherName} (${item.dateStr})`)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        title="Xem ảnh minh chứng vi phạm trên Drive"
                      >
                        <ImageIcon className="w-3 h-3 text-blue-600" />
                        Xem ảnh
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-block ${
                        item.status === 'Đã xử lý'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                          : item.status === 'Chưa xử lý'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                          : item.status === 'Xác nhận lại'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.resolutionDateStr && (
                      <div className="text-[9px] text-slate-400 mt-0.5">{item.resolutionDateStr}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Xem toàn bộ thông tin 6 tiêu chí ca dạy này"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  Không tìm thấy ca kiểm định nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          Hiển thị <strong>{Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)}</strong> -{' '}
          <strong>{Math.min(filteredItems.length, currentPage * pageSize)}</strong> trên tổng số{' '}
          <strong>{filteredItems.length.toLocaleString('vi-VN')}</strong> bản ghi
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-700 font-semibold px-2">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
