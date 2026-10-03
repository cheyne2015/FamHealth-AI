export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  gender: 'female' | 'male';
  bloodType?: string;
  tags: string[];
  avatarColor: string;
  healthStatusSummary: string;
}

export type ReportCategory =
  | '超声影像'
  | '血生化与激素'
  | '染色体与遗传学'
  | '常规体检'
  | '精液与生殖专科'
  | '其他化验';

export interface IndicatorItem {
  id: string;
  name: string;
  standardKey: string; // e.g. "TSH", "HCG", "PROGESTERONE", "EOSINOPHILS_PCT", "VITAMIN_D", "YOLK_SAC", "EMBRYO_CRL"
  value: number | string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'warning' | 'critical' | 'info';
  clinicalNote?: string;
  differenceFromPrev?: {
    prevDate: string;
    prevValue: number | string;
    diffNumber?: number;
    pctChange?: number;
    trend: 'up' | 'down' | 'stable';
    isAnomaly: boolean;
    anomalyReason?: string;
  };
}

export interface MedicalReport {
  id: string;
  memberId: string;
  title: string;
  hospital: string;
  date: string; // YYYY-MM-DD
  gestationalAge?: string; // e.g. "孕7周+1天" (if applicable)
  category: ReportCategory;
  tags: string[];
  summary: string;
  keyFindings: string[];
  indicators: IndicatorItem[];
  doctorAdvice?: string;
  aiInsights?: string;
  originalImagePlaceholder?: string;
  imageUrl?: string;
  imageUrls?: string[];
  department?: string;
}

export interface AnomalyAlert {
  id: string;
  memberId: string;
  indicatorKey: string;
  indicatorName: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  clinicalSignificance: string;
  actionAdvice: string;
  historicalPoints: {
    date: string;
    value: string;
  }[];
}

export interface IndicatorTrendSeries {
  key: string;
  name: string;
  unit: string;
  standardRangeText: string;
  standardMin?: number;
  standardMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  description: string;
  dataPoints: {
    date: string;
    timestamp: number;
    value: number;
    displayValue: string;
    reportId: string;
    reportTitle: string;
    status: 'normal' | 'warning' | 'critical';
    note?: string;
  }[];
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  relatedMemberName?: string;
  relatedIndicator?: string;
  memberId?: string;
  createdAt?: string;
  imageUrl?: string;
  imageFileName?: string;
  audioUrl?: string;
  audioDuration?: number;
  source?: string;
}

export interface HealthMilestone {
  id: string;
  memberId: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  category: '复查' | '门诊' | '检查' | '健康里程碑' | '用药随访';
  status: 'pending' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  clinicalNote: string;
  hospital?: string;
  completedAt?: string;
}

export interface MedicationScheduleItem {
  id: string;
  memberId: string;
  name: string;
  dosage: string;
  timing: '清晨空腹' | '随早餐/午餐' | '随晚餐' | '睡前' | '随正餐';
  purpose: string;
  active: boolean;
  historyCheckDates?: string[]; // array of YYYY-MM-DD that were checked
}

export interface MedicationChangeItem {
  drugName: string;
  action: '维持' | '加量' | '减量' | '新增' | '停药';
  dosage: string;
  timing: string;
  reasonOrCaution: string;
}

export interface ClinicalVoiceMemo {
  id: string;
  memberId: string;
  date: string;
  hospital: string;
  department: string;
  doctorName?: string;
  rawTranscript: string;
  audioDurationSeconds?: number;
  // AI-structured findings
  chiefComplaint: string;
  diagnosisSummary: string;
  medicationChanges: MedicationChangeItem[];
  followUpPlan: {
    recommendedDateText: string;
    targetItems: string[];
    actionableReminderDate?: string; // YYYY-MM-DD
    instructions: string;
  };
  lifestyleAdvices: string[];
  doctorKeyQuotes: string[];
  syncedToMilestones?: boolean;
}
