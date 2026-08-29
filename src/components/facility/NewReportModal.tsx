import React, { useState } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode } from './facilityTypes';
import { FACILITY_LIST } from '../../data/mockData';
import { 
  X, 
  Building2, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface NewReportModalProps {
  mode: ReportMode;
  onClose: () => void;
  onAddHygieneReport: (report: HygieneReport) => void;
  onAddQualityReport: (report: FacilityQualityReport) => void;
  initialFacility?: string;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  mode,
  onClose,
  onAddHygieneReport,
  onAddQualityReport,
  initialFacility,
}) => {
  const isHygiene = mode === 'hygiene';

  // Common Fields
  const [coSo, setCoSo] = useState<string>(initialFacility || FACILITY_LIST[0]);
  const [customCoSo, setCustomCoSo] = useState<string>('');
  const [khuVuc, setKhuVuc] = useState<string>('Khu vực Bếp & Chế biến');
  const [ngay, setNgay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gio, setGio] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [nguoiKiemTra, setNguoiKiemTra] = useState<string>('');
  const [linkAnh, setLinkAnh] = useState<string>('');

  // Hygiene Specific
  const [trangThai, setTrangThai] = useState<string>('Đạt');
  const [diemSo, setDiemSo] = useState<number>(90);
  const [chiTiet, setChiTiet] = useState<string>('');
  const [phanHoi, setPhanHoi] = useState<string>('');
  const [feedbackNguoiDung, setFeedbackNguoiDung] = useState<string>('');

  // Quality Specific
  const [mucDo, setMucDo] = useState<string>('Bình thường');
  const [trangThaiGhiNhan, setTrangThaiGhiNhan] = useState<string>('Chờ tiếp nhận');
  const [deXuat, setDeXuat] = useState<string>('');

  const sampleImages = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCoSo = coSo === 'other' ? customCoSo || 'Cơ sở mới' : coSo;
    const finalImage = linkAnh.trim() || sampleImages[Math.floor(Math.random() * sampleImages.length)];
    const id = `${isHygiene ? 'hyg' : 'qual'}-${Date.now()}`;

    if (isHygiene) {
      const newReport: HygieneReport = {
        id,
        ngay,
        gio,
        nguoiKiemTra: nguoiKiemTra.trim() || 'Người kiểm tra viên',
        coSo: finalCoSo,
        khuVuc,
        trangThai,
        diemSo: Number(diemSo),
        diemSoMax: 100,
        chiTiet: chiTiet.trim() || 'Đã kiểm tra đạt yêu cầu vệ sinh theo quy định.',
        phanHoi: phanHoi.trim(),
        feedbackNguoiDung: feedbackNguoiDung.trim(),
        linkAnh: finalImage,
      };
      onAddHygieneReport(newReport);
    } else {
      const newReport: FacilityQualityReport = {
        id,
        ngay,
        gio,
        ten: nguoiKiemTra.trim() || 'Người ghi nhận',
        coSo: finalCoSo,
        khuVuc,
        mucDo,
        trangThaiGhiNhan,
        deXuat: deXuat.trim() || 'Kiểm tra và khắc phục sự cố kỹ thuật cơ sở.',
        linkAnh: finalImage,
      };
      onAddQualityReport(newReport);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8 transform transition-all">
        {/* Header */}
        <div className="bg-slate-50 text-slate-900 p-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                {isHygiene ? 'Tạo Báo Cáo Kiểm Tra Vệ Sinh' : 'Tạo Báo Cáo Chất Lượng Cơ Sở'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ghi nhận tình trạng thực tế tại cơ sở và gửi báo cáo vào hệ thống
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs custom-scrollbar">
          {/* Row 1: Cơ sở & Khu vực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Cơ sở kiểm tra *
              </label>
              <select
                value={coSo}
                onChange={(e) => setCoSo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                {FACILITY_LIST.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="other">+ Nhập cơ sở khác...</option>
              </select>
              {coSo === 'other' && (
                <input
                  type="text"
                  placeholder="Nhập tên cơ sở mới..."
                  value={customCoSo}
                  onChange={(e) => setCustomCoSo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 mt-2 font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Khu vực cụ thể *
              </label>
              <input
                type="text"
                placeholder="VD: Sảnh chính, Bếp, Nhà vệ sinh..."
                value={khuVuc}
                onChange={(e) => setKhuVuc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* Row 2: Ngày giờ & Người kiểm tra */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Ngày
              </label>
              <input
                type="date"
                value={ngay}
                onChange={(e) => setNgay(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Giờ
              </label>
              <input
                type="time"
                value={gio}
                onChange={(e) => setGio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {isHygiene ? 'Người kiểm tra' : 'Người báo cáo'}
              </label>
              <input
                type="text"
                placeholder="Họ và tên..."
                value={nguoiKiemTra}
                onChange={(e) => setNguoiKiemTra(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Hygiene Specific Form Inputs */}
          {isHygiene ? (
            <>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Trạng Thái Kiểm Tra</label>
                  <select
                    value={trangThai}
                    onChange={(e) => setTrangThai(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Đạt">Đạt</option>
                    <option value="Cần khắc phục">Cần khắc phục</option>
                    <option value="Không đạt">Không đạt (Cảnh báo)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Điểm Số Vệ Sinh (0 - 100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={diemSo}
                    onChange={(e) => setDiemSo(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold font-mono text-slate-800 text-center focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô Tả Chi Tiết Vệ Sinh *</label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ tình trạng thực tế (sàn, bề mặt, rác thừa, mùi hôi...)..."
                  value={chiTiet}
                  onChange={(e) => setChiTiet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phản hồi đơn vị (nếu có)</label>
                  <input
                    type="text"
                    placeholder="Phương án xử lý nhanh..."
                    value={phanHoi}
                    onChange={(e) => setPhanHoi(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Feedback từ người dùng</label>
                  <input
                    type="text"
                    placeholder="Ý kiến trực tiếp từ khách..."
                    value={feedbackNguoiDung}
                    onChange={(e) => setFeedbackNguoiDung(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Quality Specific Inputs */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Mức Độ Sự Cố</label>
                  <select
                    value={mucDo}
                    onChange={(e) => setMucDo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Bình thường">Bình thường</option>
                    <option value="Cần chú ý">Cần chú ý</option>
                    <option value="Nghiêm trọng">Nghiêm trọng (Cảnh báo đỏ)</option>
                    <option value="Khẩn cấp">Khẩn cấp (Cảnh báo đỏ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Trạng Thái Ghi Nhận</label>
                  <select
                    value={trangThaiGhiNhan}
                    onChange={(e) => setTrangThaiGhiNhan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã xử lý">Đã xử lý</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đề Xuất & Mô Tả Sự Cố Cơ Sở *</label>
                <textarea
                  rows={3}
                  placeholder="Nêu chi tiết hư hỏng, tình trạng cơ sở vật chất và đề xuất phương án bảo trì..."
                  value={deXuat}
                  onChange={(e) => setDeXuat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>
            </>
          )}

          {/* Link ảnh */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              Link Ảnh Thực Tế (Hoặc dán URL)
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={linkAnh}
              onChange={(e) => setLinkAnh(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500 font-medium">Hoặc chọn ảnh mẫu:</span>
              <div className="flex gap-1 overflow-x-auto py-1">
                {sampleImages.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLinkAnh(s)}
                    className={`w-8 h-8 rounded-lg border overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                      linkAnh === s ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={s} alt="sample" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
            >
              Lưu & Gửi Báo Cáo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
