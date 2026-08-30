import React from 'react';
import { Menu, ExternalLink, RefreshCw } from 'lucide-react';
import { SOURCE_URL } from '../services/sheetService';
import { ReportTabId, REPORT_GROUPS } from './Sidebar';
import chessLogo from '../assets/brands/co-vua-sai-gon.png';
import artLogo from '../assets/brands/saigon-art.png';

interface HeaderProps {
  activeTab?: ReportTabId;
  onOpenSidebar?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'survey',
  onOpenSidebar,
  onRefresh,
  loading = false,
}) => {
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
        <div className="brand-logo-cluster" aria-label="Cờ Vua Sài Gòn và Sài Gòn Art">
          <div className="brand-logo-card brand-logo-card-chess">
            <img src={chessLogo} alt="Logo Cờ Vua Sài Gòn" />
          </div>
          <span className="brand-logo-separator" aria-hidden="true" />
          <div className="brand-logo-card brand-logo-card-art">
            <img src={artLogo} alt="Logo Sài Gòn Art" />
          </div>
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
          <span>Hệ thống Trung tâm Cờ Vua Sài Gòn - Sài Gòn Art</span>
        </div>
      </div>

      <div className="top-actions">
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="top-link-btn">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Dữ liệu nguồn</span>
        </a>
        {activeTab === 'survey' && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="top-action-btn"
            title="Cập nhật dữ liệu mới nhất"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang tải…' : 'Cập nhật'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
