import React, { useState } from 'react';
import { MedicalReport, ReportCategory } from '../types';
import { 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  AlertTriangle,
  Search, 
  Sparkles, 
  FileText,
  Clock,
  ArrowRight,
  Eye,
  Download,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { ReportDetailModal } from './ReportDetailModal';
import { saveReportImageLocally } from '../utils/reportImageSaver';
import { canonicalizeIndicatorKey, parseIndicatorNumericValue } from '../utils/indicatorUtils';

interface TimelineViewProps {
  reports: MedicalReport[];
  memberName: string;
  highlightReportId?: string | null;
  onAskAIAboutReport: (report: MedicalReport) => void;
  onSelectIndicatorForTrend: (indicatorKey: string) => void;
  onDeleteReport?: (reportId: string, reportTitle?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  reports,
  memberName,
  highlightReportId,
  onAskAIAboutReport,
  onSelectIndicatorForTrend,
  onDeleteReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({
    [reports[0]?.id || '']: true // expand latest by default
  });
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [detailModalReport, setDetailModalReport] = useState<MedicalReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<{ id: string; title: string } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(highlightReportId || null);
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);

  const centerCategoryButton = (btn: HTMLElement | null) => {
    if (btn && categoryScrollRef.current) {
      const container = categoryScrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const currentScrollLeft = container.scrollLeft;
      // Calculate exact center relative to the container's scroll coordinate system
      const btnCenterInScroll = (btnRect.left - containerRect.left) + currentScrollLeft + (btnRect.width / 2);
      const targetScrollLeft = btnCenterInScroll - (container.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  };

  const handleSelectCategory = (catValue: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedCategory(catValue);
    if (e?.currentTarget) {
      centerCategoryButton(e.currentTarget);
    }
  };

  // Center active category on mount or when selectedCategory changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (categoryScrollRef.current) {
        const activeBtn = categoryScrollRef.current.querySelector<HTMLElement>(`#filter-cat-${selectedCategory}`);
        if (activeBtn) {
          centerCategoryButton(activeBtn);
        }
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  // Auto-expand, scroll to, and blink highlighted report for exactly 3 seconds / 3 cycles
  React.useEffect(() => {
    if (highlightReportId) {
      setActiveHighlightId(highlightReportId);
      setSelectedCategory('all');
      setSearchTerm('');
      setExpandedReportIds((prev) => ({
        ...prev,
        [highlightReportId]: true
      }));
      setTimeout(() => {
        const el = document.getElementById(`report-card-${highlightReportId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      // Stop blinking after 3 seconds (3 full 1-second pulse cycles)
      const timer = setTimeout(() => {
        setActiveHighlightId(null);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setActiveHighlightId(null);
    }
  }, [highlightReportId]);

  const categories: { label: string; value: string }[] = [
    { label: '全部报告', value: 'all' },
    { label: '血生化与激素', value: '血生化与激素' },
    { label: '超声影像', value: '超声影像' },
    { label: '常规体检', value: '常规体检' },
    { label: '其他化验', value: '其他化验' }
  ];

  const filteredReports = reports
    .filter((r) => {
      const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
      const matchSearch =
        searchTerm === '' ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.indicators.some((ind) =>
          ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(ind.value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      return sortOrder === 'desc'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const toggleExpand = (id: string) => {
    setExpandedReportIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Group reports by date or render chronological timeline sections
  const groupedByDate: Record<string, MedicalReport[]> = filteredReports.reduce((acc: Record<string, MedicalReport[]>, rep) => {
    if (!acc[rep.date]) acc[rep.date] = [];
    acc[rep.date].push(rep);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return sortOrder === 'desc'
      ? new Date(b).getTime() - new Date(a).getTime()
      : new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-8 text-[#1a1a1c] dark:text-zinc-100">
      {/* Editorial Filter and Search Bar */}
      <div className="bg-white dark:bg-[#18181b] border border-[#1a1a1c] dark:border-zinc-700 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[4px_4px_0_rgba(26,26,28,0.06)] dark:shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
        <div 
          ref={categoryScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 max-w-full scroll-smooth"
        >
          {categories.map((cat) => (
            <button
              key={cat.value}
              id={`filter-cat-${cat.value}`}
              onClick={(e) => handleSelectCategory(cat.value, e)}
              className={`px-3.5 py-1.5 min-h-[32px] rounded-full text-xs font-semibold whitespace-nowrap shrink-0 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
                selectedCategory === cat.value
                  ? 'bg-[#4f46e5] text-white dark:bg-indigo-950/80 dark:text-indigo-200 dark:border dark:border-indigo-500/50 shadow-xs font-bold'
                  : 'bg-transparent text-[#1a1a1c]/65 dark:text-slate-400 hover:text-[#1a1a1c] dark:hover:text-slate-200 hover:bg-[#1a1a1c]/5 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1c]/40 dark:text-zinc-500" />
            <input
              type="text"
              id="report-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索指标或医院 (如 甘油三酯, TSH)..."
              className="w-full bg-[#fdfdfb] dark:bg-[#121214] border border-slate-300 dark:border-zinc-700 rounded-full pl-8 pr-3 py-1.5 min-h-[34px] text-xs text-[#1a1a1c] dark:text-zinc-100 placeholder-[#1a1a1c]/40 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5562ff] dark:focus:border-zinc-400"
            />
          </div>

          <button
            id="toggle-sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] dark:bg-slate-900/80 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 text-xs font-editorial-mono text-[#334155] dark:text-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
            title="切换时间排序"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>{sortOrder === 'desc' ? '最新优先' : '正序'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Section Feed */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#18181b] border border-dashed border-[#1a1a1c]/30 dark:border-zinc-700 text-[#1a1a1c]/50 dark:text-zinc-400">
          <FileText className="w-10 h-10 mx-auto text-[#1a1a1c]/30 dark:text-zinc-500 mb-2" />
          <p className="text-sm font-semibold">未找到符合条件的报告</p>
          <p className="text-xs text-[#1a1a1c]/40 dark:text-zinc-500 mt-1">请尝试更换搜索词或选择全部类别</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((dateStr) => {
            const dateReports = groupedByDate[dateStr];
            return (
              <div key={dateStr} className="report-section">
                {/* Monospace Date divider from Variation 3 */}
                <div className="font-editorial-mono text-xl sm:text-2xl font-bold mb-4 flex items-center gap-4 text-[#1a1a1c] dark:text-zinc-100">
                  <span>{dateStr.replace(/-/g, '.')}</span>
                  <div className="flex-1 h-[1px] bg-[#1a1a1c]/15 dark:bg-zinc-700" />
                  <span className="text-xs font-normal text-[#1a1a1c]/40 dark:text-zinc-500 uppercase tracking-widest">
                    {dateReports.length} 份报告
                  </span>
                </div>

                {/* Grid of Report Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dateReports.map((report) => {
                    const isExpanded = !!expandedReportIds[report.id];
                    
                    // Comprehensive anomaly evaluation
                    const hasCritical = report.indicators.some((i) => {
                      const num = i.numericValue ?? parseIndicatorNumericValue(i.value);
                      const key = canonicalizeIndicatorKey(i.standardKey, i.name);
                      return i.status === 'critical' || (key === 'TSH' && ((num ?? 0) > 10 || (num ?? 0) < 0.1));
                    });

                    const hasWarning = report.indicators.some((i) => {
                      const num = i.numericValue ?? parseIndicatorNumericValue(i.value);
                      const key = canonicalizeIndicatorKey(i.standardKey, i.name);
                      return (
                        i.status === 'warning' ||
                        (key === 'TG' && (num ?? 0) > 1.70) ||
                        (key === 'ALT' && (num ?? 0) > 50) ||
                        (key === 'TSH' && (num ?? 0) > 4.2) ||
                        String(i.value).includes('↑') ||
                        String(i.value).includes('偏高')
                      );
                    });

                    const hasAnomaly = hasCritical || hasWarning;

                    // Collect matched multi-period indicators for this report
                    const matchedMultiPeriodIndicators = report.indicators.filter((ind) => {
                      const key = canonicalizeIndicatorKey(ind.standardKey, ind.name);
                      const matchCount = reports.filter((r) => 
                        r.indicators.some((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === key)
                      ).length;
                      return matchCount >= 2;
                    });

                    const isHighlighted = report.id === activeHighlightId;

                    return (
                      <div
                        key={report.id}
                        id={`report-card-${report.id}`}
                        style={isHighlighted ? { animationIterationCount: 3, animationDuration: '1s' } : undefined}
                        className={`p-6 border transition-all duration-500 relative ${
                          isHighlighted
                            ? 'ring-4 ring-[#5562ff] shadow-xl animate-pulse z-10'
                            : ''
                        } ${
                          hasCritical
                            ? 'bg-[#fffafa] dark:bg-[#221013] border-[#d93025] dark:border-rose-900/80 shadow-[6px_6px_0_rgba(217,48,37,0.12)]'
                            : hasWarning
                            ? 'bg-[#fffcf7] dark:bg-[#241a12] border-amber-600/70 dark:border-amber-700/80 shadow-[6px_6px_0_rgba(217,119,6,0.1)]'
                            : 'bg-white dark:bg-[#18181b] border-[#1a1a1c] dark:border-zinc-700 shadow-[6px_6px_0_rgba(26,26,28,0.06)] dark:shadow-[6px_6px_0_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        {/* Tag & Hospital */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                hasCritical
                                  ? 'border-[#d93025] text-[#d93025] dark:border-rose-400 dark:text-rose-400'
                                  : hasWarning
                                  ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300'
                                  : 'border-[#1a1a1c] text-[#1a1a1c] dark:border-zinc-500 dark:text-zinc-300'
                              }`}
                            >
                              {report.category}
                            </span>
                            {hasCritical && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-editorial-mono font-bold bg-[#d93025] text-white rounded">
                                <AlertTriangle className="w-3 h-3" /> 严重异常项
                              </span>
                            )}
                            {!hasCritical && hasWarning && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-editorial-mono font-bold bg-amber-600 text-white rounded">
                                <AlertTriangle className="w-3 h-3" /> 存在偏高指标
                              </span>
                            )}
                            {matchedMultiPeriodIndicators.length > 0 && (
                              <button
                                onClick={() => onSelectIndicatorForTrend(canonicalizeIndicatorKey(matchedMultiPeriodIndicators[0].standardKey, matchedMultiPeriodIndicators[0].name))}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-editorial-mono font-bold bg-[#5562ff]/10 dark:bg-[#5562ff]/25 text-[#5562ff] dark:text-[#9aa2ff] border border-[#5562ff]/30 hover:bg-[#5562ff]/20 rounded transition cursor-pointer"
                                title="点击查看跨期匹配折线走势图"
                              >
                                <TrendingUp className="w-3 h-3" />
                                <span>📈 走势已匹配 ({matchedMultiPeriodIndicators.map(i => i.name).join('、')})</span>
                              </button>
                            )}
                            {report.imageUrls && report.imageUrls.length > 1 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-editorial-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded">
                                📸 {report.imageUrls.length}张组合
                              </span>
                            )}
                          </div>

                          <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/50 dark:text-zinc-400">
                            {report.hospital}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] dark:text-zinc-100 mb-2 leading-snug">
                          {report.title}
                        </h3>

                        {/* Gestational age if present */}
                        {report.gestationalAge && (
                          <div className="mb-2">
                            <span className="text-[11px] font-editorial-mono px-2 py-0.5 bg-[#5562ff]/10 dark:bg-[#5562ff]/20 text-[#5562ff] dark:text-[#9aa2ff] font-semibold">
                              孕周阶段: {report.gestationalAge}
                            </span>
                          </div>
                        )}

                        {/* Summary */}
                        <p className="text-xs text-[#1a1a1c]/75 dark:text-zinc-300 leading-relaxed mb-3">
                          {report.summary}
                        </p>

                        {/* Clinical Anomaly Highlight Banner */}
                        {hasAnomaly && (
                          <div className="mb-3 p-2.5 bg-rose-50/90 dark:bg-rose-950/40 border-l-4 border-[#d93025] text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-[#d93025] dark:text-rose-400 font-editorial-mono text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>临床异常警示：包含偏离正常参考范围的项目</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {report.indicators
                                .filter((i) => {
                                  const num = i.numericValue ?? parseIndicatorNumericValue(i.value);
                                  const key = canonicalizeIndicatorKey(i.standardKey, i.name);
                                  return i.status === 'warning' || i.status === 'critical' || (key === 'PRL' && (num ?? 0) > 30.7) || (key === 'TSH' && (num ?? 0) > 2.5);
                                })
                                .map((i) => {
                                  const key = canonicalizeIndicatorKey(i.standardKey, i.name);
                                  const isPrl = key === 'PRL';
                                  return (
                                    <span key={i.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-[#d93025]/40 text-[#d93025] dark:text-rose-300 font-editorial-mono text-[11px] font-bold rounded-2xs">
                                      <span>{i.name}: {i.value} {i.unit}</span>
                                      <span className="text-[10px] opacity-80">(参考: {i.referenceRange || (isPrl ? '3.8-30.7' : '正常范围')})</span>
                                      <span className="bg-[#d93025] text-white px-1 py-0.2 rounded text-[9px]">偏高</span>
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Indicator Items with dashed border (Variation 3 style) */}
                        <div className="border-t border-[#1a1a1c]/10 dark:border-zinc-700/60 pt-2 mb-4">
                          {report.indicators.map((ind) => {
                            const canonicalKey = canonicalizeIndicatorKey(ind.standardKey, ind.name);
                            const numVal = ind.numericValue ?? parseIndicatorNumericValue(ind.value);
                            const isCritical = ind.status === 'critical' || (canonicalKey === 'PRL' && (numVal ?? 0) > 50);
                            const isWarning = ind.status === 'warning' || (canonicalKey === 'PRL' && (numVal ?? 0) > 30.7) || String(ind.value).includes('↑') || String(ind.value).includes('偏高');
                            const isDanger = isCritical || isWarning;
                            const isSuccess = ind.status === 'normal' && canonicalKey === 'TSH';

                            // Check if this indicator has >= 2 records across member reports
                            const historicalCount = reports.filter((r) => 
                              r.indicators.some((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === canonicalKey)
                            ).length;

                            return (
                              <div
                                key={ind.id}
                                className="flex items-center justify-between py-2 border-b border-zinc-200/80 dark:border-zinc-800 text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition px-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs sm:text-sm text-[#1a1a1c] dark:text-zinc-100">
                                    {ind.name}
                                  </span>
                                  {ind.referenceRange && (
                                    <span className="hidden sm:inline font-editorial-mono text-xs text-zinc-500 dark:text-zinc-400">
                                      (参考: {ind.referenceRange})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <span
                                    className={`font-bold font-editorial-mono text-sm tracking-tight ${
                                      isDanger
                                        ? 'text-[#c5221f] dark:text-rose-400'
                                        : 'text-[#1a1a1c] dark:text-zinc-100'
                                    }`}
                                  >
                                    {ind.value} <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{ind.unit}</span>
                                  </span>

                                  {/* Explicit abnormal tag */}
                                  {isDanger && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-editorial-mono font-bold bg-red-50 dark:bg-red-950/40 text-[#c5221f] dark:text-red-400 border border-red-200 dark:border-red-900/60">
                                      {isCritical ? '超标 ↑' : '偏高 ↑'}
                                    </span>
                                  )}

                                  {ind.differenceFromPrev && (() => {
                                    let diffNum: number | null = null;
                                    if (typeof ind.differenceFromPrev.diffNumber === 'number') {
                                      diffNum = ind.differenceFromPrev.diffNumber;
                                    } else {
                                      const curr = typeof ind.numericValue === 'number' ? ind.numericValue : parseFloat(String(ind.value));
                                      const prev = typeof ind.differenceFromPrev.prevValue === 'number'
                                        ? ind.differenceFromPrev.prevValue
                                        : parseFloat(String(ind.differenceFromPrev.prevValue));
                                      if (!isNaN(curr) && !isNaN(prev)) {
                                        diffNum = Math.round((curr - prev) * 1000) / 1000;
                                      }
                                    }

                                    const absDiff = diffNum !== null ? parseFloat(Math.abs(diffNum).toFixed(3)) : null;

                                    return (
                                      <span className={`text-xs font-editorial-mono font-medium ${
                                        ind.differenceFromPrev.trend === 'up'
                                          ? 'text-[#c5221f] dark:text-red-400'
                                          : ind.differenceFromPrev.trend === 'down'
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-zinc-500'
                                      }`}>
                                        ({ind.differenceFromPrev.trend === 'up'
                                          ? `较前次 ↑ ${absDiff !== null ? absDiff : ''}`
                                          : ind.differenceFromPrev.trend === 'down'
                                          ? `较前次 ↓ ${absDiff !== null ? absDiff : ''}`
                                          : '较前次 → 持平'})
                                      </span>
                                    );
                                  })()}

                                  {historicalCount >= 2 && (
                                    <button
                                      onClick={() => onSelectIndicatorForTrend(canonicalKey)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-editorial-mono font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer transition"
                                      title={`已匹配 ${historicalCount} 份报告，查看跨期对比走势`}
                                    >
                                      <TrendingUp className="w-3 h-3 text-zinc-500" />
                                      <span>走势图 ({historicalCount}次) &rarr;</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Expandable Table for Deep Clinical Data */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#1a1a1c]/15 dark:border-zinc-700 text-xs space-y-3 bg-[#fdfdfb] dark:bg-[#121214] p-3 border border-[#1a1a1c]/10 dark:border-zinc-700">
                            <div className="font-editorial-mono text-[10px] uppercase text-[#1a1a1c]/50 dark:text-zinc-400 font-bold">
                              指标历史对比详情
                            </div>
                            <div className="space-y-2">
                              {report.indicators.map((ind) => {
                                const canonicalKey = canonicalizeIndicatorKey(ind.standardKey, ind.name);
                                const numVal = ind.numericValue ?? parseIndicatorNumericValue(ind.value);
                                const isCritical = ind.status === 'critical' || (canonicalKey === 'PRL' && (numVal ?? 0) > 50);
                                const isWarning = ind.status === 'warning' || (canonicalKey === 'PRL' && (numVal ?? 0) > 30.7) || String(ind.value).includes('↑') || String(ind.value).includes('偏高');

                                return (
                                  <div key={ind.id} className="text-[11px] pb-1.5 border-b border-[#1a1a1c]/10 dark:border-zinc-800 last:border-0">
                                    <div className="flex justify-between font-semibold">
                                      <span className="dark:text-zinc-300">
                                        {ind.name} (参考: {ind.referenceRange || (canonicalKey === 'PRL' ? '女性绝经前: 3.8-30.7 ng/ml' : '见附注')})
                                      </span>
                                      <span className={`font-editorial-mono font-bold ${
                                        isCritical 
                                          ? 'text-[#d93025] dark:text-rose-400' 
                                          : isWarning 
                                          ? 'text-[#d93025] dark:text-rose-400' 
                                          : 'text-[#1a1a1c] dark:text-zinc-200'
                                      }`}>
                                        {ind.value} {ind.unit}
                                        {isCritical && <span className="ml-1 text-[10px] text-[#d93025]">(严重超标🚨)</span>}
                                        {!isCritical && isWarning && <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">(偏高↑)</span>}
                                      </span>
                                    </div>
                                    {ind.differenceFromPrev && (
                                      <div className="flex items-center justify-between gap-1 text-[10px] text-[#d93025] dark:text-rose-400 font-medium mt-0.5">
                                        <span>⚠️ 较前次 ({ind.differenceFromPrev.prevDate} 数值 {ind.differenceFromPrev.prevValue}): {ind.differenceFromPrev.anomalyReason}</span>
                                        <button
                                          onClick={() => onSelectIndicatorForTrend(canonicalKey)}
                                          className="text-[#5562ff] dark:text-[#9aa2ff] underline font-bold shrink-0 cursor-pointer"
                                        >
                                          打开折线图
                                        </button>
                                      </div>
                                    )}
                                    {ind.clinicalNote && (
                                      <p className="text-[10px] text-[#1a1a1c]/60 dark:text-zinc-400 mt-0.5">{ind.clinicalNote}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {report.doctorAdvice && (
                              <div className="text-[11px] p-2 bg-white dark:bg-[#1c1c20] border border-[#1a1a1c]/10 dark:border-zinc-700 mt-2 dark:text-zinc-300">
                                <strong className="text-[#1a1a1c] dark:text-zinc-100">医嘱处置：</strong> {report.doctorAdvice}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action strip */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-[#1a1a1c]/10 dark:border-zinc-700/60 w-full min-w-0">
                          <button
                            id={`expand-report-details-${report.id}`}
                            onClick={() => toggleExpand(report.id)}
                            className="font-editorial-mono text-[11px] text-[#1a1a1c]/60 dark:text-zinc-400 hover:text-[#1a1a1c] dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer py-1 min-h-[32px] self-start"
                          >
                            <span>{isExpanded ? '收起明细' : '展开检验明细'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-start xl:justify-end w-full xl:w-auto min-w-0">
                            <button
                              id={`view-lab-sheet-${report.id}`}
                              onClick={() => setDetailModalReport(report)}
                              className="px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] dark:bg-slate-900/80 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 font-editorial-mono flex items-center gap-1 text-[#334155] dark:text-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                              title="查看医院标准格式报告化验单及原始单据影像"
                            >
                              <Eye className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                              <span>原始单据{report.imageUrls && report.imageUrls.length > 1 ? ` (${report.imageUrls.length}页)` : ''}</span>
                            </button>

                            <button
                              id={`save-image-card-${report.id}`}
                              onClick={() => saveReportImageLocally(report, memberName)}
                              className="px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs rounded-full border border-[#475569] dark:border-slate-600 bg-[#f8fafc] dark:bg-slate-900/80 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 font-editorial-mono flex items-center gap-1 text-[#334155] dark:text-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                              title="保存此份化验报告图片至本地电脑或手机相册"
                            >
                              <Download className="w-3 h-3 text-[#5562ff] dark:text-[#9aa2ff]" />
                              <span>保存图片</span>
                            </button>

                            <button
                              id={`ask-ai-report-${report.id}`}
                              onClick={() => onAskAIAboutReport(report)}
                              className="px-3.5 py-1.5 min-h-[32px] rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 text-xs font-semibold flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#5562ff] dark:text-[#9aa2ff]" />
                              <span>AI 解读</span>
                            </button>

                            {onDeleteReport && (
                              <button
                                id={`delete-report-${report.id}`}
                                onClick={() => {
                                  setReportToDelete({ id: report.id, title: report.title });
                                }}
                                className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#1a1a1c]/40 hover:text-[#d93025] dark:hover:text-rose-400 hover:bg-[#d93025]/5 rounded-full hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                                title="删除该病历记录"
                                aria-label="删除病历"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lab Sheet Detail Modal */}
      <ReportDetailModal
        report={detailModalReport}
        memberName={memberName}
        allReports={reports}
        onClose={() => setDetailModalReport(null)}
        onAskAI={onAskAIAboutReport}
        onSelectIndicatorForTrend={onSelectIndicatorForTrend}
        onDeleteReport={onDeleteReport}
      />

      {/* In-App Deletion Confirmation Dialog (Replaces native window.confirm which is blocked in iframes) */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-[#1a1a1c] dark:border-zinc-700 w-full max-w-md p-5 shadow-[8px_8px_0_rgba(26,26,28,0.2)] rounded-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 text-[#d93025] dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#1a1a1c] dark:text-zinc-100">
                  确认删除病历记录？
                </h3>
                <p className="mt-1.5 text-xs text-[#1a1a1c]/70 dark:text-zinc-400 leading-relaxed">
                  确定要删除《<span className="font-semibold text-[#1a1a1c] dark:text-zinc-200">{reportToDelete.title}</span>》吗？
                </p>
                <p className="mt-1 text-[11px] text-[#d93025] dark:text-rose-400 font-medium">
                  ⚠️ 此操作将同步从云端数据库中永久移除，且不可恢复。
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-[#1a1a1c]/10 dark:border-zinc-800">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium border border-[#1a1a1c]/30 dark:border-zinc-700 hover:bg-[#1a1a1c]/5 dark:hover:bg-zinc-800 text-[#1a1a1c] dark:text-zinc-300 rounded transition cursor-pointer"
              >
                取消
              </button>
              <button
                id="confirm-delete-report-btn"
                onClick={() => {
                  if (onDeleteReport && reportToDelete) {
                    onDeleteReport(reportToDelete.id, reportToDelete.title);
                  }
                  setReportToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#d93025] hover:bg-[#b8241a] text-white rounded transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认永久删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

