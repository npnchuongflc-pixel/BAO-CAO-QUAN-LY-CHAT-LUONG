import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Users,
  Award,
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';

interface TeacherItem {
  id: string;
  name: string;
  avatarLetter: string;
  subject: 'Cờ Vua' | 'Mỹ Thuật';
  level: string;
  facilities: string[];
  totalStudents: number;
  totalClasses: number;
  csatScore: number; // 4.95
  fiveStarRate: number; // 98%
  commendations: number;
  badge: string;
  highlightNote: string;
}

const TEACHERS: TeacherItem[] = [
  {
    id: 'T01',
    name: 'Thầy Hoàng Minh',
    avatarLetter: 'HM',
    subject: 'Cờ Vua',
    level: 'HLV Trưởng - Kiện tướng Quốc gia',
    facilities: ['Hùng Vương Plaza', 'Sala Thủ Thiêm'],
    totalStudents: 48,
    totalClasses: 4,
    csatScore: 4.97,
    fiveStarRate: 98.5,
    commendations: 32,
    badge: 'HLV Xuất Sắc Nhất Tháng',
    highlightNote: 'Phương pháp truyền cảm hứng tốt, học sinh đạt giải cờ vua quận.',
  },
  {
    id: 'T02',
    name: 'Cô Mai Linh',
    avatarLetter: 'ML',
    subject: 'Mỹ Thuật',
    level: 'Giảng viên Mỹ thuật Sáng tạo',
    facilities: ['Hà Đô Centrosa', 'Masteri Thảo Điền'],
    totalStudents: 52,
    totalClasses: 4,
    csatScore: 4.95,
    fiveStarRate: 97.8,
    commendations: 29,
    badge: 'Sáng Tạo Tiêu Biểu',
    highlightNote: 'Phụ huynh đánh giá cao khả năng kiên nhẫn và hướng dẫn chi tiết cho trẻ nhỏ.',
  },
  {
    id: 'T03',
    name: 'Thầy Quang Huy',
    avatarLetter: 'QH',
    subject: 'Cờ Vua',
    level: 'Kiện tướng FIDE - Trọng tài quốc gia',
    facilities: ['Landmark 81', 'Estella Heights'],
    totalStudents: 42,
    totalClasses: 3,
    csatScore: 4.94,
    fiveStarRate: 97.2,
    commendations: 26,
    badge: 'Chuyên Môn Vàng',
    highlightNote: 'Giáo án chiến thuật bài bản, hướng dẫn khai cuộc và tàn cuộc chuẩn xác.',
  },
  {
    id: 'T04',
    name: 'Cô Thanh Trúc',
    avatarLetter: 'TT',
    subject: 'Mỹ Thuật',
    level: 'Họa sĩ - Cử nhân ĐH Mỹ Thuật',
    facilities: ['Masteri Thảo Điền', 'Landmark 81'],
    totalStudents: 45,
    totalClasses: 3,
    csatScore: 4.91,
    fiveStarRate: 96.5,
    commendations: 24,
    badge: 'Giáo Viên Tận Tâm',
    highlightNote: 'Lớp học sôi nổi, các bé tự tin thể hiện tác phẩm tranh sơn dầu và màu nước.',
  },
  {
    id: 'T05',
    name: 'Thầy Quốc Bảo',
    avatarLetter: 'QB',
    subject: 'Cờ Vua',
    level: 'HLV Cờ Vua Thiếu Nhi',
    facilities: ['Phan Xích Long', 'Vạn Hạnh Mall'],
    totalStudents: 38,
    totalClasses: 3,
    csatScore: 4.88,
    fiveStarRate: 95.0,
    commendations: 18,
    badge: 'Đạt Chuẩn Chuyên Môn',
    highlightNote: 'Nhiệt huyết, gắn kết phụ huynh sau mỗi buổi tập luyện.',
  },
  {
    id: 'T06',
    name: 'Thầy Đức Thịnh',
    avatarLetter: 'DT',
    subject: 'Mỹ Thuật',
    level: 'Giảng viên Điêu khắc & Thủ công',
    facilities: ['Estella Heights', 'Hùng Vương Plaza'],
    totalStudents: 36,
    totalClasses: 3,
    csatScore: 4.89,
    fiveStarRate: 95.8,
    commendations: 20,
    badge: 'Đạt Chuẩn Chuyên Môn',
    highlightNote: 'Các bài học thủ công sáng tạo 3D được các bạn nhỏ rất hào hứng.',
  },
];

export const TeacherRankingTab: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState<'all' | 'Cờ Vua' | 'Mỹ Thuật'>('all');
  const [search, setSearch] = useState('');

  const filteredTeachers = TEACHERS.filter((t) => {
    const matchSubject = activeSubject === 'all' || t.subject === activeSubject;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.facilities.some((f) => f.toLowerCase().includes(search.toLowerCase()));
    return matchSubject && matchSearch;
  });

  return (
    <div className="tab-view-wrapper">
      <div className="tab-view-header">
        <div className="tab-view-header-left">
          <h1 className="tab-view-title">Đánh Giá &amp; Bảng Vàng Giáo Viên</h1>
          <p className="tab-view-subtitle">
            Xếp hạng đội ngũ Huấn luyện viên Cờ vua &amp; Giáo viên Mỹ thuật dựa trên chỉ số CSAT phụ huynh
          </p>
        </div>
        <div className="tab-time-pills">
          <button
            type="button"
            className={`tab-time-pill ${activeSubject === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSubject('all')}
          >
            Tất cả HLV / GV ({TEACHERS.length})
          </button>
          <button
            type="button"
            className={`tab-time-pill ${activeSubject === 'Cờ Vua' ? 'active' : ''}`}
            onClick={() => setActiveSubject('Cờ Vua')}
          >
            Cờ Vua
          </button>
          <button
            type="button"
            className={`tab-time-pill ${activeSubject === 'Mỹ Thuật' ? 'active' : ''}`}
            onClick={() => setActiveSubject('Mỹ Thuật')}
          >
            Mỹ Thuật
          </button>
        </div>
      </div>

      {/* Top 3 Teacher Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TEACHERS.slice(0, 3).map((t, idx) => (
          <div
            key={t.id}
            className="card panel p-5 relative overflow-hidden border border-slate-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-white ${
                    idx === 0
                      ? 'bg-amber-500 shadow-amber-200 shadow-md'
                      : idx === 1
                      ? 'bg-blue-600 shadow-blue-200 shadow-md'
                      : 'bg-purple-600 shadow-purple-200 shadow-md'
                  }`}
                >
                  {t.avatarLetter}
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.level}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs">
                <Trophy className="w-3.5 h-3.5" />
                Hạng {idx + 1}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-slate-400">Điểm CSAT</div>
                <div className="font-bold text-blue-700 text-sm">{t.csatScore} ★</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Tỷ lệ 5★</div>
                <div className="font-bold text-emerald-600 text-sm">{t.fiveStarRate}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Lời khen</div>
                <div className="font-bold text-purple-700 text-sm">+{t.commendations}</div>
              </div>
            </div>

            <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg text-slate-600 italic">
              &ldquo;{t.highlightNote}&rdquo;
            </div>
          </div>
        ))}
      </div>

      {/* Full Teachers Table */}
      <div className="card panel facility-table-panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2>Bảng Đánh Giá Chi Tiết Toàn Bộ Giáo Viên</h2>
            <span>Chỉ số tổng hợp từ các đợt khảo sát phụ huynh gần nhất</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm tên giáo viên, cơ sở..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 pl-8 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 w-60"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-compact">Xếp hạng</th>
                <th className="col-customer">Giáo viên / Huấn luyện viên</th>
                <th className="col-subject">Bộ môn</th>
                <th className="col-facility">Cơ sở phụ trách</th>
                <th className="col-compact">Học viên</th>
                <th className="col-compact">Lớp dạy</th>
                <th className="col-compact">Điểm CSAT</th>
                <th className="col-compact">Tỷ lệ 5★</th>
                <th className="col-compact">Danh hiệu</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((item, index) => (
                <tr key={item.id}>
                  <td className="col-compact font-bold text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : index === 1
                          ? 'bg-slate-200 text-slate-800 font-bold'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700 font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="col-customer font-medium">
                    <strong>{item.name}</strong>
                    <div className="text-[11px] text-slate-400">{item.level}</div>
                  </td>
                  <td className="col-subject">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.subject === 'Cờ Vua'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {item.subject}
                    </span>
                  </td>
                  <td className="col-facility text-xs text-slate-600">
                    {item.facilities.join(', ')}
                  </td>
                  <td className="col-compact font-semibold">{item.totalStudents} hv</td>
                  <td className="col-compact">{item.totalClasses} lớp</td>
                  <td className="col-compact font-bold text-blue-700">{item.csatScore} ★</td>
                  <td className="col-compact font-semibold text-emerald-600">{item.fiveStarRate}%</td>
                  <td className="col-compact">
                    <span className="badge good">{item.badge}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
