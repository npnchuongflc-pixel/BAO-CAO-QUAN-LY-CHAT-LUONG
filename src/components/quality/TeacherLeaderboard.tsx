import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertTriangle,
  Building,
  GraduationCap,
  Search,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  Filter,
  UserCheck
} from 'lucide-react';
import { TeacherTeachingRank, FacilityTeachingRank } from '../../types';

interface TeacherLeaderboardProps {
  teachers: TeacherTeachingRank[];
  facilities: FacilityTeachingRank[];
  onSelectTeacher?: (teacherName: string) => void;
  onSelectFacility?: (facilityName: string) => void;
}

export const TeacherLeaderboard: React.FC<TeacherLeaderboardProps> = ({
  teachers,
  facilities,
  onSelectTeacher,
  onSelectFacility,
}) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'facilities'>('teachers');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'Tiêu biểu' | 'Cần lưu ý' | 'Tái đào tạo'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchStatus = teacherFilter === 'all' || t.status === teacherFilter;
      const matchSearch = t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.teacherRank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.facilities.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [teachers, teacherFilter, searchTerm]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      return f.facility.toLowerCase().includes(facilitySearch.toLowerCase());
    });
  }, [facilities, facilitySearch]);

  const exemplaryCount = teachers.filter((t) => t.status === 'Tiêu biểu').length;
  const attentionCount = teachers.filter((t) => t.status === 'Cần lưu ý' || t.status === 'Tái đào tạo').length;

  return (
    <div className="card panel p-5 mb-6 border border-slate-200/80 shadow-sm bg-white">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {activeTab === 'teachers' ? (
              <GraduationCap className="w-5 h-5 text-blue-600" />
            ) : (
              <Building className="w-5 h-5 text-purple-600" />
            )}
            {activeTab === 'teachers'
              ? 'Hồ Sơ & Xếp Hạng Chất Lượng Đội Ngũ Giáo Viên'
              : 'Bảng Xếp Hạng Tuân Thủ Tiêu Chuẩn 48 Cơ Sở'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'teachers'
              ? 'Theo dõi chỉ số tuân thủ, lịch sử vi phạm và đề xuất vinh danh hoặc tái đào tạo'
              : 'Xếp hạng chất lượng vận hành sư phạm và quản lý lớp học theo từng cơ sở'}
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('teachers')}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Đội ngũ Giáo viên ({teachers.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'facilities'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('facilities')}
          >
            <Building className="w-3.5 h-3.5" />
            Xếp hạng Cơ sở ({facilities.length})
          </button>
        </div>
      </div>

      {/* TEACHERS TAB */}
      {activeTab === 'teachers' && (
        <div>
          {/* Sub Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  teacherFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setTeacherFilter('all')}
              >
                Tất cả ({teachers.length})
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  teacherFilter === 'Tiêu biểu'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                onClick={() => setTeacherFilter('Tiêu biểu')}
              >
                <Award className="w-3 h-3" />
                Tiêu biểu ({exemplaryCount})
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  teacherFilter === 'Cần lưu ý'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
                onClick={() => setTeacherFilter('Cần lưu ý')}
              >
                <AlertTriangle className="w-3 h-3" />
                Cần lưu ý
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  teacherFilter === 'Tái đào tạo'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
                onClick={() => setTeacherFilter('Tái đào tạo')}
              >
                <Flame className="w-3 h-3" />
                Tái đào tạo ({attentionCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên giáo viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Teacher Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Họ và tên Giáo viên</th>
                  <th className="py-2.5 px-2">Bậc GV</th>
                  <th className="py-2.5 px-2">Môn</th>
                  <th className="py-2.5 px-2 text-right">Số ca dạy</th>
                  <th className="py-2.5 px-2 text-right">Ca Đạt Chuẩn</th>
                  <th className="py-2.5 px-2 text-right">Số ca Vi Phạm</th>
                  <th className="py-2.5 px-3">Tỷ lệ Tuân Thủ</th>
                  <th className="py-2.5 px-3">Nhóm lỗi chính</th>
                  <th className="py-2.5 px-3 text-center">Phân loại</th>
                  <th className="py-2.5 px-2 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.slice(0, 20).map((t, idx) => {
                  const isExemplary = t.status === 'Tiêu biểu';
                  const isRetrain = t.status === 'Tái đào tạo';
                  const isWarning = t.status === 'Cần lưu ý';

                  return (
                    <tr
                      key={t.teacherName + idx}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectTeacher && onSelectTeacher(t.teacherName)}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                            {idx + 1}
                          </div>
                          <span>{t.teacherName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{t.teacherRank}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.subject === 'Cờ'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {t.subject === 'Cờ' ? 'Cờ Vua' : 'Mỹ Thuật'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                        {t.totalShifts}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-emerald-700">
                        {t.goodShifts}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-600">
                        {t.violationShifts > 0 ? t.violationShifts : '0'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                t.complianceRate >= 98
                                  ? 'bg-emerald-500'
                                  : t.complianceRate >= 90
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${t.complianceRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{t.complianceRate}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate" title={t.violationCategories.join(', ')}>
                        {t.violationCategories.length > 0
                          ? t.violationCategories.join(', ')
                          : <span className="text-emerald-600 font-medium">Không vi phạm</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            isExemplary
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRetrain
                              ? 'bg-rose-100 text-rose-800'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-blue-600 hover:text-blue-800 font-medium">
                        <button
                          type="button"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTeacher && onSelectTeacher(t.teacherName);
                          }}
                        >
                          Lịch sử ca
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTeachers.length > 20 && (
            <div className="text-center text-[11px] text-slate-500 py-2">
              Hiển thị top 20 trên tổng số {filteredTeachers.length} giáo viên. Dùng ô tìm kiếm để tra cứu nhanh.
            </div>
          )}
        </div>
      )}

      {/* FACILITIES TAB */}
      {activeTab === 'facilities' && (
        <div>
          {/* Facility search */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-xs text-slate-500">
              Tổng số <strong>{facilities.length}</strong> cơ sở được đánh giá
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên cơ sở..."
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Hạng</th>
                  <th className="py-2.5 px-3">Tên Cơ Sở</th>
                  <th className="py-2.5 px-2 text-right">Tổng Ca Dạy</th>
                  <th className="py-2.5 px-2 text-right">Ca Đạt Chuẩn</th>
                  <th className="py-2.5 px-2 text-right">Ca Vi Phạm</th>
                  <th className="py-2.5 px-3">Tỷ lệ Đạt Chuẩn</th>
                  <th className="py-2.5 px-2 text-center">Sự cố nghiêm trọng</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  <th className="py-2.5 px-2 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacilities.map((f) => {
                  const isTop = f.rank <= 3;
                  const isWarning = f.status === 'Cảnh báo';

                  return (
                    <tr
                      key={f.facility}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectFacility && onSelectFacility(f.facility)}
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[11px] ${
                            f.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : f.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : f.rank === 3
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{f.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {f.facility}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                        {f.totalShifts.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-emerald-700">
                        {f.goodShifts.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-600">
                        {f.violationShifts}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                f.complianceRate >= 98
                                  ? 'bg-emerald-500'
                                  : f.complianceRate >= 95
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${f.complianceRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{f.complianceRate}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {f.severeCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            🚨 {f.severeCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            f.status === 'Tốt'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : f.status === 'Cảnh báo'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-blue-600 hover:text-blue-800 font-medium">
                        <button
                          type="button"
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFacility && onSelectFacility(f.facility);
                          }}
                        >
                          Lọc cơ sở
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
