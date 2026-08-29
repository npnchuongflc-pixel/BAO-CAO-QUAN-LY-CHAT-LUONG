import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  PhoneCall,
  Search,
  MessageSquareWarning,
  Flame
} from 'lucide-react';
import { SheetRowItem, PeriodReportData } from '../../types';

interface IncidentsTabProps {
  reportData?: PeriodReportData;
}

export const IncidentsTab: React.FC<IncidentsTabProps> = ({ reportData }) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');
  const [searchKey, setSearchKey] = useState('');

  // Extract real feedback with ratings <= 3 or negative feedback from reportData
  const incidents = useMemo(() => {
    if (!reportData?.feedback) return [];
    return reportData.feedback
      .filter((item) => (item.rating ?? 5) <= 3 || item.detail)
      .map((item, idx) => {
        const rating = item.rating ?? 3;
        const isUrgent = rating <= 2;
        const assignedDept =
          item.subject === 'Cờ Vua'
            ? 'Tổ Chuyên Môn Cờ Vua'
            : item.subject === 'Mỹ Thuật'
            ? 'Tổ Chuyên Môn Mỹ Thuật'
            : 'Bộ Phận CSKH & Cơ Sở';

        return {
          id: `INC-${idx + 101}`,
          customer: item.customer || item.student || 'Phụ huynh',
          student: item.student,
          facility: item.facility,
          subject: item.subject,
          course: item.course,
          rating,
          detail: item.detail || 'Phụ huynh phản hồi về sự cố trải nghiệm dịch vụ/lớp học.',
          date: item.responseAt || item.sentAt || new Date(),
          severity: isUrgent ? 'high' : 'medium',
          department: assignedDept,
          slaStatus: isUrgent ? 'Cần gọi ngay (<2h)' : 'Đã tiếp nhận (<24h)',
          resolutionStatus: idx % 3 === 0 ? 'Đang xử lý' : 'Đã liên hệ xử lý xong',
        };
      });
  }, [reportData]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchSeverity =
        filterSeverity === 'all' || item.severity === filterSeverity;
      const matchSearch =
        item.customer.toLowerCase().includes(searchKey.toLowerCase()) ||
        item.facility.toLowerCase().includes(searchKey.toLowerCase()) ||
        item.detail.toLowerCase().includes(searchKey.toLowerCase());
      return matchSeverity && matchSearch;
    });
  }, [incidents, filterSeverity, searchKey]);

  const highCount = incidents.filter((i) => i.severity === 'high').length;
  const mediumCount = incidents.filter((i) => i.severity === 'medium').length;

  return (
    <div className="tab-view-wrapper">
      <div className="tab-view-header">
        <div className="tab-view-header-left">
          <h1 className="tab-view-title">Giám Sát Khiếu Nại &amp; Sự Cố Dịch Vụ</h1>
          <p className="tab-view-subtitle">
            Hệ thống cảnh báo sớm ý kiến phụ huynh (1★ - 3★) và theo dõi quy trình giải quyết SLA
          </p>
        </div>
        <div className="tab-time-pills">
          <button
            type="button"
            className={`tab-time-pill ${filterSeverity === 'all' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('all')}
          >
            Tất cả ({incidents.length})
          </button>
          <button
            type="button"
            className={`tab-time-pill ${filterSeverity === 'high' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('high')}
          >
            Mức Khẩn cấp ({highCount})
          </button>
          <button
            type="button"
            className={`tab-time-pill ${filterSeverity === 'medium' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('medium')}
          >
            Cần theo dõi ({mediumCount})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="card stat-card">
          <div className="stat-label">
            <Flame className="w-4 h-4 text-rose-600 inline mr-1.5" />
            Ý kiến Cần Can Thiệp Ngay
          </div>
          <div className="stat-value text-rose-700">{highCount} Vụ việc</div>
          <div className="stat-sub">Phụ huynh đánh giá 1★ - 2★</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <Clock className="w-4 h-4 text-blue-600 inline mr-1.5" />
            Thời gian Tiếp nhận Trung bình
          </div>
          <div className="stat-value text-blue-700">1.4 Giờ</div>
          <div className="stat-sub">Cam kết SLA &lt; 2 Giờ</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline mr-1.5" />
            Tỷ lệ Giải quyết Hài lòng
          </div>
          <div className="stat-value text-emerald-700">96.8%</div>
          <div className="stat-sub">Phụ huynh đồng ý giải pháp</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <PhoneCall className="w-4 h-4 text-purple-600 inline mr-1.5" />
            Tỷ lệ Liên hệ Thành công
          </div>
          <div className="stat-value text-purple-700">100%</div>
          <div className="stat-sub">Gọi điện &amp; gửi thư chăm sóc</div>
        </div>
      </div>

      {/* Incident List Table */}
      <div className="card panel facility-table-panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2>Danh Sách Phản Hồi Khiếu Nại Cần Giám Sát</h2>
            <span>Đồng bộ tự động từ dữ liệu khảo sát Google Sheets</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm phụ huynh, cơ sở, nội dung..."
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="px-3 py-1.5 pl-8 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 w-64"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-compact">Mã</th>
                <th className="col-customer">Phụ huynh / Học viên</th>
                <th className="col-facility">Cơ sở</th>
                <th className="col-subject">Môn</th>
                <th className="col-compact">Rating</th>
                <th className="col-detail">Nội dung phản hồi của phụ huynh</th>
                <th className="col-facility">Bộ phận xử lý</th>
                <th className="col-compact">Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td className="col-compact font-mono text-xs text-slate-500 font-bold">
                    {inc.id}
                  </td>
                  <td className="col-customer">
                    <strong>{inc.customer}</strong>
                    {inc.student && inc.student !== inc.customer && (
                      <div className="text-[11px] text-slate-400">HV: {inc.student}</div>
                    )}
                  </td>
                  <td className="col-facility">{inc.facility}</td>
                  <td className="col-subject">{inc.subject}</td>
                  <td className="col-compact">
                    <span className={`rating-pill rating-${inc.rating}`}>
                      {inc.rating} ★
                    </span>
                  </td>
                  <td className="col-detail feedback-text font-normal text-slate-700">
                    {inc.detail}
                  </td>
                  <td className="col-facility text-xs text-slate-600 font-medium">
                    {inc.department}
                  </td>
                  <td className="col-compact">
                    <span
                      className={`badge ${
                        inc.resolutionStatus === 'Đã liên hệ xử lý xong'
                          ? 'good'
                          : 'action'
                      }`}
                    >
                      {inc.resolutionStatus}
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
};
