import React from 'react';
import { Menu, ExternalLink, Printer } from 'lucide-react';
import { SOURCE_URL } from '../services/sheetService';
import { ReportTabId, REPORT_GROUPS } from './Sidebar';

interface HeaderProps {
  activeTab?: ReportTabId;
  onOpenSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab = 'survey', onOpenSidebar }) => {
  const currentItem = REPORT_GROUPS.flatMap((g) => g.items).find((item) => item.id === activeTab);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onOpenSidebar && (
          <button
            type="button"
            className="sidebar-toggle-mobile-btn"
            onClick={onOpenSidebar}
            title="Mở thanh công cụ báo cáo"
            aria-label="Mở thanh công cụ"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        )}
        <div className="brand-mark">
          <span>CV</span>
          <i />
        </div>
        <div className="brand-copy">
          <div className="brand-title-row">
            <strong>PHÒNG QUẢN LÝ CHẤT LƯỢNG</strong>
            {currentItem && (
              <span className="current-report-tag">
                {currentItem.label}
              </span>
            )}
          </div>
          <span>Hệ thống Trung tâm Cờ vua Sài Gòn &amp; Mỹ thuật thiếu nhi</span>
        </div>
      </div>

      <div className="top-actions">
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="top-link-btn">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Dữ liệu nguồn</span>
        </a>
        <button type="button" onClick={() => window.print()} className="top-action-btn">
          <Printer className="w-3.5 h-3.5" />
          <span>In báo cáo</span>
        </button>
      </div>
    </header>
  );
};

