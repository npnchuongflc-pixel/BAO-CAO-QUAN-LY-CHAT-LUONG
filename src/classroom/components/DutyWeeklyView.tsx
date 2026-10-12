import React, { useState } from 'react';
import { SheetDetail } from '../types/sheet';
import { 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  Calendar, 
  AlertCircle, 
  Building, 
  Download,
  Search
} from 'lucide-react';

interface Props {
  sheet: SheetDetail;
}

export const DutyWeeklyView: React.FC<Props> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  // 1. Trực ca có lớp
  if (sheet.gid === '1382031587') {
    const rows = sheet.rows.slice(1).filter(r => r.some(c => c.trim()));
    const filteredRows = rows.filter(r => {
      if (!searchTerm) return true;
      return r.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-[#1A3A5C]/80 border border-[#1B5EA6]/60 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1B5EA6]/30 text-[#3EA8E0] rounded-xl border border-[#3EA8E0]/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Đầu mối trực ca có lớp & Hotline hỗ trợ</h3>
              <p className="text-sm text-[#3EA8E0]/90">
                Nhân sự trực chính tiếp nhận xử lý sự cố lớp học, liên hệ zalo và số trực tiếp khẩn cấp
              </p>
            </div>
          </div>
          <button
            onClick={exportCurrentCsv}
            className="flex items-center gap-1.5 bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[#3EA8E0]/30 transition-colors"
          >
            <Download className="w-4 h-4 text-[#3EA8E0]" />
            <span>Tải CSV</span>
          </button>
        </div>

        {/* Filter */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo thứ, ca trực, tên người trực..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A3A5C] border border-[#1B5EA6]/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#3EA8E0]"
          />
        </div>

        {/* Table */}
        <div className="bg-[#1A3A5C]/60 border border-[#1B5EA6]/40 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#1A3A5C] border-b border-[#1B5EA6]/40 text-[#3EA8E0] font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4 min-w-[100px]">Thứ</th>
                  <th className="py-3 px-4 min-w-[130px]">Ca trực</th>
                  <th className="py-3 px-4 min-w-[150px]">Người trực</th>
                  <th className="py-3 px-4 min-w-[180px]">SĐT Zalo</th>
                  <th className="py-3 px-4 min-w-[150px]">SĐT Trực tiếp</th>
                  <th className="py-3 px-4 min-w-[180px]">Hỗ trợ dự phòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B5EA6]/20">
                {filteredRows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#1B5EA6]/15 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{r[0] || '-'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#3EA8E0]">
                      <span className="bg-[#1B5EA6]/25 px-2 py-1 rounded border border-[#1B5EA6]/40">{r[1] || '-'}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#4CAF8A] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#4CAF8A]" />
                      <span>{r[2] || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">{r[3] || '-'}</td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {r[4] ? (
                        <a href={`tel:${r[4]}`} className="inline-flex items-center gap-1 text-[#3EA8E0] hover:underline font-semibold">
                          <Phone className="w-3 h-3" />
                          <span>{r[4]}</span>
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-[#F9C846] text-xs">{r[5] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. Ca bổ sung nhân sự
  if (sheet.gid === '1078244780') {
    const dataRows = sheet.rows.slice(3).filter(r => r.some(c => c.trim()));
    const filteredRows = dataRows.filter(r => {
      if (!searchTerm) return true;
      return r.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div className="space-y-6">
        <div className="bg-[#1A3A5C]/80 border border-[#F2775A]/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F2775A]/20 text-[#F2775A] rounded-xl border border-[#F2775A]/40">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tổng hợp nhu cầu bổ sung Cộng tác viên (CTV)</h3>
              <p className="text-sm text-[#F9C846]">
                Theo dõi các cơ sở đông học viên, ca phát sinh bé test cần điều động thêm nhân sự hỗ trợ
              </p>
            </div>
          </div>
          <button
            onClick={exportCurrentCsv}
            className="flex items-center gap-1.5 bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[#1B5EA6]/50 transition-colors"
          >
            <Download className="w-4 h-4 text-[#3EA8E0]" />
            <span>Tải CSV</span>
          </button>
        </div>

        {/* Filter */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo cơ sở, ghi chú lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A3A5C] border border-[#1B5EA6]/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#3EA8E0]"
          />
        </div>

        {/* Table */}
        <div className="bg-[#1A3A5C]/60 border border-[#1B5EA6]/40 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#1A3A5C] border-b border-[#1B5EA6]/40 text-[#3EA8E0] font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-4">Cơ sở</th>
                  <th className="py-3 px-3">Phân loại</th>
                  <th className="py-3 px-3">SL HV / ca</th>
                  <th className="py-3 px-3">Ca cần thêm</th>
                  <th className="py-3 px-4 min-w-[200px]">Ghi chú tình trạng</th>
                  <th className="py-3 px-3">Ngày cần</th>
                  <th className="py-3 px-3">TPKD tiếp nhận</th>
                  <th className="py-3 px-3">HCNS tiếp nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B5EA6]/20">
                {filteredRows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#1B5EA6]/15 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#4CAF8A]/20 text-[#4CAF8A] border border-[#4CAF8A]/40">
                        {r[0] || 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#9B7FD4]" />
                      <span>{r[1] || '-'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{r[2] || '-'}</td>
                    <td className="py-3 px-3 font-semibold text-[#3EA8E0]">{r[3] || '-'}</td>
                    <td className="py-3 px-3 text-[#F9C846] font-medium">{r[4] || '-'}</td>
                    <td className="py-3 px-4 text-slate-200 text-xs max-w-xs">{r[5] || '-'}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">{r[6] || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${r[7] === 'ok' ? 'bg-[#4CAF8A]/20 text-[#4CAF8A]' : 'text-slate-500'}`}>
                        {r[7] || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${r[8] === 'ok' ? 'bg-[#4CAF8A]/20 text-[#4CAF8A]' : 'text-slate-500'}`}>
                        {r[8] || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. NS trực theo tuần (gid: 467135540)
  const dateHeaders = sheet.rows[0] || [];
  const dutyRows = sheet.rows.slice(2).filter(r => r.some(c => c.trim()));

  const filteredDutyRows = dutyRows.filter(r => {
    if (!searchTerm) return true;
    return r.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#1A3A5C]/80 border border-[#9B7FD4]/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#9B7FD4]/20 text-[#9B7FD4] rounded-xl border border-[#9B7FD4]/40">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Lịch phân công Nhân sự & Admin trực tuần</h3>
            <p className="text-sm text-[#9B7FD4]/90">
              Chi tiết lịch trực cơ sở theo từng ca từ Thứ 2 đến Chủ Nhật ({dateHeaders[0]} → {dateHeaders[6] || ''})
            </p>
          </div>
        </div>
        <button
          onClick={exportCurrentCsv}
          className="flex items-center gap-1.5 bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[#3EA8E0]/30 transition-colors"
        >
          <Download className="w-4 h-4 text-[#3EA8E0]" />
          <span>Tải CSV</span>
        </button>
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo tên Admin, CTV, cơ sở..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#1A3A5C] border border-[#1B5EA6]/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#3EA8E0]"
        />
      </div>

      {/* Duty Grid */}
      <div className="bg-[#1A3A5C]/60 border border-[#1B5EA6]/40 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#1A3A5C] border-b border-[#1B5EA6]/40">
              <tr>
                <th className="py-3 px-3 min-w-[120px] text-slate-300 uppercase font-semibold">Cơ sở</th>
                <th className="py-3 px-3 min-w-[110px] text-slate-300 uppercase font-semibold">Ca trực</th>
                <th className="py-3 px-3 min-w-[180px] text-[#3EA8E0] uppercase font-semibold">Thứ 2 ({dateHeaders[0] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#3EA8E0] uppercase font-semibold">Thứ 3 ({dateHeaders[1] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#3EA8E0] uppercase font-semibold">Thứ 4 ({dateHeaders[2] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#3EA8E0] uppercase font-semibold">Thứ 5 ({dateHeaders[3] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#3EA8E0] uppercase font-semibold">Thứ 6 ({dateHeaders[4] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#4CAF8A] uppercase font-semibold">Thứ 7 ({dateHeaders[5] || ''})</th>
                <th className="py-3 px-3 min-w-[180px] text-[#4CAF8A] uppercase font-semibold">Chủ Nhật ({dateHeaders[6] || ''})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B5EA6]/20">
              {filteredDutyRows.map((r, i) => {
                const campus = r[0] || '';
                const shift = r[1] || '';

                return (
                  <tr key={i} className="hover:bg-[#1B5EA6]/15 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100 bg-[#1A3A5C]/40">
                      {campus}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      <span className="bg-[#1B5EA6]/25 px-2 py-0.5 rounded border border-[#1B5EA6]/40 text-[#3EA8E0]">
                        {shift}
                      </span>
                    </td>
                    {/* T2 to CN are r[2] to r[8] */}
                    {[2, 3, 4, 5, 6, 7, 8].map((colIdx) => {
                      const val = r[colIdx]?.trim();
                      const isAlert = val?.toLowerCase().includes('thiếu') || val?.toLowerCase().includes('gấp');

                      return (
                        <td 
                          key={colIdx} 
                          className={`py-2 px-2.5 align-top ${
                            isAlert ? 'bg-[#F2775A]/20 text-[#F2775A] font-medium' : 'text-slate-200'
                          }`}
                        >
                          {val ? (
                            <div className="line-clamp-3 hover:line-clamp-none transition-all">
                              {val}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
