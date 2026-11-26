import {
  BatchEfficiencyPoint,
  CategorizedCommentRecord,
  ImprovementCategoryKey,
  MonthlyQualityPoint,
  ParetoIssueItem,
  Part1Metrics,
  SheetRowItem
} from '../types';
import { formatDateInput, formatMonthKey, isDateInRange } from './sheetService';

/**
 * Bảng 7 màu thương hiệu Cờ Vua Sài Gòn (chuẩn bắt buộc cho Phần 1)
 */
export const BRAND_COLORS = {
  navy: '#1A3A5C',
  blue: '#1B5EA6',
  sky: '#3EA8E0',
  green: '#4CAF8A',
  yellow: '#F9C846',
  coral: '#F2775A',
  purple: '#9B7FD4'
} as const;

/** Mục tiêu KPI Tỷ lệ phản hồi */
export const RESPONSE_RATE_KPI = 0.25;

/** Thời gian chờ phản hồi thống nhất cho mọi lô khảo sát (7 ngày = 168 giờ) */
export const UNIFIED_WAIT_DAYS = 7;
export const UNIFIED_WAIT_MS = UNIFIED_WAIT_DAYS * 24 * 60 * 60 * 1000;

export interface ImprovementCategoryMeta {
  key: ImprovementCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

/** 7 nhóm vấn đề cần cải thiện theo chuẩn báo cáo */
export const IMPROVEMENT_CATEGORIES: ImprovementCategoryMeta[] = [
  {
    key: 'teacher_pedagogy',
    label: 'Giáo viên và phương pháp giảng dạy',
    shortLabel: 'GV & Giảng dạy',
    description:
      'Phương pháp truyền đạt, mức độ tương tác, can thiệp vào bài của học viên, thái độ sư phạm và sự tập trung khi đứng lớp.',
    color: BRAND_COLORS.blue
  },
  {
    key: 'learning_progress',
    label: 'Hiệu quả học tập và sự tiến bộ của học viên',
    shortLabel: 'Tiến bộ học viên',
    description:
      'Tốc độ tiến bộ của học viên, khả năng nắm kiến thức/nước cờ/nét vẽ, sự tự tin và vận dụng thực tế.',
    color: BRAND_COLORS.coral
  },
  {
    key: 'curriculum',
    label: 'Chương trình đào tạo',
    shortLabel: 'Chương trình',
    description:
      'Giáo trình, sách bài tập, lộ trình cấp độ, thời lượng khóa học, giải đấu cọ xát, hoạt động chủ đề và ứng dụng luyện tập.',
    color: BRAND_COLORS.purple
  },
  {
    key: 'customer_care',
    label: 'Chăm sóc khách hàng',
    shortLabel: 'CSKH',
    description:
      'Chất lượng tư vấn, tốc độ phản hồi phụ huynh, cập nhật báo cáo tiến độ học tập định kỳ, nhắc lịch học và gửi khảo sát.',
    color: BRAND_COLORS.sky
  },
  {
    key: 'class_operations',
    label: 'Vận hành lớp học',
    shortLabel: 'Vận hành lớp',
    description:
      'Sĩ số lớp/tỷ lệ giáo viên kèm, lịch học, sắp xếp ca học, thay đổi giáo viên, thông báo nghỉ học/workshop và theo dõi buổi học.',
    color: BRAND_COLORS.yellow
  },
  {
    key: 'facilities',
    label: 'Cơ sở vật chất',
    shortLabel: 'Cơ sở vật chất',
    description:
      'Không gian phòng học, độ ồn, bàn ghế, giá vẽ, họa cụ/canvas, âm thanh, điều hòa và hiện trạng sân/phòng.',
    color: BRAND_COLORS.navy
  },
  {
    key: 'other',
    label: 'Các vấn đề khác',
    shortLabel: 'Vấn đề khác',
    description:
      'Chính sách học phí, chi phí thi đấu hoặc các góp ý vận hành khác chưa thuộc 6 nhóm trên.',
    color: BRAND_COLORS.green
  }
];

const PURE_PRAISE_EXACT = new Set([
  'ok',
  'oke',
  'okay',
  'good',
  'tốt',
  'rất tốt',
  'tốt ạ',
  'rất tốt ạ',
  'tuyệt',
  'quá tuyệt',
  'hài lòng',
  'rất hài lòng',
  'tạm ổn',
  'ko',
  'không',
  'k',
  'ko có gì',
  'không có gì',
  'bình thường'
]);

const vnWord = (phrase: string): RegExp => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu');
};

const ISSUE_ACTION_REGEXES: RegExp[] = [
  'cần',
  'nên',
  'mong',
  'hy vọng',
  'hi vọng',
  'đề xuất',
  'đề nghị',
  'góp ý',
  'giá như',
  'nếu được',
  'nhưng',
  'tuy nhiên',
  'thiếu',
  'chậm',
  'chưa',
  'không',
  'ko',
  'k',
  'hời hợt',
  'lấp liếm',
  'điện thoại',
  'can thiệp',
  'thụt lùi',
  'sợ thua',
  'lệch lạc',
  'ồn',
  'đông',
  'hơi nhỏ',
  'xuống cấp',
  'bong tróc',
  'gồ ghề',
  'rè',
  'khó nghe',
  'phiền',
  'sai',
  'tệ',
  'kém',
  'yếu',
  'khô khan',
  'nhàm chán',
  'cứng nhắc',
  'thất vọng',
  'tăng nhiều',
  'còn cao',
  'đắt',
  'thay đổi nhiều',
  'bù đầu',
  'loay hoay',
  'rút kinh nghiệm',
  'xem xét',
  'cải thiện',
  'hạn chế',
  'tránh',
  'thời gian hơn',
  'chưa ok',
  'chưa tương xứng',
  'chưa đủ',
  'không đủ',
  'ko đủ',
  'hỏi không',
  'bỏ ngang',
  'miễn phí',
  'tính phí'
]
  .map(vnWord)
  .concat([/\bchật/iu]);

const PURE_POSITIVE_CLAUSE_CUES = [
  'rất tốt',
  'tốt ạ',
  'rất hài lòng',
  'hài lòng',
  'tận tình',
  'tận tâm',
  'nhiệt tình',
  'vui vẻ',
  'dễ thương',
  'thân thiện',
  'hòa nhã',
  'hoà nhã',
  'mến quý',
  'yêu thương',
  'yêu trẻ',
  'chuyên nghiệp',
  'truyền cảm hứng',
  'rất thích',
  'cảm ơn',
  'cám ơn',
  'rõ ràng'
];

const CATEGORY_RULES: Array<{ key: ImprovementCategoryKey; patterns: Array<string | RegExp> }> = [
  {
    key: 'teacher_pedagogy',
    patterns: [
      'giáo viên',
      /\bgv\b/i,
      'cô giáo',
      'thầy',
      'giảng viên',
      'can thiệp',
      'điện thoại',
      'nói chuyện với người khác',
      'không tập trung',
      'ko tập trung',
      'chơi cờ trên máy',
      'không tương tác',
      'ko tương tác',
      'tự đấu',
      'tự chơi',
      'cứng nhắc',
      'khô khan',
      'nhàm chán',
      'sáng tạo ở bộ môn',
      'động viên',
      'quan sát bé',
      'nhận xét bức tranh',
      'chất lượng dạy',
      'giúp đỡ bé',
      'giúp bé nhiều hơn',
      'hướng dẫn',
      'nhẹ nhàng câu nói',
      'hiểu tâm',
      'truyền đạt',
      'khó hiểu',
      'bù đầu',
      'loay hoay'
    ]
  },
  {
    key: 'learning_progress',
    patterns: [
      'tiến bộ',
      'thụt lùi',
      'vẽ giờ không đẹp',
      'không đẹp bằng',
      'chưa nhớ rõ',
      'chưa nắm rõ',
      'lệch lạc',
      'sợ thua',
      'bỏ ngang',
      'tư duy',
      'nước cờ',
      'còn rất yếu',
      'vận dụng',
      'thành thạo',
      'kỹ năng',
      'rèn bé',
      'rèn luyện khả năng',
      'quá trình tiến bộ',
      'kết quả học',
      'bé em hơi nhát',
      'không dám hỏi',
      'k dám hỏi'
    ]
  },
  {
    key: 'curriculum',
    patterns: [
      'chương trình',
      'kéo dài',
      vnWord('sách'),
      vnWord('level'),
      vnWord('lever'),
      'bài tập',
      'lộ trình',
      'chủ đề',
      '20/10',
      'ngày lễ',
      'giải đấu',
      'cuộc thi',
      'thi đấu',
      'cọ sát',
      'giao lưu',
      'app chơi online',
      'chơi online',
      'giáo trình',
      'báo bài',
      'tạo hình',
      'giới thiệu lại bức tranh',
      'gương chơi cờ'
    ]
  },
  {
    key: 'customer_care',
    patterns: [
      'dịch vụ',
      'chăm sóc khách hàng',
      'cskh',
      'tư vấn',
      'nhân viên',
      'admin',
      'lễ tân',
      'không phản hồi',
      'ko phản hồi',
      'hỏi không',
      'không nhắc',
      'hời hợt',
      'lấp liếm',
      'nhận trách nhiệm',
      'kết nối thêm với phụ huynh',
      'theo dõi quá trình học',
      'gửi đánh giá việc học',
      'gởi đánh giá việc học',
      'cho feedback',
      'gửi phản hồi/đánh giá',
      'xin hình ảnh',
      'thông báo nào về các cuộc thi',
      'sai thông tin',
      'thông tin khách hàng',
      'bị sai',
      'theo sát bé'
    ]
  },
  {
    key: 'class_operations',
    patterns: [
      'lớp quá đông',
      'lớp khá đông',
      'quá đông',
      'học viên quá đông',
      '1 thầy kèm nhiều',
      '1 cô giáo dạy vẽ',
      'có 2 cô',
      'chia giờ ra',
      'dồn 1 giờ',
      'phân bổ học sinh',
      'giáo viên thay đổi nhiều',
      'mong muốn có thầy',
      'dạy online',
      'workshop',
      'nghỉ học hôm đó',
      'checklist ngày con học',
      'số buổi',
      'quản lý được lịch học',
      'ca học',
      'sắp xếp lớp'
    ]
  },
  {
    key: 'facilities',
    patterns: [
      'cơ sở vật chất',
      'cơ sở vc',
      'csvc',
      'phòng học',
      'phòng hơi nhỏ',
      'chật',
      'không gian',
      'giá vẽ',
      'khung canvas',
      'dụng cụ',
      vnWord('ồn'),
      'tiếng ồn',
      'ồn ào',
      'âm thanh',
      vnWord('rè'),
      'khó nghe',
      'xuống cấp',
      'gồ ghề',
      'bong tróc',
      'bàn ghế',
      'máy lạnh',
      'điều hòa'
    ]
  },
  {
    key: 'other',
    patterns: [
      'học phí',
      'mức giá',
      'giá tốt hơn',
      'tăng nhiều',
      vnWord('đắt'),
      'chưa tương xứng',
      'tính phí',
      'miễn phí',
      'gửi đánh giá hoài',
      'gửi lại yêu cầu đánh giá',
      'đánh giá rất nhiều lần',
      'thật phiền',
      vnWord('phiền'),
      'cần thời gian hơn'
    ]
  }
];

function normalizeForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPattern(text: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') return text.includes(pattern);
  return pattern.test(text);
}

function hasIssueCue(text: string): boolean {
  return ISSUE_ACTION_REGEXES.some((rx) => rx.test(text));
}

function isPurePraiseClause(clause: string): boolean {
  const trimmed = clause.trim();
  if (!trimmed) return true;
  if (hasIssueCue(trimmed)) return false;
  if (PURE_POSITIVE_CLAUSE_CUES.some((p) => trimmed.includes(p))) return true;
  return trimmed.endsWith(' ổn') || trimmed.endsWith(' ok') || trimmed.endsWith(' tốt');
}

function splitIntoClauses(detail: string): string[] {
  return detail
    .split(/(?:[.;!?]+|\s+-\s+|\bnhưng\b|\btuy nhiên\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Xác định xem nhận xét có chứa nội dung góp ý / vấn đề cần cải thiện hay không.
 * Áp dụng cho TẤT CẢ đánh giá có nội dung chữ, kể cả 4–5 sao (loại bỏ các câu thuần khen không có đề xuất/vấn đề).
 */
export function hasActionableFeedbackText(item: SheetRowItem): boolean {
  const detail = normalizeForMatch(item.detail || '');
  if (!detail) return false;

  const stripped = detail.replace(/[.!,?❤️👍⭐️🌟]+/g, '').trim();
  if (PURE_PRAISE_EXACT.has(stripped)) {
    return false;
  }

  // Các đánh giá từ 1–3 sao có để lại chữ đều là phản hồi cần quan tâm
  if ((item.rating ?? 5) <= 3) return true;

  // Câu cảm ơn chung chung không chứa đề xuất cụ thể
  if (
    detail.includes('nuôi giữ đam mê') &&
    (detail.includes('cảm ơn') || detail.includes('cám ơn'))
  ) {
    return false;
  }
  if (detail.includes('chưa quá đẹp') && detail.includes('cẩn thận hơn')) {
    return false;
  }

  // Với đánh giá 4–5 sao, bắt buộc phải có ít nhất một mệnh đề mang tín hiệu góp ý / đề xuất / vấn đề
  const clauses = splitIntoClauses(detail);
  return clauses.some((clause) => hasIssueCue(clause));
}

/**
 * Phân loại đa nhãn (multi-label) cho 1 nhận xét có nội dung góp ý.
 * Một nhận xét có thể thuộc nhiều nhóm vấn đề cùng lúc; tự động bỏ qua mệnh đề chỉ khen trước "nhưng/tuy nhiên".
 */
export function classifyImprovementCategories(item: SheetRowItem): ImprovementCategoryKey[] {
  const detail = normalizeForMatch(item.detail || '');
  if (!detail) return [];

  const clauses = splitIntoClauses(detail);
  const actionableClauses = clauses.filter((c) => !isPurePraiseClause(c));
  const targetTexts = actionableClauses.length > 0 ? actionableClauses : [detail];

  const matched = new Set<ImprovementCategoryKey>();

  for (const text of targetTexts) {
    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some((pattern) => matchesPattern(text, pattern))) {
        matched.add(rule.key);
      }
    }
  }

  // Tinh chỉnh ngữ cảnh đặc biệt cho một số cụm từ ghép trong dữ liệu thực tế
  const joinedTarget = targetTexts.join(' ');
  if (
    joinedTarget.includes('giáo viên') &&
    (joinedTarget.includes('thay đổi nhiều') || joinedTarget.includes('có 2 cô'))
  ) {
    matched.add('class_operations');
  }
  if (joinedTarget.includes('1 thầy kèm nhiều')) {
    // 1 thầy kèm nhiều bạn là vấn đề sĩ số/vận hành lớp học
    matched.add('class_operations');
    if (
      !joinedTarget.includes('giáo viên') &&
      !joinedTarget.includes('chất lượng dạy') &&
      !joinedTarget.includes('hướng dẫn')
    ) {
      matched.delete('teacher_pedagogy');
    }
  }
  if (
    joinedTarget.includes('lớp') &&
    joinedTarget.includes('đông') &&
    (joinedTarget.includes('chật') || joinedTarget.includes('không gian'))
  ) {
    matched.add('class_operations');
    matched.add('facilities');
  }

  if (matched.size === 0) {
    matched.add('other');
  }

  return Array.from(matched);
}

/**
 * Tính kỳ trước tương đương chính xác theo lịch:
 * - Nếu khoảng chọn là trọn vẹn một tháng dương lịch (ngày 1 -> ngày cuối tháng), kỳ trước là tháng dương lịch liền trước.
 * - Ngược lại, lấy đúng số ngày tương đương liền kề trước ngày bắt đầu.
 */
export function getEquivalentPreviousPeriod(startDate: Date, endDate: Date): { prevStart: Date; prevEnd: Date } {
  const sYear = startDate.getFullYear();
  const sMonth = startDate.getMonth();
  const sDay = startDate.getDate();

  const lastDayOfEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  const isFullSingleMonth =
    sDay === 1 &&
    sYear === endDate.getFullYear() &&
    sMonth === endDate.getMonth() &&
    endDate.getDate() === lastDayOfEndMonth;

  if (isFullSingleMonth) {
    const prevStart = new Date(sYear, sMonth - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(sYear, sMonth, 0, 23, 59, 59, 999);
    return { prevStart, prevEnd };
  }

  const startMidnight = new Date(sYear, sMonth, sDay, 0, 0, 0, 0);
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0, 0);
  const spanDays = Math.max(1, Math.round((endMidnight.getTime() - startMidnight.getTime()) / 86400000) + 1);

  const prevEnd = new Date(startMidnight.getTime() - 1);
  const prevStart = new Date(startMidnight);
  prevStart.setDate(prevStart.getDate() - spanDays);
  prevStart.setHours(0, 0, 0, 0);

  return { prevStart, prevEnd };
}

function isWithinUnifiedWaitWindow(item: SheetRowItem): boolean {
  if (item.rating == null || !item.sentAt) return false;
  if (!item.responseAt) return true;
  const diff = item.responseAt.getTime() - item.sentAt.getTime();
  return diff <= UNIFIED_WAIT_MS;
}

function getMondayWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function buildEfficiencyBucket(
  key: string,
  label: string,
  fullLabel: string,
  rows: SheetRowItem[],
  referenceNowMs: number
): BatchEfficiencyPoint {
  const sentCount = rows.length;
  const maturedRows = rows.filter((r) => r.sentAt && referenceNowMs - r.sentAt.getTime() >= UNIFIED_WAIT_MS);
  const maturedSentCount = maturedRows.length;
  const pendingSentCount = sentCount - maturedSentCount;
  const isPendingWait = pendingSentCount > 0;

  const cohortReplyCount = rows.filter((r) => r.rating != null).length;
  const cohortReplyWithinWaitCount = rows.filter((r) => isWithinUnifiedWaitWindow(r)).length;

  const responseRate = sentCount > 0 ? cohortReplyWithinWaitCount / sentCount : null;
  const rawCohortRate = sentCount > 0 ? cohortReplyCount / sentCount : null;

  return {
    key,
    label,
    fullLabel,
    sentCount,
    cohortReplyCount,
    cohortReplyWithinWaitCount,
    maturedSentCount,
    pendingSentCount,
    isPendingWait,
    responseRate,
    rawCohortRate
  };
}

export function buildResponseEfficiencySeries(
  scopedRows: SheetRowItem[],
  startDate: Date,
  endDate: Date,
  referenceNow: Date = new Date()
): {
  day: BatchEfficiencyPoint[];
  week: BatchEfficiencyPoint[];
  month: BatchEfficiencyPoint[];
} {
  const nowMs = referenceNow.getTime();
  const sentInRange = scopedRows
    .filter((r) => r.sentAt && isDateInRange(r.sentAt, startDate, endDate))
    .sort((a, b) => (a.sentAt?.getTime() ?? 0) - (b.sentAt?.getTime() ?? 0));

  const pad = (n: number) => String(n).padStart(2, '0');

  // 1. Theo NGÀY (mỗi ngày có lô gửi trong khoảng chọn)
  const dayGroups = new Map<string, { label: string; fullLabel: string; rows: SheetRowItem[] }>();
  for (const row of sentInRange) {
    if (!row.sentAt) continue;
    const key = formatDateInput(row.sentAt);
    const label = `${pad(row.sentAt.getDate())}/${pad(row.sentAt.getMonth() + 1)}`;
    const fullLabel = `Ngày ${label}/${row.sentAt.getFullYear()}`;
    const existing = dayGroups.get(key);
    if (existing) existing.rows.push(row);
    else dayGroups.set(key, { label, fullLabel, rows: [row] });
  }
  const day: BatchEfficiencyPoint[] = Array.from(dayGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => buildEfficiencyBucket(key, g.label, g.fullLabel, g.rows, nowMs));

  // 2. Theo TUẦN (theo tuần bắt đầu Thứ 2 trong khoảng chọn; nếu khoảng chọn <= 14 ngày thì mở rộng lấy 6 tuần đến endDate để đủ ngữ cảnh)
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const spanDays = Math.round((endMidnight.getTime() - startMidnight.getTime()) / 86400000) + 1;

  let weekRangeStart = startDate;
  if (spanDays <= 14) {
    weekRangeStart = new Date(endDate);
    weekRangeStart.setDate(weekRangeStart.getDate() - 41);
    weekRangeStart.setHours(0, 0, 0, 0);
  }

  const weekGroups = new Map<string, { label: string; fullLabel: string; rows: SheetRowItem[] }>();
  for (const row of scopedRows) {
    if (!row.sentAt || !isDateInRange(row.sentAt, weekRangeStart, endDate)) continue;
    const monday = getMondayWeekStart(row.sentAt);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const key = formatDateInput(monday);
    const label = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}`;
    const fullLabel = `Tuần ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} – ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
    const existing = weekGroups.get(key);
    if (existing) existing.rows.push(row);
    else weekGroups.set(key, { label, fullLabel, rows: [row] });
  }
  const week: BatchEfficiencyPoint[] = Array.from(weekGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => buildEfficiencyBucket(key, g.label, g.fullLabel, g.rows, nowMs));

  // 3. Theo THÁNG (nếu khoảng lọc <= 45 ngày -> hiển thị 6 tháng gần nhất đến tháng kết thúc; ngược lại hiển thị các tháng trong khoảng chọn)
  const monthStartAnchor =
    spanDays <= 45
      ? new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1, 0, 0, 0, 0)
      : new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEndAnchor = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthGroups = new Map<string, { label: string; fullLabel: string; rows: SheetRowItem[] }>();
  const cursor = new Date(monthStartAnchor.getFullYear(), monthStartAnchor.getMonth(), 1);
  while (cursor <= monthEndAnchor) {
    const key = formatMonthKey(cursor);
    const label = `T${pad(cursor.getMonth() + 1)}/${String(cursor.getFullYear()).slice(-2)}`;
    const fullLabel = `Tháng ${pad(cursor.getMonth() + 1)}/${cursor.getFullYear()}`;
    monthGroups.set(key, { label, fullLabel, rows: [] });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const row of scopedRows) {
    if (!row.sentAt || !isDateInRange(row.sentAt, monthStartAnchor, monthEndAnchor)) continue;
    const key = formatMonthKey(row.sentAt);
    const group = monthGroups.get(key);
    if (group) group.rows.push(row);
  }

  const month: BatchEfficiencyPoint[] = Array.from(monthGroups.entries())
    .filter(([, g]) => g.rows.length > 0)
    .map(([key, g]) => buildEfficiencyBucket(key, g.label, g.fullLabel, g.rows, nowMs));

  return { day, week, month };
}

export function buildMonthlyQualityTrend(
  scopedRows: SheetRowItem[],
  startDate: Date,
  endDate: Date
): MonthlyQualityPoint[] {
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const spanDays = Math.round((endMidnight.getTime() - startMidnight.getTime()) / 86400000) + 1;

  const anchorStart =
    spanDays <= 45
      ? new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1, 0, 0, 0, 0)
      : new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0, 0, 0);
  const anchorEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const selectedMonths = new Set<string>();
  const selCur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const selEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (selCur <= selEnd) {
    selectedMonths.add(formatMonthKey(selCur));
    selCur.setMonth(selCur.getMonth() + 1);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const buckets = new Map<
    string,
    { label: string; satisfied: number; attention: number; dissatisfied: number; total: number }
  >();

  const cur = new Date(anchorStart.getFullYear(), anchorStart.getMonth(), 1);
  while (cur <= anchorEnd) {
    const key = formatMonthKey(cur);
    buckets.set(key, {
      label: `T${pad(cur.getMonth() + 1)}/${String(cur.getFullYear()).slice(-2)}`,
      satisfied: 0,
      attention: 0,
      dissatisfied: 0,
      total: 0
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  for (const row of scopedRows) {
    if (row.rating == null || !row.responseAt) continue;
    if (!isDateInRange(row.responseAt, anchorStart, anchorEnd)) continue;
    const key = formatMonthKey(row.responseAt);
    const b = buckets.get(key);
    if (!b) continue;
    b.total += 1;
    if (row.rating >= 4) b.satisfied += 1;
    else if (row.rating === 3) b.attention += 1;
    else b.dissatisfied += 1;
  }

  const result: MonthlyQualityPoint[] = [];
  for (const [monthKey, b] of buckets.entries()) {
    if (b.total === 0) continue;
    const satisfiedPct = Math.round((b.satisfied / b.total) * 1000) / 10;
    const attentionPct = Math.round((b.attention / b.total) * 1000) / 10;
    const dissatisfiedPct = Math.max(0, Math.round((100 - satisfiedPct - attentionPct) * 10) / 10);

    result.push({
      monthKey,
      label: b.label,
      total: b.total,
      satisfiedCount: b.satisfied,
      attentionCount: b.attention,
      dissatisfiedCount: b.dissatisfied,
      satisfiedPct,
      attentionPct,
      dissatisfiedPct,
      isSelectedPeriod: selectedMonths.has(monthKey)
    });
  }

  return result;
}

export function buildParetoIssues(repliesInPeriod: SheetRowItem[]): {
  paretoIssues: ParetoIssueItem[];
  uniqueFeedbackAnalyzedCount: number;
  totalIssueMentions: number;
} {
  // Chỉ lọc các phản hồi có nội dung chữ góp ý thực chất (kể cả 4–5 sao), không trùng bản ghi phản hồi
  const feedbackWithComments = repliesInPeriod.filter((item) => hasActionableFeedbackText(item));
  const uniqueFeedbackAnalyzedCount = feedbackWithComments.length;

  const bucketMap = new Map<ImprovementCategoryKey, CategorizedCommentRecord[]>();
  for (const cat of IMPROVEMENT_CATEGORIES) {
    bucketMap.set(cat.key, []);
  }

  let totalIssueMentions = 0;

  for (const item of feedbackWithComments) {
    const categories = classifyImprovementCategories(item);
    const record: CategorizedCommentRecord = { item, categories };
    for (const key of categories) {
      bucketMap.get(key)?.push(record);
      totalIssueMentions += 1;
    }
  }

  // Sắp xếp giảm dần theo số lượt phản ánh (Pareto), nếu bằng nhau giữ nguyên thứ tự ưu tiên nghiệp vụ
  const sorted = IMPROVEMENT_CATEGORIES.map((meta) => {
    const comments = (bucketMap.get(meta.key) ?? []).sort(
      (a, b) => (b.item.responseAt?.getTime() ?? 0) - (a.item.responseAt?.getTime() ?? 0)
    );
    const count = comments.length;
    return {
      meta,
      count,
      comments
    };
  }).sort((a, b) => b.count - a.count);

  let cumulativeCount = 0;
  const paretoIssues: ParetoIssueItem[] = sorted.map((entry) => {
    cumulativeCount += entry.count;
    const pctOfComments =
      uniqueFeedbackAnalyzedCount > 0 ? (entry.count / uniqueFeedbackAnalyzedCount) * 100 : 0;
    const pctOfMentions = totalIssueMentions > 0 ? (entry.count / totalIssueMentions) * 100 : 0;
    const cumulativePct =
      totalIssueMentions > 0 ? Math.min(100, (cumulativeCount / totalIssueMentions) * 100) : 0;

    return {
      key: entry.meta.key,
      label: entry.meta.label,
      shortLabel: entry.meta.shortLabel,
      description: entry.meta.description,
      color: entry.meta.color,
      count: entry.count,
      pctOfComments,
      pctOfMentions,
      cumulativePct,
      comments: entry.comments
    };
  });

  return {
    paretoIssues,
    uniqueFeedbackAnalyzedCount,
    totalIssueMentions
  };
}

export function computePart1Metrics(
  scopedRows: SheetRowItem[],
  startDate: Date,
  endDate: Date,
  referenceNow: Date = new Date()
): Part1Metrics {
  const nowMs = referenceNow.getTime();
  const { prevStart, prevEnd } = getEquivalentPreviousPeriod(startDate, endDate);

  // Kỳ hiện tại
  const sentItems = scopedRows.filter((e) => isDateInRange(e.sentAt, startDate, endDate));
  const maturedSentItems = sentItems.filter(
    (e) => e.sentAt && nowMs - e.sentAt.getTime() >= UNIFIED_WAIT_MS
  );
  const pendingSentItems = sentItems.filter(
    (e) => e.sentAt && nowMs - e.sentAt.getTime() < UNIFIED_WAIT_MS
  );
  const maturedCohortRepliesWithinWait = maturedSentItems.filter((e) =>
    isWithinUnifiedWaitWindow(e)
  );
  const provisionalCohortRepliesWithinWait = sentItems.filter((e) =>
    isWithinUnifiedWaitWindow(e)
  );

  const replyItems = scopedRows.filter(
    (e) => e.rating != null && isDateInRange(e.responseAt, startDate, endDate)
  );
  const satisfiedItems = replyItems.filter((e) => (e.rating ?? 0) >= 4);
  const attentionItems = replyItems.filter((e) => (e.rating ?? 5) <= 3);

  const hasAnyScopeData = sentItems.length > 0 || replyItems.length > 0;

  // Kỳ trước tương đương
  const prevSentItems = scopedRows.filter((e) => isDateInRange(e.sentAt, prevStart, prevEnd));
  const prevMaturedSent = prevSentItems.filter(
    (e) => e.sentAt && nowMs - e.sentAt.getTime() >= UNIFIED_WAIT_MS
  );
  const prevMaturedCohortWithinWait = prevMaturedSent.filter((e) =>
    isWithinUnifiedWaitWindow(e)
  );
  const prevReplyItems = scopedRows.filter(
    (e) => e.rating != null && isDateInRange(e.responseAt, prevStart, prevEnd)
  );
  const prevSatisfiedItems = prevReplyItems.filter((e) => (e.rating ?? 0) >= 4);
  const prevAttentionItems = prevReplyItems.filter((e) => (e.rating ?? 5) <= 3);

  // 1. Tổng lượt gửi khảo sát
  const sentCount = sentItems.length > 0 ? sentItems.length : hasAnyScopeData ? 0 : null;
  const sentPrevCount = prevSentItems.length > 0 ? prevSentItems.length : null;
  const sentDeltaPct =
    sentCount != null && sentPrevCount != null && sentPrevCount > 0
      ? ((sentCount - sentPrevCount) / sentPrevCount) * 100
      : null;

  // 2. Tổng lượt phản hồi
  const replyCount = replyItems.length > 0 ? replyItems.length : hasAnyScopeData ? 0 : null;
  const replyPrevCount = prevReplyItems.length > 0 ? prevReplyItems.length : null;
  const replyDeltaPct =
    replyCount != null && replyPrevCount != null && replyPrevCount > 0
      ? ((replyCount - replyPrevCount) / replyPrevCount) * 100
      : null;
  const replyWithCommentCount = replyItems.filter((e) => e.detail && e.detail.trim().length > 0).length;

  // 3. Tỷ lệ phản hồi (cùng lô gửi + thời gian chờ thống nhất 7 ngày, và tỷ lệ gộp Tổng phản hồi / Tổng gửi đối chiếu TB tháng)
  const cohortRateIsProvisional = maturedSentItems.length === 0 && sentItems.length > 0;
  const cohortRate =
    maturedSentItems.length > 0
      ? maturedCohortRepliesWithinWait.length / maturedSentItems.length
      : sentItems.length > 0
      ? provisionalCohortRepliesWithinWait.length / sentItems.length
      : null;
  const cohortPrevRate =
    prevMaturedSent.length > 0
      ? prevMaturedCohortWithinWait.length / prevMaturedSent.length
      : null;
  const cohortRateDeltaPts =
    cohortRate != null && cohortPrevRate != null ? (cohortRate - cohortPrevRate) * 100 : null;

  const overallReplyRate =
    sentItems.length > 0 ? replyItems.length / sentItems.length : null;
  const overallPrevReplyRate =
    prevSentItems.length > 0 ? prevReplyItems.length / prevSentItems.length : null;
  const overallReplyRateDeltaPts =
    overallReplyRate != null && overallPrevReplyRate != null
      ? (overallReplyRate - overallPrevReplyRate) * 100
      : null;

  const monthlyTotals = new Map<string, { sent: number; replies: number }>();
  for (const row of scopedRows) {
    if (row.sentAt) {
      const k = formatMonthKey(row.sentAt);
      const b = monthlyTotals.get(k) ?? { sent: 0, replies: 0 };
      b.sent += 1;
      monthlyTotals.set(k, b);
    }
    if (row.rating != null && row.responseAt) {
      const k = formatMonthKey(row.responseAt);
      const b = monthlyTotals.get(k) ?? { sent: 0, replies: 0 };
      b.replies += 1;
      monthlyTotals.set(k, b);
    }
  }
  const monthlyRates = Array.from(monthlyTotals.values())
    .filter((m) => m.sent > 0)
    .map((m) => m.replies / m.sent);
  const monthlyAvgMonthsCount = monthlyRates.length;
  const monthlyAvgReplyRate =
    monthlyAvgMonthsCount > 0
      ? monthlyRates.reduce((sum, r) => sum + r, 0) / monthlyAvgMonthsCount
      : null;

  // 4. Điểm đánh giá trung bình (thang 5 sao)
  const avgRating =
    replyItems.length > 0
      ? replyItems.reduce((sum, e) => sum + (e.rating ?? 0), 0) / replyItems.length
      : null;
  const avgPrevRating =
    prevReplyItems.length > 0
      ? prevReplyItems.reduce((sum, e) => sum + (e.rating ?? 0), 0) / prevReplyItems.length
      : null;
  const avgDeltaPts =
    avgRating != null && avgPrevRating != null ? avgRating - avgPrevRating : null;

  // 5. Tỷ lệ hài lòng (4-5★ / tổng đánh giá hợp lệ)
  const satisfactionCount = replyItems.length > 0 ? satisfiedItems.length : null;
  const satisfactionRate =
    replyItems.length > 0 ? satisfiedItems.length / replyItems.length : null;
  const satisfactionPrevRate =
    prevReplyItems.length > 0 ? prevSatisfiedItems.length / prevReplyItems.length : null;
  const satisfactionDeltaPts =
    satisfactionRate != null && satisfactionPrevRate != null
      ? (satisfactionRate - satisfactionPrevRate) * 100
      : null;

  // 6. Phản hồi cần quan tâm (1-3★ / tổng đánh giá hợp lệ)
  const attentionCount = replyItems.length > 0 ? attentionItems.length : null;
  const attentionRate =
    replyItems.length > 0 ? attentionItems.length / replyItems.length : null;
  const attentionPrevRate =
    prevReplyItems.length > 0 ? prevAttentionItems.length / prevReplyItems.length : null;
  const attentionDeltaPts =
    attentionRate != null && attentionPrevRate != null
      ? (attentionRate - attentionPrevRate) * 100
      : null;

  // Phân bố 5★ -> 1★
  const tierColors: Record<5 | 4 | 3 | 2 | 1, string> = {
    5: BRAND_COLORS.green,
    4: BRAND_COLORS.sky,
    3: BRAND_COLORS.yellow,
    2: BRAND_COLORS.coral,
    1: BRAND_COLORS.coral
  };

  const ratingTiers = ([5, 4, 3, 2, 1] as const).map((stars) => {
    const items = replyItems
      .filter((r) => r.rating === stars)
      .sort((a, b) => (b.responseAt?.getTime() ?? 0) - (a.responseAt?.getTime() ?? 0));
    const count = items.length;
    const pct = replyItems.length > 0 ? (count / replyItems.length) * 100 : 0;
    return {
      stars,
      count,
      pct,
      color: tierColors[stars],
      items
    };
  });

  // Phân bố Giữa khóa / Cuối khóa
  const isMid = (c: string) => c.toLowerCase().includes('giữa');
  const isFinal = (c: string) => c.toLowerCase().includes('cuối');

  const surveyTypeBreakdown = {
    sentMidTerm: sentItems.filter((e) => isMid(e.course || '')).length,
    sentFinalTerm: sentItems.filter((e) => isFinal(e.course || '')).length,
    replyMidTerm: replyItems.filter((e) => isMid(e.course || '')).length,
    replyFinalTerm: replyItems.filter((e) => isFinal(e.course || '')).length,
    sentMidTermPrev: prevSentItems.filter((e) => isMid(e.course || '')).length,
    sentFinalTermPrev: prevSentItems.filter((e) => isFinal(e.course || '')).length,
    replyMidTermPrev: prevReplyItems.filter((e) => isMid(e.course || '')).length,
    replyFinalTermPrev: prevReplyItems.filter((e) => isFinal(e.course || '')).length
  };

  const efficiencySeries = buildResponseEfficiencySeries(
    scopedRows,
    startDate,
    endDate,
    referenceNow
  );
  const monthlyQualityTrend = buildMonthlyQualityTrend(scopedRows, startDate, endDate);
  const { paretoIssues, uniqueFeedbackAnalyzedCount, totalIssueMentions } =
    buildParetoIssues(replyItems);

  return {
    start: startDate,
    end: endDate,
    prevStart,
    prevEnd,
    waitWindowDays: UNIFIED_WAIT_DAYS,
    kpiTargetRate: RESPONSE_RATE_KPI,
    hasAnyScopeData,
    sentItems,
    maturedSentItems,
    pendingSentItems,
    maturedCohortRepliesWithinWait,
    replyItems,
    satisfiedItems,
    attentionItems,
    ratingTiers,
    surveyTypeBreakdown,
    kpis: {
      sentCount,
      sentPrevCount,
      sentDeltaPct,
      replyCount,
      replyPrevCount,
      replyDeltaPct,
      replyWithCommentCount,
      cohortRate,
      cohortPrevRate,
      cohortRateDeltaPts,
      cohortRateIsProvisional,
      overallReplyRate,
      overallPrevReplyRate,
      overallReplyRateDeltaPts,
      monthlyAvgReplyRate,
      monthlyAvgMonthsCount,
      avgRating,
      avgPrevRating,
      avgDeltaPts,
      satisfactionCount,
      satisfactionRate,
      satisfactionPrevRate,
      satisfactionDeltaPts,
      attentionCount,
      attentionRate,
      attentionPrevRate,
      attentionDeltaPts
    },
    efficiencySeries,
    monthlyQualityTrend,
    paretoIssues,
    uniqueFeedbackAnalyzedCount,
    totalIssueMentions
  };
}
