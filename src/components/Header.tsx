import React, { useRef, useEffect } from 'react';
import { FamilyMember } from '../types';
import { 
  HeartPulse, 
  Upload, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquareHeart,
  HelpCircle,
  ShieldAlert,
  UserCheck,
  Plus,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Download,
  Stethoscope,
  Calendar,
  Mic,
  Sun,
  Moon
} from 'lucide-react';

interface HeaderProps {
  members: FamilyMember[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  activeTab: 'timeline' | 'comparison' | 'alerts' | 'ai' | 'milestones';
  onSelectTab: (tab: 'timeline' | 'comparison' | 'alerts' | 'ai' | 'milestones') => void;
  onOpenUpload: () => void;
  onOpenRequirementDialog?: () => void;
  onOpenCreateMember?: () => void;
  onOpenExport?: () => void;
  onOpenDoctorGlance?: () => void;
  onOpenVoiceMemo?: () => void;
  alertCount: number;
  reqConfidence?: number;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline';
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onShowSyncStatus?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  activeTab,
  onSelectTab,
  onOpenUpload,
  onOpenRequirementDialog,
  onOpenCreateMember,
  onOpenExport,
  onOpenDoctorGlance,
  onOpenVoiceMemo,
  alertCount,
  reqConfidence = 100,
  cloudSyncStatus = 'synced',
  theme = 'light',
  onToggleTheme,
  onShowSyncStatus
}) => {
  const switcherContainerRef = useRef<HTMLDivElement>(null);
  const selectedMemberBtnRef = useRef<HTMLButtonElement>(null);

  // Navigation tab refs for centering
  const navTabsContainerRef = useRef<HTMLDivElement>(null);
  const tabTimelineRef = useRef<HTMLButtonElement>(null);
  const tabComparisonRef = useRef<HTMLButtonElement>(null);
  const tabAlertsRef = useRef<HTMLButtonElement>(null);
  const tabAiRef = useRef<HTMLButtonElement>(null);
  const tabMilestonesRef = useRef<HTMLButtonElement>(null);

  const getActiveTabElement = (tab: 'timeline' | 'comparison' | 'alerts' | 'ai' | 'milestones') => {
    switch (tab) {
      case 'timeline': return tabTimelineRef.current;
      case 'comparison': return tabComparisonRef.current;
      case 'alerts': return tabAlertsRef.current;
      case 'ai': return tabAiRef.current;
      case 'milestones': return tabMilestonesRef.current;
      default: return null;
    }
  };

  const centerTabButton = (tabBtn: HTMLButtonElement | null) => {
    if (tabBtn && navTabsContainerRef.current) {
      const container = navTabsContainerRef.current;
      const targetScrollLeft = tabBtn.offsetLeft - (container.clientWidth / 2) + (tabBtn.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  };

  const centerMemberButton = (btn: HTMLElement | null) => {
    if (btn && switcherContainerRef.current) {
      const container = switcherContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const currentScrollLeft = container.scrollLeft;
      // Calculate exact center relative to the container's scroll coordinate system
      const btnCenterInScroll = (btnRect.left - containerRect.left) + currentScrollLeft + (btnRect.width / 2);
      const targetScrollLeft = btnCenterInScroll - (container.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  };

  // Center active navigation tab on mount or whenever activeTab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      centerTabButton(getActiveTabElement(activeTab));
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // When selected member changes or on mount, auto-center the switcher container
  useEffect(() => {
    const timer = setTimeout(() => {
      centerMemberButton(selectedMemberBtnRef.current);
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedMemberId]);

  return (
    <header className="bg-[#fdfdfb] border-b-[1.5px] border-[#1a1a1c] sticky top-0 z-40 text-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top brand & controls bar */}
        <div className="flex flex-wrap items-center justify-between py-2.5 sm:py-3 gap-y-2.5 gap-x-4 min-w-0 max-w-full">
          {/* Logo and utilities (Row 1) */}
          <div className="w-full flex items-center justify-between gap-2 sm:gap-3 flex-wrap min-w-0 shrink-0 pb-2 border-b border-[#1a1a1c]/8 dark:border-zinc-800">
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="font-editorial-serif italic text-xl sm:text-2xl font-medium tracking-tight text-[#1a1a1c] dark:text-zinc-100">
                FamHealth-AI
              </span>
              <span className="font-editorial-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1a1a1c]/50 dark:text-zinc-400 hidden sm:inline">
                家庭健康管理系统
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              {/* Theme Toggle Button */}
              <button
                id="header-theme-toggle-btn"
                onClick={onToggleTheme}
                className={`flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-editorial-mono px-2.5 sm:px-3 py-1 min-h-[30px] border rounded-full cursor-pointer shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 shrink-0 ${
                  theme === 'dark'
                    ? 'border-amber-400/40 bg-zinc-800 text-amber-300 hover:bg-zinc-700'
                    : 'border-[#475569] bg-[#f8fafc] text-[#334155] hover:bg-[#f1f5f9]'
                }`}
                title="点击切换阅读模式（洁净白模式 / 护眼深色模式）"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-3 h-3 text-amber-300" />
                    <span>护眼深色</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span className="hidden sm:inline">洁净白模式</span>
                    <span className="sm:hidden">洁净白</span>
                  </>
                )}
              </button>

              {/* Cloud Sync Status Badge */}
              <button
                id="cloud-sync-badge"
                onClick={onShowSyncStatus}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 min-h-[30px] rounded-full text-[10px] font-editorial-mono font-semibold border cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                style={{
                  backgroundColor: cloudSyncStatus === 'synced' ? 'rgba(24, 128, 56, 0.08)' : cloudSyncStatus === 'syncing' ? 'rgba(85, 98, 255, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  borderColor: cloudSyncStatus === 'synced' ? 'rgba(24, 128, 56, 0.25)' : cloudSyncStatus === 'syncing' ? 'rgba(85, 98, 255, 0.3)' : 'rgba(217, 119, 6, 0.3)',
                  color: cloudSyncStatus === 'synced' ? '#188038' : cloudSyncStatus === 'syncing' ? '#5562ff' : '#d97706'
                }}
                title="点击查看云端数据库同步详情"
              >
                {cloudSyncStatus === 'synced' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#188038]"></span>
                    <Cloud className="w-3 h-3 text-[#188038]" />
                    <span>云端已连</span>
                  </>
                ) : cloudSyncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-[#5562ff]" />
                    <span>同步中</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]"></span>
                    <span>离线缓存</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* User switcher (Selector 1 - 名字在左) */}
          <div 
            ref={switcherContainerRef}
            className="relative flex items-center max-w-full md:max-w-[48%] min-w-0 overflow-x-auto no-scrollbar scroll-smooth bg-[#1a1a1c]/6 dark:bg-zinc-800/80 p-1 rounded-full border border-[#1a1a1c]/10 dark:border-zinc-700 gap-0.5 justify-start shrink-0 mr-auto"
          >
            {members.map((member) => {
              const isSelected = member.id === selectedMemberId;
              return (
                <button
                  key={member.id}
                  ref={isSelected ? selectedMemberBtnRef : undefined}
                  id={`member-btn-${member.id}`}
                  onClick={(e) => {
                    onSelectMember(member.id);
                    centerMemberButton(e.currentTarget);
                  }}
                  className={`px-3 sm:px-4 py-1.5 min-h-[32px] rounded-full text-xs font-semibold whitespace-nowrap shrink-0 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/90 dark:border-zinc-700 font-bold ring-1 ring-slate-900/5'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60'
                  }`}
                >
                  <span>{member.name}</span>
                  <span className={`text-[10px] ml-1 font-editorial-mono font-medium ${isSelected ? 'text-[#4f46e5] dark:text-indigo-400' : 'opacity-65'}`}>
                    ({member.relationship})
                  </span>
                </button>
              );
            })}

            {onOpenCreateMember && (
              <button
                id="header-create-member-btn"
                onClick={onOpenCreateMember}
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[#1a1a1c]/35 dark:text-zinc-400 hover:text-[#1a1a1c] dark:hover:text-zinc-100 hover:bg-[#1a1a1c]/10 dark:hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200 ml-0.5 cursor-pointer"
                title="添加家庭成员档案 (点击新建)"
                aria-label="添加家庭成员"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons (Selector 2 - 另外div在右) */}
          <div className="flex items-center justify-start md:justify-end gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-full min-w-0 md:ml-auto">
            {onOpenDoctorGlance && (
              <button
                id="header-doctor-glance-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDoctorGlance();
                }}
                className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700/60 hover:scale-105 active:scale-95 text-xs font-editorial-mono font-bold transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
                title="进入诊室主治医生速览视图 (专为门诊快速接诊、提炼病史与决断设计)"
              >
                <Stethoscope className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="inline">诊室速览</span>
              </button>
            )}

            {onOpenExport && (
              <button
                id="header-export-data-btn"
                type="button"
                onClick={onOpenExport}
                className="relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-xs font-editorial-mono text-[#334155] dark:text-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
                title="全面导出健康数据至本地（包含聊天记录.md、ai分析.md、报告图片.jpg等）及从备份恢复"
              >
                <Download className="w-3.5 h-3.5 text-[#5562ff] dark:text-[#9aa2ff] shrink-0" />
                <span className="hidden sm:inline">备份与恢复</span>
                <span className="sm:hidden">备份</span>
              </button>
            )}

            {onOpenVoiceMemo && (
              <button
                id="header-voice-memo-btn"
                type="button"
                onClick={onOpenVoiceMemo}
                className="relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-xs font-editorial-mono text-[#334155] dark:text-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
                title="门诊医嘱语音速记与智能结构化（记录就诊口述，自动拆解用药与复查安排）"
              >
                <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="hidden sm:inline">医嘱速记</span>
                <span className="sm:hidden">速记</span>
              </button>
            )}

            <button
              id="upload-report-header-btn"
              type="button"
              onClick={onOpenUpload}
              className="relative z-10 flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 min-h-[34px] rounded-full bg-[#4f46e5] hover:bg-[#4338ca] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-indigo-500/25 border border-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 shrink-0 text-white" />
              <span>上传报告</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div 
          ref={navTabsContainerRef}
          id="header-nav-tabs"
          className="flex items-center border-t border-[#1a1a1c]/10 pt-1 -mb-[1px] overflow-x-auto no-scrollbar gap-1 sm:gap-6 scroll-smooth max-w-full w-full min-w-0"
        >
          <button
            ref={tabTimelineRef}
            id="tab-timeline"
            onClick={(e) => {
              onSelectTab('timeline');
              centerTabButton(e.currentTarget);
            }}
            className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'timeline'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/50 hover:text-[#1a1a1c]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>报告时间轴</span>
            <span className="font-editorial-mono text-[10px] opacity-60 ml-0.5">[01]</span>
          </button>

          <button
            ref={tabComparisonRef}
            id="tab-comparison"
            onClick={(e) => {
              onSelectTab('comparison');
              centerTabButton(e.currentTarget);
            }}
            className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'comparison'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/50 hover:text-[#1a1a1c]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>相同指标对比与走势</span>
            <span className="font-editorial-mono text-[10px] opacity-60 ml-0.5">[02]</span>
          </button>

          <button
            ref={tabAlertsRef}
            id="tab-alerts"
            onClick={(e) => {
              onSelectTab('alerts');
              centerTabButton(e.currentTarget);
            }}
            className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 relative ${
              activeTab === 'alerts'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/50 hover:text-[#1a1a1c]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#d93025]" />
            <span>异常变化对比预警</span>
            {alertCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-editorial-mono font-bold bg-[#d93025] text-white">
                {alertCount}
              </span>
            )}
            <span className="font-editorial-mono text-[10px] opacity-60 ml-0.5">[03]</span>
          </button>

          <button
            ref={tabMilestonesRef}
            id="tab-milestones"
            onClick={(e) => {
              onSelectTab('milestones');
              centerTabButton(e.currentTarget);
            }}
            className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'milestones'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/50 hover:text-[#1a1a1c]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#188038]" />
            <span>复查与健康日程</span>
            <span className="font-editorial-mono text-[10px] opacity-60 ml-0.5">[04]</span>
          </button>

          <button
            ref={tabAiRef}
            id="tab-ai"
            onClick={(e) => {
              onSelectTab('ai');
              centerTabButton(e.currentTarget);
            }}
            className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'ai'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/50 hover:text-[#1a1a1c]'
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5 text-[#5562ff]" />
            <span>AI 健康提问咨询</span>
            <span className="text-[10px] font-editorial-mono px-1.5 py-0.2 border border-[#5562ff] text-[#5562ff] rounded">
              全病历
            </span>
            <span className="font-editorial-mono text-[10px] opacity-60 ml-0.5">[05]</span>
          </button>
        </div>
      </div>
    </header>
  );
};

