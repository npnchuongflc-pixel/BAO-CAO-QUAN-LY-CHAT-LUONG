import React from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  Building,
  Clock,
  Shirt,
  Users,
  ArrowLeftRight,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Flame,
  Mail,
  UserCheck
} from 'lucide-react';
import { TeachingAuditItem } from '../../types';

interface AuditDetailModalProps {
  item: TeachingAuditItem | null;
  onClose: () => void;
  onOpenEvidence: (url: string, title: string) => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  item,
  onClose,
  onOpenEvidence,
}) => {
  if (!item) return null;

  const isViolation = item.result === 'Vi phạm';

  const renderCriterionBadge = (val: string) => {
    const isGood = val.toLowerCase().includes('tốt') || val === '';
    return (
      <span
        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
          isGood
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}
      >
        {val || 'Tốt'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Phiếu Đánh Giá Sư Phạm Chi Tiết
              </h3>
              <p className="text-xs text-slate-500">
                Mã bản ghi: <span className="font-mono text-slate-700 font-semibold">{item.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Top Info Banner */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isViolation
              ? item.isSevere ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {isViolation ? (
                <AlertTriangle className={`w-5 h-5 ${item.isSevere ? 'text-rose-600' : 'text-amber-600'}`} />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
              <div>
                <span className="font-bold text-sm">
                  Kết quả: {item.result} {item.isSevere && '(Tình huống nghiêm trọng)'}
                </span>
                <p className="text-xs opacity-80 mt-0.5">
                  Trạng thái xử lý: <strong>{item.status}</strong>
                  {item.resolutionDateStr && ` • Ngày giải quyết: ${item.resolutionDateStr}`}
                </p>
              </div>
            </div>

            {item.evidenceImage && item.evidenceImage.startsWith('http') && (
              <button
                type="button"
                onClick={() => onOpenEvidence(item.evidenceImage, `Minh chứng - ${item.teacherName}`)}
                className="px-3 py-1.5 bg-white shadow-xs rounded-lg font-bold text-xs text-blue-700 hover:bg-blue-50 border border-blue-200 flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở link ảnh Drive
              </button>
            )}
          </div>

          {/* Teacher & Class Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Họ và tên Giáo viên</span>
              <strong className="text-sm text-slate-900">{item.teacherName}</strong>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.teacherRank} • Môn: {item.subject}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Cơ sở giảng dạy</span>
              <strong className="text-sm text-slate-900">{item.facility}</strong>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.cameraOrClass || 'Phòng học chuẩn'}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Thời gian ca dạy</span>
              <strong className="text-sm text-slate-900">{item.dateStr} ({item.dayOfWeek})</strong>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.startTime} - {item.endTime} ({item.shiftCount} ca)</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Người thực hiện đánh giá</span>
              <strong className="text-xs text-slate-800">{item.evaluator || 'Hệ thống Quản lý'}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Kỳ / Tháng đánh giá</span>
              <strong className="text-xs text-slate-800">Tháng {item.month}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Gửi thông báo mail</span>
              <strong className="text-xs text-slate-800">{item.emailSent}</strong>
            </div>
          </div>

          {/* 6 Criteria Scorecard */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Kết quả đánh giá 6 tiêu chuẩn:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Shirt className="w-4 h-4 text-blue-600" />
                  Đồng phục / Tác phong:
                </span>
                {renderCriterionBadge(item.uniform)}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-amber-600" />
                  15 phút đầu giờ:
                </span>
                {renderCriterionBadge(item.first15m)}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Quản lớp &amp; Bao quát:
                </span>
                {renderCriterionBadge(item.classMgmt)}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  Giao ca &amp; An toàn:
                </span>
                {renderCriterionBadge(item.handover)}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Smartphone className="w-4 h-4 text-rose-600" />
                  Thiết bị điện tử (Phone/Laptop):
                </span>
                {renderCriterionBadge(item.deviceUsage)}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Kết ca &amp; Vệ sinh:
                </span>
                {renderCriterionBadge(item.endShift)}
              </div>
            </div>
          </div>

          {/* Violation Details Box (if any) */}
          {isViolation && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Lỗi ghi nhận: {item.violationName || item.violationCategory}
              </div>

              {item.detailedViolation && (
                <p className="text-xs text-rose-900">
                  <strong>Phân loại chi tiết:</strong> {item.detailedViolation}
                </p>
              )}

              {item.evaluatorNote && (
                <div className="p-3 bg-white/90 rounded-lg border border-rose-100 text-xs text-slate-800 italic">
                  <strong>Ghi chú từ CTV/Giám sát:</strong> "{item.evaluatorNote}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
