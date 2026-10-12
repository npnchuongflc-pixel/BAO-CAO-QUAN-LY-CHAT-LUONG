export interface SheetListItem {
  index: number;
  gid: string;
  name: string;
}

export interface SheetDetail {
  index: number;
  gid: string;
  name: string;
  rowCount: number;
  activeRowCount: number;
  colCount: number;
  rows: string[][];
  summary?: {
    header: string[];
    sampleRows: string[][];
  };
}

export interface SpreadsheetData {
  spreadsheetId: string;
  sheets: Record<string, SheetDetail>;
  sheetList: SheetListItem[];
}

export type SheetCategory = 'dispatch' | 'chess' | 'art' | 'teachers';

export interface CategoryGroup {
  id: SheetCategory;
  title: string;
  icon: string;
  description: string;
  sheetGids: string[];
}
