import React from 'react';
import {
  ShieldCheck,
  GraduationCap,
  ClipboardCheck,
  ArrowRight,
  Award,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  Video,
  Star,
  Clock,
  ExternalLink
} from 'lucide-react';
import { ReportTabId } from './Sidebar';
import chessLogo from '../assets/brands/co-vua-sai-gon.png';
import artLogo from '../assets/brands/saigon-art.png';

interface CoverPageProps {
  onNavigate: (tabId: ReportTabId) => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[calc(100vh-60px)] bg-radial-[at_top] from-slate-50 via-slate-100/60 to-slate-200/50 pb-16 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HERO COVER HEADER CARD */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#122b46] via-[#1A3A5C] to-[#0d1e31] text-white shadow-xl border border-slate-700/60 p-6 sm:p-10 lg:p-12">
          {/* Subtle Ambient Decorative Gradients */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#3EA8E0]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F9C846]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            
            {/* BRAND LOGO CLUSTER (CỜ VUA SÀI GÒN & SÀI GÒN ART) */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-md">
              {/* Chess Logo Card */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl p-1.5 shadow-sm flex items-center justify-center flex-shrink-0">
                <img 
                  src={chessLogo} 
                  alt="Logo Cờ Vua Sài Gòn" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Elegant Separator */}
              <span className="w-px h-8 bg-white/25" aria-hidden="true" />

              {/* Art Logo Card */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl p-1.5 shadow-sm flex items-center justify-center flex-shrink-0">
                <img 
                  src={artLogo} 
                  alt="Logo Sài Gòn Art" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* INSTITUTIONAL TITLES */}
            <div className="space-y-2 max-w-3xl">
              <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#3EA8E0] uppercase">
                Hệ Thống Trung Tâm Cờ Vua Sài Gòn & Sài Gòn Art
              </p>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase font-display">
                PHÒNG QUẢN LÝ CHẤT LƯỢNG
              </h1>
              <p className="text-sm sm:text-base font-semibold tracking-wide text-slate-200 uppercase pt-1">
                TỔNG HỢP BÁO CÁO CÁC TIÊU CHÍ ĐÁNH GIÁ VẬN HÀNH
              </p>
            </div>

            {/* QUICK META STATS BAR */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs sm:text-sm text-slate-200 border-t border-white/10 w-full max-w-2xl">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F9C846]" />
                <span className="font-semibold text-white">19 Cơ sở</span>
                <span className="text-slate-400">được giám sát</span>
              </div>
              <div className="text-slate-500 hidden sm:inline" aria-hidden="true">•</div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#3EA8E0]" />
                <span className="font-semibold text-white">3 Trụ cột</span>
                <span className="text-slate-400">tiêu chí đánh giá</span>
              </div>
              <div className="text-slate-500 hidden sm:inline" aria-hidden="true">•</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">Đồng bộ trực tiếp</span>
                <span className="text-slate-400">theo thời gian thực</span>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION LABEL */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B5EA6]" />
              <span>Các Tiêu Chí Đánh Giá Chuẩn Hóa</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhấp vào tiêu chí bất kỳ để tự động chuyển đến báo cáo phân tích chi tiết tương ứng
            </p>
          </div>
        </div>

        {/* 3 CORE PILLARS / CRITERIA CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CARD 1: VỆ SINH & CƠ SỞ VẬT CHẤT (Thang điểm 100) */}
          <div
            onClick={() => onNavigate('integrated-quality-report')}
            className="group relative bg-white rounded-2xl border-2 border-slate-200/90 hover:border-[#1B5EA6] p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#1B5EA6] to-[#3EA8E0] rounded-t-2xl" />

            <div className="space-y-4">
              {/* Header of Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#1B5EA6] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1B5EA6] group-hover:text-white transition-colors duration-300 shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#1B5EA6] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                  Tiêu chí cơ sở vật chất
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1B5EA6] transition-colors uppercase tracking-tight">
                  Giám Sát Vệ Sinh & Cơ Sở Vật Chất
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đánh giá toàn diện hiện trạng vệ sinh, an toàn và bảo trì cơ sở vật chất tại 19 cơ sở:
                </p>
              </div>

              {/* Attached Evaluation Criteria Items */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-sky-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kết Quả Check Out Hằng Ngày</span>
                    </span>
                    <span className="text-[#1B5EA6] font-semibold text-[11px]">Hằng ngày</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kiểm tra checklist vệ sinh, an toàn phòng học và bàn giao cuối ca
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-sky-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                      <span>Báo Cáo Sửa Chữa CVSC</span>
                    </span>
                    <span className="text-[#1B5EA6] font-semibold text-[11px]">Bảo trì</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ghi nhận sự cố hư hỏng, hiện trạng máy lạnh và tiến độ xử lý sửa chữa
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-sky-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Báo Cáo Định Kỳ CVSG</span>
                    </span>
                    <span className="text-[#1B5EA6] font-semibold text-[11px]">Định kỳ CVSG</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tổng hợp đánh giá chất lượng cơ sở toàn diện định kỳ tại CVSG
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 font-medium pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B5EA6]" />
                  <span>Khu vực: Phòng Cờ, Phòng Vẽ, Lễ Tân, NVS, Máy Lạnh</span>
                </div>
              </div>
            </div>

            {/* Bottom Button Action */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#1B5EA6] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                Vào Báo Cáo Vệ Sinh
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-semibold text-slate-400">19 cơ sở</span>
            </div>
          </div>

          {/* CARD 2: GIÁM SÁT QUA CAMERA (Chất lượng giảng dạy) */}
          <div
            onClick={() => onNavigate('teaching-quality')}
            className="group relative bg-white rounded-2xl border-2 border-slate-200/90 hover:border-emerald-600 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-emerald-600 to-teal-400 rounded-t-2xl" />

            <div className="space-y-4">
              {/* Header of Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 text-right">
                  Tiêu chí đánh giá giáo viên và an toàn lớp học
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                  Giám Sát Giảng Dạy Qua Camera
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đánh giá nề nếp đứng lớp, phương pháp sư phạm và sự tương tác giữa giáo viên - học sinh qua hệ thống camera:
                </p>
              </div>

              {/* Attached Evaluation Criteria Items */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quản Lý Ca Giảng Dạy</span>
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">Đúng chuẩn</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tác phong sư phạm, giờ giấc lên lớp, chuẩn bị giáo cụ và quản lý ca dạy
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Quản Lý Kỷ Luật Lớp Học</span>
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">Nề nếp</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bao quát lớp, duy trì sự tập trung, động viên học viên tích cực
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quản Lý Camera</span>
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">Kết nối 19 CS</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Theo dõi tình trạng kết nối, góc quan sát và trạng thái camera toàn hệ thống
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 font-medium pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Kèm giám sát trạng thái kết nối camera toàn hệ thống</span>
                </div>
              </div>
            </div>

            {/* Bottom Button Action */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                Vào Báo Cáo Camera
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Giảng dạy & Lớp học</span>
            </div>
          </div>

          {/* CARD 3: ZALO OA (Khảo sát phụ huynh) */}
          <div
            onClick={() => onNavigate('survey')}
            className="group relative bg-white rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-amber-500 to-orange-400 rounded-t-2xl" />

            <div className="space-y-4">
              {/* Header of Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-2xs">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                  Tiêu chí phụ huynh
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">
                  Khảo Sát Ý Kiến Phụ Huynh (Zalo OA)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Lắng nghe và định lượng mức độ hài lòng của phụ huynh, học viên qua kênh khảo sát tự động Zalo OA:
                </p>
              </div>

              {/* Attached Evaluation Criteria Items */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>Chỉ Số Hài Lòng CSAT & Sao</span>
                    </span>
                    <span className="text-amber-600 font-mono">Thang 1-5 ⭐</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tỷ lệ phụ huynh hài lòng tối đa (5 sao) và đánh giá chất lượng
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tỷ Lệ Phản Hồi Khảo Sát</span>
                    </span>
                    <span className="text-amber-600 font-semibold text-[11px]">Độ phủ cao</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đo lường tỷ lệ phụ huynh hoàn tất khảo sát trên tổng tin gửi
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/70 group-hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Tốc Độ Xử Lý & Giải Quyết</span>
                    </span>
                    <span className="text-amber-600 font-semibold text-[11px]">Chuẩn 24H</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tiếp nhận và giải quyết thấu đáo các phản ánh của phụ huynh
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 font-medium pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Tổng hợp ý kiến đóng góp, phân tích từ khóa và góp ý chi tiết</span>
                </div>
              </div>
            </div>

            {/* Bottom Button Action */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                Vào Báo Cáo Zalo OA
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Phản hồi CSAT</span>
            </div>
          </div>

        </div>

        {/* BOTTOM QUICK FOOTNOTE CARD */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-[#1A3A5C]/10 text-[#1A3A5C] flex items-center justify-center font-bold flex-shrink-0">
              QM
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Phòng Quản Lý Chất Lượng – Cờ Vua Sài Gòn & Sài Gòn Art
              </p>
              <p className="text-slate-500 text-[11px]">
                Mọi tiêu chí và dữ liệu được tổng hợp định kỳ và đối soát trực tiếp với dữ liệu hiện trường.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('integrated-quality-report')}
              className="px-3.5 py-2 rounded-xl bg-[#1B5EA6] text-white font-bold text-xs hover:bg-[#154b85] transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Khám phá báo cáo ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
