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
  Clock
} from 'lucide-react';
import { ReportTabId } from './Sidebar';
import chessLogo from '../assets/brands/co-vua-sai-gon.png';
import artLogo from '../assets/brands/saigon-art.png';

interface CoverPageProps {
  onNavigate: (tabId: ReportTabId) => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-100/70 pb-20">
      
      {/* HERO COVER HEADER - TRÀN VIỀN EXPANSIVE BANNER */}
      <section className="relative w-full overflow-hidden bg-linear-to-br from-[#0c233c] via-[#153456] to-[#0a1b2e] text-white shadow-xl border-b border-slate-700/50 py-10 sm:py-14 lg:py-16 px-4 sm:px-8 lg:px-12">
        {/* Subtle Ambient Decorative Gradients & Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#3ea8e0_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#3EA8E0]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F9C846]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-8">
          
          {/* BRAND LOGO CLUSTER (CỜ VUA SÀI GÒN & SÀI GÒN ART) - ENLARGED LOGOS */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 bg-white/10 backdrop-blur-md px-6 sm:px-8 py-3.5 sm:py-4 rounded-3xl border border-white/20 shadow-xl transition-transform hover:scale-[1.02] duration-300">
            {/* Chess Logo Card - Enlarged */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 bg-white rounded-2xl p-2 sm:p-2.5 shadow-md flex items-center justify-center flex-shrink-0 group">
              <img 
                src={chessLogo} 
                alt="Logo Cờ Vua Sài Gòn" 
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Elegant Separator */}
            <span className="w-px h-10 sm:h-14 bg-white/25" aria-hidden="true" />

            {/* Art Logo Card - Enlarged */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 bg-white rounded-2xl p-2 sm:p-2.5 shadow-md flex items-center justify-center flex-shrink-0 group">
              <img 
                src={artLogo} 
                alt="Logo Sài Gòn Art" 
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          {/* INSTITUTIONAL TITLES - THIẾT KẾ KHÔNG BỊ RỚT XUỐNG HÀNG */}
          <div className="space-y-3 w-full max-w-5xl mx-auto flex flex-col items-center">
            {/* Brand Subtitle */}
            <p className="text-xs sm:text-sm font-bold tracking-[0.15em] sm:tracking-[0.2em] text-[#F9C846] uppercase whitespace-normal sm:whitespace-nowrap drop-shadow-xs">
              HỆ THỐNG TRUNG TÂM CỜ VUA SÀI GÒN & SÀI GÒN ART
            </p>
            
            {/* Main Institutional Header */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase font-display whitespace-nowrap drop-shadow-sm">
              PHÒNG QUẢN LÝ CHẤT LƯỢNG
            </h1>
            
            {/* Main Subtitle Requested by User - ĐẢM BẢO KHÔNG BỊ RỚT XUỐNG HÀNG */}
            <div className="w-full flex items-center justify-center pt-1 overflow-x-auto no-scrollbar">
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-wider text-slate-100 uppercase whitespace-nowrap bg-white/10 backdrop-blur-xs px-4 sm:px-6 py-1.5 rounded-full border border-white/15 shadow-inner">
                TỔNG HỢP BÁO CÁO CÁC TIÊU CHÍ ĐÁNH GIÁ VẬN HÀNH
              </p>
            </div>
          </div>

          {/* QUICK META STATS BAR */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-3 text-xs sm:text-sm text-slate-200 border-t border-white/10 w-full max-w-2xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#F9C846]" />
              <span className="font-semibold text-white">19 Cơ sở</span>
              <span className="text-slate-400">giám sát toàn diện</span>
            </div>
            <div className="text-slate-500 hidden sm:inline" aria-hidden="true">•</div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#3EA8E0]" />
              <span className="font-semibold text-white">3 Trụ cột</span>
              <span className="text-slate-400">tiêu chí chuẩn hóa</span>
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

      {/* CORE CRITERIA CARDS SECTION - THIẾT KẾ CÁC KHUNG TRÀN VIỀN */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 space-y-6">

        {/* SECTION LABEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B5EA6]" />
              <span>CÁC TIÊU CHÍ ĐÁNH GIÁ VẬN HÀNH CHUẨN HÓA</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Nhấp vào bất kỳ khung tiêu chí nào để tự động điều hướng sang báo cáo phân tích chi tiết tương ứng
            </p>
          </div>
          <div className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 w-fit shadow-2xs">
            3 Trụ Cột Độc Lập • Hệ Thống 19 Cơ Sở
          </div>
        </div>

        {/* 3 CORE PILLARS / CRITERIA CARDS - KHUNG TRÀN VIỀN DESIGN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">

          {/* CARD 1: VỆ SINH & CƠ SỞ VẬT CHẤT */}
          <div
            onClick={() => onNavigate('integrated-quality-report')}
            className="group bg-white rounded-2xl shadow-md hover:shadow-2xl border border-slate-200/90 hover:border-[#1B5EA6] overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5"
          >
            {/* KHUNG TRÀN VIỀN HEADER (Full-Bleed Header) */}
            <div className="bg-linear-to-r from-[#144272] via-[#1B5EA6] to-[#2B7BC8] text-white p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-sky-100 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 shadow-xs whitespace-nowrap">
                  Tiêu chí cơ sở vật chất
                </span>
              </div>

              <div className="relative z-10 mt-4">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Giám Sát Vệ Sinh & Cơ Sở Vật Chất
                </h3>
                <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">
                  Đánh giá toàn diện hiện trạng vệ sinh, an toàn và bảo trì cơ sở vật chất tại 19 cơ sở:
                </p>
              </div>
            </div>

            {/* CARD BODY: Full-width tràn viền criteria list */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                {/* Item 1 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-sky-50/60 group-hover:border-sky-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-slate-900">Kết Quả Check Out Hằng Ngày</span>
                    </span>
                    <span className="text-[#1B5EA6] bg-blue-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-blue-100 flex-shrink-0 whitespace-nowrap">
                      Hằng ngày
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Kiểm tra checklist vệ sinh, an toàn phòng học và bàn giao cuối ca
                  </p>
                </div>

                {/* Item 2 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-sky-50/60 group-hover:border-sky-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-slate-900">Báo Cáo Sửa Chữa CVSC</span>
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-100 flex-shrink-0 whitespace-nowrap">
                      Bảo trì
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Ghi nhận sự cố hư hỏng, hiện trạng máy lạnh và tiến độ xử lý sửa chữa
                  </p>
                </div>

                {/* Item 3 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-sky-50/60 group-hover:border-sky-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-900">Báo Cáo Định Kỳ CVSG</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-emerald-100 flex-shrink-0 whitespace-nowrap">
                      Định kỳ CVSG
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Tổng hợp đánh giá chất lượng cơ sở toàn diện định kỳ tại CVSG
                  </p>
                </div>
              </div>
            </div>

            {/* KHUNG TRÀN VIỀN FOOTER ACTION */}
            <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-xs font-bold text-[#1B5EA6] group-hover:bg-blue-50/60 transition-colors">
              <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <span>Vào Báo Cáo Vệ Sinh</span>
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium text-slate-400">19 cơ sở</span>
            </div>
          </div>

          {/* CARD 2: GIÁM SÁT QUA CAMERA (Chất lượng giảng dạy) */}
          <div
            onClick={() => onNavigate('teaching-quality')}
            className="group bg-white rounded-2xl shadow-md hover:shadow-2xl border border-slate-200/90 hover:border-emerald-600 overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5"
          >
            {/* KHUNG TRÀN VIỀN HEADER (Full-Bleed Header) */}
            <div className="bg-linear-to-r from-[#065f46] via-[#047857] to-[#0f766e] text-white p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-emerald-100 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 shadow-xs whitespace-nowrap">
                  Tiêu chí đánh giá giáo viên và an toàn lớp học
                </span>
              </div>

              <div className="relative z-10 mt-4">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Giám Sát Giảng Dạy Qua Camera
                </h3>
                <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                  Đánh giá nề nếp đứng lớp, phương pháp sư phạm và tương tác giáo viên - học sinh qua camera:
                </p>
              </div>
            </div>

            {/* CARD BODY: Full-width tràn viền criteria list */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                {/* Item 1 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-900">Quản Lý Ca Giảng Dạy</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-emerald-100 flex-shrink-0 whitespace-nowrap">
                      Đúng chuẩn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Tác phong sư phạm, giờ giấc lên lớp, chuẩn bị giáo cụ và quản lý ca dạy
                  </p>
                </div>

                {/* Item 2 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-slate-900">Quản Lý Kỷ Luật Lớp Học</span>
                    </span>
                    <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-teal-100 flex-shrink-0 whitespace-nowrap">
                      Nề nếp
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Bao quát lớp, duy trì sự tập trung, động viên học viên tích cực
                  </p>
                </div>

                {/* Item 3 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-900">Quản Lý Camera</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-emerald-100 flex-shrink-0 whitespace-nowrap">
                      Kết nối 19 CS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Theo dõi tình trạng kết nối, góc quan sát và trạng thái camera toàn hệ thống
                  </p>
                </div>
              </div>
            </div>

            {/* KHUNG TRÀN VIỀN FOOTER ACTION */}
            <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:bg-emerald-50/60 transition-colors">
              <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <span>Vào Báo Cáo Camera</span>
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium text-slate-400">Giảng dạy & Lớp học</span>
            </div>
          </div>

          {/* CARD 3: ZALO OA (Khảo sát phụ huynh) */}
          <div
            onClick={() => onNavigate('survey')}
            className="group bg-white rounded-2xl shadow-md hover:shadow-2xl border border-slate-200/90 hover:border-amber-500 overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5 md:col-span-2 lg:col-span-1"
          >
            {/* KHUNG TRÀN VIỀN HEADER (Full-Bleed Header) */}
            <div className="bg-linear-to-r from-[#9a3412] via-[#c2410c] to-[#d97706] text-white p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-amber-100 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 shadow-xs whitespace-nowrap">
                  Tiêu chí phụ huynh
                </span>
              </div>

              <div className="relative z-10 mt-4">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Khảo Sát Ý Kiến Phụ Huynh (Zalo OA)
                </h3>
                <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                  Lắng nghe và định lượng mức độ hài lòng của phụ huynh, học viên qua kênh khảo sát tự động Zalo OA:
                </p>
              </div>
            </div>

            {/* CARD BODY: Full-width tràn viền criteria list */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                {/* Item 1 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-amber-50/60 group-hover:border-amber-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                      <span className="text-slate-900">Chỉ Số Hài Lòng CSAT & Sao</span>
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-100 flex-shrink-0 whitespace-nowrap">
                      Thang 1-5 ⭐
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Tỷ lệ phụ huynh hài lòng tối đa (5 sao) và đánh giá chất lượng
                  </p>
                </div>

                {/* Item 2 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-amber-50/60 group-hover:border-amber-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-slate-900">Tỷ Lệ Phản Hồi Khảo Sát</span>
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-100 flex-shrink-0 whitespace-nowrap">
                      Độ phủ cao
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Đo lường tỷ lệ phụ huynh hoàn tất khảo sát trên tổng tin gửi
                  </p>
                </div>

                {/* Item 3 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 group-hover:bg-amber-50/60 group-hover:border-amber-200 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-slate-900">Tốc Độ Xử Lý & Giải Quyết</span>
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-100 flex-shrink-0 whitespace-nowrap">
                      Chuẩn 24H
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    Tiếp nhận và giải quyết thấu đáo các phản ánh của phụ huynh
                  </p>
                </div>
              </div>
            </div>

            {/* KHUNG TRÀN VIỀN FOOTER ACTION */}
            <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:bg-amber-50/60 transition-colors">
              <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <span>Vào Báo Cáo Zalo OA</span>
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium text-slate-400">Phản hồi CSAT</span>
            </div>
          </div>

        </div>

        {/* BOTTOM QUICK FOOTNOTE CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-[#1A3A5C]/10 text-[#1A3A5C] flex items-center justify-center font-bold flex-shrink-0">
              QM
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                Phòng Quản Lý Chất Lượng – Cờ Vua Sài Gòn & Sài Gòn Art
              </p>
              <p className="text-slate-500 text-[11px]">
                Mọi tiêu chí và dữ liệu được tổng hợp định kỳ và đối soát trực tiếp với dữ liệu hiện trường toàn hệ thống 19 cơ sở.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('integrated-quality-report')}
              className="px-4 py-2 rounded-xl bg-[#1B5EA6] text-white font-bold text-xs hover:bg-[#154b85] transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-2"
            >
              <span>Xem Báo Cáo Tổng Hợp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
