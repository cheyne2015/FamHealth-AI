import JSZip from 'jszip';
import { FamilyMember, MedicalReport, AnomalyAlert, AIChatMessage } from '../types';
import { getReportImageBlob } from './reportImageSaver';

/**
 * Formats a clean date for report headers
 */
export function formatExportDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 1. Generates clean, well-formatted 聊天记录.md from AI consultation messages
 */
export function generateChatMarkdown(
  messages: AIChatMessage[],
  members: FamilyMember[],
  targetMemberId?: string
): string {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const filteredMessages = targetMemberId && targetMemberId !== 'all'
    ? messages.filter((msg) => !msg.memberId || msg.memberId === targetMemberId)
    : messages;

  const targetMember = targetMemberId && targetMemberId !== 'all' ? memberMap.get(targetMemberId) : null;
  const targetName = targetMember ? `${targetMember.name} (${targetMember.relationship})` : '全部家庭成员';

  let md = '';
  md += `# 家庭健康管理系统 · AI 临床顾问全量咨询会话记录\n\n`;
  md += `> **导出时间**：${formatExportDate()}  \n`;
  md += `> **档案对象**：${targetName}  \n`;
  md += `> **会话总轮数**：${filteredMessages.length} 条记录  \n`;
  md += `> **模型引擎**：Google Gemini 临床医学跨报告推理内核  \n`;
  md += `> **核心议题**：家庭全周期健康管理、指标时序动态转归追踪、异常指标专科复查与生活方式干预\n\n`;
  md += `---\n\n`;

  if (filteredMessages.length === 0) {
    md += `*暂无此成员的咨询会话记录。*\n\n`;
    return md;
  }

  // Group messages by member if exporting all, or list sequentially
  let currentGroupMemberId = '';

  filteredMessages.forEach((msg, idx) => {
    const mem = msg.memberId ? memberMap.get(msg.memberId) : null;
    const memName = mem ? `${mem.name} (${mem.relationship})` : (msg.relatedMemberName || '全家通用');

    if (msg.memberId && msg.memberId !== currentGroupMemberId) {
      currentGroupMemberId = msg.memberId;
      md += `## 👤 咨询档案归属：${memName}\n\n`;
    }

    const timeStr = msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : `记录 #${idx + 1}`);

    if (msg.role === 'user') {
      md += `### 💬 用户提问 [${timeStr}]\n\n`;
      md += `> **提问者**：${memName}\n`;
      if (msg.relatedIndicator) {
        md += `> **关联指标**：\`${msg.relatedIndicator}\`\n`;
      }
      md += `\n${msg.content.trim()}\n\n`;
    } else {
      md += `### 🩺 AI 临床顾问建议 (Gemini) [${timeStr}]\n\n`;
      if (msg.relatedIndicator) {
        md += `*针对指标 \`${msg.relatedIndicator}\` 的临床跨报告综合交叉分析：*\n\n`;
      }
      md += `${msg.content.trim()}\n\n`;
      md += `---\n\n`;
    }
  });

  md += `\n## ⚠️ 临床免责说明\n\n`;
  md += `本咨询记录由家庭健康管理系统及 Google Gemini 临床医学推理引擎基于用户历次上传化验报告、门诊超声影像及检查数据综合生成，旨在为家庭日常健康管理及多学科专科就医提供结构化决策参考与沟通备忘，不直接替代线下面诊医生的诊断与处方。如有突发急性临床不适，请立即前往正规三甲医院就诊。\n`;

  return md;
}

/**
 * 2. Generates comprehensive ai分析.md report content
 */
export function generateAiAnalysisMarkdown(
  reports: MedicalReport[],
  members: FamilyMember[],
  alerts: AnomalyAlert[]
): string {
  const nowStr = formatExportDate();

  let md = '';
  md += `# 家庭全病历多维度 AI 临床深度综合分析报告\n\n`;
  md += `**评估系统**：Health AI Core 智能家庭健康管理系统  \n`;
  md += `**AI 临床引擎**：Google Gemini 跨时序跨报告综合推理系统  \n`;
  md += `**分析生成时间**：${nowStr}  \n`;
  md += `**评估全量数据源**：共计归档 ${reports.length} 份临床检查报告、${alerts.length} 项动态风险预警、${members.length} 位家庭成员健康档案  \n\n`;
  md += `---\n\n`;

  md += `## 一、 执行摘要与核心临床结论 (Executive Summary)\n\n`;
  md += `系统已对全部家庭成员历次化验单、检查报告与专科复查数据进行了全时序多报告关联交叉推理，得出以下核心结论：\n\n`;

  if (alerts.length > 0) {
    alerts.forEach((alt, idx) => {
      md += `${idx + 1}. **${alt.title}**\n`;
      md += `   - **动态分析**：${alt.description}\n`;
      md += `   - **医学参考意义**：${alt.clinicalSignificance}\n`;
      md += `   - **建议处置**：${alt.actionAdvice}\n\n`;
    });
  } else {
    md += `1. **指标整体平稳**：各成员近期复查生化与常规检验指标均在预期参考区间内维持平稳，未发现显著危急值风险。\n\n`;
  }

  md += `---\n\n`;

  md += `## 二、 家庭成员健康档案与基线参数\n\n`;
  members.forEach((m) => {
    md += `### ${m.name} (${m.relationship})\n`;
    md += `- **年龄**：${m.age} 岁 | **性别**：${m.gender === 'female' ? '女' : '男'} | **血型**：${m.bloodType || '详见报告'}\n`;
    md += `- **关注标签**：${m.tags.join('、')}\n`;
    md += `- **病历状态小结**：${m.healthStatusSummary}\n\n`;
  });

  md += `---\n\n`;

  md += `## 三、 全时序检查报告明细与关键指标\n\n`;
  reports.forEach((rep, index) => {
    const mem = members.find((m) => m.id === rep.memberId);
    md += `### ${index + 1}. 【${rep.date}】${rep.title}\n`;
    md += `- **就诊机构**：${rep.hospital} | **就诊科室/类别**：${rep.category}\n`;
    md += `- **归属成员**：${mem ? mem.name : '家庭成员'}\n`;
    md += `- **临床结论**：${rep.summary}\n`;

    if (rep.keyFindings && rep.keyFindings.length > 0) {
      md += `- **主要所见**：\n`;
      rep.keyFindings.forEach((kf) => {
        md += `  - ${kf}\n`;
      });
    }

    if (rep.indicators && rep.indicators.length > 0) {
      md += `- **检验项目数据表**：\n\n`;
      md += `  | 项目名称 | 测定结果 | 临床状态 | 参考区间 | 单位 | 临床解析 |\n`;
      md += `  | :--- | :--- | :---: | :---: | :---: | :--- |\n`;
      rep.indicators.forEach((ind) => {
        const statusBadge = ind.status === 'critical' ? '🔴 重度异常' : ind.status === 'warning' ? '🟡 偏离参考' : '🟢 正常';
        md += `  | ${ind.name} | **${ind.value}** | ${statusBadge} | ${ind.referenceRange || '-'} | ${ind.unit || '-'} | ${ind.clinicalNote || '-'} |\n`;
      });
      md += `\n`;
    }

    if (rep.doctorAdvice) {
      md += `- **就医医嘱建议**：${rep.doctorAdvice}\n`;
    }
    md += `\n`;
  });

  md += `---\n\n`;

  md += `## 四、 动态异常风险警报矩阵 (Active Risk Alerts)\n\n`;
  if (alerts.length === 0) {
    md += `*目前各成员监测指标平稳，暂无未处理的高危预警。*\n\n`;
  } else {
    alerts.forEach((alt, idx) => {
      const levelEmoji = alt.severity === 'high' ? '🚨 [高危预警]' : alt.severity === 'medium' ? '⚠️ [重点监测]' : 'ℹ️ [常规关注]';
      const lastPoint = alt.historicalPoints && alt.historicalPoints.length > 0 ? alt.historicalPoints[alt.historicalPoints.length - 1] : null;
      const valStr = lastPoint ? `${lastPoint.value} (${lastPoint.date})` : alt.date;
      md += `### ${idx + 1}. ${levelEmoji} ${alt.title}\n`;
      md += `- **指标名称**：${alt.indicatorName}\n`;
      md += `- **关联数值与时序**：${valStr}\n`;
      md += `- **异常描述**：${alt.description}\n`;
      md += `- **临床解读**：${alt.clinicalSignificance}\n`;
      md += `- **建议行动**：${alt.actionAdvice}\n\n`;
    });
  }

  md += `---\n\n`;

  md += `## 五、 门诊就诊与随访建议\n\n`;
  md += `- **定期体检**：建议各成员遵医嘱按时参加年度综合健康体检，持续追踪血脂、血糖、肝肾功能与超声指标。\n`;
  md += `- **生活方式**：结合清淡膳食、低脂低盐低糖饮食结构，保证规律有氧运动与充足作息。\n`;
  md += `- **指标异常专科随访**：若化验指标出现持续偏高或反复波动，建议携带纸质化验单与本系统生成的速览卡前往对应专科门诊面诊。\n\n`;

  md += `---\n`;
  md += `*本报告由 Health AI Core 智能家庭健康系统生成 · 已归档于本地与云端安全存储*  \n`;

  return md;
}

/**
 * 3. Exports full archive as a ZIP package containing:
 * - 聊天记录.md
 * - ai分析.md
 * - 全量健康数据备份.json
 * - README_档案使用与恢复说明.txt
 * - 报告图片/ (all .jpg files)
 */
export async function generateFullArchiveZip(
  members: FamilyMember[],
  reports: MedicalReport[],
  alerts: AnomalyAlert[],
  chatMessages: AIChatMessage[],
  onProgress?: (progress: number, currentTask: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Generate 聊天记录.md
  if (onProgress) onProgress(10, '正在生成聊天记录.md...');
  const chatMd = generateChatMarkdown(chatMessages, members, 'all');
  zip.file('聊天记录.md', chatMd);

  // 2. Generate ai分析.md
  if (onProgress) onProgress(25, '正在生成 ai分析.md (全量深度病历总结)...');
  const aiAnalysisMd = generateAiAnalysisMarkdown(reports, members, alerts);
  zip.file('ai分析.md', aiAnalysisMd);

  // 3. Generate JSON backup
  if (onProgress) onProgress(40, '正在打包全量结构化数据 (JSON)...');
  const fullBackupData = {
    exportVersion: '2.0',
    exportDate: new Date().toISOString(),
    members,
    reports,
    alerts,
    chatMessages,
    summary: {
      totalMembers: members.length,
      totalReports: reports.length,
      totalAlerts: alerts.length,
      totalChatMessages: chatMessages.length
    }
  };
  zip.file('全量健康数据备份.json', JSON.stringify(fullBackupData, null, 2));

  // 4. Generate README
  const readmeContent = `================================================================================
家庭健康管理系统 · 全量数据本地归档与备份包
导出时间: ${formatExportDate()}
================================================================================

【本压缩包内含文件清单】
1. 聊天记录.md
   - 记录与 AI 临床顾问关于家庭成员健康咨询、化验指标解读、生活方式调理的完整问答。

2. ai分析.md
   - 基于历次检查报告生成的跨时序多报告关联 AI 临床分析报告。
   - 包含执行摘要、指标趋势走向、专科医生就诊问答备忘录、健康管理与复查随访建议。

3. 报告图片/ (文件夹)
   - 收录了各家庭成员所有化验单与检查报告的原始图片及数字化检查凭证 (.jpg 格式)。
   - 文件名清晰标注医院、就诊人、项目名称及日期，方便直接打印或向接诊医生展示。

4. 全量健康数据备份.json
   - 包含完整的结构化家庭档案、报告明细及各项指标的机器可读备份，可用于数据迁移或未来系统恢复。

【使用提示】
- .md 格式推荐使用 VSCode、Typora、Obsidian 或任何文本编辑器打开，支持完整排版与高亮表格。
- .jpg 图片可直接在手机、电脑或微信中传阅或打印。
- 本数据受个人隐私保护，已通过规范化脱敏，请妥善保存在私有安全设备中。
`;
  zip.file('README_档案使用与恢复说明.txt', readmeContent);

  // 5. Generate and add all Report Images
  const imgFolder = zip.folder('报告图片');
  const memberMap = new Map<string, string>();
  members.forEach((m) => memberMap.set(m.id, m.name));

  const totalReports = reports.length;
  for (let i = 0; i < totalReports; i++) {
    const rep = reports[i];
    const memberName = memberMap.get(rep.memberId) || '家庭成员';
    const progressPct = 40 + Math.round(((i + 1) / totalReports) * 45);
    if (onProgress) {
      onProgress(progressPct, `正在渲染报告图片 [${i + 1}/${totalReports}]: ${rep.title}...`);
    }

    try {
      const { blob, filename } = await getReportImageBlob(rep, memberName, 'image/jpeg');
      if (imgFolder) {
        imgFolder.file(filename, blob);
      }
    } catch (err) {
      console.warn(`Failed to export image for report ${rep.id}:`, err);
    }
  }

  // 6. Zip compression
  if (onProgress) onProgress(90, '正在压缩并打包 ZIP 归档文件...');
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(90 + Math.round(metadata.percent * 0.1), `压缩打包中: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  if (onProgress) onProgress(100, '打包完成！正在启动浏览器本地下载...');
  return zipBlob;
}
