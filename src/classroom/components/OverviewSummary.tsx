import React from 'react';
import { SpreadsheetData } from '../types/sheet';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Layers, 
  Users, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Building,
  Award
} from 'lucide-react';

interface Props {
  data: SpreadsheetData;
  onSelectSheet: (gid: string) => void;
}

export const OverviewSummary: React.FC<Props> = ({ data, onSelectSheet }) => {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;

  // Categories definition
  const categories = [
    {
      title: 'Điều phối ca trực & Nhu cầu nhân sự',
      badge: '3 Sheet Quản trị',
      color: 'sky',
      sheets: [
        {
          gid: '1382031587',
          name: 'Trực ca có lớp',
          desc: 'Đầu mối trực ban các ngày trong tuần (T2 - CN), số điện thoại Zalo, số hotline trực tiếp và người hỗ trợ dự phòng.'
        },
        {
          gid: '1078244780',
          name: 'Ca bổ sung nhân sự',
          desc: 'Tổng hợp nhu cầu bổ sung CTV theo từng cơ sở (ca đông, bé nhỏ, hỗ trợ admin) và tiến độ tiếp nhận của TPKD & HCNS.'
        },
        {
          gid: '467135540',
          name: 'NS trực theo tuần',
          desc: 'Bảng phân công nhân sự (Admin + CTV + HV) trực tại từng cơ sở theo ca sáng (08h-12h) và ca chiều tối (14h-20h30).'
        }
      ]
    },
    {
      title: 'Lịch giảng dạy Bộ môn Cờ Vua',
      badge: '8 Sheet Lịch dạy',
      color: 'emerald',
      sheets: [
        { gid: '1352554580', name: 'Thứ 2 - cờ', desc: 'Lịch dạy cờ Thứ 2 tại các cơ sở, phân bổ GV chính, GV phụ và cảnh báo sĩ số.' },
        { gid: '1446646864', name: 'Thứ 3 - cờ', desc: 'Lịch dạy cờ Thứ 3 tại các cơ sở, phân bổ GV chính, GV phụ và cảnh báo sĩ số.' },
        { gid: '288401433', name: 'Thứ 4 - cờ', desc: 'Lịch dạy cờ Thứ 4 tại các cơ sở, phân bổ GV chính, GV phụ và cảnh báo sĩ số.' },
        { gid: '1240592747', name: 'Thứ 5 - cờ', desc: 'Lịch dạy cờ Thứ 5 (sheet được link trong tài liệu ban đầu), theo dõi phân bổ giáo viên và sĩ số.', isHighlighted: true },
        { gid: '836638131', name: 'Thứ 6 - cờ', desc: 'Lịch dạy cờ Thứ 6 tại các cơ sở, phân bổ GV chính, GV phụ và cảnh báo sĩ số.' },
        { gid: '911844103', name: 'Thứ 7 - cờ', desc: 'Lịch dạy cờ Thứ 7 (ngày cao điểm cuối tuần) tại toàn bộ các cơ sở.' },
        { gid: '938910054', name: 'CN - cờ', desc: 'Lịch dạy cờ Chủ Nhật tại toàn bộ các cơ sở, ca sáng và ca chiều.' },
        { gid: '916330868', name: 'Thứ 7 - cờ 25/4', desc: 'Lịch dạy cờ đặc biệt ngày 25/04 kèm theo dõi tỷ lệ học viên đi học & % vắng.' }
      ]
    },
    {
      title: 'Lịch giảng dạy Lớp Vẽ / Mỹ thuật',
      badge: '8 Sheet Lịch dạy',
      color: 'purple',
      sheets: [
        { gid: '1432636374', name: 'Thứ 2 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 2 theo từng ca học và giáo viên phụ trách.' },
        { gid: '1971663577', name: 'Thứ 3 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 3 theo từng ca học và giáo viên phụ trách.' },
        { gid: '1846600678', name: 'Thứ 4 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 4 theo từng ca học và giáo viên phụ trách.' },
        { gid: '846230684', name: 'Thứ 5 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 5 theo từng ca học và giáo viên phụ trách.' },
        { gid: '1814508975', name: 'Thứ 6 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 6 theo từng ca học và giáo viên phụ trách.' },
        { gid: '858544709', name: 'Thứ 7 - vẽ', desc: 'Lịch dạy môn vẽ Thứ 7 tại các cơ sở An Phú, Bình Tân, Gò Vấp, Phú Nhuận...' },
        { gid: '159442386', name: 'CN - vẽ', desc: 'Lịch dạy môn vẽ Chủ Nhật với đầy đủ thông tin giáo viên và sĩ số.' },
        { gid: '486684010', name: 'Thứ 7 - vẽ 25/4', desc: 'Lịch dạy môn vẽ ngày 25/04 kèm danh sách đi học và % nghỉ.' }
      ]
    },
    {
      title: 'Danh bạ Nhân sự & Giáo viên',
      badge: '1 Sheet Dữ liệu lõi',
      color: 'amber',
      sheets: [
        {
          gid: '492309054',
          name: 'Ds GV',
          desc: 'Danh sách tổng hợp 466 giáo viên toàn hệ thống: Họ tên, Bậc GV (Bậc 01 - Bậc 3,5+), Phân loại (Full-time / Part-time môn Cờ hoặc Vẽ), Số điện thoại và Email làm việc.'
        }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đã phân tích toàn bộ 20 Sheet từ liên kết Google Sheets</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hệ thống Điều phối Lớp học & Nhân sự CLB Cờ Vua Sài Gòn
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Tài liệu quản lý toàn diện lịch giảng dạy môn Cờ vua & Lớp vẽ, ca trực cơ sở, cảnh báo thiếu giáo viên và hồ sơ liên hệ của hơn 466 giáo viên.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <a
              href={`${spreadsheetUrl}?gid=1240592747#gid=1240592747`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-900/30 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở Google Sheet gốc</span>
            </a>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Tổng số Sheet</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">20 Tabs</div>
            <div className="text-xs text-sky-400 mt-0.5">Đã đọc và nạp đầy đủ</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Danh bạ Giáo viên</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">466 GV</div>
            <div className="text-xs text-slate-400 mt-0.5">Full-time & Part-time</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-purple-400" />
              <span>Mạng lưới cơ sở</span>
            </div>
            <div className="text-2xl font-bold text-purple-400 mt-1">10+ Điểm</div>
            <div className="text-xs text-slate-400 mt-0.5">An Phú, Bình Tân, Gò Vấp...</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lịch dạy trong tuần</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1">T2 - CN</div>
            <div className="text-xs text-slate-400 mt-0.5">Cờ vua & Lớp vẽ song hành</div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-8">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {cat.badge}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.sheets.map((s) => {
                const sheetInfo = data.sheets[s.gid];
                const activeRows = sheetInfo ? sheetInfo.activeRowCount : 0;

                return (
                  <div
                    key={s.gid}
                    className={`group relative bg-slate-800/90 hover:bg-slate-750 border transition-all rounded-xl p-5 flex flex-col justify-between shadow-lg cursor-pointer ${
                      (s as any).isHighlighted 
                        ? 'border-sky-500/80 ring-1 ring-sky-500/40' 
                        : 'border-slate-700/80 hover:border-slate-600'
                    }`}
                    onClick={() => onSelectSheet(s.gid)}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className={`w-4 h-4 ${
                            cat.color === 'sky' ? 'text-sky-400' :
                            cat.color === 'emerald' ? 'text-emerald-400' :
                            cat.color === 'purple' ? 'text-purple-400' : 'text-amber-400'
                          }`} />
                          <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors">
                            {s.name}
                          </h4>
                        </div>
                        {(s as any).isHighlighted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white shadow-sm">
                            Link ban đầu
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                        {s.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">
                        {activeRows} dòng dữ liệu
                      </span>

                      <div className="flex items-center gap-1.5 text-sky-400 group-hover:translate-x-0.5 transition-transform font-medium">
                        <span>Xem chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
