import React, { useState, useEffect } from 'react';
import { MedicalReport } from '../types';
import { X, Bot, Printer, Download, FileText, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, Check, Trash2, Layers, Maximize2, TrendingUp, Eye, Image as ImageIcon } from 'lucide-react';
import { saveReportImageLocally, renderReportToCanvas } from '../utils/reportImageSaver';
import { canonicalizeIndicatorKey, parseIndicatorNumericValue } from '../utils/indicatorUtils';

/**
 * Clean iframe-based print helper that prints original images in full A4 page format
 */
const printImagesDirectly = (images: string[], reportTitle: string, hospital: string, date: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - 原始化验单原件</title>
        <style>
          @page { margin: 8mm; size: auto; }
          body { margin: 0; padding: 0; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1c; }
          .page { page-break-after: always; break-after: page; margin-bottom: 24px; text-align: center; }
          .page:last-child { page-break-after: auto; break-after: auto; }
          .header { font-size: 13px; font-weight: bold; margin-bottom: 12px; text-align: left; border-bottom: 1.5px solid #1a1a1c; padding-bottom: 6px; }
          img { max-width: 100%; max-height: 260mm; height: auto; display: block; margin: 0 auto; object-fit: contain; }
        </style>
      </head>
      <body>
        ${images.map((img, i) => `
          <div class="page">
            <div class="header">【${hospital}】${reportTitle} · 原始化验单原件存档（第 ${i + 1}/${images.length} 页 · 检查日期: ${date}）</div>
            <img src="${img}" alt="化验单原件" />
          </div>
        `).join('')}
      </body>
    </html>
  `);
  doc.close();

  // Wait for all images in the iframe to fully load before printing
  const imgs = doc.querySelectorAll('img');
  let loaded = 0;
  const triggerPrint = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 4000);
    }, 250);
  };

  if (imgs.length === 0) {
    triggerPrint();
  } else {
    imgs.forEach((img) => {
      if (img.complete) {
        loaded++;
        if (loaded === imgs.length) triggerPrint();
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) triggerPrint();
        };
      }
    });
  }
};

interface ReportDetailModalProps {
  report: MedicalReport | null;
  memberName?: string;
  allReports?: MedicalReport[];
  onClose: () => void;
  onAskAI: (report: MedicalReport) => void;
  onSelectIndicatorForTrend?: (key: string) => void;
  onDeleteReport?: (reportId: string, reportTitle?: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  memberName = '家庭成员',
  allReports,
  onClose,
  onAskAI,
  onSelectIndicatorForTrend,
  onDeleteReport
}) => {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeImagePage, setActiveImagePage] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'with-images' | 'images-only' | 'table-only'>('images-only');
  const [generatedCanvasImg, setGeneratedCanvasImg] = useState<string | null>(() => {
    if (report && (!report.imageUrls || report.imageUrls.length === 0) && !report.imageUrl) {
      try {
        const canvas = renderReportToCanvas(report, memberName);
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    }
    return null;
  });

  // Compute all available images (uploaded or auto-rendered official canvas)
  const uploadedImages: string[] = (
    report?.imageUrls && report.imageUrls.length > 0 
      ? report.imageUrls 
      : (report?.imageUrl ? [report.imageUrl] : [])
  ).filter(Boolean);

  useEffect(() => {
    if (report && uploadedImages.length === 0 && !generatedCanvasImg) {
      try {
        const canvas = renderReportToCanvas(report, memberName);
        setGeneratedCanvasImg(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error('Failed to render canvas image for print:', e);
      }
    }
  }, [report, memberName, uploadedImages.length, generatedCanvasImg]);

  const allImages: string[] = uploadedImages.length > 0 
    ? uploadedImages 
    : (generatedCanvasImg ? [generatedCanvasImg] : []);

  if (!report) return null;

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const executePrint = () => {
    setShowPrintModal(false);
    if (printMode === 'images-only') {
      if (allImages.length > 0) {
        printImagesDirectly(allImages, report.title, report.hospital, report.date);
      } else {
        window.print();
      }
    } else {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const handleDelete = () => {
    if (!onDeleteReport) return;
    onDeleteReport(report.id, report.title);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSaveImage = async () => {
    try {
      setIsSavingImage(true);
      const filename = await saveReportImageLocally(report, memberName);
      setSaveSuccessMsg(`已下载：${filename}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('保存报告图片失败，请重试');
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="report-detail-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="report-detail-modal-container bg-white border border-[#1a1a1c] w-full max-w-3xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-6">
        {/* Top Action Bar */}
        <div className="print-hidden flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 border-b border-[#1a1a1c] bg-[#f8f8f6] gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/60 font-bold">
              OFFICIAL MEDICAL RECORD · 原始报告单据档案
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold border border-[#1a1a1c] bg-white">
              {report.category}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-end">
            <button
              id="save-report-image-btn"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs border border-[#1a1a1c] bg-[#fdfdfb] hover:bg-[#1a1a1c] hover:text-white transition font-editorial-mono font-bold shadow-xs cursor-pointer"
              title="将原始检验报告单以高清图片格式保存至您的电脑或手机相册"
            >
              {saveSuccessMsg ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#188038]" />
                  <span className="text-[#188038]">已保存</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span className="hidden sm:inline">{isSavingImage ? '正在生成图片...' : '保存报告图片到本地'}</span>
                  <span className="sm:hidden">{isSavingImage ? '生成中...' : '保存图片'}</span>
                </>
              )}
            </button>

            <button
              id="print-report-modal-btn"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs border border-[#1a1a1c] bg-white hover:bg-[#1a1a1c] hover:text-white transition font-editorial-mono cursor-pointer"
              title="打印报告单或查看原图影像"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onAskAI(report);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs bg-[#5562ff] text-white hover:bg-[#4350ea] transition font-semibold cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI 解读</span>
            </button>

            {onDeleteReport && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-1 rounded">
                  <span className="text-[11px] text-[#d93025] font-bold">确认永久删除？</span>
                  <button
                    id="confirm-delete-report-modal-btn"
                    onClick={handleDelete}
                    className="px-2 py-0.5 text-xs bg-[#d93025] text-white font-semibold rounded hover:bg-[#b8241a] cursor-pointer"
                  >
                    确定
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 text-xs border border-zinc-300 text-zinc-600 rounded hover:bg-zinc-100 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  id="delete-report-modal-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[32px] text-xs border border-[#d93025]/40 text-[#d93025] hover:bg-[#d93025] hover:text-white transition font-editorial-mono font-medium rounded-xs cursor-pointer"
                  title="删除该条病历记录"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">删除记录</span>
                  <span className="sm:hidden">删除</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#1a1a1c]/50 hover:text-[#1a1a1c] border border-transparent hover:border-[#1a1a1c] transition cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner if saved */}
        {saveSuccessMsg && (
          <div className="bg-[#188038]/10 border-b border-[#188038]/30 px-4 py-2 flex items-center justify-between text-xs text-[#188038] font-editorial-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg} (已下载至您的本地下载目录)
            </span>
          </div>
        )}

        {/* Authentic Hospital Lab Sheet Layout */}
        <div className="report-detail-scroll-area p-8 space-y-6 max-h-[75vh] overflow-y-auto bg-white">
          {/* Hospital Header & Title */}
          <div className="text-center pb-5 border-b-2 border-[#1a1a1c]">
            <h2 className="font-editorial-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1a1c]">
              {report.hospital}
            </h2>
            <div className="font-editorial-mono text-sm tracking-widest uppercase text-[#1a1a1c]/70 mt-1">
              CLINICAL LABORATORY & DIAGNOSTIC REPORT
            </div>
            <h3 className="font-editorial-serif text-lg font-medium text-[#1a1a1c] mt-2 underline decoration-[#1a1a1c]/30 underline-offset-4">
              {report.title}
            </h3>
          </div>

          {/* Patient & Report Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#fdfdfb] border border-[#1a1a1c]/20 text-xs font-editorial-mono">
            <div>
              <span className="text-[#1a1a1c]/50 block">检查日期 / DATE</span>
              <span className="font-bold text-[#1a1a1c]">{report.date}</span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">就诊科室 / DEPT</span>
              <span className="font-bold text-[#1a1a1c]">{report.department || '综合检验科/体检中心'}</span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">报告状态 / STATUS</span>
              <span className="font-bold text-[#188038] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已审核归档
              </span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">就诊类别 / CATEGORY</span>
              <span className="font-bold text-[#1a1a1c]">{report.gestationalAge || report.category || '健康体检'}</span>
            </div>
          </div>

          {/* Clinical Summary Banner */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fafaf8]">
            <span className="font-editorial-mono text-[10px] uppercase font-bold text-[#1a1a1c]/60 tracking-wider block mb-1">
              CLINICAL DIAGNOSIS & SUMMARY · 检查结论与临床小结
            </span>
            <p className="text-sm leading-relaxed text-[#1a1a1c] font-medium">
              {report.summary}
            </p>
          </div>

          {/* Original Scans & Screenshots Gallery (Supports multi-image combined reports) */}
          {(() => {
            const allImages: string[] = (
              report.imageUrls && report.imageUrls.length > 0 
                ? report.imageUrls 
                : (report.imageUrl ? [report.imageUrl] : [])
            ).filter(Boolean);

            if (allImages.length === 0) return null;

            const safeActiveIdx = Math.min(activeImagePage, allImages.length - 1);
            const currentImg = allImages[safeActiveIdx];

            return (
              <div className="p-4 bg-[#fbfbfa] border border-[#1a1a1c]/20 rounded-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1a1a1c]/10">
                  <div className="flex items-center gap-2">
                    <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#5562ff]" />
                      <span>原始化验单/检查影像原件 ({allImages.length} 页组合归档)</span>
                    </span>
                    {allImages.length > 1 && (
                      <span className="text-[10px] font-editorial-mono bg-[#5562ff]/10 text-[#5562ff] px-2 py-0.5 rounded font-bold border border-[#5562ff]/20">
                        多图联合归档
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLightboxImage(currentImg)}
                      className="px-2.5 py-1 text-xs bg-white border border-[#1a1a1c]/30 hover:border-[#1a1a1c] font-editorial-mono flex items-center gap-1 transition cursor-pointer text-[#1a1a1c]"
                      title="全屏高清放大查看当前页原图"
                    >
                      <Maximize2 className="w-3 h-3 text-[#5562ff]" />
                      <span>全屏查看</span>
                    </button>
                    <a
                      href={currentImg}
                      download={`${report.title}-第${safeActiveIdx + 1}页.jpg`}
                      className="px-2.5 py-1 text-xs bg-white border border-[#1a1a1c]/30 hover:border-[#1a1a1c] font-editorial-mono flex items-center gap-1 transition cursor-pointer text-[#1a1a1c]"
                      title="下载当前页原图到本地"
                    >
                      <Download className="w-3 h-3 text-[#5562ff]" />
                      <span>下载本页</span>
                    </a>
                  </div>
                </div>

                {/* Multi-page switcher tabs */}
                {allImages.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/60 mr-1">选择页码：</span>
                    {allImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImagePage(idx)}
                        className={`px-3 py-1 text-xs font-editorial-mono rounded cursor-pointer transition ${
                          safeActiveIdx === idx
                            ? 'bg-[#1a1a1c] text-white font-bold'
                            : 'bg-white border border-[#1a1a1c]/25 text-[#1a1a1c]/70 hover:bg-[#f0f0ee]'
                        }`}
                      >
                        第 {idx + 1} 页 {idx === 0 ? '(表头)' : ''}
                      </button>
                    ))}
                  </div>
                )}

                {/* Image preview box */}
                <div
                  onClick={() => setLightboxImage(currentImg)}
                  className="max-h-72 overflow-hidden flex items-center justify-center bg-zinc-900/5 border border-[#1a1a1c]/10 rounded-xs cursor-zoom-in relative group"
                  title="点击全屏高清放大查看"
                >
                  <img
                    src={currentImg}
                    alt={`化验单第 ${safeActiveIdx + 1} 页`}
                    className="max-h-72 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-bold px-2 py-1 bg-black/75 rounded flex items-center gap-1.5 shadow">
                      <Maximize2 className="w-3.5 h-3.5" /> 点击全屏高清放大查看 (第 {safeActiveIdx + 1}/{allImages.length} 页)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Test Indicators Table */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-editorial-mono text-xs sm:text-sm font-bold text-[#1a1a1c] tracking-wider uppercase">
                TEST ITEMS & PARAMETERS · 检验项目测定明细
              </span>
              <span className="text-xs font-editorial-mono text-[#1a1a1c]/60">
                共测定 {report.indicators.length} 项参数
              </span>
            </div>

            <div className="border border-[#1a1a1c] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f8f6] border-b border-[#1a1a1c] font-editorial-mono text-xs text-[#1a1a1c]">
                    <th className="p-2.5 font-bold">项目名称 (ITEM)</th>
                    <th className="p-2.5 font-bold">测定结果 (RESULT)</th>
                    <th className="p-2.5 font-bold">状态提示 (FLAG)</th>
                    <th className="p-2.5 font-bold">参考区间 (REFERENCE)</th>
                    <th className="p-2.5 font-bold">单位 (UNIT)</th>
                    <th className="p-2.5 font-bold text-right">跨期趋势 (TREND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1c]/15">
                  {report.indicators.map((ind) => {
                    const canonicalKey = canonicalizeIndicatorKey(ind.standardKey, ind.name);
                    const numVal = ind.numericValue ?? parseIndicatorNumericValue(ind.value);
                    const isCritical = ind.status === 'critical' || (canonicalKey === 'PRL' && (numVal ?? 0) > 50);
                    const isWarning = ind.status === 'warning' || (canonicalKey === 'PRL' && (numVal ?? 0) > 30.7) || String(ind.value).includes('↑') || String(ind.value).includes('偏高');
                    const isNormal = !isCritical && !isWarning && ind.status === 'normal';

                    return (
                      <tr
                        key={ind.id}
                        className="hover:bg-zinc-50/80 transition"
                      >
                        <td className="p-2.5 text-[#1a1a1c]">
                          <div className="text-sm font-semibold text-[#1a1a1c]">{ind.name}</div>
                          {ind.standardKey && ind.standardKey !== ind.name && (
                            <span className="font-editorial-mono text-xs text-[#1a1a1c]/50">
                              [{ind.standardKey}]
                            </span>
                          )}
                          {ind.differenceFromPrev && (
                            <div className="text-xs font-editorial-mono text-[#c5221f] font-medium mt-0.5">
                              较前次: {ind.differenceFromPrev.anomalyReason}
                            </div>
                          )}
                        </td>

                        <td className={`p-2.5 font-editorial-mono font-bold text-sm tracking-tight whitespace-nowrap ${
                          isCritical || isWarning ? 'text-[#c5221f]' : 'text-[#1a1a1c]'
                        }`}>
                          {ind.value}
                        </td>

                        <td className="p-2.5 whitespace-nowrap">
                          {(isCritical || isWarning) ? (
                            <span className="inline-flex items-center gap-1 font-editorial-mono text-xs font-bold px-2 py-0.5 bg-red-50 text-[#c5221f] border border-red-200 rounded">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{isCritical ? '严重超标 ↑' : '偏高 ↑'}</span>
                            </span>
                          ) : isNormal ? (
                            <span className="font-editorial-mono text-xs text-zinc-500 font-medium">
                              正常
                            </span>
                          ) : (
                            <span className="font-editorial-mono text-xs text-zinc-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-editorial-mono text-xs text-zinc-600 whitespace-nowrap">
                          {ind.referenceRange || (canonicalKey === 'PRL' ? '女性绝经前: 3.8-30.7' : '见附注')}
                        </td>

                        <td className="p-2.5 font-editorial-mono text-xs text-zinc-500 whitespace-nowrap">
                          {ind.unit || '-'}
                        </td>

                        <td className="p-2.5 text-right whitespace-nowrap">
                          {(() => {
                            const historicalCount = allReports
                              ? allReports.filter((r) =>
                                  r.indicators.some((i) => canonicalizeIndicatorKey(i.standardKey, i.name) === canonicalKey)
                                ).length
                              : (ind.differenceFromPrev ? 2 : 1);

                            if (onSelectIndicatorForTrend && historicalCount >= 2) {
                              return (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onSelectIndicatorForTrend(canonicalKey);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[#1a1a1c] font-editorial-mono text-xs font-semibold border border-zinc-300 cursor-pointer transition"
                                  title={`已匹配 ${historicalCount} 次检测，点击查看连续走势折线图`}
                                >
                                  <TrendingUp className="w-3 h-3 text-zinc-600" />
                                  <span>走势图 ({historicalCount}次) &rarr;</span>
                                </button>
                              );
                            }

                            return (
                              <span className="text-zinc-400 font-editorial-mono text-xs">单次测定</span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Footnote & Clinical Disclaimer */}
          <div className="pt-4 border-t border-[#1a1a1c]/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#1a1a1c]/50 font-editorial-mono gap-2">
            <div>
              <span>检验师 / 报告审核：系统智能OCR归档 · 唯一单据号：MD-{report.id}</span>
            </div>
            <div>
              <span>* 本化验单据由医疗机构合法出具，系统提供智能归档与横向对比服务</span>
            </div>
          </div>

          {/* Printable Original Medical Scans Section (Hidden on screen, only rendered for print) */}
          {allImages.length > 0 && printMode !== 'table-only' && (
            <div className="mt-8 pt-6 border-t-2 border-[#1a1a1c] hidden print:block">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#1a1a1c]/20">
                <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-1.5 uppercase tracking-wider">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span>ORIGINAL CLINICAL SCAN · 原始化验单据原件档案 (共 {allImages.length} 页)</span>
                </span>
                <span className="text-[10px] font-editorial-mono text-[#1a1a1c]/60">
                  {report.hospital} · 检查存档日期: {report.date}
                </span>
              </div>
              <div className="space-y-6">
                {allImages.map((img, idx) => (
                  <div key={idx} className="print-original-container bg-[#fafaf8] border border-[#1a1a1c]/20 p-2 text-center">
                    <div className="flex items-center justify-between text-[11px] font-editorial-mono text-[#1a1a1c]/60 mb-2 px-1 pb-1 border-b border-[#1a1a1c]/10">
                      <span>单据原件 · 第 {idx + 1} 页 / 共 {allImages.length} 页</span>
                      <span className="font-bold">【{report.hospital}】{report.title}</span>
                    </div>
                    <img
                      src={img}
                      alt={`原始化验单 第 ${idx + 1} 页`}
                      className="print-original-image max-w-full h-auto mx-auto object-contain shadow-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Options & Original Image Preview Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-white border-2 border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.25)] flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1c] bg-[#f8f8f6]">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#5562ff]" />
                <div>
                  <h3 className="font-editorial-serif text-lg font-bold text-[#1a1a1c]">
                    打印报告与原图阅览
                  </h3>
                  <p className="font-editorial-mono text-[11px] text-[#1a1a1c]/60">
                    {report.hospital} · {report.title} ({report.date})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-[#1a1a1c]/50 hover:text-[#1a1a1c] hover:bg-[#1a1a1c]/5 transition cursor-pointer"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Original Image Display Section */}
              <div className="border border-[#1a1a1c] bg-[#fafaf8] p-3.5">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1a1a1c]/15">
                  <div className="flex items-center gap-2">
                    <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#5562ff]" />
                      <span>化验单据原图阅览</span>
                    </span>
                    <span className="text-[10px] font-editorial-mono bg-[#5562ff]/10 text-[#5562ff] px-2 py-0.5 rounded font-bold border border-[#5562ff]/20">
                      {uploadedImages.length > 0 ? `高清原始凭证 (${uploadedImages.length} 页)` : '官方单据原件高清排版'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {allImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(allImages[Math.min(activeImagePage, allImages.length - 1)])}
                        className="px-2.5 py-1 text-xs bg-white border border-[#1a1a1c]/30 hover:border-[#1a1a1c] font-editorial-mono flex items-center gap-1 transition cursor-pointer text-[#1a1a1c]"
                        title="全屏高清放大查看原图"
                      >
                        <Maximize2 className="w-3 h-3 text-[#5562ff]" />
                        <span>全屏放大</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Multi-page switcher if more than 1 image */}
                {allImages.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/60">切换原图页码：</span>
                    {allImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImagePage(idx)}
                        className={`px-2.5 py-0.5 text-xs font-editorial-mono rounded cursor-pointer transition ${
                          activeImagePage === idx
                            ? 'bg-[#1a1a1c] text-white font-bold'
                            : 'bg-white border border-[#1a1a1c]/25 text-[#1a1a1c]/70 hover:bg-[#f0f0ee]'
                        }`}
                      >
                        第 {idx + 1} 页
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Container */}
                <div
                  className="bg-zinc-900/5 border border-[#1a1a1c]/15 flex items-center justify-center p-2 max-h-64 sm:max-h-80 overflow-hidden relative group cursor-zoom-in"
                  onClick={() => allImages.length > 0 && setLightboxImage(allImages[Math.min(activeImagePage, allImages.length - 1)])}
                  title="点击全屏高清放大阅览原图"
                >
                  {allImages.length > 0 ? (
                    <>
                      <img
                        src={allImages[Math.min(activeImagePage, allImages.length - 1)]}
                        alt={`化验单原图 第 ${activeImagePage + 1} 页`}
                        className="max-h-60 sm:max-h-76 w-auto max-w-full object-contain shadow-xs"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-bold px-3 py-1.5 bg-black/75 rounded flex items-center gap-1.5 shadow">
                          <Maximize2 className="w-4 h-4" /> 点击全屏查看原图 (高清细节)
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-xs text-[#1a1a1c]/50">
                      暂无原始影像
                    </div>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-end text-[11px] font-editorial-mono text-[#1a1a1c]/60">
                  <span>就诊人: {memberName}</span>
                </div>
              </div>

              {/* Print Mode Selector */}
              <div>
                <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] tracking-wider uppercase block mb-2.5">
                  选择打印输出模式 / PRINT OPTIONS
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setPrintMode('images-only')}
                    className={`p-3 border cursor-pointer transition flex flex-col justify-between ${
                      printMode === 'images-only'
                        ? 'border-[#5562ff] bg-[#5562ff]/5 ring-2 ring-[#5562ff]'
                        : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c] bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1 text-[#1a1a1c]">
                          <ImageIcon className="w-3.5 h-3.5 text-[#5562ff]" />
                          打印原图 (推荐)
                        </span>
                        <input
                          type="radio"
                          name="printMode"
                          checked={printMode === 'images-only'}
                          onChange={() => setPrintMode('images-only')}
                          className="accent-[#5562ff]"
                        />
                      </div>
                      <p className="text-[11px] text-[#1a1a1c]/70 leading-snug">
                        直接以标准A4高精度打印原始单据影像，完整呈现原版公章、签名与排版。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-editorial-mono text-[#5562ff] font-bold">
                      单据原件 1:1 输出
                    </span>
                  </div>

                  <div
                    onClick={() => setPrintMode('with-images')}
                    className={`p-3 border cursor-pointer transition flex flex-col justify-between ${
                      printMode === 'with-images'
                        ? 'border-[#5562ff] bg-[#5562ff]/5 ring-2 ring-[#5562ff]'
                        : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c] bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1 text-[#1a1a1c]">
                          <Printer className="w-3.5 h-3.5 text-[#5562ff]" />
                          打印完整报告
                        </span>
                        <input
                          type="radio"
                          name="printMode"
                          checked={printMode === 'with-images'}
                          onChange={() => setPrintMode('with-images')}
                          className="accent-[#5562ff]"
                        />
                      </div>
                      <p className="text-[11px] text-[#1a1a1c]/70 leading-snug">
                        包含医院抬头、指标数据测定表格、参考区间及附录的原始单据影像。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-editorial-mono text-[#1a1a1c]/60 font-bold">
                      表格数据 + 原图附录
                    </span>
                  </div>

                  <div
                    onClick={() => setPrintMode('table-only')}
                    className={`p-3 border cursor-pointer transition flex flex-col justify-between ${
                      printMode === 'table-only'
                        ? 'border-[#5562ff] bg-[#5562ff]/5 ring-2 ring-[#5562ff]'
                        : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c] bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1 text-[#1a1a1c]">
                          <FileText className="w-3.5 h-3.5 text-[#5562ff]" />
                          仅打印指标表格
                        </span>
                        <input
                          type="radio"
                          name="printMode"
                          checked={printMode === 'table-only'}
                          onChange={() => setPrintMode('table-only')}
                          className="accent-[#5562ff]"
                        />
                      </div>
                      <p className="text-[11px] text-[#1a1a1c]/70 leading-snug">
                        仅打印各项数值指标与参考范围表格，节省纸张与墨水。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-editorial-mono text-[#1a1a1c]/60 font-bold">
                      紧凑纯文本清单
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 sm:p-4 border-t border-[#1a1a1c] bg-[#f8f8f6] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] bg-white transition font-editorial-mono cursor-pointer"
              >
                取消
              </button>

              <div className="flex items-center gap-2">
                {allImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightboxImage(allImages[Math.min(activeImagePage, allImages.length - 1)])}
                    className="px-3 py-2 text-xs border border-[#1a1a1c] bg-white hover:bg-[#1a1a1c] hover:text-white transition font-editorial-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>查看原图</span>
                  </button>
                )}

                <button
                  type="button"
                  id="confirm-execute-print-btn"
                  onClick={executePrint}
                  className="px-4 sm:px-5 py-2 text-xs bg-[#1a1a1c] text-white hover:bg-[#333] transition font-editorial-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>
                    {printMode === 'images-only'
                      ? '立即打印原图 (A4)'
                      : printMode === 'with-images'
                      ? '立即打印完整报告 (含原图)'
                      : '立即打印指标表格'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen High-Resolution Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="text-white/70 font-editorial-mono text-xs">
              点击背景或右上角退出全屏
            </span>
            <button
              onClick={() => setLightboxImage(null)}
              className="text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
              aria-label="关闭原图"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img
            src={lightboxImage}
            alt="全屏原图"
            className="max-w-[94vw] max-h-[88vh] object-contain shadow-2xl rounded-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
