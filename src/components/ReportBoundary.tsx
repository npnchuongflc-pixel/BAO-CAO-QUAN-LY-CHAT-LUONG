import React from 'react';

export function ReportLoading() {
  return <div className="report-loading" role="status" aria-live="polite">
    <span className="report-loading-spinner" aria-hidden="true" />
    <div><strong>Đang mở báo cáo…</strong><p>Vui lòng đợi trong giây lát.</p></div>
  </div>;
}

export class ReportBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="report-loading" role="alert">
      <div><strong>Chưa mở được báo cáo</strong><p>Vui lòng kiểm tra kết nối rồi tải lại trang.</p>
        <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button></div>
    </div>;
    return this.props.children;
  }
}
