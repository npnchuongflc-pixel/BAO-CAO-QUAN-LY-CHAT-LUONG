import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SheetRowItem, FilterState, PeriodReportData, FacilityMetrics } from './types';
import {
  fetchGoogleSheetData,
  formatDateInput,
  formatMonthKey,
  isDateInRange,
  getDaysBetween,
  calculatePercentile,
  calculateDelta,
  formatDate,
  MIN_RANK_REPLIES
} from './services/sheetService';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FilterPanel } from './components/FilterPanel';
import { SourceProof } from './components/SourceProof';
import { KpiGrid } from './components/KpiGrid';
import { InsightStrip } from './components/InsightStrip';
import { DashboardGrid } from './components/DashboardGrid';
import { FacilityTable } from './components/FacilityTable';
import { FeedbackTable } from './components/FeedbackTable';
import { Footer } from './components/Footer';
import { Sidebar, ReportTabId, REPORT_GROUPS } from './components/Sidebar';
import { TeachingQualityTab } from './components/quality/TeachingQualityTab';
import { FacilityQualityModule } from './components/facility/FacilityQualityModule';

export default function App() {
  const [data, setData] = useState<SheetRowItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [syncTime, setSyncTime] = useState<Date | null>(null);

  // Active Report State for Vertical Toolbar
  const [activeReportTab, setActiveReportTab] = useState<ReportTabId>('teaching-quality');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterState>({
    start: '',
    end: '',
    facility: 'Tất cả',
    subject: 'Tất cả',
    course: 'Tất cả'
  });
  const [sortField, setSortField] = useState<string>('performance');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchGoogleSheetData();
      setData(items);

      const allDates = items
        .flatMap((e) => [e.sentAt, e.responseAt])
        .filter((d): d is Date => !!d);

      const latest = allDates.length
        ? new Date(Math.max(...allDates.map((d) => d.getTime())))
        : new Date();

      setFilters((prev) => ({
        ...prev,
        start: prev.start || formatDateInput(new Date(latest.getFullYear(), latest.getMonth(), 1)),
        end: prev.end || formatDateInput(latest)
      }));
      setSyncTime(new Date());
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique filter dropdown options
  const filterOptions = useMemo(() => {
    const facilities = (Array.from(new Set(data.map((e) => e.facility).filter(Boolean))) as string[]).sort((a, b) =>
      a.localeCompare(b, 'vi')
    );
    const subjects = (Array.from(new Set(data.map((e) => e.subject).filter(Boolean))) as string[]).sort((a, b) =>
      a.localeCompare(b, 'vi')
    );
    const courses = (Array.from(new Set(data.map((e) => e.course).filter(Boolean))) as string[]).sort((a, b) =>
      a.localeCompare(b, 'vi')
    );
    return { facilities, subjects, courses };
  }, [data]);

  const latestDate = useMemo(() => {
    const allDates = data
      .flatMap((e) => [e.sentAt, e.responseAt])
      .filter((d): d is Date => !!d);
    return allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;
  }, [data]);

  // Preset Date Selection
  const handlePreset = useCallback(
    (preset: 'month' | '30' | '90' | 'year') => {
      const allDates = data
        .flatMap((e) => [e.sentAt, e.responseAt])
        .filter((d): d is Date => !!d);
      const anchor = allDates.length
        ? new Date(Math.max(...allDates.map((d) => d.getTime())))
        : new Date();
      const start = new Date(anchor);

      if (preset === 'month') {
        start.setDate(1);
      } else if (preset === '30') {
        start.setDate(start.getDate() - 29);
      } else if (preset === '90') {
        start.setDate(start.getDate() - 89);
      } else if (preset === 'year') {
        start.setMonth(0, 1);
      }

      setFilters((prev) => ({
        ...prev,
        start: formatDateInput(start),
        end: formatDateInput(anchor)
      }));
    },
    [data]
  );

  const handleResetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      facility: 'Tất cả',
      subject: 'Tất cả',
      course: 'Tất cả'
    }));
  }, []);

  // Main Report Computation
  const reportData = useMemo<PeriodReportData | null>(() => {
    if (!filters.start || !filters.end) return null;

    const startDate = new Date(`${filters.start}T00:00:00`);
    const endDate = new Date(`${filters.end}T23:59:59`);

    // Match facility, subject, course
    const scopedRows = data.filter(
      (e) =>
        (filters.facility === 'Tất cả' || e.facility === filters.facility) &&
        (filters.subject === 'Tất cả' || e.subject === filters.subject) &&
        (filters.course === 'Tất cả' || e.course === filters.course)
    );

    // Current period metrics
    const sentInPeriod = scopedRows.filter((e) => isDateInRange(e.sentAt, startDate, endDate));
    const repliesInPeriod = scopedRows.filter(
      (e) => e.rating != null && isDateInRange(e.responseAt, startDate, endDate)
    );
    const cohortReplies = sentInPeriod.filter((e) => e.rating != null);
    const lowReplies = repliesInPeriod.filter((e) => (e.rating ?? 5) <= 3);

    const avgRating = repliesInPeriod.length
      ? repliesInPeriod.reduce((sum, e) => sum + (e.rating ?? 0), 0) / repliesInPeriod.length
      : null;

    const legacyRate = sentInPeriod.length
      ? repliesInPeriod.length / sentInPeriod.length
      : null;

    const cohortRate = sentInPeriod.length
      ? cohortReplies.length / sentInPeriod.length
      : null;

    const fiveStarCount = repliesInPeriod.filter((e) => e.rating === 5).length;
    const ratingCounts = [1, 2, 3, 4, 5].map(
      (stars) => repliesInPeriod.filter((e) => e.rating === stars).length
    );

    // Prior period delta calculation
    const daysInPeriod = getDaysBetween(startDate, endDate);
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - (daysInPeriod - 1) * 86400000);

    const prevSent = scopedRows.filter((e) => isDateInRange(e.sentAt, prevStartDate, prevEndDate));
    const prevReplies = scopedRows.filter(
      (e) => e.rating != null && isDateInRange(e.responseAt, prevStartDate, prevEndDate)
    );
    const prevAvg = prevReplies.length
      ? prevReplies.reduce((sum, e) => sum + (e.rating ?? 0), 0) / prevReplies.length
      : 0;
    const prevRate = prevSent.length ? prevReplies.length / prevSent.length : 0;

    // Day timeline map
    const dayMap = new Map<string, { key: string; label: string; sent: number; replies: number }>();
    for (let cur = new Date(startDate); cur <= endDate; cur.setDate(cur.getDate() + 1)) {
      const key = formatDateInput(cur);
      const pad = (n: number) => String(n).padStart(2, '0');
      dayMap.set(key, {
        key,
        label: `${pad(cur.getDate())}/${pad(cur.getMonth() + 1)}`,
        sent: 0,
        replies: 0
      });
    }

    sentInPeriod.forEach((e) => {
      if (e.sentAt) {
        const item = dayMap.get(formatDateInput(e.sentAt));
        if (item) item.sent++;
      }
    });

    repliesInPeriod.forEach((e) => {
      if (e.responseAt) {
        const item = dayMap.get(formatDateInput(e.responseAt));
        if (item) item.replies++;
      }
    });

    // Facility aggregation
    const allFacilityNames = [
      ...new Set([...sentInPeriod.map((e) => e.facility), ...repliesInPeriod.map((e) => e.facility)])
    ];

    const facilityList: FacilityMetrics[] = allFacilityNames.map((fac) => {
      const fSent = sentInPeriod.filter((t) => t.facility === fac);
      const fReplies = repliesInPeriod.filter((t) => t.facility === fac);
      const fCohort = fSent.filter((t) => t.rating != null);

      const fRate = fSent.length ? fReplies.length / fSent.length : null;
      const fCohortRate = fSent.length ? fCohort.length / fSent.length : null;

      const dist = [1, 2, 3, 4, 5].map((stars) => fReplies.filter((t) => t.rating === stars).length);
      const distSum = dist.reduce((s, c) => s + c, 0);
      const scoreSum = dist.reduce((s, c, i) => s + c * (i + 1), 0);
      const score = distSum ? scoreSum / distSum : null;
      const low = dist[0] + dist[1] + dist[2];

      const rankDist = [1, 2, 3, 4, 5].map(
        (stars) => fCohort.filter((t) => t.rating === stars).length
      );
      const rankReplies = fCohort.length;
      const rankScoreSum = rankDist.reduce((s, c, i) => s + c * (i + 1), 0);
      const rankScore = rankReplies ? rankScoreSum / rankReplies : null;
      const rankLow = rankDist[0] + rankDist[1] + rankDist[2];

      const rankEligible = rankReplies >= MIN_RANK_REPLIES;
      const status: 'Tốt' | 'Theo dõi' | 'Cần xử lý' =
        rankLow > 0 || (fCohortRate ?? 1) < 0.1
          ? 'Cần xử lý'
          : (fCohortRate ?? 1) < 0.2 || (rankScore ?? 5) < 4.7
          ? 'Theo dõi'
          : 'Tốt';

      return {
        facility: fac,
        sent: fSent.length,
        replies: fReplies.length,
        cohort: rankReplies,
        rate: fRate,
        cohortRate: fCohortRate,
        score,
        dist,
        low,
        status,
        rankEligible,
        rankReplies,
        rankRate: fCohortRate,
        rankScore,
        rankDist,
        rankLow
      };
    });

    // Score & ranking calculation formula
    const sentActiveFacilities = facilityList.filter((f) => f.sent > 0);
    const p90Replies = Math.max(
      1,
      calculatePercentile(sentActiveFacilities.map((f) => f.rankReplies), 0.9)
    );
    const p90Rate = Math.max(
      0.01,
      calculatePercentile(sentActiveFacilities.map((f) => f.rankRate ?? 0), 0.9)
    );

    const totalSystemDist = facilityList.reduce(
      (acc, f) => acc.map((sum, i) => sum + f.rankDist[i]),
      [0, 0, 0, 0, 0]
    );
    const totalSystemSum = totalSystemDist.reduce((acc, c) => acc + c, 0);
    const systemWeights = totalSystemDist.map((c) => (totalSystemSum ? c / totalSystemSum : 0.2));

    const scoredFacilities: FacilityMetrics[] = facilityList.map((fac) => {
      const adjustedStars = fac.rankDist.map(
        (cnt, i) => (cnt + 10 * systemWeights[i]) / (fac.rankReplies + 10)
      );
      const normReplies = Math.min(1, Math.log1p(fac.rankReplies) / Math.log1p(p90Replies));
      const normRate = Math.min(1, (fac.rankRate ?? 0) / p90Rate);
      const responseEffectiveness = 0.8 * normReplies + 0.2 * normRate;

      const rawPerformance =
        55 * responseEffectiveness +
        30 * adjustedStars[4] +
        15 * adjustedStars[3] -
        5 * adjustedStars[2] -
        20 * adjustedStars[1] -
        45 * adjustedStars[0];

      const performanceScore = fac.rankReplies
        ? Math.max(0, Math.min(100, (rawPerformance / 85) * 100))
        : null;

      return {
        ...fac,
        performanceScore,
        responseEffectiveness,
        adjustedStarRates: adjustedStars
      };
    });

    // Assign rank positions to eligible facilities
    const rankedEligible = [...scoredFacilities]
      .filter((f) => f.rankEligible)
      .sort(
        (a, b) =>
          (b.performanceScore ?? -1) - (a.performanceScore ?? -1) ||
          b.rankReplies - a.rankReplies ||
          b.rankDist[4] - a.rankDist[4] ||
          a.rankDist[0] - b.rankDist[0] ||
          (b.rankRate ?? -1) - (a.rankRate ?? -1) ||
          a.facility.localeCompare(b.facility, 'vi')
      );

    const rankMap = new Map<string, number>(rankedEligible.map((f, idx) => [f.facility, idx + 1]));

    const finalFacilities: FacilityMetrics[] = scoredFacilities.map((f) => ({
      ...f,
      rank: rankMap.get(f.facility) ?? null
    }));

    // Apply sorting to table
    finalFacilities.sort((a, b) => {
      if (sortField === 'rate') {
        return (b.rankRate ?? -1) - (a.rankRate ?? -1) || (a.rank ?? 9999) - (b.rank ?? 9999);
      }
      if (sortField === 'score') {
        return (b.rankScore ?? -1) - (a.rankScore ?? -1) || (a.rank ?? 9999) - (b.rank ?? 9999);
      }
      if (sortField === 'low') {
        return b.rankLow - a.rankLow || (a.rank ?? 9999) - (b.rank ?? 9999);
      }
      if (sortField === 'replies') {
        return b.rankReplies - a.rankReplies || (a.rank ?? 9999) - (b.rank ?? 9999);
      }
      // 'performance' (default)
      return (b.performanceScore ?? -1) - (a.performanceScore ?? -1) || (a.rank ?? 9999) - (b.rank ?? 9999);
    });

    // 12-Month Trend Aggregation
    const monthMap = new Map<string, { label: string; sent: number; replies: number }>();
    const anchorMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    for (let i = 11; i >= 0; i--) {
      const curMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - i, 1);
      const key = formatMonthKey(curMonth);
      const pad = (n: number) => String(n).padStart(2, '0');
      monthMap.set(key, {
        label: `${pad(curMonth.getMonth() + 1)}/${String(curMonth.getFullYear()).slice(-2)}`,
        sent: 0,
        replies: 0
      });
    }

    scopedRows.forEach((e) => {
      if (e.sentAt) {
        const item = monthMap.get(formatMonthKey(e.sentAt));
        if (item) item.sent++;
      }
      if (e.rating && e.responseAt) {
        const item = monthMap.get(formatMonthKey(e.responseAt));
        if (item) item.replies++;
      }
    });

    const months = [...monthMap.values()].map((m) => ({
      ...m,
      rate: m.sent ? m.replies / m.sent : null
    }));

    // Feedback verification list
    const feedbackList = repliesInPeriod
      .filter((e) => e.detail || (e.rating ?? 5) <= 3)
      .sort((a, b) => (b.responseAt?.getTime() ?? 0) - (a.responseAt?.getTime() ?? 0));

    // Response latency
    const delays = cohortReplies
      .map((e) =>
        e.sentAt && e.responseAt ? (e.responseAt.getTime() - e.sentAt.getTime()) / 3600000 : null
      )
      .filter((v): v is number => v != null && v >= 0)
      .sort((a, b) => a - b);

    const medianDelay = delays.length ? delays[Math.floor((delays.length - 1) / 2)] : null;
    const within24 = delays.length ? delays.filter((h) => h <= 24).length / delays.length : null;

    return {
      start: startDate,
      end: endDate,
      sent: sentInPeriod,
      replies: repliesInPeriod,
      cohortReplies,
      low: lowReplies,
      avg: avgRating,
      legacyRate,
      cohortRate,
      fiveStar: fiveStarCount,
      ratingCounts,
      dayPoints: [...dayMap.values()],
      facilities: finalFacilities,
      months,
      feedback: feedbackList,
      medianDelay,
      within24,
      delta: {
        sent: calculateDelta(sentInPeriod.length, prevSent.length),
        replies: calculateDelta(repliesInPeriod.length, prevReplies.length),
        rate: legacyRate == null ? null : legacyRate - prevRate,
        avg: avgRating == null ? null : avgRating - prevAvg
      }
    };
  }, [data, filters, sortField]);

  // CSV Export Handler
  const handleExportCsv = useCallback(() => {
    if (!reportData) return;
    const header = [
      'Ngày phản hồi',
      'Học viên',
      'Cơ sở',
      'Môn học',
      'Khóa học',
      'Rating',
      'Phản hồi chi tiết'
    ];

    const rows = reportData.replies.map((item) => [
      formatDate(item.responseAt, true),
      item.student,
      item.facility,
      item.subject,
      item.course,
      String(item.rating ?? ''),
      item.detail
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-zalo-${filters.start}-${filters.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportData, filters]);

  return (
    <div className="app-shell">
      {/* Vertical Sidebar Toolbar */}
      <Sidebar
        activeTab={activeReportTab}
        onSelectTab={(tabId) => setActiveReportTab(tabId)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        syncTime={syncTime}
        onRefreshData={loadData}
        loading={loading}
      />

      {/* Main Content Area */}
      <div className="app-main-content">
        <Header
          activeTab={activeReportTab}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main>
          {/* TAB 1: SURVEY & CSAT REPORT (Google Sheet Live Data) */}
          {activeReportTab === 'survey' && (
            <>
              <Hero
                totalRows={data.length}
                loading={loading}
                error={error}
                onRefresh={loadData}
              />

              <FilterPanel
                filters={filters}
                onFilterChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                onPreset={handlePreset}
                onReset={handleResetFilters}
                facilities={filterOptions.facilities}
                subjects={filterOptions.subjects}
                courses={filterOptions.courses}
              />

              {!error && data.length > 0 && (
                <SourceProof
                  totalCount={data.length}
                  latestDate={latestDate}
                  syncDate={syncTime}
                />
              )}

              {error && (
                <section className="error-banner">
                  <strong>Chưa tải được dữ liệu:</strong> {error}{' '}
                  <button onClick={loadData}>Thử lại</button>
                </section>
              )}

              {loading && !reportData ? (
                <section className="loading-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} />
                  ))}
                </section>
              ) : (
                reportData && (
                  <>
                    <KpiGrid data={reportData} />
                    <InsightStrip data={reportData} />
                    <DashboardGrid
                      dayPoints={reportData.dayPoints}
                      ratingCounts={reportData.ratingCounts}
                      facilities={reportData.facilities}
                      months={reportData.months}
                      totalReplies={reportData.replies.length}
                    />
                    <FacilityTable
                      facilities={reportData.facilities}
                      sortField={sortField}
                      onSortChange={setSortField}
                    />
                    <FeedbackTable
                      feedback={reportData.feedback}
                      onExportCsv={handleExportCsv}
                    />
                  </>
                )
              )}
            </>
          )}

          {/* TAB 2: TEACHING & CURRICULUM QUALITY TAB */}
          {activeReportTab === 'teaching-quality' && (
            <TeachingQualityTab />
          )}

          {/* TAB 3: FACILITY & HYGIENE QUALITY MODULE (NATIVE) */}
          {activeReportTab === 'integrated-quality-report' && (
            <FacilityQualityModule />
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
