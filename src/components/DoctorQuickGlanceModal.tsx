import React, { useState, useEffect, useMemo } from 'react';
import { FamilyMember, MedicalReport, AnomalyAlert } from '../types';
import {
  X,
  Printer,
  Copy,
  Check,
  Stethoscope,
  Activity,
  Pill,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Sparkles,
  Save,
  MessageSquare
} from 'lucide-react';
import { canonicalizeIndicatorKey } from '../utils/indicatorUtils';

interface DoctorQuickGlanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  allMembers?: FamilyMember[];
  onSelectMember?: (m: FamilyMember) => void;
  reports: MedicalReport[];
  alerts: AnomalyAlert[];
  onAskAiQuestion?: (question: string) => void;
}

export const DoctorQuickGlanceModal: React.FC<DoctorQuickGlanceModalProps> = ({
  isOpen,
  onClose,
  member,
  allMembers = [],
  onSelectMember = (_m: FamilyMember) => {},
  reports,
  alerts,
  onAskAiQuestion
}) => {
  const [copied, setCopied] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState(false);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // Load saved notes from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`doctor_glance_notes_${member.id}`);
      if (saved) {
        setDoctorNotes(saved);
      } else {
        setDoctorNotes('');
      }
    }
  }, [isOpen, member.id]);

  // Extract key indicators from member's reports
  const dynamicIndicators = useMemo(() => {
    const list: Array<{
      name: string;
      latestVal: string;
      unit: string;
      range: string;
      status: 'normal' | 'warning' | 'critical';
      prevVal?: string;
      diffText?: string;
      date: string;
    }> = [];

    const seenKeys = new Set<string>();

    // Sort reports by date desc
    const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach((rep) => {
      rep.indicators.forEach((ind) => {
        const key = canonicalizeIndicatorKey(ind.standardKey, ind.name);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);

          let diffText: string | undefined;
          if (ind.differenceFromPrev) {
            const diffNum = ind.differenceFromPrev.diffNumber;
            if (typeof diffNum === 'number') {
              const abs = Math.abs(diffNum);
              diffText = ind.differenceFromPrev.trend === 'down' ? `较前次回落 -${abs}` : `较前次上涨 +${abs}`;
            }
          }

          list.push({
            name: ind.name,
            latestVal: String(ind.value),
            unit: ind.unit,
            range: ind.referenceRange,
            status: ind.status === 'critical' ? 'critical' : ind.status === 'warning' ? 'warning' : 'normal',
            prevVal: ind.differenceFromPrev ? String(ind.differenceFromPrev.prevValue) : undefined,
            diffText,
            date: rep.date
          });
        }
      });
    });

    return list;
  }, [reports]);

  // Questions tailored to health profile
  const consultationQuestions = useMemo(() => {
    const qList: string[] = [];
    if (alerts.length > 0) {
      alerts.slice(0, 2).forEach((a) => {
        qList.push(`针对【${a.indicatorName}】的变化转归：${a.title}，后续在饮食作息及日常监测上有哪些重点注意事项？`);
      });
    }
    qList.push(`结合近期的全面健康体检与检查化验结果，目前的常规指标维持方案是否需要针对性微调？`);
    qList.push(`下一阶段的专科随访或常规复查项目建议在多长时间后开展？有哪些重点指标需要持续追踪？`);
    return qList;
  }, [alerts]);

  const quickSummaryText = useMemo(() => {
    const abnormalList = dynamicIndicators.filter((i) => i.status !== 'normal');
    const normalList = dynamicIndicators.filter((i) => i.status === 'normal');

    let text = `【30秒门诊就医医生速览卡 - ${member.name}】\n`;
    text += `基本信息: ${member.age}岁 | 性别: ${member.gender === 'female' ? '女' : '男'} | 身份: ${member.relationship}\n`;
    text += `健康关注领域: ${member.tags.join('、')}\n\n`;

    text += `【1. 既往健康背景与健康状态】\n`;
    text += `${member.healthStatusSummary}\n\n`;

    text += `【2. 近期核心指标动态转归】\n`;
    if (abnormalList.length > 0) {
      abnormalList.forEach((ind) => {
        text += `- ${ind.name}: 最新 ${ind.latestVal} ${ind.unit} (${ind.date}) | 参考范围: ${ind.range} ${ind.diffText ? `[${ind.diffText}]` : ''}\n`;
      });
    }
    if (normalList.length > 0) {
      normalList.slice(0, 3).forEach((ind) => {
        text += `- ${ind.name}: ${ind.latestVal} ${ind.unit} (正常)\n`;
      });
    }

    text += `\n【3. 本次门诊重点咨询沟通诉求】\n`;
    consultationQuestions.forEach((q, idx) => {
      text += `${idx + 1}. ${q}\n`;
    });

    return text;
  }, [member, dynamicIndicators, consultationQuestions]);

  if (!isOpen) return null;

  const handleSaveNotes = () => {
    localStorage.setItem(`doctor_glance_notes_${member.id}`, doctorNotes);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  };

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(quickSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#fcfcf9] border-2 border-[#1a1a1c] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:p-0">
        {/* Header bar */}
        <div className="p-4 bg-[#1a1a1c] text-white flex items-center justify-between shrink-0 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5562ff] text-white rounded-xs print:hidden">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial-mono text-base sm:text-lg font-bold tracking-tight">
                  「诊室速览」门诊就医医生速览卡
                </h2>
                <span className="px-2 py-0.5 bg-[#5562ff] text-[10px] font-bold tracking-wide uppercase">
                  DOCTOR QUICK-GLANCE
                </span>
              </div>
              <p className="font-editorial-mono text-xs text-white/70 print:text-black/70 mt-0.5">
                浓缩患者年龄、健康档案背景、近期核心指标动态转归、当前用药及本次门诊核心沟通诉求
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 print:hidden shrink-0">
            <button
              id="print-doctor-glance-btn"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-full bg-white/10 hover:bg-white text-white hover:text-[#1a1a1c] border border-white/30 text-xs font-bold font-editorial-mono flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
              title="一键打印接诊速览单"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">打印此单</span>
              <span className="sm:hidden">打印</span>
            </button>
            <button
              id="copy-doctor-glance-btn"
              onClick={handleCopy}
              className="px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-full bg-[#5562ff] hover:bg-[#4350ea] text-white text-xs font-bold font-editorial-mono flex items-center gap-1.5 shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">复制速览文本</span>
                  <span className="sm:hidden">复制</span>
                </>
              )}
            </button>
            <button
              id="close-doctor-glance-btn"
              onClick={onClose}
              className="p-1.5 min-h-[34px] min-w-[34px] rounded-full flex items-center justify-center text-white/70 hover:text-white border border-transparent hover:border-white/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="关闭速览弹窗"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Member Selector Bar */}
        <div className="px-4 py-2.5 bg-[#f0f0ea] border-b border-[#1a1a1c]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs font-editorial-mono shrink-0 print:hidden min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <User className="w-4 h-4 text-[#5562ff] shrink-0" />
            <span className="font-bold text-[#1a1a1c] shrink-0">就诊成员切换：</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(allMembers || []).map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectMember(m)}
                  className={`px-2.5 py-1 min-h-[30px] text-xs font-bold border transition cursor-pointer ${
                    m.id === member.id
                      ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                      : 'bg-white text-[#1a1a1c] border-[#1a1a1c]/30 hover:border-[#1a1a1c]'
                  }`}
                >
                  {m.name} ({m.relationship})
                </button>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-[#1a1a1c]/60 hidden md:inline shrink-0">
            接诊时建议直接展示屏幕或打印递交给主治医师
          </span>
        </div>

        {/* Modal Body: Scrollable & Printable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#1a1a1c]">
          {/* Section 1: Patient Demographics & Profile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 border border-[#1a1a1c]">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-[#1a1a1c]/20 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] font-bold text-[#1a1a1c]/60 uppercase block font-editorial-mono">
                就诊基本信息
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <h3 className="font-editorial-sans text-xl font-bold text-[#1a1a1c]">
                  {member.name}
                </h3>
                <span className="text-xs font-editorial-mono text-[#5562ff] font-bold">
                  {member.age} 岁 · {member.gender === 'female' ? '女' : '男'}
                </span>
              </div>
              <p className="text-xs font-editorial-mono text-[#1a1a1c]/70 mt-1">
                家庭角色: {member.relationship} · 血型: {member.bloodType || '详见报告'}
              </p>
            </div>

            <div className="md:col-span-3">
              <span className="text-[10px] font-bold text-[#1a1a1c]/60 uppercase block font-editorial-mono">
                健康档案与既往背景 (HEALTH STATUS SUMMARY)
              </span>
              <p className="text-xs font-editorial-mono text-[#1a1a1c] font-semibold mt-1 leading-relaxed">
                {member.healthStatusSummary}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {member.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[10px] font-editorial-mono bg-[#1a1a1c]/5 border border-[#1a1a1c]/20 rounded-full font-bold text-[#1a1a1c]/70"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Key Indicators Dynamic Table */}
          <div className="bg-white border border-[#1a1a1c] overflow-hidden">
            <div className="p-3 bg-[#f0f4ff] border-b border-[#1a1a1c]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5562ff]" />
                <h4 className="font-editorial-mono text-xs font-bold uppercase tracking-wider text-[#5562ff]">
                  近期关键指标转归对比 (LAB & DIAGNOSTIC FINDINGS)
                </h4>
              </div>
              <span className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">
                按时序跨期自动提取
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-editorial-mono">
                <thead className="bg-[#fafaf8] border-b border-[#1a1a1c]/15 text-[#1a1a1c]/70 text-[11px]">
                  <tr>
                    <th className="p-2.5">检查指标项</th>
                    <th className="p-2.5">最新数值</th>
                    <th className="p-2.5">参考标准区间</th>
                    <th className="p-2.5">跨期动态变动</th>
                    <th className="p-2.5">状态与临床指示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1c]/15">
                  {dynamicIndicators.slice(0, 6).map((ind, idx) => {
                    const isAbnormal = ind.status !== 'normal';
                    return (
                      <tr key={idx} className={isAbnormal ? 'bg-amber-50/40' : 'bg-emerald-50/20'}>
                        <td className="p-2.5 font-bold">
                          {ind.name}
                          <span className="block text-[10px] font-normal text-[#1a1a1c]/60">{ind.unit}</span>
                        </td>
                        <td className={`p-2.5 font-bold ${isAbnormal ? 'text-[#b3261e]' : 'text-[#188038]'}`}>
                          {ind.latestVal} {ind.unit}
                        </td>
                        <td className="p-2.5 text-[#1a1a1c]/70">
                          {ind.range || '详见单据'}
                        </td>
                        <td className="p-2.5 font-bold">
                          {ind.diffText ? (
                            <span className={ind.diffText.includes('回落') ? 'text-[#188038]' : 'text-blue-600'}>
                              {ind.diffText}
                            </span>
                          ) : (
                            <span className="text-[#1a1a1c]/40 font-normal">单次检测基线</span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold">
                          {isAbnormal ? (
                            <span className="text-amber-700 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              需关注随访
                            </span>
                          ) : (
                            <span className="text-[#188038] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#188038] shrink-0" />
                              正常良好
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Core Consultation Questions */}
          <div className="bg-[#fffdfa] border border-[#1a1a1c] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#5562ff]" />
                <h4 className="font-editorial-mono text-xs font-bold uppercase tracking-wider text-[#1a1a1c]">
                  本次门诊重点沟通与待咨询诉求 (DOCTOR CONSULTATION QUESTIONS)
                </h4>
              </div>
              <span className="text-[10px] font-editorial-mono text-[#1a1a1c]/50">
                可勾选已完成沟通项
              </span>
            </div>

            <div className="space-y-2.5">
              {consultationQuestions.map((q, idx) => {
                const key = `q_${member.id}_${idx}`;
                const isChecked = !!checkedItems[key];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(key)}
                    className={`p-3 border transition cursor-pointer flex items-start gap-2.5 select-none ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-500/60 opacity-70'
                        : 'bg-white border-[#1a1a1c]/30 hover:border-[#1a1a1c]'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-[#1a1a1c]/40 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-editorial-mono font-medium block ${isChecked ? 'line-through text-emerald-900' : 'text-[#1a1a1c]'}`}>
                        {idx + 1}. {q}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Doctor Notes Area */}
          <div className="bg-white border border-[#1a1a1c] p-4 print:border-t-2 print:border-black">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1a1a1c]" />
                <h4 className="font-editorial-mono text-xs font-bold uppercase tracking-wider text-[#1a1a1c]">
                  门诊医生叮嘱与口头医嘱备忘录 (DOCTOR ADVICE & NOTES)
                </h4>
              </div>
              <button
                onClick={handleSaveNotes}
                className="px-2 py-1 text-[11px] font-editorial-mono font-bold bg-[#1a1a1c] hover:bg-black text-white rounded-xs flex items-center gap-1 transition cursor-pointer print:hidden"
              >
                <Save className="w-3 h-3" />
                <span>{savedNotes ? '已保存' : '保存备忘'}</span>
              </button>
            </div>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="就诊过程中可在此实时记录主治医生口述的重要医嘱、检查开单建议、用药调整方案或下次复诊日期..."
              className="w-full h-24 p-2.5 text-xs font-editorial-mono bg-[#fdfdfb] border border-[#1a1a1c]/30 rounded-xs focus:outline-none focus:border-[#5562ff] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#f5f5f0] border-t border-[#1a1a1c]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-editorial-mono text-[#1a1a1c]/60 shrink-0 print:border-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>系统已对所有个人敏感身份标识进行脱敏保护</span>
          </div>
          <div>
            <span>家庭健康档案智能管理系统 · 临床问诊辅助</span>
          </div>
        </div>
      </div>
    </div>
  );
};
