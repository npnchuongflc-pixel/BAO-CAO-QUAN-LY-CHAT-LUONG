/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ProposalItem } from '../types/proposal';
import { DollarSign, Building, Wrench, CheckCircle2, TrendingUp } from 'lucide-react';

interface CostAnalysisViewProps {
  proposals: ProposalItem[];
  onSelectProposal: (item: ProposalItem) => void;
}

export function CostAnalysisView({ proposals, onSelectProposal }: CostAnalysisViewProps) {
  const formatVND = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Group costs by branch
  const branchCosts = useMemo(() => {
    const map = new Map<string, { totalCost: number; repairedCount: number; items: ProposalItem[] }>();

    proposals.forEach((p) => {
      const b = p.coSo.trim();
      const current = map.get(b) || { totalCost: 0, repairedCount: 0, items: [] };
      if (p.chiPhiThucTe) {
        current.totalCost += p.chiPhiThucTe;
      }
      if (p.trangThaiSuaChua.includes('xong')) {
        current.repairedCount += 1;
      }
      current.items.push(p);
      map.set(b, current);
    });

    return Array.from(map.entries())
      .map(([branch, data]) => ({ branch, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [proposals]);

  const totalCost = proposals.reduce((sum, p) => sum + (p.chiPhiThucTe || 0), 0);
  const itemsWithCost = proposals.filter((p) => p.chiPhiThucTe !== null && p.chiPhiThucTe > 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider block mb-1">
            Báo Cáo Chi Tiết Kinh Phí Sửa Chữa (Cột T Sheet "ĐỀ XUẤT")
          </span>
          <h2 className="text-2xl font-bold tracking-tight">
            {formatVND(totalCost)}
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            Tổng kinh phí thực tế đã thanh toán & nghiệm thu cho {itemsWithCost.length} hạng mục
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-xs border border-white/10 text-xs">
          <div>
            <span className="text-emerald-300 text-[10px] block">Cơ sở chi nhiều nhất:</span>
            <span className="font-bold text-white text-sm">
              {branchCosts[0]?.branch || 'Phổ Quang'} ({formatVND(branchCosts[0]?.totalCost || 0)})
            </span>
          </div>
        </div>
      </div>

      {/* Branch Cost Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branchCosts.map((item) => {
          const percent = totalCost > 0 ? Math.round((item.totalCost / totalCost) * 100) : 0;

          return (
            <div 
              key={item.branch}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Cơ sở {item.branch}
                </span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatVND(item.totalCost)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{item.repairedCount} hạng mục đã sửa</span>
                  <span>{percent}% tổng chi phí</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Cost Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Danh Mục Các Hạng Mục Đã Phát Sinh Kinh Phí
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chi tiết số tiền, ngày hoàn thành sửa chữa và kỹ thuật viên phụ trách
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            {itemsWithCost.length} hạng mục có hóa đơn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                <th className="py-3 px-4">Mã ĐX</th>
                <th className="py-3 px-3">Cơ Sở</th>
                <th className="py-3 px-4">Hạng Mục Sửa Chữa</th>
                <th className="py-3 px-3">Ngày Gửi ĐX</th>
                <th className="py-3 px-3">Ngày Sửa Xong</th>
                <th className="py-3 px-4 text-right">Kinh Phí Thực Tế</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsWithCost.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {item.coSo}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                    <div className="truncate font-bold">{item.vatPham}</div>
                    <div className="text-[11px] text-slate-500 truncate">{item.ghiChuKhacPhuc || item.phuongAn}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {item.ngay}
                  </td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-semibold">
                    {item.ngaySuaChua || 'Đã sửa xong'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                    {formatVND(item.chiPhiThucTe)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectProposal(item)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-[11px] font-semibold transition-colors"
                    >
                      Xem hồ sơ
                    </button>
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
