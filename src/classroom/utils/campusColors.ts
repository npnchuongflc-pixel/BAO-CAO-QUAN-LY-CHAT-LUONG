export const CAMPUS_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  'An Phú':           { bg: 'bg-[#00E5FF]/15', border: 'border-[#00E5FF]/40', text: 'text-[#00E5FF]', hex: '#00E5FF' }, // Xanh ngọc lam sáng (Electric Cyan)
  'Bình Tân':         { bg: 'bg-[#F59E0B]/15', border: 'border-[#F59E0B]/40', text: 'text-[#F59E0B]', hex: '#F59E0B' }, // Vàng hổ phách (Amber Gold)
  'Dream Home':       { bg: 'bg-[#C084FC]/15', border: 'border-[#C084FC]/40', text: 'text-[#C084FC]', hex: '#C084FC' }, // Tím hoa cà nhạt (Lavender)
  'Gia Hòa':          { bg: 'bg-[#FF6600]/15', border: 'border-[#FF6600]/40', text: 'text-[#FF6600]', hex: '#FF6600' }, // Cam rực rỡ (Vivid Orange)
  'Gigamall':         { bg: 'bg-[#00D26A]/15', border: 'border-[#00D26A]/40', text: 'text-[#00D26A]', hex: '#00D26A' }, // Xanh bạc hà tươi (Neon Mint)
  'Gò Vấp':           { bg: 'bg-[#0284C7]/15', border: 'border-[#0284C7]/40', text: 'text-[#0284C7]', hex: '#0284C7' }, // Xanh da trời (Sky Blue)
  'Hà Đô':            { bg: 'bg-[#7E22CE]/15', border: 'border-[#7E22CE]/40', text: 'text-[#7E22CE]', hex: '#7E22CE' }, // Tím thẫm quý tộc (Royal Purple)
  'Moonlight':        { bg: 'bg-[#0D9488]/15', border: 'border-[#0D9488]/40', text: 'text-[#0D9488]', hex: '#0D9488' }, // Xanh mòng két thẫm (Deep Teal)
  'Nguyễn Duy Trinh': { bg: 'bg-[#E2E8F0]/15', border: 'border-[#E2E8F0]/40', text: 'text-[#E2E8F0]', hex: '#E2E8F0' }, // Trắng bạc ánh kim (Silver Ice)
  'Phổ Quang':        { bg: 'bg-[#FF007F]/15', border: 'border-[#FF007F]/40', text: 'text-[#FF007F]', hex: '#FF007F' }, // Hồng cánh sen rực (Neon Magenta)
  'Phú Nhuận':        { bg: 'bg-[#EF4444]/15', border: 'border-[#EF4444]/40', text: 'text-[#EF4444]', hex: '#EF4444' }, // Đỏ tươi cờ (Bright Red)
  'Quận 12':          { bg: 'bg-[#FFD600]/15', border: 'border-[#FFD600]/40', text: 'text-[#FFD600]', hex: '#FFD600' }, // Vàng nắng chói (Electric Yellow)
  'Quận 6':           { bg: 'bg-[#4F46E5]/15', border: 'border-[#4F46E5]/40', text: 'text-[#4F46E5]', hex: '#4F46E5' }, // Xanh chàm (Indigo)
  'Richmond':         { bg: 'bg-[#2563EB]/15', border: 'border-[#2563EB]/40', text: 'text-[#2563EB]', hex: '#2563EB' }, // Xanh dương hoàng gia (Cobalt Blue)
  'Richstar':         { bg: 'bg-[#16A34A]/15', border: 'border-[#16A34A]/40', text: 'text-[#16A34A]', hex: '#16A34A' }, // Xanh lá cây tươi (Leaf Green)
  'Tân Bình':         { bg: 'bg-[#84CC16]/15', border: 'border-[#84CC16]/40', text: 'text-[#84CC16]', hex: '#84CC16' }, // Xanh cốm non (Lime Green)
  'Tân Phú':          { bg: 'bg-[#F472B6]/15', border: 'border-[#F472B6]/40', text: 'text-[#F472B6]', hex: '#F472B6' }, // Hồng đào phấn (Rose Pink)
  'Thạnh Mỹ Lợi':     { bg: 'bg-[#BE123C]/15', border: 'border-[#BE123C]/40', text: 'text-[#BE123C]', hex: '#BE123C' }, // Đỏ ruby thẫm (Ruby Red)
  'Vinhomes':         { bg: 'bg-[#D4E157]/15', border: 'border-[#D4E157]/40', text: 'text-[#D4E157]', hex: '#D4E157' }, // Vàng chanh chuối non (Chartreuse)
  'Nhà Thiếu Nhi Thủ Đức': { bg: 'bg-[#B45309]/15', border: 'border-[#B45309]/40', text: 'text-[#B45309]', hex: '#B45309' }, // Nâu hổ phách đồng (Warm Bronze)
};

export const DEFAULT_CAMPUS_COLOR = {
  bg: 'bg-[#0EA5E9]/15',
  border: 'border-[#0EA5E9]/50',
  text: 'text-[#0EA5E9]',
  hex: '#0EA5E9'
};

export function getCampusColor(campus: string) {
  if (!campus) return DEFAULT_CAMPUS_COLOR;
  const cleaned = campus.replace(/^(Cơ sở|Lớp vẽ)\s*/i, '').trim();
  if (CAMPUS_COLORS[cleaned]) return CAMPUS_COLORS[cleaned];
  if (CAMPUS_COLORS[campus]) return CAMPUS_COLORS[campus];

  const lower = cleaned.toLowerCase();
  for (const [key, val] of Object.entries(CAMPUS_COLORS)) {
    if (key.toLowerCase() === lower) return val;
  }
  return DEFAULT_CAMPUS_COLOR;
}

export function isIgnoredCampus(_name: string): boolean {
  return false;
}

export function normalizeCampus(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName.trim().replace(/^(Cơ sở|Lớp vẽ)\s*/i, '').trim();
  if (cleaned.toLowerCase() === 'richmond') return 'Richmond';
  if (cleaned.toLowerCase().includes('thủ đức') || cleaned.toLowerCase().includes('thu duc')) return 'Nhà Thiếu Nhi Thủ Đức';
  return cleaned;
}

export function normalizeTimeSlot(slot: string): string {
  if (!slot) return '';
  let cleaned = slot.trim().replace(/\s*-\s*/g, ' - ');
  cleaned = cleaned.replace(/\b(\d):/g, '0$1:');
  return cleaned;
}
