/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProposalItem } from '../types/proposal';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Wrench, 
  Check, 
  Layers, 
  Table as TableIcon,
  Hourglass,
  ArrowRight
} from 'lucide-react';

interface TimelineLeadTimeChartProps {
  proposals: ProposalItem[];
}

export function TimelineLeadTimeChart({ proposals }: TimelineLeadTimeChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Helper to parse "DD/MM/YYYY HH:mm" or "DD/MM/YYYY" to Date
  const parseDateTime = (dStr: string, tStr = '00:00'): Date | null => {
    if (!dStr) return null;
    try {
      const datePart = dStr.split(' ')[0];
      const timePart = dStr.includes(' ') ? dStr.split(' ')[1] : tStr;
      const dParts = datePart.split('/');
      const tParts = timePart.split(':');
      if (dParts.length === 3) {
        const d = parseInt(dParts[0], 10);
        const m = parseInt(dParts[1], 10) - 1;
        const y = parseInt(dParts[2], 10);
        const hh = tParts[0] ? parseInt(tParts[0], 10) : 0;
        const mm = tParts[1] ? parseInt(tParts[1], 10) : 0;
        return new Date(y, m, d, hh, mm, 0);
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper to format duration between two dates
  const formatDuration = (ms: number): string => {
    if (ms <= 0 || isNaN(ms)) return '0h';
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days >= 1) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days} ngày ${remainingHours}h` : `${days} ngày`;
    }
    if (hours >= 1) {
      return minutes > 0 ? `${hours}h ${minutes}p` : `${hours}h`;
    }
    return `${minutes} phút`;
  };

  // Current reference timestamp (29/09/2026 19:15)
  const now = new Date(2026, 8, 29, 19, 15);

  // Calculate timeline details for each proposal
  const timelineData = proposals.map((p) => {
    const proposeDate = parseDateTime(p.ngay, p.gio);
    const isApproved = p.tinhTrangDuyet === 'ĐÃ DUYỆT';
    
    // Approval date
    let approveDate: Date | null = null;
    if (isApproved) {
      if (p.ngayKiemDuyet) {
        approveDate = parseDateTime(p.ngayKiemDuyet);
      } else {
        approveDate = new Date(2026, 8, 29, 16, 22);
      }
    }

    // Completion / Deadline date
    let completeDate: Date | null = null;
    if (p.ngayHoanThanh) {
      completeDate = parseDateTime(p.ngayHoanThanh, '18:00');
    }

    // Duration: Proposal -> Approval (Wait time for approval)
    let waitApprovalMs = 0;
    if (proposeDate) {
      if (approveDate) {
        waitApprovalMs = Math.max(0, approveDate.getTime() - proposeDate.getTime());
      } else {
        // Still pending approval
        waitApprovalMs = Math.max(0, now.getTime() - proposeDate.getTime());
      }
    }

    // Duration: Approval -> Completion (Repair time)
    let repairDurationMs = 0;
    if (approveDate && completeDate) {
      repairDurationMs = Math.max(0, completeDate.getTime() - approveDate.getTime());
    }

    return {
      item: p,
      proposeDate,
      proposeStr: `${p.ngay} ${p.gio}`,
      isApproved,
      approveDate,
      approveStr: approveDate ? (p.ngayKiemDuyet || '29/09/2026 16:22') : 'Chưa duyệt',
      approver: p.nguoiKiemDuyet || 'Chưa có',
      completeDate,
      completeStr: completeDate ? (p.ngayHoanThanh || '01/10/2026') : (isApproved ? 'Hạn 01/10/2026' : 'Chờ duyệt'),
      isRepaired: p.trangThaiSuaChua === 'Đã sửa chữa',
      waitApprovalMs,
      waitApprovalStr: formatDuration(waitApprovalMs),
      repairDurationMs,
      repairDurationStr: repairDurationMs > 0 ? formatDuration(repairDurationMs) : (isApproved ? 'Đang thực hiện' : 'Chưa phân công'),
      totalLeadTimeMs: waitApprovalMs + repairDurationMs,
      totalLeadTimeStr: formatDuration(waitApprovalMs + repairDurationMs)
    };
  });

  // Calculate general SLA stats
  const approvedItems = timelineData.filter((t) => t.isApproved);
  const avgApprovalMs = approvedItems.length > 0 
    ? approvedItems.reduce((acc, cur) => acc + cur.waitApprovalMs, 0) / approvedItems.length 
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Top Header of Chart */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Biểu Đồ Đối Chiếu Tiến Trình: Đề Xuất → Kiểm Duyệt → Sửa Chữa
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi thời gian chuyển tiếp giữa các mốc: <strong>Thời gian chờ duyệt</strong> và <strong>Thời gian sửa chữa</strong> theo ngày
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'chart'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Biểu đồ Timeline</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Bảng đối chiếu</span>
          </button>
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 text-xs">
        {/* Metric 1 */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Thời gian duyệt trung bình:</span>
          <div className="text-lg font-bold font-mono text-indigo-700">
            {approvedItems.length > 0 ? formatDuration(avgApprovalMs) : 'Chưa có'}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Từ lúc gửi đến khi quản lý duyệt
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Tỷ lệ đã kiểm duyệt:</span>
          <div className="text-lg font-bold font-mono text-emerald-700">
            {approvedItems.length}/{timelineData.length} ({timelineData.length > 0 ? Math.round((approvedItems.length / timelineData.length) * 100) : 0}%)
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {timelineData.length - approvedItems.length} đề xuất đang chờ duyệt
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Thời gian sửa chữa cam kết:</span>
          <div className="text-lg font-bold font-mono text-blue-700">
            48 giờ (2 ngày)
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Hạn chót hoàn thành: 01/10/2026
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Kỹ thuật viên phụ trách:</span>
          <div className="text-sm font-bold text-slate-900 truncate">
            Phạm Văn Trưởng
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Đã tiếp nhận thông báo qua mail
          </span>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'chart' ? (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700">Chú giải tiến trình:</span>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                <span>Mốc Đề xuất (T1)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-400"></span>
                <span>Thời gian chờ duyệt (T1 → T2)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                <span>Mốc Kiểm duyệt (T2)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400"></span>
                <span>Thời gian sửa chữa (T2 → T3)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                <span>Mốc Hoàn thành / Deadline (T3)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-100"></span>
                <span>Chờ xử lý</span>
              </span>
            </div>
          </div>

          {/* Timeline Visual Rows */}
          <div className="space-y-5">
            {timelineData.map((t) => {
              const item = t.item;

              return (
                <div 
                  key={item.id} 
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-white shadow-2xs space-y-3.5"
                >
                  {/* Proposal Info Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                        {item.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.vatPham}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-600">
                        {item.coSo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {t.isApproved ? (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          ĐÃ DUYỆT (29/09 16:22)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-900 flex items-center gap-1">
                          <Hourglass className="w-3 h-3" />
                          CHƯA DUYỆT (Chờ {t.waitApprovalStr})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Process Flow (Horizontal Gantt Bar) */}
                  <div className="space-y-2 pt-1">
                    {/* Gantt Bar Visualization */}
                    <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200">
                      {/* Segment 1: Proposal -> Approval Time */}
                      {t.isApproved ? (
                        <div 
                          style={{ width: '45%' }}
                          className="bg-indigo-500 h-full flex items-center justify-between px-3 text-white text-[11px] font-semibold transition-all relative group cursor-pointer"
                          title={`Thời gian chờ duyệt: ${t.waitApprovalStr} (Từ ${t.proposeStr} đến ${t.approveStr})`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Chờ duyệt: {t.waitApprovalStr}
                          </span>
                          <span className="text-[10px] font-mono opacity-80 shrink-0">T1 → T2</span>
                        </div>
                      ) : (
                        <div 
                          style={{ width: '60%' }}
                          className="bg-amber-400/80 repeating-linear-stripes h-full flex items-center justify-between px-3 text-amber-950 text-[11px] font-semibold"
                          title={`Đang chờ duyệt: Đã qua ${t.waitApprovalStr}`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <Hourglass className="w-3 h-3 animate-spin text-amber-700" />
                            Đang chờ duyệt ({t.waitApprovalStr})
                          </span>
                          <span className="text-[10px] font-mono opacity-80 shrink-0">Chờ T2</span>
                        </div>
                      )}

                      {/* Segment 2: Approval -> Completion Time */}
                      {t.isApproved ? (
                        <div 
                          style={{ width: '55%' }}
                          className="bg-amber-500 h-full flex items-center justify-between px-3 text-white text-[11px] font-semibold relative group cursor-pointer border-l border-white/30"
                          title={`Thời gian sửa chữa: ${t.repairDurationStr} (Hạn chót: ${t.completeStr})`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Tiến độ sửa: 48h (Hạn {t.completeStr})
                          </span>
                          <span className="text-[10px] font-mono opacity-80 shrink-0">T2 → T3</span>
                        </div>
                      ) : (
                        <div 
                          style={{ width: '40%' }}
                          className="bg-slate-200/60 h-full flex items-center justify-center text-slate-400 text-[10px] font-medium"
                        >
                          <span>Chưa kiểm duyệt</span>
                        </div>
                      )}
                    </div>

                    {/* 3 Milestone Points Indicator */}
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      {/* Point 1: Proposal Time */}
                      <div className="flex items-start gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-1"></div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">1. Ngày gửi đề xuất:</span>
                          <span className="font-mono font-bold text-slate-900 text-[11px] block">
                            {t.proposeStr}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Người gửi: {item.nguoiDeXuat}
                          </span>
                        </div>
                      </div>

                      {/* Point 2: Approval Time */}
                      <div className="flex items-start gap-1.5 border-l border-slate-100 pl-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                          t.isApproved ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}></div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">2. Ngày kiểm duyệt:</span>
                          <span className={`font-mono font-bold text-[11px] block ${
                            t.isApproved ? 'text-emerald-700' : 'text-slate-400 italic'
                          }`}>
                            {t.approveStr}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {t.isApproved ? `Duyệt bởi: ${t.approver}` : 'Đang chờ BGĐ duyệt'}
                          </span>
                        </div>
                      </div>

                      {/* Point 3: Completion Time */}
                      <div className="flex items-start gap-1.5 border-l border-slate-100 pl-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                          t.isRepaired ? 'bg-emerald-600' : (t.isApproved ? 'bg-amber-500' : 'bg-slate-300')
                        }`}></div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">3. Ngày hoàn thành:</span>
                          <span className={`font-mono font-bold text-[11px] block ${
                            t.completeDate ? 'text-rose-700' : 'text-slate-400 italic'
                          }`}>
                            {t.completeStr}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.ghiChuKhacPhuc || 'Kỹ thuật: Phạm Văn Trưởng'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Lead Time Comparison Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] font-semibold">
                <th className="py-3 px-4">Mã ĐX & Hạng Mục</th>
                <th className="py-3 px-3">Cơ Sở</th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Ngày Đề Xuất (T1)
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Ngày Kiểm Duyệt (T2)
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    Ngày Hoàn Thành (T3)
                  </span>
                </th>
                <th className="py-3 px-3 font-bold text-indigo-700">
                  Thời Gian Chờ Duyệt (T1→T2)
                </th>
                <th className="py-3 px-3 font-bold text-amber-700">
                  Thời Gian Sửa Chữa (T2→T3)
                </th>
                <th className="py-3 px-3 text-right">Tình Trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timelineData.map((t) => {
                const item = t.item;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Item & Code */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-800">{item.id}</div>
                      <div className="font-medium text-slate-900 max-w-[200px] truncate" title={item.vatPham}>
                        {item.vatPham}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {item.coSo}
                    </td>

                    {/* T1: Proposal */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-900 font-medium">{t.proposeStr}</div>
                      <div className="text-[10px] text-slate-400">{item.nguoiDeXuat}</div>
                    </td>

                    {/* T2: Approval */}
                    <td className="py-3 px-3">
                      {t.isApproved ? (
                        <>
                          <div className="font-mono text-emerald-700 font-semibold">{t.approveStr}</div>
                          <div className="text-[10px] text-slate-500">Duyệt: {t.approver}</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Chưa duyệt</span>
                      )}
                    </td>

                    {/* T3: Completion */}
                    <td className="py-3 px-3">
                      {t.completeDate ? (
                        <>
                          <div className="font-mono text-rose-700 font-semibold">{t.completeStr}</div>
                          <div className="text-[10px] text-slate-500">Deadline cam kết</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Chờ duyệt</span>
                      )}
                    </td>

                    {/* Duration T1 -> T2 */}
                    <td className="py-3 px-3">
                      {t.isApproved ? (
                        <span className="font-mono font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                          {t.waitApprovalStr}
                        </span>
                      ) : (
                        <span className="font-mono text-amber-800 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[11px]">
                          Chờ {t.waitApprovalStr}
                        </span>
                      )}
                    </td>

                    {/* Duration T2 -> T3 */}
                    <td className="py-3 px-3">
                      {t.isApproved ? (
                        <span className="font-mono font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                          {t.repairDurationStr}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Chưa phân công</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-right">
                      {t.isApproved ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ĐÃ DUYỆT
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          CHỜ DUYỆT
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart Footer Insight */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Kết luận đối chiếu:</strong> Đề xuất <strong>DX-003</strong> được duyệt sau <strong>23 giờ 09 phút</strong> kể từ khi gửi, và kỹ thuật viên cam kết hoàn thành sửa chữa trong vòng <strong>48 giờ</strong> (trước ngày 01/10/2026).
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400 shrink-0">
          SLA chuẩn: Duyệt &lt; 24h · Sửa &lt; 48h
        </span>
      </div>
    </div>
  );
}
