# FamHealth-AI (家庭健康管理AI系统)
### FamHealth-AI Platform (v1.0.0 Stable)

[![Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)](https://github.com/famhealth-ai/famhealth-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.8%20%2F%203.1-8e75ff)](https://ai.google.dev/)
[![Firestore](https://img.shields.io/badge/Database-Firestore-ffca28)](https://firebase.google.com/)

> **专为全家全生命周期健康档案管理与慢性病/代谢指标追踪打造的端到端智能平台。**  
> 解决医疗病历散落丢失、检验指标难以跨时序追踪、门诊与医生沟通效率低、常规体检异常缺乏系统性复查提醒等核心痛点。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/home-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./docs/images/home-light.png">
    <img alt="FamHealth-AI 平台实际界面预览 (Light/Dark 自适应)" src="./docs/images/home-light.png" width="100%">
  </picture>
</p>
<p align="center">
  <em>👆 系统实际真实渲染主界面 (支持根据系统偏好自适应深浅色模式，全数据脱敏)</em>
</p>

---

## 📸 系统核心功能界面与模块详解 (Feature Showcase)

| 1. 多成员健康病历时间轴 | 2. 关键指标跨时序波动走势图 |
| :---: | :---: |
| <img src="./docs/images/01-timeline.png" width="100%" /> | <img src="./docs/images/02-trend-chart.png" width="100%" /> |
| **3. AI 全科医生多模态问诊** | **4. 门诊 30 秒专家速览卡** |
| <img src="./docs/images/03-ai-consultant.png" width="100%" /> | <img src="./docs/images/04-doctor-quick-glance.png" width="100%" /> |
| **5. 多模态化验单 OCR 识别与录入** | **6. 门诊实况录音与医嘱智能纪要** |
| <img src="./docs/images/05-upload-ocr.png" width="100%" /> | <img src="./docs/images/06-voice-memo.png" width="100%" /> |
| **7. 全家异常指标智能预警中心** | **8. 随访复查日历与健康重要日程** |
| <img src="./docs/images/07-anomaly-alerts.png" width="100%" /> | <img src="./docs/images/08-milestone-calendar.png" width="100%" /> |

---

### 1. 多成员健康档案与时序病历时间轴 (Chronological Medical Feed)
> 按真实就诊日期逆序编排全家检验单据，直观展示指标异常警示分级（正常/关注/警戒）与多维分类检索。
<p align="center">
  <img src="./docs/images/01-timeline.png" alt="家庭健康档案与病历时间轴" width="100%" />
</p>

### 2. 相同生理指标跨时序波动走势图 (Longitudinal Indicator Analytics)
> 跨机构自动汇聚相同指标（甘油三酯 TG、谷丙转氨酶 ALT、促甲状腺激素 TSH），结合临床参考基线与理想达标带绘制高精度曲线与逐次变动幅度（%）。
<p align="center">
  <img src="./docs/images/02-trend-chart.png" alt="关键生理指标跨期趋势对比图表" width="100%" />
</p>

### 3. 基于全量病史上下文的 AI 全科医生顾问 (Context-Aware AI Medical Consultant)
> 基于 Google Gemini 长上下文医学推理，融合当前成员全量历史检验单据，支持文字、化验单图片 OCR 与门诊口述语音多模态输入，输出严谨循证的生活调理与就诊建议。
<p align="center">
  <img src="./docs/images/03-ai-consultant.png" alt="AI 全科医生多模态问诊" width="100%" />
</p>

### 4. 30秒门诊就医专家速览卡 (Doctor Quick-Glance Card)
> 专为三甲名医门诊高效沟通打造：一屏浓缩成员基本健康特征、近期关键异常指标红绿灯、正在执行的调理方案与门诊重点咨询清单。
<p align="center">
  <img src="./docs/images/04-doctor-quick-glance.png" alt="30秒就医专家速览卡" width="100%" />
</p>

### 5. 多模态化验单拍照 OCR 智能提取与结构化录入 (Multimodal Report OCR & Extraction)
> 拍照或上传纸质报告单，Google Gemini 视觉大模型毫秒级自动识别所属医院、检验日期、科室及几十项生化指标与参考区间，支持一键载入快捷模板并自动查漏补齐。
<p align="center">
  <img src="./docs/images/05-upload-ocr.png" alt="多模态化验单智能识别与录入" width="100%" />
</p>

### 6. 门诊现场口述录音与医嘱智能纪要提炼 (Voice Dictation & Clinical Summary)
> 就医门诊时一键启动高保真语音录音，AI 引擎实时转写门诊对话，并自动提炼归纳为包含“诊断结论”、“检查项目开单”、“用药与调理建议”与“复诊复查节点”的结构化门诊备忘。
<p align="center">
  <img src="./docs/images/06-voice-memo.png" alt="门诊实况录音与医嘱智能纪要" width="100%" />
</p>

### 7. 全家异常生理指标智能预警中心 (Anomaly Alerts Dashboard)
> 智能识别全家成员在各时期的生理异常指标，依据临床医学指南自动判定警示等级（正常稳定 / 关注提示 / 偏离警戒），并输出明确的临床意义说明与生活方式干预对策。
<p align="center">
  <img src="./docs/images/07-anomaly-alerts.png" alt="全家异常指标智能预警中心" width="100%" />
</p>

### 8. 随访复查提醒日历与健康重要日程 (Health Milestones & Calendar View)
> 智能把控重要健康随访节点（如血脂四项干预后复查、甲功随访、年度体检），并提供每日核心生活干预与调理打卡记录，巩固健康管理成果。
<p align="center">
  <img src="./docs/images/08-milestone-calendar.png" alt="随访复查日程与服药调理日历" width="100%" />
</p>

---

## 🌟 核心功能亮点 (Key Features)

### 1. 📑 多模态检验单与超声报告智能识别 (OCR & Parsing)
- **拍照/截图一键解析**：基于 Google Gemini 多模态视觉模型，支持血常规、生化全套、肝肾功能、甲状腺功能、腹部及浅表彩超等各类复杂纸质与电子报告单。
- **自动提取生理指标**：自动识别检查机构、日期、就诊科室、指标数值、单位、参考区间及临床意义，并智能标记异常等级（正常、偏高、偏低、警戒）。

### 2. 📈 关键生理指标跨时序波动追踪与走势图谱
- **跨机构跨时间聚合**：将不同医院、体检中心在不同日期出具的相同指标无缝对齐。
- **动态曲线渲染**：直观呈现促甲状腺激素 (TSH)、甘油三酯 (TG)、谷丙转氨酶 (ALT)、空腹血糖 (FBG)、25-羟基维生素D (25-OH-VD) 等指标跨期走势。
- **临床警戒线与理想参考基线**：内置权威医学参考基线与健康目标带，直观指引生活方式干预与康复方向。

### 3. 🩺 30秒就医专家速览卡与门诊问诊备忘录 (Doctor Quick-Glance)
- **专家速览卡片**：将繁复病历精简浓缩为包含“核心既往健康概况”、“近期异常指标红绿灯”、“当前调理与用药方案”与“本次就诊核心关注”的单页卡片，就诊时向医生出示即可在 30 秒内交代清全部关键情况。
- **问诊备忘生成**：按内科、内分泌科、消化科、体检科分门别类定制就医提问清单。

### 4. 🤖 基于全量病史上下文的 AI 全科医生顾问
- **上下文感知推理**：AI 助手深度整合当前家庭成员的历史化验数据与指标演进，提供个性化、有依据的健康分析，告别泛泛而谈的模板回答。
- **科学生活方式与营养指引**：针对血脂代谢、甲状腺微调及微量营养素缺乏提供科学建议，包含协同与禁忌说明。
- **多轮交互与导出**：支持问诊会话流式回答，一键导出完整分析报告为 Markdown / 格式化文档。

### 5. 🎙️ 门诊语音问诊实时录音与智能纪要提炼
- **门诊实况录音**：就医时开启录音，实时捕获医生叮嘱。
- **AI 智能纪要提炼**：自动过滤杂音，归纳为“诊断结论”、“检查项目开单”、“用药与调理建议”与“复诊复查节点”。

### 6. 📅 健康里程碑与阶段性复查日程
- **智能跟踪复查窗口**：支持为家庭成员创建甲功复查、血脂复查、年度体检等关键健康日程。
- **用药依从性提醒**：记录每日调理与作息打卡，巩固健康干预成果。

### 7. ☁️ 中国大陆网络加速专线 + 离线优先双通道架构
- **免梯直连保障**：针对国内无法直接访问 Google Firestore 域名的问题，内置同源服务端数据中继隧道（Server Cloud Tunnel），毫秒级响应，100% 免翻墙稳定同步。
- **直连协同与离线优先**：海外与直连网络环境下自动协同，全站配置离线缓存，无网亦可极速浏览与录入。

---

## 🛠️ 技术栈架构 (Tech Stack)

| 层次 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端界面** | React 19 + TypeScript + Vite | 现代化高性能单页架构 |
| **样式与动效** | Tailwind CSS v4 + Framer Motion | 优雅排版、自适应深浅色模式、流畅交互过渡 |
| **数据可视化**| Recharts + Canvas | 医疗级高精度时序折线图、阈值警戒带、散点图 |
| **后端服务** | Node.js + Express + tsx + esbuild | 轻量化全栈服务，同源中继代理 |
| **AI 引擎**   | Google Gemini 3.8 / 3.1 (`@google/genai`) | 多模态病历图文理解、OCR 提取与长上下文医疗推理 |
| **数据存储** | Google Cloud Firestore + LocalStorage Edge Cache | 云端持久化存储 + 本地离线高可用双通道 |
| **打包与导出**| JSZip | 完整病例结构化 JSON + 报告图片一键压缩归档 |

---

## 🚀 快速启动与本地运行指南 (Getting Started)

### 1. 环境准备
- **Node.js**: `v18.0.0` 或更高版本（推荐 `v20+`）
- **npm** 或 **pnpm** / **yarn**

### 2. 克隆项目并安装依赖
```bash
git clone https://github.com/famhealth-ai/famhealth-ai.git
cd famhealth-ai

npm install
```

### 3. 配置环境变量
在项目根目录创建 `.env` 文件（或从 `.env.example` 复制）：
```bash
cp .env.example .env
```
编辑 `.env`：
```env
# Google Gemini API Key (用于智能报告 OCR 与 AI 医生问诊)
# 在 https://aistudio.google.com/ 免费申请
GEMINI_API_KEY="your_gemini_api_key_here"

# 应用监听端口（默认 3000）
PORT=3000
```

### 4. 启动开发环境
```bash
npm run dev
```
打开浏览器访问: [http://localhost:3000](http://localhost:3000)

### 5. 编译与生产部署
```bash
# 执行前端 Vite 打包与服务端编译
npm run build

# 启动生产服务
npm run start
```

---

## 📂 项目结构规范 (Project Structure)

```text
famhealth-ai/
├── .env.example              # 环境变量配置模版
├── .gitignore                # Git 忽略文件（严格规避密钥与环境凭据）
├── package.json              # 项目依赖与构建指令
├── server.ts                 # Express 服务端入口（Gemini API 代理与 Firestore 国内加速中继）
├── vite.config.ts            # Vite 构建配置
├── firestore.rules           # Firestore 数据库安全规则
├── metadata.json             # AI Studio 与应用元数据声明
├── src/
│   ├── main.tsx              # React 挂载入口
│   ├── App.tsx               # 应用主界面与全生命周期状态管理
│   ├── index.css             # Tailwind CSS 全局样式
│   ├── types.ts              # 核心 TypeScript 数据模型定义
│   ├── components/           # 模块化业务组件
│   │   ├── Header.tsx        # 顶部导航、网络同步状态、成员切换
│   │   ├── MemberProfileBar.tsx # 成员标签档案与健康概述
│   │   ├── TimelineView.tsx  # 病历时间轴主视图与多维过滤器
│   │   ├── IndicatorComparisonView.tsx # 指标时序波动对比与趋势图表
│   │   ├── MilestoneCalendarView.tsx   # 健康随访与复查日程日历
│   │   ├── AiConsultantView.tsx        # AI 全科医生多轮健康咨询
│   │   ├── DoctorQuickGlanceModal.tsx  # 30秒就医专家速览卡
│   │   ├── DoctorVisitMemoModal.tsx    # 就医问诊与复查备忘清单
│   │   ├── UploadReportModal.tsx       # 多模态化验单拍照上传与 OCR
│   │   ├── VoiceConsultationModal.tsx  # 门诊实况录音转录与归纳
│   │   ├── ExportDataModal.tsx         # 全量健康数据 ZIP 备份与报告导出
│   │   └── SyncStatusModal.tsx         # 双通道网络加速与云端同步控制台
│   ├── data/
│   │   └── mockHealthData.ts # 全面脱敏的家庭健康示范数据集
│   ├── lib/
│   │   └── firebase.ts       # Firestore 客户端 SDK 与双通道容错引擎
│   └── utils/
│       ├── exportGenerators.ts # 报告生成器（Markdown/文本）
│       └── reportImageSaver.ts # 化验单 Canvas 本地安全渲染
└── RELEASE.md                # 正式版 v1.0.0 发布说明
```

---

## 🔒 隐私安全与数据脱敏声明 (Privacy & Desensitization)

1. **100% 数据全面脱敏**：本项目开源仓库内所有示范病历、检验单据、成员名称、医疗机构均已通过严格脱敏与匿名化处理，仅保留符合常规家庭健康管理特征的标准生理指标（如血脂四项、肝肾功能、甲功指标、常规体检等）用于系统功能展示与科学推理演示，**不含任何真实个人隐私、专有身份数据或特定病症隐私**。
2. **本地存储优先 (Offline-First)**：用户上传的所有个人化验单、录音及问诊记录均优先写入浏览器隔离存储，并在配置云端后全程使用 TLS 1.3 / AES-256 加密传输。
3. **安全配置防泄漏**：Git 规则默认忽略 `.env`、密钥凭证与编译产物，防止 API Key 误提交至公共仓库。

---

## 📄 开源许可证 (License)

本项目遵循 [MIT License](LICENSE) 开源许可协议。欢迎个人健康管理者、家庭健康关爱者与医学科技开发者 Star、Fork 或提交 Pull Request 共建！
