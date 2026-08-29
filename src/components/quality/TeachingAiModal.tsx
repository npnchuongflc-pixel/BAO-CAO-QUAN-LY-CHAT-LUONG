import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Brain,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { TeachingQualitySummary } from '../../types';

interface TeachingAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TeachingQualitySummary;
}

export const TeachingAiModal: React.FC<TeachingAiModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');

  if (!isOpen) return null;

  const handleGenerateAnalysis = async (customPrompt?: string) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        metricsData: {
          totalShifts: summary.totalShifts,
          totalAudits: summary.totalAudits,
          complianceRate: summary.complianceRate,
          violationRate: summary.violationRate,
          severeCount: summary.severeCount,
          handledRate: summary.handledRate,
          uniqueTeachers: summary.uniqueTeachers,
          uniqueFacilities: summary.uniqueFacilities,
          criteria: summary.criteria.map((c) => ({
            name: c.name,
            complianceRate: c.complianceRate,
            violationCount: c.violationCount,
            topIssues: c.topIssues
          })),
          topViolations: summary.topViolations.slice(0, 5),
          subjectStats: summary.subjectStats,
          monthlyTrends: summary.monthlyTrends
        },
        prompt: customPrompt || undefined,
        question: customPrompt ? customPrompt : undefined,
        mode: 'teaching_quality'
      };

      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error(data.error || 'Không thể tạo phân tích từ AI');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi gọi mô hình Gemini');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || loading) return;
    const q = userQuery.trim();
    setUserQuery('');
    handleGenerateAnalysis(q);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Trợ Lý AI Giám Sát &amp; Cố Vấn Sư Phạm
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  Gemini 3.7 Flash
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                Phân tích dữ liệu vi phạm thực tế, nhận diện nguyên nhân gốc rễ và đề xuất kế hoạch PDCA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          {!analysis && !loading && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Sẵn Sàng Phân Tích Toàn Bộ Dữ Liệu Giám Sát
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  AI sẽ đọc hơn {summary.totalShifts.toLocaleString('vi-VN')} ca dạy, cơ cấu các lỗi phổ biến (15p đầu giờ, thiết bị, quản lớp), so sánh 2 khối Cờ Vua vs Mỹ Thuật và lập kế hoạch đào tạo thực tế.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGenerateAnalysis()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 mx-auto transition-all"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                Bắt Đầu Phân Tích Tổng Quan Ngay
              </button>

              {/* Sample Prompt Pills */}
              <div className="pt-4 border-t border-slate-100 text-left max-w-lg mx-auto">
                <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                  Hoặc hỏi nhanh các chuyên đề:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateAnalysis(
                        'Phân tích sâu lỗi 15 phút đầu giờ: nguyên nhân và quy trình chấn chỉnh cụ thể cho Quản lý Cơ sở.'
                      )
                    }
                    className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg text-slate-700 text-[11px] transition-colors text-left"
                  >
                    ⏰ Giải pháp triệt để cho lỗi 15p đầu giờ &amp; đến trễ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateAnalysis(
                        'So sánh chất lượng giảng dạy giữa bộ môn Cờ Vua và Mỹ Thuật, môn nào cần đào tạo thêm kỹ năng quản lớp?'
                      )
                    }
                    className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg text-slate-700 text-[11px] transition-colors text-left"
                  >
                    ⚖️ So sánh Cờ Vua vs Mỹ Thuật &amp; Kỹ năng quản lớp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateAnalysis(
                        'Đề xuất chương trình đào tạo lại (Retraining Workshop) 3 buổi cho các giáo viên có tỷ lệ vi phạm cao.'
                      )
                    }
                    className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg text-slate-700 text-[11px] transition-colors text-left"
                  >
                    📋 Kế hoạch Workshop Tái Đào Tạo 3 buổi
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">
                Gemini 3.7 Flash đang xử lý dữ liệu và xây dựng báo cáo sư phạm...
              </p>
              <p className="text-slate-400 text-xs">
                Đang đối chiếu {summary.totalAudits.toLocaleString('vi-VN')} lượt kiểm định và 6 tiêu chuẩn chất lượng.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateAnalysis()}
                className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100"
              >
                Thử lại
              </button>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Báo Cáo Phân Tích &amp; Đề Xuất Cải Tiến Chất Lượng:
                </span>
                <button
                  type="button"
                  onClick={() => handleGenerateAnalysis()}
                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Phân tích lại
                </button>
              </div>

              <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                {analysis}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Query Input */}
        <form onSubmit={handleSendQuery} className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Đặt câu hỏi chi tiết về dữ liệu giám sát cho AI (Ví dụ: Cơ sở nào cần tăng cường thanh tra tuần tới?)..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              disabled={loading}
              className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={!userQuery.trim() || loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
