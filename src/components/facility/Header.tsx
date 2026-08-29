import React from 'react';
import { ReportMode } from './facilityTypes';
import { ClipboardList, Building2 } from 'lucide-react';

interface HeaderProps {
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
  hygieneCount: number;
  qualityCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  hygieneCount,
  qualityCount,
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1m0HDCJNKl18rXzXHgMuwtANF5RxSyd6f";
  const logoFallback = "https://drive.google.com/thumbnail?id=1m0HDCJNKl18rXzXHgMuwtANF5RxSyd6f&sz=w200";

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top Header Row: Logo & Main Titles */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#3EA8E0]/30 bg-[#1A3A5C]/5 flex items-center justify-center shadow-xs flex-shrink-0">
            <img 
              src={logoUrl} 
              alt="Logo Cờ Vua Sài Gòn - SaiGon Art" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = logoFallback;
              }}
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1A3A5C] uppercase font-display">
              BÁO CÁO CHẤT LƯỢNG & VỆ SINH CƠ SỞ
            </h1>
            <p className="text-xs font-semibold text-[#1B5EA6] tracking-wide">
              Cờ Vua Sài Gòn - SaiGon Art
            </p>
          </div>
        </div>

        {/* Navigation Mode Switcher Tabs Below Header */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-start">
          <div className="flex bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 w-full sm:w-auto gap-1">
            <button
              onClick={() => onModeChange('hygiene')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'hygiene'
                  ? 'bg-[#1B5EA6] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#1A3A5C] hover:bg-white/80'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${mode === 'hygiene' ? 'text-[#3EA8E0]' : 'text-slate-500'}`} />
              <span>Chế độ Vệ Sinh</span>
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                mode === 'hygiene' ? 'bg-[#1A3A5C] text-[#F9C846]' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {hygieneCount}
              </span>
            </button>

            <button
              onClick={() => onModeChange('quality')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'quality'
                  ? 'bg-[#1A3A5C] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#1A3A5C] hover:bg-white/80'
              }`}
            >
              <Building2 className={`w-4 h-4 ${mode === 'quality' ? 'text-[#3EA8E0]' : 'text-slate-500'}`} />
              <span>Chế độ Chất Lượng Cơ Sở</span>
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                mode === 'quality' ? 'bg-[#1B5EA6] text-[#F9C846]' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {qualityCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};



