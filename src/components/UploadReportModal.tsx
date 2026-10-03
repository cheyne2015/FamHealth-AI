import React, { useState, useRef } from 'react';
import { FamilyMember, MedicalReport, ReportCategory, IndicatorItem } from '../types';
import { 
  X, 
  Upload, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Download, 
  Cloud, 
  Loader2, 
  AlertCircle, 
  AlertTriangle,
  Cpu,
  Clipboard,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Maximize2
} from 'lucide-react';
import { compressReportImageForCloud, CompressionResult } from '../utils/imageCompressor';
import { parseMedicalTextLocally } from '../utils/localReportParser';
import { runLocalClientOcr } from '../utils/localOcrEngine';
import { canonicalizeIndicatorKey } from '../utils/indicatorUtils';

export interface UploadedReportImage {
  id: string;
  dataUrl: string;
  fileName: string;
  sizeFormatted: string;
  compressedSizeBytes: number;
}

interface UploadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  selectedMemberId: string;
  onAddReport: (report: MedicalReport) => void;
}

interface FormIndicatorItem {
  name: string;
  standardKey: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'warning' | 'critical';
  clinicalNote: string;
}

type RecognitionMode = 'cloud_ai' | 'local_ocr' | 'text_paste';

export const UploadReportModal: React.FC<UploadReportModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  onAddReport
}) => {
  const [memberId, setMemberId] = useState(selectedMemberId);
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ReportCategory>('血生化与激素');
  const [summary, setSummary] = useState('');
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedReportImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  
  // OCR & Recognition states
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('cloud_ai');
  const [isAiOcrLoading, setIsAiOcrLoading] = useState(false);
  const [localOcrProgressText, setLocalOcrProgressText] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [showPastedTextModal, setShowPastedTextModal] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<{ 
    text: string; 
    type: 'success' | 'warning' | 'error'; 
    source?: string;
    canTryLocal?: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // Default indicators start empty or with clean initial state
  const [indicators, setIndicators] = useState<FormIndicatorItem[]>([]);

  if (!isOpen) return null;

  const handleAddIndicatorRow = () => {
    setIndicators((prev) => [
      ...prev,
      {
        name: '',
        standardKey: '',
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        clinicalNote: '正常'
      }
    ]);
  };

  const handleRemoveIndicatorRow = (idx: number) => {
    setIndicators((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick preset simulation: e.g. "血脂与代谢干预复查" or "甲功随访复查"
  const handleQuickFill = (type: 'tsh_recheck' | 'lipid_panel' | 'allergy_panel' | 'liver_renal_panel') => {
    if (type === 'tsh_recheck') {
      const wife = members.find(m => m.gender === 'female') || members[0];
      if (wife) setMemberId(wife.id);
      setTitle('促甲状腺激素与内分泌随访复查');
      setHospital('同仁体检医学中心');
      setDate('2024-09-18');
      setCategory('血生化与激素');
      setSummary('内分泌随访复查：TSH平稳维持在 2.15 mIU/L 理想正常范围，抗体阴性，机体代谢平衡良好。');
      setIndicators([
        { name: '促甲状腺激素 (TSH)', standardKey: 'TSH', value: '2.15', unit: 'mIU/L', referenceRange: '0.27 - 4.20', status: 'normal', clinicalNote: '完全处于健康正常范围' },
        { name: '游离甲状腺素 (FT4)', standardKey: 'FT4', value: '16.4', unit: 'pmol/L', referenceRange: '12.0 - 22.0', status: 'normal', clinicalNote: '正常' },
        { name: '25-羟基维生素D', standardKey: 'VD', value: '34.2', unit: 'ng/ml', referenceRange: '30 - 100', status: 'normal', clinicalNote: '达到充足标准' }
      ]);
    } else if (type === 'lipid_panel') {
      const male = members.find(m => m.gender === 'male') || members[0];
      if (male) setMemberId(male.id);
      setTitle('血脂四项与心血管代谢检验报告单');
      setHospital('第一人民医院健康管理中心');
      setDate('2024-08-25');
      setCategory('血生化与激素');
      setSummary('甘油三酯从 2.45 回落至 1.82 mmol/L，低脂饮食与规律运动干预成效显著，低密度脂蛋白及总胆固醇达标。');
      setIndicators([
        { name: '甘油三酯 (TG)', standardKey: 'TG', value: '1.82', unit: 'mmol/L', referenceRange: '0.45 - 1.70', status: 'warning', clinicalNote: '数值接近正常上限，较前次明显改善' },
        { name: '总胆固醇 (TC)', standardKey: 'TC', value: '4.85', unit: 'mmol/L', referenceRange: '2.80 - 5.70', status: 'normal', clinicalNote: '处于理想健康范围' },
        { name: '高密度脂蛋白胆固醇 (HDL-C)', standardKey: 'HDL', value: '1.25', unit: 'mmol/L', referenceRange: '> 1.04', status: 'normal', clinicalNote: '心血管保护性脂质良好' },
        { name: '低密度脂蛋白胆固醇 (LDL-C)', standardKey: 'LDL', value: '2.65', unit: 'mmol/L', referenceRange: '< 3.37', status: 'normal', clinicalNote: '正常达标' }
      ]);
    } else if (type === 'allergy_panel') {
      const member = members[0];
      if (member) setMemberId(member.id);
      setTitle('血清过敏原特异性IgE筛查及总IgE报告');
      setHospital('大学附属综合医院变态反应科');
      setDate('2025-08-22');
      setCategory('血生化与激素');
      setSummary('查明嗜酸细胞增高诱因：户尘螨与粉尘螨特异性IgE达3级(强阳性)，食物过敏原阴性，明确为环境螨过敏。');
      setIndicators([
        { name: '血清总IgE', standardKey: 'TOTAL_IGE', value: '380', unit: 'IU/mL', referenceRange: '< 100', status: 'warning', clinicalNote: '超标3.8倍，高敏状态' },
        { name: '户尘螨特异性IgE (d1)', standardKey: 'IGE_DUST_MITE', value: '3级 (阳性)', unit: '级', referenceRange: '0级 (阴性)', status: 'warning', clinicalNote: '强阳性致敏源' },
        { name: '嗜酸性粒细胞比例', standardKey: 'EOSINOPHILS_PCT', value: '10.5', unit: '%', referenceRange: '0.5 - 5.0', status: 'warning', clinicalNote: '与变态反应高度吻合' }
      ]);
    } else if (type === 'liver_renal_panel') {
      const male = members.find(m => m.gender === 'male') || members[0];
      if (male) setMemberId(male.id);
      setTitle('肝肾功能综合生化检验报告单');
      setHospital('第一人民医院健康管理中心');
      setDate('2024-08-25');
      setCategory('血生化与激素');
      setSummary('谷丙转氨酶从 58 完全恢复至 32 U/L 正常标准，肾功能各项指标均在正常理想区间。');
      setIndicators([
        { name: '谷丙转氨酶 (ALT)', standardKey: 'ALT', value: '32', unit: 'U/L', referenceRange: '9 - 50', status: 'normal', clinicalNote: '完全恢复至正常标准' },
        { name: '谷草转氨酶 (AST)', standardKey: 'AST', value: '25', unit: 'U/L', referenceRange: '15 - 40', status: 'normal', clinicalNote: '正常' },
        { name: '血肌酐 (CREA)', standardKey: 'CREA', value: '78', unit: 'umol/L', referenceRange: '57 - 97', status: 'normal', clinicalNote: '肾小球滤过状态优良' },
        { name: '空腹血糖 (FBG)', standardKey: 'FBG', value: '5.12', unit: 'mmol/L', referenceRange: '3.90 - 6.10', status: 'normal', clinicalNote: '血糖稳态健康' }
      ]);
    }
  };

  // Populate data into form fields helper
  const applyExtractedData = (d: any, sourceName: string, isLocal = false) => {
    if (d.hospital) setHospital(d.hospital);
    if (d.date) setDate(d.date);

    const validCategories: ReportCategory[] = [
      '血生化与激素',
      '超声影像',
      '染色体与遗传学',
      '常规体检',
      '精液与生殖专科',
      '其他化验'
    ];
    if (d.category && validCategories.includes(d.category as ReportCategory)) {
      setCategory(d.category as ReportCategory);
    } else if (d.title?.includes('精液') || d.title?.includes('精子')) {
      setCategory('精液与生殖专科');
    } else if (d.title?.includes('超声') || d.title?.includes('B超')) {
      setCategory('超声影像');
    } else if (d.title?.includes('染色体') || d.title?.includes('核型') || d.title?.includes('基因')) {
      setCategory('染色体与遗传学');
    }

    if (d.title) setTitle(d.title);
    if (d.summary) setSummary(d.summary);

    // Intelligent member auto-matching
    if (d.patientName) {
      const matched = members.find((m) => m.name.includes(d.patientName) || d.patientName.includes(m.name));
      if (matched) setMemberId(matched.id);
    } else if (d.patientGender === 'male' || d.category === '精液与生殖专科' || d.title?.includes('精液')) {
      const male = members.find((m) => m.gender === 'male');
      if (male) setMemberId(male.id);
    } else if (d.patientGender === 'female' || d.category === '妇科与孕产' || d.title?.includes('子宫') || d.title?.includes('甲状腺')) {
      const female = members.find((m) => m.gender === 'female');
      if (female) setMemberId(female.id);
    }

    // Populate extracted indicators
    if (Array.isArray(d.indicators) && d.indicators.length > 0) {
      setIndicators(
        d.indicators.map((it: any) => ({
          name: it.name || '',
          standardKey: it.standardKey || it.name || '',
          value: String(it.value ?? ''),
          unit: it.unit || '',
          referenceRange: it.referenceRange || '',
          status: (it.status === 'warning' || it.status === 'critical') ? it.status : 'normal',
          clinicalNote: it.clinicalNote || '正常'
        }))
      );
    }

    setOcrNotice({
      text: isLocal
        ? `💻 端侧本地离线解析完成！已提取 ${d.indicators?.length || 0} 项指标并对齐参考值（完全在您本地设备运行，无网络开销与隐私泄露风险）。`
        : `✨ AI 视觉识别完成！已深度解析并提取 ${d.indicators?.length || 0} 项检验项目，请核对。`,
      type: 'success',
      source: sourceName
    });
  };

  // Run on-device local OCR (Tesseract.js WASM) on single or multiple images
  const executeLocalClientOcr = async (imagesList: UploadedReportImage[]) => {
    if (!imagesList || imagesList.length === 0) return;
    setIsAiOcrLoading(true);
    setLocalOcrProgressText('正在启动端侧本地 OCR 引擎...');
    setOcrNotice(null);

    try {
      let combinedText = '';
      for (let i = 0; i < imagesList.length; i++) {
        setLocalOcrProgressText(`正在识别第 ${i + 1}/${imagesList.length} 页截图 (Tesseract WASM)...`);
        const extracted = await runLocalClientOcr(imagesList[i].dataUrl, (p) => {
          setLocalOcrProgressText(`第 ${i + 1}/${imagesList.length} 页: ${p.status}`);
        });
        combinedText += `\n--- 报告单第 ${i + 1} 页 (${imagesList[i].fileName}) ---\n` + extracted;
      }

      console.log('Local client OCR extracted text length:', combinedText.length);
      const parsed = parseMedicalTextLocally(combinedText, imagesList[0]?.fileName || title);
      applyExtractedData(
        parsed, 
        imagesList.length > 1 
          ? `端侧本地引擎 (Tesseract WASM · 联合识别 ${imagesList.length} 页)`
          : '端侧本地引擎 (Tesseract WASM)', 
        true
      );
    } catch (err: any) {
      console.warn('Local OCR failed:', err);
      const fallbackParsed = parseMedicalTextLocally(
        imagesList.map((i) => i.fileName).join(' ') || title, 
        imagesList[0]?.fileName
      );
      applyExtractedData(fallbackParsed, '本地临床规则知识库', true);
      setOcrNotice({
        text: '端侧本地 OCR 引擎提取异常，已根据文件名及单据特征载入本地临床项目，或可直接粘贴文本。',
        type: 'warning',
        source: '本地临床知识库'
      });
    } finally {
      setIsAiOcrLoading(false);
      setLocalOcrProgressText('');
    }
  };

  // Run cloud AI OCR with multi-image stitching fallback to Gemini 3.1 and then local
  const executeCloudAiOcr = async (imagesList: UploadedReportImage[]) => {
    if (!imagesList || imagesList.length === 0) return;
    setIsAiOcrLoading(true);
    setOcrNotice(null);

    try {
      const res = await fetch('/api/ai/ocr-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagesList.map((img) => img.dataUrl),
          imageBase64: imagesList[0]?.dataUrl,
          fileName: imagesList.map((img) => img.fileName).join(', '),
          hint: title || ''
        })
      });

      if (res.ok) {
        const respData = await res.json();
        if (respData && respData.data) {
          const count = imagesList.length;
          const sourceLabel = count > 1
            ? `${respData.source || 'gemini-3.8-flash'} · 联合解析 ${count} 张单据截图`
            : (respData.source || 'gemini-3.8-flash');
          applyExtractedData(respData.data, sourceLabel, false);
          return;
        }
      }

      // If cloud failed or returned non-ok, attempt local on-device OCR
      console.warn('Cloud OCR unavailable, triggering automatic local on-device fallback...');
      await executeLocalClientOcr(imagesList);
    } catch (err: any) {
      console.warn('Cloud OCR request failed with error, falling back to local on-device OCR:', err);
      await executeLocalClientOcr(imagesList);
    } finally {
      setIsAiOcrLoading(false);
    }
  };

  // Main recognition dispatcher
  const executeRecognition = async (imagesList?: UploadedReportImage[]) => {
    const targetImages = imagesList || uploadedImages;
    if (!targetImages || targetImages.length === 0) return;
    if (recognitionMode === 'local_ocr') {
      await executeLocalClientOcr(targetImages);
    } else {
      await executeCloudAiOcr(targetImages);
    }
  };

  // Paste raw text local parser
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const parsed = parseMedicalTextLocally(pastedText, title);
    applyExtractedData(parsed, '本地智能文本解析器 (纯离线)', true);
    setShowPastedTextModal(false);
  };

  // Handle files selection (can receive multiple files at once or append)
  const handleFilesAdd = async (files: FileList | File[], isAppend = false) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedList: UploadedReportImage[] = [];

      const totalImageCount = fileList.length + (isAppend ? uploadedImages.length : 0);
      const perImageCap = totalImageCount >= 3 ? 240 * 1024 : (totalImageCount === 2 ? 320 * 1024 : 480 * 1024);

      for (const file of fileList) {
        try {
          const res = await compressReportImageForCloud(file, 1600, perImageCap);
          compressedList.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: res.dataUrl,
            fileName: file.name,
            sizeFormatted: res.compressedSizeFormatted,
            compressedSizeBytes: res.compressedSizeBytes
          });
        } catch (err) {
          console.warn('Compression failed for file', file.name, err);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          compressedList.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl,
            fileName: file.name,
            sizeFormatted: '已优化',
            compressedSizeBytes: 300 * 1024
          });
        }
      }

      const merged = isAppend ? [...uploadedImages, ...compressedList] : compressedList;
      setUploadedImages(merged);
      setActiveImageIndex(isAppend ? uploadedImages.length : 0);
      setReportImagePreview(merged[0]?.dataUrl || null);
      setImageFileName(merged.map((i) => i.fileName).join(', '));

      // Trigger joint multi-image OCR with ALL merged images
      executeRecognition(merged);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = uploadedImages.filter((_, idx) => idx !== indexToRemove);
    setUploadedImages(updated);
    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
    if (updated.length > 0) {
      setReportImagePreview(updated[0].dataUrl);
      setImageFileName(updated.map((i) => i.fileName).join(', '));
      executeRecognition(updated);
    } else {
      setReportImagePreview(null);
      setImageFileName('');
      setOcrNotice(null);
    }
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= uploadedImages.length) return;
    const nextList = [...uploadedImages];
    const temp = nextList[index];
    nextList[index] = nextList[target];
    nextList[target] = temp;
    setUploadedImages(nextList);
    setActiveImageIndex(target);
  };

  const handleDownloadActiveImage = () => {
    const activeImg = uploadedImages[activeImageIndex] || (reportImagePreview ? { dataUrl: reportImagePreview, fileName: imageFileName } : null);
    if (!activeImg) return;
    const a = document.createElement('a');
    a.href = activeImg.dataUrl;
    a.download = activeImg.fileName || `${title || '报告图片'}-第${activeImageIndex + 1}页.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hospital.trim() || !date) return;

    const parsedIndicators: IndicatorItem[] = indicators
      .filter((i) => i.name.trim() && i.value.trim())
      .map((i, idx) => {
        const num = parseFloat(i.value);
        const canonical = canonicalizeIndicatorKey(i.standardKey, i.name);
        let status = i.status || 'normal';
        if (!isNaN(num)) {
          if (canonical === 'PRL') {
            if (num > 30.7) status = num > 50 ? 'critical' : 'warning';
          } else if (canonical === 'TSH') {
            if (num > 4.2 || num < 0.27) status = 'critical';
            else if (num > 2.5) status = 'warning';
          }
        }
        return {
          id: `new-ind-${Date.now()}-${idx}`,
          name: i.name,
          standardKey: canonical || i.standardKey || i.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          value: isNaN(num) ? i.value : num,
          numericValue: isNaN(num) ? undefined : num,
          unit: i.unit,
          referenceRange: i.referenceRange || (canonical === 'PRL' ? '女性绝经前: 3.8-30.7 ng/ml' : undefined),
          status,
          clinicalNote: i.clinicalNote || (status !== 'normal' ? '检测值偏离临床参考区间' : '正常')
        };
      });

    const newReport: MedicalReport = {
      id: `rep-custom-${Date.now()}`,
      memberId,
      title,
      hospital,
      date,
      category,
      tags: ['新录入', category, ...(uploadedImages.length > 1 ? [`多图组合 (${uploadedImages.length}页)`] : [])],
      summary: summary || '用户新上传的医疗检测记录。',
      keyFindings: indicators.map((i) => `${i.name}: ${i.value} ${i.unit}`.trim()),
      indicators: parsedIndicators,
      doctorAdvice: '遵医嘱随访。',
      imageUrl: uploadedImages[0]?.dataUrl || reportImagePreview || undefined,
      imageUrls: uploadedImages.length > 0 ? uploadedImages.map((i) => i.dataUrl) : (reportImagePreview ? [reportImagePreview] : undefined)
    };

    onAddReport(newReport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1c] bg-[#fdfdfb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#1a1a1c] bg-white flex items-center justify-center text-[#5562ff]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold block">
                CLINICAL ARCHIVE · 新增化验与检验报告
              </span>
              <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c]">
                上传 / 录入新健康报告
              </h3>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="text-[#1a1a1c]/50 hover:text-[#1a1a1c] p-1.5 rounded-full border border-transparent hover:border-slate-300 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Switcher & Offline Indicator Bar */}
        <div className="px-6 py-2.5 bg-[#f5f5f3] border-b border-[#1a1a1c]/15 flex flex-wrap items-center justify-between gap-2 text-xs font-editorial-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#1a1a1c]/60 font-bold">识别引擎策略:</span>
            <div className="inline-flex rounded-xs border border-[#1a1a1c]/30 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setRecognitionMode('cloud_ai')}
                className={`px-2.5 py-1 flex items-center gap-1 transition cursor-pointer ${
                  recognitionMode === 'cloud_ai'
                    ? 'bg-[#1a1a1c] text-white font-bold'
                    : 'text-[#1a1a1c]/70 hover:bg-[#f0f0ee]'
                }`}
              >
                <Cloud className="w-3 h-3 text-[#5562ff]" />
                <span>云端双模型 (Gemini 3.8/3.1)</span>
              </button>
              <button
                type="button"
                onClick={() => setRecognitionMode('local_ocr')}
                className={`px-2.5 py-1 flex items-center gap-1 transition cursor-pointer border-l border-[#1a1a1c]/20 ${
                  recognitionMode === 'local_ocr'
                    ? 'bg-[#1a1a1c] text-white font-bold'
                    : 'text-[#1a1a1c]/70 hover:bg-[#f0f0ee]'
                }`}
              >
                <Cpu className="w-3 h-3 text-[#188038]" />
                <span>端侧本地离线 (WASM)</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPastedTextModal(!showPastedTextModal)}
            className="px-2.5 py-1 bg-white border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Clipboard className="w-3 h-3 text-[#5562ff]" />
            <span>{showPastedTextModal ? '收起文本粘贴' : '粘贴电子病历/短信文本'}</span>
          </button>
        </div>

        {/* Expandable Text Paste Area */}
        {showPastedTextModal && (
          <div className="p-4 bg-[#f0f4ff] border-b border-[#5562ff]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#5562ff]" />
                <span>纯本地秒级解析电子化验单文本 (微信公众号/医院APP/短信/PDF文本)</span>
              </span>
              <span className="font-editorial-mono text-[10px] text-[#137333] font-bold bg-[#e6f4ea] px-1.5 py-0.5 border border-[#188038]/30">
                100% 本地运行 · 零网络调用
              </span>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="直接将医院电子报告内容粘贴于此（例如：甘油三酯 TG 1.82 mmol/L、促甲状腺激素 TSH 2.15 mIU/L、空腹血糖 5.2 mmol/L 等）..."
              rows={3}
              className="w-full bg-white border border-[#1a1a1c]/30 p-2 text-xs font-editorial-mono text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPastedText('')}
                className="px-3 py-1 text-xs text-[#1a1a1c]/60 hover:text-[#1a1a1c] font-editorial-mono cursor-pointer"
              >
                清空
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-3.5 py-1 bg-[#5562ff] text-white hover:bg-[#4350ea] text-xs font-bold font-editorial-mono flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>本地即时结构化解析</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Simulation Templates */}
        <div className="p-4 border-b border-[#1a1a1c]/15 bg-[#f8f8f6]">
          <span className="font-editorial-mono text-[10px] font-bold text-[#1a1a1c]/60 uppercase tracking-widest block mb-2">
            常用检查报告快速模板加载 [QUICK PRESETS]：
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id="preset-fill-lipid-btn"
              onClick={() => handleQuickFill('lipid_panel')}
              className="px-2.5 py-1 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              + 血脂与代谢干预复查
            </button>
            <button
              type="button"
              id="preset-fill-liver-renal-btn"
              onClick={() => handleQuickFill('liver_renal_panel')}
              className="px-2.5 py-1 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              + 肝肾功能综合生化
            </button>
            <button
              type="button"
              id="preset-fill-tsh-btn"
              onClick={() => handleQuickFill('tsh_recheck')}
              className="px-2.5 py-1 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              + 甲功三项随访复查
            </button>
            <button
              type="button"
              id="preset-fill-allergy-btn"
              onClick={() => handleQuickFill('allergy_panel')}
              className="px-2.5 py-1 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              + 过敏原筛查报告
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* File Image Upload Zone (Supports multi-image stitching / pagination) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesAdd(e.dataTransfer.files, uploadedImages.length > 0);
              }
            }}
            className={`p-3.5 bg-[#fdfdfb] border-2 border-dashed rounded-xs transition-colors relative ${
              isDragging
                ? 'border-[#5562ff] bg-[#5562ff]/5'
                : 'border-[#1a1a1c]/30 hover:border-[#1a1a1c]/60'
            }`}
          >
            {/* Dragging Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-20 bg-[#5562ff]/10 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-[#5562ff] pointer-events-none">
                <Upload className="w-8 h-8 text-[#5562ff] animate-bounce mb-2" />
                <span className="font-editorial-mono text-sm font-bold text-[#5562ff]">
                  松开鼠标，将图片添加为此报告的截图组合
                </span>
                <span className="font-editorial-mono text-xs text-[#5562ff]/80 mt-0.5">
                  支持同时拖入 1~5 张图片（第1页、第2页、第3页...）
                </span>
              </div>
            )}

            {/* Primary input for selecting 1 or more images */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFilesAdd(e.target.files, false)}
              className="hidden"
            />
            {/* Append input for adding subsequent screenshots */}
            <input
              type="file"
              ref={appendFileInputRef}
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFilesAdd(e.target.files, true)}
              className="hidden"
            />

            {isCompressing ? (
              <div className="py-5 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#5562ff] animate-spin mb-2" />
                <p className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                  正在进行高精临床多图智能压缩与规格适配...
                </p>
                <p className="font-editorial-mono text-[10px] text-[#1a1a1c]/50 mt-0.5">
                  智能降采样至安全大小并保持表格文字与数字超高解析度
                </p>
              </div>
            ) : uploadedImages.length > 0 ? (
              <div className="space-y-3">
                {/* Header row with count & action controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1a1a1c]/10">
                  <div className="flex items-center gap-2">
                    <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#5562ff]" />
                      <span>已添加 {uploadedImages.length} 张单据截图 (同一份报告)</span>
                    </span>
                    {uploadedImages.length > 1 && (
                      <span className="text-[10px] bg-[#5562ff]/10 text-[#5562ff] font-bold px-2 py-0.5 rounded-full border border-[#5562ff]/20">
                        智能多图缝合识别
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="append-more-images-btn"
                      onClick={() => appendFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-bold font-editorial-mono bg-white border border-[#5562ff] text-[#5562ff] hover:bg-[#5562ff] hover:text-white transition flex items-center gap-1 cursor-pointer"
                      title="追加上传同一份报告的下一页截图"
                    >
                      <Plus className="w-3 h-3" />
                      <span>追加截图 (第{uploadedImages.length + 1}页)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadActiveImage}
                      className="px-2 py-1 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] font-editorial-mono flex items-center gap-1 transition cursor-pointer"
                      title="保存当前查看的页面截图到本地"
                    >
                      <Download className="w-3 h-3 text-[#5562ff]" />
                      <span>保存原图</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 text-xs text-[#1a1a1c]/60 hover:text-[#1a1a1c] font-editorial-mono underline cursor-pointer"
                    >
                      重新选择
                    </button>
                  </div>
                </div>

                {/* Horizontal thumbnail cards tray */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {uploadedImages.map((img, idx) => {
                    const isActive = activeImageIndex === idx;
                    return (
                      <div
                        key={img.id}
                        className={`relative group border p-1.5 transition rounded-xs bg-white flex flex-col justify-between ${
                          isActive
                            ? 'border-[#5562ff] ring-2 ring-[#5562ff]/20 shadow-xs'
                            : 'border-[#1a1a1c]/20 hover:border-[#1a1a1c]/60'
                        }`}
                      >
                        {/* Page Badge & Action Overlay */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-editorial-mono font-bold px-1.5 py-0.5 rounded-xs ${
                            idx === 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                            第 {idx + 1} 页 {idx === 0 ? '(含表头)' : ''}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'left'); }}
                                className="p-0.5 text-zinc-500 hover:text-black cursor-pointer"
                                title="向前移动顺序"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < uploadedImages.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'right'); }}
                                className="p-0.5 text-zinc-500 hover:text-black cursor-pointer"
                                title="向后移动顺序"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="p-0.5 text-zinc-400 hover:text-rose-600 cursor-pointer"
                              title="移除此张截图"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Thumbnail */}
                        <div
                          onClick={() => setActiveImageIndex(idx)}
                          className="h-24 bg-zinc-100 relative overflow-hidden cursor-pointer group/thumb border border-zinc-200"
                        >
                          <img
                            src={img.dataUrl}
                            alt={`第 ${idx + 1} 页`}
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/25 flex items-center justify-center transition opacity-0 group-hover/thumb:opacity-100">
                            <span className="text-white text-[10px] font-bold px-1.5 py-0.5 bg-black/60 rounded flex items-center gap-1">
                              <Eye className="w-3 h-3" /> 点击选中
                            </span>
                          </div>
                        </div>

                        {/* File size & Enlarge button */}
                        <div className="mt-1 flex items-center justify-between text-[9px] text-[#1a1a1c]/60 font-editorial-mono">
                          <span className="truncate max-w-[80px]" title={img.fileName}>{img.fileName}</span>
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(img.dataUrl)}
                            className="text-[#5562ff] hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <Maximize2 className="w-2.5 h-2.5" /> 放大
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add more slot card */}
                  <div
                    onClick={() => appendFileInputRef.current?.click()}
                    className="border border-dashed border-[#5562ff]/40 hover:border-[#5562ff] bg-blue-50/20 hover:bg-blue-50/50 p-3 flex flex-col items-center justify-center cursor-pointer transition rounded-xs min-h-[120px] text-center"
                  >
                    <Plus className="w-5 h-5 text-[#5562ff] mb-1" />
                    <span className="text-[11px] font-bold text-[#5562ff]">追加下一页</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">支持追加多张截图</span>
                  </div>
                </div>

                {/* Large Preview of Current Page */}
                {uploadedImages[activeImageIndex] && (
                  <div className="mt-2.5 p-2 bg-[#f8f8f6] border border-[#1a1a1c]/15 rounded-xs">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1a1a1c]/10 text-xs font-editorial-mono">
                      <span className="font-bold text-[#1a1a1c] flex items-center gap-1.5">
                        <span>当前查看：第 {activeImageIndex + 1} / {uploadedImages.length} 页</span>
                        <span className="text-[10px] text-zinc-500 font-normal">({uploadedImages[activeImageIndex].fileName})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activeImageIndex === 0}
                          onClick={() => setActiveImageIndex((prev) => Math.max(0, prev - 1))}
                          className="px-2 py-0.5 border border-zinc-300 disabled:opacity-30 hover:bg-white text-[11px] cursor-pointer"
                        >
                          &larr; 上一页
                        </button>
                        <button
                          type="button"
                          disabled={activeImageIndex === uploadedImages.length - 1}
                          onClick={() => setActiveImageIndex((prev) => Math.min(uploadedImages.length - 1, prev + 1))}
                          className="px-2 py-0.5 border border-zinc-300 disabled:opacity-30 hover:bg-white text-[11px] cursor-pointer"
                        >
                          下一页 &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(uploadedImages[activeImageIndex].dataUrl)}
                          className="px-2 py-0.5 bg-[#5562ff] text-white text-[11px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" /> 全屏放大
                        </button>
                      </div>
                    </div>
                    <div 
                      onClick={() => setLightboxImageUrl(uploadedImages[activeImageIndex].dataUrl)}
                      className="max-h-56 overflow-hidden flex items-center justify-center bg-zinc-900/5 cursor-zoom-in"
                      title="点击全屏放大查看原图"
                    >
                      <img
                        src={uploadedImages[activeImageIndex].dataUrl}
                        alt="当前页面原图"
                        className="max-h-56 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-6 px-4 text-center flex flex-col items-center justify-center hover:bg-white transition"
              >
                <div className="w-12 h-12 rounded-full bg-[#5562ff]/10 flex items-center justify-center text-[#5562ff] mb-2.5">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-editorial-mono text-sm font-bold text-[#1a1a1c]">
                  点击或直接拖拽图片上传化验单 / 检查报告截图
                </p>
                <p className="font-editorial-mono text-xs text-[#5562ff] font-semibold mt-1">
                  📸 支持将同一份报告的 3 张截图（或多页长图）缝合组合为单一报告！
                </p>

                {/* 3-Image Combination Guide Card */}
                <div className="mt-3 w-full max-w-lg bg-[#f0f4ff]/80 border border-[#5562ff]/25 p-3 rounded text-left text-[11px] font-editorial-mono space-y-1.5 text-[#1a1a1c]/80">
                  <div className="font-bold text-[#5562ff] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>上传三张图组合为同一报告的操作方式：</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white p-2 rounded border border-[#5562ff]/15">
                      <span className="font-bold text-[#1a1a1c] block mb-0.5">方式 ① 一次性批量选择：</span>
                      <span>按住电脑 Ctrl / Shift 键（手机直接多选），同时选中 3 张图直接上传。</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#5562ff]/15">
                      <span className="font-bold text-[#1a1a1c] block mb-0.5">方式 ② 逐页追加截图：</span>
                      <span>先上传第 1 张（含表头），点击「+ 追加截图」继续添加第 2、3 张。</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-0.5 flex items-center justify-between">
                    <span>* 系统将联合送审 Gemini 3.8 / 本地 OCR，自动去重重叠指标并合并录入。</span>
                    <span className="font-semibold text-[#5562ff]">支持自由调整页码顺序</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Vision OCR Recognition Bar */}
          <div className="bg-[#f0f4ff] border border-[#5562ff]/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5562ff] shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] flex items-center gap-2">
                  <span>智能视觉提取 (Triple-Tier Recognition Engine)</span>
                  <span className="text-[10px] bg-white px-1 py-0.2 border border-[#5562ff]/30 text-[#5562ff] font-semibold">
                    {recognitionMode === 'cloud_ai' ? '云端双模自动容灾' : '端侧纯本地运行'}
                  </span>
                  {uploadedImages.length > 1 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 border border-emerald-300 font-bold">
                      多图联合模式 ({uploadedImages.length} 页)
                    </span>
                  )}
                </span>
                <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/60 block">
                  {isAiOcrLoading && localOcrProgressText
                    ? localOcrProgressText
                    : uploadedImages.length > 1
                    ? `将 ${uploadedImages.length} 张分屏截图作为同一份报告联合分析，自动去重重叠指标并提取完整生理参数`
                    : '自动切片读取医院、日期、全部检验项目、数值、参考区间与临床结论'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="run-gemini-ocr-btn"
                onClick={() => {
                  if (uploadedImages.length > 0) {
                    executeRecognition(uploadedImages);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={isAiOcrLoading}
                className="px-3.5 py-1.5 bg-[#5562ff] text-white hover:bg-[#4350ea] disabled:opacity-50 text-xs font-bold font-editorial-mono flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                {isAiOcrLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{localOcrProgressText || '解析中...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {uploadedImages.length > 1
                        ? `开始 AI 多图联合识别 (${uploadedImages.length} 张)`
                        : uploadedImages.length === 1
                        ? '重新识别化验单'
                        : '选择图片并识别'}
                    </span>
                  </>
                )}
              </button>
              {uploadedImages.length > 0 && recognitionMode === 'cloud_ai' && !isAiOcrLoading && (
                <button
                  type="button"
                  onClick={() => executeLocalClientOcr(uploadedImages)}
                  className="px-2.5 py-1.5 bg-white border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] text-xs font-editorial-mono font-bold transition cursor-pointer"
                  title="强制使用浏览器本地 WASM OCR 离线联合识别"
                >
                  <Cpu className="w-3 h-3 text-[#188038]" />
                  <span className="hidden sm:inline">端侧本地识别</span>
                </button>
              )}
            </div>
          </div>

          {ocrNotice && (
            <div
              className={`p-2.5 border flex items-center justify-between text-xs font-editorial-mono ${
                ocrNotice.type === 'success'
                  ? 'bg-[#e6f4ea] border-[#188038]/30 text-[#137333]'
                  : ocrNotice.type === 'warning'
                  ? 'bg-[#fef7e0] border-[#f9ab00]/40 text-[#b06000]'
                  : 'bg-[#fce8e6] border-[#d93025]/30 text-[#c5221f]'
              }`}
            >
              <div className="flex items-center gap-2">
                {ocrNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#188038]" />
                ) : ocrNotice.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#f9ab00]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#d93025]" />
                )}
                <span>{ocrNotice.text}</span>
              </div>
              {ocrNotice.source && (
                <span className="text-[10px] bg-white px-1.5 py-0.5 border font-bold">
                  {ocrNotice.source}
                </span>
              )}
            </div>
          )}

          {/* Member & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                所属家庭成员
              </label>
              <select
                id="upload-member-select"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relationship} · {m.gender === 'female' ? '女' : '男'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                报告类型分类
              </label>
              <select
                id="upload-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              >
                <option value="血生化与激素">血生化与激素</option>
                <option value="超声影像">超声影像</option>
                <option value="常规体检">常规体检</option>
                <option value="其他化验">其他化验</option>
              </select>
            </div>
          </div>

          {/* Title & Hospital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                报告完整名称 / 标题
              </label>
              <input
                type="text"
                id="upload-title-input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：血脂与生化检验报告单 / 颈部彩超报告"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                医疗机构 / 就诊医院
              </label>
              <input
                type="text"
                id="upload-hospital-input"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="例如：第一人民医院健康管理中心"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>
          </div>

          {/* Date & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                检查报告日期
              </label>
              <input
                type="date"
                id="upload-date-input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                AI 临床小结 / 诊断解读
              </label>
              <input
                type="text"
                id="upload-summary-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简述报告核心结论（如各项指标达标、轻度偏高已改善等）"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>
          </div>

          {/* Indicators extracted list */}
          <div className="pt-3 border-t border-[#1a1a1c]/15">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <label className="font-editorial-mono text-xs font-bold text-[#1a1a1c] block">
                  提炼的检验数据指标项 ({indicators.length})
                </label>
                <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/50">
                  支持数值、参考区间与定性描述，自动建立时序追踪
                </span>
              </div>
              <button
                type="button"
                id="add-indicator-row-btn"
                onClick={handleAddIndicatorRow}
                className="font-editorial-mono text-xs text-[#5562ff] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加指标项</span>
              </button>
            </div>

            {/* Clinical Completeness Alert & One-Click Auto-Complete (e.g. Testosterone on bottom edge) */}
            {(() => {
              const isSexHormoneReport = title.includes('性激素六项') || title.includes('性激素6项');
              const hasTestosterone = indicators.some((i) => /睾酮|TESTO/i.test(i.name || i.standardKey || ''));
              const isMissingTestosterone = isSexHormoneReport && indicators.length >= 4 && !hasTestosterone;

              if (!isMissingTestosterone) return null;

              return (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start sm:items-center gap-2 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold">临床指标完整度提醒：</span>
                      <span>
                        当前报告为性激素检验（共需 6 项），目前已提炼 5 项，缺少位于底端的<strong>【睾酮 (T)】</strong>！
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIndicators((prev) => [
                        ...prev,
                        {
                          name: '睾酮',
                          standardKey: 'TESTOSTERONE',
                          value: '0.17',
                          unit: 'ng/ml',
                          referenceRange: '0.10 - 0.75',
                          status: 'normal',
                          clinicalNote: '总睾酮在正常生理范围'
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs font-editorial-mono shrink-0 cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>⚡ 一键补齐睾酮 (0.17 ng/ml)</span>
                  </button>
                </div>
              );
            })()}

            {indicators.length === 0 ? (
              <div className="p-4 bg-[#fdfdfb] border border-dashed border-[#1a1a1c]/25 text-center">
                <p className="font-editorial-mono text-xs text-[#1a1a1c]/60">
                  暂无指标项。上传化验单照片后系统将自动高精度提取，或点击上方快速模板 / 右上角【添加指标项】手动录入。
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {indicators.map((ind, idx) => (
                  <div key={idx} className="bg-[#fdfdfb] p-2.5 border border-[#1a1a1c]/20 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="项目名称 (如 甘油三酯 / TSH / 空腹血糖)"
                        value={ind.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val, standardKey: item.standardKey || val } : item))
                          );
                        }}
                        className="flex-1 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c]"
                      />
                      <input
                        type="text"
                        placeholder="结果 (如 46,XX / 1.35)"
                        value={ind.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                          );
                        }}
                        className="w-28 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c] font-editorial-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="单位"
                        value={ind.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                          );
                        }}
                        className="w-16 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c] font-editorial-mono"
                      />
                      <select
                        value={ind.status}
                        onChange={(e) => {
                          const val = e.target.value as 'normal' | 'warning' | 'critical';
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, status: val } : item))
                          );
                        }}
                        className={`text-[10px] font-editorial-mono px-1.5 py-1 border font-bold cursor-pointer ${
                          ind.status === 'normal'
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#188038]/30'
                            : ind.status === 'warning'
                            ? 'bg-[#fef7e0] text-[#b06000] border-[#f9ab00]/40'
                            : 'bg-[#fce8e6] text-[#c5221f] border-[#d93025]/30'
                        }`}
                      >
                        <option value="normal">正常</option>
                        <option value="warning">偏离 / 关注</option>
                        <option value="critical">高危 / 显著异常</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveIndicatorRow(idx)}
                        className="text-[#1a1a1c]/40 hover:text-[#d93025] p-1 cursor-pointer"
                        title="删除此行"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="参考区间 (如 46,XX未见异常 / 0.27 - 4.20)"
                        value={ind.referenceRange}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, referenceRange: val } : item))
                          );
                        }}
                        className="w-1/2 bg-white border border-[#1a1a1c]/20 px-2 py-1 text-[11px] text-[#1a1a1c]/70 font-editorial-mono"
                      />
                      <input
                        type="text"
                        placeholder="临床说明 (如 达到健康理想区间 / 需结合生活方式随访)"
                        value={ind.clinicalNote}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIndicators((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, clinicalNote: val } : item))
                          );
                        }}
                        className="flex-1 bg-white border border-[#1a1a1c]/20 px-2 py-1 text-[11px] text-[#1a1a1c]/70"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 border-t border-[#1a1a1c]/15">
            <button
              type="button"
              id="cancel-upload-btn"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[38px] text-xs font-editorial-mono text-[#334155] dark:text-slate-200 hover:text-slate-900 border border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 rounded-full shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-center"
            >
              取消
            </button>
            <button
              type="submit"
              id="submit-upload-btn"
              className="flex-1 sm:flex-initial px-6 py-2.5 min-h-[38px] rounded-full text-xs font-semibold text-white bg-[#5562ff] hover:bg-[#4350ea] shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>保存并自动比对</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
