import React from 'react';
import { FamilyMember, AnomalyAlert } from '../types';
import { Sparkles, ArrowRight, ShieldAlert, CheckCircle2, Pill, Activity, Stethoscope, Calendar, Mic } from 'lucide-react';

interface SidebarProps {
  member: FamilyMember;
  reqConfidence?: number;
  anomalyAlerts: AnomalyAlert[];
  onOpenRequirementDialog?: () => void;
  onOpenAiConsultant: () => void;
  onAskQuickAi: (question: string) => void;
  onSelectAnomaly: (alert: AnomalyAlert) => void;
  onOpenDoctorGlance?: () => void;
  onNavigateToMilestones?: () => void;
  onOpenVoiceMemo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  member,
  anomalyAlerts,
  onOpenAiConsultant,
  onAskQuickAi,
  onSelectAnomaly,
  onOpenDoctorGlance,
  onNavigateToMilestones,
  onOpenVoiceMemo
}) => {
  const quickQuestions = [
    { label: '甘油三酯偏高如何通过生活干预改善？', text: '体检甘油三酯轻度偏高，通过饮食结构和有氧运动通常需要多久能明显改善？' },
    { label: 'TSH一过性升高需要服药吗？', text: '促甲状腺激素 (TSH) 轻度升高后已回落，抗体阴性，需要服药还是定期复查？' },
    { label: '轻度脂肪肝日常饮食禁忌？', text: '体检发现轻度脂肪浸润，日常饮食中哪些属于需要规避的隐形高脂高糖食物？' },
    { label: '维生素D偏低日常如何安全补充？', text: '血液中25-羟基维生素D偏低不足，日常应如何科学补充并安全维持？' }
  ];

  return (
    <aside className="p-6 lg:p-8 bg-[#f8f8f6] border-l border-[#1a1a1c]/10 flex flex-col gap-6 text-[#1a1a1c]">
      {/* Member Data Section */}
      <div>
        <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 mb-1">
          Member Data · 档案信息
        </div>
        <h2 className="font-editorial-serif text-3xl font-medium tracking-tight text-[#1a1a1c]">
          {member.name}
        </h2>
        <p className="font-editorial-mono text-xs text-[#1a1a1c]/60 mt-1">
          {member.age}岁 / {member.gender === 'female' ? '女性' : '男性'} / {member.relationship} / {member.bloodType ? `血型 ${member.bloodType}` : '健康档案'}
        </p>

        {/* Member tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {member.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium border border-[#1a1a1c]/30 px-2.5 py-0.5 rounded-full bg-white text-[#1a1a1c]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Clinical Quick Access Panel */}
      <div className="p-4 bg-white border border-[#1a1a1c] space-y-2.5 shadow-[3px_3px_0_rgba(26,26,28,0.05)]">
        <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/60 font-bold">
          Quick Access · 门诊与就医助手
        </div>

        {onOpenDoctorGlance && (
          <button
            id="sidebar-doctor-glance-btn"
            onClick={onOpenDoctorGlance}
            className="w-full py-2 px-3 bg-[#5562ff]/10 hover:bg-[#5562ff] text-[#5562ff] hover:text-white border border-[#5562ff]/30 text-xs font-editorial-mono font-bold transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>诊室 2 分钟医生速览</span>
            </div>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </button>
        )}

        {onOpenVoiceMemo && (
          <button
            id="sidebar-voice-memo-btn"
            onClick={onOpenVoiceMemo}
            className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-editorial-mono font-bold transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5" />
              <span>门诊医嘱语音速记</span>
            </div>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </button>
        )}

        {onNavigateToMilestones && (
          <button
            id="sidebar-milestones-btn"
            onClick={onNavigateToMilestones}
            className="w-full py-2 px-3 bg-[#188038]/10 hover:bg-[#188038] text-[#188038] hover:text-white border border-[#188038]/30 text-xs font-editorial-mono font-bold transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>复查提醒与健康日程</span>
            </div>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </button>
        )}
      </div>

      {/* Ask Health AI Panel */}
      <div className="editorial-card p-5 bg-white border border-[#1a1a1c] shadow-[4px_4px_0_rgba(26,26,28,0.06)]">
        <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#5562ff] font-bold mb-2 flex items-center justify-between">
          <span>Ask Health AI</span>
          <span className="w-2 h-2 rounded-full bg-[#5562ff] animate-ping" />
        </div>
        <p className="text-xs text-[#1a1a1c]/70 leading-relaxed mb-3">
          基于全病历上下文，您可以询问关于检查单解读、指标波动、用药或健康规划的任何问题。
        </p>

        {/* Quick Question pills */}
        <div className="space-y-1.5 mb-4">
          {quickQuestions.slice(0, 3).map((q, idx) => (
            <button
              key={idx}
              onClick={() => onAskQuickAi(q.text)}
              className="w-full text-left text-[11px] p-2 rounded border border-[#1a1a1c]/10 hover:border-[#5562ff] hover:bg-[#5562ff]/5 transition-colors line-clamp-1 text-[#1a1a1c]/80 hover:text-[#5562ff]"
            >
              • {q.label}
            </button>
          ))}
        </div>

        <button
          id="sidebar-ask-ai-btn"
          onClick={onOpenAiConsultant}
          className="w-full py-2.5 px-4 rounded-full bg-[#1a1a1c] text-[#fdfdfb] text-xs font-semibold hover:bg-black transition flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
          <span>发起全病历智能咨询</span>
        </button>
      </div>

      {/* Official Security & Clinical Note Box */}
      <div className="border-l-[3px] border-[#188038] pl-3.5 py-2.5 bg-white border-r border-t border-b border-[#1a1a1c]/10 rounded-sm">
        <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#188038] font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-[#188038]" />
          <span>正式版本 · 全病历时序严密比对</span>
        </div>
        <p className="text-xs text-[#1a1a1c]/80 mt-1 leading-normal">
          已启用跨时序动态预警标准与云端端到端双向加密同步。
        </p>
      </div>

      {/* Recent Anomaly Highlights */}
      {anomalyAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 flex items-center justify-between">
            <span>Critical Anomaly Tracker</span>
            <span className="text-[#d93025] font-bold">{anomalyAlerts.length} 异常项</span>
          </div>

          <div className="space-y-2">
            {anomalyAlerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                onClick={() => onSelectAnomaly(alert)}
                className="p-3 bg-[#fffafa] border border-[#d93025]/40 rounded-sm cursor-pointer hover:border-[#d93025] transition"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#d93025] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{alert.title}</span>
                  </span>
                  <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/50">
                    {alert.date}
                  </span>
                </div>
                <p className="text-[11px] text-[#1a1a1c]/70 line-clamp-2">
                  {alert.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
