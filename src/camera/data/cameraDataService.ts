import { RawTuple, RAW_PART_1 } from './rawPart1';
import { RAW_PART_2 } from './rawPart2';
import { MONTH_BENCHMARKS } from './benchmarks';
import { getCameraLocationLink } from './cameraLocations';
import {
  RawCheckRow,
  CameraAggregate,
  KPIData,
  SiteStats,
  DailyTrendPoint,
  FilterOptions,
  PriorityLevel,
  DefectiveCameraReport,
  CameraStatus,
  InspectionDayInfo
} from '../types/camera';

// Exact mapping of items with missing evidence from original HTML
const drNoEvidence: Record<string, number> = {
  "2026-03-18|Vinhomes|VHC7": 1,
  "2026-04-02|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-02|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-03|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-03|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-04|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-04|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-21|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-21|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-23|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-23|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-24|Gò Vấp|GVC7.1": 1,
  "2026-04-24|Gò Vấp|GVC7.2": 1,
  "2026-04-24|Phổ Quang|PQC3": 1,
  "2026-04-24|Phổ Quang|PQC7.1": 2,
  "2026-04-24|Richstar|RTC1": 1,
  "2026-04-24|Richstar|RTC2": 2,
  "2026-04-24|Richstar|RTC3": 1,
  "2026-04-24|Richstar|RTC7": 1,
  "2026-04-24|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-24|Thạnh Mỹ Lợi|TML7": 1,
  "2026-04-24|Vinhomes|VHC7": 1,
  "2026-04-24|Vinhomes|VHC7.1": 1,
  "2026-04-27|Thạnh Mỹ Lợi|TML3": 1,
  "2026-04-27|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-06|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-07|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-08|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-09|Thạnh Mỹ Lợi|TML3": 1,
  "2026-05-10|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-11|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-12|Gò Vấp|GVC7.1": 1,
  "2026-05-12|Gò Vấp|GVC7.2": 1,
  "2026-05-12|Phổ Quang|PQC3": 1,
  "2026-05-12|Phổ Quang|PQC7.1": 2,
  "2026-05-12|Richstar|RTC1": 1,
  "2026-05-12|Richstar|RTC2": 2,
  "2026-05-12|Richstar|RTC3": 1,
  "2026-05-12|Richstar|RTC7": 1,
  "2026-05-12|Thạnh Mỹ Lợi|TML3": 1,
  "2026-05-12|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-12|Vinhomes|VHC7": 1,
  "2026-05-12|Vinhomes|VHC7.1": 1,
  "2026-05-13|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-14|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-16|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-17|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-18|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-19|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-19|Vinhomes|VHC7": 1,
  "2026-05-20|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-20|Vinhomes|VHC7": 1,
  "2026-05-22|Richstar|RTC7": 1,
  "2026-05-22|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-23|Vinhomes|VHC7.1": 1,
  "2026-05-24|Vinhomes|VHC7.1": 1,
  "2026-05-25|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-26|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-27|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-28|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-29|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-30|Thạnh Mỹ Lợi|TML7": 1,
  "2026-05-31|Thạnh Mỹ Lợi|TML7": 1,
  "2026-06-01|Thạnh Mỹ Lợi|TML7": 1,
  "2026-06-17|Bình Phú|BPC0": 1,
  "2026-06-17|Bình Phú|BPC1": 1,
  "2026-06-17|Bình Phú|BPC2": 1,
  "2026-06-17|Bình Phú|BPC3": 1,
  "2026-06-17|Bình Phú|BPC4": 1,
  "2026-06-17|Bình Phú|BPC7": 1,
  "2026-06-23|Gò Vấp|GVC7.2": 1,
  "2026-06-24|Gò Vấp|GVC7.2": 1,
  "2026-06-29|Bình Phú|BPC0": 1,
  "2026-06-29|Bình Phú|BPC1": 1,
  "2026-06-29|Bình Phú|BPC2": 1,
  "2026-06-29|Bình Phú|BPC3": 1,
  "2026-06-29|Bình Phú|BPC4": 1,
  "2026-06-29|Bình Phú|BPC7": 1,
  "2026-07-06|Richstar|RTC2": 1,
  "2026-07-17|Hà Đô|HDC7": 1,
  "2026-07-23|Phổ Quang|PQC7.1": 1,
  "2026-08-16|Thạnh Mỹ Lợi|TML3": 1,
  "2026-08-19|Bình Phú|BPC2": 1,
  "2026-09-04|Gò Vấp|GVC7.1": 1,
  "2026-09-13|Bình Phú|BPC2": 1
};

// Site palette colors matching CVSG brand design
export const SITE_COLORS: Record<string, string> = {
  "Hà Đô": "#2f6bff",
  "Bình Tân": "#19a78e",
  "Gigamall": "#f4a340",
  "Tân Bình": "#e44d5e",
  "Gò Vấp": "#8d75e8",
  "Bình Phú": "#a6b3c8",
  "Thạnh Mỹ Lợi": "#27a5d9",
  "Dream Home": "#d06ac6",
  "Phú Nhuận": "#6f8b3d",
  "Vinhomes": "#7a6255",
  "RichMond": "#4fa8d8",
  "Nguyễn Duy Trinh": "#e16548",
  "Phổ Quang": "#8c6d54",
  "Hiệp Thành": "#58b97a",
  "Moonlight": "#d778c2",
  "Tân Phú": "#c45a7b",
  "Gia Hòa": "#448aff",
  "Richstar": "#ff7043",
  "An Phú": "#7e57c2"
};

const DEFAULT_PALETTE = [
  '#2f6bff', '#19a78e', '#f4a340', '#e44d5e', '#8d75e8',
  '#a6b3c8', '#27a5d9', '#d06ac6', '#6f8b3d', '#7a6255',
  '#4fa8d8', '#58b97a', '#d778c2', '#8c6d54'
];

export function getSiteColor(site: string, index = 0): string {
  if (SITE_COLORS[site]) return SITE_COLORS[site];
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

// Build consolidated and verified raw records list
export function getRawCheckRecords(): RawCheckRow[] {
  const combined: RawTuple[] = [...RAW_PART_1, ...RAW_PART_2];
  const noEvMap = { ...drNoEvidence };

  return combined.map((r) => {
    const key = `${r[0]}|${r[1]}|${r[2]}`;
    let evidence = r[6];
    if (noEvMap[key] && noEvMap[key] > 0) {
      evidence = false;
      noEvMap[key]--;
    }
    return {
      date: r[0],
      site: r[1],
      camera: r[2],
      status: r[3] || 'Chưa xác định',
      owner: r[4] || 'Chưa phân công',
      fixed: r[5],
      evidence
    };
  });
}

const ALL_RAW_RECORDS = getRawCheckRecords();

export const AVAILABLE_MONTHS = [
  { value: '09/2026', label: 'Tháng 09/2026', from: '2026-09-01', to: '2026-09-22' },
  { value: '08/2026', label: 'Tháng 08/2026', from: '2026-08-01', to: '2026-08-31' },
  { value: '07/2026', label: 'Tháng 07/2026', from: '2026-07-01', to: '2026-07-31' },
  { value: '06/2026', label: 'Tháng 06/2026', from: '2026-06-01', to: '2026-06-30' },
  { value: '05/2026', label: 'Tháng 05/2026', from: '2026-05-01', to: '2026-05-31' },
  { value: '04/2026', label: 'Tháng 04/2026', from: '2026-04-01', to: '2026-04-29' },
  { value: '03/2026', label: 'Tháng 03/2026', from: '2026-03-01', to: '2026-03-31' }
];

export const MIN_DATA_DATE = '2026-03-01';
export let MAX_DATA_DATE = '2026-09-22';

export function setMaxDataDate(d: string) {
  MAX_DATA_DATE = d;
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatNumberVN(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatPctVN(a: number, b: number): string {
  if (!b) return '0,0%';
  return (a / b * 100).toFixed(1).replace('.', ',') + '%';
}

// Filtering and aggregation engine
export function computeDashboardData(
  filters: FilterOptions,
  targetInspectionDate?: string,
  customRecords?: RawCheckRow[]
) {
  const activeRecords = customRecords && customRecords.length > 0 ? customRecords : ALL_RAW_RECORDS;
  const { dateFrom, dateTo, site, owner, status, searchQuery, evidenceOnly, periodMonth } = filters;

  // Check if we can use the official benchmark directly when looking at a clean month without sub-filters
  // NOTE: For 09/2026, never freeze with benchmark because user updates records live daily!
  const isCleanMonthBenchmark =
    !customRecords &&
    periodMonth !== 'custom' &&
    periodMonth !== 'all' &&
    periodMonth !== '09/2026' &&
    site === 'all' &&
    owner === 'all' &&
    status === 'all' &&
    !searchQuery &&
    !evidenceOnly &&
    MONTH_BENCHMARKS[periodMonth];

  // Base range records
  const inRangeRecords = activeRecords.filter(
    (r) => r.date >= dateFrom && r.date <= dateTo
  );

  // Checks filtered by site & owner
  const filteredChecks = inRangeRecords.filter(
    (r) => (site === 'all' || r.site === site) && (owner === 'all' || r.owner === owner)
  );

  // Issues subset
  const filteredIssues = filteredChecks.filter((r) => {
    const isIssue = r.status !== 'Hoạt động';
    if (!isIssue) return false;
    if (status !== 'all' && r.status !== status) return false;
    if (evidenceOnly && !r.evidence) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchCam = r.camera.toLowerCase().includes(q);
      const matchSite = r.site.toLowerCase().includes(q);
      const matchOwner = r.owner.toLowerCase().includes(q);
      if (!matchCam && !matchSite && !matchOwner) return false;
    }
    return true;
  });

  // Calculate CameraAggregates
  const cameraMap = new Map<string, CameraAggregate>();
  
  // Track all checked cameras in scope for total checks count
  const cameraChecksMap = new Map<string, number>();
  for (const r of filteredChecks) {
    cameraChecksMap.set(r.camera, (cameraChecksMap.get(r.camera) || 0) + 1);
  }

  // Pre-seed with benchmark cams if clean month
  if (isCleanMonthBenchmark) {
    const bm = MONTH_BENCHMARKS[periodMonth];
    for (const c of bm.cams) {
      const priority: PriorityLevel = (c.lost >= 5 || c.count >= 15) ? 'P1' : 'P2';
      cameraMap.set(c.camera, {
        camera: c.camera,
        site: c.site,
        owner: c.owner,
        count: c.count,
        lost: c.lost,
        unstable: c.unstable,
        other: Math.max(0, c.count - c.lost - c.unstable),
        last: c.last,
        status: c.status || 'Chưa xác định',
        evidence: c.evidence,
        locationLink: getCameraLocationLink(c.camera),
        priority,
        totalChecks: cameraChecksMap.get(c.camera) || c.count,
        records: filteredChecks.filter((r) => r.camera === c.camera)
      });
    }
  } else {
    // Dynamic grouping from filteredIssues
    for (const r of filteredIssues) {
      if (!cameraMap.has(r.camera)) {
        cameraMap.set(r.camera, {
          camera: r.camera,
          site: r.site,
          owner: r.owner,
          count: 0,
          lost: 0,
          unstable: 0,
          other: 0,
          last: r.date,
          status: r.status,
          evidence: false,
          locationLink: getCameraLocationLink(r.camera, r.locationLink),
          priority: 'P2',
          totalChecks: cameraChecksMap.get(r.camera) || 0,
          records: []
        });
      }

      const item = cameraMap.get(r.camera)!;
      item.count++;
      item.evidence = item.evidence || r.evidence;
      if (!item.locationLink && r.locationLink) {
        item.locationLink = r.locationLink;
      }
      item.records.push(r);

      if (r.status === 'Mất kết nối') item.lost++;
      else if (r.status === 'Chập chờn') item.unstable++;
      else item.other++;

      if (r.date >= item.last) {
        item.last = r.date;
        item.status = r.status;
      }
    }

    // Assign priorities
    for (const item of cameraMap.values()) {
      item.priority = (item.lost >= 5 || item.count >= 15) ? 'P1' : 'P2';
      // Format last date to Vietnamese DD/MM/YYYY if in YYYY-MM-DD
      if (item.last.includes('-')) {
        item.last = formatDateVN(item.last);
      }
    }
  }

  const cameraList = Array.from(cameraMap.values()).sort((a, b) => {
    // P1 before P2
    if (a.priority === 'P1' && b.priority !== 'P1') return -1;
    if (a.priority !== 'P1' && b.priority === 'P1') return 1;
    return b.count - a.count || b.lost - a.lost || a.camera.localeCompare(b.camera, 'vi');
  });

  // Calculate KPIs
  let kpis: KPIData;

  if (isCleanMonthBenchmark) {
    const bm = MONTH_BENCHMARKS[periodMonth];
    kpis = {
      totalChecks: bm.checks,
      recordedCameras: bm.cameras,
      totalIssues: bm.issues,
      issueRate: bm.checks ? (bm.issues / bm.checks) * 100 : 0,
      affectedCameras: bm.problemCameras,
      fixedCount: bm.fixed,
      fixedRate: bm.issues ? (bm.fixed / bm.issues) * 100 : 0,
      evidenceCount: bm.evidence,
      evidenceRate: bm.issues ? (bm.evidence / bm.issues) * 100 : 0,
      unstableTotal: bm.unstable,
      lostTotal: bm.lost,
      otherTotal: Math.max(0, bm.issues - bm.unstable - bm.lost)
    };
  } else {
    const totalChecksCount = filteredChecks.length;
    const uniqueCheckedCameras = new Set(filteredChecks.map((r) => r.camera)).size;
    const totalIssuesCount = filteredIssues.length;
    const affectedCamsCount = cameraList.length;
    const fixedIssuesCount = filteredIssues.filter((r) => r.fixed).length;
    const evidenceIssuesCount = filteredIssues.filter((r) => r.evidence).length;
    const unstableCount = filteredIssues.filter((r) => r.status === 'Chập chờn').length;
    const lostCount = filteredIssues.filter((r) => r.status === 'Mất kết nối').length;
    const otherCount = totalIssuesCount - unstableCount - lostCount;

    kpis = {
      totalChecks: totalChecksCount,
      recordedCameras: uniqueCheckedCameras,
      totalIssues: totalIssuesCount,
      issueRate: totalChecksCount ? (totalIssuesCount / totalChecksCount) * 100 : 0,
      affectedCameras: affectedCamsCount,
      fixedCount: fixedIssuesCount,
      fixedRate: totalIssuesCount ? (fixedIssuesCount / totalIssuesCount) * 100 : 0,
      evidenceCount: evidenceIssuesCount,
      evidenceRate: totalIssuesCount ? (evidenceIssuesCount / totalIssuesCount) * 100 : 0,
      unstableTotal: unstableCount,
      lostTotal: lostCount,
      otherTotal: Math.max(0, otherCount)
    };
  }

  // Sites distribution
  let siteStatsList: SiteStats[] = [];

  if (isCleanMonthBenchmark) {
    const bm = MONTH_BENCHMARKS[periodMonth];
    const totalIssues = bm.issues || 1;
    siteStatsList = bm.sites.map(([siteName, count], idx) => ({
      site: siteName,
      count,
      percentage: (count / totalIssues) * 100,
      color: getSiteColor(siteName, idx)
    }));
  } else {
    const siteCountMap = new Map<string, number>();
    for (const r of filteredIssues) {
      siteCountMap.set(r.site, (siteCountMap.get(r.site) || 0) + 1);
    }
    const totalIssues = filteredIssues.length || 1;
    siteStatsList = Array.from(siteCountMap.entries())
      .map(([siteName, count], idx) => ({
        site: siteName,
        count,
        percentage: (count / totalIssues) * 100,
        color: getSiteColor(siteName, idx)
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Filter siteStats if specific site is selected
  const displayedSites = site === 'all'
    ? siteStatsList
    : siteStatsList.filter((s) => s.site === site);

  // Daily Trend Points
  let dailyTrends: DailyTrendPoint[] = [];

  if (isCleanMonthBenchmark) {
    const bm = MONTH_BENCHMARKS[periodMonth];
    const [mm, yyyy] = periodMonth.split('/');
    const statusMap = new Map<string, number[]>();
    for (const [day, arr] of bm.statusDays) {
      statusMap.set(day, arr); // [unstable, lost, other] or [_, unstable, lost]
    }

    dailyTrends = bm.days.map(([day, total]) => {
      const fullDate = `${yyyy}-${mm}-${day}`;
      const st = statusMap.get(day) || [0, 0, 0];
      // Note: bm.statusDays format is [day, [val1, val2, val3]]
      // e.g. for 09/2026: [0, lost, unstable]
      const unstable = st[1] || 0;
      const lost = st[2] || 0;
      const other = Math.max(0, total - unstable - lost);

      return {
        date: fullDate,
        dayLabel: `${day}/${mm}`,
        totalIssues: total,
        unstable,
        lost,
        other
      };
    });
  } else {
    // Dynamic daily calculation
    const allDates = Array.from(new Set(filteredChecks.map((r) => r.date))).sort();
    const dayIssuesMap = new Map<string, { unstable: number; lost: number; other: number; total: number }>();

    for (const d of allDates) {
      dayIssuesMap.set(d, { unstable: 0, lost: 0, other: 0, total: 0 });
    }

    for (const r of filteredIssues) {
      if (!dayIssuesMap.has(r.date)) {
        dayIssuesMap.set(r.date, { unstable: 0, lost: 0, other: 0, total: 0 });
      }
      const entry = dayIssuesMap.get(r.date)!;
      entry.total++;
      if (r.status === 'Chập chờn') entry.unstable++;
      else if (r.status === 'Mất kết nối') entry.lost++;
      else entry.other++;
    }

    dailyTrends = allDates.map((dateStr) => {
      const entry = dayIssuesMap.get(dateStr) || { unstable: 0, lost: 0, other: 0, total: 0 };
      const parts = dateStr.split('-');
      const dayLabel = `${parts[2]}/${parts[1]}`;
      return {
        date: dateStr,
        dayLabel,
        totalIssues: entry.total,
        unstable: entry.unstable,
        lost: entry.lost,
        other: entry.other
      };
    });
  }

  // Insight banner text
  const topSite = displayedSites[0] || { site: 'Toàn hệ thống', count: 0, percentage: 0 };
  let insightTitle = '';
  let insightText = '';
  let insightTag = 'Ưu tiên kiểm tra đường truyền & nguồn điện';

  if (displayedSites.length > 0 && topSite.count > 0) {
    const periodLabel = periodMonth !== 'custom' ? `tháng ${periodMonth}` : `khoảng đã chọn`;
    insightTitle = `${topSite.site} là điểm cần ưu tiên xử lý (${periodLabel})`;
    insightText = `${formatNumberVN(topSite.count)} lượt bất ổn, chiếm ${formatPctVN(topSite.count, kpis.totalIssues || 1)} toàn bộ sự cố ghi nhận. Ưu tiên kiểm tra thiết bị switch và dây mạng camera tái diễn nhiều lần.`;
    insightTag = topSite.site.includes('Hà Đô') || topSite.site.includes('Bình Tân')
      ? 'Ưu tiên kiểm tra đường truyền & nguồn điện'
      : 'Cần bảo trì kỹ thuật định kỳ';
  } else {
    insightTitle = 'Hệ thống hoạt động ổn định';
    insightText = 'Không ghi nhận sự cố bất thường đối với các tiêu chí và khoảng thời gian được lọc.';
    insightTag = 'Tình trạng tốt';
  }

  // Generate Defective Cameras Report strictly for the target inspection date (ngày kiểm tra)
  // Nếu ngày được chọn chưa có dữ liệu trong hệ thống (ví dụ ngày tương lai/chưa nhập), danh sách sẽ là rỗng
  const inspectionDate = targetInspectionDate || (dateTo >= MAX_DATA_DATE ? MAX_DATA_DATE : dateTo);

  // Check records specifically on this target inspection date
  const dayRecords = activeRecords.filter((r) => r.date === inspectionDate);
  const dayHasRecords = dayRecords.length > 0;

  // Filter only broken/defective cameras on that date
  const defectiveOnDay = dayRecords.filter((r) => {
    const isDefective = r.status === 'Mất kết nối' || r.status === 'Chập chờn';
    if (!isDefective) return false;
    if (site !== 'all' && r.site !== site) return false;
    if (owner !== 'all' && r.owner !== owner) return false;
    if (status !== 'all' && r.status !== status) return false;
    return true;
  });

  const defectiveCamerasReport: DefectiveCameraReport[] = defectiveOnDay.map((rec) => {
    // Find all historical issues for this camera up to inspectionDate
    const history = activeRecords.filter(
      (r) => r.camera === rec.camera && r.date <= inspectionDate && (r.status === 'Mất kết nối' || r.status === 'Chập chờn')
    ).sort((a, b) => a.date.localeCompare(b.date));

    const totalIncidents = history.length;
    const lostCount = history.filter((r) => r.status === 'Mất kết nối').length;
    const unstableCount = history.filter((r) => r.status === 'Chập chờn').length;
    const firstIssueDate = history.length > 0 ? formatDateVN(history[0].date) : formatDateVN(rec.date);
    const latestIssueDate = formatDateVN(rec.date);
    const isLost = rec.status === 'Mất kết nối';

    let diagnostics = '';
    let recommendedAction = '';

    if (rec.camera === 'HDC5') {
      diagnostics = `Mất kết nối ngày ${latestIssueDate}. Nghi ngờ hỏng adapter nguồn PoE hoặc đứt ngầm dây cáp mạng RJ45 từ switch tầng.`;
      recommendedAction = 'Đo kiểm điện áp nguồn PoE 48V, bấm lại jack RJ45 hoặc thay thế adapter nguồn.';
    } else if (rec.camera === 'HDC1' || rec.camera === 'HDC2' || rec.camera === 'HDC7') {
      diagnostics = `Chập chờn tín hiệu ngày ${latestIssueDate} (tái diễn ${totalIncidents} lần). Suy hao cáp mạng, nghẽn luồng RTSP camera hoặc lỏng đầu bấm.`;
      recommendedAction = 'Bấm lại đầu cáp mạng RJ45, cấu hình luồng phụ (Sub-stream) và kiểm tra cổng switch.';
    } else if (rec.camera === 'HDC3') {
      diagnostics = `Tín hiệu chập chờn ngày ${latestIssueDate}. Switch mạng phòng học quá tải lưu lượng.`;
      recommendedAction = 'Khởi động lại switch tầng, cắm chuyển sang cổng LAN Gigabit dự phòng.';
    } else if (rec.camera === 'BTC1') {
      diagnostics = `Mất kết nối ngày ${latestIssueDate}. Nghi ngờ tuột giắc cắm hoặc nguồn adapter bị chập.`;
      recommendedAction = 'Cử kỹ thuật viên kiểm tra trực tiếp nguồn camera tại Bình Tân, thay dây nguồn nếu cần.';
    } else if (rec.camera === 'GGM6') {
      diagnostics = `Mất kết nối ngày ${latestIssueDate}. Reset thiết bị chưa duy trì được tín hiệu ổn định.`;
      recommendedAction = 'Đo kiểm độ ổn định tín hiệu trong 48h, gắn thiết bị chống sét lan truyền.';
    } else if (rec.camera === 'TBC0') {
      diagnostics = `Mất kết nối ngày ${latestIssueDate}. Mất nguồn điện cấp cho switch chi nhánh hoặc hỏng bộ đổi nguồn.`;
      recommendedAction = 'Kiểm tra ổ cắm điện nguồn trung tâm cơ sở Tân Bình và thay bộ cấp nguồn.';
    } else if (isLost) {
      diagnostics = `Mất kết nối hoàn toàn ngày ${latestIssueDate}. Camera không nhận địa chỉ IP trong mạng nội bộ, mất nguồn hoặc đứt cáp LAN.`;
      recommendedAction = 'Kiểm tra đèn tín hiệu cổng LAN camera, thay thế nguồn adapter 12V/PoE.';
    } else {
      diagnostics = `Tín hiệu chập chờn ngày ${latestIssueDate} (${totalIncidents} lần tái diễn). Hình ảnh giật lag hoặc mất khung hình.`;
      recommendedAction = 'Vệ sinh ống kính, bấm lại hạt mạng RJ45 và tối ưu hóa băng thông camera.';
    }

    let severity: 'Khẩn cấp (Mất tín hiệu)' | 'Cảnh báo (Chập chờn)' | 'Cần theo dõi';
    if (isLost || lostCount >= 3) {
      severity = 'Khẩn cấp (Mất tín hiệu)';
    } else if (totalIncidents >= 5) {
      severity = 'Cảnh báo (Chập chờn)';
    } else {
      severity = 'Cần theo dõi';
    }

    let currentCondition: 'Đang mất kết nối' | 'Đang chập chờn' | 'Tái diễn liên tục';
    if (isLost) {
      currentCondition = 'Đang mất kết nối';
    } else if (totalIncidents >= 7) {
      currentCondition = 'Tái diễn liên tục';
    } else {
      currentCondition = 'Đang chập chờn';
    }

    return {
      camera: rec.camera,
      site: rec.site,
      owner: rec.owner,
      inspectionDate: rec.date,
      currentStatus: rec.status as CameraStatus,
      firstIssueDate,
      latestIssueDate,
      consecutiveDays: totalIncidents,
      totalIncidents,
      lostCount,
      unstableCount,
      isFixed: rec.fixed,
      hasEvidence: rec.evidence,
      locationLink: getCameraLocationLink(rec.camera, rec.locationLink),
      severity,
      diagnostics,
      recommendedAction,
      currentCondition
    };
  });

  return {
    kpis,
    cameraList,
    defectiveCamerasReport,
    inspectionDayInfo: {
      date: inspectionDate,
      hasRecords: dayHasRecords,
      totalRecords: dayRecords.length,
      defectiveCount: defectiveOnDay.length,
      latestAvailableDate: MAX_DATA_DATE
    },
    siteStatsList: displayedSites,
    dailyTrends,
    insight: {
      title: insightTitle,
      text: insightText,
      tag: insightTag
    },
    filterOptions: {
      availableSites: Array.from(new Set(inRangeRecords.map((r) => r.site).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'vi')
      ),
      availableOwners: Array.from(new Set(inRangeRecords.map((r) => r.owner).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'vi')
      ),
      availableStatuses: Array.from(
        new Set(
          inRangeRecords
            .filter((r) => r.status !== 'Hoạt động')
            .map((r) => r.status)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'vi'))
    }
  };
}

// CSV Export functionality
export function exportCameraDataToCSV(cameras: CameraAggregate[]): string {
  const headers = ['Mức ưu tiên', 'Cơ sở', 'Mã Camera', 'Tình trạng gần nhất', 'Số lần tái diễn', 'Mất kết nối', 'Chập chờn', 'Ngày gần nhất', 'Minh chứng', 'Link mô tả vị trí'];
  const rows = cameras.map((c) => [
    c.priority,
    `"${c.site}"`,
    c.camera,
    `"${c.status}"`,
    c.count,
    c.lost,
    c.unstable,
    c.last,
    c.evidence ? 'Có' : 'Thiếu',
    `"${c.locationLink || ''}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// CSV Export for Defective Cameras Report
export function exportDefectiveCamerasToCSV(defectiveList: DefectiveCameraReport[]): string {
  const headers = [
    'Ngày kiểm tra',
    'Mã Camera',
    'Cơ sở',
    'Tình trạng hiện trạng',
    'Phân loại hiện trạng',
    'Mức độ nghiêm trọng',
    'Ngày phát hiện đầu',
    'Ngày bị lỗi gần nhất',
    'Số lần tái diễn',
    'Mất kết nối (lần)',
    'Chập chờn (lần)',
    'Link mô tả vị trí'
  ];

  const rows = defectiveList.map((d) => [
    formatDateVN(d.inspectionDate),
    d.camera,
    `"${d.site}"`,
    `"${d.currentStatus}"`,
    `"${d.currentCondition}"`,
    `"${d.severity}"`,
    d.firstIssueDate,
    d.latestIssueDate,
    d.totalIncidents,
    d.lostCount,
    d.unstableCount,
    `"${d.locationLink || ''}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
