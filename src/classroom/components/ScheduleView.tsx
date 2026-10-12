import React, { useState, useMemo } from 'react';
import { SheetDetail } from '../types/sheet';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  Download,
  GraduationCap
} from 'lucide-react';

interface Props {
  sheet: SheetDetail;
}

export const ScheduleView: React.FC<Props> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'ok' | 'open' | 'closed'>('all');

  // Process rows
  const parsedData = useMemo(() => {
    if (!sheet.rows || sheet.rows.length < 2) return { headers: [], records: [], dateStr: '', dayStr: '' };

    // Usually Row 0: ['Nhân sự bố trí cho ngày:' or empty, '01-10-2026', 'T 5', ...]
    const dateRow = sheet.rows[0] || [];
    let dateStr = '';
    let dayStr = '';
    for (const cell of dateRow) {
      if (/\d{2}-\d{2}-\d{4}/.test(cell)) dateStr = cell;
      if (/^(T\s*\d|CN)/i.test(cell)) dayStr = cell;
    }

    // Row 1 or 2 is header
    // Let's find row index that has "Cơ sở" and "Ca dạy"
    let headerIdx = 1;
    for (let i = 0; i < Math.min(5, sheet.rows.length); i++) {
      const row = sheet.rows[i];
      if (row.some(c => c.toLowerCase().includes('cơ sở') || c.toLowerCase().includes('ca dạy'))) {
        headerIdx = i;
        break;
      }
    }

    const headers = sheet.rows[headerIdx] || [];
    const dataRows = sheet.rows.slice(headerIdx + 1);

    let currentCampus = '';
    const records = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.every(c => !c.trim())) continue;

      const campusCell = row[0]?.trim();
      if (campusCell) {
        currentCampus = campusCell;
      }

      const caDay = row[1]?.trim() || '';
      const slHv = row[2]?.trim() || '0';
      const slGvCan = row[3]?.trim() || '0';
      
      // Some sheets have "Ghi chú" at index 4 or "% VẮNG"
      // Let's dynamically map based on headers
      const tinhTrangLopIdx = headers.findIndex(h => h.toLowerCase().includes('tình trạng'));
      const gvCoIdx = headers.findIndex(h => h.toLowerCase().includes('gv có'));
      const canhBaoIdx = headers.findIndex(h => h.toLowerCase().includes('cảnh báo'));
      const gvChinhIdx = headers.findIndex(h => h.toLowerCase().includes('gv chính'));
      const gvThu2Idx = headers.findIndex(h => h.toLowerCase().includes('gv thứ 2'));
      const gvThu3Idx = headers.findIndex(h => h.toLowerCase().includes('gv thứ 3'));

      const tinhTrangLop = tinhTrangLopIdx !== -1 ? row[tinhTrangLopIdx]?.trim() : (row[4]?.trim() || '');
      const gvCo = gvCoIdx !== -1 ? row[gvCoIdx]?.trim() : (row[5]?.trim() || '0');
      const canhBao = canhBaoIdx !== -1 ? row[canhBaoIdx]?.trim() : (row[6]?.trim() || '');
      
      const gvChinh = gvChinhIdx !== -1 ? row[gvChinhIdx]?.trim() : (row[7]?.trim() || '');
      const gvThu2 = gvThu2Idx !== -1 ? row[gvThu2Idx]?.trim() : (row[8]?.trim() || '');
      const gvThu3 = gvThu3Idx !== -1 ? row[gvThu3Idx]?.trim() : (row[9]?.trim() || '');

      if (!caDay && !currentCampus) continue;

      records.push({
        id: i,
        campus: currentCampus || 'Không xác định',
        caDay,
        slHv: parseInt(slHv, 10) || 0,
        slGvCan: parseInt(slGvCan, 10) || 0,
        tinhTrangLop: tinhTrangLop || (parseInt(slHv, 10) > 0 ? 'Đã mở lớp' : 'Chưa mở lớp'),
        gvCo: parseInt(gvCo, 10) || 0,
        canhBao: canhBao.toLowerCase().includes('thiếu') ? 'Thiếu' : (canhBao || 'Đủ'),
        gvChinh,
        gvThu2,
        gvThu3,
        rawRow: row
      });
    }

    return { headers, records, dateStr, dayStr };
  }, [sheet]);

  // Unique campuses
  const campuses = useMemo(() => {
    const list = Array.from(new Set(parsedData.records.map(r => r.campus).filter(Boolean)));
    return list.sort();
  }, [parsedData.records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return parsedData.records.filter(item => {
      if (selectedCampus !== 'all' && item.campus !== selectedCampus) return false;
      
      if (statusFilter === 'alert' && item.canhBao !== 'Thiếu') return false;
      if (statusFilter === 'ok' && item.canhBao === 'Thiếu') return false;
      if (statusFilter === 'open' && !item.tinhTrangLop.includes('Đã mở')) return false;
      if (statusFilter === 'closed' && item.tinhTrangLop.includes('Đã mở')) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchText = `${item.campus} ${item.caDay} ${item.gvChinh} ${item.gvThu2} ${item.gvThu3} ${item.tinhTrangLop} ${item.canhBao}`.toLowerCase();
        return matchText.includes(q);
      }

      return true;
    });
  }, [parsedData.records, selectedCampus, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let totalHv = 0;
    let openedClasses = 0;
    let missingTeachers = 0;
    let totalTeachersAssigned = 0;

    parsedData.records.forEach(r => {
      totalHv += r.slHv;
      if (r.tinhTrangLop.includes('Đã mở')) openedClasses++;
      if (r.canhBao === 'Thiếu') missingTeachers++;
      if (r.gvChinh) totalTeachersAssigned++;
      if (r.gvThu2) totalTeachersAssigned++;
      if (r.gvThu3) totalTeachersAssigned++;
    });

    return { totalHv, openedClasses, missingTeachers, totalTeachersAssigned, totalSlots: parsedData.records.length };
  }, [parsedData.records]);

  const exportCurrentCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      sheet.rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${sheet.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ngày áp dụng</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white tracking-tight">
            {parsedData.dateStr || 'Theo lịch tuần'}
          </div>
          <div className="text-xs text-sky-400 font-medium mt-0.5">
            {parsedData.dayStr || sheet.name}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Lớp đang mở</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {stats.openedClasses} <span className="text-sm font-normal text-slate-400">/ {stats.totalSlots} ca</span>
          </div>
          <div className="text-xs text-emerald-400 font-medium mt-0.5">
            Tổng cộng {stats.totalHv} học viên
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cảnh báo thiếu GV</span>
            <AlertTriangle className={`w-4 h-4 ${stats.missingTeachers > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold ${stats.missingTeachers > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {stats.missingTeachers} ca
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {stats.missingTeachers > 0 ? 'Cần bổ sung nhân sự gấp' : 'Đã đủ giáo viên các ca'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cơ sở hoạt động</span>
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {campuses.length}
          </div>
          <div className="text-xs text-purple-400 font-medium mt-0.5">
            Điểm trường phủ sóng
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Lượt phân công GV</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {stats.totalTeachersAssigned}
          </div>
          <div className="text-xs text-blue-400 font-medium mt-0.5">
            Lượt giảng dạy trong ngày
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo cơ sở, ca dạy, tên GV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Campus Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">Tất cả cơ sở ({campuses.length})</option>
              {campuses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="alert">⚠️ Chỉ ca Thiếu GV ({stats.missingTeachers})</option>
              <option value="open">Đã mở lớp ({stats.openedClasses})</option>
              <option value="closed">Chưa mở lớp</option>
              <option value="ok">Đủ GV</option>
            </select>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportCurrentCsv}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            title="Tải bảng tính dưới dạng CSV"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Tải CSV</span>
          </button>
        </div>
      </div>

      {/* Main Schedule Table */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-300 font-semibold text-xs tracking-wider uppercase">
                <th className="py-3 px-4 min-w-[160px]">Cơ sở</th>
                <th className="py-3 px-3 min-w-[130px]">Ca dạy</th>
                <th className="py-3 px-3 text-center min-w-[70px]">SL HV</th>
                <th className="py-3 px-3 text-center min-w-[70px]">GV Cần</th>
                <th className="py-3 px-3 text-center min-w-[80px]">GV Có</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Tình trạng</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Cảnh báo</th>
                <th className="py-3 px-4 min-w-[200px]">GV Chính</th>
                <th className="py-3 px-4 min-w-[200px]">GV Thứ 2</th>
                <th className="py-3 px-4 min-w-[200px]">GV Thứ 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    Không tìm thấy ca dạy nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const isMissing = item.canhBao === 'Thiếu';
                  const isClosed = !item.tinhTrangLop.includes('Đã mở');

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-700/30 transition-colors ${
                        isMissing ? 'bg-amber-500/10' : isClosed ? 'opacity-50 bg-slate-900/30' : ''
                      }`}
                    >
                      {/* Campus */}
                      <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{item.campus}</span>
                      </td>

                      {/* Time slot */}
                      <td className="py-3 px-3 text-slate-200 font-mono text-xs">
                        <span className="bg-slate-900/60 px-2 py-1 rounded border border-slate-700">
                          {item.caDay || '-'}
                        </span>
                      </td>

                      {/* SL HV */}
                      <td className="py-3 px-3 text-center font-semibold text-slate-200">
                        {item.slHv > 0 ? (
                          <span className="text-emerald-400 font-bold">{item.slHv}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      {/* SL GV Cần */}
                      <td className="py-3 px-3 text-center text-slate-300">
                        {item.slGvCan}
                      </td>

                      {/* GV Có */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-semibold ${isMissing ? 'text-amber-400' : 'text-slate-300'}`}>
                          {item.gvCo}
                        </span>
                      </td>

                      {/* Tình trạng lớp */}
                      <td className="py-3 px-3 text-center">
                        {item.tinhTrangLop.includes('Đã mở') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã mở lớp
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30">
                            Chưa mở
                          </span>
                        )}
                      </td>

                      {/* Cảnh báo */}
                      <td className="py-3 px-3 text-center">
                        {isMissing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Thiếu GV
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/30 text-slate-300 border border-slate-600/20">
                            Đủ
                          </span>
                        )}
                      </td>

                      {/* GV Chính */}
                      <td className="py-3 px-4">
                        {item.gvChinh ? (
                          <div className="font-medium text-sky-300 bg-sky-950/30 px-2 py-1 rounded border border-sky-800/40 text-xs">
                            {item.gvChinh}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">Trống</span>
                        )}
                      </td>

                      {/* GV Thứ 2 */}
                      <td className="py-3 px-4">
                        {item.gvThu2 ? (
                          <div className="font-medium text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded border border-indigo-800/40 text-xs">
                            {item.gvThu2}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">-</span>
                        )}
                      </td>

                      {/* GV Thứ 3 */}
                      <td className="py-3 px-4">
                        {item.gvThu3 ? (
                          <div className="font-medium text-teal-300 bg-teal-950/30 px-2 py-1 rounded border border-teal-800/40 text-xs">
                            {item.gvThu3}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-900/60 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
          <span>Hiển thị {filteredRecords.length} / {parsedData.records.length} ca dạy</span>
          <span>Bấm Tải CSV để xuất dữ liệu bảng này</span>
        </div>
      </div>
    </div>
  );
};
