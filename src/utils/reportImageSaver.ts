import { MedicalReport } from '../types';

/**
 * Renders a crisp 1200x1600 official laboratory inspection sheet onto an HTML Canvas
 */
export function renderReportToCanvas(
  report: MedicalReport,
  memberName: string = '家庭成员'
): HTMLCanvasElement {
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  // 2. Hospital Header
  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 38px "Newsreader", "Times New Roman", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(report.hospital || '第一人民医院健康管理中心', width / 2, 110);

  ctx.font = 'bold 16px "Space Mono", "Courier New", monospace';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(26, 26, 28, 0.65)';
  ctx.fillText('CLINICAL LABORATORY & DIAGNOSTIC REPORT', width / 2, 145);

  ctx.font = 'bold 26px "Newsreader", serif';
  ctx.fillStyle = '#1a1a1c';
  ctx.fillText(report.title, width / 2, 190);

  // Divider Line
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 220);
  ctx.lineTo(width - 60, 220);
  ctx.stroke();

  // 3. Patient Metadata Grid
  ctx.font = '16px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(26, 26, 28, 0.6)';

  const metaY = 260;
  // Col 1
  ctx.fillText('姓名 / PATIENT:', 80, metaY);
  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 18px "Space Mono", monospace';
  ctx.fillText(memberName, 240, metaY);

  // Col 2
  ctx.fillStyle = 'rgba(26, 26, 28, 0.6)';
  ctx.font = '16px "Space Mono", monospace';
  ctx.fillText('检查日期 / DATE:', 460, metaY);
  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 18px "Space Mono", monospace';
  ctx.fillText(report.date, 630, metaY);

  // Col 3
  ctx.fillStyle = 'rgba(26, 26, 28, 0.6)';
  ctx.font = '16px "Space Mono", monospace';
  ctx.fillText('类别 / CATEGORY:', 840, metaY);
  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 18px "Space Mono", monospace';
  ctx.fillText(report.category, 1010, metaY);

  const metaY2 = 295;
  if (report.gestationalAge) {
    ctx.fillStyle = 'rgba(26, 26, 28, 0.6)';
    ctx.font = '16px "Space Mono", monospace';
    ctx.fillText('孕周 / GESTATIONAL:', 80, metaY2);
    ctx.fillStyle = '#1a1a1c';
    ctx.font = 'bold 16px "Space Mono", monospace';
    ctx.fillText(report.gestationalAge, 280, metaY2);
  }

  // Divider
  ctx.strokeStyle = 'rgba(26, 26, 28, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 325);
  ctx.lineTo(width - 60, 325);
  ctx.stroke();

  // 4. Clinical Summary & Diagnostic Impression Box
  ctx.fillStyle = '#f8f8f6';
  ctx.fillRect(80, 350, width - 160, 110);
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, 350, width - 160, 110);

  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 14px "Space Mono", monospace';
  ctx.fillText('【临床诊断结论与核心摘要 / DIAGNOSTIC IMPRESSION】', 100, 380);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#1a1a1c';
  // Wrap summary text
  const summary = report.summary || '无特殊诊断记录';
  ctx.fillText(summary.length > 55 ? summary.slice(0, 54) + '...' : summary, 100, 415);
  if (summary.length > 55) {
    ctx.fillText(summary.slice(54, 110), 100, 440);
  }

  // 5. Key Findings
  let currentY = 500;
  if (report.keyFindings && report.keyFindings.length > 0) {
    ctx.fillStyle = 'rgba(26, 26, 28, 0.8)';
    ctx.font = 'bold 15px "Space Mono", monospace';
    ctx.fillText('主要检查所见与影像学描述 / KEY FINDINGS:', 80, currentY);
    currentY += 26;

    report.keyFindings.slice(0, 4).forEach((kf) => {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#1a1a1c';
      ctx.fillText(`• ${kf}`, 100, currentY);
      currentY += 24;
    });
    currentY += 10;
  }

  // 6. Indicators Table
  ctx.fillStyle = '#1a1a1c';
  ctx.font = 'bold 16px "Space Mono", monospace';
  ctx.fillText('检验指标明细列表 / LABORATORY INDICATOR TEST RESULTS', 80, currentY);
  currentY += 16;

  // Table header
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(80, currentY, width - 160, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Space Mono", monospace';
  ctx.fillText('项目名称 (ITEM)', 100, currentY + 23);
  ctx.fillText('检测结果 (RESULT)', 480, currentY + 23);
  ctx.fillText('状态 (STATUS)', 680, currentY + 23);
  ctx.fillText('参考区间 (REF)', 820, currentY + 23);
  ctx.fillText('单位 (UNIT)', 1020, currentY + 23);
  currentY += 36;

  // Table Rows
  const indicatorsToRender = (report.indicators || []).slice(0, 12);
  const rowHeight = 36;

  indicatorsToRender.forEach((ind, index) => {
    if (index % 2 === 1) {
      ctx.fillStyle = '#fcfcfb';
      ctx.fillRect(80, currentY, width - 160, rowHeight);
    }

    ctx.fillStyle = '#1a1a1c';
    ctx.font = '14px sans-serif';
    ctx.fillText(ind.name, 100, currentY + 23);

    // Value
    ctx.font = 'bold 15px "Space Mono", monospace';
    ctx.fillText(String(ind.value), 480, currentY + 23);

    // Status Pill
    if (ind.status === 'critical') {
      ctx.fillStyle = '#d93025';
      ctx.font = 'bold 13px "Space Mono", monospace';
      ctx.fillText('▲ 重度异常', 680, currentY + 23);
    } else if (ind.status === 'warning') {
      ctx.fillStyle = '#b06000';
      ctx.font = 'bold 13px "Space Mono", monospace';
      ctx.fillText('▲ 偏离参考', 680, currentY + 23);
    } else {
      ctx.fillStyle = '#188038';
      ctx.font = 'bold 13px "Space Mono", monospace';
      ctx.fillText('✓ 正常', 680, currentY + 23);
    }

    // Ref & Unit
    ctx.fillStyle = 'rgba(26, 26, 28, 0.65)';
    ctx.font = '14px "Space Mono", monospace';
    ctx.fillText(ind.referenceRange || '-', 820, currentY + 23);
    ctx.fillText(ind.unit || '-', 1020, currentY + 23);

    // Row line
    ctx.strokeStyle = 'rgba(26, 26, 28, 0.08)';
    ctx.beginPath();
    ctx.moveTo(80, currentY + rowHeight);
    ctx.lineTo(width - 80, currentY + rowHeight);
    ctx.stroke();

    currentY += rowHeight;
  });

  // 7. Doctor Advice & Notes
  const footerY = 1360;
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, footerY, width - 160, 90);

  ctx.fillStyle = 'rgba(26, 26, 28, 0.6)';
  ctx.font = 'bold 13px "Space Mono", monospace';
  ctx.fillText('【医嘱建议与处置 / PHYSICIAN ADVICE】', 100, footerY + 28);

  ctx.fillStyle = '#1a1a1c';
  ctx.font = '15px sans-serif';
  ctx.fillText(report.doctorAdvice || '遵医嘱定期复查，建议结合自身临床表现综合评估。', 100, footerY + 60);

  // 8. Official Red Inspection Stamp
  const stampX = width - 260;
  const stampY = 1420;
  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.08);

  ctx.strokeStyle = '#d93025';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 63, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#d93025';
  ctx.font = 'bold 13px "Songti SC", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.fillText('检验报告审核章', 0, -22);
  ctx.fillText('★ 已归档 ★', 0, 5);
  ctx.font = '11px "Space Mono", monospace';
  ctx.fillText(report.date, 0, 30);
  ctx.restore();

  // 9. Bottom Archive Info
  ctx.fillStyle = 'rgba(26, 26, 28, 0.45)';
  ctx.font = '13px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`电子报告凭证号: MD-${report.id} · 家庭健康管理系统智能存档`, 80, 1530);
  ctx.textAlign = 'right';
  ctx.fillText('已由云端与本地双重备份 · 严禁涂改伪造', width - 80, 1530);

  return canvas;
}

/**
 * Generates an image Blob for a medical report.
 * If report has raw image URL, converts to JPEG blob.
 * Otherwise, renders laboratory diagnostic sheet into JPEG blob.
 */
export async function getReportImageBlob(
  report: MedicalReport,
  memberName: string = '家庭成员',
  format: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<{ blob: Blob; filename: string }> {
  const sanitizedTitle = (report.title || '化验报告单').replace(/[/\\?%*:|"<>]/g, '_');
  const sanitizedHospital = (report.hospital || '医疗机构').replace(/[/\\?%*:|"<>]/g, '_');
  const ext = format === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `【${sanitizedHospital}】${memberName}_${sanitizedTitle}_${report.date}.${ext}`;

  // If user uploaded a real image
  if (report.imageUrl && report.imageUrl.startsWith('data:image')) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context error'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ blob, filename });
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, format, 0.92);
      };
      img.onerror = () => {
        // Fallback to rendered canvas
        const canvas = renderReportToCanvas(report, memberName);
        canvas.toBlob((blob) => {
          if (blob) resolve({ blob, filename });
          else reject(new Error('Fallback toBlob failed'));
        }, format, 0.92);
      };
      img.src = report.imageUrl!;
    });
  }

  // Otherwise render canvas
  return new Promise((resolve, reject) => {
    const canvas = renderReportToCanvas(report, memberName);
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, filename });
      } else {
        reject(new Error('Canvas toBlob failed'));
      }
    }, format, 0.92);
  });
}

/**
 * Downloads a report image locally
 */
export async function saveReportImageLocally(
  report: MedicalReport,
  memberName: string = '家庭成员'
): Promise<string> {
  const { blob, filename } = await getReportImageBlob(report, memberName, 'image/jpeg');
  downloadFile(blob, filename);
  return filename;
}

/**
 * Triggers a download of a Blob file in the browser
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers a download of plain text/markdown string
 */
export function downloadText(content: string, filename: string, mimeType = 'text/markdown;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename);
}
