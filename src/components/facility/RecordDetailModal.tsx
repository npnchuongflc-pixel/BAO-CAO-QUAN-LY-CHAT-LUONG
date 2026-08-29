import React, { useState } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode } from './facilityTypes';
import { CustomSelect } from './CustomSelect';
import { 
  X, 
  Building2, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Sparkles, 
  Save, 
  ExternalLink 
} from 'lucide-react';

interface RecordDetailModalProps {
  mode: ReportMode;
  record: HygieneReport | FacilityQualityReport | null;
  onClose: () => void;
  onUpdateRecord: (updatedRecord: HygieneReport | FacilityQualityReport) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  mode,
  record,
  onClose,
  onUpdateRecord,
}) => {
  if (!record) return null;

  const isHygiene = 'diemSo' in record;

  // Local state for editing response or record status
  const [editingPhanHoi, setEditingPhanHoi] = useState<string>(
    isHygiene ? (record as HygieneReport).phanHoi || '' : (record as FacilityQualityReport).deXuat || ''
  );
  const [editingFeedback, setEditingFeedback] = useState<string>(
    isHygiene ? (record as HygieneReport).feedbackNguoiDung || '' : ''
  );
  const [editingTrangThai, setEditingTrangThai] = useState<string>(
    isHygiene ? (record as HygieneReport).trangThai : (record as FacilityQualityReport).trangThaiGhiNhan
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = () => {
    if (isHygiene) {
      const updated: HygieneReport = {
        ...(record as HygieneReport),
        phanHoi: editingPhanHoi,
        feedbackNguoiDung: editingFeedback,
        trangThai: editingTrangThai,
      };
      onUpdateRecord(updated);
    } else {
      const updated: FacilityQualityReport = {
        ...(record as FacilityQualityReport),
        deXuat: editingPhanHoi,
        trangThaiGhiNhan: editingTrangThai,
      };
      onUpdateRecord(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 transform transition-all">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-blue-400 tracking-wider">
                {isHygiene ? 'Chi tiết Kiểm tra Vệ sinh' : 'Chi tiết Chất lượng Cơ sở'}
              </span>
              <h3 className="text-lg font-bold text-white">
                {record.coSo} - {record.khuVuc}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Ngày kiểm tra</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {record.ngay}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Thời gian</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {record.gio}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">
                {isHygiene ? 'Người kiểm tra' : 'Người ghi nhận'}
              </span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {isHygiene ? (record as HygieneReport).nguoiKiemTra : (record as FacilityQualityReport).ten}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Khu vực</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {record.khuVuc}
              </span>
            </div>
          </div>

          {/* Photo Preview Card */}
          {record.linkAnh && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Hình Ảnh Bằng Chứng Kiểm Tra
              </label>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img
                  src={record.linkAnh}
                  alt="Ảnh kiểm tra"
                  className="w-full max-h-72 object-cover"
                />
                <a
                  href={record.linkAnh}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 backdrop-blur-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở ảnh kích thước gốc</span>
                </a>
              </div>
            </div>
          )}

          {/* Findings & Score */}
          {isHygiene ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 uppercase">Chi Tiết Đánh Giá Vệ Sinh</span>
                  <span className="text-base font-black text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200">
                    Điểm số: {(record as HygieneReport).diemSo}/{(record as HygieneReport).diemSoMax || 100}
                  </span>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {(record as HygieneReport).chiTiet}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 uppercase">Ghi Nhận Chất Lượng Cơ Sở</span>
                  <span className="text-xs font-bold text-indigo-800 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                    Mức độ: {(record as FacilityQualityReport).mucDo}
                  </span>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {(record as FacilityQualityReport).deXuat}
                </p>
              </div>
            </div>
          )}

          {/* Editable Status & Response Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Cập Nhật Trạng Thái & Phản Hồi Xử Lý</span>
            </h4>

            {/* Change Status Dropdown */}
            <div>
              <CustomSelect
                label={isHygiene ? 'Thay đổi trạng thái vệ sinh' : 'Thay đổi trạng thái ghi nhận xử lý'}
                value={editingTrangThai}
                onChange={(val) => setEditingTrangThai(val)}
                options={
                  isHygiene
                    ? [
                        { value: 'Đạt', label: 'Đạt' },
                        { value: 'Cần khắc phục', label: 'Cần khắc phục' },
                        { value: 'Không đạt', label: 'Không đạt' },
                      ]
                    : [
                        { value: 'Chờ tiếp nhận', label: 'Chờ tiếp nhận' },
                        { value: 'Đang xử lý', label: 'Đang xử lý' },
                        { value: 'Đã xử lý', label: 'Đã xử lý' },
                      ]
                }
              />
            </div>

            {/* Response/Proposal text area */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isHygiene ? 'Phản hồi từ bộ phận quản lý/vệ sinh' : 'Đề xuất phương án xử lý'}
              </label>
              <textarea
                rows={3}
                value={editingPhanHoi}
                onChange={(e) => setEditingPhanHoi(e.target.value)}
                placeholder="Nhập nội dung phản hồi hoặc phương án khắc phục..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Feedback from users (Hygiene only) */}
            {isHygiene && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  <span>Feedback từ người dùng / khách hàng</span>
                </label>
                <input
                  type="text"
                  value={editingFeedback}
                  onChange={(e) => setEditingFeedback(e.target.value)}
                  placeholder="Ghi nhận ý kiến trực tiếp của khách..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isSaved && (
              <span className="text-emerald-600 font-bold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu thay đổi thành công!
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thông Tin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
