import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react';
import { getCurrentUserProfile, googleSignIn } from '../../services/workspaceAuth';
import {
  DEFAULT_WEEKLY_SPREADSHEET_ID,
  ExistingWeekCheckResult,
  MASTER_WEEKLY_SHEET_TITLE,
  Part2WarningRowInput,
  SelectedWeekMeta,
  TEAM_LEADER_SHEET_NAME,
  WeeklySheetSyncResult,
  WeeklyTrackingSheetConfig,
  checkExistingWeekReport,
  extractWeeklySourceRowsFromPart2,
  formatIsoShortDmy,
  saveWeeklySheetConfig,
  syncWeekReportToGoogleSheet,
} from '../../services/weeklyWarningSheetService';
import { APPS_SCRIPT_TEMPLATE } from './hygieneAppsScriptTemplate';

interface WeeklyWarningSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek: SelectedWeekMeta | null;
  availableWeeks: SelectedWeekMeta[];
  onSelectWeekKey?: (weekKey: string) => void;
  part2Rows: Part2WarningRowInput[];
  cutoffDisplay: string;
  config: WeeklyTrackingSheetConfig;
  onConfigUpdated: (nextConfig: WeeklyTrackingSheetConfig) => void;
  onSyncCompleted: (result: WeeklySheetSyncResult) => void;
}

const isSafeSpreadsheetUrl = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('https://docs.google.com/spreadsheets/');

const extractSpreadsheetIdFromInput = (raw: string): string => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return DEFAULT_WEEKLY_SPREADSHEET_ID;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{10,120})/);
  if (match && match[1]) return match[1];
  return trimmed;
};

export const WeeklyWarningSheetModal: React.FC<WeeklyWarningSheetModalProps> = ({
  isOpen,
  onClose,
  selectedWeek,
  availableWeeks,
  onSelectWeekKey,
  part2Rows,
  cutoffDisplay,
  config,
  onConfigUpdated,
  onSyncCompleted,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSigningInFallback, setIsSigningInFallback] = useState(false);
  const [needsScriptUpdate, setNeedsScriptUpdate] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [userLabel, setUserLabel] = useState('');
  const [checkResult, setCheckResult] = useState<ExistingWeekCheckResult | null>(null);
  const [syncResult, setSyncResult] = useState<WeeklySheetSyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [showPreviewRows, setShowPreviewRows] = useState(false);
  const [showSheetConfig, setShowSheetConfig] = useState(false);

  const [sheetIdDraft, setSheetIdDraft] = useState(
    config.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID,
  );
  const [scriptUrlDraft, setScriptUrlDraft] = useState(config.appsScriptUrl || '');
  const [savingConfig, setSavingConfig] = useState(false);

  // Track auto-create attempt once per modal open so user's click on "Tạo báo cáo..." writes immediately if week doesn't exist
  const hasAutoTriggeredOnOpenRef = useRef(false);

  useEffect(() => {
    setSheetIdDraft(config.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID);
    setScriptUrlDraft(config.appsScriptUrl || '');
  }, [config]);

  const sourceRows = useMemo(() => {
    if (!selectedWeek) return [];
    return extractWeeklySourceRowsFromPart2(
      part2Rows,
      selectedWeek,
      cutoffDisplay,
      config.teamLeadersByFacility,
    );
  }, [part2Rows, selectedWeek, cutoffDisplay, config.teamLeadersByFacility]);

  const summaryTotals = useMemo(
    () => ({
      facilitiesCount: sourceRows.length,
      totalNoCheckoutDays: sourceRows.reduce((s, r) => s + r.noCheckoutDays, 0),
      totalMissingImages: sourceRows.reduce((s, r) => s + r.missingImages, 0),
    }),
    [sourceRows],
  );

  const handleExecuteSync = async (
    mode: 'create' | 'update',
    preferOAuth = false,
    configOverride?: WeeklyTrackingSheetConfig,
  ) => {
    if (!selectedWeek) return;
    setIsSyncing(true);
    setErrorMsg('');
    if (preferOAuth) {
      setNeedsScriptUpdate(false);
    }

    try {
      const cleanId = extractSpreadsheetIdFromInput(
        configOverride?.spreadsheetId || sheetIdDraft,
      );
      const cleanScriptUrl =
        configOverride?.appsScriptUrl !== undefined
          ? configOverride.appsScriptUrl
          : scriptUrlDraft.trim();

      const savedCfg = await saveWeeklySheetConfig({
        spreadsheetId: cleanId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        appsScriptUrl: cleanScriptUrl,
        teamLeadersByFacility: config.teamLeadersByFacility,
      });
      onConfigUpdated(savedCfg);

      const finalRows = extractWeeklySourceRowsFromPart2(
        part2Rows,
        selectedWeek,
        cutoffDisplay,
        config.teamLeadersByFacility,
      );

      const res = await syncWeekReportToGoogleSheet({
        selectedWeek,
        sourceRows: finalRows,
        mode,
        preferOAuth,
      });

      if (res.needsScriptUpdate) {
        setNeedsScriptUpdate(true);
        setErrorMsg(res.message);
        return;
      }

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      setNeedsScriptUpdate(false);
      setSyncResult(res);
      setCheckResult({
        spreadsheetFound: true,
        spreadsheetId: res.spreadsheetId,
        spreadsheetUrl: res.spreadsheetUrl,
        weekExists: true,
        weekCode: res.weekCode,
        sheetId: res.sheetId,
        sheetTitle: res.sheetTitle,
        existingRowCount: res.totalRowsVerified,
        tabUrl: res.tabUrl,
      });
      onSyncCompleted(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đồng bộ Google Sheet thất bại. Dữ liệu chưa được ghi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const runLiveCheck = async (week: SelectedWeekMeta | null, allowAutoCreate = false) => {
    if (!week) return;
    setIsChecking(true);
    setErrorMsg('');
    setSyncResult(null);
    setCheckResult(null);
    setNeedsScriptUpdate(false);

    try {
      const profile = getCurrentUserProfile();
      setUserLabel(profile.label);

      const res = await checkExistingWeekReport(week);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      if (res.result) {
        setCheckResult(res.result);
        // Step 1 behavior requested by user: when clicking "Tạo báo cáo xử lý trên Google Sheet"
        // and the week does not exist yet in "Trưởng nhóm xử lý", immediately write Part 2 rows!
        if (allowAutoCreate && !res.result.weekExists && sourceRows.length > 0) {
          setIsChecking(false);
          await handleExecuteSync('create', false);
          return;
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể kiểm tra trạng thái Google Sheet.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      hasAutoTriggeredOnOpenRef.current = false;
      return;
    }
    setSyncResult(null);
    setErrorMsg('');
    setNeedsScriptUpdate(false);
    if (selectedWeek) {
      const shouldAutoCreate = !hasAutoTriggeredOnOpenRef.current;
      hasAutoTriggeredOnOpenRef.current = true;
      void runLiveCheck(selectedWeek, shouldAutoCreate);
    }
  }, [isOpen, selectedWeek?.startIso, selectedWeek?.endIso]);

  if (!isOpen) return null;

  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      setErrorMsg('Trình duyệt không cho sao chép tự động. Vui lòng thử lại.');
    }
  };

  const handleSaveConfig = async (retrySyncMode?: 'create' | 'update') => {
    setSavingConfig(true);
    setErrorMsg('');
    try {
      const cleanId = extractSpreadsheetIdFromInput(sheetIdDraft);
      const cleanScriptUrl = scriptUrlDraft.trim();
      const updated = await saveWeeklySheetConfig({
        spreadsheetId: cleanId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        appsScriptUrl: cleanScriptUrl,
        teamLeadersByFacility: config.teamLeadersByFacility,
      });
      onConfigUpdated(updated);
      if (!retrySyncMode) {
        setShowSheetConfig(false);
      }
      if (retrySyncMode && selectedWeek) {
        await handleExecuteSync(retrySyncMode, false, updated);
      } else if (selectedWeek) {
        await runLiveCheck(selectedWeek, false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu cấu hình Google Sheet / Apps Script.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOAuthFallbackSync = async (mode: 'create' | 'update') => {
    setIsSigningInFallback(true);
    setErrorMsg('');
    try {
      const signedIn = await googleSignIn();
      if (!signedIn) {
        setErrorMsg('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
        return;
      }
      const profile = getCurrentUserProfile();
      setUserLabel(profile.label);
      await handleExecuteSync(mode, true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng nhập Google Workspace thất bại.');
    } finally {
      setIsSigningInFallback(false);
    }
  };

  const weekStartDmy = selectedWeek ? formatIsoShortDmy(selectedWeek.startIso) : '';
  const weekEndDmy = selectedWeek ? formatIsoShortDmy(selectedWeek.endIso) : '';
  const activeSpreadsheetId =
    checkResult?.spreadsheetId || config.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;
  const activeSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit`;
  const existingTabUrl = checkResult?.tabUrl || checkResult?.spreadsheetUrl || activeSpreadsheetUrl;
  const currentSyncMode: 'create' | 'update' = checkResult?.weekExists ? 'update' : 'create';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-gsheet-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#1A3A5C] to-[#1B5EA6] text-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 id="weekly-gsheet-modal-title" className="text-sm sm:text-base font-bold">
                Ghi Báo Cáo Xử Lý Tuần Vào Sheet “{TEAM_LEADER_SHEET_NAME}”
              </h3>
              <div className="text-xs text-sky-100 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  Sheet đích: <strong className="text-white">{TEAM_LEADER_SHEET_NAME}</strong> • ID:{' '}
                  <strong className="text-white font-mono">{activeSpreadsheetId}</strong>
                </span>
                {isSafeSpreadsheetUrl(existingTabUrl) && (
                  <a
                    href={existingTabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở Google Sheet</span>
                  </a>
                )}
                {userLabel && <span className="text-emerald-200">• Google: {userLabel}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Selected week header */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Tuần đang chọn tại Phần 2
              </span>
              {selectedWeek ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#1A3A5C]">
                    Tuần {selectedWeek.weekNumber}: {weekStartDmy} – {weekEndDmy}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-100 text-[#1B5EA6] font-mono text-[11px] font-semibold">
                    Chốt: {cutoffDisplay}
                  </span>
                </div>
              ) : (
                <p className="text-amber-700 font-semibold mt-1">
                  Bạn đang chọn chế độ “Cả tháng”. Vui lòng chọn một tuần cụ thể bên dưới để tạo báo cáo tuần:
                </p>
              )}
            </div>

            {availableWeeks.length > 0 && onSelectWeekKey && (
              <div className="flex flex-wrap items-center gap-1">
                {availableWeeks.map(w => {
                  const active = selectedWeek?.key === w.key;
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => onSelectWeekKey(w.key)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1B5EA6] text-white border-[#1B5EA6]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#1B5EA6]'
                      }`}
                    >
                      T{w.weekNumber} ({w.shortRange})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedWeek && (
            <>
              {/* Summary from part2WarningTableData.rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70">
                  <span className="text-[11px] font-semibold text-rose-700 block">
                    Cơ sở cần xử lý (Từ Phần 2)
                  </span>
                  <span className="text-lg font-extrabold text-rose-800 font-mono tabular-nums">
                    {summaryTotals.facilitiesCount} cơ sở
                  </span>
                  <span className="block text-[10.5px] text-rose-600 mt-0.5">
                    Gồm cơ sở thiếu ảnh hoặc không check out trong tuần
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70">
                  <span className="text-[11px] font-semibold text-amber-800 block">
                    Tổng ngày không check out
                  </span>
                  <span className="text-lg font-extrabold text-amber-900 font-mono tabular-nums">
                    {summaryTotals.totalNoCheckoutDays} ngày
                  </span>
                  <span className="block text-[10.5px] text-amber-700 mt-0.5">
                    Khớp 100% cột Không làm (Tuần {selectedWeek.weekNumber})
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/70">
                  <span className="text-[11px] font-semibold text-[#1B5EA6] block">
                    Tổng số ảnh thiếu
                  </span>
                  <span className="text-lg font-extrabold text-[#1A3A5C] font-mono tabular-nums">
                    {summaryTotals.totalMissingImages} ảnh
                  </span>
                  <span className="block text-[10.5px] text-sky-700 mt-0.5">
                    Khớp 100% cột Thiếu ảnh (Tuần {selectedWeek.weekNumber})
                  </span>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewRows(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {showPreviewRows
                      ? 'Ẩn danh sách dòng nguồn'
                      : `Xem trước ${sourceRows.length} dòng ghi vào "${TEAM_LEADER_SHEET_NAME}"`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetConfig(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cấu hình Link Sheet &amp; Apps Script</span>
                </button>
              </div>

              {/* Collapsible Sheet ID & Apps Script URL Config */}
              {showSheetConfig && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700">
                      Link hoặc ID file Google Sheet cố định ({MASTER_WEEKLY_SHEET_TITLE})
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mặc định trỏ thẳng vào file bạn cung cấp (<span className="font-mono">{DEFAULT_WEEKLY_SPREADSHEET_ID}</span>) và ghi vào sheet <strong>“{TEAM_LEADER_SHEET_NAME}”</strong>.
                    </p>
                    <input
                      type="text"
                      value={sheetIdDraft}
                      onChange={e => setSheetIdDraft(e.target.value)}
                      placeholder={DEFAULT_WEEKLY_SPREADSHEET_ID}
                      className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800 focus:outline-none focus:border-[#1B5EA6]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">
                      URL Web App Google Apps Script (<span className="font-mono">/exec</span>) — ghi không cần đăng nhập
                    </label>
                    <input
                      type="text"
                      value={scriptUrlDraft}
                      onChange={e => setScriptUrlDraft(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800 focus:outline-none focus:border-[#1B5EA6]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleCopyAppsScript()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                    >
                      {copiedScript ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>
                        {copiedScript ? 'Đã sao chép mã Apps Script mới' : 'Sao chép mã Apps Script mới'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSaveConfig()}
                      disabled={savingConfig}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1B5EA6] hover:bg-[#154b86] text-white font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình & Kiểm tra lại'}
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Preview Table */}
              {showPreviewRows && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Mã hồ sơ</th>
                          <th className="p-2">Thời gian</th>
                          <th className="p-2 text-center">Tháng</th>
                          <th className="p-2 text-center">Tuần</th>
                          <th className="p-2 text-center">Ngày chốt</th>
                          <th className="p-2">Cơ sở</th>
                          <th className="p-2 text-center">KCO</th>
                          <th className="p-2 text-center">Thiếu ảnh</th>
                          <th className="p-2">Chi tiết các ngày vi phạm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sourceRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-slate-500">
                              Tuần này không có cơ sở nào thiếu ảnh hoặc không check out.
                            </td>
                          </tr>
                        ) : (
                          sourceRows.map(row => (
                            <tr key={row.recordCode} className="hover:bg-slate-50">
                              <td className="p-2 font-mono text-[10px] text-slate-600 whitespace-nowrap font-semibold">
                                {row.recordCode}
                              </td>
                              <td className="p-2 font-mono text-[10.5px] text-slate-700 whitespace-nowrap">
                                {row.weekDateRange}
                              </td>
                              <td className="p-2 text-center font-mono text-slate-700 whitespace-nowrap">
                                {row.monthLabel}
                              </td>
                              <td className="p-2 text-center font-mono font-semibold text-[#1B5EA6] whitespace-nowrap">
                                {row.weekOnlyLabel}
                              </td>
                              <td className="p-2 text-center font-mono text-slate-700 whitespace-nowrap">
                                {row.cutoffDate}
                              </td>
                              <td className="p-2 font-semibold text-slate-800 whitespace-nowrap">
                                {row.coSo}
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-rose-700">
                                {row.noCheckoutDays}
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-amber-700">
                                {row.missingImages}
                              </td>
                              <td className="p-2 text-slate-600">{row.violationDetails}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Honest Error Banner */}
              {errorMsg && !needsScriptUpdate && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-bold">Chưa ghi được lên sheet “{TEAM_LEADER_SHEET_NAME}”</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* One-Time Apps Script Update Card */}
              {needsScriptUpdate && (
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Code2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                        Cập nhật Apps Script phiên bản mới (v8): Tự điền “Thời gian cập nhật” khi tích duyệt trên Sheet
                      </h4>
                      <p className="text-amber-900 leading-relaxed">
                        {errorMsg ||
                          `Apps Script hiện tại trên Google Sheet (${activeSpreadsheetId}) cần được cập nhật lên phiên bản v8 để tự động ghi "Thời gian cập nhật" (cột N) và cập nhật "Trạng thái xử lý" (cột Q) ngay khi tích trực tiếp ô "Trưởng nhóm đã duyệt" (cột K) trong sheet "${TEAM_LEADER_SHEET_NAME}". Chỉ cần làm 1 lần:`}
                      </p>
                      <ol className="list-decimal pl-4 space-y-1 text-amber-950 text-[11.5px]">
                        <li>
                          Mở Google Sheet → vào menu{' '}
                          <strong>Tiện ích mở rộng &gt; Apps Script</strong>.
                        </li>
                        <li>
                          Bấm <strong>1. Sao chép mã Apps Script mới</strong> bên dưới, thay thế toàn bộ mã trong{' '}
                          <span className="font-mono">Code.gs</span> và nhấn Lưu (Ctrl+S).
                        </li>
                        <li>
                          <strong>Quan trọng:</strong> Nhấn{' '}
                          <strong>Triển khai &gt; Quản lý các mục đã triển khai &gt; biểu tượng bút (Chỉnh sửa) &gt; Phiên bản: Phiên bản mới &gt; Triển khai</strong>{' '}
                          (giữ nguyên URL <span className="font-mono">/exec</span> cũ), hoặc{' '}
                          <strong>Triển khai &gt; Triển khai mới</strong> (Ai có quyền truy cập: <strong>Bất kỳ ai</strong>). Sau đó bấm{' '}
                          <strong>Lưu URL &amp; Ghi ngay</strong>.
                        </li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyAppsScript()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      {copiedScript ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedScript ? 'Đã sao chép mã Code.gs mới!' : '1. Sao chép mã Apps Script mới'}
                      </span>
                    </button>
                    {isSafeSpreadsheetUrl(existingTabUrl) && (
                      <a
                        href={existingTabUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-950 font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở Google Sheet (“{TEAM_LEADER_SHEET_NAME}”)</span>
                      </a>
                    )}
                  </div>

                  <div className="pt-1 space-y-1.5">
                    <label className="block font-bold text-amber-950 text-[11px]">
                      2. Dán URL Web App Apps Script (/exec) sau khi triển khai (hoặc giữ nguyên URL hiện tại nếu bạn cập nhật bản triển khai cũ):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={scriptUrlDraft}
                        onChange={e => setScriptUrlDraft(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-white font-mono text-xs text-slate-800 focus:outline-none focus:border-[#1B5EA6]"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveConfig(currentSyncMode)}
                        disabled={savingConfig || isSyncing}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${(savingConfig || isSyncing) ? 'animate-spin' : ''}`} />
                        <span>
                          {savingConfig || isSyncing ? 'Đang ghi & kiểm tra...' : 'Lưu URL & Ghi ngay'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900">
                    <span>
                      Hoặc nếu bạn là chủ file Google Sheet và muốn ghi ngay lập tức bằng tài khoản Google:
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleOAuthFallbackSync(currentSyncMode)}
                      disabled={isSigningInFallback || isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer disabled:opacity-60"
                    >
                      <span>
                        {isSigningInFallback ? 'Đang kết nối Google...' : 'Ghi trực tiếp bằng tài khoản Google'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checking / Auto-writing Loader */}
              {(isChecking || (isSyncing && !syncResult)) && !needsScriptUpdate && (
                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50 text-sky-900 flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#1B5EA6]" />
                  <span>
                    {isSyncing
                      ? `Đang ghi ${sourceRows.length} cơ sở (cột Trưởng nhóm đã duyệt & Phương án xử lý) vào sheet "${TEAM_LEADER_SHEET_NAME}" và đọc kiểm tra lại...`
                      : `Đang kiểm tra sheet "${TEAM_LEADER_SHEET_NAME}" xem tuần ${weekStartDmy}–${weekEndDmy} đã có dữ liệu chưa...`}
                  </span>
                </div>
              )}

              {/* Verified Success Result */}
              {syncResult && syncResult.success && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                        {syncResult.mode === 'create'
                          ? `Đã ghi thành công vào sheet “${TEAM_LEADER_SHEET_NAME}” & xác minh dữ liệu`
                          : `Đã cập nhật thành công sheet “${TEAM_LEADER_SHEET_NAME}” & xác minh dữ liệu`}
                      </h4>
                      <p className="text-emerald-900">{syncResult.message}</p>
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                          Đồng bộ lúc: {syncResult.syncedAt}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                          Cập nhật: {syncResult.updatedCount}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                          Thêm mới: {syncResult.addedCount}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                          Không còn cảnh báo: {syncResult.resolvedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isSafeSpreadsheetUrl(syncResult.tabUrl) && (
                      <a
                        href={syncResult.tabUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở Google Sheet tuần này</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-900 font-semibold cursor-pointer"
                    >
                      Hoàn tất
                    </button>
                  </div>
                </div>
              )}

              {/* Second-Click Confirmation Dialog when week already exists */}
              {!isChecking && !isSyncing && !syncResult?.success && checkResult?.weekExists && (
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-bold text-amber-950 text-xs sm:text-sm leading-relaxed">
                        Báo cáo tuần [{weekStartDmy}–{weekEndDmy}] đã được tạo. Bạn muốn mở báo cáo hiện có hay cập nhật lại dữ liệu từ Phần 2?
                      </p>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Dữ liệu tuần này đang có trong sheet <strong className="font-mono">{checkResult.sheetTitle}</strong> ({checkResult.existingRowCount} hồ sơ). Khi chọn <strong>“Cập nhật lại”</strong>, hệ thống chỉ cập nhật lại cột số liệu nguồn từ Phần 2 của đúng tuần này, thêm cơ sở mới phát sinh, đánh dấu <em>“Không còn cảnh báo sau cập nhật”</em> nếu đã khắc phục và <strong>giữ nguyên toàn bộ ô Trưởng nhóm đã duyệt, Phương án xử lý, Ghi chú &amp; xác nhận của QLCL</strong> (các tuần khác giữ nguyên 100%).
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {isSafeSpreadsheetUrl(existingTabUrl) && (
                      <a
                        href={existingTabUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở báo cáo hiện có</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSyncing}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExecuteSync('update')}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B5EA6] hover:bg-[#154b86] text-white font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Cập nhật lại</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Manual action box if user switched week inside modal or retrying after script setup */}
              {!isChecking && !isSyncing && !syncResult?.success && !needsScriptUpdate && (!checkResult || !checkResult.weekExists) && (
                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 space-y-3">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1A3A5C] text-xs sm:text-sm">
                      Ghi tuần {weekStartDmy}–{weekEndDmy} vào sheet “{TEAM_LEADER_SHEET_NAME}”
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Dữ liệu từ Phần 2 gồm <strong>{sourceRows.length} cơ sở</strong> sẽ được ghi vào sheet{' '}
                      <strong className="text-[#1A3A5C]">“{TEAM_LEADER_SHEET_NAME}”</strong> với đầy đủ cột số liệu +{' '}
                      <strong>Trưởng nhóm đã duyệt</strong> &amp; <strong>Phương án xử lý</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSyncing}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExecuteSync('create')}
                      disabled={isSyncing || sourceRows.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>
                        {sourceRows.length === 0
                          ? 'Tuần này không có cơ sở vi phạm'
                          : `Ghi vào sheet "${TEAM_LEADER_SHEET_NAME}" (${sourceRows.length} cơ sở)`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
