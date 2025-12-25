
import React, { useState, useRef, useEffect } from 'react';
import { X, Moon, Sun, Download, FileSpreadsheet, Settings, Bell, BellOff, Volume2, VolumeX, Coffee, Play, Info, Trash2, Smartphone, AlertTriangle, Timer, Clock, Upload, Check, Plus, Users, Edit2, Shield, Folder, Monitor, ChevronRight, ChevronLeft, ChevronDown, SunDim, LogIn, LogOut, User as UserIcon, Palette } from 'lucide-react';
import { Button } from './Button';
import { NotificationSettings, Group } from '../types';
import { generateId, getGroupStyle, ColorKey } from '../utils';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onExport: () => void;
  notificationSettings: NotificationSettings;
  onUpdateNotification: (settings: NotificationSettings) => void;
  groups: Group[];
  onUpdateGroups: (groups: Group[]) => void;
  installPrompt?: any;
  onInstall?: () => void;
  onClearData?: () => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

type Tab = 'general' | 'groups' | 'notifications' | 'data';

// Helper Component for Time Selection
const TimeSelect = ({ value, onChange, disabled }: { value: number, onChange: (val: number) => void, disabled: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate 5-minute intervals up to 120 minutes
    const options = Array.from({ length: 24 }, (_, i) => (i + 1) * 5);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (disabled) {
        return (
            <div className="px-3 py-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed">
                {value}분
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all min-w-[80px] justify-between"
            >
                <span>{value}분</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 scrollbar-hide">
                    <div className="p-1 grid grid-cols-1 gap-0.5">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                                    value === opt 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {opt}분
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// New Helper for Hour Selection (0-23)
const HourSelect = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const options = Array.from({ length: 24 }, (_, i) => i);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all min-w-[100px] justify-between"
            >
                <span>{value.toString().padStart(2, '0')}:00</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 scrollbar-hide">
                    <div className="p-1 grid grid-cols-1 gap-0.5">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                                    value === opt 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {opt.toString().padStart(2, '0')}:00
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  toggleTheme,
  onExport,
  notificationSettings,
  onUpdateNotification,
  groups,
  onUpdateGroups,
  installPrompt,
  onInstall,
  onClearData,
  user,
  onLogin,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Group Management State
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState<ColorKey>('blue');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState<ColorKey>('blue');

  // Predefined Colors for Selection
  const COLORS: { key: ColorKey, bg: string }[] = [
      { key: 'blue', bg: 'bg-blue-500' },
      { key: 'emerald', bg: 'bg-emerald-500' },
      { key: 'violet', bg: 'bg-violet-500' },
      { key: 'amber', bg: 'bg-amber-500' },
      { key: 'rose', bg: 'bg-rose-500' },
      { key: 'cyan', bg: 'bg-cyan-500' },
      { key: 'slate', bg: 'bg-slate-500' },
  ];

  if (!isOpen) return null;

  const handleNotificationChange = (key: keyof NotificationSettings, value: any) => {
    onUpdateNotification({
      ...notificationSettings,
      [key]: value
    });
    
    // Check permission if turning on any notification feature
    if ((key === 'workEnabled' || key === 'breakEnabled' || key === 'nativeNotificationEnabled') && value === true) {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }
  };

  const playPreviewSound = (e: React.MouseEvent) => {
      e.stopPropagation();
      let audioSrc = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      if (notificationSettings.customSound) {
          audioSrc = notificationSettings.customSound;
      }
      
      const audio = new Audio(audioSrc);
      audio.volume = 0.6;
      audio.play().catch(e => console.log('Audio play failed', e));
  };

  const confirmResetData = () => {
      if (onClearData) {
          onClearData();
          onClose();
      } else {
          localStorage.clear();
          window.location.reload();
      }
      setShowResetConfirm(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setUploadError(null);
      
      if (!file) return;

      if (file.size > 1024 * 1024) {
          setUploadError('파일 크기는 1MB 이하여야 합니다.');
          return;
      }

      if (!file.type.startsWith('audio/')) {
          setUploadError('오디오 파일만 업로드 가능합니다.');
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          
          const audio = new Audio(base64);
          audio.onloadedmetadata = () => {
              if (audio.duration > 20) {
                  setUploadError('재생 시간은 20초 이하여야 합니다.');
              } else {
                  handleNotificationChange('customSound', base64);
              }
          };
          audio.onerror = () => {
              setUploadError('오디오 파일을 읽을 수 없습니다.');
          }
      };
      reader.readAsDataURL(file);
  };

  const handleRemoveCustomSound = () => {
      handleNotificationChange('customSound', undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group Handlers
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup: Group = { 
        id: generateId(), 
        name: newGroupName.trim(), 
        color: selectedColor 
    };
    onUpdateGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
    // Rotate default color for variety
    const nextColorIndex = (COLORS.findIndex(c => c.key === selectedColor) + 1) % COLORS.length;
    setSelectedColor(COLORS[nextColorIndex].key);
  };

  const handleDeleteGroup = (id: string) => {
    if (groups.length <= 1) {
        alert("최소 하나의 그룹은 있어야 합니다.");
        return;
    }
    const filtered = groups.filter(g => g.id !== id);
    onUpdateGroups(filtered);
  };

  const startEditingGroup = (group: Group) => {
      setEditingGroupId(group.id);
      setEditingName(group.name);
      setEditingColor(group.color as ColorKey);
      setIsAddingGroup(false); // Close add mode if open
  };

  const saveEditingGroup = () => {
      if (editingGroupId && editingName.trim()) {
          const updatedGroups = groups.map(g => g.id === editingGroupId ? { ...g, name: editingName.trim(), color: editingColor } : g);
          onUpdateGroups(updatedGroups);
      }
      setEditingGroupId(null);
      setEditingName('');
  };

  const tabs: {id: Tab, label: string, icon: React.ReactNode}[] = [
      { id: 'general', label: '일반', icon: <Monitor size={18} /> },
      { id: 'notifications', label: '알림', icon: <Bell size={18} /> },
      { id: 'groups', label: '그룹', icon: <Folder size={18} /> },
      { id: 'data', label: '데이터', icon: <Shield size={18} /> },
  ];

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in zoom-in-95 duration-200"
        onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300 relative flex flex-col h-[80vh] border border-white/20 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Reset Confirmation Overlay */}
        {showResetConfirm && (
            <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">기록을 초기화하시겠습니까?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    모든 작업 내역과 시간 기록이 삭제됩니다.<br/>
                    설정값과 그룹은 유지됩니다.
                </p>
                <div className="flex gap-3 w-full">
                    <Button onClick={() => setShowResetConfirm(false)} variant="secondary" className="flex-1">
                        취소
                    </Button>
                    <Button onClick={confirmResetData} variant="danger" className="flex-1">
                        초기화
                    </Button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-slate-500" />
                환경설정
            </h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all relative ${
                        activeTab === tab.id 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    {tab.icon}
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
                    )}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 bg-slate-50/30 dark:bg-slate-900/30 pb-40">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* Account Section */}
                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">계정</h3>
                        {user ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
                                    ) : (
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                            <UserIcon size={20} />
                                        </div>
                                    )}
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{user.displayName || '사용자'}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{user.email}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={onLogout}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    로그아웃
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center">
                                        <UserIcon size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white">로그인이 필요합니다</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">데이터 동기화 및 백업</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={onLogin}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                                >
                                    <LogIn size={16} />
                                    로그인
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">화면</h3>
                        <div 
                            onClick={toggleTheme}
                            className="flex items-center justify-between cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-amber-100 text-amber-600'}`}>
                                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">
                                        {isDarkMode ? '다크 모드' : '라이트 모드'}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        눈의 피로를 줄여줍니다.
                                    </div>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">시간 설정</h3>
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                    <SunDim size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">
                                        하루 시작 시간
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        날짜 변경 기준 시간을 설정합니다.
                                    </div>
                                </div>
                            </div>
                            <HourSelect 
                                value={notificationSettings.dayStartHour ?? 6} 
                                onChange={(val) => handleNotificationChange('dayStartHour', val)}
                            />
                        </div>
                    </div>

                    {installPrompt && onInstall && (
                        <div 
                            onClick={onInstall}
                            className="bg-indigo-50/70 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-indigo-900 dark:text-indigo-100">앱 설치하기</div>
                                    <div className="text-xs text-indigo-600/70 dark:text-indigo-300/70">
                                        홈 화면에 추가하여 더 편리하게 사용하세요.
                                    </div>
                                </div>
                            </div>
                            <Button className="h-8 text-xs">설치</Button>
                        </div>
                    )}
                </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${notificationSettings.nativeNotificationEnabled ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                    {notificationSettings.nativeNotificationEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white">기기 알림 표시</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">브라우저/시스템 푸시 알림을 띄웁니다.</span>
                                </div>
                            </div>
                            <div 
                                onClick={() => handleNotificationChange('nativeNotificationEnabled', !notificationSettings.nativeNotificationEnabled)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer shrink-0 ${notificationSettings.nativeNotificationEnabled ? 'bg-sky-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationSettings.nativeNotificationEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">주기 설정</h3>
                        </div>
                        <div className="flex flex-col gap-4 mb-6 relative z-20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${notificationSettings.workEnabled ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                        <Timer size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 dark:text-white">작업 알림</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">설정된 시간마다 알림을 보냅니다.</span>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => handleNotificationChange('workEnabled', !notificationSettings.workEnabled)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer shrink-0 ${notificationSettings.workEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationSettings.workEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                            {notificationSettings.workEnabled && (
                                <div className="ml-11 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">작업 간격</span>
                                    <div className="flex-1 flex items-center justify-end gap-2">
                                        <TimeSelect 
                                            value={notificationSettings.workInterval} 
                                            onChange={(val) => handleNotificationChange('workInterval', val)}
                                            disabled={!notificationSettings.workEnabled}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${notificationSettings.breakEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                        <Coffee size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 dark:text-white">휴식 알림</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">쉬는 시간이 지나면 알립니다.</span>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => handleNotificationChange('breakEnabled', !notificationSettings.breakEnabled)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer shrink-0 ${notificationSettings.breakEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationSettings.breakEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                            {notificationSettings.breakEnabled && (
                                <div className="ml-11 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">휴식 간격</span>
                                    <div className="flex-1 flex items-center justify-end gap-2">
                                        <TimeSelect 
                                            value={notificationSettings.breakInterval} 
                                            onChange={(val) => handleNotificationChange('breakInterval', val)}
                                            disabled={!notificationSettings.breakEnabled}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm relative z-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">사운드</h3>
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationChange('soundEnabled', !notificationSettings.soundEnabled);
                                }}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${notificationSettings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationSettings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${notificationSettings.soundEnabled ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                {notificationSettings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-slate-800 dark:text-white">알림음 재생</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">알림 발생 시 소리를 재생합니다.</div>
                            </div>
                            <button onClick={playPreviewSound} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-100 dark:bg-slate-700/50 rounded-full transition-colors" title="미리듣기">
                                <Play size={16} fill="currentColor" />
                            </button>
                        </div>
                        {notificationSettings.soundEnabled && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">커스텀 알림음 (최대 1MB)</span>
                                    {notificationSettings.customSound ? (
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <Check size={16} className="text-green-500" />
                                                <span className="truncate">업로드된 사운드 사용 중</span>
                                            </div>
                                            <button onClick={handleRemoveCustomSound} className="text-xs text-red-500 hover:text-red-700 font-bold px-2">삭제</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="sound-upload" />
                                            <label htmlFor="sound-upload" className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <Upload size={16} />
                                                파일 선택 (mp3, wav)
                                            </label>
                                        </div>
                                    )}
                                    {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* GROUPS TAB - REDESIGNED */}
            {activeTab === 'groups' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative min-h-[300px] flex flex-col">
                    
                    <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">내 그룹 목록 ({groups.length})</h3>
                    </div>

                    {/* Group List */}
                    <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide pb-20">
                        {groups.map(g => {
                            const style = getGroupStyle(g.color);
                            const isEditing = editingGroupId === g.id;
                            
                            return (
                                <div 
                                    key={g.id} 
                                    className={`
                                        flex flex-col rounded-2xl transition-all duration-300 overflow-hidden
                                        ${isEditing 
                                            ? 'bg-white dark:bg-slate-800 ring-2 ring-indigo-500/20' 
                                            : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:shadow-md'
                                        }
                                        backdrop-blur-sm
                                    `}
                                >
                                    {/* Top Row: Name & Actions */}
                                    <div className="flex justify-between items-center p-3">
                                        <div className="flex items-center gap-3 flex-1 mr-2 overflow-hidden">
                                            <div className={`w-3 h-3 rounded-full ${isEditing ? getGroupStyle(editingColor).dot : style.dot} shrink-0 shadow-sm transition-colors duration-300`}></div>
                                            
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    value={editingName} 
                                                    onChange={(e) => setEditingName(e.target.value)} 
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEditingGroup()} 
                                                    autoFocus 
                                                    className="w-full text-base font-bold border-b-2 border-indigo-500 focus:outline-none bg-transparent text-slate-800 dark:text-slate-100 px-1 py-0.5" 
                                                />
                                            ) : (
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{g.name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => { setEditingGroupId(null); setIsAddingGroup(false); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
                                                    <button onClick={saveEditingGroup} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Check size={16} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEditingGroup(g)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Bottom: Color Palette (Only in Edit Mode) */}
                                    <div 
                                        className={`
                                            grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            ${isEditing ? 'grid-rows-[1fr] border-t border-slate-100 dark:border-slate-700' : 'grid-rows-[0fr]'}
                                        `}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Palette size={10} /> 색상</span>
                                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide p-2">
                                                    {COLORS.map(c => (
                                                        <button 
                                                            key={c.key}
                                                            onClick={() => setEditingColor(c.key)}
                                                            className={`w-6 h-6 rounded-full transition-all duration-200 ${c.bg} ${editingColor === c.key ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600 scale-110 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                                            title={c.key}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* New Group Creation Form (Inline) */}
                        {isAddingGroup && (
                            <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-500/30 shadow-lg animate-in slide-in-from-bottom-2 duration-300 overflow-hidden">
                                <div className="flex justify-between items-center p-3">
                                    <div className="flex items-center gap-3 flex-1 mr-2">
                                        <div className={`w-3 h-3 rounded-full ${getGroupStyle(selectedColor).dot} shrink-0`}></div>
                                        <input 
                                            type="text" 
                                            value={newGroupName} 
                                            onChange={(e) => setNewGroupName(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()} 
                                            placeholder="새 그룹 이름"
                                            autoFocus 
                                            className="w-full text-base font-bold border-none focus:outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-300" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setIsAddingGroup(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
                                        <button onClick={handleAddGroup} disabled={!newGroupName.trim()} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-30"><Check size={16} /></button>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Palette size={10} /> 색상</span>
                                    <div className="flex gap-1.5 p-2">
                                        {COLORS.map(c => (
                                            <button 
                                                key={c.key}
                                                onClick={() => setSelectedColor(c.key)}
                                                className={`w-6 h-6 rounded-full transition-all duration-200 ${c.bg} ${selectedColor === c.key ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600 scale-110 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Add Button (Only visible when not adding) */}
                    {!isAddingGroup && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-2">
                            <button 
                                onClick={() => {
                                    setIsAddingGroup(true);
                                    setNewGroupName('');
                                    setEditingGroupId(null);
                                    // Scroll to bottom after state update if needed
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md hover:translate-y-0.5 active:scale-95 transition-all text-sm backdrop-blur-sm"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                <span>새 그룹 추가</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div onClick={onExport} className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">기록 내보내기</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">CSV 파일로 데이터를 백업합니다.</div>
                                </div>
                            </div>
                            <Button variant="ghost" className="pointer-events-none group-hover:bg-slate-100 dark:group-hover:bg-slate-700">
                                <Download size={20} />
                            </Button>
                        </div>
                    </div>
                    <div className="bg-red-50/70 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-red-900 dark:text-red-100">데이터 초기화</div>
                                    <div className="text-xs text-red-600/70 dark:text-red-300/70 mt-1">모든 기록을 영구적으로 삭제합니다.</div>
                                </div>
                            </div>
                            <Button onClick={() => setShowResetConfirm(true)} variant="danger" className="h-9 px-4 text-xs whitespace-nowrap">초기화</Button>
                        </div>
                    </div>
                    <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
                        <p>데이터는 브라우저 로컬 스토리지에 안전하게 저장됩니다.</p>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
