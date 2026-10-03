import { FamilyMember, MedicalReport, AnomalyAlert, IndicatorTrendSeries, HealthMilestone, MedicationScheduleItem } from '../types';

export const initialFamilyMembers: FamilyMember[] = [
  {
    id: 'member-1',
    name: '张先生',
    relationship: '本人',
    age: 42,
    gender: 'male',
    bloodType: 'A型',
    tags: ['血脂代谢管理', '轻度脂肪肝随访', '心血管健康', '规律作息'],
    avatarColor: 'from-blue-600 to-indigo-700',
    healthStatusSummary: '近期体检发现甘油三酯轻度偏高(2.45 mmol/L)及轻度脂肪肝，经过3个月饮食运动健康干预复查指标显著改善(回落至1.82 mmol/L)，肝肾功能与空腹血糖均维持良好状态。'
  },
  {
    id: 'member-2',
    name: '李女士',
    relationship: '配偶',
    age: 39,
    gender: 'female',
    bloodType: 'B型',
    tags: ['甲状腺健康管理', '维生素D充足', '年度常规体检', '内分泌代谢'],
    avatarColor: 'from-teal-600 to-emerald-700',
    healthStatusSummary: '促甲状腺激素(TSH)曾出现一过性轻度偏高(4.86 mIU/L)，抗体阴性，随访复查已完全降至2.15 mIU/L正常范围；维生素D储备经合理补充提升至34.2 ng/ml达到充足标准。'
  },
  {
    id: 'member-3',
    name: '张子睿',
    relationship: '儿子',
    age: 10,
    gender: 'male',
    bloodType: 'A型',
    tags: ['学龄期体检', '生长发育良好', '视力健康随访'],
    avatarColor: 'from-amber-500 to-orange-600',
    healthStatusSummary: '身高体重发育百分位均处于正常健康P50-P75区间，血常规红细胞及血色素指标良好无贫血征象，微量元素充足，轻度近视倾向已建立定期验光档案。'
  }
];

export const initialMedicalReports: MedicalReport[] = [
  // --- 张先生 (member-1) 报告记录 ---
  {
    id: 'rep-m1-2024-05-18',
    memberId: 'member-1',
    title: '年度全面综合健康体检报告',
    hospital: '第一人民医院健康管理中心',
    date: '2024-05-18',
    category: '血生化与激素',
    tags: ['年度体检', '肝功能', '血脂四项', '血糖代谢', '肾功能'],
    summary: '体检生化检查提示甘油三酯偏高 (2.45 mmol/L)，谷丙转氨酶 (ALT 58 U/L) 轻度偏高，提示存在代谢负担与脂质浸润倾向；空腹血糖、肾功能及心电图正常。',
    keyFindings: [
      '甘油三酯 (TG): 2.45 mmol/L (轻度偏高，参考区间 0.45 - 1.70)',
      '谷丙转氨酶 (ALT): 58 U/L (轻度偏高，参考区间 9 - 50)',
      '空腹血糖 (FBG): 5.42 mmol/L (处于正常范围 3.90 - 6.10)',
      '总胆固醇 (TC): 5.12 mmol/L (正常)',
      '血肌酐 (CREA): 82 umol/L (正常)'
    ],
    indicators: [
      {
        id: 'ind-m1-1',
        name: '甘油三酯 (TG)',
        standardKey: 'TG',
        value: 2.45,
        numericValue: 2.45,
        unit: 'mmol/L',
        referenceRange: '0.45 - 1.70',
        status: 'warning',
        clinicalNote: '轻度偏高，常与高热量饮食或缺乏运动相关，建议低脂膳食配合每周有氧运动。'
      },
      {
        id: 'ind-m1-2',
        name: '谷丙转氨酶 (ALT)',
        standardKey: 'ALT',
        value: 58,
        numericValue: 58,
        unit: 'U/L',
        referenceRange: '9 - 50',
        status: 'warning',
        clinicalNote: '轻度偏高，反映肝实质轻度代谢负担，常与脂肪肝或作息疲劳相关。'
      },
      {
        id: 'ind-m1-3',
        name: '总胆固醇 (TC)',
        standardKey: 'TC',
        value: 5.12,
        numericValue: 5.12,
        unit: 'mmol/L',
        referenceRange: '2.80 - 5.70',
        status: 'normal',
        clinicalNote: '数值正常。'
      },
      {
        id: 'ind-m1-4',
        name: '谷草转氨酶 (AST)',
        standardKey: 'AST',
        value: 35,
        numericValue: 35,
        unit: 'U/L',
        referenceRange: '15 - 40',
        status: 'normal',
        clinicalNote: '处于正常范围。'
      },
      {
        id: 'ind-m1-5',
        name: '空腹血糖 (FBG)',
        standardKey: 'FBG',
        value: 5.42,
        numericValue: 5.42,
        unit: 'mmol/L',
        referenceRange: '3.90 - 6.10',
        status: 'normal',
        clinicalNote: '基础空腹血糖正常。'
      },
      {
        id: 'ind-m1-6',
        name: '血肌酐 (CREA)',
        standardKey: 'CREA',
        value: 82,
        numericValue: 82,
        unit: 'umol/L',
        referenceRange: '57 - 111',
        status: 'normal',
        clinicalNote: '肾功能排泄指标正常。'
      }
    ],
    doctorAdvice: '建议调整饮食结构，控制高脂高糖摄入，增加每周规律有氧运动3-4次，建议3个月后复查血脂四项及肝功能。'
  },
  {
    id: 'rep-m1-2024-05-20',
    memberId: 'member-1',
    title: '腹部多普勒彩色超声检查报告',
    hospital: '市医学影像诊断中心',
    date: '2024-05-20',
    category: '超声影像',
    tags: ['腹部彩超', '肝胆胰脾肾', '轻度脂肪肝'],
    summary: '超声提示肝内实质回声细密增强，深部回声轻度衰减，肝内管道结构清晰，符合轻度脂肪肝声像表现；胆囊壁光滑未见结石，胰腺、脾脏及双肾声像未见异常。',
    keyFindings: [
      '肝脏大小形态正常，实质回声增强细密，提示轻度脂肪浸润',
      '门静脉主干内径 1.1 cm (正常)',
      '胆囊腔内透声好，胆囊壁厚 0.2 cm 未见明显结石',
      '脾脏厚度 3.2 cm (正常上限 4.0 cm)',
      '双肾集合系统未见分离及占位'
    ],
    indicators: [
      {
        id: 'ind-m1-us1',
        name: '肝脏实质声像',
        standardKey: 'LIVER_ECHO',
        value: '轻度增强',
        unit: '',
        referenceRange: '均匀细致',
        status: 'warning',
        clinicalNote: '声像符合轻度脂肪肝，属于可逆性代谢变化。'
      },
      {
        id: 'ind-m1-us2',
        name: '门静脉主干内径',
        standardKey: 'PORTAL_VEIN',
        value: 1.1,
        numericValue: 1.1,
        unit: 'cm',
        referenceRange: '0.8 - 1.4',
        status: 'normal',
        clinicalNote: '门脉管径与血流动力正常。'
      },
      {
        id: 'ind-m1-us3',
        name: '脾脏厚度',
        standardKey: 'SPLEEN_THICKNESS',
        value: 3.2,
        numericValue: 3.2,
        unit: 'cm',
        referenceRange: '< 4.0',
        status: 'normal',
        clinicalNote: '脾脏无肿大。'
      }
    ],
    doctorAdvice: '轻度脂肪浸润为生活方式相关良性病变，加强运动及控制体重即可逐渐逆转，建议定期年度超声复查。'
  },
  {
    id: 'rep-m1-2024-08-25',
    memberId: 'member-1',
    title: '血脂与肝功能健康干预复查',
    hospital: '第一人民医院内科门诊',
    date: '2024-08-25',
    category: '血生化与激素',
    tags: ['干预成效', '甘油三酯回落', 'ALT恢复', '代谢复查'],
    summary: '生活方式干预3个月后复查：甘油三酯由 2.45 降至 1.82 mmol/L (较前次显著回落)，谷丙转氨酶(ALT)由 58 降至 32 U/L 完全恢复至正常范围，生活干预成效显著。',
    keyFindings: [
      '甘油三酯 (TG): 1.82 mmol/L (由2.45显著回落，接近正常上限)',
      '谷丙转氨酶 (ALT): 32 U/L (完全降至正常范围，肝酶平稳)',
      '谷草转氨酶 (AST): 24 U/L (稳定于良好范围)',
      '空腹血糖 (FBG): 5.18 mmol/L (维持平稳)'
    ],
    indicators: [
      {
        id: 'ind-m1-7',
        name: '甘油三酯 (TG)',
        standardKey: 'TG',
        value: 1.82,
        numericValue: 1.82,
        unit: 'mmol/L',
        referenceRange: '0.45 - 1.70',
        status: 'warning',
        clinicalNote: '显著回落，已接近正常上限，继续保持健康干预。',
        differenceFromPrev: {
          prevDate: '2024-05-18',
          prevValue: 2.45,
          diffNumber: -0.63,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -0.63'
        }
      },
      {
        id: 'ind-m1-8',
        name: '谷丙转氨酶 (ALT)',
        standardKey: 'ALT',
        value: 32,
        numericValue: 32,
        unit: 'U/L',
        referenceRange: '9 - 50',
        status: 'normal',
        clinicalNote: '完全恢复至正常标准区间。',
        differenceFromPrev: {
          prevDate: '2024-05-18',
          prevValue: 58,
          diffNumber: -26,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -26'
        }
      },
      {
        id: 'ind-m1-9',
        name: '谷草转氨酶 (AST)',
        standardKey: 'AST',
        value: 24,
        numericValue: 24,
        unit: 'U/L',
        referenceRange: '15 - 40',
        status: 'normal',
        clinicalNote: '正常。',
        differenceFromPrev: {
          prevDate: '2024-05-18',
          prevValue: 35,
          diffNumber: -11,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -11'
        }
      },
      {
        id: 'ind-m1-10',
        name: '空腹血糖 (FBG)',
        standardKey: 'FBG',
        value: 5.18,
        numericValue: 5.18,
        unit: 'mmol/L',
        referenceRange: '3.90 - 6.10',
        status: 'normal',
        clinicalNote: '血糖保持平稳。',
        differenceFromPrev: {
          prevDate: '2024-05-18',
          prevValue: 5.42,
          diffNumber: -0.24,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -0.24'
        }
      }
    ],
    doctorAdvice: '代谢指标改善明显，继续维持目前每周规律运动和健康低脂膳食，计划年底进行年度巩固复查。'
  },
  {
    id: 'rep-m1-2024-11-30',
    memberId: 'member-1',
    title: '健康代谢年度巩固随访检查',
    hospital: '第一人民医院健康管理中心',
    date: '2024-11-30',
    category: '血生化与激素',
    tags: ['年度巩固', '血脂完全达标', '代谢良好'],
    summary: '甘油三酯进一步降至 1.58 mmol/L 进入理想正常范围，ALT 持续稳定在 28 U/L，各项生化代谢指标全面达标。',
    keyFindings: [
      '甘油三酯 (TG): 1.58 mmol/L (全面进入理想正常范围)',
      '谷丙转氨酶 (ALT): 28 U/L (保持稳定正常)',
      '空腹血糖 (FBG): 5.10 mmol/L (正常理想)'
    ],
    indicators: [
      {
        id: 'ind-m1-11',
        name: '甘油三酯 (TG)',
        standardKey: 'TG',
        value: 1.58,
        numericValue: 1.58,
        unit: 'mmol/L',
        referenceRange: '0.45 - 1.70',
        status: 'normal',
        clinicalNote: '已完全进入正常范围，干预效果持久。',
        differenceFromPrev: {
          prevDate: '2024-08-25',
          prevValue: 1.82,
          diffNumber: -0.24,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -0.24'
        }
      },
      {
        id: 'ind-m1-12',
        name: '谷丙转氨酶 (ALT)',
        standardKey: 'ALT',
        value: 28,
        numericValue: 28,
        unit: 'U/L',
        referenceRange: '9 - 50',
        status: 'normal',
        clinicalNote: '持续正常。',
        differenceFromPrev: {
          prevDate: '2024-08-25',
          prevValue: 32,
          diffNumber: -4,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -4'
        }
      },
      {
        id: 'ind-m1-13',
        name: '空腹血糖 (FBG)',
        standardKey: 'FBG',
        value: 5.10,
        numericValue: 5.10,
        unit: 'mmol/L',
        referenceRange: '3.90 - 6.10',
        status: 'normal',
        clinicalNote: '正常。',
        differenceFromPrev: {
          prevDate: '2024-08-25',
          prevValue: 5.18,
          diffNumber: -0.08,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -0.08'
        }
      }
    ],
    doctorAdvice: '代谢健康指标已全面转归良好，建议保持健康生活方式，次年定期体检即可。'
  },

  // --- 李女士 (member-2) 报告记录 ---
  {
    id: 'rep-m2-2024-06-10',
    memberId: 'member-2',
    title: '年度全面综合健康体检报告',
    hospital: '同仁体检医学中心',
    date: '2024-06-10',
    category: '血生化与激素',
    tags: ['年度体检', '甲功五项', '维生素D储备', '血常规'],
    summary: '体检发现促甲状腺激素 (TSH) 4.86 mIU/L 轻度高于参考上限 (4.20)，25-羟基维生素D 为 18.5 ng/ml 提示体内储备不足；血常规五分类、肝肾功能与空腹血糖均正常。',
    keyFindings: [
      '促甲状腺激素 (TSH): 4.86 mIU/L (轻度偏高，参考区间 0.27 - 4.20)',
      '游离甲状腺素 (FT4): 15.2 pmol/L (处于正常区间 12.0 - 22.0)',
      '25-羟基维生素D: 18.5 ng/ml (轻度不足，充足标准应 ≥ 30 ng/ml)',
      '空腹血糖 (FBG): 4.95 mmol/L (正常)'
    ],
    indicators: [
      {
        id: 'ind-m2-1',
        name: '促甲状腺激素 (TSH)',
        standardKey: 'TSH',
        value: 4.86,
        numericValue: 4.86,
        unit: 'mIU/L',
        referenceRange: '0.27 - 4.20',
        status: 'warning',
        clinicalNote: '轻度高于上限，游离甲状腺素(FT4)正常，考虑亚临床生理轻度波动，建议择期复查确认。'
      },
      {
        id: 'ind-m2-2',
        name: '游离甲状腺素 (FT4)',
        standardKey: 'FT4',
        value: 15.2,
        numericValue: 15.2,
        unit: 'pmol/L',
        referenceRange: '12.0 - 22.0',
        status: 'normal',
        clinicalNote: '甲状腺素生物活性水平正常。'
      },
      {
        id: 'ind-m2-3',
        name: '游离三碘甲状腺原氨酸 (FT3)',
        standardKey: 'FT3',
        value: 4.6,
        numericValue: 4.6,
        unit: 'pmol/L',
        referenceRange: '3.1 - 6.8',
        status: 'normal',
        clinicalNote: '处于正常范围。'
      },
      {
        id: 'ind-m2-4',
        name: '25-羟基维生素D (25-OH-VD)',
        standardKey: 'VD',
        value: 18.5,
        numericValue: 18.5,
        unit: 'ng/ml',
        referenceRange: '30 - 100',
        status: 'warning',
        clinicalNote: '储备不足，建议每日补充维生素D3滴剂1000-2000单位并适当增加户外日照。'
      },
      {
        id: 'ind-m2-5',
        name: '空腹血糖 (FBG)',
        standardKey: 'FBG',
        value: 4.95,
        numericValue: 4.95,
        unit: 'mmol/L',
        referenceRange: '3.90 - 6.10',
        status: 'normal',
        clinicalNote: '正常。'
      }
    ],
    doctorAdvice: 'TSH轻度偏高可先观察，排查自身免疫抗体；建议补充维生素D，2-3个月后复查甲功三项与抗体。'
  },
  {
    id: 'rep-m2-2024-06-12',
    memberId: 'member-2',
    title: '甲状腺及颈部淋巴结彩超报告',
    hospital: '同仁体检医学中心',
    date: '2024-06-12',
    category: '超声影像',
    tags: ['甲状腺彩超', 'TI-RADS 1类', '实质回声均匀'],
    summary: '超声检查显示甲状腺双侧叶大小形态正常，腺体实质回声均匀，彩色多普勒血流信号正常，未见明显囊性或实性结节病灶；颈部未探及异常增大淋巴结。',
    keyFindings: [
      '甲状腺左叶厚度 1.4 cm，右叶厚度 1.5 cm，峡部厚度 0.3 cm (形态正常)',
      '腺体内部回声均匀分布，未见局灶性占位',
      'TI-RADS 1 类（正常甲状腺声像）'
    ],
    indicators: [
      {
        id: 'ind-m2-us1',
        name: '甲状腺左叶厚度',
        standardKey: 'THYROID_L',
        value: 1.4,
        numericValue: 1.4,
        unit: 'cm',
        referenceRange: '1.0 - 2.0',
        status: 'normal',
        clinicalNote: '形态大小正常。'
      },
      {
        id: 'ind-m2-us2',
        name: '甲状腺右叶厚度',
        standardKey: 'THYROID_R',
        value: 1.5,
        numericValue: 1.5,
        unit: 'cm',
        referenceRange: '1.0 - 2.0',
        status: 'normal',
        clinicalNote: '形态大小正常。'
      },
      {
        id: 'ind-m2-us3',
        name: '结节筛查评估',
        standardKey: 'THYROID_NODULE',
        value: '未见结节',
        unit: '',
        referenceRange: '无异常占位',
        status: 'normal',
        clinicalNote: 'TI-RADS 1类正常声像。'
      }
    ],
    doctorAdvice: '超声形态结构完全健康，无结节及异常占位，无需外科特殊干预。'
  },
  {
    id: 'rep-m2-2024-09-18',
    memberId: 'member-2',
    title: '甲状腺内分泌专科随访复查报告',
    hospital: '第一人民医院内分泌专科',
    date: '2024-09-18',
    category: '血生化与激素',
    tags: ['甲功恢复', 'TSH降至2.15', '抗体阴性', '维生素D达标'],
    summary: '复查显示促甲状腺激素 (TSH) 已自然回落至 2.15 mIU/L (完全恢复至理想黄金区间)，甲状腺过氧化物酶抗体(TPOAb)及球蛋白抗体(TGAb)均为阴性；维生素D上升至 34.2 ng/ml 达标充足。',
    keyFindings: [
      '促甲状腺激素 (TSH): 2.15 mIU/L (由4.86回落恢复正常理想范围)',
      '甲状腺过氧化物酶抗体 (TPOAb): 12.5 IU/mL (阴性，排除自身免疫性甲状腺炎)',
      '甲状腺球蛋白抗体 (TGAb): 18.2 IU/mL (阴性)',
      '25-羟基维生素D: 34.2 ng/ml (升至充足水平)'
    ],
    indicators: [
      {
        id: 'ind-m2-6',
        name: '促甲状腺激素 (TSH)',
        standardKey: 'TSH',
        value: 2.15,
        numericValue: 2.15,
        unit: 'mIU/L',
        referenceRange: '0.27 - 4.20',
        status: 'normal',
        clinicalNote: '完全回落至正常理想标准区间。',
        differenceFromPrev: {
          prevDate: '2024-06-10',
          prevValue: 4.86,
          diffNumber: -2.71,
          trend: 'down',
          isAnomaly: false,
          anomalyReason: '较前次数值回落 -2.71'
        }
      },
      {
        id: 'ind-m2-7',
        name: '游离甲状腺素 (FT4)',
        standardKey: 'FT4',
        value: 16.4,
        numericValue: 16.4,
        unit: 'pmol/L',
        referenceRange: '12.0 - 22.0',
        status: 'normal',
        clinicalNote: '正常。',
        differenceFromPrev: {
          prevDate: '2024-06-10',
          prevValue: 15.2,
          diffNumber: 1.2,
          trend: 'up',
          isAnomaly: false,
          anomalyReason: '较前次数值上涨 +1.2'
        }
      },
      {
        id: 'ind-m2-8',
        name: '甲状腺过氧化物酶抗体 (TPOAb)',
        standardKey: 'TPO_AB',
        value: 12.5,
        numericValue: 12.5,
        unit: 'IU/mL',
        referenceRange: '< 34.0',
        status: 'normal',
        clinicalNote: '抗体阴性，排除桥本氏甲状腺炎。'
      },
      {
        id: 'ind-m2-9',
        name: '甲状腺球蛋白抗体 (TGAb)',
        standardKey: 'TG_AB',
        value: 18.2,
        numericValue: 18.2,
        unit: 'IU/mL',
        referenceRange: '< 115.0',
        status: 'normal',
        clinicalNote: '抗体阴性。'
      },
      {
        id: 'ind-m2-10',
        name: '25-羟基维生素D (25-OH-VD)',
        standardKey: 'VD',
        value: 34.2,
        numericValue: 34.2,
        unit: 'ng/ml',
        referenceRange: '30 - 100',
        status: 'normal',
        clinicalNote: '补充成效显著，已由不足提升至健康充足状态。',
        differenceFromPrev: {
          prevDate: '2024-06-10',
          prevValue: 18.5,
          diffNumber: 15.7,
          trend: 'up',
          isAnomaly: false,
          anomalyReason: '较前次数值上涨 +15.7'
        }
      }
    ],
    doctorAdvice: '内分泌代谢与甲功指标全面恢复优良，抗体阴性，此前波动考虑为生理一过性变化，维生素D已达标，继续保持均衡作息与常规体检。'
  },

  // --- 张子睿 (member-3) 报告记录 ---
  {
    id: 'rep-m3-2024-09-01',
    memberId: 'member-3',
    title: '学龄期儿童青少年健康体检报告',
    hospital: '市儿童健康体检中心',
    date: '2024-09-01',
    category: '常规体检',
    tags: ['开学体检', '生长发育', '血常规', '视力筛查'],
    summary: '体检显示身高体重发育良好符合P50-P75常模标准；血常规红细胞及血色素良好无贫血征象；双眼裸眼视力左眼5.0、右眼4.9，建议注意近距离用眼距离。',
    keyFindings: [
      '身高 142.5 cm (正常标准参考P50为 140.2 cm)',
      '体重 34.8 kg (生长百分位匀称健康)',
      '血红蛋白 (HGB): 132 g/L (处于良好区间 120 - 160 g/L)',
      '白细胞计数 (WBC): 6.4 10^9/L (正常)'
    ],
    indicators: [
      {
        id: 'ind-m3-1',
        name: '身高',
        standardKey: 'HEIGHT',
        value: 142.5,
        numericValue: 142.5,
        unit: 'cm',
        referenceRange: '135 - 146',
        status: 'normal',
        clinicalNote: '发育良好，处于P50-P75健康范围。'
      },
      {
        id: 'ind-m3-2',
        name: '体重',
        standardKey: 'WEIGHT',
        value: 34.8,
        numericValue: 34.8,
        unit: 'kg',
        referenceRange: '30 - 40',
        status: 'normal',
        clinicalNote: '体态匀称，BMI正常。'
      },
      {
        id: 'ind-m3-3',
        name: '血红蛋白 (HGB)',
        standardKey: 'HGB',
        value: 132,
        numericValue: 132,
        unit: 'g/L',
        referenceRange: '120 - 160',
        status: 'normal',
        clinicalNote: '红细胞携氧能力充足，无贫血表现。'
      },
      {
        id: 'ind-m3-4',
        name: '白细胞计数 (WBC)',
        standardKey: 'WBC',
        value: 6.4,
        numericValue: 6.4,
        unit: '10^9/L',
        referenceRange: '4.0 - 10.0',
        status: 'normal',
        clinicalNote: '造血与免疫防线正常。'
      },
      {
        id: 'ind-m3-5',
        name: '血小板计数 (PLT)',
        standardKey: 'PLT',
        value: 245,
        numericValue: 245,
        unit: '10^9/L',
        referenceRange: '100 - 300',
        status: 'normal',
        clinicalNote: '凝血细胞计数正常。'
      }
    ],
    doctorAdvice: '全面生长发育健康良好，建议保持每天至少1-2小时户外自然光运动，防范近距离用眼视力疲劳。'
  }
];

export const initialAlerts: AnomalyAlert[] = [
  {
    id: 'alert-1',
    memberId: 'member-1',
    indicatorKey: 'TG',
    indicatorName: '甘油三酯 (TG)',
    date: '2024-11-30',
    severity: 'low',
    title: '【甘油三酯】生活方式干预后已完全恢复正常',
    description: '历史复查由 2.45 mmol/L 持续改善降至 1.58 mmol/L，已平稳进入正常参考区间。',
    clinicalSignificance: '甘油三酯回落表明肝脏与外周脂质代谢负荷显著缓解，对于改善脂肪浸润及心血管代谢具有积极健康保护作用。',
    actionAdvice: '继续维持规律有氧运动与膳食纤维摄入，巩固干预成效。',
    historicalPoints: [
      { date: '2024-05-18', value: '2.45 mmol/L (偏高)' },
      { date: '2024-08-25', value: '1.82 mmol/L (较前次回落)' },
      { date: '2024-11-30', value: '1.58 mmol/L (正常)' }
    ]
  },
  {
    id: 'alert-2',
    memberId: 'member-2',
    indicatorKey: 'TSH',
    indicatorName: '促甲状腺激素 (TSH)',
    date: '2024-09-18',
    severity: 'low',
    title: '【促甲状腺激素 (TSH)】复查恢复至理想稳定区间',
    description: 'TSH由 4.86 mIU/L 自然恢复至 2.15 mIU/L，抗体检测均为阴性。',
    clinicalSignificance: '甲状腺激素轴调节功能恢复良好，排除自身免疫性甲状腺损伤，支持生理性一过性波动转归。',
    actionAdvice: '保持良好作息，遵医嘱进行常规年度体检随访即可。',
    historicalPoints: [
      { date: '2024-06-10', value: '4.86 mIU/L (轻度偏高)' },
      { date: '2024-09-18', value: '2.15 mIU/L (完全正常)' }
    ]
  },
  {
    id: 'alert-3',
    memberId: 'member-2',
    indicatorKey: 'VD',
    indicatorName: '25-羟基维生素D',
    date: '2024-09-18',
    severity: 'low',
    title: '【25-羟基维生素D】经补充已达到充足健康水平',
    description: '指标由 18.5 ng/ml (不足) 显著提升至 34.2 ng/ml (充足)。',
    clinicalSignificance: '维生素D达到充足标准有助于维持骨骼钙平衡及免疫系统稳态。',
    actionAdvice: '日常可适当多进行户外活动，维持健康饮食结构。',
    historicalPoints: [
      { date: '2024-06-10', value: '18.5 ng/ml (不足)' },
      { date: '2024-09-18', value: '34.2 ng/ml (达标充足)' }
    ]
  }
];

export const initialAnomalyAlerts: AnomalyAlert[] = initialAlerts;

export const indicatorTrendConfigs: Record<string, Partial<IndicatorTrendSeries>> = {
  TG: {
    key: 'TG',
    name: '甘油三酯 (TG)',
    unit: 'mmol/L',
    standardRangeText: '0.45 - 1.70 mmol/L',
    standardMin: 0.45,
    standardMax: 1.70,
    optimalMin: 0.50,
    optimalMax: 1.50,
    description: '血液脂质代谢的核心衡量指标，偏高常与高脂膳食、缺乏运动及脂肪肝倾向相关，在生活干预后反应敏锐。'
  },
  ALT: {
    key: 'ALT',
    name: '谷丙转氨酶 (ALT)',
    unit: 'U/L',
    standardRangeText: '9 - 50 U/L',
    standardMin: 9,
    standardMax: 50,
    optimalMin: 10,
    optimalMax: 40,
    description: '肝细胞代谢健康的最敏感生物标志物，轻度偏高通常反映肝细胞代谢负荷增加或短期生活作息疲劳。'
  },
  TSH: {
    key: 'TSH',
    name: '促甲状腺激素 (TSH)',
    unit: 'mIU/L',
    standardRangeText: '0.27 - 4.20 mIU/L',
    standardMin: 0.27,
    standardMax: 4.20,
    optimalMin: 1.00,
    optimalMax: 3.00,
    description: '下丘脑-垂体-甲状腺内分泌调节轴的核心敏感指标，用于反映人体代谢动力与甲状腺基础功能。'
  },
  FBG: {
    key: 'FBG',
    name: '空腹血糖 (FBG)',
    unit: 'mmol/L',
    standardRangeText: '3.90 - 6.10 mmol/L',
    standardMin: 3.90,
    standardMax: 6.10,
    optimalMin: 4.00,
    optimalMax: 5.60,
    description: '基础糖代谢与胰岛素敏感度的常规监测项目，评价机体空腹状态下的血糖稳态调节能力。'
  },
  VD: {
    key: 'VD',
    name: '25-羟基维生素D',
    unit: 'ng/ml',
    standardRangeText: '30 - 100 ng/ml',
    standardMin: 30,
    standardMax: 100,
    optimalMin: 30,
    optimalMax: 60,
    description: '评估人体全身活性维生素D储备水平的金标准，广泛参与骨骼矿化、钙吸收以及全身免疫系统微环境调节。'
  }
};

export const initialMilestones: HealthMilestone[] = [
  {
    id: 'mile-1',
    memberId: 'member-1',
    title: '完成年度全面健康体检',
    targetDate: '2024-05-18',
    category: '健康里程碑',
    status: 'completed',
    priority: 'high',
    clinicalNote: '已完成生化全套、超声与心电图，建立年度健康基线档案。',
    hospital: '第一人民医院健康管理中心',
    completedAt: '2024-05-18'
  },
  {
    id: 'mile-2',
    memberId: 'member-1',
    title: '血脂与肝功生活方式干预复查',
    targetDate: '2024-08-25',
    category: '复查',
    status: 'completed',
    priority: 'high',
    clinicalNote: '生活干预3个月复查，甘油三酯明显下降，ALT完全恢复正常。',
    hospital: '第一人民医院内科门诊',
    completedAt: '2024-08-25'
  },
  {
    id: 'mile-3',
    memberId: 'member-2',
    title: '甲功专科随访与抗体确认',
    targetDate: '2024-09-18',
    category: '门诊',
    status: 'completed',
    priority: 'high',
    clinicalNote: 'TSH完全回落达标，自身抗体阴性，确认健康转归良好。',
    hospital: '第一人民医院内分泌专科',
    completedAt: '2024-09-18'
  },
  {
    id: 'mile-4',
    memberId: 'member-1',
    title: '下一年度家庭常规预防体检',
    targetDate: '2025-05-20',
    category: '健康里程碑',
    status: 'pending',
    priority: 'medium',
    clinicalNote: '安排全家年度常规健康体检，持续追踪血脂与代谢基线。',
    hospital: '第一人民医院健康管理中心'
  }
];

export const initialMedications: MedicationScheduleItem[] = [
  {
    id: 'med-1',
    memberId: 'member-1',
    name: '高纯度深海深色鱼油软胶囊 (Omega-3)',
    dosage: '每日 1 次，每次 1 粒',
    timing: '随正餐',
    purpose: '辅助调节血脂代谢，保护血管内皮健康',
    active: true
  },
  {
    id: 'med-2',
    memberId: 'member-2',
    name: '维生素 D3 滴剂胶囊',
    dosage: '每日 1 次，每次 1000 IU',
    timing: '随正餐',
    purpose: '维持体内正常维生素D水平与骨骼钙平衡',
    active: true
  },
  {
    id: 'med-3',
    memberId: 'member-2',
    name: '复合维生素与微量元素片',
    dosage: '每日 1 次，每次 1 片',
    timing: '随早餐/午餐',
    purpose: '补充日常膳食维生素与矿物质需求',
    active: true
  }
];
