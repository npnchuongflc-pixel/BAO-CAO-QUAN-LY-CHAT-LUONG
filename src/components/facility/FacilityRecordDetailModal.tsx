import React from 'react';
import { X, Calendar, Clock, MapPin, Building2, User, Award, AlertTriangle, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { ReportMode, HygieneReport, FacilityQualityReport } from './facilityTypes';

interface FacilityRecordDetailModalProps {
  mode: ReportMode;
  record: HygieneReport | FacilityQualityReport;
  onClose: () => void;
  onUpdateRecord?: (updated: HygieneReport | FacilityQualityReport) => void;
}

export const FacilityRecordDetailModal: React.FC<FacilityRecordDetailModalProps> = ({
  mode,
  record,
  onClose,
}) => {
  const isHygiene = 'diemSo' in record;
  const hyg = isHygiene ? (record as HygieneReport) : null;
  const qual = !isHygiene ? (record as FacilityQualityReport) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs px-5 py-4 border-b border-slate-200 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                Chi Tiết Biên Bản Đánh Giá
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isHygiene ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {isHygiene ? 'Báo cáo Vệ sinh' : 'Chất lượng Cơ sở'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{record.coSo} • {record.khuVuc}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Top Quick Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block">NGÀY THỰC HIỆN</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {record.ngay}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block">GIỜ KIỂM TRA</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                {record.gio || '08:00'}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block">NGƯỜI KIỂM TRA</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {isHygiene ? hyg?.nguoiKiemTra : qual?.ten}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block">
                {isHygiene ? 'ĐIỂM SỐ' : 'MỨC ĐỘ'}
              </span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                {isHygiene ? (
                  <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                    (hyg?.diemSo || 0) >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hyg?.diemSo} / 100 đ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-black text-xs bg-rose-100 text-rose-800">
                    {qual?.mucDo}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Details Content */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                {isHygiene ? 'Nội dung chi tiết kiểm tra 5S' : 'Mô tả tình trạng & Đề xuất xử lý'}
              </span>
              <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                {isHygiene ? hyg?.chiTiet : qual?.deXuat}
              </p>
            </div>

            {isHygiene && hyg?.phanHoi && (
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Phản hồi từ cơ sở
                </span>
                <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  {hyg.phanHoi}
                </p>
              </div>
            )}

            {isHygiene && hyg?.feedbackNguoiDung && (
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Ý kiến / Phản hồi của học viên &amp; phụ huynh
                </span>
                <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  {hyg.feedbackNguoiDung}
                </p>
              </div>
            )}
          </div>

          {/* Image Evidence */}
          {record.linkAnh && (
            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-2">
                Hình ảnh đính kèm
              </span>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-72">
                <img
                  src={record.linkAnh}
                  alt="Ảnh kiểm tra"
                  className="max-h-72 w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
