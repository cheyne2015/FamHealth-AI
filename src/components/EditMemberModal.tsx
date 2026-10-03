import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../types';
import { X, Check, Tag, UserCheck, ShieldAlert, Plus } from 'lucide-react';

interface EditMemberModalProps {
  isOpen: boolean;
  member: FamilyMember | null;
  onClose: () => void;
  onUpdateMember: (updatedMember: FamilyMember) => void;
  onOpenCreateNew?: () => void;
}

const COLOR_PRESETS = [
  { label: '深墨', color: '#1a1a1c' },
  { label: '克莱因蓝', color: '#5562ff' },
  { label: '森林绿', color: '#188038' },
  { label: '琥珀棕', color: '#b45309' },
  { label: '酒红', color: '#991b1b' },
  { label: '石青', color: '#0f766e' },
];

const PRESET_RELATIONSHIPS = ['本人', '妻子', '丈夫', '母亲', '父亲', '女儿', '儿子', '长辈', '其他'];

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

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onUpdateMember,
  onOpenCreateNew
}) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState<number | ''>(30);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [bloodType, setBloodType] = useState('A型');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [avatarColor, setAvatarColor] = useState('#1a1a1c');
  const [healthStatusSummary, setHealthStatusSummary] = useState('');

  // Sync state whenever selected member changes
  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setRelationship(member.relationship || '家庭成员');
      setAge(typeof member.age === 'number' ? member.age : 30);
      setGender(member.gender || 'female');
      setBloodType(member.bloodType || 'A型');
      setSelectedTags(member.tags || []);
      setAvatarColor(member.avatarColor || '#1a1a1c');
      setHealthStatusSummary(member.healthStatusSummary || '');
      setCustomTagInput('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: FamilyMember = {
      ...member,
      name: name.trim(),
      relationship: relationship.trim() || '家庭成员',
      age: typeof age === 'number' && age >= 0 ? age : member.age,
      gender,
      bloodType: bloodType || '未检测',
      tags: selectedTags.length > 0 ? selectedTags : ['健康关注'],
      avatarColor,
      healthStatusSummary: healthStatusSummary.trim() || member.healthStatusSummary
    };

    onUpdateMember(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#fdfdfb] border-2 border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.2)] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-[#1a1a1c] bg-[#f8f8f6]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-editorial-mono shadow-xs"
              style={{ backgroundColor: avatarColor }}
            >
              {name.slice(0, 1) || '用'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/60 font-bold">
                  MEMBER PROFILE EDIT · 角色资料修改
                </span>
                <span className="font-editorial-mono text-[10px] px-1.5 py-0.5 rounded bg-[#5562ff]/10 text-[#5562ff] font-semibold border border-[#5562ff]/20">
                  {member.id}
                </span>
              </div>
              <h3 className="font-editorial-serif text-lg font-bold text-[#1a1a1c] mt-0.5">
                编辑成员档案：{member.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#1a1a1c]/60 hover:text-[#1a1a1c] border border-transparent hover:border-[#1a1a1c] transition"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {/* Row 1: Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
                姓名 / 称呼 <span className="text-[#d93025]">*</span>
              </label>
              <input
                type="text"
                id="edit-member-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：张女士、林明、妈妈、大宝"
                className="w-full px-3 py-2 border border-[#1a1a1c] bg-white text-sm font-sans focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
                required
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
                生理性别 <span className="text-[#d93025]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="edit-gender-female"
                  onClick={() => setGender('female')}
                  className={`py-2 text-xs font-bold font-editorial-mono border transition flex items-center justify-center gap-1.5 ${
                    gender === 'female'
                      ? 'bg-[#1a1a1c] text-white border-[#1a1a1c] shadow-xs'
                      : 'bg-white text-[#1a1a1c] border-[#1a1a1c]/30 hover:border-[#1a1a1c]'
                  }`}
                >
                  <span>女性 (Female)</span>
                </button>
                <button
                  type="button"
                  id="edit-gender-male"
                  onClick={() => setGender('male')}
                  className={`py-2 text-xs font-bold font-editorial-mono border transition flex items-center justify-center gap-1.5 ${
                    gender === 'male'
                      ? 'bg-[#1a1a1c] text-white border-[#1a1a1c] shadow-xs'
                      : 'bg-white text-[#1a1a1c] border-[#1a1a1c]/30 hover:border-[#1a1a1c]'
                  }`}
                >
                  <span>男性 (Male)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Age, Relationship & Blood Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
                年龄 (岁) <span className="text-[#d93025]">*</span>
              </label>
              <input
                type="number"
                id="edit-member-age-input"
                value={age}
                min={0}
                max={130}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-[#1a1a1c] bg-white text-sm font-editorial-mono focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
                required
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
                家庭关系 / 角色
              </label>
              <input
                type="text"
                id="edit-member-relationship-input"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="如：妻子、本人、母亲"
                className="w-full px-3 py-2 border border-[#1a1a1c] bg-white text-sm font-sans focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
                血型
              </label>
              <select
                id="edit-member-bloodtype-select"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 border border-[#1a1a1c] bg-white text-sm font-editorial-mono focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
              >
                <option value="A型">A 型</option>
                <option value="B型">B 型</option>
                <option value="AB型">AB 型</option>
                <option value="O型">O 型</option>
                <option value="Rh阴性">Rh 阴性</option>
                <option value="未检测">未检测 / 不详</option>
              </select>
            </div>
          </div>

          {/* Quick Relationship Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/60 mr-1">快捷选择关系:</span>
            {PRESET_RELATIONSHIPS.map((rel) => (
              <button
                key={rel}
                type="button"
                onClick={() => setRelationship(rel)}
                className={`px-2 py-0.5 text-xs font-editorial-mono rounded-xs border transition ${
                  relationship === rel
                    ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                    : 'bg-white text-[#1a1a1c]/80 border-[#1a1a1c]/20 hover:border-[#1a1a1c]'
                }`}
              >
                {rel}
              </button>
            ))}
          </div>

          {/* Visual Avatar Color Selection */}
          <div>
            <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
              档案标识色彩
            </label>
            <div className="flex items-center gap-3">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setAvatarColor(preset.color)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition border-2 ${
                    avatarColor === preset.color
                      ? 'border-[#1a1a1c] scale-110 shadow-xs'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.label}
                >
                  {avatarColor === preset.color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Health Concern Tags */}
          <div>
            <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
              健康关注标签 / 监护重点
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 text-xs font-editorial-mono rounded-xs border transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#5562ff] text-white border-[#5562ff] shadow-xs'
                        : 'bg-white text-[#1a1a1c] border-[#1a1a1c]/25 hover:border-[#1a1a1c]'
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="添加自定义关注标签 (按回车添加)"
                className="flex-1 px-3 py-1.5 border border-[#1a1a1c]/30 bg-white text-xs font-editorial-mono focus:outline-hidden focus:ring-1 focus:ring-[#5562ff]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 text-xs font-bold font-editorial-mono border border-[#1a1a1c] bg-white hover:bg-[#1a1a1c] hover:text-white transition"
              >
                添加标签
              </button>
            </div>
          </div>

          {/* Health Status / Clinical Summary */}
          <div>
            <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1.5">
              重点健康画像与临床摘要
            </label>
            <textarea
              id="edit-member-summary-textarea"
              rows={3}
              value={healthStatusSummary}
              onChange={(e) => setHealthStatusSummary(e.target.value)}
              placeholder="填写该角色的既往病史、用药情况或目前就诊监护重点（AI在问答解读和指标时序对比时将以此为首要临床上下文）..."
              className="w-full px-3 py-2 border border-[#1a1a1c] bg-white text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-[#5562ff] leading-relaxed"
            />
            <p className="font-editorial-mono text-[10px] text-[#1a1a1c]/50 mt-1">
              * 此临床摘要会作为专科 AI 进行异常指标交叉推演的核心病史依据。
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#1a1a1c]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Subtle secondary create link */}
            {onOpenCreateNew ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateNew();
                }}
                className="font-editorial-mono text-xs text-[#5562ff] hover:text-[#4350ea] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>需要添加新家庭成员？点此新建</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-editorial-mono border border-[#1a1a1c]/30 hover:border-[#1a1a1c] text-[#1a1a1c] transition"
              >
                取消
              </button>
              <button
                type="submit"
                id="save-edit-member-btn"
                className="px-5 py-2 text-xs font-bold font-editorial-mono bg-[#1a1a1c] hover:bg-black text-white transition shadow-xs flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>保存角色信息</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
