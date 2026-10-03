import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MedicalReport, IndicatorItem } from '../types';
import { indicatorTrendConfigs } from '../data/mockHealthData';
import { 
  canonicalizeIndicatorKey, 
  getIndicatorDisplayName, 
  parseIndicatorNumericValue 
} from '../utils/indicatorUtils';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  HelpCircle,
  Eye,
  ExternalLink,
  FileText,
  ArrowRight
} from 'lucide-react';
import { ReportDetailModal } from './ReportDetailModal';

interface IndicatorComparisonViewProps {
  reports: MedicalReport[];
  memberName?: string;
  initialSelectedKey?: string;
  onSelectKey?: (key: string) => void;
  onNavigateToReport?: (reportId: string) => void;
  onAskAIAboutReport?: (report: MedicalReport) => void;
  onAskAIAboutIndicator: (indicatorName: string, historySummary: string) => void;
}

interface IndicatorTrendConfig {
  name?: string;
  unit?: string;
  minVal?: number;
  maxVal?: number;
  standardMin?: number;
  standardMax?: number;
  safeMin?: number;
  safeMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  description?: string;
}

export const IndicatorComparisonView: React.FC<IndicatorComparisonViewProps> = ({
  reports,
  memberName,
  initialSelectedKey,
  onSelectKey,
  onNavigateToReport,
  onAskAIAboutReport,
  onAskAIAboutIndicator
}) => {
  const [selectedReportForModal, setSelectedReportForModal] = useState<MedicalReport | null>(null);

  const handleJumpToReport = (report: MedicalReport) => {
    if (onNavigateToReport) {
      onNavigateToReport(report.id);
    } else {
      setSelectedReportForModal(report);
    }
  };

  // Collect all unique canonical indicator keys across reports (memoized)
  const availableKeys: string[] = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .flatMap((r) => r.indicators.map((i) => canonicalizeIndicatorKey(i.standardKey, i.name)))
          .filter((k): k is string => Boolean(k))
      )
    );
  }, [reports]);

  // Categorize keys into matched multi-period indicators (can form continuous trend line charts) vs single-report indicators
  const multiReportKeys = useMemo(() => {
    return availableKeys.filter((key) => {
      const count = reports.filter((r) =>
        r.indicators.some((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === key)
      ).length;
      return count >= 2;
    });
  }, [availableKeys, reports]);

  // Abnormal multi-period keys (e.g. indicators with multiple abnormal tests)
  const abnormalMultiKeys = useMemo(() => {
    return multiReportKeys.filter((key) => {
      return reports.some((r) => {
        const ind = r.indicators.find((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === key);
        if (!ind) return false;
        return ind.status === 'warning' || ind.status === 'critical' || String(ind.value).includes('↑') || String(ind.value).includes('↓');
      });
    });
  }, [multiReportKeys, reports]);

  const singleReportKeys = useMemo(() => {
    return availableKeys.filter((key) => !multiReportKeys.includes(key));
  }, [availableKeys, multiReportKeys]);

  const defaultKey = useMemo(() => {
    const normalizedInitial = initialSelectedKey 
      ? canonicalizeIndicatorKey(initialSelectedKey, initialSelectedKey)
      : undefined;

    return normalizedInitial && availableKeys.includes(normalizedInitial)
      ? normalizedInitial
      : abnormalMultiKeys[0] ||
        (availableKeys.includes('TG')
          ? 'TG'
          : availableKeys.includes('TSH')
          ? 'TSH'
          : multiReportKeys[0] || availableKeys[0] || 'TG');
  }, [initialSelectedKey, availableKeys, abnormalMultiKeys, multiReportKeys]);

  const [selectedKey, setSelectedKey] = useState<string>(() => defaultKey);
  const lastSyncedKeyRef = useRef<string | undefined>(initialSelectedKey);

  // Synchronize ONLY when initialSelectedKey genuinely changes externally
  useEffect(() => {
    if (initialSelectedKey && initialSelectedKey !== lastSyncedKeyRef.current) {
      lastSyncedKeyRef.current = initialSelectedKey;
      const canonical = canonicalizeIndicatorKey(initialSelectedKey, initialSelectedKey);
      if (canonical && availableKeys.includes(canonical)) {
        setSelectedKey(canonical);
      }
    }
  }, [initialSelectedKey]);

  const handleSelectKey = (key: string) => {
    lastSyncedKeyRef.current = key;
    setSelectedKey(key);
    if (onSelectKey) {
      onSelectKey(key);
    }
  };

  const currentConfig: IndicatorTrendConfig = indicatorTrendConfigs[selectedKey] || {
    name: getIndicatorDisplayName(selectedKey),
    unit: '',
    minVal: 0,
    maxVal: 100,
    description: '跨时序临床指标自动比对分析'
  };

  // Extract ALL historical points for the selected key (both numeric and qualitative)
  const allPoints = useMemo(() => {
    return reports
      .map((report) => {
        const ind = report.indicators.find(
          (i) => canonicalizeIndicatorKey(i.standardKey, i.name) === selectedKey
        );
        if (!ind) return null;

        const numVal = ind.numericValue ?? parseIndicatorNumericValue(ind.value);
        let status = ind.status;
        const valStr = String(ind.value);
        if (valStr.includes('↑') || valStr.includes('偏高') || valStr.includes('超标')) {
          if (status === 'normal') status = 'warning';
        }
        if (selectedKey === 'PRL' && numVal !== undefined && numVal > 30.7) {
          status = numVal > 50 ? 'critical' : 'warning';
        }

        return {
          reportId: report.id,
          report,
          date: report.date,
          reportTitle: report.title,
          hospital: report.hospital,
          value: numVal,
          displayValue: ind.value,
          unit: ind.unit || currentConfig.unit,
          status,
          clinicalNote: ind.clinicalNote,
          referenceRange: ind.referenceRange,
          gestationalAge: report.gestationalAge
        };
      })
      .filter((pt): pt is NonNullable<typeof pt> => pt !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports, selectedKey, currentConfig.unit]);

  // Numeric points specifically for drawing continuous line chart
  const historyPoints = useMemo(() => {
    return allPoints.filter(
      (pt): pt is typeof pt & { value: number } => typeof pt.value === 'number' && !isNaN(pt.value)
    );
  }, [allPoints]);

  // Calculate comparisons step by step
  const comparisonRows = historyPoints.map((curr, idx) => {
    if (idx === 0) {
      return {
        ...curr,
        diffAbs: 0,
        diffPct: 0,
        trend: 'first' as const,
        isAnomaly: false
      };
    }
    const prev = historyPoints[idx - 1];
    const diff = curr.value - prev.value;
    const pct = prev.value !== 0 ? (diff / prev.value) * 100 : 0;
    const trend = diff > 0.001 ? 'up' : diff < -0.001 ? 'down' : 'stable';
    
    // Check if anomaly
    const isAnomaly = curr.status === 'critical' || curr.status === 'warning' || Math.abs(pct) > 50;
    return {
      ...curr,
      diffAbs: diff,
      diffPct: pct,
      trend,
      isAnomaly,
      prevDate: prev.date,
      prevVal: prev.value
    };
  });

  // Calculate sensible YAxis domain that encompasses both data points and clinical reference lines
  const vals = historyPoints.map((p) => p.value);
  const refVals = [
    currentConfig.safeMax,
    currentConfig.safeMin,
    currentConfig.optimalMax,
    currentConfig.optimalMin
  ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const allNumbers = [...vals, ...refVals];
  const minNum = allNumbers.length > 0 ? Math.min(...allNumbers) : 0;
  const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : 100;
  const span = Math.max(1, maxNum - minNum);
  const yDomain: [number, number] = [
    Math.max(0, Math.floor((minNum - span * 0.15) * 10) / 10),
    Math.ceil((maxNum + span * 0.15) * 10) / 10
  ];

  const latestPoint = historyPoints[historyPoints.length - 1];
  const firstPoint = historyPoints[0];

  const handleAskAI = () => {
    const pointsToSummarize = historyPoints.length > 0 ? historyPoints : allPoints;
    const summary = pointsToSummarize
      .map((p) => `${p.date}: ${p.displayValue} ${p.unit} (${p.status === 'critical' ? '严重异常' : p.status === 'warning' ? '偏异' : '正常'})`)
      .join('; ');
    onAskAIAboutIndicator(currentConfig.name, summary);
  };

  return (
    <div className="space-y-6 text-[#1a1a1c]">
      {/* Indicator Selectors Pill Bar */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a1a1c]/10 pb-3">
          <div>
            <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold block">
              选择需要对比监测的指标 [INDICATOR SELECTOR]
            </span>
            <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mt-0.5 block">
              自动识别并跨期匹配不同化验单上的同类指标，已匹配项目可直接绘制连续走势折线图
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-editorial-mono bg-[#5562ff]/10 text-[#5562ff] font-bold border border-[#5562ff]/30 rounded">
              已匹配 {multiReportKeys.length} 项跨期走势
            </span>
          </div>
        </div>

        {/* Section 1: Multi-Report Matched Indicators (Can draw line chart) */}
        {multiReportKeys.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#188038] animate-pulse" />
              <span className="font-editorial-mono text-[11px] font-bold text-[#188038] uppercase">
                📈 已匹配跨期对比（已自动绘制连续走势折线图）：
              </span>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="已匹配跨期对比指标列表">
              {/* Prioritize abnormal multi-report keys first */}
              {[...multiReportKeys].sort((a, b) => {
                const aAbnormal = abnormalMultiKeys.includes(a);
                const bAbnormal = abnormalMultiKeys.includes(b);
                if (aAbnormal && !bAbnormal) return -1;
                if (!aAbnormal && bAbnormal) return 1;
                return 0;
              }).map((key) => {
                const cfg = indicatorTrendConfigs[key];
                const name = getIndicatorDisplayName(key, cfg?.name);
                const isSelected = key === selectedKey;

                const keyPoints = reports
                  .map((r) => r.indicators.find((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === key))
                  .filter(Boolean);
                const hasAnomaly = keyPoints.some(
                  (i) => i?.status === 'warning' || i?.status === 'critical' || String(i?.value).includes('↑') || String(i?.value).includes('↓')
                );

                return (
                  <button
                    type="button"
                    key={key}
                    id={`select-indicator-btn-${key}`}
                    onClick={() => handleSelectKey(key)}
                    title={`点击切换查看【${name}】的跨期趋势对比与连续折线图`}
                    className={`px-3.5 py-1.5 min-h-[34px] rounded-full text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#5562ff] ${
                      isSelected
                        ? 'bg-[#5562ff] text-white shadow-xs ring-2 ring-[#5562ff]/30 font-bold'
                        : hasAnomaly
                        ? 'bg-rose-50/90 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-2xs font-bold'
                        : 'bg-[#f8fafc] text-[#334155] dark:bg-slate-900/80 dark:text-slate-200 hover:text-slate-900 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 border border-[#475569] dark:border-slate-600 shadow-2xs'
                    }`}
                  >
                    <span className="pointer-events-none">{name}</span>
                    <span className={`pointer-events-none text-[10px] px-1.5 py-0.2 rounded-full font-editorial-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#5562ff]/10 text-[#5562ff]'
                    }`}>
                      {keyPoints.length}次测定
                    </span>
                    {hasAnomaly && (
                      <span className="pointer-events-none text-[10px] px-1.5 py-0.2 rounded-full font-editorial-mono font-bold bg-[#d93025] text-white">
                        持续异常
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Single-Report Indicators */}
        {singleReportKeys.length > 0 && (
          <div className="pt-2 border-t border-[#1a1a1c]/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/50">
                📄 单次检验项目（待后续复查自动串联走势）：
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="单次检验指标列表">
              {singleReportKeys.map((key) => {
                const cfg = indicatorTrendConfigs[key];
                const name = getIndicatorDisplayName(key, cfg?.name);
                const isSelected = key === selectedKey;

                return (
                  <button
                    type="button"
                    key={key}
                    id={`select-indicator-btn-${key}`}
                    onClick={() => handleSelectKey(key)}
                    title={`点击查看【${name}】的检查记录与临床解读`}
                    className={`px-2.5 py-1 text-xs rounded-full hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer font-editorial-mono select-none focus:outline-none focus:ring-2 focus:ring-[#5562ff] ${
                      isSelected
                        ? 'bg-[#5562ff] text-white font-bold ring-2 ring-[#5562ff]/30 shadow-xs'
                        : 'bg-[#f8fafc] text-[#334155] dark:bg-slate-900/80 dark:text-slate-200 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 hover:text-slate-900 border border-[#475569] dark:border-slate-600 shadow-2xs'
                    }`}
                  >
                    <span className="pointer-events-none">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Card */}
      {allPoints.length === 0 ? (
        <div className="bg-white border border-dashed border-[#1a1a1c]/30 p-12 text-center text-[#1a1a1c]/50">
          <Info className="w-8 h-8 mx-auto text-[#1a1a1c]/30 mb-2" />
          <p className="text-sm font-semibold">该家庭成员暂无此项指标的历史数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Chart & Key Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1a1a1c]/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c]">
                      {currentConfig.name}
                    </h3>
                    {currentConfig.unit && (
                      <span className="font-editorial-mono text-xs px-2 py-0.5 rounded border border-[#1a1a1c]/20 bg-[#fdfdfb] text-[#1a1a1c]/70">
                        单位: {currentConfig.unit}
                      </span>
                    )}
                    {allPoints.length >= 2 && (
                      <span className="font-editorial-mono text-[11px] px-2 py-0.5 bg-[#188038]/10 text-[#188038] font-bold border border-[#188038]/30 rounded">
                        ✓ 已匹配 {allPoints.length} 次测定
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1a1a1c]/65 mt-1 leading-relaxed">{currentConfig.description}</p>
                </div>

                <button
                  id="ask-ai-indicator-analysis-btn"
                  onClick={handleAskAI}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span>AI 解析指标波动</span>
                </button>
              </div>

              {/* Matched Trajectory Announcement Banner */}
              {historyPoints.length >= 2 && (
                <div className="mt-4 p-3 bg-[#f0f4ff] border border-[#5562ff]/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-editorial-mono font-bold text-[#5562ff] text-[11px]">
                      📈 跨报告折线走势图已生成：
                    </span>
                    <span className="text-[#1a1a1c]/80 flex items-center gap-1.5 flex-wrap">
                      已自动串联
                      {historyPoints.map((p, idx) => (
                        <React.Fragment key={p.reportId || idx}>
                          <button
                            type="button"
                            onClick={() => handleJumpToReport(p.report)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-white border border-[#5562ff]/40 text-[#5562ff] hover:bg-[#5562ff] hover:text-white transition font-editorial-mono font-bold cursor-pointer text-[11px] shadow-2xs group"
                            title={`点击跳转查看《${p.reportTitle}》`}
                          >
                            <span>{p.date}</span>
                            <span>({p.displayValue} {p.unit})</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                          </button>
                          {idx < historyPoints.length - 1 && <span className="text-[#1a1a1c]/40 font-bold">➔</span>}
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                  <div className="font-editorial-mono text-[11px] text-[#5562ff] font-bold">
                    最新变动: {comparisonRows[comparisonRows.length - 1]?.diffAbs > 0 ? '+' : ''}{comparisonRows[comparisonRows.length - 1]?.diffAbs.toFixed(2)} {currentConfig.unit}
                    ({comparisonRows[comparisonRows.length - 1]?.diffPct > 0 ? '+' : ''}{comparisonRows[comparisonRows.length - 1]?.diffPct.toFixed(1)}%)
                  </div>
                </div>
              )}

              {/* Anomaly notice banner if indicator has warning/critical values */}
              {historyPoints.some(p => p.status === 'warning' || p.status === 'critical') && (
                <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-500 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 font-editorial-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>指标偏离参考范围警示</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#1a1a1c]/80 leading-relaxed">
                    该指标在 {historyPoints.filter(p => p.status === 'warning' || p.status === 'critical').length} 次化验中偏离正常参考基线，请结合临床医嘱严密随访，保持规律健康生活作息。
                  </p>
                </div>
              )}

              {/* Chart or Qualitative Explanatory Box */}
              {historyPoints.length >= 2 ? (
                <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                    <LineChart data={historyPoints} margin={{ top: 15, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" strokeOpacity={0.08} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#1a1a1c" 
                        tick={{ fill: '#1a1a1c', fontSize: 11, fontFamily: 'Space Mono' }}
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#1a1a1c" 
                        tick={{ fill: '#1a1a1c', fontSize: 11, fontFamily: 'Space Mono' }}
                        domain={yDomain}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#1a1a1c',
                          borderWidth: '1px',
                          boxShadow: '4px 4px 0 rgba(26,26,28,0.1)',
                          color: '#1a1a1c',
                          fontSize: '12px',
                          borderRadius: '0px'
                        }}
                        formatter={(val: any) => [`${val} ${currentConfig.unit}`, currentConfig.name]}
                        labelFormatter={(label) => `检测日期: ${label}`}
                      />

                      {/* Reference Lines if configured */}
                      {currentConfig.optimalMax && (
                        <ReferenceLine
                          y={currentConfig.optimalMax}
                          stroke="#188038"
                          strokeDasharray="4 4"
                          label={{
                            value: `推荐理想上限 (${currentConfig.optimalMax})`,
                            fill: '#188038',
                            fontSize: 10,
                            position: 'top',
                            fontFamily: 'Space Mono'
                          }}
                        />
                      )}
                      {currentConfig.safeMax && (
                        <ReferenceLine
                          y={currentConfig.safeMax}
                          stroke="#d93025"
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                          label={{
                            value: `常规参考上限 (${currentConfig.safeMax})`,
                            fill: '#d93025',
                            fontSize: 10,
                            position: 'insideBottomRight',
                            fontFamily: 'Space Mono'
                          }}
                        />
                      )}

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#1a1a1c"
                        strokeWidth={2.5}
                        dot={{ r: 6, fill: '#5562ff', strokeWidth: 2, stroke: '#1a1a1c' }}
                        activeDot={{ r: 8, fill: '#1a1a1c', stroke: '#5562ff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : historyPoints.length === 1 ? (
                <div className="mt-5 p-5 bg-[#f8f8f6] border border-[#1a1a1c]/20 rounded-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1a1a1c]/10">
                    <span className="font-editorial-mono text-xs font-bold text-zinc-700 bg-zinc-200/80 px-2 py-0.5 rounded">
                      单次检验记录 · 健康基线
                    </span>
                    <span className="text-xs text-zinc-500 font-editorial-mono">
                      需至少 2 次化验数据方可生成时序折线走势图
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2.5 my-2">
                    <span className="text-xl font-bold font-editorial-mono text-[#1a1a1c]">
                      {historyPoints[0].displayValue}
                    </span>
                    <span className="text-xs font-editorial-mono text-zinc-600">
                      {currentConfig.unit}
                    </span>
                    <span className="text-xs font-editorial-mono text-zinc-500">
                      (检测日期: {historyPoints[0].date})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    当前档案中该项目仅归档了 1 次检测记录。系统已将其建立为您的个人健康基准，后续上传复查报告或录入同类化验单后，系统将自动比对前后变化并绘制连续波动曲线。
                  </p>
                </div>
              ) : (
                <div className="mt-5 p-6 bg-[#f8f8f6] border border-[#1a1a1c]/20 text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#5562ff]/10 text-[#5562ff] mb-2">
                    <Info className="w-5 h-5" />
                  </div>
                  <h4 className="font-editorial-serif text-base font-bold text-[#1a1a1c]">
                    该项目为临床定性/描述性检查项目
                  </h4>
                  <p className="mt-1 text-xs text-[#1a1a1c]/70 max-w-md mx-auto">
                    无需绘制连续数值曲线，系统已为您自动跨期串联历史检查记录（见下方明细表），并可点击上方“AI 解析”进行深度临床推演。
                  </p>
                </div>
              )}

              {/* Chart Legend */}
              {historyPoints.length >= 2 && (
                <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-[#1a1a1c]/60 pt-3 border-t border-[#1a1a1c]/10">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5562ff] border border-[#1a1a1c]" />
                      <span className="font-editorial-mono text-[11px]">历史检测值</span>
                    </span>
                    {currentConfig.optimalMax && (
                      <span className="flex items-center gap-1.5 text-[#188038]">
                        <span className="w-3 h-0.5 bg-[#188038]" />
                        <span className="font-editorial-mono text-[11px]">推荐目标 (&lt; {currentConfig.optimalMax})</span>
                      </span>
                    )}
                    {currentConfig.safeMax && (
                      <span className="flex items-center gap-1.5 text-[#d93025]">
                        <span className="w-3 h-0.5 bg-[#d93025]" />
                        <span className="font-editorial-mono text-[11px]">警戒线 ({currentConfig.safeMax})</span>
                      </span>
                    )}
                  </div>
                  <span className="font-editorial-mono text-[11px]">共比对 {historyPoints.length} 次检查</span>
                </div>
              )}
            </div>

            {/* Historical Comparison Table */}
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)]">
              <div className="mb-3">
                <h4 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#5562ff]" />
                  <span>相同指标逐次对比明细表</span>
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a1a1c] text-[#1a1a1c] font-editorial-mono text-xs bg-[#f8f8f6]">
                      <th className="p-2.5 whitespace-nowrap font-bold">检查时间</th>
                      <th className="p-2.5 min-w-[160px] font-bold">所属化验报告</th>
                      <th className="p-2.5 whitespace-nowrap font-bold">检测数值 / 结果</th>
                      <th className="p-2.5 whitespace-nowrap font-bold">较上一次变化</th>
                      <th className="p-2.5 whitespace-nowrap font-bold">变化率 (%)</th>
                      <th className="p-2.5 min-w-[220px] font-bold">状态评估与临床参考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1c]/15">
                    {(comparisonRows.length > 0 ? comparisonRows : allPoints).map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        onClick={() => handleJumpToReport(row.report)}
                        className="hover:bg-zinc-50/90 transition cursor-pointer group active:scale-[0.998]"
                        title={row.reportTitle}
                      >
                        <td className="p-2.5 font-editorial-mono font-bold text-xs text-[#1a1a1c] whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs sm:text-sm text-[#1a1a1c] group-hover:text-blue-700 transition flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-700 shrink-0" />
                              <span className="line-clamp-1 underline decoration-dotted decoration-zinc-400 group-hover:decoration-blue-700">
                                {row.reportTitle}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-700 opacity-60 group-hover:opacity-100 transition shrink-0" />
                            </span>
                            <span className="text-[11px] text-zinc-500 mt-0.5">{row.hospital}</span>
                          </div>
                        </td>
                        <td className={`p-2.5 font-editorial-mono font-bold text-sm tracking-tight whitespace-nowrap ${
                          row.status === 'critical' || row.status === 'warning' ? 'text-[#c5221f]' : 'text-[#1a1a1c]'
                        }`}>
                          {row.displayValue} <span className="text-xs font-normal text-zinc-500">{row.unit}</span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {'trend' in row && row.trend !== 'first' ? (
                            <span
                              className={`flex items-center gap-1 font-editorial-mono font-bold text-xs ${
                                row.trend === 'up'
                                  ? 'text-[#c5221f]'
                                  : row.trend === 'down'
                                  ? 'text-blue-600'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {row.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                              {row.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                              {row.trend === 'stable' && <Minus className="w-3.5 h-3.5" />}
                              <span>{row.diffAbs > 0 ? `+${row.diffAbs.toFixed(2)}` : row.diffAbs.toFixed(2)} {row.unit}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-editorial-mono text-xs">
                              {rIdx === 0 ? '基准初值' : '定性记录'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-editorial-mono whitespace-nowrap">
                          {'diffPct' in row && row.diffPct !== undefined && 'trend' in row && row.trend !== 'first' ? (
                            <span className={`font-bold text-xs ${Math.abs(row.diffPct) > 30 ? 'text-[#c5221f]' : 'text-zinc-800'}`}>
                              {row.diffPct > 0 ? `+${row.diffPct.toFixed(1)}%` : `${row.diffPct.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2.5 min-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${
                                  row.status === 'critical' || row.status === 'warning'
                                    ? 'bg-red-50 text-[#c5221f] border-red-200'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                }`}
                              >
                                {(row.status === 'critical' || row.status === 'warning') && <AlertTriangle className="w-3 h-3 shrink-0" />}
                                <span>{row.status === 'critical' ? '严重异常 ↑' : row.status === 'warning' ? '需关注 / 偏高 ↑' : '正常'}</span>
                              </span>

                              {row.referenceRange && (
                                <span className="font-editorial-mono text-xs text-zinc-500">
                                  (参考: {row.referenceRange})
                                </span>
                              )}
                            </div>

                            {row.clinicalNote ? (
                              <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                                {row.clinicalNote}
                              </p>
                            ) : (
                              <span className="text-xs text-zinc-400 font-editorial-mono">
                                临床指标定期记录存档
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: AI Clinical Insights & Guidance */}
          <div className="space-y-6">
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)] space-y-4">
              <div className="flex items-center gap-2 text-[#1a1a1c] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#5562ff]" />
                <span className="font-editorial-serif text-lg">AI 临床异常变化对比洞察</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className={`p-3 border ${
                  latestPoint?.status === 'critical'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : latestPoint?.status === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}>
                  <strong className="block mb-1 font-bold">
                    最新检测状态 ({latestPoint?.date || '近期'})：
                  </strong>
                  <span>
                    最新测定值为 <strong>{latestPoint?.displayValue} {currentConfig.unit}</strong>
                    {latestPoint?.status === 'critical' && '（处于显著异常警示范围，建议遵医嘱专科随访）'}
                    {latestPoint?.status === 'warning' && '（轻度偏离常规标准范围，建议结合生活方式持续监测）'}
                    {latestPoint?.status === 'normal' && '（处于正常标准参考区间内，指标平稳）'}
                    。
                  </span>
                </div>

                {historyPoints.length >= 2 && (() => {
                  const first = historyPoints[0];
                  const latest = historyPoints[historyPoints.length - 1];
                  const netDiff = Math.round((latest.value - first.value) * 1000) / 1000;
                  const isImproved = (first.status === 'warning' || first.status === 'critical') && latest.status === 'normal';
                  return (
                    <div className="bg-[#f0f4ff] border border-[#5562ff]/30 p-3">
                      <strong className="text-[#5562ff] block mb-1 font-bold">
                        跨期趋势轨迹分析 ({historyPoints.length} 次测定)：
                      </strong>
                      <span>
                        基线由 {first.date} 的 {first.displayValue} {currentConfig.unit} 演变至 {latest.date} 的 {latest.displayValue} {currentConfig.unit}，
                        净变动量为 <strong>{netDiff > 0 ? `+${netDiff}` : netDiff} {currentConfig.unit}</strong>。
                        {isImproved ? ' 整体呈现良好转归趋势，生活干预或临床管理成效显著。' : ' 建议结合临床医生建议，保持长期规律跟踪。'}
                      </span>
                    </div>
                  );
                })()}

                <div className="bg-[#fdfdfb] p-3 border border-[#1a1a1c]/20 text-[#1a1a1c]/80">
                  <strong className="text-[#1a1a1c] block mb-1">医学监测参考意义：</strong>
                  <span>{currentConfig.description || '定期监测同类指标跨期连续走势，能够有效评估健康干预效果并早期发现潜在代谢风险。'}</span>
                </div>
              </div>

              <button
                id="deep-dive-btn"
                onClick={handleAskAI}
                className="w-full py-2.5 px-4 min-h-[38px] rounded-full bg-[#1a1a1c] text-[#fdfdfb] font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5 hover:bg-black cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>就此指标深度向 AI 提问</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lab Sheet Detail Modal */}
      <ReportDetailModal
        report={selectedReportForModal}
        memberName={memberName || ''}
        allReports={reports}
        onClose={() => setSelectedReportForModal(null)}
        onAskAI={onAskAIAboutReport}
        onSelectIndicatorForTrend={(indKey) => {
          setSelectedReportForModal(null);
          handleSelectKey(canonicalizeIndicatorKey(indKey, indKey));
        }}
      />
    </div>
  );
};
