import React, { useState } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode } from './facilityTypes';
import { 
  Building2, 
  User, 
  MapPin, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  MessageSquare
} from 'lucide-react';

interface DetailTableProps {
  mode: ReportMode;
  hygieneReports: HygieneReport[];
  qualityReports: FacilityQualityReport[];
  onSelectRecord: (record: HygieneReport | FacilityQualityReport) => void;
  onOpenImageModal: (imageUrl: string, title: string) => void;
}

export const DetailTable: React.FC<DetailTableProps> = ({
  mode,
  hygieneReports,
  qualityReports,
  onSelectRecord,
  onOpenImageModal,
}) => {
  const isHygiene = mode === 'hygiene';

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;


  // Sorting state
  const [sortField, setSortField] = useState<string>('ngay');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort Hygiene Reports
  const sortedHygiene = [...hygieneReports].sort((a, b) => {
    let valA = (a as any)[sortField] || '';
    let valB = (b as any)[sortField] || '';
    if (sortField === 'ngay') {
      valA = `${a.ngay} ${a.gio}`;
      valB = `${b.ngay} ${b.gio}`;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Sort Quality Reports
  const sortedQuality = [...qualityReports].sort((a, b) => {
    let valA = (a as any)[sortField] || '';
    let valB = (b as any)[sortField] || '';
    if (sortField === 'ngay') {
      valA = `${a.ngay} ${a.gio}`;
      valB = `${b.ngay} ${b.gio}`;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalItems = isHygiene ? sortedHygiene.length : sortedQuality.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedHygiene = sortedHygiene.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const paginatedQuality = sortedQuality.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Status Badge Helper for Hygiene
  const renderHygieneStatus = (status: string) => {
    switch (status) {
      case 'Đạt':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đạt
          </span>
        );
      case 'Không đạt':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Không đạt
          </span>
        );
      case 'Cần khắc phục':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Cần khắc phục
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  // Severity & Status Badge Helper for Quality
  const renderQualitySeverity = (severity: string) => {
    switch (severity) {
      case 'Khẩn cấp':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Khẩn cấp
          </span>
        );
      case 'Nghiêm trọng':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Nghiêm trọng
          </span>
        );
      case 'Cần chú ý':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            Cần chú ý
          </span>
        );
      case 'Bình thường':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
            Bình thường
          </span>
        );
    }
  };

  const renderQualityStatus = (status: string) => {
    switch (status) {
      case 'Đã xử lý':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã xử lý
          </span>
        );
      case 'Đang xử lý':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
            <Clock className="w-3 h-3 text-blue-600" />
            Đang xử lý
          </span>
        );
      case 'Chờ tiếp nhận':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
            Chờ tiếp nhận
          </span>
        );
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      {/* Table Section Header */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>DANH SÁCH BÁO CÁO CHI TIẾT</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
              {isHygiene ? 'Chế độ Vệ Sinh' : 'Chế độ Chất Lượng Cơ Sở'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Bấm vào hàng bất kỳ để mở xem đầy đủ thông tin chi tiết, ảnh chụp và phản hồi
          </p>
        </div>

        {/* Total Page Info */}
        <div className="text-xs text-slate-600 font-medium">
          Hiển thị <strong>{totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}</strong> -{' '}
          <strong>{Math.min(safeCurrentPage * pageSize, totalItems)}</strong> trong tổng số <strong>{totalItems}</strong> nhật ký
        </div>
      </div>


      {/* Main Table */}
      {totalItems === 0 ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Building2 className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Không tìm thấy báo cáo nào</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Không có nhật ký phù hợp với từ khóa hoặc bộ lọc đã chọn. Hãy thử thay đổi bộ lọc hoặc xóa lọc.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* TABLE HEADERS */}
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              {isHygiene ? (
                <tr>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('ngay')}>
                    <div className="flex items-center gap-1">
                      <span>Thời Gian</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('coSo')}>
                    <div className="flex items-center gap-1">
                      <span>Cơ Sở & Khu Vực</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Người Kiểm Tra</th>
                  <th className="py-3.5 px-4 text-center">Điểm Số</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 max-w-xs">Chi Tiết Kiểm Tra</th>
                  <th className="py-3.5 px-4">Phản Hồi / Feedback</th>
                  <th className="py-3.5 px-4 text-center">Hình Ảnh</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('ngay')}>
                    <div className="flex items-center gap-1">
                      <span>Thời Gian</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('coSo')}>
                    <div className="flex items-center gap-1">
                      <span>Cơ Sở & Khu Vực</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Người Ghi Nhận</th>
                  <th className="py-3.5 px-4 text-center">Mức Độ</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái Xử Lý</th>
                  <th className="py-3.5 px-4 max-w-xs">Đề Xuất & Khắc Phục</th>
                  <th className="py-3.5 px-4 text-center">Hình Ảnh</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              )}
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {isHygiene ? (
                paginatedHygiene.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    {/* Ngày giờ */}
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap text-slate-900">
                      <div className="font-semibold text-slate-900">{row.ngay}</div>
                      <div className="text-[11px] text-slate-500">{row.gio}</div>
                    </td>

                    {/* Cơ sở & Khu vực */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>{row.coSo}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <span>{row.khuVuc}</span>
                      </div>
                    </td>

                    {/* Người kiểm tra */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.nguoiKiemTra}</span>
                      </div>
                    </td>

                    {/* Điểm số */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block font-black text-sm px-2.5 py-0.5 rounded-lg ${
                        row.diemSo >= 85 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : row.diemSo >= 70 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {row.diemSo} <span className="text-[10px] font-normal text-slate-500">pt</span>
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderHygieneStatus(row.trangThai)}
                    </td>

                    {/* Chi tiết */}
                    <td className="py-3.5 px-4 min-w-[220px] max-w-md">
                      <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-wrap break-words">
                        {row.chiTiet}
                      </p>
                    </td>

                    {/* Phản hồi & Feedback */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {row.phanHoi && (
                        <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 mb-1">
                          <span className="font-semibold text-blue-700">Đơn vị:</span> {row.phanHoi}
                        </div>
                      )}
                      {row.feedbackNguoiDung && (
                        <div className="text-[11px] text-amber-800 bg-amber-50/80 p-1.5 rounded border border-amber-200/80 flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{row.feedbackNguoiDung}</span>
                        </div>
                      )}
                      {!row.phanHoi && !row.feedbackNguoiDung && (
                        <span className="text-slate-400 italic text-[11px]">Chưa có phản hồi</span>
                      )}
                    </td>

                    {/* Link ảnh Thumbnail */}
                    <td className="py-3.5 px-4 text-center">
                      {row.linkAnh ? (
                        <button
                          onClick={() => onOpenImageModal(row.linkAnh, `Ảnh Vệ Sinh - ${row.coSo} (${row.ngay})`)}
                          className="relative group/img inline-block overflow-hidden rounded-lg border border-slate-200 hover:border-blue-500 transition-all shadow-xs"
                        >
                          <img
                            src={row.linkAnh}
                            alt="Ảnh kiểm tra"
                            className="w-12 h-12 object-cover group-hover/img:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">Không ảnh</span>
                      )}
                    </td>


                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectRecord(row)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                paginatedQuality.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    {/* Ngày giờ */}
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap text-slate-900">
                      <div className="font-semibold text-slate-900">{row.ngay}</div>
                      <div className="text-[11px] text-slate-500">{row.gio}</div>
                    </td>

                    {/* Cơ sở & Khu vực */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span>{row.coSo}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <span>{row.khuVuc}</span>
                      </div>
                    </td>

                    {/* Tên người ghi nhận */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.ten}</span>
                      </div>
                    </td>

                    {/* Mức độ */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderQualitySeverity(row.mucDo)}
                    </td>

                    {/* Trạng thái ghi nhận */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderQualityStatus(row.trangThaiGhiNhan)}
                    </td>

                    {/* Đề xuất */}
                    <td className="py-3.5 px-4 min-w-[220px] max-w-md">
                      <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-wrap break-words">
                        {row.deXuat}
                      </p>
                    </td>

                    {/* Link ảnh */}
                    <td className="py-3.5 px-4 text-center">
                      {row.linkAnh ? (
                        <button
                          onClick={() => onOpenImageModal(row.linkAnh, `Sự cố cơ sở - ${row.coSo} (${row.ngay})`)}
                          className="relative group/img inline-block overflow-hidden rounded-lg border border-slate-200 hover:border-indigo-500 transition-all shadow-xs"
                        >
                          <img
                            src={row.linkAnh}
                            alt="Ảnh sự cố cơ sở"
                            className="w-12 h-12 object-cover group-hover/img:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">Không ảnh</span>
                      )}
                    </td>


                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectRecord(row)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Trang <strong>{safeCurrentPage}</strong> / <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trước</span>
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              if (
                pNum === 1 || 
                pNum === totalPages || 
                (pNum >= safeCurrentPage - 1 && pNum <= safeCurrentPage + 1)
              ) {
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      pNum === safeCurrentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              }
              if (
                pNum === safeCurrentPage - 2 || 
                pNum === safeCurrentPage + 2
              ) {
                return <span key={pNum} className="px-1 text-slate-400">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
