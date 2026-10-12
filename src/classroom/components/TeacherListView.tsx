import React, { useState, useMemo } from 'react';
import { SheetDetail } from '../types/sheet';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  Award, 
  Briefcase, 
  Download,
  Filter
} from 'lucide-react';

interface Props {
  sheet: SheetDetail;
}

export const TeacherListView: React.FC<Props> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Parse teachers
  const teachers = useMemo(() => {
    if (!sheet.rows || sheet.rows.length < 2) return [];

    const list = [];
    for (let i = 1; i < sheet.rows.length; i++) {
      const row = sheet.rows[i];
      if (!row || row.every(c => !c.trim())) continue;

      const stt = row[0]?.trim() || `${i}`;
      const name = row[1]?.trim() || '';
      const level = row[2]?.trim() || '';
      const role = row[3]?.trim() || '';
      const phone = row[4]?.trim() || '';
      const email = row[5]?.trim() || '';
      const tag = row[7]?.trim() || '';

      if (!name) continue;

      list.push({
        id: i,
        stt,
        name,
        level,
        role,
        phone,
        email,
        tag
      });
    }
    return list;
  }, [sheet]);

  // Unique roles & levels
  const roles = useMemo(() => {
    const set = new Set(teachers.map(t => t.role).filter(Boolean));
    return Array.from(set).sort();
  }, [teachers]);

  const levels = useMemo(() => {
    const set = new Set(teachers.map(t => t.level).filter(Boolean));
    return Array.from(set).sort();
  }, [teachers]);

  // Filtered
  const filtered = useMemo(() => {
    return teachers.filter(t => {
      if (roleFilter !== 'all' && t.role !== roleFilter) return false;
      if (levelFilter !== 'all' && t.level !== levelFilter) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const full = `${t.name} ${t.phone} ${t.email} ${t.level} ${t.role}`.toLowerCase();
        return full.includes(q);
      }
      return true;
    });
  }, [teachers, roleFilter, levelFilter, searchTerm]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const exportCurrentCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      sheet.rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Danh_sach_giao_vien.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {copiedText && (
        <div className="fixed bottom-6 right-6 bg-[#4CAF8A] text-[#1A3A5C] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-50 text-sm font-bold animate-fade-in border border-[#4CAF8A]/60">
          <Check className="w-4 h-4" />
          <span>Đã sao chép: {copiedText}</span>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1A3A5C]/90 to-[#1B5EA6]/15 border border-[#1B5EA6]/40 hover:border-[#3EA8E0]/60 rounded-2xl p-4.5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>Tổng số giáo viên</span>
            <div className="p-2 rounded-xl bg-[#3EA8E0]/15 text-[#3EA8E0] border border-[#3EA8E0]/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-[#3EA8E0] font-mono">
            {teachers.length}
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">
            Nhân sự trong danh bạ
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A3A5C]/90 to-[#1B5EA6]/15 border border-[#1B5EA6]/40 hover:border-[#F9C846]/60 rounded-2xl p-4.5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>Giáo viên Cờ Vua</span>
            <div className="p-2 rounded-xl bg-[#F9C846]/15 text-[#F9C846] border border-[#F9C846]/30">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-[#F9C846] font-mono">
            {teachers.filter(t => t.role.toLowerCase().includes('cờ')).length}
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">
            Bộ môn Cờ Vua
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A3A5C]/90 to-[#1B5EA6]/15 border border-[#1B5EA6]/40 hover:border-[#9B7FD4]/60 rounded-2xl p-4.5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>Giáo viên Môn Vẽ</span>
            <div className="p-2 rounded-xl bg-[#9B7FD4]/15 text-[#9B7FD4] border border-[#9B7FD4]/30">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-[#9B7FD4] font-mono">
            {teachers.filter(t => t.role.toLowerCase().includes('vẽ')).length}
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">
            Bộ môn Mỹ thuật / Vẽ
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A3A5C]/90 to-[#1B5EA6]/15 border border-[#1B5EA6]/40 hover:border-[#4CAF8A]/60 rounded-2xl p-4.5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>Bậc chuyên môn</span>
            <div className="p-2 rounded-xl bg-[#4CAF8A]/15 text-[#4CAF8A] border border-[#4CAF8A]/30">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-[#4CAF8A] font-mono">
            {levels.length} bậc
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">
            Từ Bậc 01 đến Bậc 3,5+
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1A3A5C]/85 backdrop-blur-md border border-[#1B5EA6]/50 rounded-2xl p-4.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên giáo viên, số điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1A3A5C] border border-[#1B5EA6]/60 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#3EA8E0] transition-colors"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#3EA8E0]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#1A3A5C] border border-[#1B5EA6]/50 text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3EA8E0]"
            >
              <option value="all">Tất cả phân loại ({roles.length})</option>
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#4CAF8A]" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-[#1A3A5C] border border-[#1B5EA6]/50 text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3EA8E0]"
            >
              <option value="all">Tất cả bậc GV ({levels.length})</option>
              {levels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={exportCurrentCsv}
          className="flex items-center gap-1.5 bg-[#1B5EA6] hover:bg-[#1B5EA6]/80 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 text-white" />
          <span>Tải danh sách CSV</span>
        </button>
      </div>

      {/* Teachers Table */}
      <div className="bg-[#1A3A5C]/85 backdrop-blur-md border border-[#1B5EA6]/40 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1A3A5C] border-b border-[#1B5EA6]/40 text-[#3EA8E0] font-bold text-xs tracking-wider uppercase">
                <th className="py-3 px-3 text-center w-16">STT</th>
                <th className="py-3 px-4 min-w-[200px]">Họ và Tên GV</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Bậc GV</th>
                <th className="py-3 px-3 min-w-[140px]">Phân loại</th>
                <th className="py-3 px-4 min-w-[160px]">Số điện thoại</th>
                <th className="py-3 px-4 min-w-[220px]">Email làm việc</th>
                <th className="py-3 px-3 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B5EA6]/20">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1B5EA6]/15 transition-colors">
                    {/* STT */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                      {t.stt}
                    </td>

                    {/* Họ tên */}
                    <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1B5EA6] text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {t.name.split(' ').pop()?.charAt(0) || 'G'}
                      </div>
                      <span>{t.name}</span>
                    </td>

                    {/* Bậc */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#1B5EA6]/25 text-[#3EA8E0] border border-[#1B5EA6]/50">
                        {t.level || 'Chưa xếp'}
                      </span>
                    </td>

                    {/* Phân loại */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        t.role.toLowerCase().includes('vẽ') 
                          ? 'bg-[#9B7FD4]/20 text-[#9B7FD4] border-[#9B7FD4]/40' 
                          : 'bg-[#4CAF8A]/20 text-[#4CAF8A] border-[#4CAF8A]/40'
                      }`}>
                        {t.role || 'Chưa phân'}
                      </span>
                    </td>

                    {/* SĐT */}
                    <td className="py-3 px-4">
                      {t.phone ? (
                        <div className="flex items-center gap-2 group">
                          <Phone className="w-3.5 h-3.5 text-[#3EA8E0] shrink-0" />
                          <span className="font-mono text-slate-200">{t.phone}</span>
                          <button
                            onClick={() => handleCopy(t.phone, 'Số điện thoại')}
                            className="opacity-0 group-hover:opacity-100 hover:text-[#3EA8E0] text-slate-400 transition-opacity p-0.5 rounded"
                            title="Sao chép SĐT"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Chưa có</span>
                      )}
                    </td>

                    {/* Mail */}
                    <td className="py-3 px-4">
                      {t.email ? (
                        <div className="flex items-center gap-2 group">
                          <Mail className="w-3.5 h-3.5 text-[#3EA8E0] shrink-0" />
                          <span className="text-slate-300 text-xs truncate max-w-[180px]">{t.email}</span>
                          <button
                            onClick={() => handleCopy(t.email, 'Email')}
                            className="opacity-0 group-hover:opacity-100 hover:text-[#3EA8E0] text-slate-400 transition-opacity p-0.5 rounded"
                            title="Sao chép Email"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Chưa có</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center">
                      {t.phone && (
                        <a
                          href={`tel:${t.phone}`}
                          className="inline-flex items-center justify-center p-1.5 bg-[#1A3A5C] hover:bg-[#1B5EA6] text-[#3EA8E0] hover:text-white rounded-lg transition-colors border border-[#1B5EA6]/40"
                          title="Gọi điện"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-[#1A3A5C] border-t border-[#1B5EA6]/40 text-xs text-slate-300 flex items-center justify-between">
          <span>Đang hiển thị {filtered.length} / {teachers.length} giáo viên</span>
          <span>Click vào biểu tượng copy để sao chép thông tin nhanh</span>
        </div>
      </div>
    </div>
  );
};
