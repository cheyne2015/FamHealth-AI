import React, { useState, useMemo } from 'react';
import { FamilyMember, MedicalReport, AnomalyAlert } from '../types';
import { X, Printer, Copy, Check, FileCheck, Stethoscope, AlertTriangle, Calendar, Pill } from 'lucide-react';
import { canonicalizeIndicatorKey } from '../utils/indicatorUtils';

interface DoctorVisitMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  reports: MedicalReport[];
  alerts: AnomalyAlert[];
}

export const DoctorVisitMemoModal: React.FC<DoctorVisitMemoModalProps> = ({
  isOpen,
  onClose,
  member,
  reports,
  alerts
}) => {
  const [copied, setCopied] = useState(false);

  // Extract key abnormal or recent indicators
  const keyIndicators = useMemo(() => {
    const list: Array<{
      name: string;
      value: string;
      unit: string;
      prevVal?: string;
      diffText?: string;
      status: 'normal' | 'warning' | 'critical';
      date: string;
      note?: string;
    }> = [];

    const seen = new Set<string>();
    const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach((r) => {
      r.indicators.forEach((i) => {
        const k = canonicalizeIndicatorKey(i.standardKey, i.name);
        if (!seen.has(k)) {
          seen.add(k);
          let diffText: string | undefined;
          if (i.differenceFromPrev) {
            const diffNum = i.differenceFromPrev.diffNumber;
            if (typeof diffNum === 'number') {
              diffText = i.differenceFromPrev.trend === 'down' ? `较前次回落 -${Math.abs(diffNum)}` : `较前次上涨 +${Math.abs(diffNum)}`;
            }
          }
          list.push({
            name: i.name,
            value: String(i.value),
            unit: i.unit,
            prevVal: i.differenceFromPrev ? String(i.differenceFromPrev.prevValue) : undefined,
            diffText,
            status: i.status === 'critical' ? 'critical' : i.status === 'warning' ? 'warning' : 'normal',
            date: r.date,
            note: i.clinicalNote
          });
        }
      });
    });

    return list;
  }, [reports]);

  // Dynamic doctor consultation questions
  const dynamicQuestions = useMemo(() => {
    const qList: string[] = [];
    const abnormals = keyIndicators.filter((i) => i.status !== 'normal');
    if (abnormals.length > 0) {
      abnormals.slice(0, 2).forEach((ind) => {
        qList.push(`“医生，关于【${ind.name}】（最新测定值 ${ind.value} ${ind.unit}${ind.diffText ? `，${ind.diffText}` : ''}），结合近期的生活饮食与运动调整，是否需要进一步深入专科检查或药物干预？”`);
      });
    }
    qList.push(`“结合近期历次检查报告整体情况，目前在日常生活作息、营养膳食结构与运动方案上，您有什么针对性的指导建议？”`);
    qList.push(`“请问下一阶段的复查建议安排在多长时间后？届时建议重点复查哪些具体的化验项目？”`);
    return qList;
  }, [keyIndicators]);

  const memoText = useMemo(() => {
    let t = `【门诊就诊病史摘要与医生沟通提问卡片】\n`;
    t += `就诊人员：${member.name} (${member.relationship}) | 年龄：${member.age}岁 | 性别：${member.gender === 'female' ? '女' : '男'}\n`;
    t += `健康档案关注：${member.tags.join('、')}\n\n`;

    t += `一、近期核心化验指标与动态转归：\n`;
    keyIndicators.slice(0, 4).forEach((ind, idx) => {
      t += `${idx + 1}. ${ind.name}: 最新 ${ind.value} ${ind.unit} (${ind.date})${ind.diffText ? ` [${ind.diffText}]` : ''}\n`;
      if (ind.note) t += `   临床提示: ${ind.note}\n`;
    });

    t += `\n二、建议门诊向医生咨询沟通的核心问题：\n`;
    dynamicQuestions.forEach((q, idx) => {
      t += `${idx + 1}. ${q}\n`;
    });

    t += `\n三、本次携带的历次纸质检查单据清单：\n`;
    reports.forEach((r) => {
      t += `- ${r.date} ${r.hospital} 《${r.title}》\n`;
    });

    return t;
  }, [member, keyIndicators, dynamicQuestions, reports]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-[#1a1a1c] bg-[#f8f8f6] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#1a1a1c] bg-white flex items-center justify-center text-[#5562ff] shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/60 font-bold block">
                DOCTOR VISIT PREPARATION · 门诊就诊备忘卡
              </span>
              <h3 className="font-editorial-serif text-lg sm:text-xl font-bold tracking-tight text-[#1a1a1c]">
                {member.name} 的门诊随访与就医沟通卡
              </h3>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-end w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-full text-xs border border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-200 font-editorial-mono shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#188038]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制卡片文本'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-full text-xs bg-[#5562ff] text-white hover:bg-[#4350ea] font-editorial-mono shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印备忘单</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 min-h-[32px] min-w-[32px] rounded-full flex items-center justify-center text-[#1a1a1c]/50 hover:text-[#1a1a1c] border border-transparent hover:border-slate-300 hover:scale-105 active:scale-95 transition-all duration-200 ml-1 cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Card Design */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-white">
          {/* Patient Overview */}
          <div className="p-4 bg-[#fdfdfb] border border-[#1a1a1c] flex flex-wrap items-center justify-between gap-4 text-xs font-editorial-mono">
            <div>
              <span className="text-[#1a1a1c]/50 block">患者基本信息</span>
              <span className="font-bold text-sm text-[#1a1a1c]">
                {member.name} · {member.age}岁 ({member.gender === 'female' ? '女' : '男'})
              </span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">家庭身份</span>
              <span className="font-bold text-[#5562ff]">
                {member.relationship}
              </span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">已建档就医报告</span>
              <span className="font-bold text-[#1a1a1c]">{reports.length} 份时序病历</span>
            </div>
          </div>

          {/* Section 1: Key Indicators Snapshot */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#5562ff]" />
              <h4 className="font-editorial-mono text-xs font-bold text-[#1a1a1c] uppercase tracking-wider">
                1. 既往指标异常与动态对比核心结论
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              {keyIndicators.slice(0, 4).map((ind, idx) => {
                const isAbnormal = ind.status !== 'normal';
                return (
                  <div
                    key={idx}
                    className={`p-3 border ${
                      isAbnormal ? 'border-amber-600/40 bg-amber-50/30' : 'border-[#1a1a1c]/30 bg-[#fdfdfb]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-editorial-mono mb-1">
                      <span className={`font-bold ${isAbnormal ? 'text-amber-800' : 'text-[#1a1a1c]'}`}>
                        {ind.name}
                      </span>
                      <span className="font-bold">
                        {ind.value} {ind.unit} {ind.diffText && <span className="text-[#188038] ml-1">({ind.diffText})</span>}
                      </span>
                    </div>
                    {ind.note && (
                      <p className="text-[#1a1a1c]/80 leading-relaxed text-[11px]">
                        {ind.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Questions to Ask Doctor */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#5562ff]" />
              <h4 className="font-editorial-mono text-xs font-bold text-[#1a1a1c] uppercase tracking-wider">
                2. 建议直接向门诊医生请教的关键问题 [DOCTOR QUESTIONS]
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              {dynamicQuestions.map((q, idx) => (
                <div key={idx} className="p-3.5 border border-[#1a1a1c] bg-[#f8f8f6]">
                  <span className="font-editorial-mono text-[10px] font-bold text-[#5562ff] uppercase block mb-1">
                    问诊问题 0{idx + 1}
                  </span>
                  <p className="font-medium text-[#1a1a1c] leading-relaxed">
                    {q}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Document Checklist */}
          <div className="p-4 border border-dashed border-[#1a1a1c]/30 text-xs font-editorial-mono bg-[#fdfdfb]">
            <span className="text-[#1a1a1c]/60 font-bold block mb-1.5 uppercase">
              3. 就诊需随身携带的原始纸质单据清单：
            </span>
            <ul className="space-y-1 text-[#1a1a1c]/80 list-disc list-inside">
              {reports.map((r) => (
                <li key={r.id}>
                  {r.date} {r.hospital} 《{r.title}》
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1a1a1c] bg-[#f8f8f6] flex items-center justify-between text-xs font-editorial-mono">
          <span className="text-[#1a1a1c]/50">
            建议就诊前出示给门诊主诊医生，或保存至手机随时查看
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#1a1a1c] text-white hover:bg-black transition font-semibold cursor-pointer"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
