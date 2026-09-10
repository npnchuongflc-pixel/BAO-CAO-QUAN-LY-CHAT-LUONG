/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PrintReportFooterProps {
  preparedBy?: string;
  departmentHead?: string;
  directorate?: string;
}

export const PrintReportFooter: React.FC<PrintReportFooterProps> = ({
  preparedBy = 'Chuyên viên QLCL',
  departmentHead = 'Trưởng Phòng Quản Lý Chất Lượng',
  directorate = 'Ban Giám Đốc',
}) => {
  return (
    <div className="hidden print:block print-document-footer mt-8 pt-4 border-t border-slate-300 text-slate-800 break-inside-avoid page-break-inside-avoid">
      {/* Formal Signature Blocks */}
      <div className="grid grid-cols-3 gap-6 text-center pt-2 pb-14 text-[10px]">
        <div>
          <p className="font-bold uppercase tracking-wider text-slate-900">NGƯỜI LẬP BÁO CÁO</p>
          <p className="text-[9px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
          <div className="h-16" />
          <p className="font-semibold text-slate-700">{preparedBy}</p>
        </div>

        <div>
          <p className="font-bold uppercase tracking-wider text-slate-900">TRƯỞNG PHÒNG QLCL</p>
          <p className="text-[9px] text-slate-500 italic mt-0.5">(Ký, duyệt nội dung)</p>
          <div className="h-16" />
          <p className="font-semibold text-slate-700">{departmentHead}</p>
        </div>

        <div>
          <p className="font-bold uppercase tracking-wider text-slate-900">BAN GIÁM ĐỐC</p>
          <p className="text-[9px] text-slate-500 italic mt-0.5">(Phê duyệt & Chỉ đạo)</p>
          <div className="h-16" />
          <p className="font-semibold text-slate-700">{directorate}</p>
        </div>
      </div>

      {/* Footer Bottom Note */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500">
        <p>
          Hệ thống Trung tâm Cờ Vua Sài Gòn & Sài Gòn Art • Báo cáo nội bộ Phòng Quản lý Chất lượng.
        </p>
        <p className="italic">
          Vui lòng bảo mật thông tin tài liệu.
        </p>
      </div>
    </div>
  );
};
