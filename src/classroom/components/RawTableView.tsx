import React, { useState, useMemo } from 'react';
import { SheetDetail } from '../types/sheet';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  sheet: SheetDetail;
}

export const RawTableView: React.FC<Props> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { headers, dataRows } = useMemo(() => {
    if (!sheet.rows || sheet.rows.length === 0) return { headers: [], dataRows: [] };
    
    // Find header row: first non-empty row
    let headerIdx = 0;
    while (headerIdx < sheet.rows.length && sheet.rows[headerIdx].every(c => !c.trim())) {
      headerIdx++;
    }
    const h = sheet.rows[headerIdx] || [];
    const rows = sheet.rows.slice(headerIdx + 1).filter(r => r.some(c => c.trim()));

    return { headers: h, dataRows: rows };
  }, [sheet]);

  const filtered = useMemo(() => {
    if (!searchTerm) return dataRows;
    const q = searchTerm.toLowerCase();
    return dataRows.filter(r => r.some(c => c.toLowerCase().includes(q)));
  }, [dataRows, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung trong sheet..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          onClick={exportCurrentCsv}
          className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span>Tải CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 text-slate-400">#</th>
                {headers.map((col, idx) => (
                  <th key={idx} className="py-2.5 px-3 font-semibold text-slate-200 min-w-[120px] whitespace-nowrap">
                    {col || `Cột ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} className="text-center py-10 text-slate-400">
                    Không tìm thấy dòng dữ liệu nào.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono">
                      {(page - 1) * pageSize + rIdx + 1}
                    </td>
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-200">
                        {row[cIdx] || ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-900/70 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Hiển thị {Math.min((page - 1) * pageSize + 1, filtered.length)} - {Math.min(page * pageSize, filtered.length)} / {filtered.length} dòng
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">Trang {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
