/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import './App.css';
import { DICT } from './locales';
import { initialBoxes, initialDecks } from './initialData';
import { parseCSV, chunkArray, cleanText, cleanTranslation, renderBlankExample, renderHighlightedText } from './utils';

function App() {
  const [lang, setLang] = useState('ja'); 
  const t = DICT[lang];

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  
  const [boxes, setBoxes] = useState(() => { 
    try {
      const savedBoxes = localStorage.getItem('redline_boxes'); 
      const parsed = savedBoxes ? JSON.parse(savedBoxes) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialBoxes;
    } catch(e) { return initialBoxes; }
  });
  
  const [decks, setDecks] = useState(() => { 
    try {
      const savedDecks = localStorage.getItem('redline_decks'); 
      const parsed = savedDecks ? JSON.parse(savedDecks) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialDecks;
    } catch(e) { return initialDecks; }
  });

  useEffect(() => {
    const ua = (navigator.userAgent || navigator.vendor || window.opera).toLowerCase();
    const isWebView = /line|instagram|fban|fbav|twitter|gsa|yahoouisearch|yabrowser/.test(ua) || 
                      (ua.includes('iphone') && !ua.includes('safari')) || 
                      (ua.includes('android') && ua.includes('wv'));
    if (isWebView) {
      setIsInAppBrowser(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) { 
            const fetchedBoxes = docSnap.data().boxes;
            const fetchedDecks = docSnap.data().decks;
            setBoxes(Array.isArray(fetchedBoxes) && fetchedBoxes.length > 0 ? fetchedBoxes : initialBoxes); 
            setDecks(Array.isArray(fetchedDecks) && fetchedDecks.length > 0 ? fetchedDecks : initialDecks); 
          } else { 
            setBoxes(initialBoxes); 
            setDecks(initialDecks); 
            await setDoc(docRef, { boxes: initialBoxes, decks: initialDecks }); 
          }
        } catch (e) {
          console.error("Firestore read/write error. Check Rules.", e);
          setBoxes(prev => Array.isArray(prev) && prev.length > 0 ? prev : initialBoxes);
          setDecks(prev => Array.isArray(prev) && prev.length > 0 ? prev : initialDecks);
        }
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('redline_boxes', JSON.stringify(boxes));
      localStorage.setItem('redline_decks', JSON.stringify(decks));
    } catch (e) { console.warn("localStorage save error", e); }

    if (currentUser && Array.isArray(boxes) && boxes.length > 0) {
      const timer = setTimeout(() => { 
        setDoc(doc(db, "users", currentUser.uid), { boxes, decks }, { merge: true }).catch(e => console.log("Save error", e)); 
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [boxes, decks, currentUser]);

  const handleLogin = () => {
    if (isInAppBrowser) {
      alert("【ログインエラーの回避】\nGoogleアプリやLINEなどの「アプリ内ブラウザ」ではセキュリティ制限によりログインできません。\n画面下部や右上のメニュー（共有ボタンなど）から「Safariで開く」または「ブラウザで開く」を選択して、もう一度お試しください。");
      return;
    }
    
    signInWithPopup(auth, provider).catch((error) => {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Popup Login Error:", error);
        alert("ログインに失敗しました。\n\n【エラー403が出た場合】\nGoogleアプリ等の「アプリ内ブラウザ」が原因です。画面下部や右上の「共有ボタン」等から「Safariで開く」を選択し、Safari上で再度お試しください。\n\n【ポップアップがブロックされた場合】\n「許可」または「常に表示」をタップしてください。");
      }
    });
  };
  
  const handleLogout = () => { signOut(auth).then(() => { setBoxes([]); setDecks([]); }); };

  const touchStartX = useRef(null); 
  const touchStartY = useRef(null); 
  const touchEndX = useRef(null); 
  const touchEndY = useRef(null);
  
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
  const [newCardData, setNewCardData] = useState({ word: '', meaning: '', example: '', translation: '', pos: '' });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [testQuestions, setTestQuestions] = useState([]); 
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [score, setScore] = useState(0); 
  const [showTestResult, setShowTestResult] = useState(false); 
  const [printCards, setPrintCards] = useState([]);
  const [printMode, setPrintMode] = useState('word');
  
  const [openingBoxId, setOpeningBoxId] = useState(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());

  const [qLang, setQLang] = useState('en'); 
  const [qType, setQType] = useState('word'); 
  const [showExOnBack, setShowExOnBack] = useState(true); 
  const [showWordOnExMode, setShowWordOnExMode] = useState(true); 
  const [isFrontOnlyAuto, setIsFrontOnlyAuto] = useState(false); 

  const [testEffect, setTestEffect] = useState(null); 
  const [combo, setCombo] = useState(0);

  const playedRef = useRef({ index: -1, flipped: false, lang: '', type: '' });

  const activeDeck = (Array.isArray(decks) ? decks : []).find(d => d.id === currentDeckId);
  const allCards = activeDeck && Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  useEffect(() => {
    setBoxes(prev => (Array.isArray(prev) ? prev : []).map(b => b.nameKey ? { ...b, name: t[b.nameKey] } : b));
    setDecks(prev => (Array.isArray(prev) ? prev : []).map(d => {
      if (d.nameKey) {
        const newCards = (Array.isArray(d.cards) ? d.cards : []).map(c => {
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

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };
  
  const deleteSpecificCard = (e, wordOrCard) => {
    if (e) e.stopPropagation(); 
    stopAutoPlayIfActive();
    
    const currentCardObj = studyCards[currentIndex];
    if (typeof wordOrCard === 'object' ? currentCardObj === wordOrCard : currentCardObj?.word === wordOrCard) {
       setIsFlipped(false);
    }

    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      let targetFound = false; // 1件だけ削除するため
      return { ...d, cards: (d.cards || []).filter(c => {
        if (!targetFound) {
           if (typeof wordOrCard === 'object' && wordOrCard !== null) {
              if (c === wordOrCard) { targetFound = true; return false; }
           } else {
              if (c.word === wordOrCard) { targetFound = true; return false; }
           }
        }
        return true;
      }) };
    }));
  };

  const toggleDeleteSelection = (word) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const executeBulkDelete = () => {
    if (selectedForDelete.size === 0) { setIsDeleteMode(false); return; }
    setDecks(prev => prev.map(d => {
      if (d.id === currentDeckId) { return { ...d, cards: (d.cards || []).filter(c => !selectedForDelete.has(c.word)) }; }
      return d;
    }));
    setSelectedForDelete(new Set());
    setIsDeleteMode(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  useEffect(() => {
    if (studyCards.length > 0 && currentIndex >= studyCards.length) { setCurrentIndex(studyCards.length - 1); }
  }, [studyCards.length, currentIndex]);

  const toggleFullScreen = () => {
    if (!isFullscreen) {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch(err => console.log(err));
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.log(err));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFull) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const unlockAudio = useCallback(() => {
    if ('speechSynthesis' in window && !isMuted) {
      const dummy = new SpeechSynthesisUtterance(''); dummy.volume = 0; window.speechSynthesis.speak(dummy);
    }
  }, [isMuted]);

  const fallbackTTS = useCallback((text, rate) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text); 
      utterance.lang = 'en-US'; 
      utterance.rate = rate; 
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
      if (enVoice) utterance.voice = enVoice;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playAudio = useCallback((text) => {
    if (isMuted || !text) return; 
    const cleanWord = String(text).replace(/\*\*/g, '').trim(); 
    if (!cleanWord) return;
    
    let rate = 1.0;
    if (displaySeconds < 2.0) { rate = 1.0 + ((2.0 - displaySeconds) / 2.0) * 0.5; } else if (displaySeconds > 2.0) { rate = 1.0 - ((displaySeconds - 2.0) / 2.0) * 0.2; }
    rate = rate > 1.5 ? 1.5 : (rate < 0.5 ? 0.5 : rate);

    try {
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodeURIComponent(cleanWord)}`;
      const audio = new Audio(audioUrl); audio.playbackRate = rate;
      const playPromise = audio.play();
      if (playPromise !== undefined) { playPromise.catch(() => { fallbackTTS(cleanWord, rate); }); }
    } catch (e) { fallbackTTS(cleanWord, rate); }
  }, [displaySeconds, isMuted, fallbackTTS]);

  useEffect(() => {
    if (studyCards.length === 0 || isCompleted || view !== 'study' || isBulkMode) return;
    const currentCard = studyCards[currentIndex];
    if (!currentCard) return;

    let shouldPlay = false;
    if (qLang === 'en' && !isFlipped) shouldPlay = true;
    if (qLang === 'ja' && isFlipped) shouldPlay = true;

    if (shouldPlay) {
      if (playedRef.current.index !== currentIndex || playedRef.current.flipped !== isFlipped || playedRef.current.lang !== qLang || playedRef.current.type !== qType) {
        const textToPlay = (qType === 'example' && currentCard.example) ? currentCard.example : currentCard.word;
        playAudio(textToPlay);
        playedRef.current = { index: currentIndex, flipped: isFlipped, lang: qLang, type: qType };
      }
    }
  }, [currentIndex, isFlipped, qLang, qType, studyCards, isCompleted, view, isBulkMode, playAudio]);

  const handleNextCard = useCallback((e) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false);
    const nextIdx = (currentIndex + 1) % studyCards.length; setCurrentIndex(nextIdx); 
  }, [currentIndex, studyCards]);

  const handlePrevCard = useCallback((e) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false);
    const prevIdx = (currentIndex - 1 + studyCards.length) % studyCards.length; setCurrentIndex(prevIdx); 
  }, [currentIndex, studyCards]);

  const handleRepeat = () => { 
    stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setStudyTime(0); setHasRecorded(false); 
    playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };

  useEffect(() => {
    let studyTimerInterval = null;
    if (view === 'study' && !isCompleted && !isBulkMode && studyCards.length > 0) {
      studyTimerInterval = setInterval(() => setStudyTime(prev => prev + 1), 1000); 
    } else if (view !== 'study') { 
      setStudyTime(0); 
    }
    return () => { if (studyTimerInterval) clearInterval(studyTimerInterval); };
  }, [view, isCompleted, isBulkMode, studyCards.length]);

  const formatTime = (seconds) => seconds ? `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}` : '--:--';
  const formatDate = (timestamp) => { if (!timestamp) return ''; const d = new Date(timestamp); return `${d.getMonth() + 1}/${d.getDate()}`; };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => {
        if (d.id === currentDeckId) { const isFaster = d.lastRecordTime === null || studyTime < d.lastRecordTime; return { ...d, lastRecordTime: isFaster ? studyTime : d.lastRecordTime }; }
        return d;
      }));
      setHasRecorded(true); 

      if (currentUser) {
        const durationMinutes = Math.max(1, Math.round(studyTime / 60)); 
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const deckName = decks.find(d => d.id === currentDeckId)?.name || "単語帳";

        addDoc(collection(db, 'logs'), {
          uid: currentUser.uid,
          date: dateStr,
          minutes: durationMinutes,
          categories: ['Vocabulary'],
          content: `アプリ学習: ${deckName}`,
          reflection: `自動記録: ${formatTime(studyTime)} で暗記完了！`,
          quality: 100,
          timestamp: Date.now()
        }).catch(e => console.error("Auto-sync failed:", e));
      }
    }
  }, [isCompleted, currentDeckId, studyTime, currentUser, decks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (view !== 'study' || isBulkMode) return;
      unlockAudio();
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stopAutoPlayIfActive(); setIsFlipped(prev => !prev); } 
      else if (e.code === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); handleNextCard(); } 
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevCard(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isBulkMode, isAutoPlaying, handleNextCard, handlePrevCard, unlockAudio]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let autoPlayTimer = null; 
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      lastTickRef.current = Date.now();
      autoPlayTimer = setInterval(() => {
        const now = Date.now(); const delta = now - lastTickRef.current; lastTickRef.current = now; elapsedRef.current += delta;
        const currentDelay = displaySeconds === 0 ? 150 : displaySeconds * 1000;
        if (elapsedRef.current >= currentDelay) {
          elapsedRef.current = 0; 
          if (!isFlipped && displaySeconds !== 0 && !isFrontOnlyAuto) { 
            setIsFlipped(true); 
          } else if (currentIndex < studyCards.length - 1) {
            const nextIdx = currentIndex + 1; setCurrentIndex(nextIdx); setIsFlipped(false);
          } else { setIsAutoPlaying(false); }
        }
      }, 50); 
    } else { elapsedRef.current = 0; }
    return () => { if (autoPlayTimer) clearInterval(autoPlayTimer); };
  }, [isAutoPlaying, isFlipped, currentIndex, displaySeconds, studyCards.length, isCompleted, isFrontOnlyAuto]);

  const toggleMemorize = (e, wordOrCard, isMemorized) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      let targetFound = false; 
      return { ...d, cards: (d.cards || []).map(c => {
        if (!targetFound) {
           if (typeof wordOrCard === 'object' && wordOrCard !== null) {
              if (c === wordOrCard) { targetFound = true; return { ...c, isMemorized: isMemorized }; }
           } else {
              if (c.word === wordOrCard && c.isMemorized !== isMemorized) { targetFound = true; return { ...c, isMemorized: isMemorized }; }
           }
        }
        return c;
      }) };
    }));
  };

  const resetMemorized = () => {
    setDecks(prev => prev.map(d => { if (d.id !== currentDeckId) return d; return { ...d, cards: (d.cards || []).map(c => ({ ...c, isMemorized: false })) }; }));
    handleRepeat();
  };

  const markDeckAsMemorized = (e, deckId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmMemorizeAll)) {
      setDecks(prev => prev.map(d => { if (d.id !== deckId) return d; return { ...d, lastStudied: Date.now(), cards: (d.cards || []).map(c => ({ ...c, isMemorized: true })) }; }));
    }
  };

  const saveNewCard = () => {
    const word = newCardData.word.trim();
    const meaning = newCardData.meaning.trim();
    if (!word || !meaning) { alert(t.alertReq); return; }
    
    const isDuplicate = allCards.some(c => c.word === word);
    if (isDuplicate) {
      const msg = lang === 'ja' 
         ? `「${word}」はすでにこの束に登録されています。\n重複して追加してもよろしいですか？`
         : `"${word}" is already in this deck.\nAre you sure you want to add it as a duplicate?`;
      if (!window.confirm(msg)) {
         return; 
      }
    }

    setDecks(prev => prev.map(d => {
      if (d.id === currentDeckId) { return { ...d, cards: [...(d.cards || []), { word: word, meaning: meaning, example: newCardData.example.trim(), translation: newCardData.translation.trim(), pos: newCardData.pos, isMemorized: false }] }; }
      return d;
    }));
    setAddingCard(false); setNewCardData({ word: '', meaning: '', example: '', translation: '', pos: '' }); 
  };

  const saveEditedCard = () => {
    if (!editingCard) return;
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      let edited = false;
      return { ...d, cards: (d.cards || []).map(c => {
         if (!edited && (editingCard.originalCard ? c === editingCard.originalCard : c.word === editingCard.originalWord)) {
            edited = true;
            return { ...c, word: editingCard.word, meaning: editingCard.meaning, example: editingCard.example, translation: editingCard.translation, pos: editingCard.pos };
         }
         return c;
      })};
    }));
    setEditingCard(null); 
  };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    const newBox = { id: Date.now(), name: newBoxName };
    setBoxes([...boxes, newBox]); setNewBoxName('');
  };

  const renameBox = (e, boxId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptBoxRename, currentName);
    if (newName !== null && newName.trim() !== '') { setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, name: newName.trim(), nameKey: null } : b)); }
  };

  const renameDeck = (e, deckId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptDeckRename, currentName);
    if (newName !== null && newName.trim() !== '') { setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName.trim(), nameKey: null } : d)); }
  };

  const getEbbinghausStatus = (deck) => {
    const cards = Array.isArray(deck.cards) ? deck.cards : [];
    if (cards.length > 0 && cards.every(c => c.isMemorized)) { return { label: t.statusPerfect, className: 'status-perfect', needsReview: false }; }
    const lastStudied = deck.lastStudied;
    if (!lastStudied) return { label: t.statusNew, className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: t.statusFresh, className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: t.statusReview, className: 'status-review', needsReview: true, shake: true };
    return { label: t.statusWarning, className: 'status-warning', needsReview: false };
  };

  const downloadTemplate = () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const content = '英単語,日本語訳,英語例文,例文和訳\n"例: apple",りんご,"I have an **apple**.","私は**りんご**を持っています。"\n';
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
      const rows = parsedData.slice(startIndex).filter(row => row.length > 0 && row[0] && String(row[0]).trim() !== '');
      processImportData(rows); 
    };
    reader.readAsText(file); e.target.value = null; 
  };

  const processImportData = (rows) => {
    setLoading(true);
    try {
      const newCards = [];
      const duplicateWords = []; 
      for (const row of rows) {
        const targetWord = row[0] ? String(row[0]).trim() : ''; if (!targetWord) continue;
        
        if (allCards.some(c => c.word === targetWord) || newCards.some(c => c.word === targetWord)) {
           if (!duplicateWords.includes(targetWord)) duplicateWords.push(targetWord);
        }
        
        newCards.push({ word: targetWord, meaning: row[1] ? cleanText(row[1]) : '', example: row[2] ? cleanText(row[2]) : '', translation: row[3] ? cleanText(row[3]) : '', pos: '', isMemorized: false });
      }
      
      if (duplicateWords.length > 0) {
         const sample = duplicateWords.slice(0, 3).join(', ');
         const more = duplicateWords.length > 3 ? (lang === 'ja' ? ' など' : ' etc.') : '';
         const msg = lang === 'ja'
            ? `インポートデータ内に、すでに登録されている単語（${sample}${more}）が ${duplicateWords.length}件 含まれています。\n重複して一括追加してもよろしいですか？`
            : `The import data contains ${duplicateWords.length} duplicate words (e.g., ${sample}${more}).\nAre you sure you want to add them?`;
         if (!window.confirm(msg)) {
            setLoading(false);
            return;
         }
      }

      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...(d.cards || []), ...newCards] } : d));
      
      setToastMessage(`🎉 ${newCards.length}語追加されました！`);
      setTimeout(() => setToastMessage(''), 3000);
      
    } catch(e) { alert(t.alertCsvError); } finally { setIsBulkMode(false); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setLoading(false); }
  };

  const getPraiseWord = (currentCombo) => {
    if (currentCombo <= 1) return "⭕️ Good!";
    if (currentCombo === 2) return "⭕️ Great!!";
    if (currentCombo === 3) return "⭕️ Excellent!!!";
    if (currentCombo >= 4) return "⭕️ Unstoppable!!!!🔥";
    return "⭕️ Good!";
  };

  const handleAnswer = (selectedOption) => {
    const isCorrect = selectedOption === testQuestions[currentTestIndex].correct;
    if (isCorrect) {
      setScore(prev => prev + 1);
      setCombo(prev => prev + 1);
      setTestEffect('correct');
    } else {
      setCombo(0);
      setTestEffect('wrong');
    }
    
    const delay = isCorrect ? 800 : 1200;
    setTimeout(() => {
      setTestEffect(null);
      if (currentTestIndex < testQuestions.length - 1) { 
        setCurrentTestIndex(prev => prev + 1); 
      } else { 
        setShowTestResult(true); 
      }
    }, delay);
  };

  const startTest = () => {
    if (allCards.length < 4) { alert(t.testNeeds4); return; }
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
    const questions = shuffledCards.map(card => {
      const wrongAnswers = allCards.filter(c => c.word !== card.word).sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.meaning || '意味なし');
      const options = [card.meaning || '意味なし', ...wrongAnswers].sort(() => Math.random() - 0.5);
      return { word: card.word, correct: card.meaning || '意味なし', options: options };
    });
    setTestQuestions(questions); setCurrentTestIndex(0); setScore(0); setShowTestResult(false); setTestEffect(null); setCombo(0); setView('test');
  };

  const openPrintPreview = (mode) => {
    if (allCards.length === 0) { alert(t.noPrintCards); return; }
    setPrintMode(mode);
    setPrintCards([...allCards].sort(() => Math.random() - 0.5)); 
    setView('printPreview');
  };

  const shufflePrintCards = () => { setPrintCards([...printCards].sort(() => Math.random() - 0.5)); };

  const createNewDeckInsideBox = () => {
    if (!newDeckNameInside.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckNameInside, lastStudied: null, lastRecordTime: null, cards: [] }]);
    newDeckNameInside('');
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteBox)) { setBoxes(boxes.filter(b => b.id !== boxId)); setDecks(decks.filter(d => d.boxId !== boxId)); }
  };

  const openBox = (boxId) => { 
    if (openingBoxId) return; unlockAudio(); setOpeningBoxId(boxId); 
    setTimeout(() => { setCurrentBoxId(boxId); setView('decks'); setOpeningBoxId(null); }, 450);
  };
  
  const openDeck = (id) => { 
    unlockAudio();
    setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); 
    setIsDeleteMode(false); setSelectedForDelete(new Set());
    playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };
  
  const closeDeck = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks');
    setIsDeleteMode(false); setSelectedForDelete(new Set());
  }, [currentDeckId]);

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm(t.confirmDeleteDeck)) setDecks(decks.filter(d => d.id !== id)); };

  const handleTouchStart = (e) => {
    unlockAudio();
    if (e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; touchEndX.current = null; touchEndY.current = null; 
  };
  
  const handleTouchMove = (e) => {
    if (window.scrollY > 10) return;
    if (!touchStartX.current || !touchStartY.current || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current; const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  
  const handleTouchEnd = () => {
    if (view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    if (pullDownY > 120) {
      setIsStoring(true); setPullDownY(window.innerHeight);
      setTimeout(() => { if (view === 'study') closeDeck(); else if (view === 'decks') setView('boxes'); setIsStoring(false); setPullDownY(0); }, 400);
    } else {
      setPullDownY(0); const diffX = touchStartX.current - (touchEndX.current || touchStartX.current);
      if (Math.abs(diffX) > 50 && view === 'study') { if (diffX > 0) handleNextCard(); else handlePrevCard(); }
    }
  };

  const handleClick = () => { unlockAudio(); };
  const dynamicStyle = { transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`, opacity: 1 - pullDownY / 800, transition: isStoring ? 'all 0.4s' : (pullDownY === 0 ? '0.3s' : 'none'), width: '100%', height: '100%' };

  const renderMiniCard = (c, isMemorizedList, index = null, uid = null) => {
    const isSelected = selectedForDelete.has(c.word);
    return (
      <div key={uid} 
        className={`mini-card ${isDeleteMode && isSelected ? 'selected-for-delete' : ''}`} 
        style={{ ...(isDeleteMode && isSelected ? { backgroundColor: '#fff0f0', borderColor: '#ffcccc' } : {}) }}
        onClick={() => {
          if (isDeleteMode) {
            toggleDeleteSelection(c.word);
          } else if (!isMemorizedList && index !== null) {
            stopAutoPlayIfActive();
            setIsFlipped(false);
            setCurrentIndex(index - 1);
          }
        }}
      >
        <div className="mini-card-header">
          {isDeleteMode && (
            <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '8px', pointerEvents: 'none'}} />
          )}
          {!isDeleteMode && index !== null && <span className="mini-index" style={{marginRight:'5px', fontWeight:'bold', flexShrink:0}}>{index}.</span>}
          
          <div className="mini-text-container">
             <span className="mini-word" style={{ fontWeight: 'bold', color: '#334155' }}>{c.word}</span>
             <span className="mini-meaning" style={{ fontSize: '13px', color: '#64748b' }}>{c.meaning}</span>
          </div>

          {!isDeleteMode && (
            <div className="mini-icons" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <button className="mini-icon-btn" onClick={(e) => {
                  e.stopPropagation();
                  if (studyCards[currentIndex] === c) {
                      setIsFlipped(false);
                  }
                  toggleMemorize(e, c, !isMemorizedList); 
              }} title={isMemorizedList ? t.markUnmem : t.markMem}>{isMemorizedList ? '↩️' : '✅'}</button>
              
              <button className="mini-icon-btn" onClick={(e) => { 
                  e.stopPropagation(); stopAutoPlayIfActive(); 
                  setEditingCard({ originalCard: c, originalWord: c.word, word: c.word, meaning: c.meaning, example: c.example || '', translation: c.translation || '', pos: c.pos || '' }); 
              }}>✏️</button>
              
              <button className="mini-icon-btn delete-mini" onClick={(e) => deleteSpecificCard(e, c)}>✖</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDeckCard = (deck) => {
    const status = getEbbinghausStatus(deck); const isAllMemorized = (deck.cards || []).length > 0 && (deck.cards || []).every(c => c.isMemorized);
    return (
      <div key={deck.id} data-id={deck.id} className={`deck-bundle ${status.shake ? 'polite-shake-once' : ''}`} 
        onClick={() => openDeck(deck.id)}>
        <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          <h3 className="deck-name" title={deck.name}>{deck.name}<button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button></h3>
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>
          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini"><span>🗂 {(deck.cards || []).length}{t.cardsCount}</span>{deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}{deck.lastRecordTime !== null && <span>⏱ {t.bestTime} {formatTime(deck.lastRecordTime)}</span>}</div>
          </div>
          {isAllMemorized && <div className="memorized-stamp">{t.stampMem}</div>}
        </div>
        <div className="rubber-band"></div>
      </div>
    );
  };

  const posBadgeStyle = {
    position: 'absolute',
    top: '15px',
    left: '15px', 
    padding: '4px 12px',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '900',
    color: '#64748b',
    backgroundColor: '#ffffff',
    zIndex: 10
  };

  const renderCardFront = (card, isFullscreen) => {
    if (!card) return null;
    const fontSizeWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '';
    const fontSizeMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fontSizeExEn = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(20px, 4vw, 28px)';
    const fontSizeExJa = isFullscreen ? 'clamp(24px, 4vw, 48px)' : 'clamp(18px, 4vw, 22px)';

    const isJapanese = qLang === 'ja';

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={posBadgeStyle}>{card.pos}</span>}
        
        {qType === 'word' ? (
          qLang === 'en' ? (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <h1 className="word-text" style={{ textAlign: 'left', margin: 0, fontSize: fontSizeWord, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="core-meaning-large" style={{ textAlign: 'left', margin: 0, fontSize: fontSizeMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>{cleanText((card.meaning || '').split('/')[0])}</div>
            </div>
          )
        ) : (
          qLang === 'en' ? (
            <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
              <p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fontSizeExEn, lineHeight: '1.8', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', width: '100%', display: 'inline-block', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>
                {renderHighlightedText(card.example || '')}
              </p>
            </div>
          ) : (
            <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
              <p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fontSizeExJa, lineHeight: '1.8', fontWeight: 'bold', color: '#334155', width: '100%', display: 'inline-block'}}>
                {cleanTranslation(card.translation)}
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  const renderCardBack = (card, isFullscreen) => {
    if (!card) return null; 
    const fontSizeWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '48px';
    const fontSizeMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fontSizeExEn = isFullscreen ? 'clamp(24px, 4vw, 40px)' : '';
    const fontSizeExJa = isFullscreen ? 'clamp(20px, 3.5vw, 36px)' : '';

    const exModeExJaFontSize = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(18px, 4vw, 24px)';
    const exModeExEnFontSize = isFullscreen ? 'clamp(32px, 5.5vw, 64px)' : 'clamp(20px, 4vw, 26px)';

    const isJapanese = qLang === 'en'; 

    return (
      <div className="back-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={posBadgeStyle}>{card.pos}</span>}
        
        {qType === 'word' ? (
          <>
            {qLang === 'en' ? (
              <div className="meaning-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: 0, padding: 0, border: 'none' }}>
                <div className="core-meaning-large" style={{ textAlign: 'left', fontSize: fontSizeMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>
                  {String(card.meaning || '').split('/').map((m, i) => <div key={i} className="meaning-line" style={{textAlign: 'left'}}>{cleanText(m)}</div>)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <h1 className="word-text" style={{textAlign: 'left', fontSize: fontSizeWord, margin: 0, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1>
              </div>
            )}

            {showExOnBack && (
              <div className="example-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'inline-block', textAlign: 'left', maxWidth: '100%' }}>
                  <p className="example-en" style={{ marginBottom: '8px', fontSize: fontSizeExEn, fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '')}</p>
                  <p className="example-ja" style={{ margin: 0, fontSize: fontSizeExJa, fontWeight: 'bold', textAlign: 'left' }}>{renderHighlightedText(card.translation || '')}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
             <div className="example-section" style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
                {qLang === 'en' ? (
                  <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
                    <p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: exModeExJaFontSize, color: '#1e293b', fontWeight: 'bold', lineHeight: 1.8}}>
                      {renderHighlightedText(card.translation || '')}
                    </p>
                  </div>
                ) : (
                  <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
                    <p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: exModeExEnFontSize, fontWeight: 'bold', color: '#1e293b', lineHeight: 1.5, fontFamily: '"Times New Roman", Times, serif', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>
                      {renderHighlightedText(card.example || '')}
                    </p>
                  </div>
                )}
             </div>

             {showWordOnExMode && (
               <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', gap:'15px', opacity: 0.7, marginTop: isFullscreen ? '40px' : '25px', width: '100%' }}>
                  <div className="word-text" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(32px, 5vw, 56px)' : '18px', fontWeight:'bold', margin: 0, cursor: 'pointer', color:'#333', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</div>
                  <div className="core-meaning-large" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(24px, 4vw, 40px)' : '15px', color:'#64748b', fontWeight:'bold', margin: 0, display: 'inline-block', maxWidth: '100%'}}>
                    {cleanText((card.meaning || '').split('/')[0])}
                  </div>
               </div>
             )}
          </div>
        )}
      </div>
    );
  };

  if (isAuthLoading) return <div className="app-container gentle-bg desk-view" style={{justifyContent:'center', height:'100vh'}}><h2 style={{color:'#7f8c8d'}}>{t.loading}</h2></div>;

  if (!currentUser) {
    return (
      <div className="login-screen-bg">
        <div className="login-top-right">
          <button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button>
          <button className="login-lang-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button>
        </div>
        <div className="login-hero-section">
          <h1 className="login-burning-text">{t.appTitle}</h1>
          <h2 className="login-burning-subtitle">{t.appSubtitle}</h2>
          
          <button className="login-google-btn" onClick={handleLogin}>{t.loginWithGoogle}</button>

          {isInAppBrowser && (
            <div style={{ marginTop: '20px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '8px', maxWidth: '350px', margin: '20px auto 0', lineHeight: '1.5' }}>
              ⚠️ LINEやInstagramのブラウザではログインエラーになる場合があります。<br/>右上のメニュー等から「<strong>Safari/ブラウザで開く</strong>」を選択してください.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'manual') {
    return (
      <div className="app-container gentle-bg desk-view">
        <div className="manual-container">
          <div className="study-controls-top no-print" style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '20px', position: 'sticky', top: '10px', zIndex: 100 }}>
             <button className="back-to-desk-btn" onClick={() => setView('boxes')} style={{background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '8px'}}>{t.backToHome}</button>
             <button className="add-btn" onClick={() => window.print()} style={{marginLeft: '15px', backgroundColor: '#e74c3c'}}>{t.printPdfBtn}</button>
          </div>
          <div className="manual-content print-area">
              <h1 className="manual-title">{t.appTitle}<br/>{t.m_h1}</h1>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s1}</h2><p className="manual-p">{t.m_p1}</p><ul className="manual-list"><li>{t.m_l1_1}</li><li>{t.m_l1_2}</li><li>{t.m_l1_3}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s2}</h2><p className="manual-p">{t.m_p2}</p><h3 className="manual-h3">{t.m_s2_1}</h3><p className="manual-p">{t.m_p2_1}</p><h3 className="manual-h3">{t.m_s2_2}</h3><p className="manual-p">{t.m_p2_2}</p><p className="manual-p" style={{background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#555'}}>{t.m_p2_3}</p></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s3}</h2><p className="manual-p">{t.m_p3}</p><ul className="manual-list"><li>{t.m_l3_1}</li><li>{t.m_l3_2}</li><li>{t.m_l3_3}</li><li>{t.m_l3_4}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s4}</h2><p className="manual-p">{t.m_p4}</p><ul className="manual-list"><li>{t.m_l4_1}</li><li>{t.m_l4_2}</li><li>{t.m_l4_3}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s5}</h2><p className="manual-p">{t.m_p5}</p><p className="manual-p">{t.m_p5_1}</p></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s6}</h2><ul className="manual-list"><li>{t.m_l6_1}</li><li>{t.m_l6_2}</li><li>{t.m_l6_3}</li></ul></div>
              <div style={{marginTop: '50px', textAlign: 'center', color: '#95a5a6', fontSize: '12px'}}>{t.appTitle}</div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view" style={{padding: 0}} onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        
        <div className="top-right-actions">
          <button className="lang-toggle-btn logout-btn" onClick={handleLogout} style={{backgroundColor: 'rgba(231, 76, 60, 0.8)', borderColor: 'transparent'}}>{t.logout}</button>
          <button className="manual-link-btn" onClick={() => window.open('https://english-t24.com', '_blank')} style={{backgroundColor: '#e67e22', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>🌐 Blog</button>
          <button className="manual-link-btn" onClick={() => window.open('https://app.english-t24.com', '_blank')} style={{backgroundColor: '#3498db', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>📊 Log</button>
          <div style={{width: '2px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 5px'}}></div>
          <button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button>
          <button className="lang-toggle-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button>
        </div>
        
        <div className="hero-section">
          <h1 className="burning-text">{t.appTitle}</h1>
          <h2 className="burning-subtitle">{t.appSubtitle}</h2>
          <div className="creation-header-row">
            <span className="creation-label" title="Box" style={{color: '#fff'}}>📦</span>
            <input type="text" placeholder={t.boxPlaceholder} value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
            <button onClick={createNewBox} className="add-btn mini-btn">{t.createBtn}</button>
          </div>
        </div>
        <div className="boxes-grid">
          {(Array.isArray(boxes) ? boxes : []).map(box => {
            const hasReview = (Array.isArray(decks) ? decks : []).filter(d => d.boxId === box.id).some(d => { 
              const cards = Array.isArray(d.cards) ? d.cards : [];
              if (cards.length > 0 && cards.every(c => c.isMemorized)) return false; 
              return getEbbinghausStatus(d).needsReview; 
            });
            const isOpening = openingBoxId === box.id;
            return (
              <div key={box.id} className={`storage-box-container ${hasReview ? 'polite-shake-once' : ''}`}>
                <div className="box-top-actions">
                  <span className="box-instruction">{hasReview ? <span className="alert-text">{t.review}</span> : t.tapToOpen}</span>
                  <button className="box-icon-btn" onClick={(e) => renameBox(e, box.id, box.name)}>✏️</button>
                  <button className="box-icon-btn delete-box-btn" onClick={(e) => deleteBox(e, box.id)}>✖</button>
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
  }

  if (view === 'test') {
    return (
      <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="test-container" style={{ position: 'relative' }}>
          
          {testEffect === 'correct' && (
            <div className="test-effect-overlay effect-correct-super">
              <div className="effect-text-main">{getPraiseWord(combo)}</div>
              {combo > 1 && <div className="effect-text-sub">{combo}連続正解！</div>}
            </div>
          )}
          {testEffect === 'wrong' && (
            <div className="test-effect-overlay effect-wrong-super">
              <div className="effect-text-main">❌ Miss...</div>
            </div>
          )}

          {showTestResult ? (
            <div className="test-result">
              <h2 style={{fontSize: '32px', color: '#27ae60'}}>{t.testFinished}</h2>
              <p style={{fontSize: '24px', fontWeight: 'bold'}}>{t.score} {score} / {testQuestions.length}</p>
              <div className="test-actions">
                <button className="add-btn" onClick={() => startTest()}>{t.tryAgainBtn}</button>
                <button className="cancel-btn" onClick={() => setView('study')}>{t.backToStudyBtn}</button>
              </div>
            </div>
          ) : (
            <div className="test-quiz-area">
              <p className="test-counter">{t.question} {currentTestIndex + 1} / {testQuestions.length}</p>
              <h1 className="test-word">{testQuestions[currentTestIndex]?.word}</h1><p className="test-hint">{t.testHint}</p>
              <div className="test-options">
                {testQuestions[currentTestIndex]?.options.map((option, idx) => {
                  let btnClass = "test-option-btn";
                  if (testEffect === 'wrong') {
                     if (option === testQuestions[currentTestIndex].correct) {
                        btnClass += " test-btn-show-correct"; 
                     } else {
                        btnClass += " test-btn-dimmed"; 
                     }
                  } else if (testEffect === 'correct') {
                     if (option === testQuestions[currentTestIndex].correct) {
                        btnClass += " test-btn-show-correct"; 
                     } else {
                        btnClass += " test-btn-dimmed"; 
                     }
                  }
                  return (
                    <button 
                      key={idx} 
                      className={btnClass} 
                      onClick={() => handleAnswer(option)}
                      disabled={!!testEffect}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <button className="cancel-btn" style={{marginTop: '30px'}} onClick={() => setView('study')}>{t.quitBtn}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'printPreview') {
    const chunkSize = printMode === 'example' ? 10 : 25;
    const chunks = chunkArray(printCards, chunkSize);
    const title = printMode === 'example' ? t.printTestExampleTitle : t.printTestTitle;
    const todayStr = new Date().toLocaleDateString();

    return (
      <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div 
          className="print-controls no-print" 
          style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '20px', 
            justifyContent: 'center', 
            width: '100%', 
            padding: '20px', 
            background: '#fff', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)', 
            position: 'sticky', 
            top: 0, 
            zIndex: 100 
          }}
        >
          <button className="cancel-btn" onClick={() => setView('study')} style={{ margin: 0 }}>{t.backToStudyBtn}</button>
          <button className="add-btn" onClick={shufflePrintCards} style={{ backgroundColor: '#8e44ad', margin: 0 }}>{t.shuffleBtn}</button>
          <button className="add-btn" onClick={() => window.print()} style={{ backgroundColor: '#e74c3c', margin: 0 }}>{t.printPdfBtn}</button>
        </div>

        <div className="print-area-wrapper">
          
          {/* ---------- 問題用紙 ---------- */}
          {chunks.map((chunk, pageIndex) => {
            return (
              <div key={`question-page-${pageIndex}`} className="print-page">
                {pageIndex === 0 && (
                  <div className="print-header-compact">
                    <div className="print-date-compact">{t.printDate} {todayStr}</div>
                    <h1 className="print-title-compact" title={`${activeDeck?.name} ${title}`}>{activeDeck?.name} {title}</h1>
                    <div className="print-name-compact">{t.printName}</div>
                    <div className="print-score-compact">
                      {t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span>
                    </div>
                  </div>
                )}
                
                {printMode === 'example' ? (
                  <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                    {chunk.map((c, i) => {
                      const globalIndex = pageIndex * chunkSize + i + 1;
                      return (
                        <div key={`ex-${i}`} className="print-q-item-example">
                          <div className="print-q-top">
                            <span className="print-q-num">({globalIndex})</span>
                            <span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span>
                          </div>
                          <div className="print-q-bottom">
                            <div className="print-q-example-en">{renderBlankExample(c.example)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="print-columns-container" style={{ marginTop: pageIndex > 0 ? '10px' : '0' }}>
                    <div className="print-column">
                      {chunk.slice(0, Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + i + 1;
                        return (
                          <div key={`left-${i}`} className="print-q-item">
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div className="print-q-bottom"><div className="print-q-ans"></div></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="print-column">
                      {chunk.slice(Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + Math.ceil(chunk.length / 2) + i + 1;
                        return (
                          <div key={`right-${i}`} className="print-q-item">
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div className="print-q-bottom"><div className="print-q-ans"></div></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ---------- 解答用紙 ---------- */}
          {chunks.map((chunk, pageIndex) => {
            return (
              <div key={`answer-page-${pageIndex}`} className="print-page">
                {pageIndex === 0 && (
                  <div className="print-header-compact">
                    <div className="print-date-compact">{t.printDate} {todayStr}</div>
                    <h1 className="print-title-compact" title={`${activeDeck?.name} ${title} ${lang === 'ja' ? '【解答】' : '[Answers]'}`}>
                      {activeDeck?.name} {title} <span style={{color: '#e74c3c', fontSize: '18px', marginLeft: '10px'}}>{lang === 'ja' ? '【解答】' : '[Answers]'}</span>
                    </h1>
                    <div className="print-name-compact">{t.printName}</div>
                    <div className="print-score-compact">
                      {t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span>
                    </div>
                  </div>
                )}
                
                {printMode === 'example' ? (
                  <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                    {chunk.map((c, i) => {
                      const globalIndex = pageIndex * chunkSize + i + 1;
                      return (
                        <div key={`ans-ex-${i}`} className="print-q-item-example">
                          <div className="print-q-top">
                            <span className="print-q-num">({globalIndex})</span>
                            <span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span>
                          </div>
                          <div className="print-q-bottom">
                            <div className="print-q-example-en" style={{fontWeight: 'bold', color: '#2c3e50'}}>{renderHighlightedText(c.example)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="print-columns-container" style={{ marginTop: pageIndex > 0 ? '10px' : '0' }}>
                    <div className="print-column">
                      {chunk.slice(0, Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + i + 1;
                        return (
                          <div key={`ans-left-${i}`} className="print-q-item">
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div 
                              className="print-q-bottom" 
                              style={{ 
                                borderBottom: '1px solid #000', 
                                height: '24px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                paddingBottom: '2px', 
                                paddingLeft: '5px', 
                                fontSize: '15px', 
                                fontWeight: 'bold', 
                                color: '#e74c3c' 
                              }}
                            >
                              {c.word}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="print-column">
                      {chunk.slice(Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + Math.ceil(chunk.length / 2) + i + 1;
                        return (
                          <div key={`ans-right-${i}`} className="print-q-item">
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div 
                              className="print-q-bottom" 
                              style={{ 
                                borderBottom: '1px solid #000', 
                                height: '24px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                paddingBottom: '2px', 
                                paddingLeft: '5px', 
                                fontSize: '15px', 
                                fontWeight: 'bold', 
                                color: '#e74c3c' 
                              }}
                            >
                              {c.word}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(39, 174, 96, 0.95)', color: '#fff', padding: '20px 40px',
          borderRadius: '16px', fontWeight: 'bold', zIndex: 10001, fontSize: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'popInOut 3s forwards',
          textAlign: 'center', whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}
      
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>{t.editCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'auto', marginBottom: '15px' }} value={editingCard.pos || ''} onChange={(e) => setEditingCard({...editingCard, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option>
              <option value="動詞">動詞</option>
              <option value="形容詞">形容詞</option>
              <option value="副詞">副詞</option>
              <option value="代名詞">代名詞</option>
              <option value="前置詞">前置詞</option>
              <option value="接続詞">接続詞</option>
              <option value="熟語">熟語</option>
              <option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={editingCard.example} onChange={(e) => setEditingCard({...editingCard, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={editingCard.translation} onChange={(e) => setEditingCard({...editingCard, translation: e.target.value})} rows="2" />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>{t.cancelBtn}</button>
              <button className="add-btn" onClick={saveEditedCard}>{t.saveBtn}</button>
            </div>
          </div>
        </div>
      )}

      {addingCard && (
        <div className="modal-overlay" onClick={() => setAddingCard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#27ae60'}}>{t.newCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={newCardData.word} onChange={(e) => setNewCardData({...newCardData, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'auto', marginBottom: '15px' }} value={newCardData.pos || ''} onChange={(e) => setNewCardData({...newCardData, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option>
              <option value="動詞">動詞</option>
              <option value="形容詞">形容詞</option>
              <option value="副詞">副詞</option>
              <option value="代名詞">代名詞</option>
              <option value="前置詞">前置詞</option>
              <option value="接続詞">接続詞</option>
              <option value="熟語">熟語</option>
              <option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={newCardData.meaning} onChange={(e) => setNewCardData({...newCardData, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={newCardData.example} onChange={(e) => setNewCardData({...newCardData, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={newCardData.translation} onChange={(e) => setNewCardData({...newCardData, translation: e.target.value})} rows="2" />
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
                <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
                <div style={{width: '80px'}}></div>
              </div>
              <div className="integrated-creation-area">
                <div className="creation-row">
                  <span className="creation-label" title="Deck">🔖</span>
                  <input type="text" placeholder={t.deckPlaceholder} value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                  <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">{t.addBtn}</button>
                </div>
              </div>
              <div className="decks-split-layout">
                <div className="decks-unmemorized-area">
                  <h3 className="area-title">{t.unmemTitle}</h3><p className="area-hint">{t.unmemHint}</p>
                  {unmemorizedDecks.length === 0 ? (<p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noUnmem}</p>) : (<div className="decks-grid">{unmemorizedDecks.map(d => renderDeckCard(d))}</div>)}
                </div>
                <div className="decks-memorized-area">
                  <h3 className="area-title" style={{color: '#27ae60'}}>{t.memTitle}</h3><p className="area-hint">{t.memHint}</p>
                  {memorizedDecks.length === 0 ? (<p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noMem}</p>) : (<div className="decks-grid memorized-grid">{memorizedDecks.map(d => renderDeckCard(d))}</div>)}
                </div>
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
                    <>
                      <div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}>
                        <button onClick={() => setAddingCard(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#27ae60', margin: 0, boxSizing: 'border-box'}}>✏️ 手動で追加</button>
                        <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#e67e22', margin: 0, boxSizing: 'border-box'}}>📂 CSVで追加</button>
                      </div>
                      <button onClick={() => setIsDeleteMode(true)} className="add-btn bulk-toggle-btn" style={{width: '100%', padding: '8px 0', fontSize: '12px', backgroundColor: '#95a5a6', margin: 0, boxSizing: 'border-box'}}>🗑️ 一括削除</button>
                    </>
                  ) : (
                    <div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}>
                      <button onClick={() => {setIsDeleteMode(false); setSelectedForDelete(new Set());}} className="cancel-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', margin: 0, boxSizing: 'border-box'}}>{t.cancelBulkDelete}</button>
                      <button onClick={executeBulkDelete} className="add-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', backgroundColor: '#e74c3c', margin: 0, boxSizing: 'border-box'}}>{t.executeBulkDelete} ({selectedForDelete.size})</button>
                    </div>
                  )}
                </div>

                <div className="mini-card-list">
                  {studyCards.map((c, i) => renderMiniCard(c, false, i + 1, `study-${i}`))}
                </div>
              </div>
            )}
            
            <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%' }}>
              {!isFullscreen && (
                <>
                  <div className="study-controls-top" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <button className="back-to-desk-btn" onClick={closeDeck} style={{color: '#7f8c8d', textShadow: 'none', background: 'none'}}>{t.backBtn}</button>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <button className="mute-toggle-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? t.audioOff : t.audioOn}</button>
                      <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible', background: '#fff', color: '#333', textShadow: 'none' }}>⏱ {formatTime(studyTime)}</div>
                    </div>
                  </div>
                  <div className="study-title-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px', width: '100%' }}>
                    <h2 className="study-deck-title" style={{ margin: 0 }}>{activeDeck?.name}</h2>
                    {allCards.length >= 4 && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="test-start-btn" onClick={startTest}>{t.testBtn}</button>
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
                    <button 
                      onClick={downloadTemplate} 
                      style={{ backgroundColor: '#f39c12', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0 }}
                    >
                      📥 テンプレート(CSV)をダウンロードする
                    </button>
                    
                    <label 
                      style={{ backgroundColor: '#27ae60', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0, textAlign: 'center' }}
                    >
                      {loading ? t.loading : '📂 CSVファイルをインポートする'}
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                  </div>

                  <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{t.chatGptNote}</p>
                  <div className="bulk-actions" style={{ marginTop: '15px' }}>
                    <button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>{t.closeBtn}</button>
                  </div>
                </div>
              )}
              
              {allCards.length > 0 && studyCards.length === 0 ? (
                <div className="empty-deck-msg" style={{marginTop: '60px'}}>
                  <h2 style={{color: '#27ae60'}}>{t.allMemorizedMsg}</h2>
                  <button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>{t.resetBtn}</button>
                </div>
              ) : studyCards.length > 0 && !isBulkMode ? (
                <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                  
                  <div className={`card-header-actions ${isFullscreen ? 'fullscreen-stealth-top' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isFullscreen ? 0 : '20px', width: '100%', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '15px', width: '100%' }}>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setQLang(qLang === 'en' ? 'ja' : 'en')} className="setting-badge-btn" title="出題言語の切り替え">
                          {qLang === 'en' ? '🇺🇸 英→日' : '🇯🇵 日→英'}
                        </button>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '50px', padding: '3px', border: '1px solid #e2e8f0' }}>
                          <button onClick={() => setQType('word')} className={`toggle-tab-btn ${qType === 'word' ? 'active' : ''}`}>🔤 単語</button>
                          <button onClick={() => setQType('example')} className={`toggle-tab-btn ${qType === 'example' ? 'active' : ''}`}>📝 例文</button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {qType === 'word' ? (
                          <button onClick={() => setShowExOnBack(!showExOnBack)} className={`setting-badge-btn ${showExOnBack ? 'active' : ''}`} title="裏面の例文表示">
                            例文 {showExOnBack ? 'ON' : 'OFF'}
                          </button>
                        ) : (
                          <button onClick={() => setShowWordOnExMode(!showWordOnExMode)} className={`setting-badge-btn ${showWordOnExMode ? 'active' : ''}`} title="裏面の単語表示">
                            単語 {showWordOnExMode ? 'ON' : 'OFF'}
                          </button>
                        )}
                        <button onClick={() => setIsFrontOnlyAuto(!isFrontOnlyAuto)} className={`setting-badge-btn ${isFrontOnlyAuto ? 'active' : ''}`} title="自動めくり時に裏面をスキップします">
                          表面のみ {isFrontOnlyAuto ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="card-counter" style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#94a3b8', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                          type="number"
                          className="card-counter-input"
                          min="1"
                          max={studyCards.length}
                          key={currentIndex}
                          defaultValue={currentIndex + 1}
                          onBlur={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              if (val < 1) val = 1;
                              if (val > studyCards.length) val = studyCards.length;
                              if (val - 1 !== currentIndex) {
                                stopAutoPlayIfActive();
                                setIsFlipped(false);
                                setCurrentIndex(val - 1);
                              } else {
                                e.target.value = currentIndex + 1;
                              }
                            } else {
                              e.target.value = currentIndex + 1;
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                            e.stopPropagation();
                          }}
                          style={{
                            width: '2.5em',
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '2px dashed #cbd5e1',
                            color: 'inherit',
                            font: 'inherit',
                            outline: 'none',
                            padding: '0 5px',
                            marginRight: '5px'
                          }}
                        />
                        / {studyCards.length}
                      </div>

                    </div>
                  </div>

                  <div className="card-animation-wrapper" key={currentIndex} style={{ width: '100%' }}>
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="ring-hole"></div>
                          <button className="memorize-check-btn" onClick={(e) => {
                              e.stopPropagation();
                              const currentCardObj = studyCards[currentIndex];
                              if (currentCardObj) {
                                  setIsFlipped(false); 
                                  toggleMemorize(e, currentCardObj, true);
                              }
                          }}>✔</button>
                          {renderCardFront(studyCards[currentIndex], isFullscreen)}
                        </div>
                        <div className="card-back">
                          {renderCardBack(studyCards[currentIndex], isFullscreen)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isFullscreen ? (
                    <div className="fullscreen-stealth-bottom">
                        <div className="autoplay-actions-row">
                          <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                          <button 
                            className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isAutoPlaying) {
                                const textToPlay = (qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word;
                                playAudio(textToPlay); 
                              } 
                              setIsAutoPlaying(!isAutoPlaying); 
                            }}
                          >
                            {isAutoPlaying ? t.autoPlayStop : t.autoPlayStart}
                          </button>
                          <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                          <button className="repeat-btn" onClick={handleRepeat}>{t.repeatBtn}</button>
                          <button className="fullscreen-btn" onClick={toggleFullScreen}>{isFullscreen ? t.fullScreenExit : t.fullScreenEnter}</button>
                        </div>
                        <div className="speed-slider-container">
                          <div className="speed-slider-label">
                            {t.intervalLabel}: {displaySeconds === 0 ? `${t.godspeed}` : `${displaySeconds.toFixed(1)} ${t.sec}`}
                          </div>
                          <div className="speed-slider-wrapper">
                            <span className="speed-min-max">{t.fast} {displaySeconds === 0 ? '👼' : '🐇'}</span>
                            <input 
                              type="range" min="0" max="4.0" step="0.1" 
                              value={displaySeconds} 
                              onChange={(e) => setDisplaySeconds(Number(e.target.value))} 
                              className="speed-slider" 
                            />
                            <span className="speed-min-max">🐢 {t.slow}</span>
                          </div>
                        </div>
                    </div>
                  ) : (
                    <div className="autoplay-controls" style={{background: '#fff', border: '1px solid #e1e4e8', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box'}}>
                      <div className="autoplay-actions-row">
                        <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                        <button 
                          className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (!isAutoPlaying) {
                              const textToPlay = (qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word;
                              playAudio(textToPlay); 
                            } 
                            setIsAutoPlaying(!isAutoPlaying); 
                          }}
                        >
                          {isAutoPlaying ? t.autoPlayStop : t.autoPlayStart}
                        </button>
                        <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                        <button className="repeat-btn" onClick={handleRepeat} style={{background: '#f8f9fa', color: '#555'}}>{t.repeatBtn}</button>
                        <button className="fullscreen-btn" onClick={toggleFullScreen} style={{background: '#f8f9fa', color: '#555'}}>{isFullscreen ? t.fullScreenExit : t.fullScreenEnter}</button>
                      </div>
                      <div className="speed-slider-container" style={{marginTop: '15px'}}>
                        <div style={{fontSize: '13px', color: '#7f8c8d', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                          {t.intervalLabel}: {displaySeconds === 0 ? `${t.godspeed} (0.0 ${t.sec})` : `${displaySeconds.toFixed(1)} ${t.sec}`}
                        </div>
                        <div className="speed-slider-wrapper" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                          <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'right' }}>{t.fast} {displaySeconds === 0 ? '👼' : '🐇'}</span>
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '12px', color: '#bdc3c7', fontWeight: 'bold', marginBottom: '2px' }}><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>
                            <input 
                              type="range" min="0" max="4.0" step="0.1" 
                              value={displaySeconds} 
                              onChange={(e) => setDisplaySeconds(Number(e.target.value))} 
                              className="speed-slider" 
                              style={{ width: '100%', margin: 0 }} 
                            />
                          </div>
                          <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'left' }}>🐢 {t.slow}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {!isFullscreen && (
              <div className="side-panel right-panel">
                <h3 className="panel-title">{t.memorizedPanel} ({memorizedCards.length})</h3>
                <div className="mini-card-list">
                  {memorizedCards.length === 0 ? (<p className="empty-mini-msg">{t.dragHereMsg}</p>) : (memorizedCards.map((c, i) => renderMiniCard(c, true, null, `mem-${i}`)))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;