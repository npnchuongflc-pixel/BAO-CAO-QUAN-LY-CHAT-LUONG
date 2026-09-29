import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Download,
  UserCheck,
  Building2,
  ExternalLink,
  Eye,
  AlertOctagon,
  X,
  ShieldAlert
} from 'lucide-react';
import {
  CameraStorageRecord,
  CameraStorageSummary
} from '../types/storage';
import {
  fetchCameraStorageData,
  exportStorageToCSV
} from '../data/cameraStorageService';

interface CameraStorageReportProps {
  onBack?: () => void;
  onViewLocation?: (preview: { title: string; link: string; deviceName: string }) => void;
}

export const CameraStorageReport: React.FC<CameraStorageReportProps> = ({
  onViewLocation
}) => {
  const [records, setRecords] = useState<CameraStorageRecord[]>([]);
  const [summary, setSummary] = useState<CameraStorageSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Simple, streamlined filters
  const [viewTab, setViewTab] = useState<'urgent' | 'all'>('urgent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedManager, setSelectedManager] = useState<string>('all');

  // Load Data
  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCameraStorageData(force);
      setRecords(result.records);
      setSummary(result.summary);
      setLastSyncTime(result.lastSync);
    } catch (err: any) {
      console.error('Error fetching camera storage data:', err);
      setError(err.message || 'Lỗi khi tải dữ liệu thẻ nhớ từ Google Sheets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Facilities list
  const facilityList = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      if (r.facilityName) {
        map.set(r.facilityName, r.facilityName);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [records]);

  // Filtered records for Report 2
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Tab filter: urgent only (storage expired, overdue 2-week check, or error) vs all
      if (viewTab === 'urgent') {
        const isUrgent =
          r.storageStatus === 'expired' ||
          r.cycleStatus === 'overdue' ||
          r.cycleStatus === 'not_checked' ||
          r.storageStatus === 'critical' ||
          r.storageStatus === 'error';
        if (!isUrgent) return false;
      }

      // 2. Manager filter
      if (selectedManager !== 'all' && r.manager !== selectedManager) {
        return false;
      }

      // 3. Facility filter
      if (selectedFacility !== 'all' && r.facilityName !== selectedFacility && r.facilityCode !== selectedFacility) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.deviceName.toLowerCase().includes(q);
        const matchFacility = r.facilityName.toLowerCase().includes(q);
        const matchCode = r.facilityCode.toLowerCase().includes(q);
        const matchNote = r.note.toLowerCase().includes(q);
        const matchManager = r.manager.toLowerCase().includes(q);
        if (!matchName && !matchFacility && !matchCode && !matchNote && !matchManager) {
          return false;
        }
      }

      return true;
    });
  }, [records, viewTab, selectedManager, selectedFacility, searchQuery]);

  // Count urgent cameras
  const urgentCount = useMemo(() => {
    return records.filter(
      (r) =>
        r.storageStatus === 'expired' ||
        r.cycleStatus === 'overdue' ||
        r.cycleStatus === 'not_checked' ||
        r.storageStatus === 'critical' ||
        r.storageStatus === 'error'
    ).length;
  }, [records]);

  // Export CSV
  const handleExportCSV = () => {
    const csv = exportStorageToCSV(filteredRecords);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CVSG_KiemTra_TheNho_Camera_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* HEADER SECTION                                                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight uppercase">
                Báo Cáo Kiểm Tra Thẻ Nhớ Camera (Cột T:Y)
              </h2>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Cảnh báo chu kỳ 2 tuần
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Thống kê số ngày lưu trữ thực tế và nhắc nhở nhân viên kiểm tra thẻ nhớ định kỳ mỗi 14 ngày
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              Cập nhật: <strong className="text-slate-600">{lastSyncTime}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu mới nhất từ Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer"
            title="Xuất bảng dữ liệu sang Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BÁO CÁO 1: THỐNG KÊ SỐ LIỆU CẦN THIẾT NHẤT & CẢNH BÁO NHÂN SỰ              */}
      {/* ========================================================================= */}
      {summary && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                Báo Cáo 1: Số Liệu Thẻ Nhớ Trọng Yếu &amp; Phân Công Kiểm Tra
              </h3>
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              Tổng số: <strong className="text-slate-900">{summary.totalDevices}</strong> camera ({summary.totalFacilities} cơ sở)
            </div>
          </div>

          {/* 4 Essential Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: Hết thẻ nhớ / 0 ngày (Nguy cấp nhất) */}
            <div
              onClick={() => {
                setViewTab('urgent');
                setSelectedManager('all');
                setSelectedFacility('all');
              }}
              className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 transition hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between text-red-700 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">Hết Thẻ / 0 Ngày</span>
                <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-red-700">
                {summary.expiredStorageCount}
                <span className="text-xs font-normal text-red-600 ml-1.5">camera</span>
              </div>
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                🚨 Không còn dữ liệu lưu (Cần thay/format)
              </p>
            </div>

            {/* Metric 2: Cảnh báo quá hạn kiểm tra 2 tuần */}
            <div
              onClick={() => {
                setViewTab('urgent');
                setSelectedManager('all');
                setSelectedFacility('all');
              }}
              className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 transition hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">Quá Hạn Kiểm Tra 2T</span>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-800">
                {summary.overdueCycleCount + summary.notCheckedCount}
                <span className="text-xs font-normal text-amber-700 ml-1.5">camera</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                ⚠️ Đã quá 14 ngày chưa kiểm tra lại
              </p>
            </div>

            {/* Metric 3: Lưu trữ ngắn (< 14 ngày) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Lưu Trữ Dưới 14 Ngày</span>
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-black text-slate-800">
                {summary.shortStorageCount}
                <span className="text-xs font-normal text-slate-500 ml-1.5">camera</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Ghi đè nhanh, cần theo dõi định kỳ
              </p>
            </div>

            {/* Metric 4: Đạt chuẩn (≥ 14 ngày) */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Lưu Trữ Đạt Chuẩn</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {summary.goodStorageCount}
                <span className="text-xs font-normal text-emerald-600 ml-1.5">camera</span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                ✅ Thời gian lưu từ 14 - 45+ ngày
              </p>
            </div>
          </div>

          {/* Responsibility Bar for 2 Managers */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Tiến độ kiểm tra định kỳ 2 tuần theo nhân viên phụ trách:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.managers.map((mgr) => {
                const isSelected = selectedManager === mgr.name;
                const hasIssues = mgr.expired > 0 || mgr.overdue > 0;

                return (
                  <div
                    key={mgr.name}
                    onClick={() => {
                      setSelectedManager(isSelected ? 'all' : mgr.name);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/20'
                        : hasIssues
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {mgr.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{mgr.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Phụ trách: <strong>{mgr.total}</strong> camera
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {mgr.expired > 0 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          {mgr.expired} hết thẻ
                        </span>
                      )}
                      {mgr.overdue > 0 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {mgr.overdue} quá hạn 2T
                        </span>
                      )}
                      {mgr.expired === 0 && mgr.overdue === 0 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Đạt chuẩn 100%
                        </span>
                      )}
                      <span className="text-[10px] text-blue-600 font-bold ml-1">
                        {isSelected ? 'Bỏ chọn' : 'Lọc'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BÁO CÁO 2: DANH SÁCH CAMERA CẦN XỬ LÝ (HOẶC TOÀN BỘ)                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Controls & Quick Tab Row */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Segmented Tabs */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-1" />
            <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide mr-2">
              Báo Cáo 2: Danh Sách
            </span>

            <button
              type="button"
              onClick={() => setViewTab('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'urgent'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Camera Cần Xử Lý ({urgentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Tất Cả ({records.length})</span>
            </button>
          </div>

          {/* Simple Search & Facility Select */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã camera, cơ sở..."
                className="w-40 sm:w-48 pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Facility Select */}
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[170px]"
            >
              <option value="all">Tất cả cơ sở ({facilityList.length})</option>
              {facilityList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {/* Clear filters if any */}
            {(selectedFacility !== 'all' || selectedManager !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFacility('all');
                  setSelectedManager('all');
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1"
                title="Bỏ lọc tìm kiếm"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {filteredRecords.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {viewTab === 'urgent'
                ? 'Không có camera nào đang cần xử lý khẩn cấp theo bộ lọc này!'
                : 'Không tìm thấy camera nào phù hợp'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {viewTab === 'urgent'
                ? 'Tất cả thẻ nhớ đều đang hoạt động tốt hoặc trong hạn kiểm tra 2 tuần.'
                : 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc chọn cơ sở khác.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="px-4 py-2.5">Mã Camera (Cột U)</th>
                  <th className="px-3 py-2.5">Cơ Sở &amp; Người PT</th>
                  <th className="px-3 py-2.5">Ngày Kiểm Tra (Cột T)</th>
                  <th className="px-3 py-2.5">Cảnh Báo Chu Kỳ 2 Tuần</th>
                  <th className="px-3 py-2.5">Thời Gian Lưu Trữ (Cột X)</th>
                  <th className="px-3 py-2.5">Ghi Chú (Cột Y)</th>
                  <th className="px-3 py-2.5 text-center">Ảnh Vị Trí (Cột W)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        item.storageStatus === 'expired'
                          ? 'bg-red-50/30'
                          : item.cycleStatus === 'overdue'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* 1. Device Code */}
                      <td className="px-4 py-2.5">
                        <div className="font-black text-slate-900 font-mono flex items-center gap-1.5">
                          <span>{item.deviceName}</span>
                          {item.storageStatus === 'expired' && (
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Mã CS: {item.facilityCode}
                        </div>
                      </td>

                      {/* 2. Facility & Manager */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{item.facilityName}</div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{item.manager}</span>
                        </div>
                      </td>

                      {/* 3. Check Date */}
                      <td className="px-3 py-2.5">
                        {item.checkDateRaw ? (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-600" />
                              <span>{item.checkDateRaw}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              {item.daysSinceLastCheck === 0 ? (
                                <span className="text-emerald-600 font-bold">Hôm nay</span>
                              ) : (
                                <span>{item.daysSinceLastCheck} ngày trước</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa kiểm tra</span>
                        )}
                      </td>

                      {/* 4. 2-Week Cycle Alert */}
                      <td className="px-3 py-2.5">
                        {item.cycleStatus === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black bg-red-100 text-red-800 border border-red-200">
                            <AlertOctagon className="w-3 h-3 text-red-600" />
                            <span>QUÁ HẠN 2 TUẦN ({item.daysSinceLastCheck}d)</span>
                          </span>
                        ) : item.cycleStatus === 'due_soon' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Sắp đến hạn (còn {item.daysUntilNextCheck}d)</span>
                          </span>
                        ) : item.cycleStatus === 'valid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Trong hạn (còn {item.daysUntilNextCheck}d)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-600">
                            Chưa kiểm tra
                          </span>
                        )}
                      </td>

                      {/* 5. Storage Days */}
                      <td className="px-3 py-2.5">
                        {item.storageStatus === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black bg-red-600 text-white">
                            HẾT THẺ (0 NGÀY)
                          </span>
                        ) : typeof item.storageDays === 'number' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800">
                              {item.storageDays} ngày
                            </span>
                            {item.storageDays < 14 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                                &lt;14d
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                Đạt chuẩn
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10.5px]">
                            {item.storageDaysRaw || '-'}
                          </span>
                        )}
                      </td>

                      {/* 6. Notes */}
                      <td className="px-3 py-2.5">
                        {item.note ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-700">
                            {item.note}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 7. Image View Link */}
                      <td className="px-3 py-2.5 text-center">
                        {item.locationLink ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewLocation) {
                                onViewLocation({
                                  title: `Vị trí camera ${item.deviceName} - ${item.facilityName}`,
                                  link: item.locationLink!,
                                  deviceName: item.deviceName
                                });
                              } else {
                                window.open(item.locationLink, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Xem ảnh vị trí camera trên Drive"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem ảnh</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Không có</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraStorageReport;
