import { SheetRowItem } from '../types';

export type CommentSentiment = 'good' | 'bad' | 'neutral';

export type IssueCategoryKey =
  | 'teaching'     // Giảng dạy & Giáo viên
  | 'service'      // Chăm sóc & Dịch vụ
  | 'facilities'   // Cơ sở vật chất & Không gian
  | 'curriculum'   // Chương trình & Học phí
  | 'other';       // Góp ý khác

export interface IssueCategoryMeta {
  key: IssueCategoryKey;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  keywords: string[];
}

export const ISSUE_CATEGORIES: Record<IssueCategoryKey, IssueCategoryMeta> = {
  teaching: {
    key: 'teaching',
    label: 'Giảng dạy & Giáo viên',
    shortLabel: 'Giảng dạy & GV',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Phương pháp dạy, can thiệp tranh, thái độ GV, thiếu tương tác, lớp đông thiếu kèm cặp, không quan sát học sinh',
    keywords: [
      'giáo viên', 'gv', 'cô giáo', 'thầy', 'cô dạy', 'giảng viên', 'can thiệp', 'tập trung',
      'điện thoại', 'nói chuyện', 'tương tác', 'tự đấu', 'tự chơi', 'vẽ không đẹp', 'thụt lùi',
      'tư duy', 'nước cờ', 'kèm', 'take care', '1 cô', 'một mình', 'bù đầu', 'loay hoay',
      'quân cờ', 'lệch lạc', 'cách đi', 'chất lượng dạy', 'dạy', 'không hiểu', 'khó hiểu',
      'chưa tiến bộ', 'tiến bộ ít', 'sợ thua', 'động viên', 'quan sát'
    ]
  },
  service: {
    key: 'service',
    label: 'Chăm sóc & Dịch vụ',
    shortLabel: 'Chăm sóc & DV',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Chăm sóc khách hàng, tư vấn, phản hồi phụ huynh, khảo sát, nhắc nhở lịch học, tiếp nhận ý kiến',
    keywords: [
      'dịch vụ', 'tư vấn', 'phản hồi', 'trả lời', 'chăm sóc', 'cskh', 'nhắc', 'không nhắc',
      'liên tục không đến', 'nghỉ học', 'hời hợt', 'lấp liếm', 'trách nhiệm', 'khảo sát',
      'thông tin', 'gửi lại', 'admin', 'lễ tân', 'hỗ trợ', 'thái độ', 'không theo sát',
      'không liên hệ', 'hỏi không', 'chuyên nghiệp', 'liên lạc'
    ]
  },
  facilities: {
    key: 'facilities',
    label: 'Cơ sở vật chất',
    shortLabel: 'CS vật chất',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Không gian phòng học, tiếng ồn, bàn ghế, giá vẽ, máy tính, điều hòa, vật tư',
    keywords: [
      'cơ sở vật chất', 'csvc', 'ồn', 'môi trường rất ồn', 'tiếng ồn', 'chật', 'không gian',
      'giá vẽ', 'bàn ghế', 'phòng học', 'máy tính', 'thiết bị', 'điều hòa', 'nóng',
      'ánh sáng', 'chỗ ngồi', 'ngồi vẽ', 'diện tích', 'dụng cụ', 'trang thiết bị'
    ]
  },
  curriculum: {
    key: 'curriculum',
    label: 'Chương trình & Học phí',
    shortLabel: 'Chương trình & HP',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Thời lượng khóa học, học phí, sách bài tập, level, app online, giải đấu cuộc thi, chủ đề ngày lễ',
    keywords: [
      'chương trình', 'kéo dài', 'học phí', 'giá', 'giá học phí', 'đắt', 'cao', 'sách',
      'level', 'bài tập', 'phát sách', 'cuộc thi', 'giải đấu', 'app', 'online', 'ngày lễ',
      '20/10', 'workshop', 'chính sách', 'giáo trình', 'lịch học', 'thời gian học'
    ]
  },
  other: {
    key: 'other',
    label: 'Góp ý khác',
    shortLabel: 'Góp ý khác',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description: 'Ý kiến chung hoặc đánh giá sao thấp không kèm nội dung chi tiết',
    keywords: []
  }
};

const POSITIVE_KEYWORDS = [
  'tốt', 'rất tốt', 'tuyệt', 'quá tuyệt', 'hài lòng', 'nhiệt tình', 'tận tâm', 'cảm ơn',
  'tiến bộ', 'đam mê', 'yêu thích', 'thích học', 'chuyên nghiệp', 'vui vẻ', 'chu đáo',
  'dễ thương', 'gắn bó', 'khơi dậy', 'hứng thú', 'yên tâm', 'xuất sắc', 'ok', 'ủng hộ'
];

export interface AnalyzedComment {
  item: SheetRowItem;
  sentiment: CommentSentiment; // 'good' | 'bad' | 'neutral'
  issueCategory: IssueCategoryKey | null; // only present if sentiment === 'bad'
  issueCategoryMeta?: IssueCategoryMeta;
  matchedKeywords: string[];
}

export interface FacilityCommentSummary {
  facility: string;
  totalReplies: number;
  goodCount: number;           // Số bình luận tốt
  badCount: number;            // Số bình luận chưa tốt (≤ 3★ hoặc phàn nàn)
  badCategories: Record<IssueCategoryKey, number>; // Bóc tách theo từng nhóm
  goodComments: AnalyzedComment[];
  badComments: AnalyzedComment[];
  latestBadComment?: AnalyzedComment;
}

/**
 * Phân tích và tự động phân loại một bình luận của phụ huynh
 * Tự động xếp vào nhóm "Tốt" hay "Chưa tốt", và nếu "Chưa tốt" thì tự động phân vào nhóm vấn đề tương ứng.
 */
export function analyzeComment(item: SheetRowItem): AnalyzedComment {
  const text = (item.detail || '').toLowerCase().trim();
  const rating = item.rating;

  // 1. Phân loại Tốt vs Chưa tốt
  // Mặc định: Nếu rating <= 3 thì thuộc nhóm "Chưa tốt"
  let sentiment: CommentSentiment = 'neutral';
  if (rating != null && rating <= 3) {
    sentiment = 'bad';
  } else if (rating != null && rating >= 4) {
    sentiment = 'good';
  } else if (text.length > 0) {
    // Không có rating: kiểm tra từ khóa
    const hasPositive = POSITIVE_KEYWORDS.some((kw) => text.includes(kw));
    sentiment = hasPositive ? 'good' : 'bad';
  }

  // 2. Nếu là "Chưa tốt", tự động phân loại vào nhóm vấn đề dựa vào dữ liệu và từ khóa
  let issueCategory: IssueCategoryKey | null = null;
  const matchedKeywords: string[] = [];

  if (sentiment === 'bad') {
    let bestMatchKey: IssueCategoryKey = 'other';
    let highestScore = 0;

    // Duyệt qua các nhóm đã lên sẵn: teaching, service, facilities, curriculum
    const categoriesToCheck: IssueCategoryKey[] = ['teaching', 'service', 'facilities', 'curriculum'];

    for (const catKey of categoriesToCheck) {
      const meta = ISSUE_CATEGORIES[catKey];
      let matchScore = 0;
      for (const kw of meta.keywords) {
        if (text.includes(kw)) {
          // Trọng số theo độ dài từ khóa để ưu tiên từ khóa cụ thể
          matchScore += kw.includes(' ') ? 3 : 1;
          matchedKeywords.push(kw);
        }
      }
      if (matchScore > highestScore) {
        highestScore = matchScore;
        bestMatchKey = catKey;
      }
    }

    issueCategory = bestMatchKey;
  }

  return {
    item,
    sentiment,
    issueCategory,
    issueCategoryMeta: issueCategory ? ISSUE_CATEGORIES[issueCategory] : undefined,
    matchedKeywords
  };
}

/**
 * Thống kê phân nhóm bình luận cho toàn bộ cơ sở
 */
export function summarizeFacilityComments(
  facilityName: string,
  allItems: SheetRowItem[]
): FacilityCommentSummary {
  const facItems = allItems.filter(
    (i) => (i.facility || 'Chưa xác định') === facilityName && (i.detail || i.rating != null)
  );

  const goodComments: AnalyzedComment[] = [];
  const badComments: AnalyzedComment[] = [];

  const badCategories: Record<IssueCategoryKey, number> = {
    teaching: 0,
    service: 0,
    facilities: 0,
    curriculum: 0,
    other: 0
  };

  for (const item of facItems) {
    const analyzed = analyzeComment(item);
    if (analyzed.sentiment === 'good') {
      goodComments.push(analyzed);
    } else if (analyzed.sentiment === 'bad') {
      badComments.push(analyzed);
      if (analyzed.issueCategory) {
        badCategories[analyzed.issueCategory] = (badCategories[analyzed.issueCategory] || 0) + 1;
      }
    }
  }

  // Sort bad comments latest first
  badComments.sort((a, b) => (b.item.responseAt?.getTime() ?? 0) - (a.item.responseAt?.getTime() ?? 0));
  goodComments.sort((a, b) => (b.item.responseAt?.getTime() ?? 0) - (a.item.responseAt?.getTime() ?? 0));

  return {
    facility: facilityName,
    totalReplies: facItems.length,
    goodCount: goodComments.length,
    badCount: badComments.length,
    badCategories,
    goodComments,
    badComments,
    latestBadComment: badComments[0]
  };
}
