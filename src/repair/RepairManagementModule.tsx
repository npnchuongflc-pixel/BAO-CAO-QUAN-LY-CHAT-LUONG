/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProposalItem } from './types/proposal';
import { INITIAL_PROPOSALS } from './data/proposalsData';
import { fetchLiveProposalsFromSheet } from './services/sheetsService';
import { TimelineLeadTimeChart } from './components/TimelineLeadTimeChart';
import { CostAnalysisView } from './components/CostAnalysisView';
import { InspectionGalleryView } from './components/InspectionGalleryView';
import { ProposalDetailModal } from './components/ProposalDetailModal';
import { 
  Building, 
  Wrench, 
  RefreshCw, 
  Database, 
  Search, 
  Printer, 
  Download, 
  Check, 
  Clock, 
  DollarSign, 
  Eye, 
  Table as TableIcon, 
  LayoutGrid, 
  ChevronRight,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  FileSpreadsheet,
  X,
  ArrowLeft
} from 'lucide-react';

export interface RepairManagementModuleProps {
  onBack?: () => void;
}

export const RepairManagementModule: React.FC<RepairManagementModuleProps> = ({ onBack }) => {
  const [proposals, setProposals] = useState<ProposalItem[]>(INITIAL_PROPOSALS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'table' | 'timeline' | 'cost' | 'gallery'>('table');
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [filterApproval, setFilterApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterRepair, setFilterRepair] = useState<'all' | 'repaired' | 'unrepaired'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const formatVND = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Sync with Google Sheet
  const loadSheetData = async (showNotification = false) => {
    setIsLoading(true);
    try {
      const data = await fetchLiveProposalsFromSheet();
      setProposals(data);
      setLastSyncTime(new Date());
      if (showNotification) {
        showToast(`Đã đồng bộ ${data.length} đề xuất từ Sheet "ĐỀ XUẤT"`);
      }
    } catch {
      showToast('Đang hiển thị dữ liệu lưu sẵn từ Sheet "ĐỀ XUẤT"');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSheetData(false);

    // Tự động làm mới dữ liệu thời gian thực mỗi 60 giây
    const interval = setInterval(() => {
      loadSheetData(false);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Helper date parsing
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

  // Unique branches
  const branchList = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      if (p.coSo) set.add(p.coSo.trim());
    });
    return Array.from(set).sort();
  }, [proposals]);

  // Filtered dataset
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // 1. Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${p.id} ${p.coSo} ${p.vatPham} ${p.nguoiDeXuat} ${p.trangThaiGhiNhan} ${p.phuongAn} ${p.ghiChuKhacPhuc || ''} ${p.ghiChuKiemDuyet || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // 2. Branch
      if (selectedBranch !== 'all' && p.coSo.trim() !== selectedBranch) return false;

      // 3. Approval
      if (filterApproval === 'approved' && p.tinhTrangDuyet !== 'ĐÃ DUYỆT') return false;
      if (filterApproval === 'pending' && p.tinhTrangDuyet === 'ĐÃ DUYỆT') return false;

      // 4. Repair
      if (filterRepair === 'repaired' && !p.trangThaiSuaChua.includes('xong')) return false;
      if (filterRepair === 'unrepaired' && p.trangThaiSuaChua.includes('xong')) return false;

      // 5. Date range
      const itemDate = parseDateDMY(p.ngay);
      if (itemDate) {
        if (startDate) {
          const s = new Date(startDate + 'T00:00:00');
          if (itemDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate + 'T23:59:59');
          if (itemDate > e) return false;
        }
      }

      return true;
    });
  }, [proposals, searchQuery, selectedBranch, filterApproval, filterRepair, startDate, endDate]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã Đề Xuất',
      'Ngày Gửi',
      'Giờ Gửi',
      'Cơ Sở',
      'Người Đề Xuất',
      'Vật Phẩm',
      'Mức Độ',
      'Hiện Trạng',
      'Phương Án',
      'Tình Trạng Duyệt',
      'Người Duyệt',
      'Ngày Phê Duyệt',
      'Trạng Thái Sửa Chữa',
      'Kỹ Thuật Phụ Trách',
      'Ngày Sửa Xong',
      'Kinh Phí Thực Tế (VNĐ)',
      'Ghi Chú Kỹ Thuật Viên',
      'Link Ảnh Trước Sửa',
      'Link Ảnh Sau Sửa'
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
      `"${p.phuongAn.replace(/"/g, '""')}"`,
      `"${p.tinhTrangDuyet}"`,
      `"${p.nguoiKiemDuyet}"`,
      `"${p.ngayKiemDuyet}"`,
      `"${p.trangThaiSuaChua}"`,
      `"${p.nguoiKhacPhuc}"`,
      `"${p.ngaySuaChua}"`,
      `"${p.chiPhiThucTe !== null ? p.chiPhiThucTe : ''}"`,
      `"${(p.ghiChuKhacPhuc || '').replace(/"/g, '""')}"`,
      `"${p.linkAnh}"`,
      `"${p.anhSauSua || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_De_Xuat_Sua_Chua_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file CSV thành công');
  };

  // KPI Calculations
  const totalCount = filteredProposals.length;
  const approvedCount = filteredProposals.filter((p) => p.tinhTrangDuyet === 'ĐÃ DUYỆT').length;
  const pendingCount = filteredProposals.filter((p) => p.tinhTrangDuyet !== 'ĐÃ DUYỆT').length;
  const repairedCount = filteredProposals.filter((p) => p.trangThaiSuaChua.includes('xong')).length;
  const unrepairedCount = filteredProposals.filter((p) => !p.trangThaiSuaChua.includes('xong')).length;
  const totalCost = filteredProposals.reduce((sum, p) => sum + (p.chiPhiThucTe || 0), 0);
  const photoRepairedCount = filteredProposals.filter((p) => p.anhSauSua).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setFilterApproval('all');
    setFilterRepair('all');
    setStartDate('');
    setEndDate('');
    showToast('Đã đặt lại bộ lọc');
  };

  const isFiltered = Boolean(searchQuery || selectedBranch !== 'all' || filterApproval !== 'all' || filterRepair !== 'all' || startDate || endDate);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-20 antialiased font-sans">
      
      {/* 1. Executive Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer mr-1"
                title="Quay lại Giám sát Cơ sở & 5S"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Báo Cáo Kiểm Soát Đề Xuất & Tiến Độ Sửa Chữa Cơ Sở Vật Chất
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Sheet "ĐỀ XUẤT"</span>
                  {lastSyncTime && (
                    <span className="text-[9px] text-emerald-200/80 font-mono ml-0.5">
                      ({lastSyncTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hệ thống dữ liệu tập trung · Người duyệt: <strong>Huỳnh Phi Đoan</strong> · KTV: <strong>Phạm Văn Trưởng</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => loadSheetData(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
              title="Đồng bộ lại từ Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới dữ liệu</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In báo cáo</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Executive Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* 4 Golden Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng đề xuất */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                Tổng Số Đề Xuất Ghi Nhận
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
                {totalCount} <span className="text-xs font-sans font-normal text-slate-500">đề xuất</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Phân bổ trên {branchList.length} cơ sở toàn chuỗi
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Tình trạng phê duyệt */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium block">
                  Tình Trạng Phê Duyệt
                </span>
                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded font-bold">
                  {totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 mt-1">
                {approvedCount} <span className="text-xs font-sans font-normal text-emerald-800">đã duyệt</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Còn <strong className="text-amber-700">{pendingCount}</strong> đề xuất đang chờ duyệt
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Tiến độ sửa chữa */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium block">
                  Tiến Độ Sửa Chữa
                </span>
                <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded font-bold">
                  {totalCount > 0 ? Math.round((repairedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700 mt-1">
                {repairedCount} <span className="text-xs font-sans font-normal text-blue-800">xong</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Còn <strong className="text-slate-700">{unrepairedCount}</strong> hạng mục chưa xử lý
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Tổng kinh phí thực tế */}
          <div className="bg-white rounded-xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-900 font-semibold block">
                Tổng Kinh Phí Đã Chi (Cột T)
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-800 mt-1">
                {formatVND(totalCost)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {photoRepairedCount} ca sửa có ảnh nghiệm thu
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* 3. Executive Tab Navigation Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Bảng Theo Dõi Đề Xuất ({totalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Đối Chiếu Tiến Trình & SLA</span>
            </button>

            <button
              onClick={() => setActiveTab('cost')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'cost'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Báo Cáo Kinh Phí ({formatVND(totalCost)})</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Nghiệm Thu Ảnh Trước - Sau ({photoRepairedCount})</span>
            </button>
          </div>

          {/* Quick info right side */}
          <div className="text-xs text-slate-500 hidden sm:block pr-2">
            Đang lọc: <strong className="text-slate-900">{totalCount}</strong> đề xuất
          </div>

        </div>

        {/* 4. Active Tab Render Area */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            
            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
                
                {/* Search Box */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã đề xuất, tên vật phẩm, người gửi, ghi chú kỹ thuật..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold shrink-0">Cơ sở:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="all">Tất cả ({proposals.length})</option>
                    {branchList.map((b) => (
                      <option key={b} value={b}>
                        {b} ({proposals.filter((p) => p.coSo === b).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Approval Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setFilterApproval('all')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterApproval === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Duyệt: Tất cả
                  </button>
                  <button
                    onClick={() => setFilterApproval('approved')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterApproval === 'approved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Đã duyệt ({proposals.filter((p) => p.tinhTrangDuyet === 'ĐÃ DUYỆT').length})
                  </button>
                  <button
                    onClick={() => setFilterApproval('pending')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterApproval === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Chờ duyệt ({proposals.filter((p) => p.tinhTrangDuyet !== 'ĐÃ DUYỆT').length})
                  </button>
                </div>

                {/* Repair Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setFilterRepair('all')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterRepair === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Sửa: Tất cả
                  </button>
                  <button
                    onClick={() => setFilterRepair('repaired')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterRepair === 'repaired' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Đã sửa ({proposals.filter((p) => p.trangThaiSuaChua.includes('xong')).length})
                  </button>
                  <button
                    onClick={() => setFilterRepair('unrepaired')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      filterRepair === 'unrepaired' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Chưa sửa ({proposals.filter((p) => !p.trangThaiSuaChua.includes('xong')).length})
                  </button>
                </div>

                {/* View Style Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setViewStyle('table')}
                    className={`p-1.5 rounded cursor-pointer ${viewStyle === 'table' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500'}`}
                    title="Xem dạng Bảng tổng hợp"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewStyle('cards')}
                    className={`p-1.5 rounded cursor-pointer ${viewStyle === 'cards' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500'}`}
                    title="Xem dạng Thẻ chi tiết"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* Date Filters Row */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-slate-500 font-semibold">Lọc ngày đề xuất:</span>
                  
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-slate-500">Từ:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                    />
                  </div>

                  <span className="text-slate-400">→</span>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-slate-500">Đến:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                    />
                  </div>

                  {isFiltered && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>

                <span className="text-slate-500 font-mono text-[11px]">
                  Hiển thị: <strong>{totalCount}</strong> / {proposals.length} đề xuất
                </span>
              </div>
            </div>

            {/* Table or Cards Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {filteredProposals.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                  <p className="font-bold text-slate-700 text-sm">
                    Không tìm thấy đề xuất nào phù hợp với điều kiện lọc
                  </p>
                  <button
                    onClick={resetFilters}
                    className="text-amber-700 hover:underline font-semibold cursor-pointer"
                  >
                    Bấm vào đây để đặt lại bộ lọc
                  </button>
                </div>
              ) : viewStyle === 'table' ? (
                
                /* MASTER EXECUTIVE DATA TABLE */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] font-bold">
                        <th className="py-3.5 px-3">Mã ĐX</th>
                        <th className="py-3.5 px-3">Cơ Sở</th>
                        <th className="py-3.5 px-4">Vật Phẩm / Hiện Trạng</th>
                        <th className="py-3.5 px-3">Ngày Gửi ĐX</th>
                        <th className="py-3.5 px-3">Tình Trạng Duyệt & Ngày Duyệt</th>
                        <th className="py-3.5 px-3">Tiến Độ Sửa & Ngày Sửa</th>
                        <th className="py-3.5 px-3 text-right">Kinh Phí Thực Tế</th>
                        <th className="py-3.5 px-3 text-center">Nghiệm Thu</th>
                        <th className="py-3.5 px-3 text-center">Hồ Sơ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProposals.map((item) => {
                        const isApproved = item.tinhTrangDuyet === 'ĐÃ DUYỆT';
                        const isRepaired = item.trangThaiSuaChua.includes('xong');

                        return (
                          <tr 
                            key={item.id} 
                            onClick={() => setSelectedProposal(item)}
                            className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                          >
                            {/* Code */}
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                                {item.id}
                              </span>
                            </td>

                            {/* Branch */}
                            <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                              {item.coSo}
                            </td>

                            {/* Item & Problem */}
                            <td className="py-3 px-4 max-w-[240px]">
                              <div className="font-bold text-slate-900 truncate" title={item.vatPham}>
                                {item.vatPham}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5" title={item.trangThaiGhiNhan}>
                                {item.trangThaiGhiNhan}
                              </div>
                            </td>

                            {/* Propose Date */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-mono text-slate-900 font-medium">{item.ngay}</div>
                              <div className="text-[10px] text-slate-400">{item.gio} · {item.nguoiDeXuat}</div>
                            </td>

                            {/* Approval Status & Date */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isApproved ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-700" />
                                    ĐÃ DUYỆT
                                  </span>
                                  <div className="font-mono text-emerald-800 text-[11px] font-semibold mt-0.5">
                                    {item.ngayKiemDuyet || 'Đã duyệt'}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  CHƯA DUYỆT
                                </span>
                              )}
                            </td>

                            {/* Repair Status & Date */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isRepaired ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    ĐÃ SỬA XONG
                                  </span>
                                  <div className="font-mono text-blue-900 text-[11px] font-semibold mt-0.5">
                                    {item.ngaySuaChua || 'Đã sửa xong'}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    Chưa xử lý
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">KTV: {item.nguoiKhacPhuc}</div>
                                </div>
                              )}
                            </td>

                            {/* Cost */}
                            <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                              {item.chiPhiThucTe !== null && item.chiPhiThucTe > 0 ? (
                                <span className="text-emerald-700 text-sm">
                                  {formatVND(item.chiPhiThucTe)}
                                </span>
                              ) : item.chiPhiThucTe === 0 ? (
                                <span className="text-slate-800 font-semibold">
                                  0 đ
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal italic text-[11px]">
                                  {item.chiPhiGocStr || 'Chưa cập nhật'}
                                </span>
                              )}
                            </td>

                            {/* Before/After Photos */}
                            <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {item.linkAnh && (
                                  <button
                                    onClick={() => setZoomImage({ url: item.linkAnh, title: `Trước sửa: ${item.vatPham}`, subtitle: `Cơ sở ${item.coSo}` })}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                                    title="Xem ảnh hiện trạng trước sửa"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {item.anhSauSua && (
                                  <button
                                    onClick={() => setZoomImage({ url: item.anhSauSua, title: `Nghiệm thu sau sửa: ${item.vatPham}`, subtitle: `Ngày sửa: ${item.ngaySuaChua}` })}
                                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 font-bold cursor-pointer"
                                    title="Xem ảnh nghiệm thu sau sửa"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* View detail button */}
                            <td className="py-3 px-3 text-center">
                              <span className="text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                                Chi tiết
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              ) : (
                
                /* CARDS VIEW */
                <div className="divide-y divide-slate-100">
                  {filteredProposals.map((item) => {
                    const isApproved = item.tinhTrangDuyet === 'ĐÃ DUYỆT';
                    const isRepaired = item.trangThaiSuaChua.includes('xong');

                    return (
                      <div 
                        key={item.id} 
                        className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row items-start justify-between gap-5"
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {/* Thumbnail */}
                          <div 
                            onClick={() => item.linkAnh && setZoomImage({ url: item.linkAnh, title: item.vatPham, subtitle: item.coSo })}
                            className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-zoom-in relative group"
                          >
                            {item.linkAnh ? (
                              <img src={item.linkAnh} alt={item.vatPham} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Không ảnh</div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                {item.id}
                              </span>
                              <span className="font-bold text-slate-900 flex items-center gap-1">
                                <Building className="w-3.5 h-3.5 text-amber-600" />
                                {item.coSo}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                {item.ngay} ({item.gio})
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500 text-[11px]">
                                Người gửi: <strong>{item.nguoiDeXuat}</strong>
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900">
                              {item.vatPham}
                            </h3>

                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                              <div><strong>Hiện trạng: </strong>{item.trangThaiGhiNhan}</div>
                              <div><strong>Phương án: </strong>{item.phuongAn}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Key Status Block */}
                        <div className="w-full lg:w-72 shrink-0 space-y-2 text-xs">
                          {/* Approval */}
                          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div>
                              <span className="text-[10px] text-slate-500 block">TÌNH TRẠNG PHÊ DUYỆT</span>
                              <strong className={`text-xs ${isApproved ? 'text-emerald-900' : 'text-amber-900'}`}>
                                {isApproved ? `Đã duyệt (${item.ngayKiemDuyet || 'Đã duyệt'})` : 'Chưa phê duyệt'}
                              </strong>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {item.tinhTrangDuyet}
                            </span>
                          </div>

                          {/* Repair & Cost */}
                          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            isRepaired ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div>
                              <span className="text-[10px] text-slate-500 block">TIẾN ĐỘ SỬA CHỮA</span>
                              <strong className={`text-xs ${isRepaired ? 'text-blue-900 font-bold' : 'text-slate-500 font-medium'}`}>
                                {isRepaired ? `Xong ngày ${item.ngaySuaChua || 'Đã sửa'}` : 'Chưa xử lý'}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">KINH PHÍ</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {item.chiPhiThucTe !== null ? formatVND(item.chiPhiThucTe) : (item.chiPhiGocStr || '0 đ')}
                              </span>
                            </div>
                          </div>

                          {/* Button View Dossier */}
                          <button
                            onClick={() => setSelectedProposal(item)}
                            className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Xem hồ sơ đầy đủ & ảnh trước/sau
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Timeline Lead Time Chart */}
        {activeTab === 'timeline' && (
          <TimelineLeadTimeChart 
            proposals={filteredProposals}
            onOpenImage={(url, title) => setZoomImage({ url, title })}
          />
        )}

        {/* Tab 3: Cost Analysis */}
        {activeTab === 'cost' && (
          <CostAnalysisView 
            proposals={filteredProposals}
            onSelectProposal={(item) => setSelectedProposal(item)}
          />
        )}

        {/* Tab 4: Inspection Gallery Before/After */}
        {activeTab === 'gallery' && (
          <InspectionGalleryView 
            proposals={filteredProposals}
            onZoomImage={(url, title, subtitle) => setZoomImage({ url, title, subtitle })}
            onSelectProposal={(item) => setSelectedProposal(item)}
          />
        )}

      </main>

      {/* Proposal Dossier Modal */}
      <ProposalDetailModal
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onZoomImage={(url, title) => setZoomImage({ url, title })}
      />

      {/* Image Viewer Fullscreen Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomImage(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800">
              <div>
                <span className="font-bold text-sm block">{zoomImage.title}</span>
                {zoomImage.subtitle && (
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{zoomImage.subtitle}</span>
                )}
              </div>
              <button
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/40 overflow-auto">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[78vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toast}
        </div>
      )}

    </div>
  );
};

export default RepairManagementModule;
