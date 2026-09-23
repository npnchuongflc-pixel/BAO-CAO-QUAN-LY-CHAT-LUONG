export interface MonthBenchmark {
  checks: number;
  issues: number;
  cameras: number;
  problemCameras: number;
  fixed: number;
  evidence: number;
  unstable: number;
  lost: number;
  sites: [string, number, string][];
  owners: Record<string, number>;
  days: [string, number][];
  cams: {
    camera: string;
    site: string;
    owner: string;
    count: number;
    lost: number;
    unstable: number;
    last: string;
    status: string | null;
    evidence: boolean;
  }[];
  statusDays: [string, number[]][];
}

export const MONTH_BENCHMARKS: Record<string, MonthBenchmark> = {
  "03/2026": {
    checks: 2183,
    issues: 55,
    cameras: 69,
    problemCameras: 32,
    fixed: 21,
    evidence: 54,
    unstable: 9,
    lost: 46,
    sites: [
      ["Tân Bình", 14, "#2f6bff"],
      ["Bình Tân", 12, "#19a78e"],
      ["Dream Home", 7, "#f4a340"],
      ["Nguyễn Duy Trinh", 5, "#e44d5e"],
      ["An Phú", 5, "#8d75e8"],
      ["Phú Nhuận", 4, "#a6b3c8"],
      ["Moonlight", 3, "#27a5d9"],
      ["Tân Phú", 2, "#d06ac6"],
      ["Vinhomes", 2, "#6f8b3d"],
      ["Gò Vấp", 1, "#7a6255"]
    ],
    owners: { "Cao Bùi Nguyên Vũ": 28, "Phạm Thái Bình Dương": 27 },
    days: [["01", 3], ["02", 1], ["06", 1], ["07", 3], ["13", 2], ["14", 3], ["17", 5], ["18", 2], ["21", 2], ["22", 2], ["23", 7], ["24", 7], ["28", 7], ["29", 8], ["31", 2]],
    cams: [
      { camera: "TBC3", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 8, lost: 2, unstable: 6, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC2", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 4, lost: 4, unstable: 0, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC2", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 4, lost: 3, unstable: 1, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "NDT3", site: "Nguyễn Duy Trinh", owner: "Phạm Thái Bình Dương", count: 3, lost: 3, unstable: 0, last: "23/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "MLC2", site: "Moonlight", owner: "Phạm Thái Bình Dương", count: 2, lost: 2, unstable: 0, last: "07/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "NDT2", site: "Nguyễn Duy Trinh", owner: "Phạm Thái Bình Dương", count: 2, lost: 1, unstable: 1, last: "23/03/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC0", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 2, lost: 2, unstable: 0, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 2, lost: 2, unstable: 0, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 2, lost: 2, unstable: 0, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC7", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 2, lost: 2, unstable: 0, last: "29/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "TBC0", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 2, lost: 2, unstable: 0, last: "31/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "TBC7", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 2, lost: 2, unstable: 0, last: "31/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "TPC1", site: "Tân Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "01/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "TPC2", site: "Tân Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "01/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "GVC1", site: "Gò Vấp", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "14/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "MLC7", site: "Moonlight", owner: "Phạm Thái Bình Dương", count: 1, lost: 1, unstable: 0, last: "14/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "VHC1", site: "Vinhomes", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "18/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "VHC7", site: "Vinhomes", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "18/03/2026", status: "Mất kết nối", evidence: false },
      { camera: "TBC1", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "23/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "TBC2", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "23/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "APC0", site: "An Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "APC1", site: "An Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "APC2", site: "An Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "APC3", site: "An Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "APC7", site: "An Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC1", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC7", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 1, lost: 1, unstable: 0, last: "24/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC4", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 1, lost: 0, unstable: 1, last: "28/03/2026", status: "Chập chờn", evidence: true },
      { camera: "PNC0", site: "Phú Nhuận", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "28/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "PNC1", site: "Phú Nhuận", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "28/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "PNC2", site: "Phú Nhuận", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "28/03/2026", status: "Mất kết nối", evidence: true },
      { camera: "PNC7", site: "Phú Nhuận", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "28/03/2026", status: "Mất kết nối", evidence: true }
    ],
    statusDays: [
      ["01", [0, 2, 1]], ["02", [0, 0, 1]], ["06", [0, 1, 0]], ["07", [0, 3, 0]], ["13", [0, 2, 0]],
      ["14", [0, 2, 1]], ["17", [0, 5, 0]], ["18", [0, 2, 0]], ["21", [0, 1, 1]], ["22", [0, 1, 1]],
      ["23", [0, 6, 1]], ["24", [0, 7, 0]], ["28", [0, 4, 3]], ["29", [0, 8, 0]], ["31", [0, 2, 0]]
    ]
  },
  "04/2026": {
    checks: 2312,
    issues: 142,
    cameras: 75,
    problemCameras: 75,
    fixed: 96,
    evidence: 116,
    unstable: 85,
    lost: 56,
    sites: [
      ["Thạnh Mỹ Lợi", 27, "#2f6bff"],
      ["Bình Tân", 19, "#19a78e"],
      ["Phổ Quang", 12, "#f4a340"],
      ["Tân Bình", 11, "#e44d5e"],
      ["Gò Vấp", 9, "#8d75e8"],
      ["Dream Home", 8, "#a6b3c8"],
      ["Hà Đô", 8, "#27a5d9"],
      ["Gigamall", 6, "#d06ac6"],
      ["An Phú", 5, "#6f8b3d"],
      ["Richstar", 5, "#7a6255"],
      ["Vinhomes", 5, "#2f6bff"],
      ["Hiệp Thành", 5, "#19a78e"],
      ["Moonlight", 4, "#f4a340"],
      ["Nguyễn Duy Trinh", 4, "#e44d5e"],
      ["Phú Nhuận", 4, "#8d75e8"],
      ["Tân Phú", 4, "#a6b3c8"],
      ["Gia Hòa", 3, "#27a5d9"],
      ["RichMond", 3, "#d06ac6"]
    ],
    owners: { "Phạm Thái Bình Dương": 69, "Cao Bùi Nguyên Vũ": 73 },
    days: [["01", 7], ["02", 6], ["03", 5], ["04", 7], ["05", 5], ["07", 1], ["10", 1], ["11", 1], ["12", 2], ["15", 1], ["18", 1], ["19", 5], ["20", 1], ["21", 5], ["22", 1], ["23", 5], ["24", 80], ["27", 4], ["28", 2], ["29", 2]],
    cams: [
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 8, lost: 7, unstable: 1, last: "29/04/2026", status: "Mất kết nối", evidence: true },
      { camera: "PQC1", site: "Phổ Quang", owner: "Phạm Thái Bình Dương", count: 8, lost: 5, unstable: 3, last: "29/04/2026", status: "Chập chờn", evidence: true },
      { camera: "TML1", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 7, lost: 6, unstable: 1, last: "27/04/2026", status: "Mất kết nối", evidence: true },
      { camera: "TML3", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 7, lost: 5, unstable: 1, last: "27/04/2026", status: "Chưa xác định", evidence: false },
      { camera: "TML7", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 7, lost: 6, unstable: 1, last: "27/04/2026", status: "Mất kết nối", evidence: false },
      { camera: "TML0", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 6, lost: 5, unstable: 1, last: "24/04/2026", status: "Chập chờn", evidence: true },
      { camera: "TBC0", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 5, lost: 4, unstable: 1, last: "24/04/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC2", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 4, lost: 2, unstable: 2, last: "24/04/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 3, lost: 2, unstable: 1, last: "24/04/2026", status: "Chập chờn", evidence: true },
      { camera: "TBC3", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 3, lost: 0, unstable: 3, last: "24/04/2026", status: "Chập chờn", evidence: true },
      { camera: "MLC2", site: "Moonlight", owner: "Phạm Thái Bình Dương", count: 3, lost: 2, unstable: 1, last: "24/04/2026", status: "Chập chờn", evidence: true }
    ],
    statusDays: [
      ["01", [0, 7, 0]], ["02", [0, 5, 1]], ["03", [0, 5, 0]], ["04", [0, 6, 1]], ["05", [0, 5, 0]],
      ["07", [0, 1, 0]], ["10", [0, 1, 0]], ["11", [0, 1, 0]], ["12", [0, 2, 0]], ["15", [0, 1, 0]],
      ["18", [0, 1, 0]], ["19", [0, 5, 0]], ["20", [0, 0, 1]], ["21", [0, 5, 0]], ["22", [0, 1, 0]],
      ["23", [0, 5, 0]], ["24", [0, 0, 80]], ["27", [0, 3, 1]], ["28", [0, 1, 1]], ["29", [0, 1, 1]]
    ]
  },
  "05/2026": {
    checks: 2370,
    issues: 224,
    cameras: 73,
    problemCameras: 73,
    fixed: 32,
    evidence: 184,
    unstable: 145,
    lost: 79,
    sites: [
      ["Hà Đô", 62, "#2f6bff"],
      ["Thạnh Mỹ Lợi", 46, "#19a78e"],
      ["Dream Home", 13, "#f4a340"],
      ["Bình Tân", 12, "#e44d5e"],
      ["Tân Bình", 12, "#8d75e8"],
      ["Phổ Quang", 10, "#a6b3c8"],
      ["Nguyễn Duy Trinh", 9, "#27a5d9"],
      ["Gò Vấp", 9, "#d06ac6"],
      ["Vinhomes", 9, "#6f8b3d"],
      ["Phú Nhuận", 7, "#7a6255"],
      ["RichMond", 7, "#2f6bff"],
      ["Richstar", 6, "#19a78e"],
      ["Tân Phú", 5, "#f4a340"],
      ["Hiệp Thành", 5, "#e44d5e"],
      ["Gia Hòa", 4, "#8d75e8"],
      ["An Phú", 3, "#a6b3c8"],
      ["Gigamall", 3, "#27a5d9"],
      ["Moonlight", 2, "#d06ac6"]
    ],
    owners: { "Phạm Thái Bình Dương": 124, "Cao Bùi Nguyên Vũ": 100 },
    days: [["02", 7], ["03", 1], ["04", 1], ["06", 12], ["07", 2], ["08", 9], ["09", 10], ["10", 9], ["11", 5], ["12", 79], ["13", 4], ["14", 3], ["15", 1], ["16", 2], ["17", 2], ["18", 7], ["19", 8], ["20", 7], ["21", 2], ["22", 9], ["23", 2], ["24", 6], ["25", 4], ["26", 3], ["27", 6], ["28", 5], ["29", 5], ["30", 6], ["31", 7]],
    cams: [
      { camera: "TML1", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 22, lost: 22, unstable: 0, last: "31/05/2026", status: "Mất kết nối", evidence: true },
      { camera: "TML7", site: "Thạnh Mỹ Lợi", owner: "Cao Bùi Nguyên Vũ", count: 21, lost: 21, unstable: 0, last: "31/05/2026", status: "Mất kết nối", evidence: false },
      { camera: "HDC2", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 16, lost: 0, unstable: 16, last: "31/05/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC1", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 15, lost: 0, unstable: 15, last: "28/05/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC5", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 12, lost: 1, unstable: 11, last: "27/05/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC7", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 10, lost: 0, unstable: 10, last: "31/05/2026", status: "Chập chờn", evidence: true },
      { camera: "DHC1", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 8, lost: 3, unstable: 5, last: "31/05/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 7, lost: 6, unstable: 1, last: "31/05/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC3", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 7, lost: 1, unstable: 6, last: "24/05/2026", status: "Chập chờn", evidence: true },
      { camera: "TBC3", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 6, lost: 3, unstable: 3, last: "24/05/2026", status: "Mất kết nối", evidence: true }
    ],
    statusDays: [
      ["02", [0, 6, 1]], ["03", [0, 1, 0]], ["04", [0, 0, 1]], ["06", [0, 2, 10]], ["07", [0, 2, 0]],
      ["08", [0, 7, 2]], ["09", [0, 5, 5]], ["10", [0, 3, 6]], ["11", [0, 2, 3]], ["12", [0, 2, 77]],
      ["13", [0, 2, 2]], ["14", [0, 2, 1]], ["15", [0, 1, 0]], ["16", [0, 2, 0]], ["17", [0, 2, 0]],
      ["18", [0, 3, 4]], ["19", [0, 4, 4]], ["20", [0, 4, 3]], ["21", [0, 1, 1]], ["22", [0, 4, 5]],
      ["23", [0, 1, 1]], ["24", [0, 3, 3]], ["25", [0, 2, 2]], ["26", [0, 2, 1]], ["27", [0, 2, 4]],
      ["28", [0, 3, 2]], ["29", [0, 3, 2]], ["30", [0, 4, 2]], ["31", [0, 4, 3]]
    ]
  },
  "06/2026": {
    checks: 2452,
    issues: 72,
    cameras: 79,
    problemCameras: 34,
    fixed: 7,
    evidence: 57,
    unstable: 23,
    lost: 47,
    sites: [
      ["Hà Đô", 13, "#2f6bff"],
      ["Bình Phú", 12, "#19a78e"],
      ["Bình Tân", 9, "#f4a340"],
      ["Dream Home", 9, "#e44d5e"],
      ["Hiệp Thành", 6, "#8d75e8"],
      ["Gia Hòa", 5, "#a6b3c8"],
      ["Gò Vấp", 5, "#27a5d9"],
      ["Nguyễn Duy Trinh", 5, "#d06ac6"],
      ["Thạnh Mỹ Lợi", 2, "#6f8b3d"],
      ["Tân Phú", 2, "#7a6255"],
      ["Phổ Quang", 1, "#2f6bff"],
      ["Moonlight", 1, "#19a78e"],
      ["Tân Bình", 1, "#f4a340"],
      ["Phú Nhuận", 1, "#e44d5e"]
    ],
    owners: { "Cao Bùi Nguyên Vũ": 28, "Phạm Thái Bình Dương": 38, "#N/A": 6 },
    days: [["01", 2], ["02", 1], ["05", 5], ["06", 6], ["07", 2], ["08", 1], ["10", 3], ["11", 3], ["13", 4], ["14", 4], ["15", 2], ["17", 7], ["19", 2], ["20", 1], ["21", 3], ["22", 3], ["23", 1], ["24", 3], ["25", 3], ["26", 3], ["27", 1], ["28", 2], ["29", 9], ["30", 1]],
    cams: [
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 6, lost: 6, unstable: 0, last: "21/06/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC1", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 5, lost: 3, unstable: 2, last: "22/06/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC7", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 4, lost: 0, unstable: 4, last: "11/06/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC1", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 4, lost: 1, unstable: 3, last: "19/06/2026", status: "Chập chờn", evidence: true },
      { camera: "NDT7", site: "Nguyễn Duy Trinh", owner: "Phạm Thái Bình Dương", count: 4, lost: 0, unstable: 4, last: "30/06/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC5", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 3, lost: 1, unstable: 2, last: "11/06/2026", status: "Chập chờn", evidence: true },
      { camera: "GHC2", site: "Gia Hòa", owner: "Cao Bùi Nguyên Vũ", count: 3, lost: 3, unstable: 0, last: "08/06/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 3, lost: 1, unstable: 2, last: "24/06/2026", status: "Mất kết nối", evidence: true },
      { camera: "HTC7", site: "Hiệp Thành", owner: "Cao Bùi Nguyên Vũ", count: 3, lost: 3, unstable: 0, last: "26/06/2026", status: "Mất kết nối", evidence: true }
    ],
    statusDays: [
      ["01", [0, 2, 0]], ["02", [0, 0, 1]], ["05", [0, 4, 1]], ["06", [0, 6, 0]], ["07", [0, 2, 0]],
      ["08", [0, 1, 0]], ["10", [0, 0, 3]], ["11", [0, 0, 3]], ["13", [0, 3, 1]], ["14", [0, 3, 1]],
      ["15", [0, 2, 0]], ["17", [0, 6, 1]], ["19", [0, 0, 2]], ["20", [0, 1, 0]], ["21", [0, 2, 1]],
      ["22", [0, 1, 2]], ["23", [0, 1, 0]], ["24", [0, 2, 1]], ["25", [0, 2, 1]], ["26", [0, 3, 0]],
      ["27", [0, 0, 1]], ["28", [0, 0, 2]], ["29", [0, 6, 3]], ["30", [0, 0, 1]]
    ]
  },
  "07/2026": {
    checks: 2633,
    issues: 72,
    cameras: 80,
    problemCameras: 23,
    fixed: 8,
    evidence: 70,
    unstable: 45,
    lost: 27,
    sites: [
      ["Bình Tân", 24, "#2f6bff"],
      ["Hà Đô", 19, "#19a78e"],
      ["RichMond", 14, "#f4a340"],
      ["Dream Home", 6, "#e44d5e"],
      ["Nguyễn Duy Trinh", 2, "#8d75e8"],
      ["Gò Vấp", 2, "#a6b3c8"],
      ["Tân Bình", 2, "#27a5d9"],
      ["Richstar", 1, "#d06ac6"],
      ["Hiệp Thành", 1, "#6f8b3d"],
      ["Phổ Quang", 1, "#7a6255"]
    ],
    owners: { "Phạm Thái Bình Dương": 67, "Cao Bùi Nguyên Vũ": 5 },
    days: [["01", 3], ["02", 4], ["03", 1], ["04", 2], ["05", 2], ["06", 1], ["08", 2], ["09", 2], ["11", 2], ["12", 7], ["13", 8], ["14", 5], ["15", 7], ["16", 1], ["17", 7], ["18", 2], ["19", 4], ["20", 2], ["23", 3], ["25", 2], ["26", 3], ["28", 1], ["31", 1]],
    cams: [
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 10, lost: 1, unstable: 9, last: "31/07/2026", status: "Chập chờn", evidence: true },
      { camera: "RMC7", site: "RichMond", owner: "Phạm Thái Bình Dương", count: 9, lost: 9, unstable: 0, last: "20/07/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC1", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 8, lost: 0, unstable: 8, last: "23/07/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 8, lost: 1, unstable: 7, last: "25/07/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC2", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 5, lost: 0, unstable: 5, last: "15/07/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC5", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 3, lost: 0, unstable: 3, last: "15/07/2026", status: "Chập chờn", evidence: true },
      { camera: "DHC4", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 3, lost: 1, unstable: 2, last: "23/07/2026", status: "Mất kết nối", evidence: true },
      { camera: "RMC1", site: "RichMond", owner: "Phạm Thái Bình Dương", count: 3, lost: 3, unstable: 0, last: "14/07/2026", status: "Mất kết nối", evidence: true },
      { camera: "DHC1", site: "Dream Home", owner: "Phạm Thái Bình Dương", count: 3, lost: 1, unstable: 2, last: "28/07/2026", status: "Mất kết nối", evidence: true }
    ],
    statusDays: [
      ["01", [0, 0, 3]], ["02", [0, 0, 4]], ["03", [0, 0, 1]], ["04", [0, 0, 2]], ["05", [0, 0, 2]],
      ["06", [0, 1, 0]], ["08", [0, 0, 2]], ["09", [0, 0, 2]], ["11", [0, 0, 2]], ["12", [0, 3, 4]],
      ["13", [0, 3, 5]], ["14", [0, 2, 3]], ["15", [0, 1, 6]], ["16", [0, 1, 0]], ["17", [0, 7, 0]],
      ["18", [0, 1, 1]], ["19", [0, 2, 2]], ["20", [0, 2, 0]], ["23", [0, 2, 1]], ["25", [0, 0, 2]],
      ["26", [0, 1, 2]], ["28", [0, 1, 0]], ["31", [0, 0, 1]]
    ]
  },
  "08/2026": {
    checks: 2595,
    issues: 139,
    cameras: 80,
    problemCameras: 19,
    fixed: 2,
    evidence: 137,
    unstable: 116,
    lost: 23,
    sites: [
      ["Hà Đô", 112, "#2f6bff"],
      ["Bình Tân", 14, "#19a78e"],
      ["Gigamall", 6, "#f4a340"],
      ["RichMond", 5, "#e44d5e"],
      ["Thạnh Mỹ Lợi", 1, "#8d75e8"],
      ["Bình Phú", 1, "#a6b3c8"]
    ],
    owners: { "Phạm Thái Bình Dương": 137, "Cao Bùi Nguyên Vũ": 2 },
    days: [["01", 8], ["02", 10], ["03", 5], ["04", 5], ["05", 6], ["06", 1], ["07", 5], ["08", 7], ["09", 6], ["10", 9], ["11", 6], ["13", 6], ["14", 6], ["15", 6], ["16", 9], ["19", 1], ["22", 2], ["23", 2], ["25", 6], ["26", 9], ["27", 7], ["28", 1], ["29", 7], ["30", 6], ["31", 3]],
    cams: [
      { camera: "HDC1", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 30, lost: 1, unstable: 29, last: "31/08/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC2", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 29, lost: 3, unstable: 26, last: "31/08/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC7", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 20, lost: 1, unstable: 19, last: "31/08/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC3", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 11, lost: 1, unstable: 10, last: "29/08/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC4", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 11, lost: 1, unstable: 10, last: "29/08/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC5", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 11, lost: 1, unstable: 10, last: "29/08/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 6, lost: 0, unstable: 6, last: "22/08/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 5, lost: 0, unstable: 5, last: "23/08/2026", status: "Chập chờn", evidence: true },
      { camera: "GGM6", site: "Gigamall", owner: "Phạm Thái Bình Dương", count: 4, lost: 3, unstable: 1, last: "29/08/2026", status: "Mất kết nối", evidence: true },
      { camera: "RMC2", site: "RichMond", owner: "Phạm Thái Bình Dương", count: 3, lost: 3, unstable: 0, last: "10/08/2026", status: "Mất kết nối", evidence: true }
    ],
    statusDays: [
      ["01", [0, 0, 8]], ["02", [0, 2, 8]], ["03", [0, 0, 5]], ["04", [0, 0, 5]], ["05", [0, 1, 5]],
      ["06", [0, 1, 0]], ["07", [0, 0, 5]], ["08", [0, 0, 7]], ["09", [0, 0, 6]], ["10", [0, 3, 6]],
      ["11", [0, 0, 6]], ["13", [0, 0, 6]], ["14", [0, 0, 6]], ["15", [0, 0, 6]], ["16", [0, 1, 8]],
      ["19", [0, 1, 0]], ["22", [0, 0, 2]], ["23", [0, 0, 2]], ["25", [0, 0, 6]], ["26", [0, 3, 6]],
      ["27", [0, 0, 7]], ["28", [0, 1, 0]], ["29", [0, 7, 0]], ["30", [0, 3, 3]], ["31", [0, 0, 3]]
    ]
  },
  "09/2026": {
    checks: 1494,
    issues: 134,
    cameras: 80,
    problemCameras: 15,
    fixed: 3,
    evidence: 132,
    unstable: 88,
    lost: 46,
    sites: [
      ["Hà Đô", 71, "#2f6bff"],
      ["Bình Tân", 37, "#19a78e"],
      ["Gigamall", 17, "#f4a340"],
      ["Tân Bình", 6, "#e44d5e"],
      ["Gò Vấp", 2, "#8d75e8"],
      ["Bình Phú", 1, "#a6b3c8"]
    ],
    owners: { "Phạm Thái Bình Dương": 125, "Cao Bùi Nguyên Vũ": 9 },
    days: [["04", 4], ["05", 8], ["06", 8], ["07", 8], ["08", 8], ["09", 8], ["10", 8], ["11", 8], ["12", 9], ["13", 11], ["14", 6], ["15", 6], ["16", 6], ["17", 6], ["18", 9], ["19", 8], ["20", 8], ["21", 5]],
    cams: [
      { camera: "GGM6", site: "Gigamall", owner: "Phạm Thái Bình Dương", count: 17, lost: 16, unstable: 1, last: "20/09/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC1", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 17, lost: 0, unstable: 17, last: "21/09/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC2", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 17, lost: 0, unstable: 17, last: "21/09/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC5", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 17, lost: 3, unstable: 14, last: "21/09/2026", status: "Mất kết nối", evidence: true },
      { camera: "HDC7", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 17, lost: 0, unstable: 17, last: "21/09/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC2", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 13, lost: 11, unstable: 2, last: "18/09/2026", status: "Chập chờn", evidence: true },
      { camera: "BTC1", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 12, lost: 5, unstable: 7, last: "20/09/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC3", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 8, lost: 2, unstable: 6, last: "18/09/2026", status: "Chập chờn", evidence: true },
      { camera: "TBC0", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 5, lost: 5, unstable: 0, last: "20/09/2026", status: "Mất kết nối", evidence: true },
      { camera: "BTC4", site: "Bình Tân", owner: "Phạm Thái Bình Dương", count: 4, lost: 2, unstable: 2, last: "13/09/2026", status: "Chập chờn", evidence: true },
      { camera: "HDC3", site: "Hà Đô", owner: "Phạm Thái Bình Dương", count: 3, lost: 0, unstable: 3, last: "21/09/2026", status: "Chập chờn", evidence: true },
      { camera: "GVC2", site: "Gò Vấp", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 0, unstable: 1, last: "04/09/2026", status: "Chập chờn", evidence: true },
      { camera: "GVC7.1", site: "Gò Vấp", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 0, unstable: 1, last: "04/09/2026", status: "Chập chờn", evidence: false },
      { camera: "TBC3", site: "Tân Bình", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "13/09/2026", status: "Mất kết nối", evidence: true },
      { camera: "BPC2", site: "Bình Phú", owner: "Cao Bùi Nguyên Vũ", count: 1, lost: 1, unstable: 0, last: "13/09/2026", status: "Mất kết nối", evidence: false }
    ],
    statusDays: [
      ["04", [0, 0, 4]], ["05", [0, 2, 6]], ["06", [0, 2, 6]], ["07", [0, 2, 6]], ["08", [0, 2, 6]],
      ["09", [0, 2, 6]], ["10", [0, 4, 4]], ["11", [0, 4, 4]], ["12", [0, 4, 5]], ["13", [0, 6, 5]],
      ["14", [0, 2, 4]], ["15", [0, 2, 4]], ["16", [0, 2, 4]], ["17", [0, 2, 4]], ["18", [0, 2, 7]],
      ["19", [0, 3, 5]], ["20", [0, 4, 4]], ["21", [0, 1, 4]]
    ]
  }
};
