import React from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode } from './facilityTypes';
import { Building2, MapPin, Calendar, Eye, User, Sparkles } from 'lucide-react';

interface PhotoGalleryViewProps {
  mode: ReportMode;
  hygieneReports: HygieneReport[];
  qualityReports: FacilityQualityReport[];
  onSelectRecord: (record: HygieneReport | FacilityQualityReport) => void;
  onOpenImageModal: (imageUrl: string, title: string) => void;
}

export const PhotoGalleryView: React.FC<PhotoGalleryViewProps> = ({
  mode,
  hygieneReports,
  qualityReports,
  onSelectRecord,
  onOpenImageModal,
}) => {
  const isHygiene = mode === 'hygiene';
  const reports = isHygiene ? hygieneReports : qualityReports;

  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>BỘ SƯU TẬP ẢNH BÁO CÁO ({reports.length} ảnh)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem nhanh hình ảnh minh chứng tình trạng vệ sinh và chất lượng cơ sở
          </p>
        </div>
      </div>


      {reports.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
          Không có hình ảnh báo cáo nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reports.map((item) => {
            const isHyg = 'diemSo' in item;
            const title = isHyg ? item.coSo : (item as FacilityQualityReport).coSo;
            const area = item.khuVuc;
            const date = item.ngay;
            const time = item.gio;
            const person = isHyg ? item.nguoiKiemTra : (item as FacilityQualityReport).ten;
            const img = item.linkAnh;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Image header */}
                <div 
                  className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => onOpenImageModal(img, `${title} - ${area}`)}
                >
                  <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                  
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 left-3">
                    {isHyg ? (
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm ${
                        (item as HygieneReport).trangThai === 'Đạt'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}>
                        {(item as HygieneReport).trangThai} ({(item as HygieneReport).diemSo}pt)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-sm">
                        {(item as FacilityQualityReport).mucDo}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-white text-xs font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-slate-200">
                      <Calendar className="w-3 h-3 text-slate-300" /> {date} {time}
                    </span>
                    <span className="p-1 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 line-clamp-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{title}</span>
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span>{area}</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                      "{isHyg ? (item as HygieneReport).chiTiet : (item as FacilityQualityReport).deXuat}"
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3 text-slate-400" />
                      {person}
                    </span>
                    <button
                      onClick={() => onSelectRecord(item)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
