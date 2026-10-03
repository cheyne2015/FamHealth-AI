import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { X, UserPlus, Sparkles, Check, Tag } from 'lucide-react';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: FamilyMember) => void;
}

const COLOR_PRESETS = [
  { label: '深墨', color: '#1a1a1c' },
  { label: '克莱因蓝', color: '#5562ff' },
  { label: '森林绿', color: '#188038' },
  { label: '琥珀棕', color: '#b45309' },
  { label: '酒红', color: '#991b1b' },
  { label: '石青', color: '#0f766e' },
];

const PRESET_TAGS = [
  '常规年度体检',
  '血脂代谢管理',
  '轻度脂肪肝随访',
  '甲功异常监测',
  '血压健康监测',
  '血糖代谢关注',
  '维生素营养补充',
  '过敏/高敏体质',
  '青少年生长发育',
  '中老年慢病随访'
];

export const CreateMemberModal: React.FC<CreateMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember
}) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('本人');
  const [age, setAge] = useState<number | ''>(35);
  const [gender, setGender] = useState<'female' | 'male'>('male');
  const [bloodType, setBloodType] = useState('A型');
  const [selectedTags, setSelectedTags] = useState<string[]>(['常规年度体检']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [avatarColor, setAvatarColor] = useState('#5562ff');
  const [healthStatusSummary, setHealthStatusSummary] = useState('');

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTagInput.trim() && !selectedTags.includes(customTagInput.trim())) {
      setSelectedTags((prev) => [...prev, customTagInput.trim()]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      name: name.trim(),
      relationship: relationship.trim() || '家庭成员',
      age: typeof age === 'number' ? age : 30,
      gender,
      bloodType: bloodType || '未检测',
      tags: selectedTags.length > 0 ? selectedTags : ['健康关注'],
      avatarColor,
      healthStatusSummary:
        healthStatusSummary.trim() ||
        `档案已建立，当前记录了${gender === 'female' ? '女性' : '男性'}健康关注点，建议按就诊时间上传化验报告进行时序比对。`
    };

    onAddMember(newMember);
    onClose();
  };

  // Quick preset fills
  const handleQuickPreset = (preset: 'mother' | 'child' | 'father') => {
    if (preset === 'mother') {
      setName('李阿姨 (母亲)');
      setRelationship('母亲');
      setAge(62);
      setGender('female');
      setBloodType('O型');
      setSelectedTags(['慢性病监测', '高血压关爱', '常规年度体检']);
      setAvatarColor('#b45309');
      setHealthStatusSummary('原发性高血压病史4年，日常服药缬沙坦；关注空腹血糖与骨密度变化。');
    } else if (preset === 'child') {
      setName('辰辰 (小宝)');
      setRelationship('子女');
      setAge(2);
      setGender('male');
      setBloodType('A型');
      setSelectedTags(['幼儿成长', '常规年度体检']);
      setAvatarColor('#188038');
      setHealthStatusSummary('2岁幼儿生长发育监测，按月接种疫苗，关注微量元素及呼吸道易敏体质。');
    } else if (preset === 'father') {
      setName('侯先生 (父亲)');
      setRelationship('父亲');
      setAge(65);
      setGender('male');
      setBloodType('B型');
      setSelectedTags(['慢性病监测', '常规年度体检']);
      setAvatarColor('#0f766e');
      setHealthStatusSummary('轻度脂肪肝，关注血脂四项及肝肾功能指标时序波动。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#fdfdfb] border-2 border-[#1a1a1c] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1a1a1c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1c] text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-editorial-serif text-xl font-bold text-[#1a1a1c]">
                新建家庭成员角色档案
              </h2>
              <p className="font-editorial-mono text-[11px] text-[#1a1a1c]/60">
                支持归档每位家庭成员的历次就诊报告，自动比对生理指标
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-[#1a1a1c]/5 text-[#1a1a1c] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 p-3 bg-white border border-[#1a1a1c]/15 text-xs">
          <div className="flex items-center gap-1.5 font-editorial-mono text-[11px] text-[#5562ff] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>快捷预填模板 (点击体验)：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickPreset('mother')}
              className="px-2.5 py-1 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] hover:bg-[#1a1a1c]/5 transition"
            >
              + 母亲 (高血压/慢病监测)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('child')}
              className="px-2.5 py-1 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] hover:bg-[#1a1a1c]/5 transition"
            >
              + 子女 (生长发育体格管理)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('father')}
              className="px-2.5 py-1 text-xs border border-[#1a1a1c]/30 hover:border-[#1a1a1c] hover:bg-[#1a1a1c]/5 transition"
            >
              + 父亲 (肝脂监测)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Row 1: Name & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
                成员姓名 / 称呼 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：张女士 / 王妈妈"
                className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
                与本人关系
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden"
              >
                <option value="本人">本人</option>
                <option value="配偶">配偶</option>
                <option value="母亲">母亲</option>
                <option value="父亲">父亲</option>
                <option value="子女">子女</option>
                <option value="岳母">岳母</option>
                <option value="岳父">岳父</option>
                <option value="其他亲属">其他亲属</option>
              </select>
            </div>
          </div>

          {/* Row 2: Age, Gender, Blood Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
                年龄 (岁)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
                生理性别
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'female' | 'male')}
                className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden"
              >
                <option value="female">女性 (Female)</option>
                <option value="male">男性 (Male)</option>
              </select>
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
                ABO 血型
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden"
              >
                <option value="A型">A型</option>
                <option value="B型">B型</option>
                <option value="O型">O型</option>
                <option value="AB型">AB型</option>
                <option value="RH阴性/特殊">特殊血型</option>
                <option value="未检测">尚未检测</option>
              </select>
            </div>
          </div>

          {/* Health Tags Selection */}
          <div>
            <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>关注阶段 / 健康标签</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`px-2 py-0.5 rounded-full text-xs font-editorial-mono border transition ${
                      isSelected
                        ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                        : 'bg-white text-[#1a1a1c]/70 border-[#1a1a1c]/20 hover:border-[#1a1a1c]'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="添加自定义健康标签..."
                className="flex-1 px-3 py-1.5 bg-white border border-[#1a1a1c]/40 text-xs text-[#1a1a1c] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 border border-[#1a1a1c] text-xs font-editorial-mono hover:bg-[#1a1a1c]/5"
              >
                + 添加标签
              </button>
            </div>
          </div>

          {/* Avatar Color Selection */}
          <div>
            <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1.5">
              档案主题色
            </label>
            <div className="flex items-center gap-3">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setAvatarColor(p.color)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition border-2"
                  style={{
                    backgroundColor: p.color,
                    borderColor: avatarColor === p.color ? '#1a1a1c' : 'transparent',
                    boxShadow: avatarColor === p.color ? '0 0 0 2px white inset' : 'none'
                  }}
                  title={p.label}
                >
                  {avatarColor === p.color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Health Status Summary */}
          <div>
            <label className="block font-editorial-mono text-[11px] text-[#1a1a1c]/70 font-semibold mb-1">
              既往史 / 当前健康状况简述
            </label>
            <textarea
              rows={3}
              value={healthStatusSummary}
              onChange={(e) => setHealthStatusSummary(e.target.value)}
              placeholder="例如：记录既往过敏史、重要手术史、日常服药或本次建档最关注的身体指标变化..."
              className="w-full px-3 py-2 bg-white border border-[#1a1a1c] text-[#1a1a1c] focus:outline-hidden focus:ring-1 focus:ring-[#5562ff] leading-relaxed"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-[#1a1a1c] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#1a1a1c] hover:bg-[#1a1a1c]/5 font-editorial-mono transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1a1a1c] hover:bg-black text-white font-editorial-mono font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>确认创建并进入档案</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
