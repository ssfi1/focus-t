
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Pause, Square, History, Clock, Archive, Sun, Moon, CheckCircle2, Search, Download, Settings, Plus, X, Trash2, ChevronDown, BarChart2, Calendar as CalendarIcon, CalendarDays, PieChart, CirclePause, LogIn, LogOut, Coffee, AlertTriangle, RefreshCcw, ExternalLink, Maximize2, ArrowDown, ArrowRight, Filter, AlertCircle, Stamp, Gem, ArrowUp, Zap, ChevronLeft, ChevronRight, PictureInPicture, MoreVertical, Hand, List, LayoutList, Layers, PanelTop } from 'lucide-react';
import { Session, TimeSegment, TimerStatus, Group, NotificationSettings } from './types';
import { calculateTotalDuration, formatDuration, generateId, getGroupStyle, GROUP_COLORS, ColorKey, downloadCSV, formatDurationHM, getDateStr, calculateDailyTotal, calculateBreakTime, isSameDay, calculateFocusIndex, getFocusLevelConfig, getAdjustedDateStr } from './utils';
import { Button } from './components/Button';
import { SessionCard } from './components/SessionCard';
import { StatsDashboard } from './components/StatsDashboard';
import { CalendarView } from './components/CalendarView';
import { DailyTimeTable } from './components/DailyTimeTable';
import { TrashModal } from './components/TrashModal';
import { SettingsModal } from './components/SettingsModal';
import { Dropdown } from './components/Dropdown';
import { MiniCalendar } from './components/MiniCalendar';
import { TimetableList } from './components/TimetableList';

// Firebase Imports
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

// Helper for safe local storage parsing
const loadState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export default function App() {
  // Check if we are in popup mode
  const isPopup = new URLSearchParams(window.location.search).get('mode') === 'popup';

  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // State with Lazy Initialization
  const [status, setStatus] = useState<TimerStatus>(() => (localStorage.getItem('workflow-status') as TimerStatus) || 'idle');
  
  const [sessionHistory, setSessionHistory] = useState<Session[]>(() => loadState('workflow-history', []));
  
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = loadState<Group[]>('workflow-groups', []);
    return saved.length > 0 ? saved : [
      { id: '1', name: '업무', color: 'blue' },
      { id: '2', name: '개인', color: 'emerald' },
      { id: '3', name: '공부', color: 'violet' }
    ];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
     const saved = loadState<Group[]>('workflow-groups', []);
     return saved.length > 0 ? saved[0].id : '1';
  });

  const [currentSession, setCurrentSession] = useState<Session | null>(() => loadState('workflow-current-session', null));
  
  // New State for Task Name Input (allows editing before start)
  const [taskNameInput, setTaskNameInput] = useState<string>(() => {
      const savedSession = loadState<Session | null>('workflow-current-session', null);
      return savedSession ? savedSession.name : '';
  });

  const [elapsedTime, setElapsedTime] = useState(() => {
      const savedSession = loadState<Session | null>('workflow-current-session', null);
      return savedSession ? calculateTotalDuration(savedSession.segments) : 0;
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
      const defaults: NotificationSettings = {
          workEnabled: false,
          workInterval: 50,
          breakEnabled: false,
          breakInterval: 10,
          soundEnabled: true,
          nativeNotificationEnabled: true, // Default to true
          shortcutEnabled: false,
          dayStartHour: 6 // Default start day at 06:00
      };
      const saved = loadState('workflow-settings', defaults);
      return { ...defaults, ...saved };
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('workflow-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Transient State
  const [breakTime, setBreakTime] = useState(0); 
  const [historyFilterGroupId, setHistoryFilterGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [historyDateRange, setHistoryDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'task' | 'time'>('task');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Navigation Calendar State
  const [isNavCalendarOpen, setIsNavCalendarOpen] = useState(false);
  const [navCalendarInitialDate, setNavCalendarInitialDate] = useState<Date>(new Date());

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarInitialDate, setCalendarInitialDate] = useState<Date | null>(null); // For opening calendar from history
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeTableData, setTimeTableData] = useState<{dateStr: string, dateObj: Date, sessions: Session[]} | null>(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const [alertState, setAlertState] = useState<'none' | 'work' | 'break'>('none');
  
  // Animation & Toast State
  const [exitAnim, setExitAnim] = useState<'idle' | 'complete' | 'hold'>('idle');
  const [stampVisible, setStampVisible] = useState(false); // For stamp animation
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false); // Track scrolling
  const [showScrollTop, setShowScrollTop] = useState(false); // Track history scrolling
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [flyingGems, setFlyingGems] = useState<{id: number, left: string, duration: string}[]>([]);
  
  // Drag Animation State
  const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false });
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  
  // Header Interaction State
  const [headerForceShow, setHeaderForceShow] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const headerTimeoutRef = useRef<number | null>(null);

  // Real-time Focus Index Calculation
  const [todayFocusScore, setTodayFocusScore] = useState(0);

  // Main Timer Menu State (Stop button)
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);

  const timerIntervalRef = useRef<number | null>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const lastWorkNotificationTime = useRef<number>(0);
  const lastBreakNotificationTime = useRef<number>(0);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  
  // Silent Audio for Background Timer Persistence & Media Session
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // History Filtering
  const activeHistory = useMemo(() => sessionHistory.filter(s => !s.deletedAt), [sessionHistory]);
  const deletedHistory = useMemo(() => sessionHistory.filter(s => !!s.deletedAt), [sessionHistory]);

  // Combined Sessions for Stats (History + Current)
  const allSessionsForStats = useMemo(() => {
      if (currentSession) {
          return [...activeHistory, currentSession];
      }
      return activeHistory;
  }, [activeHistory, currentSession]);

  // --- Firebase Synchronization Logic ---

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listener (Read from Firestore)
  useEffect(() => {
    if (!user) return;

    // Listen to Main User Document (Status, Current Session, Groups, Settings)
    const userDocRef = doc(db, 'users', user.uid);
    const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status) setStatus(data.status);
        if (data.currentSession !== undefined) {
             setCurrentSession(data.currentSession);
             if (data.currentSession) {
                 setTaskNameInput(data.currentSession.name);
                 setElapsedTime(calculateTotalDuration(data.currentSession.segments));
             } else {
                 setElapsedTime(0);
             }
        }
        if (data.groups) setGroups(data.groups);
        if (data.settings) setNotificationSettings(data.settings);
      }
    });

    // Listen to History Subcollection (Only recent or all? Let's sync all for now)
    // Ordered by createdAt descending
    const historyQuery = query(collection(db, 'users', user.uid, 'history'), orderBy('createdAt', 'desc'));
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
        const historyData: Session[] = [];
        snapshot.forEach((doc) => {
            historyData.push(doc.data() as Session);
        });
        setSessionHistory(historyData);
    });

    return () => {
        unsubDoc();
        unsubHistory();
    };
  }, [user]);

  // 3. Data Writer (Write to Firestore) - Only called on specific actions
  const syncToFirestore = useCallback(async (
      type: 'status_update' | 'history_update' | 'settings_update', 
      payload: any
  ) => {
      if (!user) return; // If not logged in, rely on local state (already handled by React state)

      const userDocRef = doc(db, 'users', user.uid);

      try {
          if (type === 'status_update') {
              // Sync Status, Current Session
              // payload: { status, currentSession }
              await setDoc(userDocRef, {
                  status: payload.status,
                  currentSession: payload.currentSession,
                  lastUpdated: Date.now()
              }, { merge: true });
          } 
          else if (type === 'history_update') {
              // When a session is finished/deleted/restored
              // payload: { session, action: 'add' | 'update' | 'delete' }
              if (payload.action === 'add' || payload.action === 'update') {
                  const historyDocRef = doc(db, 'users', user.uid, 'history', payload.session.id);
                  await setDoc(historyDocRef, payload.session);
              } else if (payload.action === 'delete') {
                   const historyDocRef = doc(db, 'users', user.uid, 'history', payload.session.id);
                   await deleteDoc(historyDocRef);
              }
          }
          else if (type === 'settings_update') {
              // Payload: { settings or groups }
              await setDoc(userDocRef, payload, { merge: true });
          }
      } catch (e) {
          console.error("Firebase Sync Error:", e);
      }
  }, [user]);


  // Calculate Today's Focus Index continuously
  useEffect(() => {
    const calculateTodayFocus = () => {
        const today = Date.now();
        // Use adjusted date for today check
        const todayAdjustedStr = getAdjustedDateStr(today, notificationSettings.dayStartHour);
        
        // Combined finished sessions from history and current active session
        const todaySessions = sessionHistory.filter(s => getAdjustedDateStr(s.createdAt, notificationSettings.dayStartHour) === todayAdjustedStr && !s.deletedAt);
        const allTodaySessions = currentSession ? [...todaySessions, currentSession] : todaySessions;

        if (allTodaySessions.length === 0) {
            setTodayFocusScore(0);
            return;
        }
        
        const dayWork = calculateDailyTotal(allTodaySessions, today);
        const dayBreak = calculateBreakTime(allTodaySessions, 60000, notificationSettings.dayStartHour);
        const dayBreakCount = allTodaySessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);

        setTodayFocusScore(calculateFocusIndex(dayWork, dayBreak, dayBreakCount));
    };
    
    // Initial Calc
    calculateTodayFocus();
    
    // Update every minute or on significant state change
    const interval = setInterval(calculateTodayFocus, 10000); 
    return () => clearInterval(interval);
  }, [sessionHistory, currentSession, notificationSettings.dayStartHour]);

  const focusConfig = useMemo(() => getFocusLevelConfig(todayFocusScore), [todayFocusScore]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleStorageChange = (e: StorageEvent) => {
        // Only react to local storage if NOT logged in
        if (user) return; 

        if (e.key === 'workflow-current-session' && e.newValue) {
            const newSession = JSON.parse(e.newValue);
            setCurrentSession(newSession);
            setTaskNameInput(newSession.name);
            setElapsedTime(calculateTotalDuration(newSession.segments));
        }
        if (e.key === 'workflow-status' && e.newValue) {
            setStatus(e.newValue as TimerStatus);
        }
        if (e.key === 'workflow-history' && e.newValue) {
            setSessionHistory(JSON.parse(e.newValue));
        }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleGlobalClick = (e: MouseEvent) => {
        setAlertState('none');
        const target = e.target as HTMLElement;
        if (!target.closest('.date-filter-popover') && !target.closest('.date-filter-trigger')) {
            setIsDateFilterOpen(false);
        }
        if (!target.closest('.timer-menu-trigger') && !target.closest('.timer-menu')) {
            setIsTimerMenuOpen(false);
        }
    };
    window.addEventListener('click', handleGlobalClick);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Easter Egg Logic (Random)
    const easterEggInterval = setInterval(() => {
        if (Math.random() < 0.0001) { // 0.01% chance every check
            setEasterEggActive(true);
            setTimeout(() => setEasterEggActive(false), 6000); // Animation duration
        }
    }, 600000); // 10 minutes

    // Create Silent Audio Element
    // 1-pixel transparent gif equivalent for audio to keep MediaSession alive
    const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    audio.loop = true;
    silentAudioRef.current = audio;

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('click', handleGlobalClick);
      clearInterval(easterEggInterval);
      if (silentAudioRef.current) {
          silentAudioRef.current.pause();
          silentAudioRef.current = null;
      }
    };
  }, [user, isDarkMode]); // Added user dependency to storage listener logic

  // Local Storage Fallback (Only when not logged in)
  useEffect(() => { if (!user) localStorage.setItem('workflow-history', JSON.stringify(sessionHistory)); }, [sessionHistory, user]);
  useEffect(() => { if (!user && groups.length > 0) localStorage.setItem('workflow-groups', JSON.stringify(groups)); }, [groups, user]);
  useEffect(() => { if (!user) localStorage.setItem('workflow-settings', JSON.stringify(notificationSettings)); }, [notificationSettings, user]);
  useEffect(() => { if (!user) localStorage.setItem('workflow-status', status); }, [status, user]);
  
  useEffect(() => {
    if (!user) {
        if (currentSession) {
            localStorage.setItem('workflow-current-session', JSON.stringify(currentSession));
        } else {
            localStorage.removeItem('workflow-current-session');
        }
    }
  }, [currentSession, user]);

  useEffect(() => {
    localStorage.setItem('workflow-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
      setToast({ message, type });
  };
  
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Auth Handlers
  const handleLogin = async () => {
      try {
          await signInWithPopup(auth, googleProvider);
          showToast('성공적으로 로그인되었습니다.', 'success');
      } catch (error) {
          console.error(error);
          showToast('로그인에 실패했습니다.', 'error');
      }
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
          // Optional: Clear local state or reload to revert to localstorage data
          showToast('로그아웃되었습니다.', 'info');
          // For simplicity, we can retain the current view or clear it. 
          // Reverting to localStorage will happen automatically via state initializers if refreshed, 
          // but live switch might need manual reset if we want strict separation.
          // Let's keep the state as is for smooth UX, or reload.
          window.location.reload(); 
      } catch (error) {
          showToast('로그아웃 실패', 'error');
      }
  };

  const triggerNotification = useCallback((title: string, body: string, type: 'work' | 'break') => {
      setAlertState(type);
      
      // Native Notification Check
      if (notificationSettings.nativeNotificationEnabled && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/vite.svg' });
      }
      
      // Sound Check
      if (notificationSettings.soundEnabled) {
          // Use custom sound if available, otherwise default
          const audioSrc = notificationSettings.customSound || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
          const audio = new Audio(audioSrc);
          audio.volume = 0.6;
          audio.play().catch(e => console.log('Audio play failed', e));
      }
  }, [notificationSettings.soundEnabled, notificationSettings.customSound, notificationSettings.nativeNotificationEnabled]);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const handlePopupAction = async () => {
      if (window.location.protocol === 'blob:') {
         alert('현재 실행 환경(미리보기)에서는 새 창 기능이 제한됩니다.');
         return;
      }
      const width = 450;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'popup');
      window.open(url.toString(), 'WorkflowTimerPopup', `popup=yes,width=${width},height=${height},top=${top},left=${left},resizable=yes,toolbar=no,location=no,status=no,menubar=no`);
  };

  // Hard Stop (Stopped) without Break
  const handleStopWithoutBreak = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      
      if (status === 'idle') return; // Cannot stop if idle
      
      let newSession: Session | null = currentSession;

      if (currentSession) {
          const now = Date.now();
          let updatedSegments = [...currentSession.segments];
          const lastIdx = updatedSegments.length - 1;
          
          if (status === 'running') {
              // End the current segment and MARK IT as hard-stop
              updatedSegments[lastIdx] = { ...updatedSegments[lastIdx], end: now, stopReason: 'hard-stop' as const };
          } else if (status === 'paused') {
              // If paused, we modify the existing last segment's stopReason.
              // The last segment should already have an 'end' time (pause start time).
              if (updatedSegments[lastIdx] && updatedSegments[lastIdx].end !== null) {
                  updatedSegments[lastIdx] = { ...updatedSegments[lastIdx], stopReason: 'hard-stop' as const };
              }
          }
          
          newSession = { ...currentSession, isActive: false, segments: updatedSegments };
          setCurrentSession(newSession);
          // Recalculate duration just in case
          setElapsedTime(calculateTotalDuration(updatedSegments));
      }
      
      // Set to 'stopped' state (Visual pause, no break tracking)
      setStatus('stopped');
      
      // SYNC: Update Status & Session
      syncToFirestore('status_update', { status: 'stopped', currentSession: newSession });

      setIsTimerMenuOpen(false);
      
      // Clear MediaSession state on stop
      if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
      }
      
      showToast('기록이 일시 정지되었습니다. (휴식 시간 미포함)', 'info');
  };

  const handleOpenCalendar = (date?: Date) => {
      setCalendarInitialDate(date || null);
      setIsCalendarOpen(true);
  };

  // Open the MINI calendar for navigation
  const openNavigationCalendar = (date: Date) => {
      setNavCalendarInitialDate(date);
      setIsNavCalendarOpen(true);
  };

  // New Function: Navigate to Date from Calendar Selection
  const handleScrollToDate = (dateInput: string | Date) => {
      setIsCalendarOpen(false);
      setIsNavCalendarOpen(false); // Close the mini calendar
      
      // Format to match the ID format: "history-group-YYYY-MM-DD"
      // dateStr comes from MiniCalendar as YYYY-MM-DD
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const localeDateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      const targetId = `history-group-${localeDateStr.replace(/\./g, '-').replace(/ /g, '')}`;
      
      setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
              // Smooth scroll within the container
              const headerOffset = 100; // Account for sticky headers/top bars
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + (mainContainerRef.current?.scrollTop || 0) - headerOffset;

              mainContainerRef.current?.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
              });

              // Optional: Highlight effect
              element.classList.add('bg-indigo-50/50', 'dark:bg-indigo-900/40', 'transition-colors', 'duration-500', 'ring-2', 'ring-indigo-500/50');
              setTimeout(() => element.classList.remove('bg-indigo-50/50', 'dark:bg-indigo-900/40', 'ring-2', 'ring-indigo-500/50'), 1500);
          } else {
              showToast('해당 날짜의 기록이 없습니다.', 'info');
          }
      }, 300);
  };

  // Handler for Date Range Picker in History Filter
  const handleCalendarDayClick = (dateStr: string) => {
      setHistoryDateRange(prev => {
          if (!prev.start || (prev.start && prev.end)) {
              return { start: dateStr, end: '' };
          }
          if (dateStr < prev.start) {
              return { start: dateStr, end: prev.start };
          }
          return { ...prev, end: dateStr };
      });
  };

  // Easter Egg Trigger (Click)
  const triggerGem = () => {
      if (flyingGems.length >= 30) return;
      const id = Date.now();
      const left = Math.random() * 80 + 10 + '%'; // Random horizontal position
      const duration = (Math.random() * 2 + 3) + 's'; // Random speed
      setFlyingGems(prev => [...prev, { id, left, duration }]);
      setTimeout(() => {
          setFlyingGems(prev => prev.filter(g => g.id !== id));
      }, 5000);
  };

  const toggleGroupCollapse = (dateStr: string) => {
      setCollapsedGroups(prev => {
          const newSet = new Set(prev);
          if (newSet.has(dateStr)) {
              newSet.delete(dateStr);
          } else {
              newSet.add(dateStr);
          }
          return newSet;
      });
  };

  // Drag Animation Logic
  const handleDragStart = (clientX: number, clientY: number) => {
      setDragState({ x: 0, y: 0, isDragging: true });
      dragStartRef.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
      if (!dragStartRef.current || !dragState.isDragging) return;
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      
      // Dampening factor to make it feel heavy/attached
      const dampenedX = deltaX * 0.3;
      const dampenedY = deltaY * 0.3;
      
      // Limit range
      const limit = 40;
      const limitedX = Math.max(-limit, Math.min(limit, dampenedX));
      const limitedY = Math.max(-limit, Math.min(limit, dampenedY));

      setDragState({ x: limitedX, y: limitedY, isDragging: true });
  };

  const handleDragEnd = () => {
      setDragState({ x: 0, y: 0, isDragging: false });
      dragStartRef.current = null;
  };

  // Touch Handlers for Drag
  const onTimerTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTimerTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTimerTouchEnd = () => handleDragEnd();
  
  // Mouse Handlers for Drag
  const onTimerMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX, e.clientY);
  const onTimerMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX, e.clientY);
  const onTimerMouseUp = () => handleDragEnd();
  const onTimerMouseLeave = () => handleDragEnd();

  useEffect(() => {
    if (status === 'running' && currentSession) {
      timerIntervalRef.current = window.setInterval(() => {
        // Only calculate duration based on stored Start Time (Server Friendly!)
        const currentDuration = calculateTotalDuration(currentSession.segments);
        setElapsedTime(currentDuration);
        if (notificationSettings.workEnabled) {
            const workIntervalMs = notificationSettings.workInterval * 60 * 1000;
            const intervalsPassed = Math.floor(currentDuration / workIntervalMs);
            if (intervalsPassed > 0 && intervalsPassed > lastWorkNotificationTime.current) {
                lastWorkNotificationTime.current = intervalsPassed;
                triggerNotification('작업 알림', `${notificationSettings.workInterval}분 동안 작업을 진행했습니다.`, 'work');
            }
        }
      }, 100);
      lastBreakNotificationTime.current = 0;
      setBreakTime(0);
    } else if (status === 'paused' && currentSession) {
        const lastSegment = currentSession.segments[currentSession.segments.length - 1];
        const breakStart = lastSegment.end || Date.now();
        timerIntervalRef.current = window.setInterval(() => {
            const currentBreakDuration = Date.now() - breakStart;
            setBreakTime(currentBreakDuration);
            if (notificationSettings.breakEnabled) {
                const breakIntervalMs = notificationSettings.breakInterval * 60 * 1000;
                const intervalsPassed = Math.floor(currentBreakDuration / breakIntervalMs);
                if (intervalsPassed > 0 && intervalsPassed > lastBreakNotificationTime.current) {
                    lastBreakNotificationTime.current = intervalsPassed;
                    triggerNotification('휴식 알림', `${notificationSettings.breakInterval}분이 지났습니다.`, 'break');
                }
            }
        }, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (status === 'idle') setBreakTime(0);
      lastWorkNotificationTime.current = 0;
      lastBreakNotificationTime.current = 0;
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [status, currentSession, notificationSettings, triggerNotification]);

  const handleScroll = () => {
      if (mainContainerRef.current) {
          const scrollTop = mainContainerRef.current.scrollTop;
          setIsScrolled(scrollTop > 20); // Lower threshold for quicker response

          if (historySectionRef.current) {
              const historyTop = historySectionRef.current.offsetTop;
              // Show button if we are scrolled past the start of the history section + buffer
              setShowScrollTop(scrollTop > historyTop + 100);
          }
      }
  };

  const handleTouchInteraction = () => {
      if (!isPopup) {
          setHeaderForceShow(true);
          if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
          headerTimeoutRef.current = window.setTimeout(() => {
              setHeaderForceShow(false);
          }, 3000);
      }
  };

  const scrollToHistoryTop = () => {
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollFilters = (direction: 'left' | 'right') => {
      if (filterScrollRef.current) {
          const scrollAmount = direction === 'left' ? -200 : 200;
          filterScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
  };

  const handleUpdateGroups = (updatedGroups: Group[]) => {
      setGroups(updatedGroups);
      if (!updatedGroups.find(g => g.id === activeGroupId) && updatedGroups.length > 0) {
          setActiveGroupId(updatedGroups[0].id);
      }
      // SYNC
      syncToFirestore('settings_update', { groups: updatedGroups });
  };

  // Removed Clock In logic.
  const isClockedIn = true; // Always considered ready to work in task-based mode

  const handleStart = useCallback(() => {
    // Play silent audio to enable background execution & Media Session
    if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(e => console.log('Audio Autoplay Blocked', e));
    }
    
    let newSession: Session;

    // Fix: Handle cases where status is stopped/paused but session is missing (bug recovery)
    if (status === 'idle' || ((status === 'paused' || status === 'stopped') && !currentSession)) {
      // Auto-increment Name Logic (Always starts from 1 if empty)
      let taskName = taskNameInput.trim();
      
      // If task name is empty OR matches pattern "새로운 작업", "새로운 작업 1"...
      if (!taskName || taskName === '새로운 작업') {
          const baseName = "새로운 작업";
          let maxNum = 0;
          sessionHistory.forEach(s => {
              if (s.name.startsWith(baseName)) {
                  const parts = s.name.split(' ');
                  const lastPart = parts[parts.length - 1];
                  const num = parseInt(lastPart);
                  if (!isNaN(num) && s.name === `${baseName} ${num}`) {
                      maxNum = Math.max(maxNum, num);
                  }
              }
          });
          taskName = `${baseName} ${maxNum + 1}`;
      }

      newSession = {
        id: generateId(), name: taskName, groupId: activeGroupId || '1', createdAt: Date.now(),
        segments: [{ start: Date.now(), end: null }], isActive: true, isFinished: false, memo: ''
      };
      setTaskNameInput(taskName); 
    } else if ((status === 'paused' || status === 'stopped') && currentSession) {
      newSession = {
        ...currentSession, isActive: true,
        segments: [...currentSession.segments, { start: Date.now(), end: null } as TimeSegment],
      };
    } else {
        return;
    }
    
    // Optimistic UI Update
    setCurrentSession(newSession);
    setStatus('running');
    
    // SYNC: Update Status & Session
    syncToFirestore('status_update', { status: 'running', currentSession: newSession });

  }, [status, currentSession, activeGroupId, taskNameInput, sessionHistory, syncToFirestore]);

  const handlePause = useCallback(() => {
    if (status === 'running' && currentSession) {
      const now = Date.now();
      const updatedSegments = currentSession.segments.map((seg, i) => i === currentSession.segments.length - 1 && !seg.end ? { ...seg, end: now } : seg);
      const newSession = { ...currentSession, isActive: false, segments: updatedSegments };
      
      setCurrentSession(newSession);
      setElapsedTime(calculateTotalDuration(updatedSegments));
      setStatus('paused');
      
      // SYNC: Update Status & Session
      syncToFirestore('status_update', { status: 'paused', currentSession: newSession });
    }
  }, [status, currentSession, syncToFirestore]);

  // Setup Media Session Handlers (Enhanced for Mobile Notification Control)
  useEffect(() => {
      if ('mediaSession' in navigator) {
          const taskName = currentSession?.name || '새로운 작업';
          const groupName = groups.find(g => g.id === currentSession?.groupId)?.name || 'Focus Timer';
          
          if (status === 'running') {
              navigator.mediaSession.metadata = new MediaMetadata({
                  title: taskName,
                  artist: groupName,
                  album: '집중 중',
                  artwork: [
                      { src: 'https://cdn-icons-png.flaticon.com/512/3176/3176371.png', sizes: '512x512', type: 'image/png' }
                  ]
              });
              navigator.mediaSession.playbackState = 'playing';
          } else if (status === 'paused') {
              navigator.mediaSession.metadata = new MediaMetadata({
                  title: taskName,
                  artist: groupName,
                  album: '휴식 중',
                  artwork: [
                      { src: 'https://cdn-icons-png.flaticon.com/512/3176/3176371.png', sizes: '512x512', type: 'image/png' }
                  ]
              });
              navigator.mediaSession.playbackState = 'paused';
          } else {
              navigator.mediaSession.playbackState = 'none';
          }

          // Handlers
          navigator.mediaSession.setActionHandler('play', () => {
              if (status === 'paused' || status === 'idle' || status === 'stopped') handleStart();
          });
          navigator.mediaSession.setActionHandler('pause', () => {
              if (status === 'running') handlePause();
          });
          // Stop button
          navigator.mediaSession.setActionHandler('stop', () => {
              handleStopWithoutBreak();
          });
          // Next Track = Complete Session
          navigator.mediaSession.setActionHandler('nexttrack', () => {
              finishSession('completed');
          });
      }
  }, [status, currentSession, groups, handleStart, handlePause]);

  const finishSession = (completionStatus: 'completed' | 'on-hold') => {
    if (!currentSession) return;

    if (completionStatus === 'completed') {
        // 1. Trigger Stamp Animation
        setStampVisible(true);
        
        // 2. Wait for stamp impact, then trigger exit animation
        setTimeout(() => {
            setExitAnim('complete');
            
            // 3. Complete process
            setTimeout(() => {
                completeSessionProcess('completed');
                setStampVisible(false); // Reset Stamp
            }, 600);
        }, 500);
    } else {
        // Hold Animation (Box effect)
        setExitAnim('hold');
        setTimeout(() => {
            completeSessionProcess('on-hold');
        }, 600);
    }
  };

  const completeSessionProcess = (completionStatus: 'completed' | 'on-hold') => {
      if (!currentSession) return;
      const now = Date.now();
      let finalSegments = [...currentSession.segments];
      if (status === 'running') {
        finalSegments = finalSegments.map((seg, i) => i === finalSegments.length - 1 && !seg.end ? { ...seg, end: now } : seg);
      }
      
      const finishedSession = { ...currentSession, segments: finalSegments, isActive: false, isFinished: true, completionStatus };
      
      setSessionHistory(prev => [finishedSession, ...prev]);
      setCurrentSession(null);
      setStatus('idle');
      setTaskNameInput(''); // Reset Input
      setElapsedTime(0);
      setExitAnim('idle');
      
      // SYNC: Clear Current, Update Status, Add to History
      syncToFirestore('status_update', { status: 'idle', currentSession: null });
      syncToFirestore('history_update', { session: finishedSession, action: 'add' });

      if (silentAudioRef.current) {
          silentAudioRef.current.pause();
          silentAudioRef.current.currentTime = 0;
      }
      if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
      }
  };

  const handleContinueSession = (id: string) => {
    if (status === 'running' || status === 'paused' || status === 'stopped') {
        showToast('이미 타이머가 작동 중입니다. 현재 작업을 완료하거나 일시정지 후 다시 시도해주세요.', 'error');
        return;
    }
    
    const sessionToResume = sessionHistory.find(s => s.id === id);
    if (!sessionToResume) return;

    // Use current settings for start of day
    const sessionDateStr = getAdjustedDateStr(sessionToResume.createdAt, notificationSettings.dayStartHour);
    const todayStr = getAdjustedDateStr(Date.now(), notificationSettings.dayStartHour);
    
    let newSession: Session;

    // Check if the session belongs to a different "Work Day" than today
    if (sessionDateStr !== todayStr) {
        // Split Logic:
        // 1. Mark old session as completed (remove hold)
        const updatedOldSession = { ...sessionToResume, completionStatus: 'completed' as const };
        setSessionHistory(prev => prev.map(s => s.id === id ? updatedOldSession : s));
        
        // SYNC History update
        syncToFirestore('history_update', { session: updatedOldSession, action: 'update' });
        
        // 2. Create new session with suffix
        newSession = {
            id: generateId(),
            name: `${sessionToResume.name} (이어하기)`, // Add suffix
            groupId: sessionToResume.groupId, // Keep group
            createdAt: Date.now(),
            segments: [{ start: Date.now(), end: null }],
            isActive: true,
            isFinished: false,
            memo: sessionToResume.memo
        };
        
        showToast('새로운 하루의 작업으로 기록이 분리되었습니다.', 'success');
    } else {
        // Same Day Resume Logic (Existing)
        mainContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        // Remove from history locally (will sync delete to history collection)
        setSessionHistory(prev => prev.filter(s => s.id !== id));
        
        // SYNC History delete (move to current)
        syncToFirestore('history_update', { session: sessionToResume, action: 'delete' });

        newSession = {
            ...sessionToResume, 
            isActive: true, 
            isFinished: false, 
            completionStatus: undefined, 
            deletedAt: undefined,
            segments: [...sessionToResume.segments, { start: Date.now(), end: null }]
        };
    }
    
    setCurrentSession(newSession);
    setTaskNameInput(newSession.name);
    setActiveGroupId(newSession.groupId);
    setElapsedTime(calculateTotalDuration(newSession.segments) || 0); // Start fresh or continued
    setStatus('running');

    // SYNC Current
    syncToFirestore('status_update', { status: 'running', currentSession: newSession });
    
    if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
    }
  };

  const handleRemoveHold = (id: string) => {
      const updated = sessionHistory.find(s => s.id === id);
      if(updated) {
          const newSession = { ...updated, completionStatus: 'completed' as const };
          setSessionHistory(prev => prev.map(s => s.id === id ? newSession : s));
          showToast('보류 상태가 해제되었습니다.', 'success');
          // SYNC
          syncToFirestore('history_update', { session: newSession, action: 'update' });
      }
  };

  const handleDeleteRequest = (id: string) => {
      if (currentSession?.id === id) {
          if (status === 'running' || status === 'paused') {
              showToast('타이머를 멈추고 삭제해주세요.', 'error');
              return;
          }
          setCurrentSession(null);
          setStatus('idle');
          setElapsedTime(0);
          // SYNC
          syncToFirestore('status_update', { status: 'idle', currentSession: null });
      } else {
          const session = sessionHistory.find(s => s.id === id);
          if (session) {
             const updated = { ...session, deletedAt: Date.now() };
             setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
             // SYNC
             syncToFirestore('history_update', { session: updated, action: 'update' });
          }
      }
  };

  // Simplified handleDeleteSegment: UI should handle confirmation before calling this
  const handleDeleteSegment = (sessionId: string, segmentIndex: number) => {
    const isCurrent = currentSession?.id === sessionId;
    const session = isCurrent ? currentSession : sessionHistory.find(s => s.id === sessionId);
    if (!session) return;

    const activeWorkSegments = session.segments.filter(seg => !seg.deletedAt && !seg.isDeletedGap);
    const newSegments = [...session.segments];
    newSegments[segmentIndex] = { ...newSegments[segmentIndex], deletedAt: Date.now() };
    
    const nowDeletedWorkSegmentsCount = activeWorkSegments.length - (newSegments[segmentIndex].isDeletedGap ? 0 : 1);
    const isLastOne = activeWorkSegments.length === 1 && !session.segments[segmentIndex].deletedAt;
    
    let updatedSession = { ...session, segments: newSegments };

    if (isCurrent) {
        if (isLastOne) {
            setCurrentSession(null);
            setStatus('idle');
            setElapsedTime(0);
            // SYNC
            syncToFirestore('status_update', { status: 'idle', currentSession: null });
        } else {
            setCurrentSession(updatedSession);
            // SYNC
            syncToFirestore('status_update', { status: status, currentSession: updatedSession });
        }
    } else {
        if (isLastOne) {
            updatedSession = { ...updatedSession, deletedAt: Date.now() };
        }
        setSessionHistory(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
        // SYNC
        syncToFirestore('history_update', { session: updatedSession, action: 'update' });
    }
    
    showToast('기록이 삭제되었습니다.', 'info');
  };

  const handleDeleteBreak = (start: number, end: number, sessionId: string) => {
      const isCurrent = currentSession?.id === sessionId;

      const updateSegments = (s: Session) => {
          const newSegment: TimeSegment = {
              start: start,
              end: end,
              isDeletedGap: true,
              deletedAt: Date.now()
          };
          return [...s.segments, newSegment].sort((a,b) => a.start - b.start);
      };

      if (isCurrent) {
          const updated = { ...currentSession!, segments: updateSegments(currentSession!) };
          setCurrentSession(updated);
          // SYNC
          syncToFirestore('status_update', { status, currentSession: updated });
      } else {
          const session = sessionHistory.find(s => s.id === sessionId);
          if(session) {
             const updated = { ...session, segments: updateSegments(session) };
             setSessionHistory(prev => prev.map(s => s.id === sessionId ? updated : s));
             // SYNC
             syncToFirestore('history_update', { session: updated, action: 'update' });
          }
      }
  };

  const handleRestoreSegment = (sessionId: string, segmentIndex: number) => {
      const isCurrent = currentSession?.id === sessionId;

      const restore = (s: Session) => {
          const target = s.segments[segmentIndex];
          if (target.isDeletedGap) {
              return s.segments.filter((_, idx) => idx !== segmentIndex);
          } else {
              const newSegments = [...s.segments];
              const { deletedAt, ...rest } = target;
              newSegments[segmentIndex] = rest;
              return newSegments;
          }
      };

      if (isCurrent) {
          const updated = { ...currentSession!, segments: restore(currentSession!) };
          setCurrentSession(updated);
          // SYNC
          syncToFirestore('status_update', { status, currentSession: updated });
      } else {
          const session = sessionHistory.find(s => s.id === sessionId);
          if (session) {
             const updated = { ...session, segments: restore(session) };
             setSessionHistory(prev => prev.map(s => s.id === sessionId ? updated : s));
             // SYNC
             syncToFirestore('history_update', { session: updated, action: 'update' });
          }
      }
  };
  
  const restoreSession = (id: string) => {
      const session = sessionHistory.find(s => s.id === id);
      if (session) {
          const updated = { ...session, deletedAt: undefined };
          setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
          // SYNC
          syncToFirestore('history_update', { session: updated, action: 'update' });
      }
  };

  const permanentDeleteSession = (id: string) => {
      const session = sessionHistory.find(s => s.id === id);
      setSessionHistory(prev => prev.filter(s => s.id !== id));
      if (session) {
          // SYNC
          syncToFirestore('history_update', { session, action: 'delete' });
      }
  };

  const emptyTrash = () => {
      const toDelete = sessionHistory.filter(s => s.deletedAt);
      setSessionHistory(prev => prev.filter(s => !s.deletedAt));
      // SYNC Batch delete (simplified loop for now)
      toDelete.forEach(s => syncToFirestore('history_update', { session: s, action: 'delete' }));
  };
  
  const handleClearData = () => {
      setSessionHistory([]); 
      setCurrentSession(null); 
      setStatus('idle'); 
      setTaskNameInput('');
      setElapsedTime(0);
      
      localStorage.removeItem('workflow-history');
      localStorage.removeItem('workflow-workdays');
      localStorage.removeItem('workflow-current-session');
      localStorage.removeItem('workflow-status');

      // SYNC: Clear everything
      if(user) {
          // This part ideally needs a batch delete for subcollection which is complex in client-sdk
          // For now, let's just clear the main doc fields
          syncToFirestore('status_update', { status: 'idle', currentSession: null });
      }

      showToast('초기화되었습니다.', 'success');
  };

  const handleNavigateToSession = (id: string) => {
    setIsCalendarOpen(false);
    if (historySectionRef.current) historySectionRef.current.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      setHighlightedSessionId(id);
      const element = document.getElementById(`session-${id}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
    setTimeout(() => setHighlightedSessionId(null), 2500);
  };

  const scrollToHistory = () => historySectionRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleTimeTableDateChange = (direction: -1 | 1) => {
      if (!timeTableData) return;
      const current = timeTableData.dateObj;
      const nextDate = new Date(current);
      nextDate.setDate(current.getDate() + direction);
      
      const dateStr = getAdjustedDateStr(nextDate.getTime(), notificationSettings.dayStartHour);
      const activeHistory = sessionHistory.filter(s => !s.deletedAt);
      const newSessions = activeHistory.filter(s => getAdjustedDateStr(s.createdAt, notificationSettings.dayStartHour) === dateStr);

      setTimeTableData({
          dateStr: dateStr,
          dateObj: nextDate,
          sessions: newSessions
      });
  };

  const filteredHistory = useMemo(() => {
    const combined = currentSession ? [currentSession, ...activeHistory] : activeHistory;
    return combined.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesGroup = true;
      if (historyFilterGroupId === 'all') matchesGroup = true;
      else if (historyFilterGroupId === 'on-hold') matchesGroup = s.completionStatus === 'on-hold';
      else matchesGroup = s.groupId === historyFilterGroupId;

      let matchesDate = true;
      if (historyDateRange.start || historyDateRange.end) {
          const sessionDate = new Date(s.createdAt).setHours(0,0,0,0);
          const start = historyDateRange.start ? new Date(historyDateRange.start).setHours(0,0,0,0) : null;
          const end = historyDateRange.end ? new Date(historyDateRange.end).setHours(23,59,59,999) : null;
          if (start && sessionDate < start) matchesDate = false;
          if (end && sessionDate > end) matchesDate = false;
      }
      return matchesSearch && matchesGroup && matchesDate;
    });
  }, [activeHistory, currentSession, searchQuery, historyFilterGroupId, historyDateRange]);

  const groupedHistory = useMemo(() => {
    const groups: { dateStr: string; dateObj: Date; sessions: Session[]; totalTime: number; breakTime: number }[] = [];
    filteredHistory.forEach(session => {
        const dateStr = getAdjustedDateStr(session.createdAt, notificationSettings.dayStartHour);
        const dateObj = new Date(session.createdAt); 
        let group = groups.find(g => g.dateStr === dateStr);
        if (!group) {
            group = { dateStr, dateObj, sessions: [], totalTime: 0, breakTime: 0 };
            groups.push(group);
        }
        group.sessions.push(session);
        group.totalTime += calculateTotalDuration(session.segments);
    });
    groups.forEach(group => {
        group.breakTime = calculateBreakTime(group.sessions, 60000, notificationSettings.dayStartHour);
    });
    return groups.sort((a,b) => b.dateStr.localeCompare(a.dateStr));
  }, [filteredHistory, notificationSettings.dayStartHour]);

  // Combined Header Visibility Logic
  // Header shows if: (Not hidden by scroll) OR (Hovered at top) OR (Force Show via Touch)
  const isHeaderHidden = status !== 'idle' && !isScrolled && !headerForceShow;
  const shouldShowHeader = !isHeaderHidden || isHeaderHovered || headerForceShow;
  
  // Logic to show/hide side buttons (Complete/Hold)
  // Hide if idle (initial) OR stopped (hard stop)
  const showSideButtons = status === 'running' || status === 'paused';

  let alertClass = '';
  if (alertState === 'work') alertClass = 'animate-[pulse_2s_ease-in-out_infinite] bg-indigo-100/50 dark:bg-indigo-900/30';
  if (alertState === 'break') alertClass = 'animate-[pulse_2s_ease-in-out_infinite] bg-emerald-100/50 dark:bg-emerald-900/30';

  let numberAnimClass = "transition-all duration-500 ease-in-out transform";
  if (exitAnim === 'complete') numberAnimClass += " text-emerald-500 dark:text-emerald-400 translate-y-20 opacity-0 scale-95 blur-sm";
  else if (exitAnim === 'hold') numberAnimClass += " text-slate-400 dark:text-slate-600 scale-50 translate-y-20 opacity-0 blur-md";
  else {
      if (status === 'stopped') numberAnimClass += ' text-rose-500 dark:text-rose-400 scale-90';
      else numberAnimClass += status === 'running' ? ' text-slate-900 dark:text-white' : ' text-slate-400 dark:text-slate-600';
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!notificationSettings.shortcutEnabled) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (status === 'running') finishSession('completed');
        else handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notificationSettings.shortcutEnabled, status, currentSession]); 

  const getIconSize = () => isPopup ? '32px' : 'min(6vw, 3.5vh)';

  return (
    <div 
        ref={mainContainerRef} 
        onScroll={handleScroll} 
        onTouchStart={handleTouchInteraction}
        className={`h-screen w-full overflow-y-auto scroll-smooth relative bg-transparent snap-y snap-mandatory scrollbar-hide overflow-x-hidden ${isPopup ? 'flex items-center justify-center overflow-hidden' : ''}`}
    >
      <div className={`fixed inset-0 z-0 transition-colors duration-500 pointer-events-none ${alertClass}`}></div>
      
      {/* Easter Egg Layer */}
      {easterEggActive && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
              <div className="absolute animate-[fly-diag_5s_linear_forwards] top-0 right-0">
                  <Gem size={48} className="text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] opacity-50" />
              </div>
              <style>{`
                @keyframes fly-diag {
                    0% { transform: translate(10vw, -10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.5; }
                    100% { transform: translate(-110vw, 110vh) rotate(720deg); opacity: 0; }
                }
              `}</style>
          </div>
      )}

      {flyingGems.map(gem => (
          <div key={gem.id} className="fixed z-[150] pointer-events-none" style={{ top: '-50px', left: gem.left, animation: `fly-down ${gem.duration} linear forwards` }}>
              <Gem size={32} className="text-indigo-400 drop-shadow-lg" />
              <style>{`
                @keyframes fly-down {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
              `}</style>
          </div>
      ))}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`glass-panel flex items-center gap-3 p-4 rounded-2xl shadow-2xl border ${
                toast.type === 'error' ? 'bg-red-50/80 text-red-900 border-red-200/50' :
                toast.type === 'success' ? 'bg-green-50/80 text-green-900 border-green-200/50' :
                'bg-slate-800/80 text-white border-slate-700/50'
            }`}>
                {toast.type === 'error' && <AlertTriangle className="shrink-0 text-red-500" />}
                {toast.type === 'success' && <CheckCircle2 className="shrink-0 text-green-500" />}
                {toast.type === 'info' && <AlertCircle className="shrink-0 text-indigo-400" />}
                <p className="text-sm font-semibold">{toast.message}</p>
            </div>
        </div>
      )}

      {showScrollTop && !isPopup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
            <button 
                onClick={scrollToHistoryTop}
                className="p-3 bg-indigo-600/90 text-white rounded-full shadow-lg hover:bg-indigo-700 backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
            >
                <ArrowUp size={20} />
            </button>
        </div>
      )}

      {/* Header Hidden Indicator - Shows when header is hidden */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-slate-300/50 dark:bg-slate-700/50 rounded-b-full transition-opacity duration-300 z-[110] backdrop-blur-sm ${shouldShowHeader ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}></div>

      {!isPopup && (
        <>
            {/* Invisible Hover Trigger Zone */}
            <div 
                className="fixed top-0 left-0 w-full h-6 z-[120] pointer-events-auto"
                onMouseEnter={() => setIsHeaderHovered(true)}
            />

            {/* Main Header Container */}
            <div 
                className={`fixed top-0 w-full z-[110] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pb-4 pointer-events-none ${shouldShowHeader ? 'translate-y-0' : '-translate-y-[calc(100%-10px)]'}`}
                onMouseEnter={() => setIsHeaderHovered(true)}
                onMouseLeave={() => setIsHeaderHovered(false)}
            >
                  <header className="glass-panel border-b border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md pointer-events-auto">
                      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between w-full">
                      <div className="flex items-center gap-3" onClick={triggerGem}>
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white cursor-pointer active:scale-90 transition-all shadow-lg shadow-indigo-500/30 group">
                              <Clock size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                          </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                          
                          {/* Integrated Utility Pill */}
                          <nav className="flex items-center p-1 bg-white/40 dark:bg-slate-800/40 rounded-full border border-white/40 dark:border-white/5 shadow-sm backdrop-blur-md">
                              <button 
                                onClick={() => handleOpenCalendar()} 
                                className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-full active:scale-90 transition-all focus:outline-none"
                                title="캘린더"
                              >
                                <CalendarIcon size={20} />
                              </button>
                              <button 
                                onClick={() => setIsStatsOpen(true)} 
                                className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-full active:scale-90 transition-all focus:outline-none"
                                title="통계 대시보드"
                              >
                                <BarChart2 size={20} />
                              </button>
                              <button 
                                onClick={() => setIsSettingsOpen(true)} 
                                className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-full active:scale-90 transition-all focus:outline-none"
                                title="설정"
                              >
                                <Settings size={20} />
                              </button>
                          </nav>

                          {/* Login/Logout Button */}
                          <button 
                              onClick={user ? handleLogout : handleLogin}
                              className={`
                                  flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm transition-all shadow-sm
                                  ${user 
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'}
                              `}
                          >
                              {user ? <LogOut size={16} /> : <LogIn size={16} />}
                              <span className="hidden sm:inline">{user ? '로그아웃' : '로그인'}</span>
                          </button>
                      </div>
                      </div>
                  </header>
            </div>
        </>
      )}

      <div className={`min-h-screen w-full flex flex-col items-center relative z-10 snap-start ${isPopup ? 'justify-center p-0' : 'justify-center pt-24'}`}>
        <main className={`flex-1 flex flex-col items-center justify-center w-full ${isPopup ? 'max-w-none h-full' : 'max-w-3xl px-4 sm:px-6 lg:px-8 mx-auto'}`}>
            {/* ... (Main Timer UI - No changes) ... */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] z-0 blur-[80px] dark:opacity-40 opacity-70 animate-blob transition-all duration-1000 bg-gradient-to-r ${focusConfig.subtleGradient}`}></div>
            <section 
                className={`w-full glass-card overflow-hidden relative transition-transform duration-300 z-20 active:scale-[0.98] ${isPopup ? 'h-screen border-0 shadow-none rounded-none flex flex-col justify-center bg-white/90 dark:bg-slate-900/90' : 'rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl'}`}
                style={{ transform: `translate(${dragState.x}px, ${dragState.y}px)` }}
                onTouchStart={onTimerTouchStart} onTouchMove={onTimerTouchMove} onTouchEnd={onTimerTouchEnd}
                onMouseDown={onTimerMouseDown} onMouseMove={onTimerMouseMove} onMouseUp={onTimerMouseUp} onMouseLeave={onTimerMouseLeave}
            >
                {!isPopup && (
                    <div className="absolute top-6 left-6 z-50">
                        <Dropdown 
                            value={activeGroupId}
                            options={groups.map(g => ({ value: g.id, label: g.name, color: g.color }))}
                            onChange={(val) => { setActiveGroupId(val); if(currentSession) { const updated = {...currentSession, groupId: val}; setCurrentSession(updated); syncToFirestore('status_update', {status, currentSession: updated}); } }}
                            size="sm"
                            className="glass-panel rounded-xl shadow-sm"
                        />
                    </div>
                )}
                <div className={`absolute z-[160] flex items-center gap-2 ${isPopup ? 'top-4 right-4' : 'top-5 right-5'}`}>
                    {!isPopup && (
                        <button onClick={handlePopupAction} className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-all">
                            {window.matchMedia("(max-width: 768px)").matches ? <PictureInPicture size={18} /> : <ExternalLink size={18} />}
                        </button>
                    )}
                    <div className="relative timer-menu-trigger">
                        <button onClick={() => setIsTimerMenuOpen(!isTimerMenuOpen)} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors">
                            <MoreVertical size={18} />
                        </button>
                        {isTimerMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 timer-menu overflow-hidden z-[160]">
                                {status === 'stopped' ? (
                                    <button onClick={() => { handleStart(); setIsTimerMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left font-medium">
                                        <Play size={16} fill="currentColor" /> 기록 재개
                                    </button>
                                ) : (
                                    <button onClick={(e) => handleStopWithoutBreak(e)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left font-medium">
                                        <Square size={16} fill="currentColor" /> {status === 'paused' ? '휴식 종료 및 기록 정지' : '기록 일시 정지'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className={`text-center flex flex-col items-center justify-center ${isPopup ? 'p-4 min-h-0 flex-1' : 'px-[3vh] pb-[4vh] pt-[8vh] min-h-[40vh] sm:min-h-[50vh]'}`}>
                    <div className={`relative w-full flex items-center justify-center shrink-0 select-none ${isPopup ? 'h-24 mb-1' : 'h-32 mb-8 sm:h-[25vh]'}`}>
                        <div className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute flex flex-col items-center ${status === 'paused' ? '-translate-y-[5vh] scale-75 opacity-20 blur-[2px]' : 'translate-y-0 opacity-100 blur-0'} ${status === 'stopped' ? 'scale-90' : 'scale-100'}`}>
                            <div className="relative">
                                {status === 'stopped' && <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-rose-500 dark:text-rose-400 font-bold uppercase tracking-widest px-4 py-1 rounded-full bg-rose-50/80 dark:bg-rose-900/60 backdrop-blur-md shadow-sm border border-rose-200/50 dark:border-rose-800/50 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap text-sm"><Square size={16} fill="currentColor" className="animate-pulse" /> 기록 정지됨</div>}
                                <div className={`font-black tabular-nums tracking-tighter drop-shadow-sm ${numberAnimClass}`} style={{ fontSize: isPopup ? '14vw' : 'min(18vw, 15vh)', lineHeight: 1 }}>
                                    {formatDuration(elapsedTime)}
                                </div>
                            </div>
                        </div>
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out ${stampVisible ? 'scale-100 opacity-100' : 'scale-[3] opacity-0'}`}>
                             <div className="relative">
                                <CheckCircle2 size={isPopup ? 80 : 160} className="text-emerald-500 drop-shadow-lg" strokeWidth={2} />
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/50 animate-ping"></div>
                             </div>
                        </div>
                        <div className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute flex flex-col items-center z-10 ${status === 'paused' ? 'translate-y-[2vh] scale-100 opacity-100 blur-0' : 'translate-y-[5vh] scale-50 opacity-0 blur-md pointer-events-none'}`}>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-3 px-4 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/60 backdrop-blur-md shadow-lg border border-emerald-200/50 dark:border-emerald-800/50 text-sm">
                                <Coffee size={16} className="animate-bounce" /> {!isPopup && '휴식 시간'}
                            </div>
                            <div className="font-black tabular-nums tracking-tighter text-emerald-600 dark:text-emerald-400 drop-shadow-sm" style={{ fontSize: isPopup ? '12vw' : 'min(14vw, 12vh)', lineHeight: 1 }}>
                                {formatDuration(breakTime)}
                            </div>
                        </div>
                    </div>
                    <div className={`${isPopup ? 'mb-2' : 'mb-8'} max-w-md mx-auto w-full relative z-30`}>
                        <input type="text" placeholder="어떤 작업을 하고 계신가요?" value={status === 'idle' ? taskNameInput : (currentSession?.name || '')} onChange={(e) => { const val = e.target.value; setTaskNameInput(val); if (currentSession) { const updated = { ...currentSession, name: val }; setCurrentSession(updated); syncToFirestore('status_update', {status, currentSession: updated}); } }} onMouseDown={(e) => e.stopPropagation()} className="w-full text-center font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 border-b-2 border-transparent focus:border-indigo-500/50 focus:outline-none bg-transparent transition-all rounded-lg py-2 select-text" style={{ fontSize: isPopup ? '1rem' : 'min(6vw, 3.5vh)' }} />
                    </div>
                    <div className={`flex flex-row items-center gap-3 sm:gap-4 w-full max-w-xl mx-auto transition-all duration-500 px-2 relative z-40`} style={{ height: isPopup ? '48px' : 'min(15vw, 8vh)' }}>
                        <div className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-full ${showSideButtons ? 'flex-[0.85]' : 'flex-[100%]'}`}>
                            <Button onClick={() => { if (status === 'running') handlePause(); else handleStart(); }} variant={status === 'running' ? 'warning' : 'primary'} className="w-full h-full !shadow-lg !shadow-slate-300/30 dark:!shadow-black/50 overflow-hidden whitespace-nowrap relative rounded-2xl text-lg sm:text-xl active:!shadow-inner">
                                 <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${status === 'running' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}><Pause fill="currentColor" style={{ width: getIconSize(), height: getIconSize() }} /></div>
                                 <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300 ${status !== 'running' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}><Play fill="currentColor" style={{ width: getIconSize(), height: getIconSize() }} />{status === 'idle' && <span className="font-bold">작업 시작</span>}{status === 'paused' && <span className="font-bold">이어하기</span>}{status === 'stopped' && <span className="font-bold">기록 재개</span>}</div>
                            </Button>
                        </div>
                        <div className={`flex flex-row gap-3 sm:gap-4 h-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showSideButtons ? 'flex-[1.15] opacity-100' : 'w-0 opacity-0 flex-[0_0_0] overflow-hidden'}`}>
                              <Button onClick={() => finishSession('completed')} variant="success" className={`h-full !shadow-lg !shadow-slate-300/30 dark:!shadow-black/50 transition-all duration-500 overflow-hidden px-2 sm:px-4 flex-1 rounded-2xl active:!shadow-inner`}>
                                <CheckCircle2 style={{ width: getIconSize(), height: getIconSize() }} />
                              </Button>
                              <Button onClick={() => finishSession('on-hold')} variant="secondary" className="h-full !shadow-lg !shadow-slate-300/30 dark:!shadow-black/50 aspect-square flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-500 px-0 rounded-2xl border-2 active:!shadow-inner">
                                <Archive style={{ width: '24px', height: '24px' }} />
                                <span className={`text-[10px] font-bold ${isPopup ? 'hidden' : 'hidden lg:inline'}`}>보류</span>
                              </Button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        {!isPopup && <div className="flex justify-center p-4"><div onClick={scrollToHistory} className="cursor-pointer p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"><ChevronDown size={32} /></div></div>}
      </div>

      {!isPopup && (
          <div ref={historySectionRef} className="min-h-screen w-full bg-transparent pt-24 pb-10 z-10 relative snap-start">
             <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6">
                    {/* ... (History Header & Filters) ... */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-4 w-full sm:w-auto pb-1 sm:pb-0">
                             {/* Replaced H2 title with Segmented Control */}
                             <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                 <button 
                                    type="button" 
                                    onClick={() => setHistoryViewMode('task')} 
                                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                        historyViewMode === 'task' 
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                 >
                                     <LayoutList size={16} />
                                     작업 목록
                                 </button>
                                 <button 
                                    type="button" 
                                    onClick={() => setHistoryViewMode('time')} 
                                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                        historyViewMode === 'time' 
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                 >
                                     <Clock size={16} />
                                     타임라인
                                 </button>
                             </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto relative z-40">
                             <div className="relative flex-1 sm:w-48 h-10 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none" size={16} /><input type="text" placeholder="기록 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 w-full h-full bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 backdrop-blur-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all select-text" /></div>
                             <div className="relative date-filter-trigger shrink-0 h-10 w-10">
                                 <button onClick={() => setIsDateFilterOpen(!isDateFilterOpen)} className={`w-full h-full flex items-center justify-center rounded-xl border bg-white/80 border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm ${historyDateRange.start ? 'bg-indigo-50/80 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : ''}`}><CalendarIcon size={20} /></button>
                                 {isDateFilterOpen && <div className="absolute top-full right-0 mt-2 p-4 glass-panel rounded-2xl shadow-xl z-[60] flex flex-col gap-4 animate-in fade-in zoom-in-95 date-filter-popover w-[280px]"><MiniCalendar initialDate={historyDateRange.start ? new Date(historyDateRange.start) : new Date()} onDateSelect={handleCalendarDayClick} selectedStart={historyDateRange.start} selectedEnd={historyDateRange.end} showFooter={!!(historyDateRange.start || historyDateRange.end)} onClear={() => setHistoryDateRange({start: '', end: ''})} onApply={() => setIsDateFilterOpen(false)} /></div>}
                             </div>
                            <div className="h-10 w-10 shrink-0"><button onClick={() => setIsTrashOpen(true)} className="w-full h-full flex items-center justify-center rounded-xl border bg-white/80 border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"><Trash2 size={20} /></button></div>
                        </div>
                    </div>
                    <div className="relative group/scroll"><div className="flex items-center gap-1"><button onClick={() => scrollFilters('left')} className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 transition-colors shrink-0 hidden sm:block"><ChevronLeft size={16} /></button><div ref={filterScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 px-1"><button onClick={() => setHistoryFilterGroupId('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all border shadow-sm ${historyFilterGroupId === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'bg-white/80 border-slate-300 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 backdrop-blur-sm'}`}>전체</button><button onClick={() => setHistoryFilterGroupId('on-hold')} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all border shadow-sm ${historyFilterGroupId === 'on-hold' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800' : 'bg-white/80 border-slate-300 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 backdrop-blur-sm'}`}>보류됨</button><div className="w-px h-5 bg-slate-300/50 dark:bg-slate-600/50 mx-1 self-center shrink-0"></div>{groups.map(group => (<button key={group.id} onClick={() => setHistoryFilterGroupId(group.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all border shadow-sm ${historyFilterGroupId === group.id ? `${getGroupStyle(group.color).bg} ${getGroupStyle(group.color).text} border-transparent` : 'bg-white/80 border-slate-300 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 backdrop-blur-sm'}`}>{group.name}</button>))}</div><button onClick={() => scrollFilters('right')} className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 transition-colors shrink-0 hidden sm:block"><ChevronRight size={16} /></button></div></div>
                </div>
                
                {/* List Container with Animation */}
                <div className="space-y-8 mt-6 pb-20">
                    {groupedHistory.length === 0 ? (<div className="text-center py-16 glass-panel rounded-3xl border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in duration-500"><History size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3 opacity-50" /><p className="text-slate-500 dark:text-slate-400">기록이 없습니다.</p></div>) : (groupedHistory.map((group, idx) => {
                        const isCollapsed = collapsedGroups.has(group.dateStr);
                        const sessionCount = group.sessions.length;
                        return (
                        <div key={`${group.dateStr}-${historyFilterGroupId}`} id={`history-group-${group.dateStr.replace(/\./g, '-').replace(/ /g, '')}`} className="scroll-mt-28 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                            {/* Sticky Header with Click Handler */}
                            <div className="sticky top-16 z-20 pb-2">
                                <div className="glass-panel flex items-center justify-between px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800/80 transition-all group shadow-sm backdrop-blur-md select-none border border-slate-200/50 dark:border-slate-700/50" onClick={() => toggleGroupCollapse(group.dateStr)}>
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2 px-2 py-1 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 rounded-lg transition-colors cursor-pointer group/date" onClick={(e) => { e.stopPropagation(); openNavigationCalendar(group.dateObj); }}>
                                            <CalendarDays size={18} className="text-slate-500 group-hover/date:text-indigo-500 transition-colors" />
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap group-hover/date:text-indigo-600 dark:group-hover/date:text-indigo-400">{group.dateStr}</span>
                                            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                               {formatDurationHM(group.totalTime)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); setTimeTableData({ dateStr: group.dateStr, dateObj: group.dateObj, sessions: group.sessions }); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg transition-colors relative z-30" title="원형 타임라인">
                                            <PieChart size={18} />
                                        </button>
                                        <div className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative z-30">
                                            <ChevronDown size={18} className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Animated Collapsible Content using grid-template-rows */}
                            <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="space-y-3 pt-1 pb-2 px-1">
                                        {historyViewMode === 'task' ? (
                                            group.sessions.map(session => (
                                                <SessionCard key={session.id} session={session} groups={groups} 
                                                    onRename={(id, name) => {
                                                        const updated = {...session, name};
                                                        setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                                                        syncToFirestore('history_update', { session: updated, action: 'update' });
                                                    }} 
                                                    onGroupChange={(id, groupId) => {
                                                        const updated = {...session, groupId};
                                                        setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                                                        syncToFirestore('history_update', { session: updated, action: 'update' });
                                                    }} 
                                                    onMemoChange={(id, memo) => {
                                                        const updated = {...session, memo};
                                                        setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                                                        syncToFirestore('history_update', { session: updated, action: 'update' });
                                                    }} 
                                                    onContinue={handleContinueSession} onDelete={handleDeleteRequest} onRemoveHold={handleRemoveHold} isHighlighted={session.id === highlightedSessionId} 
                                                />
                                            ))
                                        ) : (
                                            <div className="pl-2">
                                                <TimetableList sessions={group.sessions} targetDate={group.dateObj} breakTrackingMode='pause-only' selectedGroupId={historyFilterGroupId === 'all' || historyFilterGroupId === 'on-hold' ? 'all' : historyFilterGroupId} onDeleteSegment={handleDeleteSegment} onDeleteBreak={handleDeleteBreak} onRestore={handleRestoreSegment} dayStartHour={notificationSettings.dayStartHour} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}) )}
                </div>
            </div>
          </div>
      )}
      {/* ... (Modals and other components) ... */}
      {isNavCalendarOpen && (<div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsNavCalendarOpen(false)}><div className="glass-panel rounded-3xl shadow-2xl p-6 w-[320px] max-w-full animate-in zoom-in-95 duration-200 border border-white/20 dark:border-white/10" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-700/50"><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-indigo-500" />날짜로 이동</h3><button onClick={() => setIsNavCalendarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button></div><MiniCalendar initialDate={navCalendarInitialDate} onDateSelect={handleScrollToDate} /></div></div>)}
      {isStatsOpen && <StatsDashboard sessions={allSessionsForStats} groups={groups} onClose={() => setIsStatsOpen(false)} />}
      {isCalendarOpen && (<CalendarView sessions={activeHistory} groups={groups} onClose={() => setIsCalendarOpen(false)} onNavigateToSession={handleNavigateToSession} onOpenTimeTable={(d, obj, s) => setTimeTableData({dateStr: d, dateObj: obj, sessions: s})} onDelete={handleDeleteRequest} 
          onRename={(id, name) => {
              const session = sessionHistory.find(s => s.id === id);
              if (session) {
                  const updated = {...session, name};
                  setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                  syncToFirestore('history_update', { session: updated, action: 'update' });
              }
          }} 
          onGroupChange={(id, groupId) => {
               const session = sessionHistory.find(s => s.id === id);
              if (session) {
                  const updated = {...session, groupId};
                  setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                  syncToFirestore('history_update', { session: updated, action: 'update' });
              }
          }} 
          onMemoChange={(id, memo) => {
              const session = sessionHistory.find(s => s.id === id);
              if (session) {
                  const updated = {...session, memo};
                  setSessionHistory(prev => prev.map(s => s.id === id ? updated : s));
                  syncToFirestore('history_update', { session: updated, action: 'update' });
              }
          }} 
          onContinue={handleContinueSession} onRestore={handleRestoreSegment} onDeleteSegment={handleDeleteSegment} onDeleteBreak={handleDeleteBreak} breakTrackingMode='pause-only' initialDate={calendarInitialDate} />)}
      {timeTableData && <DailyTimeTable dateStr={timeTableData.dateStr} targetDate={timeTableData.dateObj} sessions={timeTableData.sessions} groups={groups} onClose={() => setTimeTableData(null)} breakTrackingMode='pause-only' onPrevDate={() => handleTimeTableDateChange(-1)} onNextDate={() => handleTimeTableDateChange(1)} averages={null} />}
      
      {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onExport={() => downloadCSV(activeHistory, groups)} notificationSettings={notificationSettings} onUpdateNotification={(s) => {setNotificationSettings(s); syncToFirestore('settings_update', {settings: s});}} groups={groups} onUpdateGroups={handleUpdateGroups} installPrompt={installPrompt} onInstall={handleInstallClick} onClearData={handleClearData} />}
      {isTrashOpen && (<TrashModal deletedSessions={deletedHistory} activeSessions={activeHistory} groups={groups} onClose={() => setIsTrashOpen(false)} onRestore={restoreSession} onPermanentDelete={permanentDeleteSession} onEmptyTrash={emptyTrash} onRestoreSegment={handleRestoreSegment} />)}
    </div>
  );
}
