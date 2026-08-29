export function normalizeDateToIso(rawDateStr: string): string {
  if (!rawDateStr) return '';
  let str = String(rawDateStr).trim();
  
  // Extract date part before space or 'T'
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }
  if (str.includes('T')) {
    str = str.split('T')[0];
  }

  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2]?.length === 4) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } else if (str.includes('/')) {
    const parts = str.split('/');
    if (parts[2]?.length === 4) {
      // DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts[0].length === 4) {
      // YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p2 < 100) p2 += 2000;
        // If p0 > 12, it must be DD/MM/YYYY
        if (p0 > 12) {
          return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
        // Default DD/MM/YYYY
        return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
      }
    }
  }
  return str;
}

export function formatDateToShortDdMm(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const iso = normalizeDateToIso(isoDateStr);
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`; // DD/MM
  }
  return isoDateStr;
}
