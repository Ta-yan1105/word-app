/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import './App.css';

import { DICT } from './locales';
import { initialBoxes, initialDecks } from './initialData';
import { parseCSV, cleanText, cleanTranslation, renderHighlightedText } from './utils';
import Manual from './Manual';
import PrintPreview from './PrintPreview';
import TestMode from './TestMode';

function App() {
  const [lang, setLang] = useState('ja'); 
  const t = DICT[lang];

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  
  const [boxes, setBoxes] = useState(() => { 
    try { const saved = localStorage.getItem('redline_boxes'); return saved ? JSON.parse(saved) : initialBoxes; } catch(e) { return initialBoxes; }
  });
  const [decks, setDecks] = useState(() => { 
    try { const saved = localStorage.getItem('redline_decks'); return saved ? JSON.parse(saved) : initialDecks; } catch(e) { return initialDecks; }
  });

  const [pullDownY, setPullDownY] = useState(0); 
  const [isStoring, setIsStoring] = useState(false);
  const [view, setView] = useState('boxes'); 
  const [currentBoxId, setCurrentBoxId] = useState(null); 
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [studyTime, setStudyTime] = useState(0); 
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); 
  const [displaySeconds, setDisplaySeconds] = useState(2.0); 
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false); 
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [newBoxName, setNewBoxName] = useState(''); 
  const [newDeckNameInside, setNewDeckNameInside] = useState('');
  const [editingCard, setEditingCard] = useState(null); 
  const [addingCard, setAddingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ word: '', meaning: '', example: '', translation: '', pos: '', memo: '' });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [printCards, setPrintCards] = useState([]);
  const [printMode, setPrintMode] = useState('word');
  
  const [openingBoxId, setOpeningBoxId] = useState(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());

  const [qLang, setQLang] = useState('en'); 
  const [qType, setQType] = useState('word'); 
  const [showExOnBack, setShowExOnBack] = useState(true); 
  const [showWordOnExMode, setShowWordOnExMode] = useState(true); 
  const [showMemoOnBack, setShowMemoOnBack] = useState(true); 
  const [isFrontOnlyAuto, setIsFrontOnlyAuto] = useState(false); 
  const [showSettingsMenu, setShowSettingsMenu] = useState(false); 

  const touchStartX = useRef(null); 
  const touchStartY = useRef(null); 
  const touchEndX = useRef(null); 
  const touchEndY = useRef(null);
  const playedRef = useRef({ index: -1, flipped: false, lang: '', type: '' });
  const settingsRef = useRef(null); 

  const activeDeck = (Array.isArray(decks) ? decks : []).find(d => d.id === currentDeckId);
  const allCards = activeDeck && Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const ua = (navigator.userAgent || navigator.vendor || window.opera).toLowerCase();
    if (/line|instagram|fban|fbav|twitter|gsa|yahoouisearch|yabrowser/.test(ua) || (ua.includes('iphone') && !ua.includes('safari')) || (ua.includes('android') && ua.includes('wv'))) {
      setIsInAppBrowser(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) { 
            setBoxes(docSnap.data().boxes || initialBoxes); setDecks(docSnap.data().decks || initialDecks); 
          } else { 
            setBoxes(initialBoxes); setDecks(initialDecks); await setDoc(doc(db, "users", user.uid), { boxes: initialBoxes, decks: initialDecks }); 
          }
        } catch (e) { console.error("Firestore read error.", e); }
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try { localStorage.setItem('redline_boxes', JSON.stringify(boxes)); localStorage.setItem('redline_decks', JSON.stringify(decks)); } catch (e) {}
    if (currentUser && boxes.length > 0) {
      const timer = setTimeout(() => { setDoc(doc(db, "users", currentUser.uid), { boxes, decks }, { merge: true }).catch(e => console.log(e)); }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [boxes, decks, currentUser]);

  useEffect(() => {
    setBoxes(prev => prev.map(b => b.nameKey ? { ...b, name: t[b.nameKey] } : b));
    setDecks(prev => prev.map(d => {
      if (d.nameKey) {
        const newCards = (d.cards || []).map(c => {
          if (c.word === 'shine') return { ...c, meaning: t.card1_mean, translation: t.card1_trans };
          if (c.word === 'have') return { ...c, meaning: t.card2_mean, translation: t.card2_trans };
          if (c.word === 'make') return { ...c, meaning: t.card3_mean, translation: t.card3_trans };
          if (c.word === 'attack') return { ...c, meaning: t.card4_mean, translation: t.card4_trans };
          return c;
        });
        return { ...d, name: t[d.nameKey], cards: newCards };
      }
      return d;
    }));
  }, [lang, t]);

  const handleLogin = () => {
    if (isInAppBrowser) return alert("【ログインエラーの回避】\nLINE等の「アプリ内ブラウザ」ではログインできません。「Safari/ブラウザで開く」を選択してください。");
    signInWithPopup(auth, provider).catch(e => { if (e.code !== 'auth/popup-closed-by-user') alert("ログイン失敗"); });
  };
  const handleLogout = () => { signOut(auth).then(() => { setBoxes([]); setDecks([]); }); };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    setBoxes([...boxes, { id: Date.now(), name: newBoxName }]); setNewBoxName('');
  };

  const renameBox = (e, boxId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptBoxRename, currentName);
    if (newName !== null && newName.trim() !== '') setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, name: newName.trim(), nameKey: null } : b));
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteBox)) { setBoxes(boxes.filter(b => b.id !== boxId)); setDecks(decks.filter(d => d.boxId !== boxId)); }
  };

  const createNewDeckInsideBox = () => {
    if (!newDeckNameInside.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckNameInside, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckNameInside('');
  };

  const renameDeck = (e, deckId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptDeckRename, currentName);
    if (newName !== null && newName.trim() !== '') setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName.trim(), nameKey: null } : d));
  };

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm(t.confirmDeleteDeck)) setDecks(decks.filter(d => d.id !== id)); };

  const getEbbinghausStatus = (deck) => {
    const cards = Array.isArray(deck.cards) ? deck.cards : [];
    if (cards.length > 0 && cards.every(c => c.isMemorized)) return { label: t.statusPerfect, className: 'status-perfect', needsReview: false };
    const lastStudied = deck.lastStudied;
    if (!lastStudied) return { label: t.statusNew, className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: t.statusFresh, className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: t.statusReview, className: 'status-review', needsReview: true, shake: true };
    return { label: t.statusWarning, className: 'status-warning', needsReview: false };
  };

  const downloadTemplate = () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const content = '英単語,日本語訳,英語例文,例文和訳,品詞,メモ\n"例: regard",見なす,"Many people **regard** this book **as** very important.","多くの人がこの本をとても重要なものとみなしている。",動詞,"regard A as B (AをBと見なす)"\n';
    const blob = new Blob([bom, content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'import_template.csv'; a.click(); window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result; const parsedData = parseCSV(text);
      const startIndex = parsedData[0] && parsedData[0][0] && String(parsedData[0][0]).includes('英単語') ? 1 : 0;
      processImportData(parsedData.slice(startIndex).filter(row => row.length > 0 && row[0] && String(row[0]).trim() !== '')); 
    };
    reader.readAsText(file); e.target.value = null; 
  };

  const processImportData = (rows) => {
    setLoading(true);
    try {
      const newCards = []; const duplicateWords = []; 
      for (const row of rows) {
        const targetWord = row[0] ? String(row[0]).trim() : ''; if (!targetWord) continue;
        if (allCards.some(c => c.word === targetWord) || newCards.some(c => c.word === targetWord)) {
           if (!duplicateWords.includes(targetWord)) duplicateWords.push(targetWord);
        }
        newCards.push({ word: targetWord, meaning: row[1] ? cleanText(row[1]) : '', example: row[2] ? cleanText(row[2]) : '', translation: row[3] ? cleanText(row[3]) : '', pos: row[4] ? cleanText(row[4]) : '', memo: row[5] ? cleanText(row[5]) : '', isMemorized: false });
      }
      if (duplicateWords.length > 0) {
         const sample = duplicateWords.slice(0, 3).join(', ');
         const more = duplicateWords.length > 3 ? (lang === 'ja' ? ' など' : ' etc.') : '';
         const msg = lang === 'ja' ? `重複が ${duplicateWords.length}件 含まれています（${sample}${more}）。追加しますか？` : `Add ${duplicateWords.length} duplicates?`;
         if (!window.confirm(msg)) { setLoading(false); return; }
      }
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...(d.cards || []), ...newCards] } : d));
      setToastMessage(`🎉 ${newCards.length}語追加されました！`); setTimeout(() => setToastMessage(''), 3000);
    } catch(e) { alert(t.alertCsvError); } finally { setIsBulkMode(false); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setLoading(false); }
  };

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };
  
  const toggleFullScreen = () => {
    if (!isFullscreen) {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) docElm.requestFullscreen(); else if (docElm.webkitRequestFullscreen) docElm.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => { if (!(document.fullscreenElement || document.webkitFullscreenElement)) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', handleFullscreenChange); document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => { document.removeEventListener('fullscreenchange', handleFullscreenChange); document.removeEventListener('webkitfullscreenchange', handleFullscreenChange); };
  }, []);

  const unlockAudio = useCallback(() => {
    if ('speechSynthesis' in window && !isMuted) { const dummy = new SpeechSynthesisUtterance(''); dummy.volume = 0; window.speechSynthesis.speak(dummy); }
  }, [isMuted]);

  const fallbackTTS = useCallback((text, rate) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = rate; 
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
      if (enVoice) utterance.voice = enVoice;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playAudio = useCallback((text) => {
    if (isMuted || !text) return; 
    const cleanWord = String(text).replace(/\*\*/g, '').replace(/[〜…~]/g, '').trim(); if (!cleanWord) return;
    let rate = 1.0;
    if (displaySeconds < 2.0) rate = 1.0 + ((2.0 - displaySeconds) / 2.0) * 0.5; else if (displaySeconds > 2.0) rate = 1.0 - ((displaySeconds - 2.0) / 2.0) * 0.2;
    rate = Math.max(0.5, Math.min(rate, 1.5));
    try {
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodeURIComponent(cleanWord)}`;
      const audio = new Audio(audioUrl); audio.playbackRate = rate;
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(() => fallbackTTS(cleanWord, rate));
    } catch (e) { fallbackTTS(cleanWord, rate); }
  }, [displaySeconds, isMuted, fallbackTTS]);

  useEffect(() => {
    if (studyCards.length === 0 || isCompleted || view !== 'study' || isBulkMode) return;
    const currentCard = studyCards[currentIndex];
    if (!currentCard) return;
    let shouldPlay = (qLang === 'en' && !isFlipped) || (qLang === 'ja' && isFlipped);
    if (shouldPlay && (playedRef.current.index !== currentIndex || playedRef.current.flipped !== isFlipped || playedRef.current.lang !== qLang || playedRef.current.type !== qType)) {
      playAudio((qType === 'example' && currentCard.example) ? currentCard.example : currentCard.word);
      playedRef.current = { index: currentIndex, flipped: isFlipped, lang: qLang, type: qType };
    }
  }, [currentIndex, isFlipped, qLang, qType, studyCards, isCompleted, view, isBulkMode, playAudio]);

  const handleNextCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setCurrentIndex((currentIndex + 1) % studyCards.length); }, [currentIndex, studyCards]);
  const handlePrevCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setCurrentIndex((currentIndex - 1 + studyCards.length) % studyCards.length); }, [currentIndex, studyCards]);
  const handleRepeat = () => { stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setStudyTime(0); setHasRecorded(false); playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; };

  useEffect(() => {
    let timer = null;
    if (view === 'study' && !isCompleted && !isBulkMode && studyCards.length > 0) timer = setInterval(() => setStudyTime(p => p + 1), 1000); 
    else if (view !== 'study') setStudyTime(0); 
    return () => clearInterval(timer);
  }, [view, isCompleted, isBulkMode, studyCards.length]);

  const formatTime = (sec) => sec ? `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}` : '--:--';
  const formatDate = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastRecordTime: d.lastRecordTime === null || studyTime < d.lastRecordTime ? studyTime : d.lastRecordTime } : d));
      setHasRecorded(true); 
      if (currentUser) {
        const dName = decks.find(d => d.id === currentDeckId)?.name || "単語帳";
        addDoc(collection(db, 'logs'), { uid: currentUser.uid, date: new Date().toISOString().split('T')[0], minutes: Math.max(1, Math.round(studyTime / 60)), categories: ['Vocabulary'], content: `アプリ学習: ${dName}`, reflection: `記録: ${formatTime(studyTime)} で完了！`, quality: 100, timestamp: Date.now() }).catch(e => console.error(e));
      }
    }
  }, [isCompleted, currentDeckId, studyTime, currentUser, decks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || view !== 'study' || isBulkMode) return;
      unlockAudio();
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stopAutoPlayIfActive(); setIsFlipped(p => !p); } 
      else if (e.code === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); handleNextCard(); } 
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevCard(); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isBulkMode, isAutoPlaying, handleNextCard, handlePrevCard, unlockAudio]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let timer = null; 
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      lastTickRef.current = Date.now();
      timer = setInterval(() => {
        const now = Date.now(); elapsedRef.current += now - lastTickRef.current; lastTickRef.current = now;
        if (elapsedRef.current >= (displaySeconds === 0 ? 150 : displaySeconds * 1000)) {
          elapsedRef.current = 0; 
          if (!isFlipped && displaySeconds !== 0 && !isFrontOnlyAuto) setIsFlipped(true); 
          else if (currentIndex < studyCards.length - 1) { setCurrentIndex(currentIndex + 1); setIsFlipped(false); } 
          else setIsAutoPlaying(false);
        }
      }, 50); 
    } else elapsedRef.current = 0;
    return () => clearInterval(timer);
  }, [isAutoPlaying, isFlipped, currentIndex, displaySeconds, studyCards.length, isCompleted, isFrontOnlyAuto]);

  const toggleMemorize = (e, wordOrCard, isMemorized) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.map(c => (typeof wordOrCard === 'object' ? c === wordOrCard : c.word === wordOrCard) ? { ...c, isMemorized } : c) } : d));
  };

  const resetMemorized = () => { setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.map(c => ({ ...c, isMemorized: false })) } : d)); handleRepeat(); };
  const markDeckAsMemorized = (e, deckId) => { e.stopPropagation(); if (window.confirm(t.confirmMemorizeAll)) setDecks(prev => prev.map(d => d.id === deckId ? { ...d, lastStudied: Date.now(), cards: d.cards.map(c => ({ ...c, isMemorized: true })) } : d)); };
  
  const deleteSpecificCard = (e, wordOrCard) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive();
    if (studyCards[currentIndex] === wordOrCard || studyCards[currentIndex]?.word === wordOrCard) setIsFlipped(false);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => c !== wordOrCard && c.word !== wordOrCard) } : d));
  };

  const saveNewCard = () => {
    const word = newCardData.word.trim(); const meaning = newCardData.meaning.trim();
    if (!word || !meaning) return alert(t.alertReq);
    if (allCards.some(c => c.word === word) && !window.confirm(lang === 'ja' ? `「${word}」は既にあります。重複追加しますか？` : `Add duplicate?`)) return;
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...(d.cards || []), { word, meaning, example: newCardData.example.trim(), translation: newCardData.translation.trim(), pos: newCardData.pos, memo: newCardData.memo?.trim() || '', isMemorized: false }] } : d));
    setAddingCard(false); setNewCardData({ word: '', meaning: '', example: '', translation: '', pos: '', memo: '' }); 
  };

  const saveEditedCard = () => {
    if (!editingCard) return;
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      let edited = false;
      return { ...d, cards: (d.cards || []).map(c => {
         if (!edited && (editingCard.originalCard ? c === editingCard.originalCard : c.word === editingCard.originalWord)) {
            edited = true;
            return { ...c, word: editingCard.word, meaning: editingCard.meaning, example: editingCard.example, translation: editingCard.translation, pos: editingCard.pos, memo: editingCard.memo };
         }
         return c;
      })};
    }));
    setEditingCard(null); 
  };

  const toggleDeleteSelection = (word) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const executeBulkDelete = () => {
    if (selectedForDelete.size === 0) return setIsDeleteMode(false);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => !selectedForDelete.has(c.word)) } : d));
    setSelectedForDelete(new Set()); setIsDeleteMode(false); setCurrentIndex(0); setIsFlipped(false);
  };

  const openPrintPreview = (mode) => {
    if (allCards.length === 0) return alert(t.noPrintCards);
    setPrintMode(mode); setPrintCards([...allCards].sort(() => Math.random() - 0.5)); setView('printPreview');
  };

  const shufflePrintCards = () => setPrintCards([...printCards].sort(() => Math.random() - 0.5));

  const openBox = (boxId) => { 
    if (openingBoxId) return; unlockAudio(); setOpeningBoxId(boxId); 
    setTimeout(() => { setCurrentBoxId(boxId); setView('decks'); setOpeningBoxId(null); }, 450);
  };
  
  const openDeck = (id) => { 
    unlockAudio(); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); 
    setIsDeleteMode(false); setSelectedForDelete(new Set()); playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };
  
  const closeDeck = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks'); setIsDeleteMode(false); setSelectedForDelete(new Set());
  }, [currentDeckId]);

  const handleTouchStart = (e) => {
    unlockAudio();
    if (e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || ['boxes', 'printPreview', 'manual'].includes(view)) return;
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; 
  };
  const handleTouchMove = (e) => {
    if (window.scrollY > 10 || !touchStartX.current || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || ['boxes', 'printPreview', 'manual'].includes(view)) return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current;
    if (diffY > 10 && diffY > Math.abs(touchStartX.current - touchEndX.current) && ['study', 'decks'].includes(view)) setPullDownY(diffY);
  };
  const handleTouchEnd = () => {
    if (['boxes', 'printPreview', 'manual'].includes(view)) return;
    if (pullDownY > 120) {
      setIsStoring(true); setPullDownY(window.innerHeight);
      setTimeout(() => { if (view === 'study') closeDeck(); else { setView('boxes'); setCurrentBoxId(null); } setIsStoring(false); setPullDownY(0); }, 400);
    } else {
      setPullDownY(0); const diffX = touchStartX.current - (touchEndX.current || touchStartX.current);
      if (Math.abs(diffX) > 50 && view === 'study') diffX > 0 ? handleNextCard() : handlePrevCard();
    }
  };

  const handleClick = () => unlockAudio(); 
  const dynamicStyle = { transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`, opacity: 1 - pullDownY / 800, transition: isStoring ? 'all 0.4s' : (pullDownY === 0 ? '0.3s' : 'none'), width: '100%', height: '100%' };

  // ============================
  // UIレンダリング用関数・コンポーネント
  // ============================

  const getPosColors = (pos) => {
    switch (pos) {
      case '名詞': return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; // 青
      case '動詞': return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }; // 赤
      case '形容詞': return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }; // 緑
      case '副詞': return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }; // オレンジ
      case '代名詞': return { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' }; // 水色
      case '前置詞': case '接続詞': return { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' }; // 紫
      case '熟語': return { color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' }; // 藍色
      default: return null; 
    }
  };

  const getPosBadgeStyle = (pos) => {
    const c = getPosColors(pos) || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
    return { position: 'absolute', top: '15px', left: '15px', padding: '4px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '900', zIndex: 10, border: `2px solid ${c.border}`, color: c.color, backgroundColor: c.bg };
  };

  const renderMiniCard = (c, isMemorizedList, index = null, uid = null) => {
    const isSelected = selectedForDelete.has(c.word);
    const miniColors = c.pos ? getPosColors(c.pos) : null;
    return (
      <div key={uid} className={`mini-card ${isDeleteMode && isSelected ? 'selected-for-delete' : ''}`} style={{ ...(miniColors ? { borderLeft: `5px solid ${miniColors.color}` } : {}), ...(isDeleteMode && isSelected ? { backgroundColor: '#fff0f0', borderColor: '#ffcccc' } : {}) }}
        onClick={() => {
          if (isDeleteMode) toggleDeleteSelection(c.word);
          else if (!isMemorizedList && index !== null) { stopAutoPlayIfActive(); setIsFlipped(false); setCurrentIndex(index - 1); }
        }}>
        <div className="mini-card-header">
          {isDeleteMode && <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '8px', pointerEvents: 'none'}} />}
          {!isDeleteMode && index !== null && <span className="mini-index" style={{marginRight:'5px', fontWeight:'bold', flexShrink:0}}>{index}.</span>}
          <div className="mini-text-container"><span className="mini-word" style={{ fontWeight: 'bold', color: '#334155' }}>{c.word}</span><span className="mini-meaning" style={{ fontSize: '13px', color: '#64748b' }}>{c.meaning}</span></div>
          {!isDeleteMode && (
            <div className="mini-icons" onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>
              <button className="mini-icon-btn" onClick={(e) => toggleMemorize(e, c, !isMemorizedList)} title={isMemorizedList ? t.markUnmem : t.markMem}>{isMemorizedList ? '↩️' : '✅'}</button>
              <button className="mini-icon-btn" onClick={(e) => { e.stopPropagation(); stopAutoPlayIfActive(); setEditingCard({ originalCard: c, originalWord: c.word, word: c.word, meaning: c.meaning, example: c.example || '', translation: c.translation || '', pos: c.pos || '', memo: c.memo || '' }); }}>✏️</button>
              <button className="mini-icon-btn delete-mini" onClick={(e) => deleteSpecificCard(e, c)}>✖</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDeckCard = (deck) => {
    const status = getEbbinghausStatus(deck);
    return (
      <div key={deck.id} data-id={deck.id} className={`deck-bundle ${status.shake ? 'polite-shake-once' : ''}`} onClick={() => openDeck(deck.id)}>
        <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          <h3 className="deck-name" title={deck.name}>{deck.name}<button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button></h3>
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>
          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini"><span>🗂 {(deck.cards || []).length}{t.cardsCount}</span>{deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}{deck.lastRecordTime !== null && <span>⏱ {t.bestTime} {formatTime(deck.lastRecordTime)}</span>}</div>
          </div>
          {(deck.cards || []).length > 0 && (deck.cards || []).every(c => c.isMemorized) && <div className="memorized-stamp">{t.stampMem}</div>}
        </div><div className="rubber-band"></div>
      </div>
    );
  };

  const renderCardFront = (card, isFullscreen) => {
    if (!card) return null;
    const fWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : ''; const fMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fExEn = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(20px, 4vw, 28px)'; const fExJa = isFullscreen ? 'clamp(24px, 4vw, 48px)' : 'clamp(18px, 4vw, 22px)';
    const isJapanese = qLang === 'ja';
    const posColors = card.pos ? getPosColors(card.pos) : null;
    const markerColor = posColors ? posColors.border : null;

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={getPosBadgeStyle(card.pos)}>{card.pos}</span>}
        {qType === 'word' ? (
          qLang === 'en' ? <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><h1 className="word-text" style={{ textAlign: 'left', margin: 0, fontSize: fWord, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1></div>
                         : <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><div className="core-meaning-large" style={{ textAlign: 'left', margin: 0, fontSize: fMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>{cleanText((card.meaning || '').split('/')[0])}</div></div>
        ) : (
          qLang === 'en' ? <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fExEn, lineHeight: '1.8', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', width: '100%', display: 'inline-block', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '', markerColor)}</p></div>
                         : <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fExJa, lineHeight: '1.8', fontWeight: 'bold', color: '#334155', width: '100%', display: 'inline-block'}}>{cleanTranslation(card.translation)}</p></div>
        )}
      </div>
    );
  };

  const renderCardBack = (card, isFullscreen) => {
    if (!card) return null; 
    const fWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '48px'; const fMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fExEn = isFullscreen ? 'clamp(24px, 4vw, 40px)' : ''; const fExJa = isFullscreen ? 'clamp(20px, 3.5vw, 36px)' : '';
    const fExModeJa = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(18px, 4vw, 24px)'; const fExModeEn = isFullscreen ? 'clamp(32px, 5.5vw, 64px)' : 'clamp(20px, 4vw, 26px)';
    const isJapanese = qLang === 'en'; 
    const posColors = card.pos ? getPosColors(card.pos) : null;
    const markerColor = posColors ? posColors.border : null;

    return (
      <div className="back-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={getPosBadgeStyle(card.pos)}>{card.pos}</span>}
        {qType === 'word' ? (
          <>
            {qLang === 'en' ? <div className="meaning-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: 0, padding: 0, border: 'none' }}><div className="core-meaning-large" style={{ textAlign: 'left', fontSize: fMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>{String(card.meaning || '').split('/').map((m, i) => <div key={i} className="meaning-line" style={{textAlign: 'left'}}>{cleanText(m)}</div>)}</div></div>
                            : <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><h1 className="word-text" style={{textAlign: 'left', fontSize: fWord, margin: 0, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1></div>}
            {showExOnBack && (
              <div className="example-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'inline-block', textAlign: 'left', maxWidth: '100%' }}>
                  <p className="example-en" style={{ marginBottom: '8px', fontSize: fExEn, fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '', markerColor)}</p>
                  <p className="example-ja" style={{ margin: 0, fontSize: fExJa, fontWeight: 'bold', textAlign: 'left' }}>{renderHighlightedText(card.translation || '', markerColor)}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
             <div className="example-section" style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
                {qLang === 'en' ? <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fExModeJa, color: '#1e293b', fontWeight: 'bold', lineHeight: 1.8}}>{renderHighlightedText(card.translation || '', markerColor)}</p></div>
                                : <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fExModeEn, fontWeight: 'bold', color: '#1e293b', lineHeight: 1.5, fontFamily: '"Times New Roman", Times, serif', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '', markerColor)}</p></div>}
             </div>
             {showWordOnExMode && (
               <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', gap:'15px', opacity: 0.7, marginTop: isFullscreen ? '40px' : '25px', width: '100%' }}>
                  <div className="word-text" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(32px, 5vw, 56px)' : '18px', fontWeight:'bold', margin: 0, cursor: 'pointer', color:'#333', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</div>
                  <div className="core-meaning-large" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(24px, 4vw, 40px)' : '15px', color:'#64748b', fontWeight:'bold', margin: 0, display: 'inline-block', maxWidth: '100%'}}>{cleanText((card.meaning || '').split('/')[0])}</div>
               </div>
             )}
          </div>
        )}
        
        {/* メモ表示 */}
        {showMemoOnBack && card.memo && (
          <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: '8px', width: '100%', maxWidth: '800px', fontSize: isFullscreen ? 'clamp(18px, 4vw, 24px)' : '14px', color: '#475569', textAlign: 'left', lineHeight: '1.5', wordBreak: 'break-word' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>💡 メモ:</span> {card.memo}
          </div>
        )}
      </div>
    );
  };

  // ============================
  // メインの描画
  // ============================

  if (isAuthLoading) return <div className="app-container gentle-bg desk-view" style={{justifyContent:'center', height:'100vh'}}><h2 style={{color:'#7f8c8d'}}>{t.loading}</h2></div>;
  if (!currentUser) return (
    <div className="login-screen-bg">
      <div className="login-top-right"><button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button><button className="login-lang-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button></div>
      <div className="login-hero-section">
        <h1 className="login-burning-text">{t.appTitle}</h1><h2 className="login-burning-subtitle">{t.appSubtitle}</h2>
        <button className="login-google-btn" onClick={handleLogin}>{t.loginWithGoogle}</button>
        {isInAppBrowser && <div style={{ marginTop: '20px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '8px', maxWidth: '350px', margin: '20px auto 0', lineHeight: '1.5' }}>⚠️ LINEやInstagramのブラウザではログインエラーになる場合があります。<br/>「Safari/ブラウザで開く」を選択してください。</div>}
      </div>
    </div>
  );

  if (view === 'manual') return <Manual t={t} setView={setView} />;
  if (view === 'printPreview') return <PrintPreview t={t} setView={setView} printCards={printCards} printMode={printMode} activeDeck={activeDeck} shufflePrintCards={shufflePrintCards} handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd} handleClick={unlockAudio} />;
  if (view === 'test') return <div className="app-container gentle-bg desk-view" onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><TestMode t={t} setView={setView} allCards={allCards} /></div>;

  if (view === 'boxes') return (
    <div className="app-container gentle-bg desk-view" style={{padding: 0}} onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="top-right-actions">
        <button className="lang-toggle-btn logout-btn" onClick={handleLogout} style={{backgroundColor: 'rgba(231, 76, 60, 0.8)', borderColor: 'transparent'}}>{t.logout}</button>
        <button className="manual-link-btn" onClick={() => window.open('https://english-t24.com', '_blank')} style={{backgroundColor: '#e67e22', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>🌐 Blog</button>
        <button className="manual-link-btn" onClick={() => window.open('https://app.english-t24.com', '_blank')} style={{backgroundColor: '#3498db', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>📊 Log</button>
        <div style={{width: '2px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 5px'}}></div>
        <button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button>
        <button className="lang-toggle-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button>
      </div>
      <div className="hero-section">
        <h1 className="burning-text">{t.appTitle}</h1><h2 className="burning-subtitle">{t.appSubtitle}</h2>
        <div className="creation-header-row">
          <span className="creation-label" title="Box" style={{color: '#fff'}}>📦</span>
          <input type="text" placeholder={t.boxPlaceholder} value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
          <button onClick={createNewBox} className="add-btn mini-btn">{t.createBtn}</button>
        </div>
      </div>
      <div className="boxes-grid">
        {boxes.map(box => {
          const hasReview = decks.filter(d => d.boxId === box.id).some(d => { 
            const cards = d.cards || [];
            if (cards.length > 0 && cards.every(c => c.isMemorized)) return false; 
            return getEbbinghausStatus(d).needsReview; 
          });
          const isOpening = openingBoxId === box.id;
          return (
            <div key={box.id} className={`storage-box-container ${hasReview ? 'polite-shake-once' : ''}`}>
              <div className="box-top-actions">
                <span className="box-instruction">{hasReview ? <span className="alert-text">{t.review}</span> : t.tapToOpen}</span>
                <button className="box-icon-btn" onClick={(e) => renameBox(e, box.id, box.name)}>✏️</button><button className="box-icon-btn delete-box-btn" onClick={(e) => deleteBox(e, box.id)}>✖</button>
              </div>
              <div className={`storage-box ${isOpening ? 'opening-anim' : ''}`} onClick={() => openBox(box.id)}>
                <div className="box-lid-line"></div><div className="box-label-wrapper"><span className="box-label" title={box.name}>{box.name}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {toastMessage && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(39, 174, 96, 0.95)', color: '#fff', padding: '20px 40px', borderRadius: '16px', fontWeight: 'bold', zIndex: 10001, fontSize: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'popInOut 3s forwards', textAlign: 'center', whiteSpace: 'nowrap' }}>{toastMessage}</div>}
      
      {/* 編集モーダル */}
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>{t.editCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer', userSelect: 'auto' }} value={editingCard.pos || ''} onChange={(e) => setEditingCard({...editingCard, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option><option value="動詞">動詞</option><option value="形容詞">形容詞</option><option value="副詞">副詞</option><option value="代名詞">代名詞</option><option value="前置詞">前置詞</option><option value="接続詞">接続詞</option><option value="熟語">熟語</option><option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={editingCard.example} onChange={(e) => setEditingCard({...editingCard, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={editingCard.translation} onChange={(e) => setEditingCard({...editingCard, translation: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>💡 メモ (語源や注意点など)</label>
            <input className="modal-input" value={editingCard.memo || ''} onChange={(e) => setEditingCard({...editingCard, memo: e.target.value})} />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>{t.cancelBtn}</button><button className="add-btn" onClick={saveEditedCard}>{t.saveBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成モーダル */}
      {addingCard && (
        <div className="modal-overlay" onClick={() => setAddingCard(false)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#27ae60'}}>{t.newCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={newCardData.word} onChange={(e) => setNewCardData({...newCardData, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer', userSelect: 'auto' }} value={newCardData.pos || ''} onChange={(e) => setNewCardData({...newCardData, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option><option value="動詞">動詞</option><option value="形容詞">形容詞</option><option value="副詞">副詞</option><option value="代名詞">代名詞</option><option value="前置詞">前置詞</option><option value="接続詞">接続詞</option><option value="熟語">熟語</option><option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={newCardData.meaning} onChange={(e) => setNewCardData({...newCardData, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={newCardData.example} onChange={(e) => setNewCardData({...newCardData, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={newCardData.translation} onChange={(e) => setNewCardData({...newCardData, translation: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>💡 メモ (語源や注意点など)</label>
            <input className="modal-input" value={newCardData.memo || ''} onChange={(e) => setNewCardData({...newCardData, memo: e.target.value})} />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAddingCard(false)}>{t.cancelBtn}</button>
              <button className="add-btn" style={{backgroundColor: '#27ae60'}} onClick={saveNewCard}>{t.addBtn}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'decks' && (() => {
        const boxDecks = decks.filter(d => d.boxId === currentBoxId);
        const unmemorizedDecks = boxDecks.filter(d => !(d.cards.length > 0 && d.cards.every(c => c.isMemorized)));
        const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.cards.every(c => c.isMemorized));
        return (
          <div style={dynamicStyle}>
            <div className="inner-view-wrapper">
              <div className="study-header">
                <button className="back-to-desk-btn" onClick={() => setView('boxes')}>{t.backToHome}</button>
                <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2><div style={{width: '80px'}}></div>
              </div>
              <div className="integrated-creation-area">
                <div className="creation-row">
                  <span className="creation-label" title="Deck">🔖</span>
                  <input type="text" placeholder={t.deckPlaceholder} value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                  <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">{t.addBtn}</button>
                </div>
              </div>
              <div className="decks-split-layout">
                <div className="decks-unmemorized-area"><h3 className="area-title">{t.unmemTitle}</h3><p className="area-hint">{t.unmemHint}</p>{unmemorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noUnmem}</p> : <div className="decks-grid">{unmemorizedDecks.map(renderDeckCard)}</div>}</div>
                <div className="decks-memorized-area"><h3 className="area-title" style={{color: '#27ae60'}}>{t.memTitle}</h3><p className="area-hint">{t.memHint}</p>{memorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noMem}</p> : <div className="decks-grid memorized-grid">{memorizedDecks.map(renderDeckCard)}</div>}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'study' && (
        <div style={dynamicStyle}>
          <div className="study-dashboard">
            {!isFullscreen && (
              <div className="side-panel left-panel">
                <h3 className="panel-title">{t.learningPanel} ({studyCards.length})</h3>
                <div className="panel-top-action" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!isDeleteMode ? (
                    <><div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}><button onClick={() => setAddingCard(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#27ae60', margin: 0, boxSizing: 'border-box'}}>✏️ 手動で追加</button><button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#e67e22', margin: 0, boxSizing: 'border-box'}}>📂 CSVで追加</button></div><button onClick={() => setIsDeleteMode(true)} className="add-btn bulk-toggle-btn" style={{width: '100%', padding: '8px 0', fontSize: '12px', backgroundColor: '#95a5a6', margin: 0, boxSizing: 'border-box'}}>🗑️ 一括削除</button></>
                  ) : (
                    <div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}><button onClick={() => {setIsDeleteMode(false); setSelectedForDelete(new Set());}} className="cancel-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', margin: 0, boxSizing: 'border-box'}}>{t.cancelBulkDelete}</button><button onClick={executeBulkDelete} className="add-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', backgroundColor: '#e74c3c', margin: 0, boxSizing: 'border-box'}}>{t.executeBulkDelete} ({selectedForDelete.size})</button></div>
                  )}
                </div>
                <div className="mini-card-list">{studyCards.map((c, i) => renderMiniCard(c, false, i + 1, `study-${i}`))}</div>
              </div>
            )}
            <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%' }}>
              {!isFullscreen && (
                <>
                  <div className="study-controls-top" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <button className="back-to-desk-btn" onClick={closeDeck} style={{color: '#7f8c8d', textShadow: 'none', background: 'none'}}>{t.backBtn}</button>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}><button className="mute-toggle-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? t.audioOff : t.audioOn}</button><div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible', background: '#fff', color: '#333', textShadow: 'none' }}>⏱ {formatTime(studyTime)}</div></div>
                  </div>
                  <div className="study-title-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px', width: '100%' }}>
                    {/* ★ タイトルデザインの洗練化 */}
                    <h2 className="study-deck-title" style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: '800', color: '#34495e', letterSpacing: '0.1em', textShadow: '1px 2px 4px rgba(0,0,0,0.1)', fontStyle: 'normal', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif' }}>{activeDeck?.name}</h2>
                    {allCards.length >= 4 && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="test-start-btn" onClick={() => { if(allCards.length < 4) alert(t.testNeeds4); else setView('test'); }}>{t.testBtn}</button>
                        <button className="test-start-btn print-btn" onClick={() => openPrintPreview('word')}>{t.printBtn}</button>
                        <button className="test-start-btn print-btn" onClick={() => openPrintPreview('example')} style={{backgroundColor: '#3498db'}}>{t.printExampleBtn}</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {!isFullscreen && isBulkMode && (
                <div className="bulk-input-section" style={{ marginTop: '0px', width: '100%', maxWidth: '600px' }}>
                  <p className="bulk-hint" style={{fontSize:'16px', color:'#333'}}>{t.csvHint}</p>
                  <div className="bulk-file-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
                    <button onClick={downloadTemplate} style={{ backgroundColor: '#f39c12', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0 }}>📥 テンプレート(CSV)をダウンロードする</button>
                    <label style={{ backgroundColor: '#27ae60', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0, textAlign: 'center' }}>
                      {loading ? t.loading : '📂 CSVファイルをインポートする'}
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                  </div>
                  <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{t.chatGptNote}</p>
                  <div className="bulk-actions" style={{ marginTop: '15px' }}><button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>{t.closeBtn}</button></div>
                </div>
              )}
              
              {allCards.length > 0 && studyCards.length === 0 ? (
                <div className="empty-deck-msg" style={{marginTop: '60px'}}><h2 style={{color: '#27ae60'}}>{t.allMemorizedMsg}</h2><button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>{t.resetBtn}</button></div>
              ) : studyCards.length > 0 && !isBulkMode ? (
                <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                  
                  {/* ★ 操作ボタン群の中央寄せ配置 */}
                  <div className={`card-header-actions ${isFullscreen ? 'fullscreen-stealth-top' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isFullscreen ? 0 : '20px', width: '100%', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '15px' }}>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setQLang(qLang === 'en' ? 'ja' : 'en')} className="setting-badge-btn" title="出題言語の切り替え">{qLang === 'en' ? '🇺🇸 英→日' : '🇯🇵 日→英'}</button>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '50px', padding: '3px', border: '1px solid #e2e8f0' }}>
                          <button onClick={() => setQType('word')} className={`toggle-tab-btn ${qType === 'word' ? 'active' : ''}`}>🔤 単語</button><button onClick={() => setQType('example')} className={`toggle-tab-btn ${qType === 'example' ? 'active' : ''}`}>📝 例文</button>
                        </div>
                      </div>

                      <div className="card-counter" style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#94a3b8', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="number" className="card-counter-input" min="1" max={studyCards.length} key={currentIndex} defaultValue={currentIndex + 1}
                          onBlur={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) { val = Math.max(1, Math.min(val, studyCards.length)); if (val - 1 !== currentIndex) { stopAutoPlayIfActive(); setIsFlipped(false); setCurrentIndex(val - 1); } else e.target.value = currentIndex + 1; } else e.target.value = currentIndex + 1;
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
                          style={{ width: '2.5em', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px dashed #cbd5e1', color: 'inherit', font: 'inherit', outline: 'none', padding: '0 5px', marginRight: '5px' }}
                        /> / {studyCards.length}
                      </div>

                      {/* ★ 設定メニュー */}
                      <div ref={settingsRef} style={{ position: 'relative' }}>
                        <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="setting-badge-btn" style={{ backgroundColor: showSettingsMenu ? '#e2e8f0' : '#fff' }}>⚙️ 表示オプション ▼</button>
                        {showSettingsMenu && (
                          <div style={{ position: 'absolute', top: '100%', right: '50%', transform: 'translateX(50%)', marginTop: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {qType === 'word' ? (
                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>例文を表示</span><input type="checkbox" checked={showExOnBack} onChange={() => setShowExOnBack(!showExOnBack)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                            ) : (
                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>単語を表示</span><input type="checkbox" checked={showWordOnExMode} onChange={() => setShowWordOnExMode(!showWordOnExMode)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>メモを表示</span><input type="checkbox" checked={showMemoOnBack} onChange={() => setShowMemoOnBack(!showMemoOnBack)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }}></div>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>自動めくり: 表面のみ</span><input type="checkbox" checked={isFrontOnlyAuto} onChange={() => setIsFrontOnlyAuto(!isFrontOnlyAuto)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  <div className="card-animation-wrapper" key={currentIndex} style={{ width: '100%' }}>
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="ring-hole"></div><button className="memorize-check-btn" onClick={(e) => { e.stopPropagation(); if (studyCards[currentIndex]) { setIsFlipped(false); toggleMemorize(e, studyCards[currentIndex], true); } }}>✔</button>
                          {renderCardFront(studyCards[currentIndex], isFullscreen)}
                        </div>
                        <div className="card-back">{renderCardBack(studyCards[currentIndex], isFullscreen)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ★ インライン展開で復活させた AutoPlayControls */}
                  <div className={isFullscreen ? "fullscreen-stealth-bottom" : "autoplay-controls"} style={isFullscreen ? {} : {background: '#fff', border: '1px solid #e1e4e8', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box'}}>
                    <div className="autoplay-actions-row">
                      <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                      <button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); if (!isAutoPlaying) { playAudio((qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word); } setIsAutoPlaying(!isAutoPlaying); }}>{isAutoPlaying ? t.autoPlayStop : t.autoPlayStart}</button>
                      <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                      <button className="repeat-btn" onClick={handleRepeat} style={isFullscreen ? {} : {background: '#f8f9fa', color: '#555'}}>{t.repeatBtn}</button>
                      <button className="fullscreen-btn" onClick={toggleFullScreen} style={isFullscreen ? {} : {background: '#f8f9fa', color: '#555'}}>{isFullscreen ? t.fullScreenExit : t.fullScreenEnter}</button>
                    </div>
                    <div className="speed-slider-container" style={isFullscreen ? {} : {marginTop: '15px'}}>
                      <div className={isFullscreen ? "speed-slider-label" : ""} style={isFullscreen ? {} : {fontSize: '13px', color: '#7f8c8d', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                        {t.intervalLabel}: {displaySeconds === 0 ? `${t.godspeed} (0.0 ${t.sec})` : `${displaySeconds.toFixed(1)} ${t.sec}`}
                      </div>
                      <div className="speed-slider-wrapper" style={isFullscreen ? {} : { display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                        <span className="speed-min-max" style={isFullscreen ? {} : { fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'right' }}>{t.fast} {displaySeconds === 0 ? '👼' : '🐇'}</span>
                        <div style={isFullscreen ? {} : { flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          {!isFullscreen && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '12px', color: '#bdc3c7', fontWeight: 'bold', marginBottom: '2px' }}><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>}
                          <input type="range" min="0" max="4.0" step="0.1" value={displaySeconds} onChange={(e) => setDisplaySeconds(Number(e.target.value))} className="speed-slider" style={isFullscreen ? {} : { width: '100%', margin: 0 }} />
                        </div>
                        <span className="speed-min-max" style={isFullscreen ? {} : { fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'left' }}>🐢 {t.slow}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            {!isFullscreen && (
              <div className="side-panel right-panel">
                <h3 className="panel-title">{t.memorizedPanel} ({memorizedCards.length})</h3>
                <div className="mini-card-list">{memorizedCards.length === 0 ? <p className="empty-mini-msg">{t.dragHereMsg}</p> : memorizedCards.map((c, i) => renderMiniCard(c, true, null, `mem-${i}`))}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;