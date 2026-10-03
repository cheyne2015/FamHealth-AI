import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  initialFamilyMembers, 
  initialMedicalReports, 
  initialAnomalyAlerts 
} from './data/mockHealthData';
import { FamilyMember, MedicalReport, AnomalyAlert, HealthMilestone, ClinicalVoiceMemo } from './types';
import { Header } from './components/Header';
import { MemberProfileBar } from './components/MemberProfileBar';
import { TimelineView } from './components/TimelineView';
import { IndicatorComparisonView } from './components/IndicatorComparisonView';
import { AnomalyAlertsView } from './components/AnomalyAlertsView';
import { AiConsultantView } from './components/AiConsultantView';
import { UploadReportModal } from './components/UploadReportModal';
import { CreateMemberModal } from './components/CreateMemberModal';
import { EditMemberModal } from './components/EditMemberModal';
import { ExportDataModal } from './components/ExportDataModal';
import { DoctorQuickGlanceModal } from './components/DoctorQuickGlanceModal';
import { MilestoneCalendarView } from './components/MilestoneCalendarView';
import { VoiceConsultationModal } from './components/VoiceConsultationModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { RotateCcw } from 'lucide-react';
import { 
  enrichReportsWithCrossComparisons, 
  synthesizeAnomalyAlerts, 
  canonicalizeIndicatorKey 
} from './utils/indicatorUtils';
import { 
  db, 
  membersCol, 
  reportsCol, 
  alertsCol, 
  saveMemberToCloud, 
  saveReportToCloud, 
  deleteReportFromCloud, 
  seedCloudIfEmpty, 
  fetchAllCloudData,
  restoreCloudDatabase,
  onSnapshot 
} from './lib/firebase';

const STORAGE_KEYS = {
  MEMBERS: 'family_health_members_v1',
  REPORTS: 'family_health_reports_v1',
  ALERTS: 'family_health_alerts_v1',
  SELECTED_MEMBER_ID: 'family_health_selected_member_id_v1'
};

export default function App() {
  const isDemoMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('demo') === 'true' ||
    new URLSearchParams(window.location.search).get('demo') === '1' ||
    localStorage.getItem('family_health_demo_mode') === 'true'
  );

  const [members, setMembers] = useState<FamilyMember[]>(() => {
    if (!isDemoMode) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load members from localStorage', e);
      }
    }
    return initialFamilyMembers;
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (!isDemoMode) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MEMBER_ID);
        if (saved) return saved;
      } catch (e) {}
    }
    return 'member-1';
  });

  const [reports, setReports] = useState<MedicalReport[]>(() => {
    if (!isDemoMode) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load reports from localStorage', e);
      }
    }
    return initialMedicalReports;
  });

  const [alerts, setAlerts] = useState<AnomalyAlert[]>(() => {
    if (!isDemoMode) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load alerts from localStorage', e);
      }
    }
    return initialAnomalyAlerts;
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const isCloudInitialized = useRef(false);

  // Initialize Firestore listeners & cloud seed on startup
  useEffect(() => {
    if (isDemoMode) {
      setCloudSyncStatus('synced');
      return;
    }

    let unsubscribeMembers: (() => void) | undefined;
    let unsubscribeReports: (() => void) | undefined;
    let unsubscribeAlerts: (() => void) | undefined;
    let pollInterval: any;

    async function initCloudSync() {
      try {
        setCloudSyncStatus('syncing');

        // 1. Fetch all data via Server Cloud Tunnel (instant & unblocked in Mainland China)
        const cloudData = await fetchAllCloudData();
        if (cloudData.success && cloudData.members.length > 0) {
          setMembers(cloudData.members);
          setReports(cloudData.reports);
          setAlerts(cloudData.alerts);
          try {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cloudData.members));
            localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(cloudData.reports));
            localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(cloudData.alerts));
          } catch (e) {}
          setCloudSyncStatus('synced');
        } else {
          // If empty, seed initial data to cloud
          await seedCloudIfEmpty(initialFamilyMembers, initialMedicalReports, initialAnomalyAlerts);
          setCloudSyncStatus('synced');
        }

        // 2. Setup periodic background polling for cross-device updates in GFW environments
        pollInterval = setInterval(async () => {
          try {
            const fresh = await fetchAllCloudData();
            if (fresh.success && fresh.members.length > 0) {
              setMembers(fresh.members);
              setReports(fresh.reports);
              setAlerts(fresh.alerts);
              setCloudSyncStatus('synced');
            }
          } catch (e) {}
        }, 12000);

        // 3. Setup client real-time listener if available (for VPN / overseas clients)
        try {
          unsubscribeMembers = onSnapshot(membersCol, (snapshot) => {
            if (!snapshot.empty) {
              const remoteMembers: FamilyMember[] = [];
              snapshot.forEach((docSnap) => {
                remoteMembers.push(docSnap.data() as FamilyMember);
              });
              if (remoteMembers.length > 0) {
                setMembers(remoteMembers);
                try {
                  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(remoteMembers));
                } catch (e) {}
              }
            }
            setCloudSyncStatus('synced');
          }, (error) => {
            console.log('Direct Firestore listener blocked or offline, Server Tunnel active:', error);
            // Keep synced because Server Tunnel is active
            setCloudSyncStatus('synced');
          });

          unsubscribeReports = onSnapshot(reportsCol, (snapshot) => {
            if (!snapshot.empty) {
              const remoteReports: MedicalReport[] = [];
              snapshot.forEach((docSnap) => {
                remoteReports.push(docSnap.data() as MedicalReport);
              });
              if (remoteReports.length > 0) {
                setReports(remoteReports);
                try {
                  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(remoteReports));
                } catch (e) {}
              }
            }
          }, () => {});

          unsubscribeAlerts = onSnapshot(alertsCol, (snapshot) => {
            if (!snapshot.empty) {
              const remoteAlerts: AnomalyAlert[] = [];
              snapshot.forEach((docSnap) => {
                remoteAlerts.push(docSnap.data() as AnomalyAlert);
              });
              if (remoteAlerts.length > 0) {
                setAlerts(remoteAlerts);
                try {
                  localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(remoteAlerts));
                } catch (e) {}
              }
            }
          }, () => {});
        } catch (listenerErr) {
          console.log('Client onSnapshot not available, operating in Server Cloud Tunnel mode:', listenerErr);
        }

        isCloudInitialized.current = true;
      } catch (err) {
        console.warn('Could not connect to Firestore, operating in resilient local mode:', err);
        setCloudSyncStatus('offline');
      }
    }

    initCloudSync();

    const handleWindowFocus = async () => {
      try {
        const fresh = await fetchAllCloudData();
        if (fresh.success && fresh.members.length > 0) {
          setMembers(fresh.members);
          setReports(fresh.reports);
          setAlerts(fresh.alerts);
          setCloudSyncStatus('synced');
        }
      } catch (e) {}
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (unsubscribeMembers) unsubscribeMembers();
      if (unsubscribeReports) unsubscribeReports();
      if (unsubscribeAlerts) unsubscribeAlerts();
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Automatically persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error('Failed to save members to localStorage', e);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MEMBER_ID, selectedMemberId);
    } catch (e) {}
  }, [selectedMemberId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to save reports to localStorage', e);
    }
  }, [reports]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save alerts to localStorage', e);
    }
  }, [alerts]);
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'comparison' | 'alerts' | 'ai' | 'milestones'>('timeline');
  const [selectedIndicatorForTrend, setSelectedIndicatorForTrend] = useState<string | undefined>('TSH');
  const [initialAiQuestion, setInitialAiQuestion] = useState<string | undefined>('');
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVoiceMemoModalOpen, setIsVoiceMemoModalOpen] = useState(false);
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDoctorGlanceModalOpen, setIsDoctorGlanceModalOpen] = useState(false);
  const [isSyncStatusModalOpen, setIsSyncStatusModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('health_app_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('health_app_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    showToast(
      nextTheme === 'dark'
        ? '🌙 已切换至【护眼深色模式】（适合夜间与弱光查阅）'
        : '☀️ 已切换至【洁净白模式】（适合日光阅读与诊室向医生出示）'
    );
  };

  const handleShowSyncStatus = () => {
    setIsSyncStatusModalOpen(true);
  };

  const handleManualSync = async () => {
    setCloudSyncStatus('syncing');
    try {
      const fresh = await fetchAllCloudData();
      if (fresh.success && fresh.members.length > 0) {
        setMembers(fresh.members);
        setReports(fresh.reports);
        setAlerts(fresh.alerts);
        try {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(fresh.members));
          localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(fresh.reports));
          localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(fresh.alerts));
        } catch (e) {}
      }
      setCloudSyncStatus('synced');
      showToast('✓ 已通过国内加速主通道成功对齐云端最新数据库！');
    } catch (e) {
      console.warn('Manual sync error:', e);
      setCloudSyncStatus('offline');
      throw e;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleRestoreBackupData = async (restoredData: {
    members?: FamilyMember[];
    reports?: MedicalReport[];
    alerts?: AnomalyAlert[];
    chatMessages?: any[];
    mode: 'merge' | 'replace';
  }) => {
    const { members: newMembers, reports: newReports, alerts: newAlerts, mode } = restoredData;

    let mergedMembers: FamilyMember[];
    let mergedReports: MedicalReport[];
    let mergedAlerts: AnomalyAlert[];

    if (mode === 'replace') {
      mergedMembers = newMembers && newMembers.length > 0 ? newMembers : members;
      mergedReports = newReports || [];
      mergedAlerts = newAlerts || [];
    } else {
      const memberMap = new Map<string, FamilyMember>();
      members.forEach((m) => memberMap.set(m.id, m));
      (newMembers || []).forEach((m) => memberMap.set(m.id, m));
      mergedMembers = Array.from(memberMap.values());

      const reportMap = new Map<string, MedicalReport>();
      reports.forEach((r) => reportMap.set(r.id, r));
      (newReports || []).forEach((r) => reportMap.set(r.id, r));
      mergedReports = Array.from(reportMap.values());

      const alertMap = new Map<string, AnomalyAlert>();
      alerts.forEach((a) => alertMap.set(a.id, a));
      (newAlerts || []).forEach((a) => alertMap.set(a.id, a));
      mergedAlerts = Array.from(alertMap.values());
    }

    setMembers(mergedMembers);
    setReports(mergedReports);
    setAlerts(mergedAlerts);

    showToast(`✓ 数据恢复成功！共导入 ${mergedMembers.length} 位家庭成员、${mergedReports.length} 份化验报告，正在同步云端...`);

    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(mergedMembers));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(mergedReports));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(mergedAlerts));
    } catch (e) {}

    try {
      setCloudSyncStatus('syncing');
      for (const m of mergedMembers) {
        await saveMemberToCloud(m);
      }
      for (const r of mergedReports) {
        await saveReportToCloud(r);
      }
      setCloudSyncStatus('synced');
      showToast('✓ 恢复数据已全量同步写入云端数据库！');
    } catch (err) {
      console.warn('Sync restored data to cloud partial error:', err);
      setCloudSyncStatus('offline');
    }
  };

  const handleAddMember = async (newMember: FamilyMember) => {
    setMembers((prev) => [...prev, newMember]);
    setSelectedMemberId(newMember.id);
    showToast(`成功新增家庭成员【${newMember.name}】(${newMember.relationship})！正在同步云端...`);
    try {
      setCloudSyncStatus('syncing');
      await saveMemberToCloud(newMember);
      setCloudSyncStatus('synced');
      showToast(`家庭成员【${newMember.name}】已成功同步至云端！`);
    } catch (e) {
      console.warn('Cloud member save error, saved locally:', e);
      setCloudSyncStatus('offline');
    }
  };

  const handleUpdateMember = async (updatedMember: FamilyMember) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    showToast(`角色【${updatedMember.name}】资料已保存，正在同步至云端数据库...`);
    try {
      setCloudSyncStatus('syncing');
      await saveMemberToCloud(updatedMember);
      setCloudSyncStatus('synced');
      showToast(`角色【${updatedMember.name}】最新资料已成功永久同步至云端数据库！`);
    } catch (e) {
      console.warn('Cloud member update error, saved locally:', e);
      setCloudSyncStatus('offline');
    }
  };

  const handleResetData = () => {
    setShowResetConfirmModal(true);
  };

  const executeResetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      localStorage.removeItem(STORAGE_KEYS.REPORTS);
      localStorage.removeItem(STORAGE_KEYS.ALERTS);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_MEMBER_ID);
    } catch (e) {}
    setMembers(initialFamilyMembers);
    setReports(initialMedicalReports);
    setAlerts(initialAnomalyAlerts);
    setSelectedMemberId('member-1');
    showToast('已恢复系统初始示例数据！');
  };

  const currentMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || members[0];
  }, [members, selectedMemberId]);

  const memberReports = useMemo(() => {
    const raw = reports.filter((r) => r.memberId === selectedMemberId);
    return enrichReportsWithCrossComparisons(raw);
  }, [reports, selectedMemberId]);

  const memberAlerts = useMemo(() => {
    const base = alerts.filter((a) => a.memberId === selectedMemberId || a.memberId === 'all');
    return synthesizeAnomalyAlerts(memberReports, base, selectedMemberId);
  }, [alerts, memberReports, selectedMemberId]);

  // Navigate to trend tab
  const handleSelectIndicatorForTrend = (key: string) => {
    const canonical = canonicalizeIndicatorKey(key, key);
    setSelectedIndicatorForTrend(canonical);
    setActiveTab('comparison');
  };

  // Navigate to specific report in timeline
  const [highlightReportId, setHighlightReportId] = useState<string | null>(null);
  const handleNavigateToReport = (reportId: string) => {
    setHighlightReportId(reportId);
    setActiveTab('timeline');
  };

  // Ask AI about report
  const handleAskAIAboutReport = (report: MedicalReport) => {
    const q = `请帮我深入分析【${currentMember.name}】在【${report.hospital}】于 ${report.date} 出具的《${report.title}》：核心结论是“${report.summary}”，该结论在临床医学与日常健康管理上具有什么指示意义？我们需要注意什么？`;
    setInitialAiQuestion(q);
    setActiveTab('ai');
  };

  // Ask AI about indicator
  const handleAskAIAboutIndicator = (indicatorName: string, historySummary: string) => {
    const q = `请针对【${currentMember.name}】的【${indicatorName}】历史检验轨迹进行医学对比分析：${historySummary}。请问这种跨期波动情况是否在合理范围？日常应如何科学干预与规划复查？`;
    setInitialAiQuestion(q);
    setActiveTab('ai');
  };

  // Ask AI about alert
  const handleAskAIAboutAlert = (alert: AnomalyAlert) => {
    const q = `系统触发了预警：“${alert.title}”。${alert.description}。请问该异常对于【${currentMember.name}】目前的整体健康状态有何关键影响？专科复查与健康调理方案是什么？`;
    setInitialAiQuestion(q);
    setActiveTab('ai');
  };

  const handleAskAIAboutMember = (customQuestion?: string) => {
    const q = typeof customQuestion === 'string' && customQuestion.trim()
      ? customQuestion
      : `请根据【${currentMember.name}】(${currentMember.age}岁, ${currentMember.relationship})的全部医疗检查病历与化验指标，给出最科学的现阶段综合健康调理建议及随访时间表。`;
    setInitialAiQuestion(q);
    setActiveTab('ai');
  };

  // Add new report
  const handleAddReport = async (newReport: MedicalReport) => {
    setReports((prev) => [newReport, ...prev]);
    showToast(`成功录入报告《${newReport.title}》，正在同步至云端...`);
    try {
      setCloudSyncStatus('syncing');
      await saveReportToCloud(newReport);
      setCloudSyncStatus('synced');
      showToast(`报告《${newReport.title}》已成功存储至云端数据库！`);
    } catch (e) {
      console.warn('Cloud report save error, saved locally:', e);
      setCloudSyncStatus('offline');
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string, reportTitle?: string) => {
    const reportToDelete = reports.find(r => r.id === reportId);
    const title = reportTitle || reportToDelete?.title || '该病历报告';
    
    // Update local state immediately
    setReports((prev) => prev.filter(r => r.id !== reportId));
    showToast(`已删除《${title}》，正在同步移除云端记录...`);

    try {
      setCloudSyncStatus('syncing');
      await deleteReportFromCloud(reportId);
      setCloudSyncStatus('synced');
      showToast(`《${title}》已成功从云端数据库彻底移除！`);
    } catch (e) {
      console.warn('Cloud report delete error, removed locally:', e);
      setCloudSyncStatus('offline');
    }
  };

  const handleAddMilestoneFromVoice = (newMilestone: Omit<HealthMilestone, 'id'>) => {
    const fullMilestone: HealthMilestone = {
      ...newMilestone,
      id: `ms-voice-${Date.now()}`
    };
    try {
      const key = `milestones_${currentMember.id}`;
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      const updated = [fullMilestone, ...list];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save milestone to localStorage:', e);
    }
    showToast(`✓ 已自动将医嘱复查日程【${fullMilestone.title}】(${fullMilestone.targetDate}) 同步写入日历！`);
  };

  const handleSaveVoiceMemo = (memo: ClinicalVoiceMemo) => {
    showToast(`✓ 已保存【${memo.hospital}】门诊医嘱速记卡！`);
  };

  return (
    <div className="min-h-screen bg-[#fdfdfb] text-[#1a1a1c] flex flex-col font-sans selection:bg-[#5562ff]/20 selection:text-[#5562ff]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-[#1a1a1c] text-[#1a1a1c] px-4 py-2.5 shadow-[4px_4px_0_rgba(26,26,28,0.15)] text-xs flex items-center gap-2 animate-bounce font-editorial-mono">
          <span className="w-2 h-2 rounded-full bg-[#188038]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenCreateMember={() => setIsCreateMemberModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenDoctorGlance={() => setIsDoctorGlanceModalOpen(true)}
        onOpenVoiceMemo={() => setIsVoiceMemoModalOpen(true)}
        alertCount={memberAlerts.length}
        cloudSyncStatus={cloudSyncStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onShowSyncStatus={handleShowSyncStatus}
      />

      {/* Member Profile Summary Strip */}
      <MemberProfileBar
        member={currentMember}
        reportCount={memberReports.length}
        anomalyCount={memberAlerts.length}
        onAskAIAboutMember={handleAskAIAboutMember}
        onEditMember={() => setIsEditMemberModalOpen(true)}
        onOpenCreateMember={() => setIsCreateMemberModalOpen(true)}
        onOpenVoiceMemo={() => setIsVoiceMemoModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'timeline' && (
          <TimelineView
            reports={memberReports}
            memberName={currentMember.name}
            highlightReportId={highlightReportId}
            onAskAIAboutReport={handleAskAIAboutReport}
            onSelectIndicatorForTrend={handleSelectIndicatorForTrend}
            onDeleteReport={handleDeleteReport}
          />
        )}

        {activeTab === 'comparison' && (
          <IndicatorComparisonView
            reports={memberReports}
            memberName={currentMember.name}
            initialSelectedKey={selectedIndicatorForTrend}
            onSelectKey={(key) => setSelectedIndicatorForTrend(key)}
            onNavigateToReport={handleNavigateToReport}
            onAskAIAboutReport={handleAskAIAboutReport}
            onAskAIAboutIndicator={handleAskAIAboutIndicator}
          />
        )}

        {activeTab === 'alerts' && (
          <AnomalyAlertsView
            alerts={memberAlerts}
            onAskAIAboutAlert={handleAskAIAboutAlert}
            onNavigateToTrend={handleSelectIndicatorForTrend}
          />
        )}

        {activeTab === 'milestones' && (
          <MilestoneCalendarView
            member={currentMember}
            onNavigateToAi={handleAskAIAboutMember}
          />
        )}

        {activeTab === 'ai' && (
          <AiConsultantView
            currentMember={currentMember}
            reports={memberReports}
            alerts={memberAlerts}
            initialQuestion={initialAiQuestion}
            onOpenExport={() => setIsExportModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <DoctorQuickGlanceModal
        isOpen={isDoctorGlanceModalOpen}
        onClose={() => setIsDoctorGlanceModalOpen(false)}
        member={currentMember}
        allMembers={members}
        onSelectMember={(m) => setSelectedMemberId(m.id)}
        reports={memberReports}
        alerts={memberAlerts}
        onAskAiQuestion={(q) => {
          setIsDoctorGlanceModalOpen(false);
          handleAskAIAboutMember(q);
        }}
      />

      <UploadReportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        members={members}
        selectedMemberId={selectedMemberId}
        onAddReport={handleAddReport}
      />

      <VoiceConsultationModal
        isOpen={isVoiceMemoModalOpen}
        onClose={() => setIsVoiceMemoModalOpen(false)}
        member={currentMember}
        onAddMilestone={handleAddMilestoneFromVoice}
        onSaveMemo={handleSaveVoiceMemo}
      />

      <CreateMemberModal
        isOpen={isCreateMemberModalOpen}
        onClose={() => setIsCreateMemberModalOpen(false)}
        onAddMember={handleAddMember}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        member={currentMember}
        onClose={() => setIsEditMemberModalOpen(false)}
        onUpdateMember={handleUpdateMember}
        onOpenCreateNew={() => setIsCreateMemberModalOpen(true)}
      />

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        members={members}
        reports={reports}
        alerts={alerts}
        currentMemberId={selectedMemberId}
        onRestoreData={handleRestoreBackupData}
      />

      <SyncStatusModal
        isOpen={isSyncStatusModalOpen}
        onClose={() => setIsSyncStatusModalOpen(false)}
        cloudSyncStatus={cloudSyncStatus}
        membersCount={members.length}
        reportsCount={reports.length}
        alertsCount={alerts.length}
        onManualSync={handleManualSync}
      />

      {/* Footer */}
      <footer className="border-t border-[#1a1a1c]/15 bg-white py-6 px-4 text-center text-xs text-[#1a1a1c]/50 font-editorial-mono">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <p>家庭健康管理 AI 系统 · 智能病历归档 · 异常趋势对比 · 专科AI医学问答</p>
          <span className="hidden sm:inline text-[#1a1a1c]/20">|</span>
          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-1 text-[11px] text-[#1a1a1c]/45 hover:text-[#d93025] hover:underline transition"
            title="清空浏览器本地存储并恢复内置演示数据"
          >
            <RotateCcw className="w-3 h-3" />
            <span>恢复初始演示数据</span>
          </button>
        </div>
      </footer>

      {/* In-App Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-[#1a1a1c] dark:border-zinc-700 w-full max-w-sm p-5 shadow-[8px_8px_0_rgba(26,26,28,0.2)] rounded-xs">
            <h3 className="text-base font-bold text-[#1a1a1c] dark:text-zinc-100">恢复初始演示数据？</h3>
            <p className="mt-2 text-xs text-[#1a1a1c]/70 dark:text-zinc-400 leading-relaxed">
              确定要清空本地修改并恢复初始示例病历数据吗？
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-[#1a1a1c]/10 dark:border-zinc-800">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium border border-[#1a1a1c]/30 dark:border-zinc-700 hover:bg-[#1a1a1c]/5 dark:hover:bg-zinc-800 text-[#1a1a1c] dark:text-zinc-300 rounded transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowResetConfirmModal(false);
                  executeResetData();
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#d93025] hover:bg-[#b8241a] text-white rounded transition shadow-sm cursor-pointer"
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
