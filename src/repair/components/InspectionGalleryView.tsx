/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProposalItem } from '../types/proposal';
import { Eye, Building, CheckCircle2, DollarSign, Calendar } from 'lucide-react';

interface InspectionGalleryViewProps {
  proposals: ProposalItem[];
  onZoomImage: (url: string, title: string, subtitle?: string) => void;
  onSelectProposal: (item: ProposalItem) => void;
}

export function InspectionGalleryView({ proposals, onZoomImage, onSelectProposal }: InspectionGalleryViewProps) {
  const formatVND = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const repairedWithPhotos = proposals.filter((p) => p.anhSauSua);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Thư Viện Nghiệm Thu Ảnh Đối Chứng (Trước & Sau Khi Sửa)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối chứng trực quan chất lượng thi công thực tế giữa hiện trạng ban đầu và sau khi kỹ thuật viên hoàn thành
          </p>
        </div>
        <span className="font-mono text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 self-start sm:self-auto">
          {repairedWithPhotos.length} hạng mục có ảnh đối chứng
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {repairedWithPhotos.map((item) => (
          <div 
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-4 space-y-3.5"
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    Cơ sở {item.coSo}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                  {item.vatPham}
                </h3>
              </div>

              {item.chiPhiThucTe !== null && item.chiPhiThucTe > 0 && (
                <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
                  {formatVND(item.chiPhiThucTe)}
                </span>
              )}
            </div>

            {/* Side-by-side Before/After Photos */}
            <div className="grid grid-cols-2 gap-3">
              {/* Before Photo */}
              <div 
                onClick={() => item.linkAnh && onZoomImage(item.linkAnh, `Trước khi sửa - ${item.vatPham}`, `Cơ sở ${item.coSo} · Gửi ngày: ${item.ngay}`)}
                className="space-y-1 group cursor-zoom-in"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                  <span>Trước sửa (Hiện trạng)</span>
                  <Eye className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="h-40 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative">
                  {item.linkAnh ? (
                    <img 
                      src={item.linkAnh} 
                      alt="Trước sửa"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      Không có ảnh
                    </div>
                  )}
                </div>
              </div>

              {/* After Photo */}
              <div 
                onClick={() => item.anhSauSua && onZoomImage(item.anhSauSua, `Nghiệm thu sau sửa - ${item.vatPham}`, `Ngày sửa: ${item.ngaySuaChua} · KTV: ${item.nguoiKhacPhuc}`)}
                className="space-y-1 group cursor-zoom-in"
              >
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold px-0.5">
                  <span>Sau sửa (Nghiệm thu)</span>
                  <Eye className="w-3 h-3 text-emerald-600 group-hover:text-emerald-800" />
                </div>
                <div className="h-40 rounded-lg bg-emerald-50 border border-emerald-300 overflow-hidden relative">
                  <img 
                    src={item.anhSauSua} 
                    alt="Sau sửa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  />
                </div>
              </div>
            </div>

            {/* Footer with dates & details */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                <span>Sửa xong: </span>
                <strong className="text-blue-900 font-mono font-semibold">{item.ngaySuaChua || 'Đã sửa xong'}</strong>
                <span className="text-slate-400 ml-1">({item.nguoiKhacPhuc})</span>
              </div>
              <button
                onClick={() => onSelectProposal(item)}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Xem chi tiết hồ sơ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
