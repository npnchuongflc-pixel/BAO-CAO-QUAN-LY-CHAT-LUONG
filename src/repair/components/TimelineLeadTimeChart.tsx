/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProposalItem } from '../types/proposal';
import { 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Wrench, 
  Check, 
  Layers, 
  Table as TableIcon,
  Hourglass,
  DollarSign,
  Image as ImageIcon
} from 'lucide-react';

interface TimelineLeadTimeChartProps {
  proposals: ProposalItem[];
  onOpenImage?: (url: string, title: string) => void;
}

export function TimelineLeadTimeChart({ proposals, onOpenImage }: TimelineLeadTimeChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Helper to parse "DD/MM/YYYY HH:mm" or "DD/MM/YYYY" to Date
  const parseDateTime = (dStr: string, tStr = '00:00'): Date | null => {
    if (!dStr) return null;
    try {
      const parts = dStr.trim().split(' ');
      const datePart = parts[0];
      const timePart = parts[1] || tStr;
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

  const formatVND = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Helper to format duration between two dates
  const formatDuration = (ms: number): string => {
    if (ms <= 0 || isNaN(ms)) return '0h';
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days >= 1) {
      const remHours = hours % 24;
      return remHours > 0 ? `${days} ngày ${remHours}h` : `${days} ngày`;
    }
    if (hours >= 1) {
      return minutes > 0 ? `${hours}h ${minutes}p` : `${hours}h`;
    }
    return `${minutes} phút`;
  };

  // Reference time for pending items
  const now = new Date(2026, 9, 14, 20, 0); // October 14, 2026

  // Process timeline data
  const timelineData = proposals.map((p) => {
    const proposeDate = parseDateTime(p.ngay, p.gio);
    const isApproved = p.tinhTrangDuyet === 'ĐÃ DUYỆT';
    const approveDate = isApproved ? parseDateTime(p.ngayKiemDuyet) : null;
    const isRepaired = p.trangThaiSuaChua === 'Đã khắc phục xong';
    const repairDate = isRepaired ? parseDateTime(p.ngaySuaChua) : null;

    // Time from Propose -> Approval
    let waitApprovalMs = 0;
    if (proposeDate) {
      if (approveDate) {
        waitApprovalMs = Math.max(0, approveDate.getTime() - proposeDate.getTime());
      } else {
        waitApprovalMs = Math.max(0, now.getTime() - proposeDate.getTime());
      }
    }

    // Time from Approval -> Repair completion
    let repairDurationMs = 0;
    if (approveDate && repairDate) {
      repairDurationMs = Math.max(0, repairDate.getTime() - approveDate.getTime());
    } else if (approveDate && !isRepaired) {
      repairDurationMs = Math.max(0, now.getTime() - approveDate.getTime());
    }

    return {
      item: p,
      proposeDate,
      proposeStr: `${p.ngay} ${p.gio}`,
      isApproved,
      approveDate,
      approveStr: p.ngayKiemDuyet || (isApproved ? 'Đã duyệt' : 'Chưa duyệt'),
      isRepaired,
      repairDate,
      repairStr: p.ngaySuaChua || (isRepaired ? 'Đã sửa xong' : 'Chưa xử lý'),
      waitApprovalMs,
      waitApprovalStr: formatDuration(waitApprovalMs),
      repairDurationMs,
      repairDurationStr: isRepaired ? formatDuration(repairDurationMs) : (isApproved ? `Đang sửa (đã ${formatDuration(repairDurationMs)})` : 'Chưa xử lý'),
      costStr: p.chiPhiThucTe !== null ? formatVND(p.chiPhiThucTe) : (p.chiPhiGocStr || 'Chưa cập nhật')
    };
  });

  // Summary metrics
  const totalItems = timelineData.length;
  const approvedItems = timelineData.filter((t) => t.isApproved);
  const repairedItems = timelineData.filter((t) => t.isRepaired);
  const completedRepairsWithCost = repairedItems.filter((t) => t.item.chiPhiThucTe !== null);
  const totalCost = completedRepairsWithCost.reduce((sum, t) => sum + (t.item.chiPhiThucTe || 0), 0);

  const avgApprovalMs = approvedItems.length > 0
    ? approvedItems.reduce((acc, cur) => acc + cur.waitApprovalMs, 0) / approvedItems.length
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Top Header of Chart */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Biểu Đồ Đối Chiếu Tiến Trình: Đề Xuất → Phê Duyệt → Ngày Sửa Xong & Kinh Phí
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đối chiếu thời gian từng mốc: <strong>Ngày gửi đề xuất</strong>, <strong>Ngày phê duyệt</strong>, <strong>Ngày sửa chữa hoàn tất</strong> và <strong>Kinh phí thực tế</strong>
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
            <span>Biểu đồ Timeline Gantt</span>
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
            <span>Bảng đối chiếu ({totalItems})</span>
          </button>
        </div>
      </div>

      {/* Key Lead Time & Cost Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 text-xs">
        {/* Metric 1: Approval Rate */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Tỷ lệ đã phê duyệt:</span>
          <div className="text-lg font-bold font-mono text-emerald-700">
            {approvedItems.length}/{totalItems} ({totalItems > 0 ? Math.round((approvedItems.length / totalItems) * 100) : 0}%)
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {totalItems - approvedItems.length} đề xuất đang chờ duyệt
          </span>
        </div>

        {/* Metric 2: Repaired Rate */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Tiến độ đã sửa xong:</span>
          <div className="text-lg font-bold font-mono text-blue-700">
            {repairedItems.length}/{totalItems} ({totalItems > 0 ? Math.round((repairedItems.length / totalItems) * 100) : 0}%)
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {totalItems - repairedItems.length} hạng mục đang xử lý / chờ
          </span>
        </div>

        {/* Metric 3: Total Actual Cost */}
        <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <span className="text-emerald-800 block mb-1 font-semibold flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Kinh phí sửa thực tế:
          </span>
          <div className="text-lg font-bold font-mono text-emerald-700">
            {formatVND(totalCost)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Từ các hạng mục đã nghiệm thu
          </span>
        </div>

        {/* Metric 4: Avg Approval Lead Time */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-1 font-medium">Thời gian duyệt TB:</span>
          <div className="text-lg font-bold font-mono text-indigo-700">
            {formatDuration(avgApprovalMs)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Người duyệt: Huỳnh Phi Đoan
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'chart' ? (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700">Chú giải tiến trình:</span>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                <span>1. Ngày Đề xuất</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-400"></span>
                <span>Thời gian chờ duyệt</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                <span>2. Ngày Phê duyệt</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span>Thời gian thực hiện sửa</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-700"></span>
                <span>3. Ngày Sửa xong & Kinh phí</span>
              </span>
            </div>
          </div>

          {/* Timeline Visual Cards */}
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {timelineData.map((t) => {
              const item = t.item;

              return (
                <div 
                  key={item.id} 
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-white shadow-2xs space-y-3"
                >
                  {/* Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                        {item.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.vatPham}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-indigo-700 font-semibold">
                        Cơ sở: {item.coSo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {/* Approval badge */}
                      {t.isApproved ? (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          ĐÃ DUYỆT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-900 flex items-center gap-1">
                          <Hourglass className="w-3 h-3" />
                          CHƯA DUYỆT
                        </span>
                      )}

                      {/* Repair badge */}
                      {t.isRepaired ? (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          ĐÃ SỬA XONG
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">
                          Chưa xử lý
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gantt Bar Visualization */}
                  <div className="relative h-9 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200 text-xs">
                    {/* Segment 1: Wait for approval */}
                    {t.isApproved ? (
                      <div 
                        style={{ width: '45%' }}
                        className="bg-indigo-500 h-full flex items-center justify-between px-3 text-white text-[11px] font-semibold"
                        title={`Chờ duyệt: ${t.waitApprovalStr} (Từ ${t.proposeStr} đến ${t.approveStr})`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Chờ duyệt: {t.waitApprovalStr}
                        </span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">Gửi → Duyệt</span>
                      </div>
                    ) : (
                      <div 
                        style={{ width: '60%' }}
                        className="bg-amber-400/80 h-full flex items-center justify-between px-3 text-amber-950 text-[11px] font-semibold"
                        title={`Đang chờ duyệt: Đã qua ${t.waitApprovalStr}`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <Hourglass className="w-3 h-3 animate-spin text-amber-700" />
                          Đang chờ duyệt ({t.waitApprovalStr})
                        </span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">Chờ T2</span>
                      </div>
                    )}

                    {/* Segment 2: Repair time */}
                    {t.isRepaired ? (
                      <div 
                        style={{ width: '55%' }}
                        className="bg-blue-600 h-full flex items-center justify-between px-3 text-white text-[11px] font-semibold border-l border-white/30"
                        title={`Thời gian sửa: ${t.repairDurationStr} (Xong lúc: ${t.repairStr})`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Đã sửa xong ({t.repairDurationStr})
                        </span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">Duyệt → Sửa</span>
                      </div>
                    ) : t.isApproved ? (
                      <div 
                        style={{ width: '55%' }}
                        className="bg-amber-100 border-l border-amber-300 h-full flex items-center justify-between px-3 text-amber-900 text-[11px] font-medium"
                      >
                        <span className="truncate flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-amber-600" />
                          Đang xử lý / Chưa sửa xong
                        </span>
                        <span className="text-[10px] text-amber-700 font-mono shrink-0">KTV: {item.nguoiKhacPhuc}</span>
                      </div>
                    ) : (
                      <div 
                        style={{ width: '40%' }}
                        className="bg-slate-200/50 h-full flex items-center justify-center text-slate-400 text-[10px]"
                      >
                        Chờ phê duyệt
                      </div>
                    )}
                  </div>

                  {/* 3 Step Milestones Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    {/* 1. Ngày đề xuất */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 text-[10px] font-bold block mb-0.5">
                        1. NGÀY ĐỀ XUẤT:
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {t.proposeStr}
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Người gửi: <strong>{item.nguoiDeXuat}</strong>
                      </span>
                    </div>

                    {/* 2. Ngày phê duyệt */}
                    <div className={`p-2.5 rounded-lg border ${
                      t.isApproved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className="text-slate-500 text-[10px] font-bold block mb-0.5">
                        2. NGÀY PHÊ DUYỆT:
                      </span>
                      <div className={`font-mono font-bold text-xs ${
                        t.isApproved ? 'text-emerald-700' : 'text-slate-400 italic'
                      }`}>
                        {t.approveStr}
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {t.isApproved ? `Duyệt bởi: ${item.nguoiKiemDuyet || 'Huỳnh Phi Đoan'}` : 'Chờ Ban Giám Đốc'}
                      </span>
                    </div>

                    {/* 3. Ngày sửa xong & Kinh phí */}
                    <div className={`p-2.5 rounded-lg border ${
                      t.isRepaired ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className="text-slate-500 text-[10px] font-bold block mb-0.5">
                        3. NGÀY SỬA XONG & KINH PHÍ:
                      </span>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold text-xs ${
                          t.isRepaired ? 'text-blue-700' : 'text-slate-400 italic'
                        }`}>
                          {t.repairStr}
                        </span>
                        <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          {t.costStr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span className="truncate">{item.ghiChuKhacPhuc || `Kỹ thuật: ${item.nguoiKhacPhuc}`}</span>
                        {item.anhSauSua && onOpenImage && (
                          <button
                            onClick={() => onOpenImage(item.anhSauSua, `Ảnh sau sửa: ${item.vatPham}`)}
                            className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 shrink-0 ml-1"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Xem ảnh sửa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Table Comparison View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <th className="py-3 px-3">Mã & Hạng Mục</th>
                <th className="py-3 px-3">Cơ Sở</th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1 text-indigo-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Ngày Đề Xuất
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Đã Duyệt? / Ngày Duyệt
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1 text-blue-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Đã Sửa? / Ngày Sửa
                  </span>
                </th>
                <th className="py-3 px-3 text-right font-bold text-emerald-800">
                  Kinh Phí Thực Tế
                </th>
                <th className="py-3 px-3 text-center">Ảnh Nghiệm Thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timelineData.map((t) => {
                const item = t.item;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID & Item */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.id}
                      </span>
                      <div className="font-semibold text-slate-900 mt-0.5 max-w-[220px] truncate" title={item.vatPham}>
                        {item.vatPham}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {item.coSo}
                    </td>

                    {/* Proposal date */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-900">{t.proposeStr}</div>
                      <div className="text-[10px] text-slate-400">{item.nguoiDeXuat}</div>
                    </td>

                    {/* Approval status & date */}
                    <td className="py-3 px-3">
                      {t.isApproved ? (
                        <>
                          <span className="inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            ĐÃ DUYỆT
                          </span>
                          <div className="font-mono text-emerald-700 font-medium text-[11px] mt-0.5">
                            {t.approveStr}
                          </div>
                        </>
                      ) : (
                        <span className="inline-block px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                          CHƯA DUYỆT
                        </span>
                      )}
                    </td>

                    {/* Repair status & date */}
                    <td className="py-3 px-3">
                      {t.isRepaired ? (
                        <>
                          <span className="inline-block px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                            ĐÃ SỬA XONG
                          </span>
                          <div className="font-mono text-blue-700 font-medium text-[11px] mt-0.5">
                            {t.repairStr}
                          </div>
                        </>
                      ) : (
                        <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium text-[10px]">
                          Chưa xử lý
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-mono font-bold ${
                        item.chiPhiThucTe !== null && item.chiPhiThucTe > 0 
                          ? 'text-emerald-700 text-sm' 
                          : item.chiPhiThucTe === 0 
                            ? 'text-slate-700' 
                            : 'text-slate-400 italic text-[11px]'
                      }`}>
                        {t.costStr}
                      </span>
                    </td>

                    {/* Photo after repair */}
                    <td className="py-3 px-3 text-center">
                      {item.anhSauSua && onOpenImage ? (
                        <button
                          onClick={() => onOpenImage(item.anhSauSua, `Ảnh sau sửa: ${item.vatPham}`)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-indigo-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Xem ảnh</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Đã đồng bộ trực tiếp từ Sheet "ĐỀ XUẤT" · Tổng chi phí thực tế nghiệm thu: <strong className="text-emerald-800 font-mono font-bold">{formatVND(totalCost)}</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          Người kiểm duyệt: Huỳnh Phi Đoan · Kỹ thuật viên: Phạm Văn Trưởng
        </span>
      </div>
    </div>
  );
}
