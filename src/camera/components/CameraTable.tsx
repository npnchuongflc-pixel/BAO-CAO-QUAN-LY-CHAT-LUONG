import React, { useState, useMemo } from 'react';
import { CameraAggregate, PriorityLevel } from '../types/camera';
import { formatNumberVN } from '../data/cameraDataService';
import {
  ListFilter,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowUpDown,
  Search,
  Eye,
  Camera,
  ExternalLink,
  MapPin
} from 'lucide-react';

interface CameraTableProps {
  cameras: CameraAggregate[];
  onSelectCamera: (cam: CameraAggregate) => void;
  onViewLocation?: (data: { camera: string; site?: string; url: string }) => void;
}

export const CameraTable: React.FC<CameraTableProps> = ({
  cameras,
  onSelectCamera,
  onViewLocation
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'P1' | 'P2' | 'noEvidence'>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState<'count' | 'priority' | 'camera' | 'site'>('priority');
  const [sortAsc, setSortAsc] = useState(false);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredCameras = useMemo(() => {
    return cameras.filter((c) => {
      if (priorityFilter === 'P1' && c.priority !== 'P1') return false;
      if (priorityFilter === 'P2' && c.priority !== 'P2') return false;
      if (priorityFilter === 'noEvidence' && c.evidence) return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchCam = c.camera.toLowerCase().includes(q);
        const matchSite = c.site.toLowerCase().includes(q);
        const matchOwner = c.owner.toLowerCase().includes(q);
        if (!matchCam && !matchSite && !matchOwner) return false;
      }
      return true;
    });
  }, [cameras, priorityFilter, tableSearch]);

  const sortedCameras = useMemo(() => {
    return [...filteredCameras].sort((a, b) => {
      let diff = 0;
      if (sortField === 'count') {
        diff = a.count - b.count;
      } else if (sortField === 'priority') {
        // P1 first
        const pA = a.priority === 'P1' ? 2 : 1;
        const pB = b.priority === 'P1' ? 2 : 1;
        diff = pA - pB;
        if (diff === 0) diff = a.count - b.count;
      } else if (sortField === 'camera') {
        diff = a.camera.localeCompare(b.camera, 'vi');
      } else if (sortField === 'site') {
        diff = a.site.localeCompare(b.site, 'vi');
      }
      return sortAsc ? diff : -diff;
    });
  }, [filteredCameras, sortField, sortAsc]);

  const maxRecurrence = Math.max(...cameras.map((c) => c.count), 1);

  // Pagination
  const totalItems = sortedCameras.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageItems = sortedCameras.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: 'count' | 'priority' | 'camera' | 'site') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <article className="bg-white border border-[#e2e8f2] rounded-2xl shadow-[0_8px_30px_rgba(24,46,88,0.06)] overflow-hidden mb-8 transition-all">
      {/* Table Header toolbar */}
      <header className="p-4 sm:p-5 pb-4 border-b border-[#edf0f6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#14213d] flex items-center gap-2 m-0">
              <Camera className="w-4 h-4 text-[#2f6bff]" />
              Danh sách camera cần theo dõi & xử lý
            </h2>
            <span className="text-xs font-bold text-[#2459d8] bg-[#edf3ff] px-2.5 py-0.5 rounded-full border border-[#dbe7ff]">
              {cameras.length} camera
            </span>
          </div>
          <p className="text-xs text-[#6b7890] mt-1 m-0">
            Ưu tiên theo số lần bất ổn và mức độ nghiêm trọng
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick tab filters */}
          <div className="inline-flex p-1 bg-[#f1f4f9] rounded-lg text-xs font-medium">
            <button
              onClick={() => { setPriorityFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                priorityFilter === 'all'
                  ? 'bg-white text-[#14213d] font-bold shadow-xs'
                  : 'text-[#62718c] hover:text-[#14213d]'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => { setPriorityFilter('P1'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                priorityFilter === 'P1'
                  ? 'bg-red-50 text-red-700 font-bold shadow-xs'
                  : 'text-[#62718c] hover:text-red-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
              P1 (Khẩn)
            </button>
            <button
              onClick={() => { setPriorityFilter('P2'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                priorityFilter === 'P2'
                  ? 'bg-amber-50 text-amber-800 font-bold shadow-xs'
                  : 'text-[#62718c] hover:text-amber-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              P2 (Theo dõi)
            </button>
            <button
              onClick={() => { setPriorityFilter('noEvidence'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                priorityFilter === 'noEvidence'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-[#62718c] hover:text-rose-600'
              }`}
            >
              Thiếu minh chứng
            </button>
          </div>

          {/* Search within table */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8a96aa] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Lọc camera, cơ sở..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 pr-2.5 text-xs bg-[#f8fafc] border border-[#e2e8f2] rounded-lg outline-none focus:border-[#2f6bff] focus:bg-white transition-all w-[150px] sm:w-[190px]"
            />
          </div>
        </div>
      </header>

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] text-[#5e6d87] border-b border-[#e9eef5] select-none font-semibold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => toggleSort('priority')}
                className="py-3 px-4 cursor-pointer hover:text-[#14213d] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Mức ưu tiên</span>
                  <ArrowUpDown className="w-3 h-3 text-[#94a3b8]" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('site')}
                className="py-3 px-4 cursor-pointer hover:text-[#14213d] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Cơ sở</span>
                  <ArrowUpDown className="w-3 h-3 text-[#94a3b8]" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('camera')}
                className="py-3 px-4 cursor-pointer hover:text-[#14213d] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Mã Camera</span>
                  <ArrowUpDown className="w-3 h-3 text-[#94a3b8]" />
                </div>
              </th>
              <th className="py-3 px-4">Tình trạng gần nhất</th>
              <th
                onClick={() => toggleSort('count')}
                className="py-3 px-4 cursor-pointer hover:text-[#14213d] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Số lần tái diễn</span>
                  <ArrowUpDown className="w-3 h-3 text-[#94a3b8]" />
                </div>
              </th>
              <th className="py-3 px-4">Ngày gần nhất</th>
              <th className="py-3 px-4 text-center">Minh chứng</th>
              <th className="py-3 px-4 text-center">Vị trí</th>
              <th className="py-3 px-4 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f7]">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#8290a5]">
                  <Camera className="w-8 h-8 mx-auto text-[#cbd5e1] mb-2" />
                  <p className="font-semibold text-sm text-[#475569] mb-1">
                    Không tìm thấy camera phù hợp
                  </p>
                  <p className="text-xs">
                    Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt tiêu chí lọc.
                  </p>
                </td>
              </tr>
            ) : (
              pageItems.map((cam) => {
                const isP1 = cam.priority === 'P1';
                const isLost = cam.status === 'Mất kết nối';

                return (
                  <tr
                    key={cam.camera}
                    onClick={() => onSelectCamera(cam)}
                    className="hover:bg-[#f8faff] transition-colors cursor-pointer group"
                  >
                    {/* Priority badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isP1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
                          P1 (Khẩn)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fcd34d]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                          P2 (Theo dõi)
                        </span>
                      )}
                    </td>

                    {/* Site */}
                    <td className="py-3 px-4 font-semibold text-[#1e293b] whitespace-nowrap">
                      {cam.site}
                    </td>

                    {/* Camera Code */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-[#14213d] bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0]">
                        {cam.camera}
                      </span>
                    </td>

                    {/* Latest Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-medium text-xs ${
                          isLost
                            ? 'bg-[#fee2e2] text-[#991b1b]'
                            : 'bg-[#fef3c7] text-[#92400e]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLost ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                          }`}
                        />
                        {cam.status}
                      </span>
                    </td>

                    {/* Recurrence count with mini progress bar */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-black text-[#14213d] min-w-[28px]">
                          {cam.count}
                        </b>
                        <span className="text-[#8492a6] text-[11px]">lần</span>
                        <div className="w-16 h-1.5 bg-[#edf1f7] rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              isP1 ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                            }`}
                            style={{
                              width: `${Math.min(100, (cam.count / maxRecurrence) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Latest date */}
                    <td className="py-3 px-4 text-[#475569] whitespace-nowrap font-medium">
                      {cam.last}
                    </td>

                    {/* Evidence */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {cam.evidence ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Có
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Thiếu
                        </span>
                      )}
                    </td>

                    {/* Location Link (Link mô tả vị trí) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {cam.locationLink ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewLocation) {
                              onViewLocation({
                                camera: cam.camera,
                                site: cam.site,
                                url: cam.locationLink!
                              });
                            } else {
                              window.open(cam.locationLink, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          title="Bấm để xem trực tiếp ảnh vị trí camera trên web"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors shadow-2xs group/loc cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 text-blue-500 group-hover/loc:text-white" />
                          <span>Vị trí</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover/loc:bg-white flex-shrink-0" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8] italic">—</span>
                      )}
                    </td>

                    {/* View details */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="p-1 rounded-md text-[#94a3b8] group-hover:text-[#2f6bff] group-hover:bg-[#edf3ff] transition-colors cursor-pointer"
                        title="Xem nhật ký kiểm tra"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <footer className="p-3.5 px-5 border-t border-[#edf1f7] bg-[#fbfcfd] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
          <div>
            Hiển thị{' '}
            <b className="text-[#14213d]">
              {(currentPage - 1) * pageSize + 1}
            </b>{' '}
            –{' '}
            <b className="text-[#14213d]">
              {Math.min(currentPage * pageSize, totalItems)}
            </b>{' '}
            trên tổng số <b className="text-[#14213d]">{totalItems}</b> camera
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-[#e2e8f0] bg-white text-[#475569] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f1f5f9] transition-colors cursor-pointer font-medium"
            >
              Trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-7 h-7 rounded text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pg
                    ? 'bg-[#2f6bff] text-white shadow-xs'
                    : 'bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-[#e2e8f0] bg-white text-[#475569] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f1f5f9] transition-colors cursor-pointer font-medium"
            >
              Sau
            </button>
          </div>
        </footer>
      )}
    </article>
  );
};
