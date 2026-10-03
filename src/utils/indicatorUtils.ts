import { MedicalReport, IndicatorItem, AnomalyAlert } from '../types';

/**
 * Maps raw indicator names, abbreviations, and hospital sheet strings
 * to a unified canonical key (e.g. "PRL", "TSH", "PROGESTERONE", "E2").
 */
export function canonicalizeIndicatorKey(rawKey?: string, name?: string): string {
  const text = ((rawKey || '') + ' ' + (name || '')).toUpperCase();

  // 1. Prolactin / 泌乳素
  if (/泌乳素|催乳素|高催乳素|PROLACTIN|\bPRL\b/.test(text)) return 'PRL';

  // 2. Thyroid TSH, FT4, FT3, TPOAb
  if (/促甲状腺|甲状腺刺激素|\bTSH\b/.test(text)) return 'TSH';
  if (/游离甲状腺素|游离T4|\bFT4\b/.test(text)) return 'FT4';
  if (/游离三碘甲状腺原氨酸|游离T3|\bFT3\b/.test(text)) return 'FT3';
  if (/过氧化物酶抗体|\bTPO[-_]?AB\b/.test(text)) return 'TPO_AB';

  // 3. Progesterone / 孕酮
  if ((/孕酮|黄体酮|PROGESTERONE|\bPROG\b|\bP\b/.test(text)) && !/黄体生成素|促黄体|\bLH\b/.test(text)) {
    return 'PROGESTERONE';
  }

  // 4. Estradiol / 雌二醇
  if (/雌二醇|雌激素|ESTRADIOL|\bE2\b/.test(text)) return 'E2';

  // 5. Luteinizing Hormone / 黄体生成素
  if (/黄体生成素|促黄体生成素|促黄体素|\bLH\b/.test(text)) return 'LH';

  // 6. Follicle Stimulating Hormone / 卵泡刺激素
  if (/卵泡刺激素|促卵泡生成素|促卵泡素|\bFSH\b/.test(text)) return 'FSH';

  // 7. Testosterone / 睾酮
  if (/睾酮|总睾酮|游离睾酮|TESTOSTERONE|\bTESTO\b|\bT\b/.test(text)) return 'TESTOSTERONE';

  // 8. Eosinophils / 嗜酸性粒细胞
  if (/嗜酸(?:性)?粒细胞|EOSINOPHILS|\bEOS%?\b/.test(text)) return 'EOSINOPHILS_PCT';

  // 9. Vitamin D / 25-羟基维生素D
  if (/25-羟基|维生素D|VITAMIN[-_ ]?D|\b25-?OH-?VD\b/.test(text)) return 'VITAMIN_D';

  // 10. HCG
  if (/人绒毛膜|绒毛膜促性腺|\bHCG\b|\bBETA-HCG\b/.test(text)) return 'HCG';

  // 11. Semen
  if (/精子DNA碎片率|碎片率|\bSDF\b|\bDFI\b/.test(text)) return 'SPERM_SDF';
  if (/前向运动精子率|前向运动|\bPR%?\b/.test(text)) return 'SPERM_PR';
  if (/精子浓度|\bSPERM_CONC\b/.test(text)) return 'SPERM_CONC';
  if (/精液量|\bSPERM_VOL\b/.test(text)) return 'SPERM_VOL';

  // 12. Ultrasound & Pregnancy
  if (/卵黄囊|\bYOLK_SAC\b|\bYS\b/.test(text)) return 'YOLK_SAC';
  if (/头臀长|\bEMBRYO_CRL\b|\bCRL\b/.test(text)) return 'EMBRYO_CRL';
  if (/胎心率|\bFETAL_HEART_RATE\b|\bFHR\b/.test(text)) return 'FETAL_HEART_RATE';
  if (/胎心|\bFETAL_HEART\b/.test(text)) return 'FETAL_HEART';
  if (/孕囊|\bGESTATIONAL_SAC\b|\bGS\b/.test(text)) return 'GESTATIONAL_SAC';
  if (/内膜厚度|子宫内膜|\bENDOMETRIUM\b|\bEM\b/.test(text)) return 'ENDOMETRIAL_THICKNESS';

  // 13. Genetics
  if (/染色体|核型|\bKARYOTYPE\b/.test(text)) return 'KARYOTYPE';
  if (/CMA|微阵列|\bGENETIC_CMA\b/.test(text)) return 'GENETIC_CMA';

  // 14. Allergy
  if (/总IGE|\bTOTAL_IGE\b|\bIGE\b/.test(text)) return 'TOTAL_IGE';

  // Fallback: clean key
  return (rawKey || name || '').trim();
}

/**
 * Returns human-readable display title for an indicator key
 */
export function getIndicatorDisplayName(key: string, fallbackName?: string): string {
  const map: Record<string, string> = {
    PRL: '泌乳素 (PRL)',
    TSH: '促甲状腺激素 (TSH)',
    FT4: '游离甲状腺素 (FT4)',
    FT3: '游离三碘甲状腺原氨酸 (FT3)',
    TPO_AB: '甲状腺过氧化物酶抗体 (TPO-Ab)',
    PROGESTERONE: '孕酮 (P)',
    E2: '雌二醇 (E2)',
    LH: '黄体生成素 (LH)',
    FSH: '卵泡刺激素 (FSH)',
    TESTOSTERONE: '睾酮 (T)',
    EOSINOPHILS_PCT: '嗜酸性粒细胞比例 (EOS%)',
    VITAMIN_D: '25-羟基维生素D (25-OH-VD)',
    HCG: '人绒毛膜促性腺激素 (HCG)',
    SPERM_SDF: '精子DNA碎片率 (SDF)',
    SPERM_PR: '前向运动精子率 (PR)',
    SPERM_CONC: '精子浓度',
    SPERM_VOL: '精液量',
    KARYOTYPE: '外周血染色体核型',
    YOLK_SAC: '超声卵黄囊直径 (YS)',
    EMBRYO_CRL: '胚芽头臀长 (CRL)',
    FETAL_HEART_RATE: '胎心率 (FHR)',
    ENDOMETRIAL_THICKNESS: '子宫内膜厚度',
    TOTAL_IGE: '血清总IgE'
  };

  return map[key] || fallbackName || key;
}

/**
 * Safely parse a numeric value from string or number
 */
export function parseIndicatorNumericValue(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  if (!value) return undefined;
  const str = String(value).trim();
  // Strip flags like ↑, ↓, (偏高), (高危), etc.
  const cleanStr = str.replace(/[↑↓]/g, '').trim();
  const match = cleanStr.match(/^[<>]?\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

/**
 * Automatically calculates differenceFromPrev and trends across a member's reports.
 */
export function enrichReportsWithCrossComparisons(reports: MedicalReport[]): MedicalReport[] {
  if (!reports || reports.length === 0) return [];

  // Sort ascending by date to calculate historical progression
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Track the most recent record of each canonical indicator
  const lastSeenMap = new Map<
    string,
    {
      date: string;
      value: number | string;
      numericValue?: number;
      hospital: string;
    }
  >();

  const enrichedSorted = sortedReports.map((report) => {
    const enrichedIndicators: IndicatorItem[] = report.indicators.map((ind) => {
      const canonicalKey = canonicalizeIndicatorKey(ind.standardKey, ind.name);
      const numVal = ind.numericValue ?? parseIndicatorNumericValue(ind.value);

      // Check if status is abnormal by text flag or value
      let status = ind.status;
      const valStr = String(ind.value);
      if (valStr.includes('↑') || valStr.includes('偏高') || valStr.includes('阳性') || valStr.includes('超标')) {
        if (status === 'normal') status = 'warning';
      }

      // Check PRL specifically (upper limit 30.7)
      if (canonicalKey === 'PRL' && numVal !== undefined) {
        if (numVal > 30.7) {
          status = numVal > 50 ? 'critical' : 'warning';
        }
      }

      const prev = lastSeenMap.get(canonicalKey);
      let differenceFromPrev: IndicatorItem['differenceFromPrev'] = ind.differenceFromPrev;

      if (prev && numVal !== undefined && prev.numericValue !== undefined && prev.date !== report.date) {
        const diffNumber = Math.round((numVal - prev.numericValue) * 1000) / 1000;
        const pctChange = prev.numericValue !== 0 ? Math.round(((numVal - prev.numericValue) / prev.numericValue) * 1000) / 10 : 0;
        const trend = diffNumber > 0.001 ? 'up' : diffNumber < -0.001 ? 'down' : 'stable';
        const isAnomaly = status === 'warning' || status === 'critical' || Math.abs(pctChange) >= 40;

        let anomalyReason = '';
        if (trend === 'up') {
          anomalyReason = `较前次数值上涨 +${diffNumber}`;
        } else if (trend === 'down') {
          anomalyReason = `较前次数值回落 -${Math.abs(diffNumber)}`;
        } else {
          anomalyReason = '数值相对平稳保持';
        }

        differenceFromPrev = {
          prevDate: prev.date,
          prevValue: prev.value,
          diffNumber,
          pctChange,
          trend,
          isAnomaly,
          anomalyReason
        };
      }

      // Update last seen if date is current
      lastSeenMap.set(canonicalKey, {
        date: report.date,
        value: ind.value,
        numericValue: numVal,
        hospital: report.hospital
      });

      return {
        ...ind,
        standardKey: canonicalKey,
        numericValue: numVal,
        status,
        differenceFromPrev
      };
    });

    return {
      ...report,
      indicators: enrichedIndicators
    };
  });

  // Preserve the user's expected sorting (or original reference array)
  return enrichedSorted;
}

/**
 * Dynamically synthesizes Anomaly Alerts for all abnormal indicators
 * across a member's clinical reports.
 */
export function synthesizeAnomalyAlerts(
  reports: MedicalReport[],
  existingAlerts: AnomalyAlert[] = [],
  memberId: string
): AnomalyAlert[] {
  const result: AnomalyAlert[] = [...existingAlerts];

  if (!reports || reports.length === 0) return result;

  // Group abnormal points by canonical key
  const abnormalKeyMap = new Map<
    string,
    Array<{
      date: string;
      value: string;
      numericValue?: number;
      status: 'warning' | 'critical';
      reportTitle: string;
      hospital: string;
      name: string;
    }>
  >();

  for (const rep of reports) {
    if (rep.memberId !== memberId && memberId !== 'all') continue;

    for (const ind of rep.indicators) {
      const canonical = canonicalizeIndicatorKey(ind.standardKey, ind.name);
      const isAbnormal =
        ind.status === 'warning' ||
        ind.status === 'critical' ||
        String(ind.value).includes('↑') ||
        (canonical === 'PRL' && (ind.numericValue ?? 0) > 30.7);

      if (isAbnormal) {
        if (!abnormalKeyMap.has(canonical)) {
          abnormalKeyMap.set(canonical, []);
        }
        abnormalKeyMap.get(canonical)!.push({
          date: rep.date,
          value: `${ind.value} ${ind.unit || ''}`.trim(),
          numericValue: ind.numericValue ?? parseIndicatorNumericValue(ind.value),
          status: ind.status === 'critical' ? 'critical' : 'warning',
          reportTitle: rep.title,
          hospital: rep.hospital,
          name: ind.name
        });
      }
    }
  }

  // Generate or update alerts for keys with abnormalities
  abnormalKeyMap.forEach((points, key) => {
    // Sort points by date ascending
    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = points[points.length - 1];
    const isMultiReport = points.length > 1;

    // Check if an alert already exists for this indicator
    const existingIdx = result.findIndex(
      (a) =>
        (a.memberId === memberId || a.memberId === 'all') &&
        (canonicalizeIndicatorKey(a.indicatorKey, a.indicatorName) === key || a.indicatorKey === key)
    );

    let title = '';
    let description = '';
    let clinicalSignificance = '';
    let actionAdvice = '';
    let severity: 'high' | 'medium' | 'low' = latest.status === 'critical' || points.length >= 2 ? 'high' : 'medium';

    if (key === 'TG') {
      title = isMultiReport
        ? `【甘油三酯 (TG)】多次检验偏高 (生活干预管理)`
        : `【甘油三酯 (TG)】单次化验超出标准上限 (${latest.value})`;
      description = `甘油三酯最新测定值为 ${latest.value} mmol/L (参考范围 0.45 - 1.70 mmol/L)。`;
      clinicalSignificance = '甘油三酯是血脂代谢的核心指标，偏高常与高脂膳食、缺乏运动或代谢负担相关。';
      actionAdvice = '建议清淡饮食、减少精制糖与高油食物，坚持每周有氧运动并定期复查血脂四项。';
      severity = 'medium';
    } else if (key === 'ALT') {
      title = isMultiReport
        ? `【谷丙转氨酶 (ALT)】连续偏离正常基线`
        : `【谷丙转氨酶 (ALT)】单次检测轻度偏高 (${latest.value})`;
      description = `谷丙转氨酶最新测定值为 ${latest.value} U/L (参考范围 9 - 50 U/L)。`;
      clinicalSignificance = '反映肝细胞代谢负荷的最敏感生物标志物，波动常与作息疲劳或脂肪浸润相关。';
      actionAdvice = '建议规律作息避免熬夜，合理饮食并适度运动，适时安排复查以观察恢复走势。';
      severity = 'medium';
    } else if (key === 'TSH') {
      title = `【促甲状腺激素 (TSH)】偏离正常参考范围`;
      description = `促甲状腺激素最新值为 ${latest.value}。临床建议控制在标准参考区间 (0.27 - 4.20 mIU/L) 内。`;
      clinicalSignificance = '甲状腺激素是人体基础代谢与内分泌调节的关键指标，偏高常提示亚临床甲状腺功能减退倾向。';
      actionAdvice = '建议内分泌专科复查甲功三项与自身抗体，遵医嘱定期随访评估。';
      severity = 'medium';
    } else {
      const displayName = getIndicatorDisplayName(key, latest.name);
      title = isMultiReport
        ? `【${displayName}】连续多次检测异常 (${latest.value})`
        : `【${displayName}】检测值偏离正常基线 (${latest.value})`;
      description = `化验单显示 ${displayName} 处于 ${latest.status === 'critical' ? '显著异常' : '偏离警戒'} 状态，最新测定值为 ${latest.value}。`;
      clinicalSignificance = '该指标偏离提示机体处于亚临床代谢负荷或内分泌指标波动状态。';
      actionAdvice = '建议遵医嘱安排定期复查，并结合同期的其他临床指标综合判断。';
    }

    const historicalPoints = points.map((p) => ({
      date: p.date,
      value: p.value
    }));

    const newAlert: AnomalyAlert = {
      id: `dynamic-alert-${memberId}-${key.toLowerCase()}`,
      memberId,
      indicatorKey: key,
      indicatorName: getIndicatorDisplayName(key, latest.name),
      date: latest.date,
      severity,
      title,
      description,
      clinicalSignificance,
      actionAdvice,
      historicalPoints
    };

    if (existingIdx >= 0) {
      result[existingIdx] = {
        ...result[existingIdx],
        ...newAlert,
        id: result[existingIdx].id
      };
    } else {
      result.unshift(newAlert);
    }
  });

  return result;
}
