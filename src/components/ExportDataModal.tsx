import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Upload,
  FileText, 
  Image as ImageIcon, 
  MessageSquare, 
  Database, 
  CheckCircle2, 
  Archive, 
  ExternalLink,
  Eye,
  Loader2,
  Calendar,
  Building2,
  FolderArchive,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { FamilyMember, MedicalReport, AnomalyAlert, AIChatMessage } from '../types';
import { 
  generateChatMarkdown, 
  generateAiAnalysisMarkdown, 
  generateFullArchiveZip,
  formatExportDate 
} from '../utils/exportGenerators';
import { 
  downloadFile, 
  downloadText, 
  saveReportImageLocally, 
  getReportImageBlob 
} from '../utils/reportImageSaver';
import { getAllChatMessagesFromCloud } from '../lib/firebase';
import JSZip from 'jszip';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  reports: MedicalReport[];
  alerts: AnomalyAlert[];
  currentMemberId: string;
  onRestoreData?: (restoredData: {
    members?: FamilyMember[];
    reports?: MedicalReport[];
    alerts?: AnomalyAlert[];
    chatMessages?: AIChatMessage[];
    mode: 'merge' | 'replace';
  }) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  members,
  reports,
  alerts,
  currentMemberId,
  onRestoreData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'chat' | 'analysis' | 'images' | 'json' | 'restore'>('all');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState('');
  const [previewContent, setPreviewContent] = useState<{ title: string; text: string } | null>(null);

  // Restore States
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'parsing' | 'ready' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  // Chat messages retrieved from cloud or fallback local storage
  const [allChatMessages, setAllChatMessages] = useState<AIChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [isDownloadingAllImages, setIsDownloadingAllImages] = useState(false);

  // Load chat messages on mount/open
  useEffect(() => {
    if (!isOpen) return;

    const fetchChat = async () => {
      setIsLoadingChat(true);
      try {
        // Try fetching all chat messages from Firestore
        const remoteMessages = await getAllChatMessagesFromCloud();
        if (remoteMessages.length > 0) {
          setAllChatMessages(remoteMessages);
        } else {
          // Fallback to local storage
          const localMessages: AIChatMessage[] = [];
          for (const m of members) {
            try {
              const raw = localStorage.getItem(`HEALTH_CORE_AI_CHAT_${m.id}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  localMessages.push(...parsed);
                }
              }
            } catch (e) {}
          }
          setAllChatMessages(localMessages);
        }
      } catch (err) {
        console.warn('Failed to load chat messages for export:', err);
      } finally {
        setIsLoadingChat(false);
      }
    };

    fetchChat();
  }, [isOpen, members]);

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.id === currentMemberId) || members[0];
  const memberReports = reports;

  // Handler for full ZIP archive download
  const handleExportFullZip = async () => {
    try {
      setIsExportingZip(true);
      setZipProgress(5);
      setZipStatusText('正在筹备健康数据...');

      const zipBlob = await generateFullArchiveZip(
        members,
        reports,
        alerts,
        allChatMessages,
        (progress, status) => {
          setZipProgress(progress);
          setZipStatusText(status);
        }
      );

      const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const zipFileName = `家庭全量健康档案_${dateTag}.zip`;

      downloadFile(zipBlob, zipFileName);
      setZipStatusText('导出完成！已保存至本地下载目录。');
      setTimeout(() => {
        setIsExportingZip(false);
        setZipProgress(0);
        setZipStatusText('');
      }, 1500);
    } catch (err) {
      console.error('Error exporting zip:', err);
      alert('导出 ZIP 文件失败，请重试或单独导出各项文件。');
      setIsExportingZip(false);
    }
  };

  // Handler for exporting 聊天记录.md
  const handleExportChatMd = () => {
    const md = generateChatMarkdown(allChatMessages, members, 'all');
    const filename = `聊天记录_${new Date().toISOString().slice(0, 10)}.md`;
    downloadText(md, filename);
  };

  // Handler for exporting ai分析.md
  const handleExportAiAnalysisMd = () => {
    const md = generateAiAnalysisMarkdown(reports, members, alerts);
    const filename = `ai分析_${new Date().toISOString().slice(0, 10)}.md`;
    downloadText(md, filename);
  };

  // Handler for exporting individual report image
  const handleExportSingleImage = async (rep: MedicalReport) => {
    try {
      setDownloadingReportId(rep.id);
      const member = members.find((m) => m.id === rep.memberId);
      await saveReportImageLocally(rep, member ? member.name : '家庭成员');
    } catch (err) {
      console.error('Download report image failed:', err);
    } finally {
      setDownloadingReportId(null);
    }
  };

  // Handler for downloading all report images in a single ZIP
  const handleExportAllImagesZip = async () => {
    try {
      setIsDownloadingAllImages(true);
      const zip = new JSZip();
      const memberMap = new Map<string, string>();
      members.forEach((m) => memberMap.set(m.id, m.name));

      for (const rep of reports) {
        const memName = memberMap.get(rep.memberId) || '家庭成员';
        const { blob, filename } = await getReportImageBlob(rep, memName, 'image/jpeg');
        zip.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `全量检查报告单图片_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      console.error('Download all images zip failed:', err);
      alert('下载图片包失败，请尝试单张下载。');
    } finally {
      setIsDownloadingAllImages(false);
    }
  };

  // Handler for exporting JSON backup
  const handleExportJson = () => {
    const backup = {
      exportTime: new Date().toISOString(),
      version: '2.0',
      members,
      reports,
      alerts,
      chatMessages: allChatMessages
    };
    downloadText(
      JSON.stringify(backup, null, 2),
      `家庭健康档案全量备份_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8'
    );
  };

  // Handler for file restore
  const handleFileRestoreSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreStatus('parsing');
    setRestoreMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('无效的 JSON 数据结构');
        }

        const memberList = parsed.members || (Array.isArray(parsed) ? parsed : []);
        const reportList = parsed.reports || [];
        const alertList = parsed.alerts || [];
        const chatList = parsed.chatMessages || [];

        setRestorePayload({
          exportTime: parsed.exportTime || parsed.exportDate || '未知时间',
          version: parsed.version || '1.0',
          members: memberList,
          reports: reportList,
          alerts: alertList,
          chatMessages: chatList
        });

        setRestoreStatus('ready');
      } catch (err: any) {
        console.error('Failed to parse backup JSON:', err);
        setRestoreStatus('error');
        setRestoreMessage(`文件解析失败：${err.message || '请确保选择由系统导出的 .json 备份文件'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!restorePayload) return;
    try {
      if (onRestoreData) {
        onRestoreData({
          members: restorePayload.members,
          reports: restorePayload.reports,
          alerts: restorePayload.alerts,
          chatMessages: restorePayload.chatMessages,
          mode: restoreMode
        });
      }
      setRestoreStatus('success');
      setRestoreMessage(`✓ 恢复成功！已导入 ${restorePayload.members?.length || 0} 位家庭成员、${restorePayload.reports?.length || 0} 份化验报告、${restorePayload.alerts?.length || 0} 项异常预警！`);
    } catch (e: any) {
      setRestoreStatus('error');
      setRestoreMessage(`恢复执行失败：${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="export-data-modal"
        className="relative w-full max-w-4xl bg-[#fdfdfb] border-[1.5px] border-[#1a1a1c] shadow-[8px_8px_0px_rgba(26,26,28,0.15)] my-8 overflow-hidden rounded-none flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1c] bg-[#f8f8f6]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1c] text-[#fdfdfb] flex items-center justify-center shrink-0 shadow-xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-editorial-serif tracking-tight text-[#1a1a1c]">
                  健康数据全面导出到本地
                </h2>
                <span className="text-[10px] font-editorial-mono px-2 py-0.5 border border-[#188038] bg-[#188038]/10 text-[#188038] font-semibold rounded-full">
                  完整无损打包
                </span>
              </div>
              <p className="text-xs text-[#1a1a1c]/65 font-editorial-mono mt-0.5">
                包含聊天记录.md、ai分析.md、全量化验单报告图片.jpg 及结构化 JSON
              </p>
            </div>
          </div>
          <button
            id="close-export-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#1a1a1c]/50 hover:text-[#1a1a1c] hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all duration-200"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1a1a1c]/15 px-6 bg-white overflow-x-auto no-scrollbar gap-2 sm:gap-4 pt-1">
          <button
            onClick={() => { setActiveSubTab('all'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'all'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/55 hover:text-[#1a1a1c]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>全面导出概览 (ZIP全包)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('chat'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'chat'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/55 hover:text-[#1a1a1c]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#5562ff]" />
            <span>聊天记录.md ({allChatMessages.length}条)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('analysis'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'analysis'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/55 hover:text-[#1a1a1c]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#188038]" />
            <span>ai分析.md (全量临床综述)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('images'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'images'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/55 hover:text-[#1a1a1c]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#e37400]" />
            <span>报告图片.jpg ({reports.length}份)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('json'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'json'
                ? 'border-[#1a1a1c] text-[#1a1a1c]'
                : 'border-transparent text-[#1a1a1c]/55 hover:text-[#1a1a1c]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#1a1a1c]/60" />
            <span>全量数据.json</span>
          </button>
          <button
            id="subtab-restore-backup"
            onClick={() => { setActiveSubTab('restore'); setPreviewContent(null); }}
            className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition ${
              activeSubTab === 'restore'
                ? 'border-[#5562ff] text-[#5562ff]'
                : 'border-transparent text-[#5562ff]/75 hover:text-[#5562ff]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#5562ff]" />
            <span>从备份恢复 (RESTORE)</span>
            <span className="px-1.5 py-0.2 bg-[#5562ff] text-white text-[9px] rounded-full font-editorial-mono">
              一键恢复
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB: ALL (ZIP FULL ARCHIVE OVERVIEW) */}
          {activeSubTab === 'all' && (
            <div className="space-y-6">
              {/* Hero ZIP Export Card */}
              <div className="bg-[#f8f8f6] border-2 border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-editorial-mono text-xs font-bold text-[#5562ff] uppercase tracking-wider">
                        ★ 推荐方式
                      </span>
                      <span className="text-[11px] font-editorial-mono text-[#1a1a1c]/60">
                        一键将所有文件打包下载
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1a1a1c]">
                      下载「家庭全量健康档案」ZIP 压缩包
                    </h3>
                    <p className="text-xs text-[#1a1a1c]/75 max-w-xl leading-relaxed">
                      包含 <strong>聊天记录.md</strong>、<strong>ai分析.md</strong>、<strong>全量化验单报告图片 (.jpg)</strong>、结构化数据备份以及使用说明文件。下载解压后即可脱机随时查阅或打印。
                    </p>
                  </div>

                  <button
                    id="export-full-zip-btn"
                    disabled={isExportingZip}
                    onClick={handleExportFullZip}
                    className="flex items-center justify-center gap-2.5 px-6 py-3 bg-[#5562ff] hover:bg-[#4350ea] text-white text-sm font-semibold rounded-full shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isExportingZip ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#5562ff]" />
                        <span>正在打包导出...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>一键导出为 ZIP 压缩包</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress bar when zipping */}
                {isExportingZip && (
                  <div className="mt-4 pt-4 border-t border-[#1a1a1c]/15 space-y-2">
                    <div className="flex justify-between text-xs font-editorial-mono text-[#1a1a1c]">
                      <span>{zipStatusText}</span>
                      <span className="font-bold">{zipProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a1c]/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#5562ff] transition-all duration-200"
                        style={{ width: `${zipProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Breakdown Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-editorial-mono uppercase tracking-wider text-[#1a1a1c]/60 font-semibold">
                  包含的本地数据清单 (支持单独下载或预览)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item 1: Chat Messages Markdown */}
                  <div className="p-4 border border-[#1a1a1c]/20 bg-white hover:border-[#1a1a1c] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#5562ff]" />
                          <span className="font-bold text-xs text-[#1a1a1c] font-editorial-mono">
                            聊天记录.md
                          </span>
                        </div>
                        <span className="text-[10px] font-editorial-mono bg-[#5562ff]/10 text-[#5562ff] px-2 py-0.5 rounded-full font-semibold">
                          Markdown
                        </span>
                      </div>
                      <p className="text-xs text-[#1a1a1c]/70 line-clamp-2">
                        包含全家庭成员与 AI 临床顾问关于检验指标解读、慢病与代谢管理、生活方式干预的完整咨询问答与建议。
                      </p>
                      <div className="mt-2 text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                        会话记录：{allChatMessages.length} 条
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a1a1c]/10">
                      <button
                        onClick={() => {
                          const md = generateChatMarkdown(allChatMessages, members, 'all');
                          setPreviewContent({ title: '聊天记录.md 预览', text: md });
                        }}
                        className="flex-1 py-1.5 px-2 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] rounded-sm font-editorial-mono text-center flex items-center justify-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>预览内容</span>
                      </button>
                      <button
                        onClick={handleExportChatMd}
                        className="flex-1 py-1.5 px-2 text-xs bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] rounded-sm font-semibold text-center flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载 .md</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 2: AI Analysis Markdown */}
                  <div className="p-4 border border-[#1a1a1c]/20 bg-white hover:border-[#1a1a1c] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#188038]" />
                          <span className="font-bold text-xs text-[#1a1a1c] font-editorial-mono">
                            ai分析.md
                          </span>
                        </div>
                        <span className="text-[10px] font-editorial-mono bg-[#188038]/10 text-[#188038] px-2 py-0.5 rounded-full font-semibold">
                          Markdown
                        </span>
                      </div>
                      <p className="text-xs text-[#1a1a1c]/70 line-clamp-2">
                        附属妇儿医院等病历跨时序关联分析，包含核心诊断结论、指标波动曲线、专科就医备忘录、精准用药与补充剂方案。
                      </p>
                      <div className="mt-2 text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                        整合数据：{reports.length} 份检查报告 + {alerts.length} 项预警
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a1a1c]/10">
                      <button
                        onClick={() => {
                          const md = generateAiAnalysisMarkdown(reports, members, alerts);
                          setPreviewContent({ title: 'ai分析.md 预览', text: md });
                        }}
                        className="flex-1 py-1.5 px-2 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] rounded-sm font-editorial-mono text-center flex items-center justify-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>预览内容</span>
                      </button>
                      <button
                        onClick={handleExportAiAnalysisMd}
                        className="flex-1 py-1.5 px-2 text-xs bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] rounded-sm font-semibold text-center flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载 .md</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 3: Report Images JPG */}
                  <div className="p-4 border border-[#1a1a1c]/20 bg-white hover:border-[#1a1a1c] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-[#e37400]" />
                          <span className="font-bold text-xs text-[#1a1a1c] font-editorial-mono">
                            报告图片.jpg (化验单单据)
                          </span>
                        </div>
                        <span className="text-[10px] font-editorial-mono bg-[#e37400]/10 text-[#e37400] px-2 py-0.5 rounded-full font-semibold">
                          JPG 格式
                        </span>
                      </div>
                      <p className="text-xs text-[#1a1a1c]/70 line-clamp-2">
                        包含上传的真实化验单原图及系统高精度数字化临床诊断凭单，文件体积已优化在 1MB 限制内。
                      </p>
                      <div className="mt-2 text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                        图片文件：共 {reports.length} 份
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a1a1c]/10">
                      <button
                        onClick={() => setActiveSubTab('images')}
                        className="flex-1 py-1.5 px-2 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] rounded-sm font-editorial-mono text-center flex items-center justify-center gap-1 transition"
                      >
                        <Layers className="w-3 h-3" />
                        <span>浏览单张下载</span>
                      </button>
                      <button
                        disabled={isDownloadingAllImages}
                        onClick={handleExportAllImagesZip}
                        className="flex-1 py-1.5 px-2 text-xs bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] rounded-sm font-semibold text-center flex items-center justify-center gap-1 transition disabled:opacity-50"
                      >
                        {isDownloadingAllImages ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>打包下载图片</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 4: Structured JSON Backup */}
                  <div className="p-4 border border-[#1a1a1c]/20 bg-white hover:border-[#1a1a1c] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-[#1a1a1c]/70" />
                          <span className="font-bold text-xs text-[#1a1a1c] font-editorial-mono">
                            全量结构化数据.json
                          </span>
                        </div>
                        <span className="text-[10px] font-editorial-mono bg-[#1a1a1c]/10 text-[#1a1a1c] px-2 py-0.5 rounded-full font-semibold">
                          JSON 备份
                        </span>
                      </div>
                      <p className="text-xs text-[#1a1a1c]/70 line-clamp-2">
                        机器可读标准 JSON 备份，包含全部成员档案、指标数值、参考范围与时间戳，支持无缝迁移与恢复。
                      </p>
                      <div className="mt-2 text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                        完整结构数据备份
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a1a1c]/10">
                      <button
                        onClick={handleExportJson}
                        className="w-full py-1.5 px-2 text-xs bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] rounded-sm font-semibold text-center flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载全量备份 .json</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-[#188038]/5 border border-[#188038]/20 flex items-center gap-3 text-xs text-[#188038]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-editorial-mono text-[11px]">
                  <strong>本地无损导出保证：</strong> 导出的所有数据均在您的浏览器本地实时编译解压与渲染，不会经由任何第三方中间商，确保您与家人的医疗病历隐私安全。
                </span>
              </div>
            </div>
          )}

          {/* TAB: CHAT MESSAGES */}
          {activeSubTab === 'chat' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a1c]">
                    AI 临床顾问咨询记录 (共 {allChatMessages.length} 条对话)
                  </h3>
                  <p className="text-xs text-[#1a1a1c]/65 font-editorial-mono mt-0.5">
                    导出为符合 GitHub 规范的 Markdown 格式，含代码块、临床建议引用与提问时间戳。
                  </p>
                </div>
                <button
                  onClick={handleExportChatMd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] text-xs font-semibold rounded-full shrink-0 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 聊天记录.md</span>
                </button>
              </div>

              {allChatMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#1a1a1c]/50 font-editorial-mono border border-dashed border-[#1a1a1c]/20">
                  暂无已保存的咨询记录。您可以在「AI 临床顾问」界面中与医生助手对话，会话将自动同步并记录。
                </div>
              ) : (
                <div className="border border-[#1a1a1c]/15 bg-white divide-y divide-[#1a1a1c]/10 max-h-[420px] overflow-y-auto">
                  {allChatMessages.map((msg, i) => (
                    <div key={msg.id || i} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-editorial-mono">
                        <span className={msg.role === 'user' ? 'font-bold text-[#5562ff]' : 'font-bold text-[#188038]'}>
                          {msg.role === 'user' ? '👤 用户提问' : '🩺 AI 临床顾问建议 (Gemini 2.5)'}
                        </span>
                        <span className="text-[#1a1a1c]/40">
                          {msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).toLocaleString('zh-CN') : '')}
                        </span>
                      </div>
                      <div className="text-[#1a1a1c]/80 whitespace-pre-line text-[11.5px] leading-relaxed">
                        {msg.content.slice(0, 180)}
                        {msg.content.length > 180 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: AI ANALYSIS */}
          {activeSubTab === 'analysis' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a1c]">
                    AI 全病历多维度临床深度综合分析
                  </h3>
                  <p className="text-xs text-[#1a1a1c]/65 font-editorial-mono mt-0.5">
                    涵盖执行摘要、全时序指标转归对比、异常指标风险警报及门诊就诊复查建议。
                  </p>
                </div>
                <button
                  onClick={handleExportAiAnalysisMd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] text-xs font-semibold rounded-full shrink-0 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 ai分析.md</span>
                </button>
              </div>

              {/* Quick Preview Box */}
              <div className="p-4 bg-white border border-[#1a1a1c]/15 text-xs text-[#1a1a1c] font-editorial-mono max-h-[420px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {generateAiAnalysisMarkdown(reports, members, alerts)}
              </div>
            </div>
          )}

          {/* TAB: IMAGES */}
          {activeSubTab === 'images' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a1c]">
                    检查报告单图片库 (共 {reports.length} 份报告)
                  </h3>
                  <p className="text-xs text-[#1a1a1c]/65 font-editorial-mono mt-0.5">
                    每张报告均已自动生成高清晰度数字化检查单据 (.jpg 格式)，包含医院红章与检验条码。
                  </p>
                </div>
                <button
                  disabled={isDownloadingAllImages}
                  onClick={handleExportAllImagesZip}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] text-xs font-semibold rounded-full shrink-0 transition disabled:opacity-50"
                >
                  {isDownloadingAllImages ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在打包...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>一键打包下载全部图片 (ZIP)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                {reports.map((rep) => {
                  const mem = members.find((m) => m.id === rep.memberId);
                  const isDownloading = downloadingReportId === rep.id;

                  return (
                    <div 
                      key={rep.id}
                      className="p-3.5 border border-[#1a1a1c]/20 bg-white hover:border-[#1a1a1c] transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-editorial-mono px-2 py-0.5 bg-[#1a1a1c]/5 border border-[#1a1a1c]/10 text-[#1a1a1c]/70 rounded">
                            {rep.category}
                          </span>
                          <span className="text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                            {rep.date}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#1a1a1c] line-clamp-1">
                          {rep.title}
                        </h4>

                        <div className="text-[11px] text-[#1a1a1c]/60 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#1a1a1c]/40" />
                          <span>{rep.hospital}</span>
                          <span className="mx-1">·</span>
                          <span className="font-semibold text-[#1a1a1c]">{mem ? mem.name : '家庭成员'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#1a1a1c]/10 flex items-center justify-between">
                        <span className="text-[10px] font-editorial-mono text-[#188038]">
                          ✓ 支持标准 JPG 导出
                        </span>
                        <button
                          disabled={isDownloading}
                          onClick={() => handleExportSingleImage(rep)}
                          className="flex items-center gap-1 px-3 py-1 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] text-[11px] font-semibold rounded transition disabled:opacity-50 cursor-pointer"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>下载单据 .jpg</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: JSON */}
          {activeSubTab === 'json' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a1c]">
                    全量健康档案结构化数据 (JSON 格式)
                  </h3>
                  <p className="text-xs text-[#1a1a1c]/65 font-editorial-mono mt-0.5">
                    包含成员列表、所有报告详情、检验指标结构、预警警报与聊天问答记录。
                  </p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] text-xs font-semibold rounded-full shrink-0 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 数据备份.json</span>
                </button>
              </div>

              <div className="p-4 bg-[#1a1a1c] text-[#fdfdfb] rounded-none text-xs font-editorial-mono max-h-[380px] overflow-y-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      system: 'Health AI Core',
                      exportDate: new Date().toISOString(),
                      totalMembers: members.length,
                      totalReports: reports.length,
                      totalAlerts: alerts.length,
                      totalChatMessages: allChatMessages.length,
                      sampleMember: members[0]?.name,
                      sampleReportTitle: reports[0]?.title
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: RESTORE (IMPORT & RESTORE FROM LOCAL JSON BACKUP) */}
          {activeSubTab === 'restore' && (
            <div className="space-y-6">
              <div className="bg-[#f8f8f6] border-2 border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-editorial-mono text-xs font-bold text-[#5562ff] uppercase tracking-wider">
                        ★ 数据防丢保障
                      </span>
                      <span className="text-[11px] font-editorial-mono px-2 py-0.5 bg-[#5562ff]/10 text-[#5562ff] font-bold">
                        JSON 一键恢复与云端双向同步
                      </span>
                    </div>
                    <h3 className="text-base font-bold font-editorial-sans text-[#1a1a1c]">
                      从本地 JSON 备份文件还原健康档案
                    </h3>
                    <p className="text-xs text-[#1a1a1c]/70 font-editorial-mono">
                      支持上传由本系统导出的完整备份包，可自由选择「智能增量合并」或「全量替换覆盖」。
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => restoreFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1a1a1c]/40 hover:border-[#5562ff] p-8 text-center bg-white cursor-pointer transition hover:bg-[#fafaf8]"
              >
                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileRestoreSelect}
                />
                <div className="w-12 h-12 mx-auto bg-[#5562ff]/10 text-[#5562ff] rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                  点击浏览或拖拽之前导出的备份文件 (.json) 到此处
                </div>
                <p className="text-[11px] font-editorial-mono text-[#1a1a1c]/60 mt-1">
                  格式示例：家庭健康档案全量备份_YYYY-MM-DD.json
                </p>
              </div>

              {/* Status Message */}
              {restoreStatus === 'error' && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-editorial-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{restoreMessage}</span>
                </div>
              )}

              {restoreStatus === 'success' && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-editorial-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{restoreMessage}</span>
                </div>
              )}

              {/* Parsed Payload Preview & Restoration Options */}
              {restorePayload && (
                <div className="bg-white border border-[#1a1a1c] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1a1a1c]/15 pb-3">
                    <div>
                      <span className="text-[10px] font-editorial-mono uppercase tracking-widest text-[#5562ff] font-bold">
                        Backup Package Inspected · 解析成功
                      </span>
                      <h4 className="font-editorial-sans text-sm font-bold text-[#1a1a1c] mt-0.5">
                        {restoreFile?.name || '本地备份文件'}
                      </h4>
                    </div>
                    <span className="font-editorial-mono text-xs text-[#1a1a1c]/60">
                      导出时间: {restorePayload.exportTime}
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">家庭成员</div>
                      <div className="font-editorial-sans text-lg font-bold text-[#1a1a1c] mt-0.5">
                        {restorePayload.members?.length || 0} <span className="text-xs font-normal">人</span>
                      </div>
                      <div className="text-[10px] font-editorial-mono text-[#5562ff] mt-1 truncate">
                        {restorePayload.members?.map((m: any) => m.name).join('、')}
                      </div>
                    </div>

                    <div className="p-3 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">化验报告单</div>
                      <div className="font-editorial-sans text-lg font-bold text-[#1a1a1c] mt-0.5">
                        {restorePayload.reports?.length || 0} <span className="text-xs font-normal">份</span>
                      </div>
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60 mt-1">
                        包含指标明细
                      </div>
                    </div>

                    <div className="p-3 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">异常预警</div>
                      <div className="font-editorial-sans text-lg font-bold text-[#b3261e] mt-0.5">
                        {restorePayload.alerts?.length || 0} <span className="text-xs font-normal">条</span>
                      </div>
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60 mt-1">
                        临床追踪项
                      </div>
                    </div>

                    <div className="p-3 bg-[#f8f8f6] border border-[#1a1a1c]/20">
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">AI 问答记录</div>
                      <div className="font-editorial-sans text-lg font-bold text-[#188038] mt-0.5">
                        {restorePayload.chatMessages?.length || 0} <span className="text-xs font-normal">条</span>
                      </div>
                      <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/60 mt-1">
                        历史咨询会话
                      </div>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-2 border-t border-[#1a1a1c]/15">
                    <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-2">
                      选择恢复合并策略：
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3.5 border cursor-pointer transition ${
                          restoreMode === 'merge'
                            ? 'border-[#5562ff] bg-[#5562ff]/5 ring-1 ring-[#5562ff]'
                            : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-[#5562ff]"
                          />
                          <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                            智能增量合并 (推荐)
                          </span>
                        </div>
                        <p className="font-editorial-mono text-[11px] text-[#1a1a1c]/70 mt-1.5 pl-5 leading-relaxed">
                          保留当前已有数据，自动基于 ID 去重比对，追加或更新备份包中的成员与报告。
                        </p>
                      </div>

                      <div
                        onClick={() => setRestoreMode('replace')}
                        className={`p-3.5 border cursor-pointer transition ${
                          restoreMode === 'replace'
                            ? 'border-[#b3261e] bg-[#b3261e]/5 ring-1 ring-[#b3261e]'
                            : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="text-[#b3261e]"
                          />
                          <span className="font-editorial-mono text-xs font-bold text-[#b3261e]">
                            全量重置替换
                          </span>
                        </div>
                        <p className="font-editorial-mono text-[11px] text-[#1a1a1c]/70 mt-1.5 pl-5 leading-relaxed">
                          清空当前工作区，完全还原为该备份文件中的数据状态。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="flex justify-end pt-3">
                    <button
                      id="execute-restore-btn"
                      type="button"
                      onClick={handleExecuteRestore}
                      className="px-5 py-2.5 bg-[#5562ff] hover:bg-[#4350ea] text-white text-xs font-bold font-editorial-mono flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>执行数据恢复并同步至云端</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content Preview Modal / Drawer */}
          {previewContent && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white border-2 border-[#1a1a1c] max-w-3xl w-full max-h-[80vh] flex flex-col shadow-[8px_8px_0_rgba(26,26,28,0.2)]">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1c] bg-[#f8f8f6]">
                  <h3 className="text-sm font-bold text-[#1a1a1c] font-editorial-mono flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#5562ff]" />
                    <span>{previewContent.title}</span>
                  </h3>
                  <button
                    onClick={() => setPreviewContent(null)}
                    className="p-1 hover:bg-[#1a1a1c]/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 flex-1 overflow-y-auto text-xs font-editorial-mono whitespace-pre-wrap leading-relaxed text-[#1a1a1c]">
                  {previewContent.text}
                </div>
                <div className="p-3 border-t border-[#1a1a1c]/15 bg-[#f8f8f6] flex justify-end">
                  <button
                    onClick={() => setPreviewContent(null)}
                    className="px-4 py-1.5 bg-[#1a1a1c] text-[#fdfdfb] text-xs font-semibold rounded"
                  >
                    关闭预览
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#1a1a1c]/15 bg-[#f8f8f6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#1a1a1c]/60 font-editorial-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
            <span>本地导出支持脱机保存 · 与云端数据完全一致</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] font-editorial-mono text-xs rounded transition"
            >
              完成并关闭
            </button>
            <button
              id="footer-export-zip-btn"
              disabled={isExportingZip}
              onClick={handleExportFullZip}
              className="px-5 py-1.5 bg-[#1a1a1c] hover:bg-black text-[#fdfdfb] font-semibold text-xs rounded transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>全量导出为 ZIP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
