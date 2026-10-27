import React, { useState, useMemo } from 'react';
import { SheetRowItem } from '../types';
import { formatDate, formatPercent } from '../services/sheetService';
import {
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  Search,
  ThumbsUp,
  AlertTriangle,
  GraduationCap,
  Users,
  Headphones,
  BookOpen,
  Building,
  DollarSign,
  Smartphone,
  HelpCircle,
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';

export interface SentimentCategory {
  id: string;
  name: string;
  shortName: string;
  isPraise: boolean;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  description: string;
  icon: React.ElementType;
}

export const SENTIMENT_CATEGORIES: SentimentCategory[] = [
  {
    id: 'praise',
    name: 'Khen ngợi & Hài lòng',
    shortName: 'Khen ngợi',
    isPraise: true,
    color: '#10b981', // Emerald 500
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Phụ huynh hài lòng, khen giáo viên nhiệt tình, bé yêu thích lớp học, môi trường tốt và có tiến bộ rõ rệt.',
    icon: ThumbsUp
  },
  {
    id: 'teaching_quality',
    name: 'Chất lượng giảng dạy & Chuyên môn',
    shortName: 'Chất lượng dạy',
    isPraise: false,
    color: '#f43f5e', // Rose 500
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    description: 'Bé chậm tiến bộ, thụt lùi, giáo viên can thiệp vào tranh vẽ quá nhiều, bé sợ thua, chưa nắm rõ thế cờ.',
    icon: GraduationCap
  },
  {
    id: 'teacher_interaction',
    name: 'Tương tác & Quản lý lớp của giáo viên',
    shortName: 'Tương tác & Tập trung',
    isPraise: false,
    color: '#f97316', // Orange 500
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    description: 'Giáo viên xem điện thoại, nói chuyện riêng, cho bé chơi cờ trên máy tính, lớp đông thiếu người kèm cặp.',
    icon: Users
  },
  {
    id: 'curriculum_schedule',
    name: 'Giáo trình & Chương trình học',
    shortName: 'Giáo trình & Bài tập',
    isPraise: false,
    color: '#8b5cf6', // Violet 500
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    description: 'Chậm phát sách level tiếp theo, bài tập chưa thích hợp, thiếu chủ đề vẽ theo ngày lễ, thiếu giải đấu giao lưu.',
    icon: BookOpen
  },
  {
    id: 'customer_service',
    name: 'Dịch vụ CSKH, Tư vấn & Hỗ trợ',
    shortName: 'Tư vấn & CSKH',
    isPraise: false,
    color: '#eab308', // Amber 500
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Nhân viên tư vấn thiếu chuyên nghiệp, không phản hồi khi phụ huynh hỏi, không nhắc khi bé nghỉ, lấp liếm.',
    icon: Headphones
  },
  {
    id: 'facility_environment',
    name: 'Cơ sở vật chất & Môi trường lớp',
    shortName: 'Cơ sở vật chất',
    isPraise: false,
    color: '#0284c7', // Sky 600
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-700',
    description: 'Thiếu giá vẽ riêng, phòng ngồi vẽ chật chội, môi trường lớp học ồn ào ảnh hưởng tập trung.',
    icon: Building
  },
  {
    id: 'pricing_tuition',
    name: 'Học phí & Chính sách giá',
    shortName: 'Học phí & Giá',
    isPraise: false,
    color: '#b45309', // Amber 700 / Brown
    bgLight: 'bg-amber-50/80',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    description: 'Học phí còn cao, chưa tương xứng với chất lượng buổi học, mong muốn mức giá phù hợp hơn để theo lâu dài.',
    icon: DollarSign
  },
  {
    id: 'survey_system',
    name: 'Hệ thống Zalo & Dữ liệu khảo sát',
    shortName: 'Hệ thống khảo sát',
    isPraise: false,
    color: '#64748b', // Slate 500
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    description: 'Khảo sát gửi sai thông tin khách hàng, gửi đi gửi lại nhiều lần gây phiền hà cho phụ huynh.',
    icon: Smartphone
  },
  {
    id: 'other_improvement',
    name: 'Vấn đề cần cải thiện khác',
    shortName: 'Góp ý khác',
    isPraise: false,
    color: '#94a3b8', // Gray 400
    bgLight: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    description: 'Các đóng góp ý kiến hoặc phản hồi khác cần khắc phục.',
    icon: HelpCircle
  }
];

export function classifyFeedbackItem(detail: string, rating: number | null): string {
  const text = (detail || '').toLowerCase();
  const r = rating != null ? Number(rating) : 5;

  // Dấu hiệu rõ ràng của phản ánh / phàn nàn
  const complaintCues = [
    'tệ', 'chưa', 'không', 'ko', 'k ', 'kém', 'yếu', 'ồn', 'chật', 'lấp liếm',
    'hời hợt', 'bù đầu', 'sai', 'phàn nàn', 'thất vọng', 'rút kinh nghiệm',
    'can thiệp', 'nhìn điện thoại', 'giá vẽ', 'học phí', 'đắt', 'cao', 'thụt lùi',
    'sợ thua', 'lệch lạc', 'quá đông', 'chưa tương xứng'
  ];
  const hasComplaintCue = complaintCues.some((c) => text.includes(c));

  // Nếu đánh giá <= 3 sao hoặc nội dung có phàn nàn -> Phân loại vào các nhóm lỗi
  if (r <= 3 || hasComplaintCue) {
    // 1. Học phí & Chính sách giá
    if (
      text.includes('học phí') ||
      (text.includes('giá') && (text.includes('cao') || text.includes('đắt') || text.includes('chưa tương xứng') || text.includes('tiền học')))
    ) {
      return 'pricing_tuition';
    }

    // 2. Hệ thống Zalo & Khảo sát
    if (
      text.includes('khảo sát') ||
      text.includes('đánh giá rất nhiều lần') ||
      (text.includes('sai') && text.includes('thông tin')) ||
      text.includes('k gửi lại') ||
      text.includes('phiền')
    ) {
      return 'survey_system';
    }

    // 3. Cơ sở vật chất & Không gian lớp học
    if (
      text.includes('giá vẽ') ||
      text.includes('chật') ||
      text.includes('không gian') ||
      text.includes('rất ồn') ||
      text.includes('ồn ào') ||
      text.includes('máy lạnh') ||
      text.includes('điều hòa') ||
      text.includes('bàn ghế')
    ) {
      return 'facility_environment';
    }

    // 4. Tương tác, tập trung & Quản lý lớp của giáo viên
    if (
      text.includes('điện thoại') ||
      text.includes('không tập trung') ||
      text.includes('ko tập trung') ||
      text.includes('chơi cờ trên máy') ||
      text.includes('ko tương tác') ||
      text.includes('không tương tác') ||
      text.includes('bù đầu') ||
      text.includes('lớp khá đông') ||
      text.includes('take care') ||
      text.includes('theo sát') ||
      text.includes('hời hợt') ||
      text.includes('quá đông')
    ) {
      return 'teacher_interaction';
    }

    // 5. Dịch vụ CSKH, Tư vấn & Hỗ trợ phụ huynh
    if (
      text.includes('dịch vụ tệ') ||
      text.includes('không phản hồi') ||
      text.includes('ko phản hồi') ||
      text.includes('nhân viên tư vấn') ||
      text.includes('không chuyên nghiệp') ||
      text.includes('lấp liếm') ||
      text.includes('workshop') ||
      text.includes('hỏi không')
    ) {
      return 'customer_service';
    }

    // 6. Giáo trình, Bài tập & Chương trình học
    if (
      text.includes('bài tập') ||
      text.includes('sách') ||
      text.includes('level') ||
      text.includes('chương trình học') ||
      text.includes('chủ đề') ||
      text.includes('20/10') ||
      text.includes('cuộc thi') ||
      text.includes('app chơi online') ||
      text.includes('giáo trình')
    ) {
      return 'curriculum_schedule';
    }

    // 7. Chất lượng giảng dạy & Chuyên môn
    if (
      text.includes('can thiệp') ||
      text.includes('không đẹp') ||
      text.includes('thụt lùi') ||
      text.includes('tiến bộ') ||
      text.includes('tự đấu') ||
      text.includes('lệch lạc') ||
      text.includes('sợ thua') ||
      text.includes('chất lượng dạy') ||
      text.includes('tư duy') ||
      text.includes('yếu') ||
      text.includes('dạy')
    ) {
      return 'teaching_quality';
    }

    if (r <= 3) {
      return 'other_improvement';
    }
  }

  // Mặc định phản hồi tích cực -> Miếng quạt Khen ngợi & Hài lòng
  return 'praise';
}

// Helpers for SVG Pie Arc geometry
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  // Clamp full circle
  const delta = endAngle - startAngle;
  const isFull = delta >= 359.99;
  const safeEndAngle = isFull ? startAngle + 359.99 : endAngle;

  const start = polarToCartesian(x, y, radius, safeEndAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, safeEndAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = delta <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    'Z'
  ].join(' ');
}

interface CommentSentimentPieReportProps {
  replies: SheetRowItem[];
  feedback: SheetRowItem[];
}

export const CommentSentimentPieReport: React.FC<CommentSentimentPieReportProps> = ({
  replies,
  feedback
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Phân loại toàn bộ comment có nội dung
  const classifiedComments = useMemo(() => {
    // Thu thập tất cả các dòng có nhận xét chi tiết (detail)
    const sourceRows = replies.filter((r) => r.detail && r.detail.trim().length > 0);

    return sourceRows.map((row) => {
      const catId = classifyFeedbackItem(row.detail, row.rating);
      return {
        ...row,
        categoryId: catId
      };
    });
  }, [replies]);

  // 2. Thống kê theo từng nhóm
  const categoryStats = useMemo(() => {
    const total = classifiedComments.length;
    const countMap: Record<string, number> = {};

    classifiedComments.forEach((item) => {
      countMap[item.categoryId] = (countMap[item.categoryId] || 0) + 1;
    });

    const categoriesWithData = SENTIMENT_CATEGORIES.map((cat) => {
      const count = countMap[cat.id] || 0;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return {
        ...cat,
        count,
        percent
      };
    }).filter((c) => c.count > 0);

    // Tính toán góc vẽ biểu đồ tròn (Pie Angles)
    let currentAngle = 0;
    const slices = categoriesWithData.map((cat) => {
      const sliceAngle = (cat.count / Math.max(1, total)) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      return {
        ...cat,
        startAngle,
        endAngle,
        middleAngle: startAngle + sliceAngle / 2
      };
    });

    // Thống kê tổng quan
    const praiseCount = countMap['praise'] || 0;
    const complaintCount = total - praiseCount;
    const praisePercent = total > 0 ? (praiseCount / total) * 100 : 0;
    const complaintPercent = total > 0 ? (complaintCount / total) * 100 : 0;

    // Nhóm phàn nàn nhiều nhất
    const complaintSlices = slices.filter((s) => !s.isPraise);
    const topComplaint = complaintSlices.length > 0
      ? [...complaintSlices].sort((a, b) => b.count - a.count)[0]
      : null;

    return {
      total,
      slices,
      praiseCount,
      complaintCount,
      praisePercent,
      complaintPercent,
      topComplaint
    };
  }, [classifiedComments]);

  // 3. Danh sách comment hiển thị theo bộ lọc
  const filteredComments = useMemo(() => {
    let list = classifiedComments;

    if (selectedCategory) {
      list = list.filter((c) => c.categoryId === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.detail.toLowerCase().includes(q) ||
          c.student?.toLowerCase().includes(q) ||
          c.customer?.toLowerCase().includes(q) ||
          c.facility?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [classifiedComments, selectedCategory, searchTerm]);

  // Chi tiết nhóm đang được chọn hoặc hover
  const activeCategoryInfo = useMemo(() => {
    const targetId = hoveredCategory || selectedCategory;
    if (!targetId) return null;
    return SENTIMENT_CATEGORIES.find((c) => c.id === targetId) || null;
  }, [hoveredCategory, selectedCategory]);

  return (
    <section className="panel comment-sentiment-panel bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden my-6">
      {/* Header bar */}
      <div className="panel-head p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
              PHÂN TÍCH Ý KIẾN PHỤ HUYNH
            </span>
            <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {categoryStats.total} Nhận xét chi tiết
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Biểu đồ phân loại nhận xét khen ngợi & các nhóm lỗi phàn nàn
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Tự động đọc nội dung phản hồi của phụ huynh: <strong>Toàn bộ lời khen ngợi được gom vào 1 miếng quạt màu xanh</strong>,
            đồng thời bóc tách chi tiết các nhóm vấn đề phụ huynh phàn nàn để quản lý dễ dàng kiểm tra và cải tiến chất lượng.
          </p>
        </div>

        {/* Nút thu gọn / mở rộng */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng biểu đồ phân loại ý kiến' : 'Thu gọn biểu đồ'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4 text-emerald-600" />
                <span>Mở rộng biểu đồ</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-slate-600" />
                <span>Thu gọn lại</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dạng thu gọn (Mini Banner) */}
      {isCollapsed && (
        <div
          onClick={() => setIsCollapsed(false)}
          className="p-4 bg-emerald-50/30 flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer hover:bg-emerald-50/60 transition-colors"
          title="Bấm để mở rộng xem biểu đồ phân loại ý kiến"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-1 rounded-md border border-emerald-200">
              🟢 {categoryStats.praiseCount} Khen ngợi ({categoryStats.praisePercent.toFixed(1)}%)
            </span>
            <span className="font-bold text-rose-900 bg-rose-100/90 px-2.5 py-1 rounded-md border border-rose-200">
              ⚠️ {categoryStats.complaintCount} Phàn nàn ({categoryStats.complaintPercent.toFixed(1)}%)
            </span>
            {categoryStats.topComplaint && (
              <span className="text-slate-600">
                • Vấn đề phàn nàn nhiều nhất: <strong className="text-rose-700">{categoryStats.topComplaint.name}</strong> ({categoryStats.topComplaint.count} lượt)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dạng mở rộng: Toàn bộ biểu đồ tròn và danh sách nhận xét */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Main Content Grid: Pie Chart on Left (or Top), Comment Reader on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive SVG Donut / Pie Chart (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-emerald-600" />
                  Cơ cấu ý kiến phụ huynh
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  Di chuột / bấm vào miếng quạt để lọc
                </span>
              </div>

              {/* SVG Donut Chart */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
                <svg viewBox="0 0 280 280" className="w-full h-full transform -rotate-90">
                  {categoryStats.slices.map((slice) => {
                    const isHovered = hoveredCategory === slice.id;
                    const isSelected = selectedCategory === slice.id;
                    const isHighlighted = isHovered || isSelected;

                    // If highlighted, expand slightly
                    const outerR = isHighlighted ? 122 : 116;
                    const innerR = isHighlighted ? 64 : 68;

                    const pathData = describeArc(140, 140, outerR, innerR, slice.startAngle, slice.endAngle);

                    return (
                      <path
                        key={slice.id}
                        d={pathData}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                        onMouseEnter={() => setHoveredCategory(slice.id)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() =>
                          setSelectedCategory(selectedCategory === slice.id ? null : slice.id)
                        }
                        className="transition-all duration-200 cursor-pointer"
                        style={{
                          opacity:
                            selectedCategory && selectedCategory !== slice.id && !hoveredCategory
                              ? 0.4
                              : 1,
                          filter: isHighlighted ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none'
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {activeCategoryInfo ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        {activeCategoryInfo.shortName}
                      </span>
                      <span
                        className="text-2xl font-black"
                        style={{ color: activeCategoryInfo.color }}
                      >
                        {categoryStats.slices.find((s) => s.id === activeCategoryInfo.id)?.count || 0}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {categoryStats.slices.find((s) => s.id === activeCategoryInfo.id)?.percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Tổng nhận xét
                      </span>
                      <span className="text-3xl font-black text-slate-900">
                        {categoryStats.total}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full mt-0.5">
                        {categoryStats.praisePercent.toFixed(0)}% Khen
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend with interactive clicking */}
              <div className="w-full mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {categoryStats.slices.map((slice) => {
                  const isSelected = selectedCategory === slice.id;
                  const isHovered = hoveredCategory === slice.id;

                  return (
                    <button
                      key={slice.id}
                      type="button"
                      onMouseEnter={() => setHoveredCategory(slice.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() =>
                        setSelectedCategory(selectedCategory === slice.id ? null : slice.id)
                      }
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-white border-slate-400 font-bold shadow-2xs'
                          : isHovered
                          ? 'bg-white/80 border-slate-300'
                          : 'bg-transparent border-transparent hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate text-slate-800">
                          {slice.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-extrabold text-slate-900">{slice.count}</span>
                        <span className="text-[10px] text-slate-500 min-w-[36px] text-right font-medium">
                          {slice.percent.toFixed(1)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Reset filter button */}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>✕ Xóa bộ lọc nhóm (Hiển thị lại tất cả)</span>
                </button>
              )}
            </div>

            {/* Right Column: Detailed Comment Reader (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col h-full">
              {/* Header of reader */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Danh sách nhận xét chi tiết</span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {filteredComments.length} nhận xét
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCategory
                      ? `Đang xem: ${SENTIMENT_CATEGORIES.find((c) => c.id === selectedCategory)?.name}`
                      : 'Đang hiển thị tất cả các nhận xét'}
                  </p>
                </div>

                {/* Search input in comments */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm trong nhận xét..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Quick Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-colors cursor-pointer border ${
                    selectedCategory === null
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({categoryStats.total})
                </button>
                {categoryStats.slices.map((slice) => {
                  const isSelected = selectedCategory === slice.id;
                  return (
                    <button
                      key={slice.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(selectedCategory === slice.id ? null : slice.id)
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-colors cursor-pointer border flex items-center gap-1 ${
                        isSelected
                          ? 'text-white border-transparent shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      style={{
                        backgroundColor: isSelected ? slice.color : undefined
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isSelected ? '#ffffff' : slice.color }}
                      />
                      <span>{slice.shortName}</span>
                      <span className="opacity-80">({slice.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Comments Scrollable Stream */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1 mt-1">
                {filteredComments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Không tìm thấy nhận xét nào phù hợp
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Hãy thử đổi từ khóa tìm kiếm hoặc chọn nhóm khác
                    </p>
                  </div>
                ) : (
                  filteredComments.map((item, idx) => {
                    const cat = SENTIMENT_CATEGORIES.find((c) => c.id === item.categoryId) || SENTIMENT_CATEGORIES[0];
                    const rating = item.rating ?? 5;
                    const ratingColor =
                      rating === 5
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : rating === 4
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : rating === 3
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : rating === 2
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200';

                    return (
                      <div
                        key={item.student + idx}
                        className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                          cat.isPraise
                            ? 'bg-white border-slate-200/80 hover:border-emerald-300'
                            : 'bg-rose-50/20 border-rose-100 hover:border-rose-300'
                        }`}
                      >
                        {/* Meta top bar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Category Badge */}
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.shortName}
                            </span>

                            {/* Star Badge */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${ratingColor}`}>
                              ★ {rating} sao
                            </span>

                            <strong className="text-slate-900">
                              {item.student || 'Học viên'}
                            </strong>
                            {item.customer && (
                              <span className="text-slate-500">
                                (PH: {item.customer})
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400">
                            {formatDate(item.responseAt, true)}
                          </span>
                        </div>

                        {/* Location and Subject badges */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            🏢 {item.facility}
                          </span>
                          {item.subject && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.subject}
                            </span>
                          )}
                          {item.course && (
                            <span className="bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                              {item.course}
                            </span>
                          )}
                        </div>

                        {/* Comment text */}
                        <p className="text-slate-800 font-medium text-xs sm:text-sm pl-2 border-l-2 border-slate-300 py-0.5 mt-1 leading-relaxed">
                          “{item.detail}”
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
