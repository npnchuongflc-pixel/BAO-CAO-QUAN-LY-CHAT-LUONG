/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import chessLogo from '../assets/brands/co-vua-sai-gon.png';
import artLogo from '../assets/brands/saigon-art.png';
import { formatPrintDateTime, formatPrintDateOnly } from '../utils/printUtils';

interface PrintReportHeaderProps {
  title: string;
  subtitle?: string;
  dateRangeText?: string;
  dateRange?: string;
  facilityText?: string;
  extraMeta?: string;
  pageNumber?: string;
}

export const PrintReportHeader: React.FC<PrintReportHeaderProps> = ({
  title,
  subtitle = 'BÁO CÁO QUẢN LÝ CHẤT LƯỢNG NỘI BỘ',
  dateRangeText,
  dateRange,
  facilityText,
  extraMeta,
  pageNumber,
}) => {
  const printTimestamp = formatPrintDateTime();
  const effectiveDateRange = dateRangeText || dateRange;

  return (
    <div className="hidden print:block print-document-header mb-2.5 pb-2 border-b-2 border-slate-800 text-slate-900">
      {/* Top Banner with Logos and Organization Info */}
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-300">
        {/* Logos & System Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <img 
              src={chessLogo} 
              alt="Cờ Vua Sài Gòn" 
              className="h-8 w-auto object-contain"
            />
            <div className="h-6 w-px bg-slate-300" />
            <img 
              src={artLogo} 
              alt="Sài Gòn Art" 
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="leading-tight text-left">
            <h1 className="text-[11px] font-black tracking-wider uppercase text-[#1A3A5C]">
              HỆ THỐNG TRUNG TÂM CỜ VUA SÀI GÒN - SÀI GÒN ART
            </h1>
            <p className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wide">
              PHÒNG QUẢN LÝ CHẤT LƯỢNG
            </p>
          </div>
        </div>

        {/* Document Classification & Timestamp */}
        <div className="text-right text-[8.5px] text-slate-600 leading-tight">
          <p className="font-bold text-slate-800">
            MÃ TÀI LIỆU: QLCL-BC/{new Date().getFullYear()} {pageNumber ? `• ${pageNumber}` : ''}
          </p>
          <p>Thời điểm in: <span className="font-semibold text-slate-800">{printTimestamp}</span></p>
          <p className="text-[8px] text-slate-500 italic">Định dạng: Chuẩn A4 Landscape (Khổ ngang)</p>
        </div>
      </div>

      {/* Main Report Title */}
      <div className="text-center pt-2 pb-0.5">
        <h2 className="text-[14px] font-black tracking-tight text-[#1A3A5C] uppercase font-display">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-600 tracking-wide mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Filter Scope Meta Bar */}
      <div className="mt-1.5 py-1 px-2.5 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-between text-[9px] font-medium text-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          {effectiveDateRange && (
            <div>
              <span className="text-slate-500 font-normal">Thời gian:</span>{' '}
              <strong className="text-slate-900">{effectiveDateRange}</strong>
            </div>
          )}
          {facilityText && (
            <div>
              <span className="text-slate-500 font-normal">Phạm vi cơ sở:</span>{' '}
              <strong className="text-slate-900">{facilityText}</strong>
            </div>
          )}
          {extraMeta && (
            <div>
              <span className="text-slate-500 font-normal">Chế độ:</span>{' '}
              <strong className="text-slate-900">{extraMeta}</strong>
            </div>
          )}
        </div>
        <div className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[8.5px]">
          ✓ Dữ liệu chính thức
        </div>
      </div>
    </div>
  );
};
