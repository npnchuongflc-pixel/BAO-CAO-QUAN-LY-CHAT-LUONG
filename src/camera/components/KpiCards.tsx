import React from 'react';
import { KPIData } from '../types/camera';
import { formatNumberVN, formatPctVN } from '../data/cameraDataService';
import { CheckSquare, AlertOctagon, Camera, Wrench, Image as ImageIcon } from 'lucide-react';

interface KpiCardsProps {
  kpis: KPIData;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6" aria-label="Chỉ số hiệu suất chính">
      {/* 1. Lượt kiểm tra */}
      <article className="bg-white border border-[#e2e8f2] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(24,46,88,0.06)] relative overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2f6bff]"></div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6b7890]">Lượt kiểm tra</span>
          <span className="p-1.5 rounded-lg bg-[#2f6bff]/10 text-[#2f6bff]">
            <CheckSquare className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#14213d] my-1.5">
          {formatNumberVN(kpis.totalChecks)}
        </div>
        <p className="text-[11px] text-[#8290a5] font-medium m-0 truncate">
          {formatNumberVN(kpis.recordedCameras)} camera được ghi nhận
        </p>
      </article>

      {/* 2. Lượt bất ổn */}
      <article className="bg-white border border-[#e2e8f2] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(24,46,88,0.06)] relative overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#e44d5e]"></div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6b7890]">Lượt bất ổn</span>
          <span className="p-1.5 rounded-lg bg-[#e44d5e]/10 text-[#e44d5e]">
            <AlertOctagon className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#e44d5e] my-1.5">
          {formatNumberVN(kpis.totalIssues)}
        </div>
        <p className="text-[11px] text-[#8290a5] font-medium m-0 truncate">
          <span className="text-[#e44d5e] font-bold">
            {kpis.issueRate.toFixed(1).replace('.', ',')}%
          </span>{' '}
          trên tổng lượt kiểm tra
        </p>
      </article>

      {/* 3. Camera bị ảnh hưởng */}
      <article className="bg-white border border-[#e2e8f2] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(24,46,88,0.06)] relative overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f4a340]"></div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6b7890]">Camera bị ảnh hưởng</span>
          <span className="p-1.5 rounded-lg bg-[#f4a340]/10 text-[#c87d18]">
            <Camera className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#14213d] my-1.5">
          {formatNumberVN(kpis.affectedCameras)}
        </div>
        <p className="text-[11px] text-[#8290a5] font-medium m-0 truncate">
          Tính theo camera duy nhất
        </p>
      </article>

      {/* 4. Đã xác nhận khắc phục */}
      <article className="bg-white border border-[#e2e8f2] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(24,46,88,0.06)] relative overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#19a78e]"></div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6b7890]">Đã xác nhận khắc phục</span>
          <span className="p-1.5 rounded-lg bg-[#19a78e]/10 text-[#19a78e]">
            <Wrench className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#19a78e] my-1.5">
          {formatNumberVN(kpis.fixedCount)}
        </div>
        <p className="text-[11px] text-[#8290a5] font-medium m-0 truncate">
          <span className="text-[#19a78e] font-bold">
            {kpis.fixedRate.toFixed(1).replace('.', ',')}%
          </span>{' '}
          lượt bất ổn
        </p>
      </article>

      {/* 5. Có hình ảnh minh chứng */}
      <article className="col-span-2 sm:col-span-1 bg-white border border-[#e2e8f2] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(24,46,88,0.06)] relative overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8d75e8]"></div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6b7890]">Có hình ảnh minh chứng</span>
          <span className="p-1.5 rounded-lg bg-[#8d75e8]/10 text-[#8d75e8]">
            <ImageIcon className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#14213d] my-1.5">
          {kpis.evidenceRate.toFixed(1).replace('.', ',')}%
        </div>
        <p className="text-[11px] text-[#8290a5] font-medium m-0 truncate">
          {formatNumberVN(kpis.evidenceCount)}/{formatNumberVN(kpis.totalIssues)} lượt bất ổn
        </p>
      </article>
    </section>
  );
};
