import React from 'react';
import { CameraAggregate } from '../types/camera';
import { formatDateVN } from '../data/cameraDataService';
import {
  X,
  Camera,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Wrench,
  CheckSquare2,
  Calendar,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

interface CameraDetailModalProps {
  camera: CameraAggregate | null;
  onClose: () => void;
  onViewLocation?: (data: { camera: string; site?: string; url: string }) => void;
}

export const CameraDetailModal: React.FC<CameraDetailModalProps> = ({
  camera,
  onClose,
  onViewLocation
}) => {
  if (!camera) return null;

  const isP1 = camera.priority === 'P1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1122]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#d8e2ef] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="p-5 border-b border-[#edf1f7] bg-[#f8fafc] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                isP1 ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
              }`}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#14213d] m-0">
                  Camera {camera.camera}
                </h3>
                {isP1 ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                    P1 — Ưu tiên cao
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    P2 — Theo dõi định kỳ
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748b] m-0 mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#19a78e]" />
                  <span className="font-semibold text-[#334155]">{camera.site}</span>
                </span>
                {camera.locationLink && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onViewLocation) {
                          onViewLocation({
                            camera: camera.camera,
                            site: camera.site,
                            url: camera.locationLink!
                          });
                        } else {
                          window.open(camera.locationLink, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Xem trực tiếp ảnh vị trí lắp đặt trên web"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3 text-blue-500 hover:text-white" />
                      <span>Xem ảnh vị trí lắp đặt</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 hover:bg-white" />
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#14213d] hover:bg-[#edf2f7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-[#64748b] block">
                Tổng lần bất ổn
              </span>
              <b className="text-xl font-black text-[#14213d] mt-1 block">
                {camera.count} lần
              </b>
            </div>

            <div className="bg-[#fee2e2]/40 border border-[#fca5a5]/40 p-3 rounded-xl">
              <span className="text-[11px] font-medium text-[#991b1b] block">
                Mất kết nối
              </span>
              <b className="text-xl font-black text-[#dc2626] mt-1 block">
                {camera.lost} lần
              </b>
            </div>

            <div className="bg-[#fef3c7]/40 border border-[#fcd34d]/40 p-3 rounded-xl">
              <span className="text-[11px] font-medium text-[#92400e] block">
                Chập chờn
              </span>
              <b className="text-xl font-black text-[#d97706] mt-1 block">
                {camera.unstable} lần
              </b>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-[#64748b] block">
                Ngày gần nhất
              </span>
              <b className="text-sm font-bold text-[#14213d] mt-1.5 block">
                {camera.last}
              </b>
            </div>
          </div>

          {/* Detailed Inspection Events Log */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2f6bff]" />
              Nhật ký kiểm tra chi tiết ({camera.records.length} lần ghi nhận)
            </h4>

            <div className="max-h-[220px] overflow-y-auto border border-[#e2e8f0] rounded-xl divide-y divide-[#f1f5f9]">
              {camera.records.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#94a3b8]">
                  Ghi nhận tổng hợp theo kỳ kiểm tra gần nhất ({camera.last})
                </div>
              ) : (
                camera.records.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 text-xs flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#334155] font-semibold">
                        {formatDateVN(r.date)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          r.status === 'Mất kết nối'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {r.locationLink && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewLocation) {
                              onViewLocation({
                                camera: camera.camera,
                                site: camera.site,
                                url: r.locationLink!
                              });
                            } else {
                              window.open(r.locationLink, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3 text-blue-500" />
                          <span>Xem vị trí</span>
                        </button>
                      )}
                      {r.evidence ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Có minh chứng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          Thiếu minh chứng
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Maintenance Recommendation Checklist */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
            <h4 className="text-xs font-bold text-[#166534] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5 text-[#16a34a]" />
              Quy trình xử lý & kiểm tra đề xuất
            </h4>
            <ul className="text-xs text-[#15803d] space-y-1.5 list-none p-0 m-0">
              <li className="flex items-start gap-2">
                <CheckSquare2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#16a34a]" />
                <span>
                  1. Kiểm tra nguồn cấp DC/PoE adapter, thay thế nguồn nếu có hiện tượng tụt áp.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#16a34a]" />
                <span>
                  2. Bấm lại đầu jack mạng RJ45 và đo thông mạch dây cáp LAN nối về switch cơ sở.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#16a34a]" />
                <span>
                  3. Đặt IP tĩnh (Static IP) và kiểm tra băng thông upload đường truyền internet tại {camera.site}.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#16a34a]" />
                <span>
                  4. Chụp ảnh nghiệm thu đối chiếu góc quay camera và ghi nhận biên bản hoàn tất xử lý.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="p-4 px-5 border-t border-[#edf1f7] bg-[#f8fafc] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2f6bff] hover:bg-[#2459d8] text-white transition-colors cursor-pointer"
          >
            Đóng thông tin
          </button>
        </footer>
      </div>
    </div>
  );
};
