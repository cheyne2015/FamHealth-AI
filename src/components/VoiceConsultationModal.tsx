import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileText, 
  Volume2, 
  RefreshCw, 
  Plus, 
  CalendarPlus, 
  Pill, 
  Stethoscope, 
  Hospital, 
  User, 
  ChevronRight, 
  History, 
  Trash2, 
  Check, 
  Printer, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { FamilyMember, ClinicalVoiceMemo, HealthMilestone } from '../types';

interface VoiceConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  onAddMilestone?: (milestone: Omit<HealthMilestone, 'id'>) => void;
  onSaveMemo?: (memo: ClinicalVoiceMemo) => void;
}

export const VoiceConsultationModal: React.FC<VoiceConsultationModalProps> = ({
  isOpen,
  onClose,
  member,
  onAddMilestone,
  onSaveMemo
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history'>('record');
  const [hospital, setHospital] = useState(
    member.relationship === '配偶' ? '同仁体检医学中心' : '第一人民医院健康管理中心'
  );
  const [department, setDepartment] = useState(
    member.relationship === '配偶' ? '内分泌代谢专科' : '消化与代谢内科'
  );
  const [doctorName, setDoctorName] = useState('主治医生');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [rawText, setRawText] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Structuring state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [structuredData, setStructuredData] = useState<ClinicalVoiceMemo | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [syncMilestoneSuccess, setSyncMilestoneSuccess] = useState(false);

  // History memos from local storage
  const [savedMemos, setSavedMemos] = useState<ClinicalVoiceMemo[]>([]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Load saved memos on mount & when member changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`health_voice_memos_${member.id}`);
      if (stored) {
        setSavedMemos(JSON.parse(stored));
      } else {
        // Seed an initial demo memo if empty
        const initialSeed: ClinicalVoiceMemo[] = [
          {
            id: `memo-${member.id}-init`,
            memberId: member.id,
            date: '2024-08-25',
            hospital: '第一人民医院健康管理中心',
            department: '内科代谢门诊',
            doctorName: '内科门诊专家',
            rawTranscript:
              '这次复查的甘油三酯从2.45显著回落到了1.82，谷丙转氨酶ALT也从58完全恢复到了32的正常标准，说明这三个月的低脂饮食和适度运动非常有成效。深海鱼油继续随正餐服用，平时晚餐主食多搭配粗粮杂豆。保持良好作息，建议年底再进行一次常规随访复查。',
            chiefComplaint: '血脂代谢及肝功能常规生活干预复查',
            diagnosisSummary:
              '甘油三酯显著回落接近正常上限，肝酶ALT完全恢复正常，代谢指标健康改善明显。',
            medicationChanges: [
              {
                drugName: '高纯度深海鱼油软胶囊 (Omega-3)',
                action: '维持',
                dosage: '每日1次，每次1粒',
                timing: '随正餐服用',
                reasonOrCaution: '辅助维持血脂健康代谢'
              }
            ],
            followUpPlan: {
              recommendedDateText: '3个月后常规复查',
              targetItems: ['血脂四项', '肝功能检查'],
              actionableReminderDate: '2024-11-30',
              instructions: '抽血前一日保持清淡饮食，次日清晨空腹'
            },
            lifestyleAdvices: [
              '坚持每周3-4次规律有氧运动，如快走或慢跑',
              '减少高脂油炸食品与精制糖摄入',
              '保证充足夜间睡眠，避免过度熬夜'
            ],
            doctorKeyQuotes: [
              '“指标改善非常明显，继续保持当前健康饮食与运动习惯！”',
              '“体检异常指标通过生活方式完全可以有效干预逆转。”'
            ],
            syncedToMilestones: true
          }
        ];
        setSavedMemos(initialSeed);
        try {
          localStorage.setItem(`health_voice_memos_${member.id}`, JSON.stringify(initialSeed));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Failed to load memos from storage:', err);
    }
  }, [member.id, hospital, department]);

  // Handle Voice Recording toggle
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearInterval(timerRef.current);
      setIsRecording(false);
    } else {
      // Start recording
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setSpeechError('当前浏览器环境暂不支持实时语音听写接口，您可以直接在下方输入框中输入或粘贴就医录音文字。');
        return;
      }

      try {
        setSpeechError(null);
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          setRecordingSeconds(0);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setRawText((prev) => {
              const cleaned = prev.trim();
              return cleaned ? `${cleaned} ${currentTranscript}` : currentTranscript;
            });
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setSpeechError('请在浏览器地址栏允许麦克风访问权限以启用语音实时速记。');
          } else if (event.error !== 'no-speech') {
            setSpeechError(`语音识别提示: ${event.error}`);
          }
          setIsRecording(false);
          clearInterval(timerRef.current);
        };

        recognition.onend = () => {
          setIsRecording(false);
          clearInterval(timerRef.current);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err: any) {
        setSpeechError(`无法启动录音: ${err?.message || '未知错误'}`);
        setIsRecording(false);
        clearInterval(timerRef.current);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Format recording seconds MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Preset medical consultation examples
  const loadPreset = (type: 'wife' | 'husband') => {
    if (type === 'wife') {
      setHospital('同仁体检医学中心');
      setDepartment('内分泌代谢专科');
      setDoctorName('副主任医师');
      setRawText(
        '“李女士，从你复查的甲功三项来看，促甲状腺激素 TSH 已经从 4.86 完全降到了 2.15，属于非常健康理想的稳定状态。两项甲状腺自身免疫抗体都是阴性，说明之前的轻度偏高只是一过性的生理代谢波动，完全不必过度担心。另外维生素 D 从 18.5 提升到了 34.2，已经达到充足线了。平时多保持户外自然光照射和规律作息，以后按正常年度体检随访甲功与彩超即可。”'
      );
    } else {
      setHospital('第一人民医院健康管理中心');
      setDepartment('消化与代谢内科');
      setDoctorName('主任医师');
      setRawText(
        '“张先生，从你今天复查的血生化结果来看，甘油三酯已经从 2.45 显著降到了 1.82，谷丙转氨酶 ALT 也从 58 完全恢复到了 32 的正常标准，说明这三个月的低脂饮食和适度运动非常有成效！接下来深海鱼油软胶囊继续随正餐服用，平时晚餐主食多搭配燕麦糙米等粗粮。保持规律有氧运动，三个月后过来抽血复查一次血脂四项巩固效果。”'
      );
    }
  };

  // Call Server-side API to structure consultation
  const handleAnalyzeConsultation = async () => {
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setStructuredData(null);
    setSyncMilestoneSuccess(false);

    try {
      const res = await fetch('/api/ai/structure-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          member,
          hospital,
          department,
          doctorName,
          currentDate: date
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const fullMemo: ClinicalVoiceMemo = {
          id: `memo-${Date.now()}`,
          memberId: member.id,
          date,
          hospital,
          department,
          doctorName,
          rawTranscript: rawText,
          audioDurationSeconds: recordingSeconds,
          ...json.data
        };
        setStructuredData(fullMemo);

        // Auto save to local list
        const updated = [fullMemo, ...savedMemos.filter((m) => m.id !== fullMemo.id)];
        setSavedMemos(updated);
        try {
          localStorage.setItem(`health_voice_memos_${member.id}`, JSON.stringify(updated));
        } catch (e) {}

        if (onSaveMemo) {
          onSaveMemo(fullMemo);
        }
      } else {
        throw new Error(json.error || '无法提取有效医嘱数据');
      }
    } catch (err: any) {
      console.error('Failed to structure consultation:', err);
      alert(`提取失败: ${err.message || '请检查网络连接或稍后重试'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync to Milestones
  const handleSyncToMilestone = () => {
    if (!structuredData || !onAddMilestone) return;

    const followUp = structuredData.followUpPlan;
    const targetDate =
      followUp.actionableReminderDate ||
      new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];

    const title = followUp.targetItems.length > 0 
      ? `门诊复查: ${followUp.targetItems.join('、')}`
      : `专科复诊与化验复查 (${structuredData.department})`;

    const note = `【${structuredData.hospital} · ${structuredData.doctorName || '门诊'}医嘱】\n` +
      `建议时间: ${followUp.recommendedDateText}\n` +
      `检查重点: ${followUp.targetItems.join(', ')}\n` +
      `注意事项: ${followUp.instructions || '按时就诊'}`;

    onAddMilestone({
      memberId: member.id,
      title,
      targetDate,
      category: '复查',
      status: 'pending',
      priority: 'high',
      clinicalNote: note,
      hospital: structuredData.hospital
    });

    setSyncMilestoneSuccess(true);
    // update current memo state
    const updated = { ...structuredData, syncedToMilestones: true };
    setStructuredData(updated);

    const newMemos = savedMemos.map((m) => (m.id === updated.id ? updated : m));
    setSavedMemos(newMemos);
    try {
      localStorage.setItem(`health_voice_memos_${member.id}`, JSON.stringify(newMemos));
    } catch (e) {}
  };

  // Copy full structured clinical notes to clipboard
  const handleCopyText = () => {
    if (!structuredData) return;

    const medLines = structuredData.medicationChanges
      .map((m) => `  - 【${m.action}】${m.drugName}: ${m.dosage} | ${m.timing} (${m.reasonOrCaution})`)
      .join('\n');

    const lifestyleLines = structuredData.lifestyleAdvices
      .map((l) => `  - ${l}`)
      .join('\n');

    const textToCopy = `【门诊医嘱速记卡 · ${structuredData.hospital}】
就诊日期: ${structuredData.date}
就诊科室: ${structuredData.department}  接诊医生: ${structuredData.doctorName || '主治医生'}
患者: ${member.name} (${member.age}岁, ${member.relationship})

一、患者主诉与本次门诊目的
${structuredData.chiefComplaint}

二、接诊医生核心评估与诊断
${structuredData.diagnosisSummary}

三、用药方案调整说明
${medLines || '  - 维持原用药'}

四、下次复查随访计划
建议时间: ${structuredData.followUpPlan.recommendedDateText} (建议日历: ${structuredData.followUpPlan.actionableReminderDate || '约4周后'})
复查项目: ${structuredData.followUpPlan.targetItems.join('、')}
注意事项: ${structuredData.followUpPlan.instructions}

五、生活作息与饮食医嘱
${lifestyleLines}

六、医生重点叮嘱金句
${structuredData.doctorKeyQuotes.map((q) => `  “${q}”`).join('\n')}

---
记录工具: 家庭健康管理 AI 系统 · 门诊智能语音速记`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Delete memo
  const handleDeleteMemo = (id: string) => {
    const filtered = savedMemos.filter((m) => m.id !== id);
    setSavedMemos(filtered);
    try {
      localStorage.setItem(`health_voice_memos_${member.id}`, JSON.stringify(filtered));
    } catch (e) {}
    if (structuredData?.id === id) {
      setStructuredData(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="voice-consultation-modal"
        className="bg-[#fdfdfb] border-2 border-[#1a1a1c] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1a1a1c] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5562ff]/10 border border-[#5562ff]/30 flex items-center justify-center text-[#5562ff] shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial-serif font-bold text-lg text-[#1a1a1c]">
                  门诊医嘱语音速记与智能结构化
                </h3>
                <span className="text-[10px] font-editorial-mono px-2 py-0.5 bg-[#5562ff] text-white rounded font-bold">
                  AI 临床速录
                </span>
              </div>
              <p className="text-xs text-[#1a1a1c]/60 font-editorial-mono">
                为【{member.name}】实时录入或语音记录接诊医生口述，自动拆解药品剂量、复查时间并同步日程
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sub-tab navigation */}
            <div className="flex bg-[#1a1a1c]/5 p-0.5 rounded-lg text-xs font-editorial-mono border border-[#1a1a1c]/10">
              <button
                onClick={() => setActiveSubTab('record')}
                className={`px-3 py-1 rounded-md transition ${
                  activeSubTab === 'record'
                    ? 'bg-white font-bold text-[#1a1a1c] shadow-2xs'
                    : 'text-[#1a1a1c]/60 hover:text-[#1a1a1c]'
                }`}
              >
                新增速记
              </button>
              <button
                onClick={() => setActiveSubTab('history')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeSubTab === 'history'
                    ? 'bg-white font-bold text-[#1a1a1c] shadow-2xs'
                    : 'text-[#1a1a1c]/60 hover:text-[#1a1a1c]'
                }`}
              >
                <span>历史医嘱</span>
                <span className="px-1.5 py-0.2 bg-[#1a1a1c]/10 rounded-full text-[10px]">
                  {savedMemos.length}
                </span>
              </button>
            </div>

            <button
              id="close-voice-memo-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1a1a1c]/10 text-[#1a1a1c]/60 hover:text-[#1a1a1c] transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeSubTab === 'record' ? (
            <>
              {/* Consultation metadata bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-lg border border-[#1a1a1c]/20 text-xs font-editorial-mono">
                <div>
                  <label className="block text-[#1a1a1c]/50 mb-1">就诊日期</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded px-2.5 py-1.5 font-sans font-medium text-[#1a1a1c]"
                  />
                </div>
                <div>
                  <label className="block text-[#1a1a1c]/50 mb-1">就诊医院</label>
                  <input
                    type="text"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    placeholder="如 附属妇儿医院"
                    className="w-full bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded px-2.5 py-1.5 font-sans font-medium text-[#1a1a1c]"
                  />
                </div>
                <div>
                  <label className="block text-[#1a1a1c]/50 mb-1">接诊科室</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="如 内分泌代谢门诊 / 慢病随访门诊"
                    className="w-full bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded px-2.5 py-1.5 font-sans font-medium text-[#1a1a1c]"
                  />
                </div>
                <div>
                  <label className="block text-[#1a1a1c]/50 mb-1">接诊医生 (选填)</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="如 王教授 / 主治医师"
                    className="w-full bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded px-2.5 py-1.5 font-sans font-medium text-[#1a1a1c]"
                  />
                </div>
              </div>

              {/* Dictation & Recording Section */}
              <div className="bg-white border border-[#1a1a1c] rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-editorial-serif font-bold text-sm text-[#1a1a1c]">
                      门诊口述原声 / 速记文本
                    </span>
                    <span className="text-[11px] text-[#1a1a1c]/50 font-editorial-mono">
                      (支持手机麦克风录音识别、键盘输入或载入经典预设)
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-2 text-xs font-editorial-mono">
                    <span className="text-[#1a1a1c]/40 text-[11px]">快速示例:</span>
                    <button
                      type="button"
                      onClick={() => loadPreset('wife')}
                      className="px-2 py-1 bg-[#5562ff]/10 hover:bg-[#5562ff]/20 text-[#5562ff] rounded border border-[#5562ff]/30 text-[11px] font-medium transition cursor-pointer"
                    >
                      甲状腺与代谢随访预设
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('husband')}
                      className="px-2 py-1 bg-[#1a1a1c]/5 hover:bg-[#1a1a1c]/10 text-[#1a1a1c] rounded border border-[#1a1a1c]/20 text-[11px] font-medium transition cursor-pointer"
                    >
                      血脂与肝功管理预设
                    </button>
                  </div>
                </div>

                {/* Microphone Recording Action Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-[#fdfdfb] rounded-lg border border-[#1a1a1c]/15 gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      id="voice-record-btn"
                      type="button"
                      onClick={toggleRecording}
                      className={`px-4 py-2 rounded-full flex items-center justify-center gap-2 font-editorial-mono text-xs font-bold transition shadow-xs cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-[#1a1a1c] text-white hover:bg-black'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span>停止录音听写 ({formatTime(recordingSeconds)})</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-emerald-400" />
                          <span>开启麦克风实时速记</span>
                        </>
                      )}
                    </button>

                    {isRecording && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 font-editorial-mono">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                        <span>正在录音实时聆听中...</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-[#1a1a1c]/50 font-editorial-mono text-right">
                    {isSpeechSupported ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Web 实时语音听写就绪
                      </span>
                    ) : (
                      <span className="text-amber-700">可直接输入或粘贴文字</span>
                    )}
                  </div>
                </div>

                {speechError && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 font-editorial-mono">
                    ⚠️ {speechError}
                  </div>
                )}

                {/* Textarea for transcript */}
                <div className="space-y-1.5">
                  <textarea
                    id="doctor-raw-transcript-textarea"
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="例如：医生说这次TSH指标降到1.37达标了，优甲乐维持每天早上空腹吃一片50微克，隔开牛奶豆浆半小时；维生素D还是偏低每天加2000单位D3随餐；下个月经周期第10天复查妇科阴超看卵泡，4周后复查抽血看甲功..."
                    className="w-full bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded-lg p-3 text-xs leading-relaxed text-[#1a1a1c] focus:outline-none focus:border-[#5562ff] transition font-sans"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#1a1a1c]/50 font-editorial-mono">
                    <span>字数：{rawText.length} 字</span>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="text-rose-600 hover:underline"
                      >
                        清空文本
                      </button>
                    )}
                  </div>
                </div>

                {/* Trigger AI Extract Button */}
                <div className="pt-2">
                  <button
                    id="trigger-ai-structure-btn"
                    type="button"
                    disabled={!rawText.trim() || isAnalyzing}
                    onClick={handleAnalyzeConsultation}
                    className="w-full py-2.5 px-4 bg-[#5562ff] hover:bg-[#4350ea] disabled:bg-gray-300 text-white rounded-lg font-editorial-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>AI 临床级语义模型解析医嘱中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>AI 智能提炼：结构化医嘱、药品调量与复查日程卡</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Structured Output Card */}
              {structuredData && (
                <div className="bg-white border-2 border-[#1a1a1c] rounded-xl p-5 space-y-5 shadow-xs animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1a1a1c]/15 gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#188038]" />
                      <span className="font-editorial-serif font-bold text-base text-[#1a1a1c]">
                        已提炼完成：结构化门诊医嘱档案
                      </span>
                      <span className="text-[10px] font-editorial-mono px-2 py-0.5 bg-[#188038]/10 text-[#188038] font-bold rounded">
                        临床规范校验通过
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-xs font-editorial-mono text-[#1a1a1c] transition"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">已复制全文</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#5562ff]" />
                            <span>复制医嘱卡</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 1. Chief Complaint & Doctor Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-[#fdfdfb] rounded-lg border border-[#1a1a1c]/15 space-y-1">
                      <span className="text-[11px] font-editorial-mono text-[#1a1a1c]/50 font-bold uppercase tracking-wider block">
                        [就诊主诉 / 目的]
                      </span>
                      <p className="text-xs text-[#1a1a1c] font-medium leading-relaxed">
                        {structuredData.chiefComplaint}
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#5562ff]/5 rounded-lg border border-[#5562ff]/20 space-y-1">
                      <span className="text-[11px] font-editorial-mono text-[#5562ff] font-bold uppercase tracking-wider block">
                        [医生核心评估与诊断]
                      </span>
                      <p className="text-xs text-[#1a1a1c] leading-relaxed">
                        {structuredData.diagnosisSummary}
                      </p>
                    </div>
                  </div>

                  {/* 2. Medication Changes Table */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-editorial-mono font-bold text-[#1a1a1c]">
                      <Pill className="w-4 h-4 text-[#5562ff]" />
                      <span>用药方案与剂量调整指令 ({structuredData.medicationChanges.length} 项)</span>
                    </div>

                    <div className="overflow-x-auto border border-[#1a1a1c]/20 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#f8f8f6] border-b border-[#1a1a1c]/20 font-editorial-mono text-[#1a1a1c]/60">
                            <th className="py-2 px-3 font-semibold">药品名称</th>
                            <th className="py-2 px-3 font-semibold">医嘱动作</th>
                            <th className="py-2 px-3 font-semibold">最新剂量与频次</th>
                            <th className="py-2 px-3 font-semibold">服用时间与要求</th>
                            <th className="py-2 px-3 font-semibold">调药原因与临床禁忌</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1c]/10 font-sans">
                          {structuredData.medicationChanges.map((med, i) => (
                            <tr key={i} className="hover:bg-[#5562ff]/5 transition">
                              <td className="py-2.5 px-3 font-semibold text-[#1a1a1c]">
                                {med.drugName}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-editorial-mono ${
                                    med.action === '加量' || med.action === '新增'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : med.action === '停药'
                                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                >
                                  {med.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-editorial-mono text-[#1a1a1c] font-medium">
                                {med.dosage}
                              </td>
                              <td className="py-2.5 px-3 text-[#1a1a1c]/80">
                                {med.timing}
                              </td>
                              <td className="py-2.5 px-3 text-[#1a1a1c]/70 text-[11px] leading-tight">
                                {med.reasonOrCaution}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. Follow-up plan & Direct Sync to Milestone */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#188038]" />
                        <span className="font-editorial-serif font-bold text-sm text-[#188038]">
                          下次复查与就医随访规划
                        </span>
                      </div>

                      {/* Sync to Milestone Calendar button */}
                      {onAddMilestone && (
                        <button
                          type="button"
                          id="sync-to-milestone-btn"
                          disabled={syncMilestoneSuccess || structuredData.syncedToMilestones}
                          onClick={handleSyncToMilestone}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#188038] hover:bg-[#146c2e] disabled:bg-gray-400 text-white text-xs font-editorial-mono font-bold rounded-lg transition shadow-2xs cursor-pointer disabled:cursor-default"
                        >
                          {syncMilestoneSuccess || structuredData.syncedToMilestones ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>已同步写入健康日程</span>
                            </>
                          ) : (
                            <>
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>一键同步至系统复查日历</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[#1a1a1c]/50 font-editorial-mono block text-[11px]">
                          建议复查时间
                        </span>
                        <p className="font-bold text-[#1a1a1c] mt-0.5">
                          {structuredData.followUpPlan.recommendedDateText}
                        </p>
                        {structuredData.followUpPlan.actionableReminderDate && (
                          <span className="text-[10px] text-emerald-800 font-editorial-mono">
                            (日历节点: {structuredData.followUpPlan.actionableReminderDate})
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[#1a1a1c]/50 font-editorial-mono block text-[11px]">
                          建议复查项目
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {structuredData.followUpPlan.targetItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white border border-emerald-400 text-emerald-950 rounded text-[11px] font-medium"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[#1a1a1c]/50 font-editorial-mono block text-[11px]">
                          检查前医嘱叮嘱
                        </span>
                        <p className="text-[#1a1a1c]/80 text-[11px] mt-0.5">
                          {structuredData.followUpPlan.instructions || '按时空腹或提前准备'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Lifestyle & Key Quotes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#fdfdfb] rounded-lg border border-[#1a1a1c]/15 space-y-1.5">
                      <span className="font-editorial-mono font-bold text-[#1a1a1c]/60 text-[11px]">
                        🌿 生活作息与饮食嘱托
                      </span>
                      <ul className="space-y-1">
                        {structuredData.lifestyleAdvices.map((adv, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[#1a1a1c]/90">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-[#fdfdfb] rounded-lg border border-[#1a1a1c]/15 space-y-1.5">
                      <span className="font-editorial-mono font-bold text-[#1a1a1c]/60 text-[11px]">
                        💬 医生重点叮嘱金句
                      </span>
                      <ul className="space-y-1">
                        {structuredData.doctorKeyQuotes.map((q, idx) => (
                          <li key={idx} className="text-[#1a1a1c] italic bg-white p-1.5 rounded border border-[#1a1a1c]/10 text-[11px]">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* History Sub-tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-editorial-serif font-bold text-base text-[#1a1a1c]">
                  【{member.name}】的既往门诊医嘱速记档案 ({savedMemos.length} 条)
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('record')}
                  className="px-3 py-1 bg-[#1a1a1c] text-white text-xs font-editorial-mono rounded hover:bg-black transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加新医嘱速记</span>
                </button>
              </div>

              {savedMemos.length === 0 ? (
                <div className="p-12 text-center bg-white border border-[#1a1a1c]/20 rounded-xl text-xs text-[#1a1a1c]/50 font-editorial-mono">
                  暂无医嘱速记记录，点击上方「新增速记」开始记录
                </div>
              ) : (
                <div className="space-y-3">
                  {savedMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className="bg-white border border-[#1a1a1c]/20 hover:border-[#1a1a1c] rounded-xl p-4 transition shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a1a1c]/10 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-editorial-mono text-xs font-bold px-2 py-0.5 bg-[#1a1a1c]/5 rounded border border-[#1a1a1c]/15">
                            {memo.date}
                          </span>
                          <span className="font-editorial-serif font-bold text-sm text-[#1a1a1c]">
                            {memo.hospital} · {memo.department}
                          </span>
                          <span className="text-xs text-[#1a1a1c]/60 font-editorial-mono">
                            {memo.doctorName || '接诊医生'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setStructuredData(memo);
                              setActiveSubTab('record');
                            }}
                            className="px-2.5 py-1 text-xs text-[#5562ff] hover:bg-[#5562ff]/10 rounded border border-[#5562ff]/30 font-editorial-mono font-bold transition"
                          >
                            查看详情卡 &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemo(memo.id)}
                            className="p-1 text-[#1a1a1c]/40 hover:text-rose-600 rounded transition"
                            title="删除该记录"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5">
                        <p className="text-[#1a1a1c] font-medium">
                          <span className="font-bold text-[#5562ff]">【诊断评估】</span> {memo.diagnosisSummary}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {memo.medicationChanges.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-[#f8f8f6] border border-[#1a1a1c]/15 rounded text-[11px] font-editorial-mono"
                            >
                              💊 {m.drugName}: <strong>{m.dosage}</strong> ({m.action})
                            </span>
                          ))}
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-[11px] font-editorial-mono">
                            🗓️ 复查: {memo.followUpPlan.recommendedDateText} ({memo.followUpPlan.targetItems.join('、')})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1c] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#1a1a1c]/60 font-editorial-mono">
            <ShieldCheck className="w-4 h-4 text-[#188038]" />
            <span>就医数据本地加密保护，支持随全量备份导出与云端容灾同步</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] font-editorial-mono rounded transition"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
