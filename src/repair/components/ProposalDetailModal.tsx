/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProposalItem } from '../types/proposal';
import { 
  X, 
  Building, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  DollarSign, 
  User, 
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertOctagon
} from 'lucide-react';

interface ProposalDetailModalProps {
  proposal: ProposalItem | null;
  onClose: () => void;
  onZoomImage: (url: string, title: string) => void;
}

export function ProposalDetailModal({ proposal, onClose, onZoomImage }: ProposalDetailModalProps) {
  if (!proposal) return null;

  const isApproved = proposal.tinhTrangDuyet === 'ĐÃ DUYỆT';
  const isRepaired = proposal.trangThaiSuaChua.includes('xong');

  const formatVND = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md">
              {proposal.id}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight truncate max-w-md">
                {proposal.vatPham}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cơ sở {proposal.coSo}</span>
                <span>·</span>
                <span>Gửi ngày: {proposal.ngay} ({proposal.gio})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Photos Comparison: Before vs After */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Hình Ảnh Đối Chứng Thực Tế
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo 1: Before Repair */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Hiện trạng ban đầu (Trước khi sửa)
                  </span>
                  {proposal.linkAnh && (
                    <button
                      onClick={() => onZoomImage(proposal.linkAnh, `Hiện trạng ban đầu - ${proposal.vatPham}`)}
                      className="text-indigo-600 hover:underline text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Phóng to
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => proposal.linkAnh && onZoomImage(proposal.linkAnh, `Hiện trạng ban đầu - ${proposal.vatPham}`)}
                  className="h-48 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center cursor-zoom-in relative group"
                >
                  {proposal.linkAnh ? (
                    <img 
                      src={proposal.linkAnh} 
                      alt="Hiện trạng ban đầu"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">Không có ảnh hiện trạng</span>
                  )}
                </div>
              </div>

              {/* Photo 2: After Repair */}
              <div className={`rounded-xl border p-3 space-y-2 ${
                isRepaired ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold flex items-center gap-1 ${
                    isRepaired ? 'text-emerald-800' : 'text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isRepaired ? 'text-emerald-600' : 'text-slate-400'}`} />
                    Nghiệm thu sau sửa (Sau khi sửa)
                  </span>
                  {proposal.anhSauSua && (
                    <button
                      onClick={() => onZoomImage(proposal.anhSauSua, `Nghiệm thu sau sửa - ${proposal.vatPham}`)}
                      className="text-emerald-700 hover:underline text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Phóng to
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => proposal.anhSauSua && onZoomImage(proposal.anhSauSua, `Nghiệm thu sau sửa - ${proposal.vatPham}`)}
                  className={`h-48 rounded-lg overflow-hidden flex items-center justify-center relative group ${
                    proposal.anhSauSua ? 'cursor-zoom-in bg-white border border-emerald-300' : 'bg-slate-100 border border-slate-200'
                  }`}
                >
                  {proposal.anhSauSua ? (
                    <img 
                      src={proposal.anhSauSua} 
                      alt="Nghiệm thu sau sửa"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-slate-400 text-xs block">
                        {isRepaired ? 'Đã khắc phục xong (Chưa tải ảnh nghiệm thu)' : 'Chưa xử lý xong (Chưa có ảnh sau sửa)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Pillars of Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pillar 1: Thông tin đề xuất */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-500 block">
                1. Chi Tiết Đề Xuất Ban Đầu
              </span>
              <div>
                <span className="text-slate-500 block">Người gửi đề xuất:</span>
                <strong className="text-slate-900 font-semibold">{proposal.nguoiDeXuat}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Mức độ & Phân loại:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                    proposal.mucDo === 'Hư hỏng nặng' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {proposal.mucDo}
                  </span>
                  <span className="px-2 py-0.5 rounded font-medium bg-slate-200 text-slate-700 text-[11px]">
                    {proposal.deXuat}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Hiện trạng ghi nhận:</span>
                <p className="text-slate-900 font-medium mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  {proposal.trangThaiGhiNhan}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block">Phương án xử lý:</span>
                <p className="text-slate-800 mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  {proposal.phuongAn}
                </p>
              </div>
            </div>

            {/* Pillar 2: Phê duyệt & Sửa chữa & Kinh phí */}
            <div className="space-y-3">
              {/* Approval Box */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isApproved ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    2. Tình Trạng Phê Duyệt
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                    isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {proposal.tinhTrangDuyet}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block">Người phê duyệt:</span>
                    <strong className="text-slate-900 font-semibold">
                      {proposal.nguoiKiemDuyet || 'Huỳnh Phi Đoan'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ngày & giờ duyệt:</span>
                    <strong className={`font-mono ${isApproved ? 'text-emerald-800 font-bold' : 'text-slate-400 italic'}`}>
                      {proposal.ngayKiemDuyet || (isApproved ? 'Đã duyệt' : 'Chưa phê duyệt')}
                    </strong>
                  </div>
                </div>
                {proposal.ghiChuKiemDuyet && (
                  <div className="pt-1 border-t border-emerald-200/60 text-slate-700">
                    <span className="font-semibold text-emerald-900">Chỉ đạo từ người duyệt: </span>
                    {proposal.ghiChuKiemDuyet}
                  </div>
                )}
              </div>

              {/* Repair & Cost Box */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isRepaired ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    3. Tiến Độ Sửa Chữa & Kinh Phí
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                    isRepaired ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {proposal.trangThaiSuaChua}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block">Kỹ thuật viên phụ trách:</span>
                    <strong className="text-slate-900 font-semibold">{proposal.nguoiKhacPhuc}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ngày hoàn thành sửa:</span>
                    <strong className={`font-mono ${isRepaired ? 'text-blue-900 font-bold' : 'text-slate-400 italic'}`}>
                      {proposal.ngaySuaChua || (isRepaired ? 'Đã sửa xong' : 'Chưa xử lý')}
                    </strong>
                  </div>
                </div>

                {/* Cost */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between mt-1">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Kinh phí thực tế (Cột T):</span>
                    <span className="text-slate-400 text-[10px]">Lấy trực tiếp từ Google Sheet</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-base ${
                      proposal.chiPhiThucTe !== null && proposal.chiPhiThucTe > 0
                        ? 'text-emerald-700'
                        : proposal.chiPhiThucTe === 0
                          ? 'text-slate-800'
                          : 'text-slate-400 font-normal italic text-xs'
                    }`}>
                      {proposal.chiPhiThucTe !== null ? formatVND(proposal.chiPhiThucTe) : (proposal.chiPhiGocStr || 'Chưa cập nhật')}
                    </span>
                  </div>
                </div>

                {proposal.ghiChuKhacPhuc && (
                  <div className="pt-1 text-slate-700">
                    <span className="font-semibold text-blue-900">Giải trình kỹ thuật viên: </span>
                    {proposal.ghiChuKhacPhuc}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Dữ liệu xác thực từ Google Sheet (Row #{proposal.rowNumber})</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
