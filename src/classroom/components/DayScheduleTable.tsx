import React, { useState, useMemo } from 'react';
import { ClassDetailItem } from '../utils/dayDataProcessor';
import { 
  Search, 
  Filter, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  GraduationCap, 
  Palette, 
  Users,
  Download
} from 'lucide-react';
import { getCampusColor } from '../utils/campusColors';

interface Props {
  classList: ClassDetailItem[];
  dayName: string;
  allCampuses: string[];
}

export const DayScheduleTable: React.FC<Props> = ({
  classList,
  dayName,
  allCampuses
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'Cờ vua' | 'Lớp vẽ'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'opened' | 'missing' | 'closed'>('all');

  const filteredList = useMemo(() => {
    return classList.filter(item => {
      if (selectedCampus !== 'all' && item.campus !== selectedCampus) return false;
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;

      if (statusFilter === 'opened' && !item.tinhTrangLop.includes('Đã mở')) return false;
      if (statusFilter === 'closed' && item.tinhTrangLop.includes('Đã mở')) return false;
      if (statusFilter === 'missing' && item.canhBao !== 'Thiếu') return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const text = `${item.campus} ${item.timeSlot} ${item.subject} ${item.gvChinh} ${item.gvThu2} ${item.gvThu3}`.toLowerCase();
        return text.includes(q);
      }

      return true;
    });
  }, [classList, selectedCampus, subjectFilter, statusFilter, searchTerm]);

  const exportCsv = () => {
    const headers = ['Môn học', 'Cơ sở', 'Khung giờ', 'SL Học viên', 'SL GV cần', 'GV có', 'Tình trạng', 'Cảnh báo', 'GV chính', 'GV thứ 2', 'GV thứ 3'];
    const rows = filteredList.map(item => [
      item.subject,
      item.campus,
      item.timeSlot,
      item.slHv,
      item.slGvCan,
      item.gvCo,
      item.tinhTrangLop,
      item.canhBao,
      item.gvChinh,
      item.gvThu2,
      item.gvThu3
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers, ...rows].map(e => e.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lich_hoc_${dayName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Danh sách Chi tiết Ca học ({dayName})</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredList.length} ca
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dữ liệu tổng hợp song song từ cả 2 sheet Cờ vua & Lớp vẽ của {dayName}
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="self-start md:self-auto flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Tải danh sách CSV</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên GV, cơ sở..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-1">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Môn học: Tất cả</option>
            <option value="Cờ vua">♟️ Cờ vua</option>
            <option value="Lớp vẽ">🎨 Lớp vẽ</option>
          </select>
        </div>

        {/* Campus Filter */}
        <div className="flex items-center gap-1">
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tất cả cơ sở ({allCampuses.length})</option>
            {allCampuses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="opened">Đã mở lớp</option>
            <option value="missing">⚠️ Chỉ ca Thiếu GV</option>
            <option value="closed">Chưa mở lớp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-slate-800 rounded-xl">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 min-w-[90px]">Môn</th>
                <th className="py-2.5 px-4 min-w-[150px]">Cơ sở</th>
                <th className="py-2.5 px-3 min-w-[120px]">Khung giờ</th>
                <th className="py-2.5 px-3 text-center min-w-[70px]">SL HV</th>
                <th className="py-2.5 px-3 text-center min-w-[70px]">GV Cần</th>
                <th className="py-2.5 px-3 text-center min-w-[70px]">GV Có</th>
                <th className="py-2.5 px-3 text-center min-w-[100px]">Tình trạng</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">Cảnh báo</th>
                <th className="py-2.5 px-4 min-w-[180px]">Giáo viên chính</th>
                <th className="py-2.5 px-4 min-w-[180px]">Giáo viên thứ 2/3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    Không tìm thấy ca học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isMissing = item.canhBao === 'Thiếu';
                  const isClosed = !item.tinhTrangLop.includes('Đã mở');
                  const campColor = getCampusColor(item.campus);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMissing ? 'bg-amber-500/10' : isClosed ? 'opacity-40 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* Subject */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                          item.subject === 'Cờ vua'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}>
                          {item.subject === 'Cờ vua' ? <GraduationCap className="w-3 h-3" /> : <Palette className="w-3 h-3" />}
                          <span>{item.subject}</span>
                        </span>
                      </td>

                      {/* Campus */}
                      <td className="py-2.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/30"
                          style={{ backgroundColor: campColor.hex }}
                        />
                        <span>{item.campus}</span>
                      </td>

                      {/* Time slot */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.timeSlot}
                        </span>
                      </td>

                      {/* SL HV */}
                      <td className="py-2.5 px-3 text-center font-bold font-mono">
                        {item.slHv > 0 ? (
                          <span className="text-emerald-400">{item.slHv}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      {/* GV Cần */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {item.slGvCan}
                      </td>

                      {/* GV Có */}
                      <td className="py-2.5 px-3 text-center font-bold font-mono">
                        <span className={isMissing ? 'text-amber-400' : 'text-slate-200'}>
                          {item.gvCo}
                        </span>
                      </td>

                      {/* Tình trạng */}
                      <td className="py-2.5 px-3 text-center">
                        {item.tinhTrangLop.includes('Đã mở') ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Đã mở lớp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] text-slate-500 bg-slate-800">
                            Chưa mở
                          </span>
                        )}
                      </td>

                      {/* Cảnh báo */}
                      <td className="py-2.5 px-3 text-center">
                        {isMissing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Thiếu GV
                          </span>
                        ) : (
                          <span className="text-slate-500">Đủ</span>
                        )}
                      </td>

                      {/* GV Chính */}
                      <td className="py-2.5 px-4 text-sky-300 font-medium">
                        {item.gvChinh ? (
                          <div className="truncate max-w-[220px]" title={item.gvChinh}>
                            {item.gvChinh}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Trống</span>
                        )}
                      </td>

                      {/* GV Thứ 2 / 3 / 4 */}
                      <td className="py-2.5 px-4 text-indigo-300">
                        {[item.gvThu2, item.gvThu3, item.gvThu4].filter(Boolean).length > 0 ? (
                          <div className="truncate max-w-[220px]">
                            {[item.gvThu2, item.gvThu3, item.gvThu4].filter(Boolean).join(' | ')}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
