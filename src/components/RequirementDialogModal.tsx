import React from 'react';
import { X, CheckCircle2, ShieldCheck, Sparkles, Activity, FileText, Brain, HeartHandshake } from 'lucide-react';

interface RequirementDialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnswerQuestion?: (answer: string) => void;
}

export const RequirementDialogModal: React.FC<RequirementDialogModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1c] bg-[#fdfdfb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#1a1a1c] bg-[#188038] text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#188038] font-bold block">
                REQUIREMENTS SPECIFICATION · 需求规范已全面达成 (100% CONFIDENCE)
              </span>
              <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c]">
                家庭健康管理系统 · 实施架构与规则规范
              </h3>
            </div>
          </div>
          <button
            id="close-req-modal-btn"
            onClick={onClose}
            className="text-[#1a1a1c]/50 hover:text-[#1a1a1c] p-1 border border-transparent hover:border-[#1a1a1c] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidence Meter 100% */}
        <div className="p-5 bg-[#f8f8f6] border-b border-[#1a1a1c]/15">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-editorial-mono font-bold text-[#1a1a1c] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#188038]" />
              <span>需求理解与系统规则置信度：</span>
              <strong className="text-[#188038] text-sm">100% 达成</strong>
            </span>
            <span className="font-editorial-mono text-[#188038] font-bold">✓ 生产级规范已全量落地</span>
          </div>
          <div className="w-full bg-[#1a1a1c]/10 h-2 overflow-hidden">
            <div
              className="bg-[#188038] h-full transition-all duration-500 w-full"
            />
          </div>
          <p className="font-editorial-mono text-[11px] text-[#1a1a1c]/70 mt-2">
            系统已依据您的意图与推荐规范完整就绪：多成员时序病历归档、生命周期动态临床阈值预警、临床级多报告交叉推理 AI 医生及门诊就诊备忘卡已全部激活。
          </p>
        </div>

        {/* Blueprint Modules Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
          {/* Module 1 */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fdfdfb]">
            <div className="flex items-center gap-2 text-[#1a1a1c] font-bold font-editorial-mono mb-1.5">
              <FileText className="w-4 h-4 text-[#5562ff]" />
              <span>模块一：多成员时序智能病历时间轴 (Chronological Medical Feed)</span>
            </div>
            <p className="text-[#1a1a1c]/80 leading-relaxed">
              按真实就诊日期逆序编排，支持按血生化、超声影像、常规体检及专项检查分类筛选；提供正反时序切换与检验单原始明细卡片查看，并支持一键将特定报告推送至 AI 进行专科解读。
            </p>
          </div>

          {/* Module 2 */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fdfdfb]">
            <div className="flex items-center gap-2 text-[#1a1a1c] font-bold font-editorial-mono mb-1.5">
              <Activity className="w-4 h-4 text-[#d93025]" />
              <span>模块二：相同指标跨时序对比与【动态临床预警】(Dynamic Clinical Comparison)</span>
            </div>
            <p className="text-[#1a1a1c]/80 leading-relaxed">
              摒弃死板的单次静态参考值，深度结合成员生命周期与时序动态：精准捕捉血脂、肝功能、内分泌指标的连续回落与异常上升；可视化 Recharts 趋势曲线直观呈现短期波动与干预成效。
            </p>
          </div>

          {/* Module 3 */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fdfdfb]">
            <div className="flex items-center gap-2 text-[#1a1a1c] font-bold font-editorial-mono mb-1.5">
              <Brain className="w-4 h-4 text-[#5562ff]" />
              <span>模块三：临床级跨报告交叉推理 AI 顾问 (Multi-Report Clinical AI)</span>
            </div>
            <p className="text-[#1a1a1c]/80 leading-relaxed">
              挂载家庭成员全部检验与病历。提问时自动结合既往健康档案输出：① 临床医学机制推演；② 去医院直接问医生的专属话术；③ 下一步复查随访时间节点表；④ 膳食营养与生活方式干预科学用法。
            </p>
          </div>

          {/* Module 4 */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fdfdfb]">
            <div className="flex items-center gap-2 text-[#1a1a1c] font-bold font-editorial-mono mb-1.5">
              <HeartHandshake className="w-4 h-4 text-[#188038]" />
              <span>模块四：门诊就诊备忘卡片 (Doctor Visit Prep Memo)</span>
            </div>
            <p className="text-[#1a1a1c]/80 leading-relaxed">
              一键提取当前就诊人核心异常动态、病史摘要与医生建议提问，支持一键复制到剪贴板或打印便签，让门诊就医沟通高效无遗漏。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1c] bg-[#f8f8f6] flex items-center justify-between text-xs font-editorial-mono">
          <span className="text-[#1a1a1c]/60">
            全部功能已在当前界面正常运行，可直接探索各视图与操作
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#1a1a1c] text-white hover:bg-black transition font-semibold"
          >
            进入系统体验 Demo
          </button>
        </div>
      </div>
    </div>
  );
};
