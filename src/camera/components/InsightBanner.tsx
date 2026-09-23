import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface InsightBannerProps {
  title: string;
  text: string;
  tag: string;
}

export const InsightBanner: React.FC<InsightBannerProps> = ({ title, text, tag }) => {
  return (
    <section className="bg-gradient-to-r from-[#eef4ff] to-[#f8fbff] border border-[#dbe7ff] rounded-2xl p-4 sm:p-4.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#2f6bff] text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
          !
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#14213d] m-0 mb-0.5 leading-snug">
            {title}
          </h2>
          <p className="text-xs text-[#59667b] m-0 font-normal leading-relaxed">
            {text}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 self-end sm:self-center">
        <span className="inline-flex items-center gap-1.5 bg-white border border-[#dbe7ff] text-[#2459d8] text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs whitespace-nowrap">
          <span>{tag}</span>
        </span>
      </div>
    </section>
  );
};
