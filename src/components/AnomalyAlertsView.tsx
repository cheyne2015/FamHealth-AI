import React from 'react';
import { AnomalyAlert } from '../types';
import { AlertTriangle, AlertCircle, ShieldAlert, Sparkles, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface AnomalyAlertsViewProps {
  alerts: AnomalyAlert[];
  onAskAIAboutAlert: (alert: AnomalyAlert) => void;
  onNavigateToTrend: (indicatorKey: string) => void;
}

export const AnomalyAlertsView: React.FC<AnomalyAlertsViewProps> = ({
  alerts,
  onAskAIAboutAlert,
  onNavigateToTrend
}) => {
  return (
    <div className="space-y-6 text-[#1a1a1c]">
      {/* Overview Banner */}
      <div className="bg-white border border-[#1a1a1c] p-6 shadow-[4px_4px_0_rgba(26,26,28,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-none bg-[#fffafa] border border-[#d93025] flex items-center justify-center text-[#d93025] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#d93025] font-bold">
                CLINICAL ANOMALY ENGINE · 异常对比预警引擎
              </div>
              <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c] mt-0.5">
                跨时序报告相同指标对比分析
              </h3>
              <p className="text-xs text-[#1a1a1c]/70 mt-1 leading-relaxed">
                系统通过自动对比不同日期上传的化验单，检测到 <strong className="text-[#d93025]">{alerts.length}项</strong> 异常波动与持续偏异。已为您整理临床医学参考意义与就医随访行动指导。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 gap-6">
        {alerts.map((alert) => {
          const isHigh = alert.severity === 'high';
          return (
            <div
              key={alert.id}
              className={`p-6 border transition relative ${
                isHigh
                  ? 'bg-[#fffafa] border-[#d93025] shadow-[6px_6px_0_rgba(217,48,37,0.08)]'
                  : 'bg-white border-[#1a1a1c] shadow-[6px_6px_0_rgba(26,26,28,0.06)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1a1a1c]/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      isHigh
                        ? 'border-[#d93025] text-[#d93025] bg-white'
                        : 'border-[#1a1a1c] text-[#1a1a1c] bg-white'
                    }`}
                  >
                    {isHigh ? '🚨 高风险预警' : '⚠️ 重点关注异常'}
                  </span>
                  <span className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c]">
                    {alert.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-editorial-mono text-[11px] text-[#1a1a1c]/50">
                  <Clock className="w-3.5 h-3.5" />
                  <span>最新比对: {alert.date}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5">
                <p className="text-xs text-[#1a1a1c]/80 leading-relaxed font-medium">
                  {alert.description}
                </p>
              </div>

              {/* Historical trajectory chips */}
              <div className="mt-3.5 bg-[#fdfdfb] p-3 border border-[#1a1a1c]/15">
                <span className="font-editorial-mono text-[10px] uppercase text-[#1a1a1c]/50 font-bold block mb-2">
                  历史对比轨迹：
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {alert.historicalPoints.map((hp, idx) => (
                    <React.Fragment key={idx}>
                      <div className="bg-white px-2.5 py-1 border border-[#1a1a1c]/20 text-xs flex items-center gap-1.5">
                        <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/50">{hp.date}:</span>
                        <span className="font-editorial-mono font-bold text-[#1a1a1c]">{hp.value}</span>
                      </div>
                      {idx < alert.historicalPoints.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-[#1a1a1c]/30" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Clinical mechanism & Action advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5">
                <div className="bg-[#fdfdfb] p-3.5 border border-[#1a1a1c]/15 text-xs text-[#1a1a1c]">
                  <strong className="text-[#1a1a1c] block mb-1 font-editorial-mono text-[11px] uppercase">
                    🔬 临床病理机制分析：
                  </strong>
                  <p className="leading-relaxed text-[11px] sm:text-xs text-[#1a1a1c]/80">
                    {alert.clinicalSignificance}
                  </p>
                </div>

                <div className="bg-[#f8fcf9] p-3.5 border border-[#188038]/40 text-xs text-[#1a1a1c]">
                  <strong className="text-[#188038] block mb-1 font-editorial-mono text-[11px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>🎯 推荐应对与行动方案：</span>
                  </strong>
                  <p className="leading-relaxed text-[11px] sm:text-xs text-[#1a1a1c]/80">
                    {alert.actionAdvice}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-3 border-t border-[#1a1a1c]/10">
                <button
                  id={`view-trend-alert-${alert.id}`}
                  onClick={() => onNavigateToTrend(alert.indicatorKey)}
                  className="font-editorial-mono text-xs text-[#5562ff] hover:text-[#4350ea] hover:scale-105 active:scale-95 transition-all duration-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>查看该指标历史对比曲线</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`ask-ai-alert-${alert.id}`}
                  onClick={() => onAskAIAboutAlert(alert)}
                  className="px-4 py-1.5 min-h-[34px] rounded-full border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span>针对此异常问 AI</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

