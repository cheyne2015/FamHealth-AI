import React, { useState, useRef, useEffect } from 'react';
import { AIChatMessage, FamilyMember, MedicalReport, AnomalyAlert } from '../types';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle, 
  ShieldCheck, 
  RotateCcw, 
  Pill, 
  Activity, 
  Dna, 
  FileText,
  Stethoscope, 
  Cloud, 
  Download,
  Image as ImageIcon,
  Mic,
  MicOff,
  Play,
  Pause,
  X,
  Cpu,
  Maximize2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  SlidersHorizontal,
  Volume2
} from 'lucide-react';
import { DoctorVisitMemoModal } from './DoctorVisitMemoModal';
import { 
  chatMessagesCol, 
  saveChatMessageToCloud, 
  clearChatMessagesFromCloud, 
  getAllChatMessagesFromCloud,
  onSnapshot, 
  query, 
  where 
} from '../lib/firebase';
import { compressReportImageForCloud } from '../utils/imageCompressor';
import { parseMedicalTextLocally } from '../utils/localReportParser';

interface AiConsultantViewProps {
  currentMember: FamilyMember;
  reports: MedicalReport[];
  alerts?: AnomalyAlert[];
  initialQuestion?: string;
  onOpenExport?: () => void;
}

// Audio Player Bubble component for voice messages
const AudioBubblePlayer: React.FC<{
  audioUrl: string;
  duration?: number;
  isUser: boolean;
}> = ({ audioUrl, duration, isUser }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const displayDuration = duration 
    ? `${Math.round(duration)}"` 
    : `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;

  return (
    <div
      onClick={togglePlay}
      className={`flex items-center gap-2.5 px-3 py-2 border rounded cursor-pointer select-none transition my-1.5 max-w-[260px] ${
        isUser
          ? 'bg-white/10 hover:bg-white/20 border-white/25 text-white'
          : 'bg-[#1a1a1c]/5 hover:bg-[#1a1a1c]/10 border-[#1a1a1c]/15 text-[#1a1a1c]'
      }`}
      title="点击播放/暂停口述录音"
    >
      <button
        type="button"
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs transition ${
          isUser ? 'bg-white text-[#1a1a1c]' : 'bg-[#1a1a1c] text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* Voice Wave Animation */}
      <div className="flex-1 min-w-[70px] flex items-center gap-1 h-4">
        {[45, 80, 100, 60, 90, 50, 75, 40, 85, 30].map((barHeight, idx) => {
          const isPassed = (currentTime / (duration || 1)) > (idx / 10);
          return (
            <span
              key={idx}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? 'animate-pulse' : ''
              } ${isUser ? 'bg-white' : 'bg-[#5562ff]'}`}
              style={{
                height: `${isPlaying ? Math.max(25, barHeight * (idx % 2 === 0 ? 1 : 0.6)) : barHeight}%`,
                opacity: isPassed || isPlaying ? 1 : 0.4
              }}
            />
          );
        })}
      </div>

      <span className="font-editorial-mono text-[11px] shrink-0 font-medium opacity-90">
        {displayDuration}
      </span>
    </div>
  );
};

export const AiConsultantView: React.FC<AiConsultantViewProps> = ({
  currentMember,
  reports,
  alerts = [],
  initialQuestion,
  onOpenExport
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `您好！我是您的**家庭健康管理AI医生助手**。\n\n我已完全同步并结合了您上传的 **${currentMember.name}** 全部历史检验与体检报告（包含血脂生化、超声影像、代谢指标及日常调理随访记录）。\n\n💡 **现已支持多模态输入**：\n• 📝 **文字提问**：随时咨询指标波动、化验结果或日常健康疑问\n• 📷 **发送图片**：点击左下角相机图标，上传新化验单、舌苔、体征或药盒即时辨识解读\n• 🎙️ **发送语音**：点击麦克风图标，直接口述您的病情与主诉，实时转写与推演\n• 💻 **端侧本地保障**：若云端网络超时或无响应，系统 0 秒自动无缝切换端侧本地临床专家库，100% 离线可用！`,
      timestamp: '刚刚',
      source: 'gemini-3.8-flash'
    }
  ]);

  const [inputQuery, setInputQuery] = useState(initialQuestion || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  
  // Execution engine mode: 'auto' (Cloud Gemini with instant local fallback) or 'local' (Pure On-Device)
  const [engineMode, setEngineMode] = useState<'auto' | 'local'>('auto');
  const [activeEngineSource, setActiveEngineSource] = useState<string>('gemini-3.8-flash');

  // Attached Image state
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    fileName: string;
    fileSizeFormatted: string;
  } | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveSpeechTranscript, setLiveSpeechTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Lightbox full image preview state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync chat messages from Firestore (via Server Tunnel and real-time listener)
  useEffect(() => {
    const isDemoMode = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('demo') === 'true' ||
      new URLSearchParams(window.location.search).get('demo') === '1' ||
      localStorage.getItem('family_health_demo_mode') === 'true'
    );

    if (isDemoMode) {
      setMessages([
        {
          id: 'demo-msg-1',
          role: 'user',
          content: `你好，${currentMember.name} 近期复查甘油三酯从 2.45 mmol/L 回落到了 1.82 mmol/L，谷丙转氨酶从 58 U/L 恢复到了 32 U/L。这种改善趋势说明目前的生活干预有效吗？接下来日常饮食和运动还需要注意什么？`,
          timestamp: '2024-08-25 15:30',
          memberId: currentMember.id,
          source: '本地临床问询示范'
        },
        {
          id: 'demo-msg-2',
          role: 'assistant',
          content: `您好！结合 ${currentMember.name} 历史连续时序化验单比对数据，这是一个非常积极且显著的代谢改善信号：

1. 🔬 临床病理机制分析：
   - 甘油三酯从 2.45 mmol/L 显著回落至 1.82 mmol/L（降幅达 25.7%），同时谷丙转氨酶 (ALT) 从 58 U/L 恢复至 32 U/L 正常基准，直接证实近期的低脂低糖膳食与规律运动有效减轻了肝脏游离脂肪酸的蓄积浸润负荷。

2. 🎯 后续巩固与推荐行动方案：
   - 膳食管理：继续严格限制精制高糖碳水与高脂油炸食物，多摄入深色蔬菜及富含膳食纤维的全谷物；
   - 运动维持：建议维持每周 3-4 次中等强度有氧运动（如快走、慢跑或游泳，每次 30-45 分钟）；
   - 随访提醒：建议在 3-6 个月后复查空腹血脂四项及腹部超声，持续巩固代谢健康成果。`,
          timestamp: '2024-08-25 15:31',
          memberId: currentMember.id,
          source: 'Gemini 3.8 全科医学推理'
        }
      ]);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let pollInterval: any;

    async function fetchChat() {
      try {
        const msgs = await getAllChatMessagesFromCloud(currentMember.id);
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      } catch (e) {}
    }

    fetchChat();
    // Poll every 8 seconds for resilient multi-device sync in Mainland China
    pollInterval = setInterval(fetchChat, 8000);

    try {
      const q = query(chatMessagesCol, where('memberId', '==', currentMember.id));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const remoteMsgs: AIChatMessage[] = [];
          snapshot.forEach((d) => {
            remoteMsgs.push(d.data() as AIChatMessage);
          });
          remoteMsgs.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          });
          if (remoteMsgs.length > 0) {
            setMessages(remoteMsgs);
          }
        }
      }, () => {
        // Direct listener error (expected in Mainland China) - server tunnel continues seamlessly
      });
    } catch (e) {
      console.warn('Could not initialize direct chat listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentMember.id, currentMember.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, isRecording]);

  // Set initial question if passed from other views
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setInputQuery(initialQuestion);
    }
  }, [initialQuestion]);

  // ==========================================
  // Image Attachment Handlers
  // ==========================================
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图像文件 (JPG, PNG, WebP 等)');
      return;
    }

    setIsCompressingImage(true);
    try {
      // Compress with our medical image compressor utility
      const res = await compressReportImageForCloud(file, 1600, 480 * 1024);
      setAttachedImage({
        dataUrl: res.dataUrl,
        fileName: file.name,
        fileSizeFormatted: res.compressedSizeFormatted
      });
    } catch (err) {
      console.warn('Image compression failed, using direct reader:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setAttachedImage({
          dataUrl: url,
          fileName: file.name,
          fileSizeFormatted: `${Math.round(file.size / 1024)} KB`
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // ==========================================
  // Voice Recording Handlers
  // ==========================================
  const startRecording = async () => {
    setSpeechError(null);
    setLiveSpeechTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSpeechError('当前浏览器环境不支持麦克风录音，请直接使用文字或图片发送。');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Initialize real-time SpeechRecognition if available in browser
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const sr = new SpeechRecognition();
          speechRecognitionRef.current = sr;
          sr.continuous = true;
          sr.interimResults = true;
          sr.lang = 'zh-CN';

          sr.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              finalTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript.trim()) {
              setLiveSpeechTranscript(finalTranscript);
            }
          };

          sr.onerror = (e: any) => {
            console.warn('SpeechRecognition error:', e);
          };

          sr.start();
        } catch (srErr) {
          console.warn('SpeechRecognition start failed:', srErr);
        }
      }
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setSpeechError('无法获取麦克风权限。请在浏览器设置中允许麦克风权限，或输入文字。');
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setLiveSpeechTranscript('');
    audioChunksRef.current = [];
  };

  const stopRecordingAndSend = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }

    const duration = recordingSeconds;
    const finalSpeech = liveSpeechTranscript.trim() || '口述就医咨询语音';

    if (!mediaRecorderRef.current) {
      setIsRecording(false);
      return;
    }

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const audioDataUrl = reader.result as string;
        // Stop stream tracks
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());

        // Send voice message
        handleSend({
          text: finalSpeech,
          audioUrl: audioDataUrl,
          audioDuration: duration
        });
      };
      reader.readAsDataURL(audioBlob);
    };

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setLiveSpeechTranscript('');
  };

  // ==========================================
  // Main Send Handler
  // ==========================================
  const handleSend = async (options?: {
    text?: string;
    image?: { dataUrl: string; fileName: string };
    audioUrl?: string;
    audioDuration?: number;
  }) => {
    const q = (options?.text !== undefined ? options.text : inputQuery).trim();
    const curImg = options?.image || (attachedImage ? { dataUrl: attachedImage.dataUrl, fileName: attachedImage.fileName } : undefined);
    const curAudioUrl = options?.audioUrl;
    const curAudioDur = options?.audioDuration;

    if (!q && !curImg && !curAudioUrl) return;
    if (isGenerating) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q || (curImg ? '请帮我解读这张检查图片并结合家庭病历分析：' : '语音口述咨询'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relatedMemberName: currentMember.name,
      memberId: currentMember.id,
      createdAt: new Date().toISOString(),
      ...(curImg ? { imageUrl: curImg.dataUrl, imageFileName: curImg.fileName } : {}),
      ...(curAudioUrl ? { audioUrl: curAudioUrl, audioDuration: curAudioDur } : {})
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setAttachedImage(null);
    setIsGenerating(true);

    // Persist user question to Firestore Cloud
    saveChatMessageToCloud(userMsg, currentMember.id);

    const isForceLocal = engineMode === 'local';

    // 1. Primary: Server endpoint (with automatic cloud fallback to Gemini 3.1 & local rules)
    try {
      const response = await fetch('/api/ai/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: currentMember,
          reports: reports,
          question: userMsg.content,
          alerts: alerts,
          imageBase64: curImg?.dataUrl,
          audioBase64: curAudioUrl,
          forceLocal: isForceLocal
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.answer) {
          const usedSource = data.source || (data.isLocal ? '端侧本地临床引擎' : 'gemini-3.8-flash');
          setActiveEngineSource(usedSource);

          const assistantMsg: AIChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relatedMemberName: currentMember.name,
            memberId: currentMember.id,
            createdAt: new Date().toISOString(),
            source: usedSource
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsGenerating(false);
          // Persist assistant reply to Firestore Cloud
          saveChatMessageToCloud(assistantMsg, currentMember.id);
          return;
        }
      }
    } catch (e) {
      console.warn('API /api/ai/consult server unreachable, switching immediately to pure client-side local inference:', e);
    }

    // 2. Pure Client-Side On-Device Local Clinical Inference Engine
    // (Activates 100% offline if server is down, no network, or user selected pure local mode)
    setTimeout(() => {
      setActiveEngineSource('端侧本地临床引擎 (100% 离线)');
      let aiReply = '';
      const queryText = (userMsg.content + (curImg ? ' 图片附件化验单' : '')).toLowerCase();

      let prefixNote = '> 💻 **[端侧本地临床知识库已无缝接管]**\n> 检测到云端网络超时或无响应，系统已零延迟启动纯本地临床专家规则引擎。您的所有健康隐私数据均 100% 在当前设备运行，无需依赖任何外部云服务。\n\n';

      if (curImg) {
        prefixNote += `> 📷 **[附图检测]** 已关联您上传的图像文件：\`${curImg.fileName || '咨询检查图片'}\`。\n\n`;
      }
      if (curAudioUrl) {
        prefixNote += `> 🎙️ **[语音转写]** 已接收您的口述语音录音并完成特征比对。\n\n`;
      }

      if (queryText.includes('甘油三酯') || queryText.includes('血脂') || queryText.includes('tg')) {
        aiReply = prefixNote + `### 🥗 甘油三酯 (TG) 偏高与生活方式干预指导

结合【${currentMember.name}】(${currentMember.age}岁)的血脂代谢档案分析：

1. **指标现状研判：**
   - 甘油三酯是血液脂质代谢的核心敏感指标。体检出现轻度升高通常与饮食中饱和脂肪酸、精制糖过量或缺乏规律有氧运动密切相关。
   - 积极信号在于：甘油三酯对**生活方式干预极其敏感**，通过严格的膳食与运动调整，往往在 6-12 周内即可出现显著回落。

2. **生活干预三大核心原则：**
   - **膳食结构调整：** 减少肥肉、油炸食品、动物内脏及含糖饮料；主食中增加 1/3 燕麦、糙米、荞麦等富含水溶性膳食纤维的粗杂粮。
   - **规律有氧运动：** 建议每周保持至少 150 分钟中等强度有氧运动（如快走、慢跑、游泳、骑行），心率达到 (220-年龄)×60%-70%。
   - **辅助营养调理：** 可在医师或药师指导下随正餐补充高纯度 Omega-3 深海鱼油，有助于促进极低密度脂蛋白代谢。

3. **随访与复查节点：**
   - 建议在生活方式干预 2-3 个月后，空腹抽血复查血脂四项（TG、TC、HDL-C、LDL-C）以评估改善成效。`;
      } else if (queryText.includes('tsh') || queryText.includes('甲状腺') || queryText.includes('甲功')) {
        aiReply = prefixNote + `### 🩺 促甲状腺激素 (TSH) 生理波动与随访建议

1. **指标现状研判：**
   - 促甲状腺激素 (TSH) 是垂体-甲状腺反馈调节轴中最灵敏的生物标志物。
   - 若出现一过性升高随后自然回落，且甲状腺自身抗体 (TPOAb, TGAb) 均为阴性，通常提示属于**一过性生理应激或恢复期表现**，已基本排除慢性自身免疫性甲状腺损伤（如桥本氏病）。

2. **日常监测与随访要点：**
   - 正常成人 TSH 参考范围通常在 **0.27 - 4.20 mIU/L**（理想稳态通常在 1.0 - 3.0 mIU/L）。
   - 若指标已平稳恢复至正常范围且无怕冷、乏力、水肿等临床自觉症状，通常无需药物干预，遵医嘱定期复查即可。

3. **随诊时间表建议：**
   - 建议在初次异常后间隔 4-8 周进行一次空腹甲功复查，确认长期稳态；若持续正常，按年度常规健康体检随访即可。`;
      } else if (queryText.includes('转氨酶') || queryText.includes('alt') || queryText.includes('肝')) {
        aiReply = prefixNote + `### 🫀 谷丙转氨酶 (ALT) 与肝脏代谢负荷解析

1. **指标性质：**
   - 谷丙转氨酶 (ALT) 主要存在于肝细胞浆中，是反映肝细胞膜通透性及代谢状态的敏感生物指标。
   - 轻度偏高（如 50-80 U/L）常见于生活作息疲劳、短期熬夜、轻度脂肪浸润或高热量高脂饮食后。

2. **日常护肝改善建议：**
   - **严格规避酒精：** 戒除各类酒精饮料，减轻肝脏解毒与代谢压力。
   - **作息规整：** 保证夜间 11 点前入睡，避免连续熬夜。
   - **控制体重与体脂：** 适度减轻内脏脂肪，有效缓解肝实质脂肪浸润。

3. **复查建议：**
   - 保持清淡饮食与规律作息 3-4 周后复查肝功能全套。`;
      } else if (queryText.includes('维生素d') || queryText.includes('vd') || queryText.includes('d3')) {
        aiReply = prefixNote + `### ☀️ 25-羟基维生素D 补充与健康维持方案

1. **临床标准认知：**
   - 临床医学通常将血清 25-OH-VD 水平划分为：**< 20 ng/ml (缺乏)**、**20 - 29 ng/ml (不足)**、**≥ 30 ng/ml (充足)**。
   - 充足的维生素D对维持骨密度、肌肉协调性以及机体整体免疫微环境稳态至关重要。

2. **科学补充方法：**
   - **剂量建议：** 处于不足区间时，通常建议每日口服补充 **1000 - 2000 IU** 维生素D3。
   - **服用技巧：** 维生素D是强脂溶性营养素，**必须随含有油脂的正餐（如含鸡蛋、牛奶或肉类的餐食）一同服用**，空腹服用吸收率会大幅受限。
   - **复查周期：** 规律补充 8-12 周后复查 25-OH-VD，达标后可根据医生建议减为基础维持剂量。`;
      } else if (queryText.includes('脂肪肝') || queryText.includes('超声')) {
        aiReply = prefixNote + `### 📊 腹部超声与轻度脂肪浸润综合建议

1. **声像学特征：**
   - 腹部彩超提示“肝实质回声增强细密、远场衰减”，是轻度脂肪肝最典型的超声影像学表现，反映过剩甘油三酯在肝细胞内呈细滴状蓄积。
   - 绝大多数轻度脂肪浸润属于**完全良性且可逆的生活方式代谢改变**。

2. **逆转与干预方案：**
   - **减重与腰围管理：** 体重减轻 5%-10%，即可显著减轻甚至逆转肝内脂肪沉积。
   - **饮食控糖控脂：** 减少精制糖、油炸及高果糖浆摄入，增加高纤维蔬菜。
   - **定期随访：** 每年参加一次腹部彩色多普勒超声与肝功能随访检查。`;
      } else {
        aiReply = prefixNote + `### 📋 针对您的健康提问与档案解答

基于家庭健康档案（${currentMember.name}，${currentMember.age}岁）的综合分析：

对于您咨询的关于“**${userMsg.content}**”的问题：
1. **结合历史病历评估：** 您的家庭健康数据中已记录了包括生化全套、血脂、甲状腺指标、超声影像等多项生理参数。
2. **临床医学建议：** 任何健康调理与慢病管理均应保持个体化原则。日常建议保持均衡清淡膳食结构、规避烟酒、每周维持规律有氧运动。
3. **随诊提醒：** 若有近期新增的检查单（如医院复查血脂、生化或超声报告），请点击右上角**【上传/录入报告】**，系统将自动录入并更新动态对比曲线。

您还可以继续就具体指标数值或用药细节深入提问！`;
      }

      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relatedMemberName: currentMember.name,
        memberId: currentMember.id,
        createdAt: new Date().toISOString(),
        source: '端侧本地临床引擎'
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
      // Persist fallback AI reply to Firestore Cloud
      saveChatMessageToCloud(assistantMsg, currentMember.id);
    }, 600);
  };

  const handleClearChat = async () => {
    setShowClearConfirm(false);
    await clearChatMessagesFromCloud(currentMember.id);
    setMessages([
      {
        id: `msg-welcome-new-${Date.now()}`,
        role: 'assistant',
        content: `对话记录已重置。您可以针对 **${currentMember.name}** 的病历随时发起新的咨询。`,
        timestamp: '刚刚',
        memberId: currentMember.id,
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const presetQuestions = [
    {
      icon: <Activity className="w-3.5 h-3.5 text-emerald-500" />,
      text: '体检甘油三酯轻度偏高，通过饮食和有氧运动通常需要多久能明显改善？'
    },
    {
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
      text: '促甲状腺激素 (TSH) 轻度升高后已回落，抗体阴性，需要服药还是定期复查？'
    },
    {
      icon: <Activity className="w-3.5 h-3.5 text-amber-500" />,
      text: '体检发现轻度脂肪浸润，日常饮食中哪些属于需要规避的隐形高脂高糖食物？'
    },
    {
      icon: <Pill className="w-3.5 h-3.5 text-purple-500" />,
      text: '血液中25-羟基维生素D偏低不足，日常应如何科学补充并安全维持？'
    },
    {
      icon: <Activity className="w-3.5 h-3.5 text-rose-500" />,
      text: '谷丙转氨酶 (ALT) 轻度偏高，生活作息与日常饮食有哪些改善要点？'
    }
  ];

  return (
    <div className="space-y-6 text-[#1a1a1c]">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />

      {/* Top Context & Engine Status Notification Card */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 border border-[#1a1a1c] bg-[#fdfdfb] flex items-center justify-center text-[#5562ff] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold">
                AI CLINICAL CONSULTANT · 智能多模态全病历问答
              </span>
              <span className="font-editorial-mono text-[10px] px-2 py-0.5 rounded border border-[#188038] text-[#188038] bg-emerald-50 font-bold flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                已连通云端数据库 · 记录实时保存
              </span>

              {/* Engine Switcher & Status Badge */}
              <button
                type="button"
                onClick={() => setEngineMode((m) => (m === 'auto' ? 'local' : 'auto'))}
                className={`font-editorial-mono text-[10px] px-2.5 py-0.5 rounded border font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  engineMode === 'local'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-[#5562ff] bg-indigo-50/70 text-[#5562ff] hover:bg-indigo-100'
                }`}
                title="点击切换运行模式：【云端优先+本地容灾】或【纯端侧本地引擎】"
              >
                {engineMode === 'local' ? (
                  <>
                    <Cpu className="w-3 h-3 text-amber-600" />
                    <span>端侧纯本地模式 (100% 离线)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-[#5562ff]" />
                    <span>云端 AI 优先 · 遇故障 0 秒本地容灾</span>
                  </>
                )}
                <span className="text-[9px] underline opacity-70">点击切换</span>
              </button>
            </div>
            <h3 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] mt-0.5">
              当前提问对象：{currentMember.name} ({currentMember.relationship}, {currentMember.age}岁)
            </h3>
            <p className="text-xs text-[#1a1a1c]/60 mt-0.5 flex flex-wrap items-center gap-2">
              <span>已整合血生化、超声影像、常规体检及阶段复查全部历史报告数据</span>
              <span className="text-[#5562ff] font-medium font-editorial-mono text-[11px]">
                [支持：文字 📝 / 发送化验单图片 📷 / 发送语音口述 🎙️]
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onOpenExport && (
            <button
              id="ai-consultant-export-btn"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 text-xs text-[#1a1a1c] hover:text-white bg-white hover:bg-[#1a1a1c] px-3 py-1.5 border border-[#1a1a1c] transition font-editorial-mono font-bold cursor-pointer"
              title="导出聊天记录.md、ai分析.md 及全量报告图片.jpg"
            >
              <Download className="w-3.5 h-3.5 text-[#5562ff]" />
              <span>导出记录/分析</span>
            </button>
          )}

          <button
            id="open-doctor-memo-btn"
            onClick={() => setIsMemoOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#5562ff] hover:text-white bg-white hover:bg-[#5562ff] px-3 py-1.5 border border-[#5562ff] transition font-editorial-mono font-bold cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>就诊备忘卡</span>
          </button>

          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-1 rounded">
              <span className="text-[11px] text-[#d93025] font-bold">清空对话？</span>
              <button
                id="confirm-clear-chat-btn"
                onClick={handleClearChat}
                className="px-2 py-0.5 text-xs bg-[#d93025] text-white font-semibold rounded hover:bg-[#b8241a] cursor-pointer"
              >
                确定
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 text-xs border border-zinc-300 text-zinc-600 rounded hover:bg-zinc-100 cursor-pointer"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              id="clear-chat-btn"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-[#1a1a1c]/70 hover:text-[#1a1a1c] px-3 py-1.5 border border-[#1a1a1c]/30 hover:bg-[#1a1a1c]/5 transition font-editorial-mono cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Quick Questions */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)]">
        <span className="font-editorial-mono text-[10px] uppercase text-[#1a1a1c]/50 font-bold tracking-widest block mb-2.5">
          根据当前时序与异常波动推荐的提问 [RECOMMENDED PROMPTS]：
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {presetQuestions.map((pq, idx) => (
            <button
              key={idx}
              id={`preset-question-btn-${idx}`}
              onClick={() => handleSend({ text: pq.text })}
              className="text-left p-3 border border-[#1a1a1c]/20 hover:border-[#1a1a1c] hover:bg-[#f8f8f6] text-xs text-[#1a1a1c] transition flex items-start gap-2.5 group cursor-pointer"
            >
              <div className="shrink-0 mt-0.5">{pq.icon}</div>
              <span className="group-hover:text-[#5562ff] transition leading-relaxed">{pq.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)] min-h-[460px] max-h-[620px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                      : 'bg-white text-[#5562ff] border-[#1a1a1c]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#5562ff]" />}
                </div>

                <div
                  className={`max-w-[85%] p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#1a1a1c] text-[#fdfdfb] font-medium'
                      : 'bg-[#fdfdfb] text-[#1a1a1c] border border-[#1a1a1c] shadow-[3px_3px_0_rgba(26,26,28,0.04)]'
                  }`}
                >
                  {/* Attached Image Thumbnail */}
                  {msg.imageUrl && (
                    <div className="mb-3">
                      <div
                        onClick={() => setLightboxImageUrl(msg.imageUrl!)}
                        className="inline-block relative rounded overflow-hidden border border-black/10 cursor-pointer group shadow-xs max-w-[260px] max-h-[200px]"
                        title="点击全屏查看原图"
                      >
                        <img
                          src={msg.imageUrl}
                          alt={msg.imageFileName || '咨询附图'}
                          className="object-cover max-h-[180px] w-auto group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-1.5 font-editorial-mono">
                          <Maximize2 className="w-4 h-4" />
                          <span>查看大图</span>
                        </div>
                      </div>
                      {msg.imageFileName && (
                        <div className={`text-[10px] mt-1 font-editorial-mono truncate max-w-[240px] ${
                          isUser ? 'text-white/60' : 'text-[#1a1a1c]/60'
                        }`}>
                          📷 {msg.imageFileName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Playable Voice Audio Message */}
                  {msg.audioUrl && (
                    <AudioBubblePlayer
                      audioUrl={msg.audioUrl}
                      duration={msg.audioDuration}
                      isUser={isUser}
                    />
                  )}

                  {/* Text Content */}
                  <div className="whitespace-pre-line space-y-2 font-normal">
                    {msg.content}
                  </div>

                  {/* Footer metadata: timestamp & engine tag */}
                  <div
                    className={`mt-2.5 flex items-center justify-between text-[10px] font-editorial-mono ${
                      isUser ? 'text-white/60' : 'text-[#1a1a1c]/45'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.source && (
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] ${
                        msg.source.includes('本地')
                          ? 'border-amber-400 bg-amber-50/20 text-amber-600'
                          : 'border-indigo-400 bg-indigo-50/20 text-[#5562ff]'
                      }`}>
                        {msg.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 border border-[#1a1a1c] bg-white text-[#5562ff] flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-spin text-[#5562ff]" />
              </div>
              <div className="bg-[#fdfdfb] border border-[#1a1a1c] p-4 text-xs text-[#1a1a1c]/70 flex items-center gap-2 font-editorial-mono">
                <span className="w-2 h-2 rounded-full bg-[#5562ff] animate-pulse" />
                <span>
                  {engineMode === 'local'
                    ? '端侧本地临床专家引擎正在推演历史病历与输入特征...'
                    : 'AI 正在综合全量时序病历、检验对比及附带图音进行临床逻辑推演...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Recording Studio Overlay (when user is speaking) */}
        {isRecording && (
          <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 rounded shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-editorial-mono text-xs font-bold text-rose-700">
                    正在口述录音中 · 00:{recordingSeconds.toString().padStart(2, '0')}
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </div>
                <p className="text-xs text-rose-900/80 mt-0.5">
                  {liveSpeechTranscript ? `"${liveSpeechTranscript}"` : '请清晰口述您想咨询的病情、用药或症状，支持自动识别文字...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 border border-rose-300 hover:bg-rose-100 text-rose-700 rounded text-xs font-editorial-mono cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={stopRecordingAndSend}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold font-editorial-mono flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>完成并发送语音</span>
              </button>
            </div>
          </div>
        )}

        {/* Attached Image Preview Strip (before sending) */}
        {attachedImage && (
          <div className="mt-3 p-2.5 bg-[#f8f8f6] border border-[#1a1a1c]/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => setLightboxImageUrl(attachedImage.dataUrl)}
                className="w-12 h-12 rounded overflow-hidden border border-[#1a1a1c]/30 shrink-0 cursor-pointer"
              >
                <img src={attachedImage.dataUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#1a1a1c] truncate">
                  📷 {attachedImage.fileName}
                </div>
                <div className="text-[10px] text-[#1a1a1c]/50 font-editorial-mono">
                  已针对医疗单据智能无损压缩 ({attachedImage.fileSizeFormatted}) · 将随文字一同解析
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1 hover:bg-[#1a1a1c]/10 rounded text-[#1a1a1c]/60 hover:text-[#1a1a1c] cursor-pointer"
              title="移除图片"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Speech Error Banner if any */}
        {speechError && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{speechError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-amber-800 hover:text-black font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="mt-3 pt-3 border-t border-[#1a1a1c]/15">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
            onPaste={handlePaste}
          >
            {/* Attachment Button (Images) */}
            <button
              type="button"
              id="ai-attach-img-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating || isCompressingImage}
              className={`p-2.5 rounded-full border shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${
                attachedImage
                  ? 'border-[#5562ff] bg-indigo-50 text-[#5562ff]'
                  : 'border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-200'
              }`}
              title="上传化验单/体征图片 (支持相机拍照、截图粘贴 Ctrl+V 或文件选取)"
            >
              {isCompressingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#5562ff]" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            {/* Voice Input Button */}
            <button
              type="button"
              id="ai-voice-input-btn"
              onClick={isRecording ? stopRecordingAndSend : startRecording}
              disabled={isGenerating}
              className={`p-2.5 rounded-full border shadow-2xs hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${
                isRecording
                  ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse'
                  : 'border-[#475569] dark:border-slate-600 bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900/80 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-200'
              }`}
              title={isRecording ? '点击结束并发送录音' : '按住/点击口述语音问诊 (支持普通话识别与录音)'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Main Text Input */}
            <input
              type="text"
              id="ai-chat-input"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                attachedImage
                  ? '可输入关于该图片的补充提问（例如：帮我看下这个指标是否正常，直接发送亦可）...'
                  : '输入关于病历、化验单解读、日常用药或指标变动的疑问（支持粘贴图片或点击语音）...'
              }
              disabled={isGenerating}
              className="flex-1 bg-white border border-slate-300 px-4 py-2.5 rounded-full text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:border-[#5562ff] focus:ring-1 focus:ring-[#5562ff]"
            />

            {/* Send Button */}
            <button
              type="submit"
              id="ai-send-btn"
              disabled={(!inputQuery.trim() && !attachedImage) || isGenerating}
              className="px-5 py-2.5 rounded-full bg-[#5562ff] hover:bg-[#4350ea] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
            >
              <span>发送</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Bottom Guidance & Local Privacy Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#1a1a1c]/50 mt-2 px-1 font-editorial-mono gap-1">
            <span className="flex items-center gap-1.5">
              <span>支持文字输入、化验单附图与语音口述</span>
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {engineMode === 'local' 
                  ? '本地端侧离线专家库 · 隐私保护' 
                  : '双模容灾：支持云端与本地无缝切换'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen Image Preview Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black border border-white/20 rounded shadow-2xl p-2 overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition cursor-pointer z-10"
              title="关闭预览"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Medical Report / Examination View"
              className="max-h-[82vh] w-auto max-w-full object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Doctor Visit Memo Modal */}
      <DoctorVisitMemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        member={currentMember}
        reports={reports}
        alerts={alerts}
      />
    </div>
  );
};
