import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-6 border-t border-[#e2e8f2] text-center text-xs text-[#718096]">
      <div className="max-w-[1480px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#475569]">
          <ShieldCheck className="w-4 h-4 text-[#19a78e]" />
          <span className="font-semibold text-[#14213d]">CVSG Camera Quality Assurance</span>
          <span>·</span>
          <span>Số liệu lấy từ sheet “Quản lý camera”</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#8896ab]">
          <Info className="w-3.5 h-3.5" />
          <span>Trung tâm Cờ Vua Sài Gòn (CVSG) — Dữ liệu chuẩn hóa 03/2026 – 09/2026</span>
        </div>
      </div>
    </footer>
  );
};
