import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Eye
} from 'lucide-react';
import { FacilityMetrics } from '../../types';

interface FacilityAuditTabProps {
  facilities?: FacilityMetrics[];
}

interface FacilityAuditItem {
  id: string;
  name: string;
  address: string;
  cleanlinessScore: number; // /100
  equipmentScore: number; // /100 (Bàn cờ, đồng hồ, bảng vẽ, màu)
  safetyScore: number; // /100 (Lối thoát hiểm, PCCC, chống va đập góc bàn)
  environmentScore: number; // /100 (Ánh sáng, nhiệt độ 24-26C, độ ồn)
  lastAuditDate: string;
  auditor: string;
  status: 'Đạt chuẩn 5S' | 'Đạt (Cần bảo dưỡng)' | 'Cần khắc phục';
  openNotes: string;
}

const AUDIT_FACILITIES: FacilityAuditItem[] = [
  {
    id: 'fac-1',
    name: 'Cơ sở Hùng Vương Plaza',
    address: 'Quận 5, TP.HCM',
    cleanlinessScore: 98,
    equipmentScore: 97,
    safetyScore: 99,
    environmentScore: 96,
    lastAuditDate: '24/08/2026',
    auditor: 'Phòng QLCL (Nguyễn Văn An)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Bàn cờ gỗ thi đấu & đồng hồ DGT được vệ sinh khử khuẩn đầy đủ.',
  },
  {
    id: 'fac-2',
    name: 'Cơ sở Landmark 81',
    address: 'Bình Thạnh, TP.HCM',
    cleanlinessScore: 99,
    equipmentScore: 98,
    safetyScore: 100,
    environmentScore: 98,
    lastAuditDate: '25/08/2026',
    auditor: 'Phòng QLCL (Trần Thị Bích)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Phòng học mỹ thuật có hệ thống hút bụi than chì và thông gió tốt.',
  },
  {
    id: 'fac-3',
    name: 'Cơ sở Masteri Thảo Điền',
    address: 'TP. Thủ Đức, TP.HCM',
    cleanlinessScore: 95,
    equipmentScore: 94,
    safetyScore: 96,
    environmentScore: 95,
    lastAuditDate: '23/08/2026',
    auditor: 'Phòng QLCL (Phạm Hoàng)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Đã bổ sung bộ giá vẽ gỗ mới cho học sinh cấp 1.',
  },
  {
    id: 'fac-4',
    name: 'Cơ sở Phan Xích Long',
    address: 'Phú Nhuận, TP.HCM',
    cleanlinessScore: 92,
    equipmentScore: 91,
    safetyScore: 94,
    environmentScore: 90,
    lastAuditDate: '21/08/2026',
    auditor: 'Phòng QLCL (Lê Trọng)',
    status: 'Đạt (Cần bảo dưỡng)',
    openNotes: 'Đề xuất bảo dưỡng định kỳ máy lạnh phòng Cờ vua số 2.',
  },
  {
    id: 'fac-5',
    name: 'Cơ sở Hà Đô Centrosa',
    address: 'Quận 10, TP.HCM',
    cleanlinessScore: 97,
    equipmentScore: 96,
    safetyScore: 98,
    environmentScore: 95,
    lastAuditDate: '22/08/2026',
    auditor: 'Phòng QLCL (Nguyễn Văn An)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Bảng từ nam châm giảng dạy cờ vua hoạt động hoàn hảo.',
  },
  {
    id: 'fac-6',
    name: 'Cơ sở Vạn Hạnh Mall',
    address: 'Quận 10, TP.HCM',
    cleanlinessScore: 91,
    equipmentScore: 89,
    safetyScore: 93,
    environmentScore: 92,
    lastAuditDate: '20/08/2026',
    auditor: 'Phòng QLCL (Trần Thị Bích)',
    status: 'Đạt (Cần bảo dưỡng)',
    openNotes: 'Cần thay mới 3 bộ quân cờ nhựa bị mòn tại phòng học phụ huynh chờ.',
  },
  {
    id: 'fac-7',
    name: 'Cơ sở Estella Heights',
    address: 'TP. Thủ Đức, TP.HCM',
    cleanlinessScore: 96,
    equipmentScore: 95,
    safetyScore: 98,
    environmentScore: 97,
    lastAuditDate: '23/08/2026',
    auditor: 'Phòng QLCL (Phạm Hoàng)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Khu vực đón trả trẻ an toàn, có camera giám sát độ nét cao.',
  },
  {
    id: 'fac-8',
    name: 'Cơ sở Sala Thủ Thiêm',
    address: 'TP. Thủ Đức, TP.HCM',
    cleanlinessScore: 98,
    equipmentScore: 97,
    safetyScore: 99,
    environmentScore: 98,
    lastAuditDate: '24/08/2026',
    auditor: 'Phòng QLCL (Nguyễn Văn An)',
    status: 'Đạt chuẩn 5S',
    openNotes: 'Không gian mở, ánh sáng tiêu chuẩn 500 Lux bảo vệ mắt học sinh.',
  },
];

export const FacilityAuditTab: React.FC<FacilityAuditTabProps> = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = AUDIT_FACILITIES.filter((f) => {
    if (filterStatus === 'all') return true;
    return f.status === filterStatus;
  });

  const avgAuditOverall = Math.round(
    AUDIT_FACILITIES.reduce(
      (acc, cur) =>
        acc +
        (cur.cleanlinessScore + cur.equipmentScore + cur.safetyScore + cur.environmentScore) / 4,
      0
    ) / AUDIT_FACILITIES.length
  );

  return (
    <div className="tab-view-wrapper">
      <div className="tab-view-header">
        <div className="tab-view-header-left">
          <h1 className="tab-view-title">Giám Sát Cơ Sở Vật Chất &amp; Tiêu Chuẩn 5S</h1>
          <p className="tab-view-subtitle">
            Kiểm tra định kỳ phòng học, trang thiết bị bàn cờ, họa cụ và an toàn môi trường học tập
          </p>
        </div>
        <div className="tab-time-pills">
          <button
            type="button"
            className={`tab-time-pill ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Tất cả ({AUDIT_FACILITIES.length})
          </button>
          <button
            type="button"
            className={`tab-time-pill ${filterStatus === 'Đạt chuẩn 5S' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Đạt chuẩn 5S')}
          >
            Đạt chuẩn 5S
          </button>
          <button
            type="button"
            className={`tab-time-pill ${filterStatus === 'Đạt (Cần bảo dưỡng)' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Đạt (Cần bảo dưỡng)')}
          >
            Cần bảo dưỡng
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="card stat-card">
          <div className="stat-label">
            <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1.5" />
            Điểm Kiểm Định Tổng Hợp
          </div>
          <div className="stat-value text-emerald-700">{avgAuditOverall} / 100</div>
          <div className="stat-sub">Đạt cấp độ Chất Lượng Vàng</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <Sparkles className="w-4 h-4 text-blue-600 inline mr-1.5" />
            Vệ sinh &amp; Khử khuẩn 5S
          </div>
          <div className="stat-value text-blue-700">96.2%</div>
          <div className="stat-sub">Thực hiện trước &amp; sau mỗi ca học</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <Building2 className="w-4 h-4 text-purple-600 inline mr-1.5" />
            Trang Thiết Bị Bàn Cờ &amp; Họa Cụ
          </div>
          <div className="stat-value text-purple-700">95.0%</div>
          <div className="stat-sub">Bàn cờ, giá vẽ, màu nước an toàn</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">
            <Thermometer className="w-4 h-4 text-amber-600 inline mr-1.5" />
            Môi trường Lớp học
          </div>
          <div className="stat-value text-amber-700">25°C / 520 Lux</div>
          <div className="stat-sub">Nhiệt độ &amp; độ sáng bảo vệ thị lực</div>
        </div>
      </div>

      {/* Audit Standards Checklist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card panel p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            1. An Toàn &amp; PCCC Học Đường
          </div>
          <ul className="text-xs space-y-2 text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Góc bàn bo tròn chống va đập cho trẻ U6-U10
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Ổ cắm điện cao &gt; 1.5m kèm nắp che an toàn
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Lối thoát hiểm và bình cứu hỏa kiểm định 6 tháng
            </li>
          </ul>
        </div>

        <div className="card panel p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold">
            <Building2 className="w-5 h-5 text-blue-600" />
            2. Chuẩn Dụng Cụ Cờ Vua
          </div>
          <ul className="text-xs space-y-2 text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              Bàn cờ &amp; quân cờ chuẩn kích thước thi đấu FIDE
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              Đồng hồ điện tử DGT có pin dự phòng đầy đủ
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              Bảng từ nam châm treo tường không rung lắc
            </li>
          </ul>
        </div>

        <div className="card panel p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold">
            <Sparkles className="w-5 h-5 text-purple-600" />
            3. Chuẩn Học Liệu Mỹ Thuật
          </div>
          <ul className="text-xs space-y-2 text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
              Màu vẽ không độc hại, có chứng nhận an toàn EN71
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
              Tạp dề &amp; khăn lau riêng cho từng học viên
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
              Bồn rửa tay sạch và kệ sấy tác phẩm tranh vẽ
            </li>
          </ul>
        </div>
      </div>

      {/* Facility Detailed Audit Table */}
      <div className="card panel facility-table-panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2>Bảng Đánh Giá Chi Tiết Từng Cơ Sở</h2>
            <span>Kết quả thanh tra chất lượng cơ sở vật chất tháng 08/2026</span>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-facility">Tên Cơ Sở</th>
                <th className="col-compact">Vệ sinh 5S</th>
                <th className="col-compact">Họa cụ/Bàn cờ</th>
                <th className="col-compact">An toàn</th>
                <th className="col-compact">Môi trường</th>
                <th className="col-compact">Ngày kiểm tra</th>
                <th className="col-compact">Trạng thái</th>
                <th className="col-detail">Ghi chú kiểm định</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="col-facility font-medium text-slate-800">
                    <strong>{item.name}</strong>
                    <div className="text-[11px] text-slate-400 font-normal">{item.address}</div>
                  </td>
                  <td className="col-compact font-semibold text-blue-700">{item.cleanlinessScore}/100</td>
                  <td className="col-compact font-semibold text-purple-700">{item.equipmentScore}/100</td>
                  <td className="col-compact font-semibold text-emerald-700">{item.safetyScore}/100</td>
                  <td className="col-compact font-semibold text-amber-700">{item.environmentScore}/100</td>
                  <td className="col-compact text-slate-500">{item.lastAuditDate}</td>
                  <td className="col-compact">
                    <span
                      className={`badge ${
                        item.status === 'Đạt chuẩn 5S' ? 'good' : 'watch'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="col-detail text-xs text-slate-600">{item.openNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
