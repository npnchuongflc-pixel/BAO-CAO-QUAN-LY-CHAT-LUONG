import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  AlertCircle,
  Award,
  ShieldCheck,
  Building,
  CheckCircle2,
  TrendingUp,
  LayoutGrid,
  BarChart3,
  Trophy,
  Table as TableIcon,
  Brain,
  ChevronRight,
  Maximize2,
  Video
} from 'lucide-react';
import {
  TeachingAuditItem,
  TeachingFilterState,
  TeachingQualitySummary
} from '../../types';
import {
  fetchTeachingData,
  filterTeachingData,
  computeTeachingQualitySummary,
} from '../../services/teachingSheetService';
import { LookerCameraReport } from './LookerCameraReport';
import { TeachingFilters } from './TeachingFilters';
import { TeachingKpiCards } from './TeachingKpiCards';
import { TeachingCriteriaGrid } from './TeachingCriteriaGrid';
import { TeachingCharts } from './TeachingCharts';
import { TeacherLeaderboard } from './TeacherLeaderboard';
import { TeachingTable } from './TeachingTable';
import { AuditDetailModal } from './AuditDetailModal';
import { EvidenceModal } from './EvidenceModal';
import { TeachingAiModal } from './TeachingAiModal';
import { TeacherViolationDetailModal } from './TeacherViolationDetailModal';

const INITIAL_FILTERS: TeachingFilterState = {
  month: 'current',
  subject: 'all',
  facility: 'all',
  teacherRank: 'all',
  result: 'all',
  status: 'all',
  evaluator: 'all',
  searchTeacher: '',
  searchFacility: '',
  onlySevere: false,
  onlyViolations: false,
};

type ReportViewMode = 'looker-camera' | 'audit-log' | 'standards-6' | 'ranking';

export const TeachingQualityTab: React.FC = () => {
  const [rawData, setRawData] = useState<TeachingAuditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TeachingFilterState>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<ReportViewMode>('looker-camera');

  // Modals state
  const [selectedAuditItem, setSelectedAuditItem] = useState<TeachingAuditItem | null>(null);
  const [selectedTeacherNameForModal, setSelectedTeacherNameForModal] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchTeachingData();
      setRawData(items);
    } catch (err: any) {
      console.error('Error fetching teaching sheet data:', err);
      setError(err.message || 'Không thể kết nối đến Google Sheets Giám sát giảng dạy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return filterTeachingData(rawData, filters);
  }, [rawData, filters]);

  // Computed summary metrics
  const summary: TeachingQualitySummary = useMemo(() => {
    return computeTeachingQualitySummary(filteredData);
  }, [filteredData]);

  const handleFilterChange = (newFilters: Partial<TeachingFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenEvidence = (url: string, title: string) => {
    setEvidenceUrl(url);
    setEvidenceTitle(title);
  };

  const handleSelectTeacherModal = (teacherName: string) => {
    setSelectedTeacherNameForModal(teacherName);
  };

  return (
    <div className="tab-view-wrapper min-h-screen bg-slate-50/60 pb-16">
      {/* Loading & Error States */}
      {loading && rawData.length === 0 && (
        <div className="card panel p-12 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4 my-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
            <RotateCcw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Đang Tải Dữ Liệu Kiểm Định Từ Google Sheets...
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hệ thống đang nạp và xử lý hơn 19,537 ca dạy từ tab Giám sát chất lượng (gid=282336280). Vui lòng đợi trong giây lát.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="card panel p-6 bg-rose-50 border border-rose-200 rounded-2xl mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <div>
              <h4 className="font-bold text-sm text-rose-900">Không thể tải dữ liệu</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-300 transition-colors"
          >
            Thử kết nối lại
          </button>
        </div>
      )}

      {/* VIEW 1: EXACT LOOKER STUDIO CAMERA REPORT */}
      {rawData.length > 0 && viewMode === 'looker-camera' && (
        <LookerCameraReport
          summary={summary}
          rawData={rawData}
          filteredData={filteredData}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onOpenEvidence={handleOpenEvidence}
          onSelectTeacherModal={handleSelectTeacherModal}
          onOpenAiModal={() => setIsAiModalOpen(true)}
        />
      )}

      {/* VIEW 2: DETAILED AUDIT LOG & DRIVE EVIDENCE TABLE */}
      {rawData.length > 0 && viewMode === 'audit-log' && (
        <div className="space-y-4">
          <TeachingTable
            items={filteredData}
            onSelectItem={(item) => setSelectedAuditItem(item)}
            onOpenEvidence={handleOpenEvidence}
          />
        </div>
      )}

      {/* VIEW 3: 6 STANDARDS CRITERIA GRID */}
      {rawData.length > 0 && viewMode === 'standards-6' && (
        <div className="space-y-6">
          <TeachingKpiCards
            summary={summary}
            onSelectViolationFilter={() => handleFilterChange({ onlyViolations: true })}
            onSelectSevereFilter={() => handleFilterChange({ onlySevere: true })}
          />
          <TeachingCriteriaGrid criteria={summary.criteria} />
          <TeachingCharts
            summary={summary}
            onSelectViolationCategory={() => handleFilterChange({ result: 'Vi phạm' })}
          />
        </div>
      )}

      {/* VIEW 4: TEACHER & FACILITY LEADERBOARD */}
      {rawData.length > 0 && viewMode === 'ranking' && (
        <div className="space-y-6">
          <TeacherLeaderboard
            teachers={summary.teacherRanks}
            facilities={summary.facilityRanks}
            onSelectTeacher={(name) => handleSelectTeacherModal(name)}
            onSelectFacility={(fac) => handleFilterChange({ facility: fac })}
          />
        </div>
      )}

      {/* MODALS */}
      {/* 1. Teacher Violation Detail Modal (Lỗi chi tiết của GV theo khoảng thời gian) */}
      <TeacherViolationDetailModal
        teacherName={selectedTeacherNameForModal}
        allData={rawData}
        currentFilters={filters}
        onClose={() => setSelectedTeacherNameForModal(null)}
        onOpenEvidence={handleOpenEvidence}
        onOpenSingleAuditDetail={(item) => setSelectedAuditItem(item)}
      />

      {/* 2. Single Audit Detail Modal */}
      <AuditDetailModal
        item={selectedAuditItem}
        onClose={() => setSelectedAuditItem(null)}
        onOpenEvidence={handleOpenEvidence}
      />

      {/* 3. Evidence Image Preview Modal */}
      <EvidenceModal
        imageUrl={evidenceUrl}
        title={evidenceTitle}
        onClose={() => setEvidenceUrl(null)}
      />

      {/* 4. AI Pedagogical Advisor Modal (Gemini 3.7 Flash) */}
      <TeachingAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        summary={summary}
      />
    </div>
  );
};
