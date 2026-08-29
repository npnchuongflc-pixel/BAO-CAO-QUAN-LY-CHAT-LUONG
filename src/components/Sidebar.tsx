import React from 'react';
import {
  ClipboardCheck,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';
import { SOURCE_URL } from '../services/sheetService';

export type ReportTabId =
  | 'survey'
  | 'teaching-quality'
  | 'integrated-quality-report';

export interface ReportItem {
  id: ReportTabId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: 'live' | 'info' | 'accent' | 'warning';
}

export interface ReportGroup {
  category: string;
  items: ReportItem[];
}

export const REPORT_GROUPS: ReportGroup[] = [
  {
    category: 'PHẢN HỒI TỪ KHÁCH HÀNG',
    items: [
      {
        id: 'survey',
        label: 'Phản hồi từ khách hàng',
        shortLabel: 'Phản hồi',
        description: 'Dữ liệu Google Sheets & Xếp hạng CSAT',
        icon: ClipboardCheck,
        badge: 'Trực tiếp',
        badgeType: 'live',
      },
    ],
  },
  {
    category: 'GIÁM SÁT CHẤT LƯỢNG',
    items: [
      {
        id: 'teaching-quality',
        label: 'Chất lượng Giảng dạy & Lớp học',
        shortLabel: 'Giảng dạy',
        description: 'Tiêu chuẩn sư phạm Cờ Vua & Mỹ Thuật',
        icon: GraduationCap,
        badge: '19,537 ca',
        badgeType: 'info',
      },
      {
        id: 'integrated-quality-report',
        label: 'Giám sát Vệ sinh & Cơ sở 5S',
        shortLabel: 'Vệ sinh & 5S',
        description: 'Báo cáo vệ sinh & chất lượng cơ sở 19 điểm',
        icon: ShieldCheck,
        badge: '19 cơ sở',
        badgeType: 'live',
      },
    ],
  },
];

interface SidebarProps {
  activeTab: ReportTabId;
  onSelectTab: (tabId: ReportTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  syncTime: Date | null;
  onRefreshData?: () => void;
  loading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  syncTime,
  onRefreshData,
  loading = false,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="Thanh công cụ chuyển đổi báo cáo"
      >
        {/* Sidebar Header Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-badge-icon">
              <span>CV</span>
            </div>
            {!isCollapsed && (
              <div className="brand-text-block">
                <span className="brand-portal-title">TRUNG TÂM BÁO CÁO</span>
                <span className="brand-portal-sub">Hệ thống Cờ Vua Sài Gòn</span>
              </div>
            )}
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            className="sidebar-mobile-close md-hidden"
            onClick={onCloseMobile}
            title="Đóng thanh điều hướng"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>

          {/* Collapse Toggle for Desktop */}
          <button
            type="button"
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
            aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {REPORT_GROUPS.map((group) => (
            <div key={group.category} className="sidebar-group">
              {!isCollapsed && (
                <div className="sidebar-group-title">{group.category}</div>
              )}
              {isCollapsed && <div className="sidebar-group-divider" />}

              <ul className="sidebar-menu">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                      >
                        <div className="sidebar-item-icon">
                          <Icon className="w-5 h-5" />
                        </div>

                        {!isCollapsed && (
                          <div className="sidebar-item-content">
                            <div className="sidebar-item-main">
                              <span className="sidebar-item-label">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={`sidebar-badge badge-${
                                    item.badgeType || 'info'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <span className="sidebar-item-desc">{item.description}</span>
                          </div>
                        )}

                        {isCollapsed && item.badge && (
                          <span className={`sidebar-dot-badge badge-${item.badgeType || 'info'}`} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          {!isCollapsed ? (
            <div className="sidebar-footer-card">
              <div className="sync-status-row">
                <span className="sync-dot" />
                <div className="sync-meta">
                  <span className="sync-title">Hệ thống trực tuyến</span>
                  <span className="sync-time">
                    {syncTime
                      ? `Đồng bộ: ${syncTime.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Đang tải...'}
                  </span>
                </div>
                {onRefreshData && (
                  <button
                    type="button"
                    className="sidebar-action-icon-btn"
                    onClick={onRefreshData}
                    disabled={loading}
                    title="Làm mới dữ liệu"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-600'}`}
                    />
                  </button>
                )}
              </div>

              <div className="sidebar-quick-links">
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="quick-link-btn"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Sheet</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="quick-link-btn"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In báo cáo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="sidebar-footer-collapsed">
              {onRefreshData && (
                <button
                  type="button"
                  className="sidebar-collapsed-btn"
                  onClick={onRefreshData}
                  disabled={loading}
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-600'}`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="sidebar-collapsed-btn"
                title="In trang báo cáo"
              >
                <Printer className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
