/**
 * Dữ liệu phân tích thiết bị hư hỏng lặp đi lặp lại (>= 2 lần)
 * Tính toán động 100% từ dữ liệu thực tế đề xuất của hệ thống.
 * Nếu chưa có thiết bị nào phải sửa từ 2 lần trở lên, danh sách sẽ để trống theo đúng thực tế.
 */

import { ProposalItem } from '../types/proposal';

export interface BreakdownOccurrence {
  ngay: string;
  mucDo: string;
  hienTrang: string;
  phuongAn: string;
}

export interface RepeatedEquipmentItem {
  id: string;
  maThietBi: string;
  tenThietBi: string;
  coSo: string;
  soLanHong: number;
  chiPhiThucTe: number | null; // Chỉ lấy chi phí thực tế nếu có
  khuyenNghi: 'Nên thay mới hoàn toàn' | 'Bảo dưỡng chuyên sâu & thay linh kiện' | 'Cần thay mới ngay';
  lyDoKhuyenNghi: string;
  lichSu: BreakdownOccurrence[];
}

// Mặc định hiện tại hệ thống chưa có thiết bị nào phải sửa >= 2 lần
export const REPEATED_EQUIPMENT_OVER_2: RepeatedEquipmentItem[] = [];

/**
 * Trích xuất động các thiết bị bị hỏng lặp lại từ danh sách đề xuất thực tế
 */
export function getRepeatedEquipmentFromProposals(proposals: ProposalItem[]): RepeatedEquipmentItem[] {
  const map = new Map<string, ProposalItem[]>();

  proposals.forEach(p => {
    // Trích xuất mã thiết bị nếu có trong ngoặc vuông [ABC_XYZ] hoặc dùng tên vật phẩm + cơ sở
    const codeMatch = p.vatPham.match(/\[([A-Za-z0-9_]+)\]/);
    const key = codeMatch ? `${p.coSo}__${codeMatch[1]}` : `${p.coSo}__${p.vatPham.trim()}`;
    const list = map.get(key) || [];
    list.push(p);
    map.set(key, list);
  });

  const repeated: RepeatedEquipmentItem[] = [];
  let index = 1;

  map.forEach((items, key) => {
    // Chỉ ghi nhận nếu thiết bị xuất hiện từ 2 lần trở lên
    if (items.length >= 2) {
      const first = items[0];
      const codeMatch = first.vatPham.match(/\[([A-Za-z0-9_]+)\]/);
      const maThietBi = codeMatch ? codeMatch[1] : first.id;
      const tenThietBi = first.vatPham.replace(/\[[A-Za-z0-9_]+\]\s*/, '').trim();

      const totalCost = items.reduce((sum, item) => sum + (item.chiPhiThucTe || 0), 0);

      const count = items.length;
      let khuyenNghi: RepeatedEquipmentItem['khuyenNghi'] = 'Bảo dưỡng chuyên sâu & thay linh kiện';
      if (count >= 4) {
        khuyenNghi = 'Cần thay mới ngay';
      } else if (count >= 3) {
        khuyenNghi = 'Nên thay mới hoàn toàn';
      }

      repeated.push({
        id: `REP-00${index++}`,
        maThietBi,
        tenThietBi,
        coSo: first.coSo,
        soLanHong: count,
        chiPhiThucTe: totalCost > 0 ? totalCost : null,
        khuyenNghi,
        lyDoKhuyenNghi: `Thiết bị đã ghi nhận hỏng ${count} lần trong lịch sử kiểm tra.`,
        lichSu: items.map(it => ({
          ngay: it.ngay,
          mucDo: it.mucDo,
          hienTrang: it.trangThaiGhiNhan,
          phuongAn: it.phuongAn
        }))
      });
    }
  });

  return repeated;
}
