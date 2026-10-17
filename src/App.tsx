import React, { Activity, lazy, Suspense, useCallback, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar, type ReportTabId } from './components/Sidebar';
import { CoverPage } from './components/CoverPage';
import { ReportBoundary, ReportLoading } from './components/ReportBoundary';

const SurveyReport = lazy(() => import('./SurveyReport'));
const TeachingQualityTab = lazy(() => import('./components/quality/TeachingQualityTab').then(m => ({ default: m.TeachingQualityTab })));
const FacilityQualityModule = lazy(() => import('./components/facility/FacilityQualityModule').then(m => ({ default: m.FacilityQualityModule })));

export default function App() {
  const [activeReportTab, setActiveReportTab] = useState<ReportTabId>('cover');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasOpenedSurvey, setHasOpenedSurvey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncTime, setSyncTime] = useState<Date | null>(null);
  const [teachingShiftsCount, setTeachingShiftsCount] = useState<number | null>(() => {
    try {
      const value = localStorage.getItem('teaching_total_shifts');
      return value && Number.isFinite(Number(value)) ? Number(value) : null;
    } catch { return null; }
  });
  const onSyncStatus = useCallback((busy: boolean, time: Date | null) => {
    setLoading(busy);
    setSyncTime(time);
  }, []);
  const refresh = useCallback(() => setRefreshKey(key => key + 1), []);
  const navigate = useCallback((tab: ReportTabId) => {
    if (tab === 'survey') setHasOpenedSurvey(true);
    setActiveReportTab(tab);
    setIsMobileSidebarOpen(false);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#report-content">Đến nội dung báo cáo</a>
      <Sidebar activeTab={activeReportTab} onSelectTab={navigate}
        isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(value => !value)}
        isMobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)}
        syncTime={syncTime} onRefreshData={activeReportTab === 'cover' ? undefined : refresh}
        loading={loading} teachingShiftsCount={teachingShiftsCount} />
      <div className="app-main-content">
        <Header activeTab={activeReportTab} onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onRefresh={refresh} onSelectTab={navigate} loading={loading} />
        <main id="report-content" tabIndex={-1}>
          {hasOpenedSurvey && <Activity mode={activeReportTab === 'survey' ? 'visible' : 'hidden'}>
            <ReportBoundary><Suspense fallback={<ReportLoading />}>
              <SurveyReport refreshKey={refreshKey} onSyncStatus={onSyncStatus} />
            </Suspense></ReportBoundary>
          </Activity>}
          <ReportBoundary key={activeReportTab}>
            <Suspense fallback={<ReportLoading />}>
              {activeReportTab === 'cover' && <CoverPage onNavigate={navigate} />}
              {activeReportTab === 'teaching-quality' && <TeachingQualityTab refreshKey={refreshKey} onUpdateTotalShifts={setTeachingShiftsCount} />}
              {activeReportTab === 'integrated-quality-report' && <FacilityQualityModule refreshKey={refreshKey} />}
            </Suspense>
          </ReportBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
}
