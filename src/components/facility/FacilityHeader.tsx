import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';
import { ReportMode } from './facilityTypes';

interface FacilityHeaderProps {
  mode: ReportMode;
  onModeChange: (newMode: ReportMode) => void;
  hygieneCount: number;
  qualityCount: number;
}

export const FacilityHeader: React.FC<FacilityHeaderProps> = ({
  mode,
  onModeChange,
  hygieneCount,
  qualityCount
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                Hệ Thống Giám Sát Cơ Sở &amp; 5S
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Theo dõi chất lượng vệ sinh &amp; tình trạng cơ sở vật chất toàn hệ thống 19 cơ sở
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange('hygiene')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              mode === 'hygiene'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${mode === 'hygiene' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Báo Cáo Vệ Sinh</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              mode === 'hygiene' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {hygieneCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('quality')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              mode === 'quality'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${mode === 'quality' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Chất Lượng Cơ Sở</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              mode === 'quality' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {qualityCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
