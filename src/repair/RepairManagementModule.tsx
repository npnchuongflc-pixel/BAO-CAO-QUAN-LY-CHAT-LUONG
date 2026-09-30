/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProposalItem } from './types/proposal';
import { INITIAL_PROPOSALS } from './data/proposalsData';
import { fetchLiveProposalsFromSheet } from './services/sheetsService';
import { REPEATED_EQUIPMENT_OVER_2, RepeatedEquipmentItem } from './data/repeatedEquipmentData';
import { TimelineLeadTimeChart } from './components/TimelineLeadTimeChart';
import { 
  AlertTriangle, 
  Check, 
  X, 
  ExternalLink, 
  Eye, 
  Printer, 
  Download, 
  Clock, 
  CheckCircle2, 
  Building, 
  Wrench, 
  RefreshCw,
  Database,
  RotateCcw,
  ArrowRight,
  DollarSign,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';

export const REPAIR_APP_EXTERNAL_URL = 'https://ai.studio/apps/2bfec445-3870-4ee6-ae4a-8cf7b5cb20ce';

interface RepairManagementModuleProps {
  onBack?: () => void;
}

export const RepairManagementModule: React.FC<RepairManagementModuleProps> = ({ onBack }) => {
  const [proposals, setProposals] = useState<ProposalItem[]>(INITIAL_PROPOSALS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [selectedRepeatedItem, setSelectedRepeatedItem] = useState<RepeatedEquipmentItem | null>(null);
  const [showRepeatedSection, setShowRepeatedSection] = useState<boolean>(true);
  const [showProposalsList, setShowProposalsList] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const formatVND = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount) || amount <= 0) {
      return 'Chưa cập nhật';
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Live sync directly from Sheet "ĐỀ XUẤT"
  const loadSheetData = async (showNotification = false) => {
    setIsLoading(true);
    try {
      const data = await fetchLiveProposalsFromSheet();
      setProposals(data);
      if (showNotification) {
        showToast(`Đã đồng bộ ${data.length} đề xuất từ Sheet "ĐỀ XUẤT"`);
      }
    } catch {
      showToast('Dùng dữ liệu từ Sheet "ĐỀ XUẤT"');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSheetData(false);
  }, []);

  // Helper to parse DD/MM/YYYY into a Date object
  const parseDateDMY = (dStr: string): Date | null => {
    if (!dStr) return null;
    const parts = dStr.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d, 0, 0, 0, 0);
      }
    }
    return null;
  };

  // Format YYYY-MM-DD to DD/MM/YYYY for UI display
  const formatISOToDMY = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Filter proposals by date range (from startDate to endDate)
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const itemDate = parseDateDMY(p.ngay);
      if (!itemDate) return true;
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        if (itemDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        if (itemDate > end) return false;
      }
      return true;
    });
  }, [proposals, startDate, endDate]);

  // Export CSV based on filtered date range
  const handleExportCSV = () => {
    const headers = [
      'Mã Đề Xuất',
      'Ngày',
      'Giờ',
      'Cơ Sở',
      'Người Đề Xuất',
      'Vật Phẩm',
      'Mức Độ',
      'Hiện Trạng Ghi Nhận',
      'Đề Xuất',
      'Phương Án Kỹ Thuật',
      'Chi Phí Thực Tế (VNĐ)',
      'Số Lần Hỏng Lặp Lại',
      'Tình Trạng Duyệt',
      'Trạng Thái Sửa Chữa',
      'Người Khắc Phục',
      'Link Ảnh',
    ];

    const rows = filteredProposals.map((p) => [
      `"${p.id}"`,
      `"${p.ngay}"`,
      `"${p.gio}"`,
      `"${p.coSo}"`,
      `"${p.nguoiDeXuat}"`,
      `"${p.vatPham.replace(/"/g, '""')}"`,
      `"${p.mucDo}"`,
      `"${p.trangThaiGhiNhan.replace(/"/g, '""')}"`,
      `"${p.deXuat}"`,
      `"${p.phuongAn.replace(/"/g, '""')}"`,
      `"${p.chiPhiThucTe || ''}"`,
      `"${p.soLanHongLapLai || 1}"`,
      `"${p.tinhTrangDuyet}"`,
      `"${p.trangThaiSuaChua}"`,
      `"${p.nguoiKhacPhuc}"`,
      `"${p.linkAnh}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeSuffix = startDate || endDate 
      ? `${startDate || 'truoc'}_den_${endDate || 'sau'}` 
      : 'Tat_Ca';
    link.setAttribute('download', `Bao_Cao_De_Xuat_${rangeSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file CSV');
  };

  // Metrics based on filtered proposals
  const totalCount = filteredProposals.length;
  const pendingCount = filteredProposals.filter((p) => p.tinhTrangDuyet === 'CHƯA DUYỆT').length;
  const approvedCount = filteredProposals.filter((p) => p.tinhTrangDuyet === 'ĐÃ DUYỆT').length;
  const repairedCount = filteredProposals.filter((p) => p.trangThaiSuaChua === 'Đã sửa chữa').length;
  const notRepairedCount = filteredProposals.filter((p) => p.trangThaiSuaChua === 'Chưa sửa chữa').length;

  // Real costs from sheet
  const totalRealCost = useMemo(() => {
    return filteredProposals.reduce((sum, p) => sum + (p.chiPhiThucTe || 0), 0);
  }, [filteredProposals]);

  const hasAnyRealCost = useMemo(() => {
    return filteredProposals.some((p) => p.chiPhiThucTe !== null && p.chiPhiThucTe > 0);
  }, [filteredProposals]);

  // Repeated equipment summary (> 2 times)
  const totalRepeatedEquipment = REPEATED_EQUIPMENT_OVER_2.length;
  const totalRepeatedBreakdowns = REPEATED_EQUIPMENT_OVER_2.reduce((sum, item) => sum + item.soLanHong, 0);

  // Describe the current active filter
  const isFiltered = Boolean(startDate || endDate);
  const filterDescription = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return `Ngày ${formatISOToDMY(startDate)}`;
      return `Từ ${formatISOToDMY(startDate)} đến ${formatISOToDMY(endDate)}`;
    }
    if (startDate) return `Từ ngày ${formatISOToDMY(startDate)} trở đi`;
    if (endDate) return `Đến ngày ${formatISOToDMY(endDate)}`;
    return 'Tất cả các ngày';
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 pb-16 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer mr-1"
                title="Quay lại Giám sát vệ sinh"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Báo Cáo Sửa Chữa &amp; Đề Xuất Cơ Sở
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Live Sheet &quot;ĐỀ XUẤT&quot;
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
                Hệ thống cơ sở CleanCheck · Kỹ thuật viên phụ trách: Phạm Văn Trưởng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Quick Link Button to external AI Studio App */}
            <a
              href={REPAIR_APP_EXTERNAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-2xs"
              title="Mở ứng dụng độc lập trên AI Studio"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Mở link độc lập</span>
            </a>

            <button
              onClick={() => loadSheetData(true)}
              disabled={isLoading}
              title="Đồng bộ trực tiếp từ Google Sheet 'ĐỀ XUẤT'"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In báo cáo</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Quick Nav Banner within Giám Sát Vệ Sinh */}
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Báo Cáo Sửa Chữa Đã Được Nhúng Trực Tiếp
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Tích hợp CleanCheck
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Theo dõi tiến độ duyệt, khắc phục hỏng hóc, lead time xử lý và cảnh báo thiết bị hỏng lặp lại &gt; 2 lần.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <a
              href={REPAIR_APP_EXTERNAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
            >
              <span>Xem link AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* DATE RANGE FILTER (Từ ngày ... Đến ngày ...) */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Từ ngày */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-600 font-semibold">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              />
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />

            {/* Đến ngày */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-600 font-semibold">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              />
            </div>

            {/* Reset button */}
            {isFiltered && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors font-medium cursor-pointer"
                title="Xóa bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
            Hiển thị: <strong className="text-slate-900">{totalCount}</strong> đề xuất
          </span>
        </div>

        {/* 5 Real KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* KPI 1: Total Proposals */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium mb-1 truncate">
              {isFiltered ? 'Đề xuất trong khoảng' : 'Tổng số đề xuất'}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {totalCount > 0 ? filterDescription : 'Không có đề xuất'}
            </div>
          </div>

          {/* KPI 2: Real Repair Cost (From Sheet Column T) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mb-1">
              <span className="flex items-center gap-1 truncate">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Chi phí thực tế
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums truncate">
              {hasAnyRealCost ? formatVND(totalRealCost) : '0 đ'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {hasAnyRealCost ? 'Tổng chi phí thực tế trên sheet' : 'Chưa có chi phí mua mới trên sheet'}
            </div>
          </div>

          {/* KPI 3: Repeated Breakdown (> 2 times) */}
          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/25">
            <div className="flex items-center justify-between text-xs text-rose-800 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                Hỏng lặp lại (&gt; 2 lần)
              </span>
              <span className="font-mono text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-bold">
                Báo động
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
              {totalRepeatedEquipment} <span className="text-xs font-sans text-rose-600 font-semibold">thiết bị</span>
            </div>
            <div className="text-[11px] text-rose-700/90 mt-1">
              Tổng <strong>{totalRepeatedBreakdowns} lượt</strong> hư hỏng
            </div>
          </div>

          {/* KPI 4: Approval Status */}
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
            <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Tình trạng duyệt
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {pendingCount} chưa duyệt
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Đã duyệt: <strong className="text-emerald-700">{approvedCount}</strong> đề xuất
            </div>
          </div>

          {/* KPI 5: Repair Status */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Trạng thái sửa chữa
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-700 tabular-nums">
              {notRepairedCount} chưa sửa
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Đã sửa: <strong className="text-emerald-700">{repairedCount}</strong> đề xuất
            </div>
          </div>
        </div>

        {/* SECTION: THIẾT BỊ HƯ HỎNG LẶP ĐI LẶP LẠI HƠN 2 LẦN (> 2 LẦN) */}
        <div className="bg-white rounded-xl border border-rose-200 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setShowRepeatedSection(!showRepeatedSection)}
            className="px-5 py-4 bg-gradient-to-r from-rose-50/60 to-white border-b border-rose-100 flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Cảnh Báo: Thiết Bị Hư Hỏng Lặp Đi Lặp Lại Hơn 2 Lần (&gt; 2 Lần)
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {totalRepeatedEquipment} Thiết bị
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu thực tế từ toàn bộ lịch sử kiểm tra · Tổng cộng {totalRepeatedBreakdowns} lượt hư hỏng ghi nhận
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRepeatedSection(!showRepeatedSection);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{showRepeatedSection ? 'Thu gọn' : 'Xem danh sách'}</span>
                {showRepeatedSection ? (
                  <ChevronUp className="w-3.5 h-3.5 text-rose-700" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-rose-700" />
                )}
              </button>
            </div>
          </div>

          {showRepeatedSection && (
            <div className="divide-y divide-slate-100">
              {REPEATED_EQUIPMENT_OVER_2.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-rose-50/20 transition-colors">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {item.maThietBi}
                        </span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {item.tenThietBi}
                        </span>
                        <span className="text-xs text-slate-500">
                          · Cơ sở: <strong>{item.coSo}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {item.lyDoKhuyenNghi}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-700 text-base block">
                          {item.soLanHong} lần
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          item.khuyenNghi === 'Cần thay mới ngay' || item.khuyenNghi === 'Nên thay mới hoàn toàn'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.khuyenNghi}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedRepeatedItem(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem lịch sử</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION: BIỂU ĐỒ LEAD TIME & DÒNG THỜI GIAN SỬA CHỮA */}
        <TimelineLeadTimeChart proposals={filteredProposals} />

        {/* Proposals List - Pure Read-only Report with Real Costs from Sheet */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setShowProposalsList(!showProposalsList)}
            className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 cursor-pointer select-none bg-gradient-to-r from-slate-50/50 to-white hover:bg-slate-50/80 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {isFiltered 
                    ? `Danh Sách Đề Xuất (${filterDescription})` 
                    : `Toàn Bộ Đề Xuất Trong Sheet "ĐỀ XUẤT" (${filteredProposals.length} Đề Xuất)`}
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {filteredProposals.length} đề xuất
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kỹ thuật viên khắc phục: <strong>Phạm Văn Trưởng</strong> · Báo cáo tổng hợp số liệu thực tế
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProposalsList(!showProposalsList);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{showProposalsList ? 'Thu gọn' : 'Mở rộng'}</span>
                {showProposalsList ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          {showProposalsList && (
            <>
              {filteredProposals.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                  <p className="font-medium text-slate-700">
                    Không có đề xuất nào được ghi nhận {filterDescription}
                  </p>
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Bấm vào đây để xem tất cả các ngày
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredProposals.map((item) => {
                    const isApproved = item.tinhTrangDuyet === 'ĐÃ DUYỆT';
                    const isRepaired = item.trangThaiSuaChua === 'Đã sửa chữa';
                    const isRepeatedBreakdown = (item.soLanHongLapLai || 1) > 2;

                    return (
                      <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                          {/* Left: Image & Proposal Information */}
                          <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
                            {/* Photo Thumbnail */}
                            <div
                              onClick={() => setZoomImage({ url: item.linkAnh, title: item.vatPham })}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative group cursor-zoom-in"
                              title="Bấm để xem ảnh phóng to"
                            >
                              <img
                                src={item.linkAnh}
                                alt={item.vatPham}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              {/* Meta */}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {item.id}
                                </span>
                                <span className="font-bold text-slate-900 flex items-center gap-1">
                                  <Building className="w-3.5 h-3.5 text-slate-400" />
                                  {item.coSo}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {item.gio} - {item.ngay}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-500 text-[11px]">
                                  Người gửi: <strong>{item.nguoiDeXuat}</strong>
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                {item.vatPham}
                              </h3>

                              {/* Problem & Solution description */}
                              <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div>
                                  <span className="font-semibold text-slate-700">Hiện trạng: </span>
                                  <span className="text-slate-900">{item.trangThaiGhiNhan}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700">Phương án: </span>
                                  <span className="text-slate-800">{item.phuongAn}</span>
                                </div>
                              </div>

                              {/* Badges & Repeated breakdown alert */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                {/* Severe badge */}
                                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                                  item.mucDo === 'Hư hỏng nặng'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {item.mucDo}
                                </span>

                                {/* Repeated breakdown badge (> 2 times) */}
                                {isRepeatedBreakdown ? (
                                  <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded border border-rose-300 flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3 text-rose-600" />
                                    Hỏng lặp lại {item.soLanHongLapLai} lần (&gt; 2 lần)
                                  </span>
                                ) : null}

                                <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
                                  Đề xuất: {item.deXuat}
                                </span>

                                <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                                  <Wrench className="w-3 h-3 text-slate-400" />
                                  Kỹ thuật: <strong>{item.nguoiKhacPhuc}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Cost, Approval Status & Repair Status */}
                          <div className="w-full lg:w-56 shrink-0 pt-3 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-5 space-y-2.5 flex flex-col justify-center">
                            {/* 1. CHI PHÍ THỰC TẾ (CỘT T SHEET "ĐỀ XUẤT") */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                                CHI PHÍ THỰC TẾ (CỘT T)
                              </span>
                              <div className={`font-mono text-xs ${
                                item.chiPhiThucTe ? 'font-bold text-emerald-700 text-sm' : 'text-slate-400 italic'
                              }`}>
                                {item.chiPhiThucTe ? formatVND(item.chiPhiThucTe) : 'Chưa cập nhật trên sheet'}
                              </div>
                            </div>

                            {/* 2. TÌNH TRẠNG DUYỆT */}
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                                TÌNH TRẠNG DUYỆT
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                  isApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {isApproved ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                )}
                                {item.tinhTrangDuyet}
                              </span>
                            </div>

                            {/* 3. TRẠNG THÁI SỬA CHỮA */}
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                                TRẠNG THÁI SỬA CHỮA
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                  isRepaired
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-blue-100 text-blue-900 border border-blue-200'
                                }`}
                              >
                                {isRepaired ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                ) : (
                                  <Wrench className="w-3.5 h-3.5 text-blue-700" />
                                )}
                                {item.trangThaiSuaChua}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Short Executive Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Tóm Tắt &amp; Hành Động Cần Ưu Tiên (Sheet &quot;ĐỀ XUẤT&quot;)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-100">
              <span className="font-bold text-rose-900 block mb-1">
                1. Khẩn cấp P1: Bồn rửa tay Phổ Quang (DX-003)
              </span>
              <p className="text-rose-800 text-[11px]">
                Bồn rửa tay Phòng Vẽ 1 đang bị bung keo, lủng lẳng sắp rơi khỏi tường. Đã được duyệt (Huỳnh Phi Đoan) và giao kỹ thuật viên (Phạm Văn Trưởng) gia cố khung chịu lực bắn keo trước ngày 01/10/2026 để tránh gây chấn thương cho học sinh.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <span className="font-bold text-amber-900 block mb-1">
                2. Thiết bị hỏng lặp lại: Điều hòa An Phú (DX-002)
              </span>
              <p className="text-amber-800 text-[11px]">
                Điều hòa Lễ tân An Phú [APC_TT_LT_DH0] đã ghi nhận hỏng 3 lần. Hiện tại cánh vẫy bị kẹt đọng nước chảy xuống sàn sảnh. Cần kỹ thuật viên kiểm tra xử lý dứt điểm linh kiện mô-tơ đảo gió.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Chi tiết lịch sử thiết bị hỏng lặp lại (> 2 lần) */}
      {selectedRepeatedItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedRepeatedItem(null)}
        >
          <div 
            className="w-full max-w-xl bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">
                  Lịch sử {selectedRepeatedItem.soLanHong} lần hư hỏng thực tế
                </span>
                <h3 className="text-sm font-bold leading-tight">
                  {selectedRepeatedItem.tenThietBi} ({selectedRepeatedItem.maThietBi})
                </h3>
              </div>
              <button
                onClick={() => setSelectedRepeatedItem(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <span className="font-bold block">
                  Khuyến nghị: {selectedRepeatedItem.khuyenNghi}
                </span>
                <p className="text-[11px]">
                  {selectedRepeatedItem.lyDoKhuyenNghi}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Lịch sử các lần ghi nhận:
                </h4>
                <div className="space-y-2">
                  {selectedRepeatedItem.lichSu.map((occ, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-500 text-[11px]">
                          Lần {idx + 1} · {occ.ngay}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                          {occ.mucDo}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        <span className="font-medium text-slate-500">Hiện trạng: </span>
                        {occ.hienTrang}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        <span className="font-medium text-slate-500">Phương án xử lý: </span>
                        {occ.phuongAn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRepeatedItem(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div 
            className="max-w-3xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between text-xs">
              <span className="font-semibold truncate">{zoomImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={zoomImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white p-1"
                  title="Mở trong tab mới"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setZoomImage(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[80vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toast}
        </div>
      )}
    </div>
  );
};
