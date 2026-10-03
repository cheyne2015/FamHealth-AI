import React from 'react';
import { FamilyMember } from '../types';
import { ArrowRight, Sparkles, AlertTriangle, CheckCircle2, Edit3, Plus, Mic } from 'lucide-react';

interface MemberProfileBarProps {
  member: FamilyMember;
  reportCount: number;
  anomalyCount: number;
  onAskAIAboutMember: () => void;
  onEditMember?: () => void;
  onOpenCreateMember?: () => void;
  onOpenVoiceMemo?: () => void;
}

export const MemberProfileBar: React.FC<MemberProfileBarProps> = ({
  member,
  reportCount,
  anomalyCount,
  onAskAIAboutMember,
  onEditMember,
  onOpenCreateMember,
  onOpenVoiceMemo
}) => {
  return (
    <div className="bg-white dark:bg-[#18181b] border-b-2 border-[#1a1a1c] dark:border-zinc-800 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors shadow-[0_2px_4px_rgba(26,26,28,0.03)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs min-w-0">
        {/* Left Section: Member identity & Key highlighted clinical indicators */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Top Line: Badge + Member Name + Clinical Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-editorial-mono text-[10px] text-[#5562ff] dark:text-[#9aa2ff] uppercase tracking-wider font-bold bg-[#5562ff]/10 dark:bg-[#5562ff]/20 border border-[#5562ff]/30 dark:border-[#5562ff]/40 px-2 py-0.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5562ff] dark:bg-[#9aa2ff] animate-pulse" />
              <span>重点健康画像</span>
            </div>

            <span className="font-editorial-serif text-base font-bold text-[#1a1a1c] dark:text-zinc-100">
              【{member.name}】
            </span>
            <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/60 dark:text-zinc-400">
              {member.age}岁 · {member.relationship} · {member.bloodType || 'A型'}
            </span>

            {/* Edit Member Profile Button */}
            {onEditMember && (
              <button
                id={`edit-member-btn-${member.id}`}
                onClick={onEditMember}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#334155] dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 rounded-full border border-[#475569] dark:border-slate-600 hover:scale-105 active:scale-95 transition-all duration-200 font-editorial-mono shadow-2xs cursor-pointer"
                title="修改该成员的名字、年龄、性别、血型及健康标签"
              >
                <Edit3 className="w-3 h-3 text-[#5562ff] dark:text-[#9aa2ff]" />
                <span>编辑角色</span>
              </button>
            )}

            {/* Subtle unobtrusive Create Member secondary link */}
            {onOpenCreateMember && (
              <button
                id="profile-bar-create-member-btn"
                onClick={onOpenCreateMember}
                className="inline-flex items-center gap-0.5 text-[10px] font-editorial-mono text-[#1a1a1c]/40 dark:text-zinc-500 hover:text-[#5562ff] dark:hover:text-[#9aa2ff] hover:scale-105 active:scale-95 transition-all duration-200 underline ml-1 cursor-pointer"
                title="新建其他家庭成员角色档案"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>添加成员</span>
              </button>
            )}

            {/* Dynamic Member Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {member.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold font-editorial-mono rounded-full bg-[#1a1a1c]/5 dark:bg-zinc-800 text-[#1a1a1c] dark:text-zinc-200 border border-[#1a1a1c]/20 dark:border-zinc-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Line: Detailed clinical summary text */}
          <p className="text-xs text-[#1a1a1c]/80 dark:text-zinc-300 leading-relaxed pl-0.5">
            {member.healthStatusSummary}
          </p>
        </div>

        {/* Right Section: Prominent Anomaly Count & Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 self-stretch xl:self-center pt-2.5 xl:pt-0 border-t xl:border-t-0 border-[#1a1a1c]/10 dark:border-zinc-800 w-full xl:w-auto justify-between xl:justify-end min-w-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 font-editorial-mono text-xs">
            <span className="text-[#1a1a1c]/60 dark:text-zinc-400">
              归档: <strong className="text-[#1a1a1c] dark:text-zinc-100 font-bold">{reportCount}</strong> 份
            </span>
            <span className="text-[#1a1a1c]/30 dark:text-zinc-600">|</span>
            {anomalyCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#d93025] text-white text-xs font-bold shadow-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{anomalyCount} 项指标异常</span>
              </span>
            ) : (
              <span className="text-[#188038] dark:text-emerald-400 font-bold">指标平稳</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            {onOpenVoiceMemo && (
              <button
                id="profile-bar-voice-memo-btn"
                onClick={onOpenVoiceMemo}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 sm:py-1.5 min-h-[36px] rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-200 hover:scale-105 active:scale-95 transition-all duration-200 font-editorial-mono shadow-2xs cursor-pointer"
                title="记录医生口述医嘱与调药要求"
              >
                <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>医嘱速记</span>
              </button>
            )}

            <button
              id="ask-ai-member-btn"
              onClick={onAskAIAboutMember}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 sm:py-1.5 min-h-[36px] rounded-full bg-[#4f46e5] hover:bg-[#4338ca] text-white dark:bg-indigo-950/80 dark:hover:bg-indigo-900/90 dark:text-indigo-200 dark:border dark:border-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 font-editorial-mono shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-indigo-300" />
              <span>AI 深度推演</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/80 dark:text-indigo-300/80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
