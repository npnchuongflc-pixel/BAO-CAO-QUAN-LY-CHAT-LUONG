import React, { useState } from 'react';
import { FacilitySummary, ReportMode } from './facilityTypes';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  X, 
  PlusCircle, 
  Filter, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface FacilityStatusModalProps {
  mode: ReportMode;
  summaries: FacilitySummary[];
  onClose: () => void;
  onSelectFacility: (facilityName: string) => void;
}

export const FacilityStatusModal: React.FC<FacilityStatusModalProps> = ({
  mode,
  summaries,
  onClose,
  onSelectFacility,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isHygiene = mode === 'hygiene';

  // Filter facilities by search term
  const filteredSummaries = summaries.filter(s => 
    s.coSo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const doneList = filteredSummaries.filter(s => s.soLanThucHien > 0);
  const notDoneList = filteredSummaries.filter(s => s.soLanThucHien === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                Chi Tiết Tình Trạng Thực Hiện 19 Cơ Sở
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Phân loại danh sách cơ sở <span className="text-emerald-700 font-semibold">Đã làm ({doneList.length})</span> và <span className="text-rose-700 font-semibold">Chưa làm ({notDoneList.length})</span> trong kỳ lọc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search inside Modal */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tên cơ sở..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Tổng cộng: <strong className="text-slate-900">{summaries.length}</strong> cơ sở chuẩn</span>
          </div>
        </div>

        {/* Two Columns Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 custom-scrollbar">
          
          {/* LEFT COLUMN: BÊN ĐÃ LÀM */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wider font-display">
                  Cơ Sở Đã Thực Hiện
                </h4>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {doneList.length} cơ sở
              </span>
            </div>

            {doneList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                Chưa có cơ sở nào thực hiện báo cáo phù hợp.
              </div>
            ) : (
              <div className="space-y-2.5">
                {doneList.map((item) => {
                  const rate = isHygiene ? (item.tyLeDat || 0) : (item.tyLeDaXuLy || 0);

                  return (
                    <div
                      key={item.coSo}
                      className="bg-white border border-slate-200/90 rounded-xl p-3.5 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col gap-2 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-bold text-sm text-slate-900">{item.coSo}</span>
                        </div>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                          {item.soLanThucHien} lượt
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lần cuối: {item.lanCuoiKiemTra || 'N/A'}</span>
                        </div>

                        {isHygiene ? (
                          <div className="font-semibold text-slate-700">
                            Đạt: <span className="text-emerald-700 font-bold">{rate.toFixed(0)}%</span> • TB: <span className="text-amber-800 font-bold font-mono">{item.diemTrungBinh.toFixed(0)} đ</span>
                          </div>
                        ) : (
                          <div className="font-semibold text-slate-700">
                            Xử lý: <span className="text-emerald-700 font-bold">{rate.toFixed(0)}%</span> • Sự cố: <span className={item.soSuCo > 0 ? 'text-rose-700 font-bold font-mono' : 'text-slate-500'}>{item.soSuCo}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onSelectFacility(item.coSo);
                          onClose();
                        }}
                        className="mt-1 w-full py-1.5 px-3 bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 hover:border-emerald-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" /> Lọc báo cáo cơ sở này
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: BÊN CHƯA LÀM */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h4 className="font-bold text-sm text-rose-800 uppercase tracking-wider font-display">
                  Cơ Sở Chưa Thực Hiện
                </h4>
              </div>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {notDoneList.length} cơ sở
              </span>
            </div>

            {notDoneList.length === 0 ? (
              <div className="p-6 text-center text-emerald-800 text-xs bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <span className="font-bold text-sm">Tuyệt vời! Tất cả 19 cơ sở đều đã có báo cáo trong kỳ</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notDoneList.map((item) => {
                  return (
                    <div
                      key={item.coSo}
                      className="bg-white border border-slate-200/90 rounded-xl p-3.5 hover:border-rose-300 transition-all flex flex-col gap-2 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-bold text-sm text-slate-900">{item.coSo}</span>
                        </div>
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                          Chưa có lượt kiểm tra
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                        <span>Cần gửi nhắc nhở nhân sự đi kiểm tra thực tế.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>* Bấm vào nút Lọc để xem chi tiết từng cơ sở.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
