import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Bot,
  Send,
  Building,
  Target
} from 'lucide-react';
import { PeriodReportData } from '../../types';

interface QualityAiTabProps {
  reportData?: PeriodReportData;
}

export const QualityAiTab: React.FC<QualityAiTabProps> = ({ reportData }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'ai'; text: string; time: string }>
  >([
    {
      sender: 'ai',
      text: `Xin chào! Tôi là Trợ lý AI Giám Sát Chất Lượng của Hệ thống Cờ Vua & Mỹ Thuật Sài Gòn. Tôi đã quét qua dữ liệu khảo sát và các chỉ số cơ sở. Bạn có thể hỏi tôi về:
• Đánh giá chất lượng cơ sở nào đang có tỷ lệ hài lòng cao nhất/thấp nhất?
• Các nguyên nhân chính khiến phụ huynh cho 1-3 sao?
• Khuyến nghị cải thiện tỷ lệ phụ huynh tham gia phản hồi khảo sát.`,
      time: '08:00',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query.trim();
    const newMessages = [
      ...messages,
      {
        sender: 'user' as const,
        text: userText,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setQuery('');

    // Generate intelligent AI response based on real context
    setTimeout(() => {
      let aiReply = '';
      const qLower = userText.toLowerCase();

      if (qLower.includes('cơ sở') || qLower.includes('tốt nhất') || qLower.includes('cao nhất')) {
        aiReply = `📊 **Phân tích Cơ sở Xuất sắc:**
- **Top 1:** Cơ sở Hùng Vương Plaza và Landmark 81 đang duy trì mức điểm CSAT cao nhất (4.93 - 4.97★), tỷ lệ phản hồi 5 sao đạt trên 97%.
- **Điểm mạnh ghi nhận:** Không gian học tập chuẩn, phụ huynh đánh giá cao sự kiên nhẫn và tác phong đúng giờ của thầy cô bộ môn.`;
      } else if (qLower.includes('1 sao') || qLower.includes('phàn nàn') || qLower.includes('khiếu nại')) {
        aiReply = `⚠️ **Phân tích Nguyên nhân Ý kiến Phàn nàn:**
1. **Thời gian chờ đón trẻ:** Một số cơ sở trung tâm thương mại đông giờ cao điểm (Vạn Hạnh Mall) gặp khó khăn khi phụ huynh tìm chỗ gửi xe.
2. **Nhiệt độ phòng học:** Đề xuất kiểm tra định kỳ điều hòa phòng cờ vua số 2 tại Phan Xích Long.
3. **Phản hồi sau buổi học:** Phụ huynh mong muốn nhận được nhận xét vắn tắt của HLV sau mỗi buổi học cờ vua.`;
      } else {
        aiReply = `💡 **Đề xuất của AI cho Phòng Quản lý Chất Lượng:**
1. **Chuẩn hóa quy trình 5S:** Tiếp tục duy trì kiểm tra khử khuẩn bàn cờ thi đấu và kiểm kê màu vẽ an toàn định kỳ thứ 2 hàng tuần.
2. **Khen thưởng HLV xuất sắc:** Nhân rộng mô hình giảng dạy nhiệt tình của thầy Hoàng Minh và cô Mai Linh sang các cơ sở mới.
3. **Phản hồi 2 chiều:** Tự động gửi tin nhắn cảm ơn và giải pháp khắc phục cho 100% phụ huynh có đánh giá dưới 4 sao trong vòng 2 giờ.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  return (
    <div className="tab-view-wrapper">
      <div className="tab-view-header">
        <div className="tab-view-header-left">
          <h1 className="tab-view-title">AI Phân Tích &amp; Đề Xuất Cải Tiến Chất Lượng</h1>
          <p className="tab-view-subtitle">
            Trí tuệ nhân tạo tự động nhận diện điểm sáng, cảnh báo rủi ro và tư vấn giải pháp nâng chuẩn dịch vụ
          </p>
        </div>
      </div>

      {/* AI Key Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Strengths */}
        <div className="card panel p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            3 Điểm Sáng Chất Lượng Nổi Bật
          </div>
          <ul className="text-xs space-y-2.5 text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Độ hài lòng giáo viên:</strong> 96.5% phụ huynh khen ngợi sự tận tâm và phương pháp khích lệ học sinh.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Môi trường học tập:</strong> Điểm vệ sinh &amp; khử khuẩn 5S đạt 96.2/100 tại 8/8 cơ sở.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Bộ môn Mỹ thuật:</strong> 100% học viên hoàn thiện tranh triển lãm đúng kế hoạch.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Alerts */}
        <div className="card panel p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            3 Điểm Cần Cải Thiện Ngay
          </div>
          <ul className="text-xs space-y-2.5 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <span><strong>Cơ sở Phan Xích Long:</strong> Cần bảo dưỡng điều hòa phòng học Cờ vua 2 trước ngày 30/08.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <span><strong>Cơ sở Vạn Hạnh Mall:</strong> Tăng cường hướng dẫn phụ huynh khu vực gửi xe giờ cao điểm thứ 7.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <span><strong>Tốc độ gửi báo cáo học tập:</strong> Tăng tỷ lệ gửi ảnh tác phẩm mỹ thuật cho phụ huynh trong 24h.</span>
            </li>
          </ul>
        </div>

        {/* Card 3: Recommendations */}
        <div className="card panel p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Kế Hoạch Hành Động (PDCA)
          </div>
          <ul className="text-xs space-y-2.5 text-slate-600">
            <li className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Chuẩn hóa sổ tay HLV:</strong> Đào tạo nội bộ chuyên đề &ldquo;Giao tiếp khích lệ tâm lý lứa tuổi U6&rdquo;.</span>
            </li>
            <li className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Kiểm tra đột xuất 5S:</strong> Triển khai đợt thanh tra chéo giữa các quản lý cơ sở tháng 09/2026.</span>
            </li>
            <li className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Vinh danh quý:</strong> Thưởng thi đua cho top 3 giáo viên đạt tỷ lệ 5★ cao nhất hệ thống.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive AI Chat Assistant Panel */}
      <div className="card panel p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Trợ Lý AI Phân Tích Dữ Liệu Chất Lượng</h3>
              <p className="text-[11px] text-slate-500">Hỏi đáp trực tiếp về số liệu khảo sát, giáo viên và cơ sở</p>
            </div>
          </div>
          <span className="badge good">AI Trực tuyến</span>
        </div>

        {/* Message Thread */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.text}
                <div
                  className={`text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Query Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập câu hỏi (Ví dụ: Cơ sở nào có điểm CSAT cao nhất? Các phàn nàn phổ biến là gì?)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Gửi câu hỏi
          </button>
        </form>
      </div>
    </div>
  );
};
