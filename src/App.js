/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

const DICTIONARIES = [
  { id: 'weblio', name: 'Weblio', icon: '📖' },
  { id: 'eijiro', name: 'Eijiro', icon: '📘' },
  { id: 'goo', name: 'goo Dict', icon: '📗' },
  { id: 'cambridge', name: 'Cambridge', icon: '🇬🇧' },
  { id: 'oxford', name: 'Oxford', icon: '🎓' },
  { id: 'longman', name: 'Longman', icon: '🦁' },
  { id: 'google', name: 'Google', icon: '🌐' },
  { id: 'images', name: 'Images', icon: '🖼️' },
  { id: 'youglish', name: 'YouGlish', icon: '🎬' },
  { id: 'monokakido', name: 'Monokakido', icon: '📱' }
];

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

  const [activeDicts, setActiveDicts] = useState(() => {
    try {
      const saved = localStorage.getItem('redline_dicts');
      return saved ? JSON.parse(saved) : ['weblio', 'images', 'youglish'];
    } catch(e) { return ['weblio', 'images', 'youglish']; }
  });
  const [showDictSettings, setShowDictSettings] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);

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
  const [showActionMenu, setShowActionMenu] = useState(false); 

  const touchStartX = useRef(null); 
  const touchStartY = useRef(null); 
  const touchEndX = useRef(null); 
  const touchEndY = useRef(null);
  const playedRef = useRef({ index: -1, flipped: false, lang: '', type: '' });
  const settingsRef = useRef(null); 
  const actionMenuRef = useRef(null); 

  const activeDeck = (Array.isArray(decks) ? decks : []).find(d => d.id === currentDeckId);
  const allCards = activeDeck && Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  const totalMemorizedWords = useMemo(() => {
    return decks.reduce((sum, deck) => sum + (deck.cards || []).filter(c => c.isMemorized).length, 0);
  }, [decks]);

  const VOCAB_LEVELS = [
    { threshold: 0, eng: 'Starter', jp: lang === 'ja' ? 'スタート' : 'Starter' },
    { threshold: 1200, eng: 'Basic', jp: lang === 'ja' ? '基礎 (中学〜英検3級)' : 'Basic Level' },
    { threshold: 3000, eng: 'Standard', jp: lang === 'ja' ? '日常会話 (高校〜英検2級)' : 'Daily Conv.' },
    { threshold: 5000, eng: 'Advanced', jp: lang === 'ja' ? '応用 (難関大〜英検準1級)' : 'Advanced' },
    { threshold: 8000, eng: 'Professional', jp: lang === 'ja' ? 'プロ (英検1級〜)' : 'Professional' },
    { threshold: 12000, eng: 'Expert', jp: lang === 'ja' ? '海外大レベル' : 'Expert' },
    { threshold: 20000, eng: 'Native', jp: lang === 'ja' ? 'ネイティブレベル' : 'Native Level' },
    { threshold: 30000, eng: 'Legend', jp: lang === 'ja' ? '限界突破' : 'Legendary' }
  ];

  const totalSections = VOCAB_LEVELS.length - 1;
  let currentLevelIdx = 0;
  for (let i = VOCAB_LEVELS.length - 1; i >= 0; i--) {
    if (totalMemorizedWords >= VOCAB_LEVELS[i].threshold) {
      currentLevelIdx = i;
      break;
    }
  }

  const currentLvl = VOCAB_LEVELS[currentLevelIdx];
  const nextLvl = currentLevelIdx < totalSections ? VOCAB_LEVELS[currentLevelIdx + 1] : VOCAB_LEVELS[totalSections];

  const MAX_WORDS = 30000;
  const overallProgressPercent = Math.min(100, (totalMemorizedWords / MAX_WORDS) * 100);

  const chatGptPrompt = lang === 'ja' ? `💡 ChatGPTへの指示コピペ用：
「以下の英単語リストを学習アプリ用のCSVデータに変換してください。
【絶対ルール】
1. A列に英単語、B列に日本語訳、C列に英語例文、D列に例文和訳、E列に品詞の5列構成にすること。1行目はヘッダーにすること。
2. すべての値をダブルクォーテーション("")で囲むこと。
3. 英語例文と例文和訳の中にある「対象の単語・訳」は ** で囲むこと（例: I have an **apple**.）。
4. 挨拶や解説文は一切出力せず、CSV形式のコードブロックのみを返すこと。
【リスト】（ここに単語を貼る）」` : 
`💡 Prompt for ChatGPT:
"Convert the following word list into CSV for a flashcard app.
[Rules]
1. Col A: Word, Col B: Meaning, Col C: Example, Col D: Translation, Col E: Part of Speech.
2. Enclose all values in double quotes ("").
3. Wrap target words in examples with ** (e.g., I have an **apple**).
4. Output ONLY the CSV block. No greetings.
[List] (Paste words here)"`;

  useEffect(() => {
    try { localStorage.setItem('redline_dicts', JSON.stringify(activeDicts)); } catch (e) {}
  }, [activeDicts]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!isDocFullscreen);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setShowSettingsMenu(false);
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) setShowActionMenu(false);
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
    try { 
      localStorage.setItem('redline_boxes', JSON.stringify(boxes)); 
      localStorage.setItem('redline_decks', JSON.stringify(decks)); 
    } catch (e) {}

    if (currentUser && boxes.length > 0) {
      const timer = setTimeout(() => { 
        const safeBoxes = JSON.parse(JSON.stringify(boxes));
        const safeDecks = JSON.parse(JSON.stringify(decks));
        setDoc(doc(db, "users", currentUser.uid), { boxes: safeBoxes, decks: safeDecks }, { merge: true })
          .catch(e => console.log(e)); 
      }, 1000); 
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

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const toggleFullScreen = () => {
    const isDocFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isDocFullscreen) {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) docElm.requestFullscreen().catch(err => console.error(err));
      else if (docElm.webkitRequestFullscreen) docElm.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error(err));
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleOpenDict = (e, dictId, word) => {
    e.stopPropagation(); 
    stopAutoPlayIfActive(); 
    
    const cleanWord = String(word).replace(/\*\*/g, '').replace(/[〜…~]/g, '').trim();
    if (!cleanWord) return;

    let url = '';
    const encoded = encodeURIComponent(cleanWord);
    switch(dictId) {
      case 'weblio': url = `https://ejje.weblio.jp/content/${encoded}`; break;
      case 'eijiro': url = `https://eow.alc.co.jp/search?q=${encoded}`; break;
      case 'goo': url = `https://dictionary.goo.ne.jp/word/en/${encoded}/`; break;
      case 'cambridge': url = `https://dictionary.cambridge.org/dictionary/english/${encoded}`; break;
      case 'oxford': url = `https://www.oxfordlearnersdictionaries.com/definition/english/${encoded}`; break;
      case 'longman': url = `https://www.ldoceonline.com/dictionary/${encoded}`; break;
      case 'google': url = `https://translate.google.com/?sl=en&tl=ja&text=${encoded}`; break;
      case 'images': url = `https://www.google.com/search?tbm=isch&q=${encoded}`; break;
      case 'youglish': url = `https://youglish.com/pronounce/${encoded}/english`; break;
      case 'monokakido': url = `mkdictionaries://?text=${encoded}`; break;
      default: return;
    }

    if (dictId === 'monokakido') {
       window.location.href = url;
    } else {
       window.open(url, '_blank');
    }
  };

  const toggleDictSelection = (dictId) => {
    setActiveDicts(prev => {
      if (prev.includes(dictId)) return prev.filter(id => id !== dictId);
      return [...prev, dictId];
    });
  };

  const handleLogin = () => {
    if (isInAppBrowser) return alert(lang === 'ja' ? "【ログインエラーの回避】\nLINE等のブラウザではログインできません。「Safari/ブラウザで開く」を選択してください。" : "Cannot login in in-app browsers. Please open in Safari or Chrome.");
    signInWithPopup(auth, provider).catch(e => { if (e.code !== 'auth/popup-closed-by-user') alert("Login Failed"); });
  };
  const handleLogout = () => { signOut(auth).then(() => { setBoxes([]); setDecks([]); }); };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    setBoxes([...boxes, { id: Date.now(), name: newBoxName }]); setNewBoxName('');
  };

  const renameBox = (e, boxId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptBoxRename || 'Rename', currentName);
    if (newName !== null && newName.trim() !== '') setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, name: newName.trim(), nameKey: null } : b));
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteBox || 'Delete this box?')) { setBoxes(boxes.filter(b => b.id !== boxId)); setDecks(decks.filter(d => d.boxId !== boxId)); }
  };

  const createNewDeckInsideBox = () => {
    if (!newDeckNameInside.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckNameInside, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckNameInside('');
  };

  const renameDeck = (e, deckId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptDeckRename || 'Rename', currentName);
    if (newName !== null && newName.trim() !== '') setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName.trim(), nameKey: null } : d));
  };

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm(t.confirmDeleteDeck || 'Delete deck?')) setDecks(decks.filter(d => d.id !== id)); };

  const shareDeck = async (e, deckId) => {
    e.stopPropagation();
    if (!currentUser) return alert(lang === 'ja' ? "共有するにはログインが必要です。" : "Login required to share.");
    const deckToShare = decks.find(d => d.id === deckId);
    if (!deckToShare || !deckToShare.cards || deckToShare.cards.length === 0) return alert(lang === 'ja' ? "空のデッキは共有できません。" : "Cannot share an empty deck.");
    
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, "sharedDecks", code), {
        name: deckToShare.name,
        cards: deckToShare.cards,
        authorUid: currentUser.uid,
        createdAt: Date.now()
      });
      navigator.clipboard.writeText(code).catch(() => {});
      alert(lang === 'ja' ? `【共有コードを発行しました】\n\n${code}\n\n※クリップボードにコピーされました。` : `[Share Code Generated]\n\n${code}\n\nCopied to clipboard.`);
    } catch(err) {
      alert(lang === 'ja' ? "共有コードの発行に失敗しました。" : "Failed to generate code.");
    } finally {
      setLoading(false);
    }
  };

  const importDeckByCode = async () => {
    const code = window.prompt(lang === 'ja' ? "6桁の共有コードを入力してください" : "Enter 6-digit share code");
    if (!code || !code.trim()) return;
    
    setLoading(true);
    try {
      const docRef = doc(db, "sharedDecks", code.trim().toUpperCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const sharedData = docSnap.data();
        const importedCards = (sharedData.cards || []).map(c => ({ ...c, isMemorized: false }));
        const newDeck = {
          id: Date.now(),
          boxId: currentBoxId,
          name: `${sharedData.name} ${lang === 'ja' ? '(共有)' : '(Shared)'}`,
          lastStudied: null,
          lastRecordTime: null,
          cards: importedCards
        };
        setDecks(prev => [...prev, newDeck]);
        setToastMessage(lang === 'ja' ? `🎉 「${sharedData.name}」をダウンロードしました！` : `🎉 Downloaded "${sharedData.name}"!`);
        setTimeout(() => setToastMessage(''), 3000);
      } else {
        alert(lang === 'ja' ? "コードが見つかりません。" : "Code not found.");
      }
    } catch(err) {
      alert(lang === 'ja' ? "ダウンロードに失敗しました。" : "Download failed.");
    } finally {
      setLoading(false);
    }
  };

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
    const content = 'Word,Meaning,Example,Translation,POS,Memo\n"regard",見なす,"Many people **regard** this book **as** very important.","多くの人がこの本をとても重要なものとみなしている。",動詞,"regard A as B (AをBと見なす)"\n';
    const blob = new Blob([bom, content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'import_template.csv'; a.click(); window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result; const parsedData = parseCSV(text);
      const startIndex = parsedData[0] && parsedData[0][0] && (String(parsedData[0][0]).includes('英単語') || String(parsedData[0][0]).includes('Word')) ? 1 : 0;
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
      setToastMessage(lang === 'ja' ? `🎉 ${newCards.length}語追加されました！` : `🎉 ${newCards.length} words added!`); setTimeout(() => setToastMessage(''), 3000);
    } catch(e) { alert(t.alertCsvError); } finally { setIsBulkMode(false); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setLoading(false); }
  };

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

  const handleNextCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex((currentIndex + 1) % studyCards.length); }, [currentIndex, studyCards]);
  const handlePrevCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex((currentIndex - 1 + studyCards.length) % studyCards.length); }, [currentIndex, studyCards]);
  const handleRepeat = () => { stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setShowDeepDive(false); setStudyTime(0); setHasRecorded(false); playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; };

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
        const dName = decks.find(d => d.id === currentDeckId)?.name || "Deck";
        addDoc(collection(db, 'logs'), { uid: currentUser.uid, date: new Date().toISOString().split('T')[0], minutes: Math.max(1, Math.round(studyTime / 60)), categories: ['Vocabulary'], content: `App: ${dName}`, reflection: `Time: ${formatTime(studyTime)}`, quality: 100, timestamp: Date.now() }).catch(e => console.error(e));
      }
    }
  }, [isCompleted, currentDeckId, studyTime, currentUser, decks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || view !== 'study' || isBulkMode) return;
      unlockAudio();
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stopAutoPlayIfActive(); setIsFlipped(p => !p); setShowDeepDive(false); } 
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
          if (!isFlipped && displaySeconds !== 0 && !isFrontOnlyAuto) { setIsFlipped(true); setShowDeepDive(false); } 
          else if (currentIndex < studyCards.length - 1) { setCurrentIndex(currentIndex + 1); setIsFlipped(false); setShowDeepDive(false); } 
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
  const markDeckAsMemorized = (e, deckId) => { e.stopPropagation(); if (window.confirm(t.confirmMemorizeAll || 'Mark all as mastered?')) setDecks(prev => prev.map(d => d.id === deckId ? { ...d, lastStudied: Date.now(), cards: d.cards.map(c => ({ ...c, isMemorized: true })) } : d)); };
  
  const deleteSpecificCard = (e, wordOrCard) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive();
    if (studyCards[currentIndex] === wordOrCard || studyCards[currentIndex]?.word === wordOrCard) { setIsFlipped(false); setShowDeepDive(false); }
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
    setSelectedForDelete(new Set()); setIsDeleteMode(false); setCurrentIndex(0); setIsFlipped(false); setShowDeepDive(false);
  };

  const openPrintPreview = (mode) => {
    if (allCards.length === 0) return alert(t.noPrintCards);
    setPrintMode(mode); setPrintCards([...allCards].sort(() => Math.random() - 0.5)); setView('printPreview');
  };

  const shufflePrintCards = () => setPrintCards([...printCards].sort(() => Math.random() - 0.5));

  const openBox = (boxId) => { 
    unlockAudio(); setOpeningBoxId(boxId); 
    setTimeout(() => { setCurrentBoxId(boxId); setView('decks'); setOpeningBoxId(null); }, 450);
  };
  
  const openDeck = (id) => { 
    unlockAudio(); setCurrentIndex(0); setIsFlipped(false); setShowDeepDive(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); 
    setIsDeleteMode(false); setSelectedForDelete(new Set()); playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };
  
  const closeDeck = useCallback(() => {
    const isDocFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isDocFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    setIsFullscreen(false);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks'); setIsDeleteMode(false); setSelectedForDelete(new Set()); setShowDeepDive(false);
  }, [currentDeckId]);

  const handleTouchStart = (e) => {
    unlockAudio();
    const card = e.target.closest('.card-container');
    if (card) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartX.current = null;
      touchStartY.current = null;
    }
  };
  
  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) handleNextCard();
      else handlePrevCard();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClick = () => unlockAudio(); 

  // ============================
  // UI Component rendering
  // ============================

  const getPosColors = (pos) => {
    switch (pos) {
      case '名詞': case 'Noun': return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; 
      case '動詞': case 'Verb': return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }; 
      case '形容詞': case 'Adjective': return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }; 
      case '副詞': case 'Adverb': return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }; 
      case '代名詞': case 'Pronoun': return { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' }; 
      case '前置詞': case 'Preposition': case '接続詞': case 'Conjunction': return { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' }; 
      case '熟語': case 'Idiom': return { color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' }; 
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
          else if (!isMemorizedList && index !== null) { stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex(index - 1); }
        }}>
        <div className="mini-card-header">
          {isDeleteMode && <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '8px', pointerEvents: 'none'}} />}
          {!isDeleteMode && index !== null && <span className="mini-index" style={{marginRight:'5px', fontWeight:'bold', flexShrink:0}}>{index}.</span>}
          <div className="mini-text-container"><span className="mini-word" style={{ fontWeight: 'bold', color: '#334155' }}>{c.word}</span><span className="mini-meaning" style={{ fontSize: '13px', color: '#64748b' }}>{c.meaning}</span></div>
          {!isDeleteMode && (
            <div className="mini-icons" onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>
              <button className="mini-icon-btn" onClick={(e) => toggleMemorize(e, c, !isMemorizedList)} title={isMemorizedList ? (lang==='ja'?'戻す':'Undo') : (lang==='ja'?'暗記済':'Mastered')}>{isMemorizedList ? '↩️' : '✅'}</button>
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
          <h3 className="deck-name" title={deck.name}>
            {deck.name}
            <button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button>
            <button className="inline-edit-btn" onClick={(e) => shareDeck(e, deck.id)} style={{ marginLeft: '5px' }}>🔗</button>
          </h3>
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>
          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini"><span>🗂 {(deck.cards || []).length}{lang==='ja'?'枚':' cards'}</span>{deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}{deck.lastRecordTime !== null && <span>⏱ {(lang==='ja'?'最速 ':'Best ')} {formatTime(deck.lastRecordTime)}</span>}</div>
          </div>
          {(deck.cards || []).length > 0 && (deck.cards || []).every(c => c.isMemorized) && <div className="memorized-stamp">{lang==='ja'?'PERFECT':'PERFECT'}</div>}
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
      <div className="back-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingBottom: '60px', boxSizing: 'border-box', overflowY: 'auto' }}>
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
        
        {/* メモ欄 */}
        {showMemoOnBack && card.memo && (
          <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: '8px', width: '100%', maxWidth: '800px', fontSize: isFullscreen ? 'clamp(18px, 4vw, 24px)' : '14px', color: '#475569', textAlign: 'left', lineHeight: '1.5', wordBreak: 'break-word' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>{lang==='ja'?'💡 メモ:':'💡 Memo:'}</span> {card.memo}
          </div>
        )}

        {/* ★ 改善: Deep Diveボタンを「右上」に移動し、文字への被りを完全に防止。さらにメニューを下へ展開。 */}
        {activeDicts.length > 0 && (
          <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDeepDive(!showDeepDive); }}
              style={{ background: showDeepDive ? '#334155' : '#ffffff', border: '1px solid #cbd5e1', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s', color: showDeepDive ? '#fff' : '#000', opacity: showDeepDive ? 1 : 0.7 }}
              onMouseOver={e => e.currentTarget.style.opacity = 1}
              onMouseOut={e => e.currentTarget.style.opacity = showDeepDive ? 1 : 0.7}
              title={lang==='ja'?'辞書で深く調べる':'Deep Dive (Dictionary)'}
            >
              {showDeepDive ? '✖' : '🔍'}
            </button>
            {showDeepDive && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0', minWidth: '140px' }}>
                {activeDicts.map(dictId => {
                  const dict = DICTIONARIES.find(d => d.id === dictId);
                  if(!dict) return null;
                  return (
                    <button
                      key={dictId}
                      onClick={(e) => { handleOpenDict(e, dictId, card.word); setShowDeepDive(false); }}
                      style={{ background: 'transparent', border: 'none', padding: '8px 10px', fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s', width: '100%', textAlign: 'left' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      title={lang==='ja'?`${dict.name}で調べる`:`Search in ${dict.name}`}
                    >
                      <span style={{fontSize: '16px'}}>{dict.icon}</span> {dict.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================
  // Main Rendering
  // ============================

  if (isAuthLoading) return <div className="app-container gentle-bg desk-view" style={{justifyContent:'center', height:'100vh'}}><h2 style={{color:'#7f8c8d'}}>{t.loading}</h2></div>;
  
  if (!currentUser) return (
    <div className="login-screen-bg">
      <div className="login-top-right">
        <button className="manual-link-btn" onClick={() => setView('manual')}>{lang === 'ja' ? '📖 マニュアル' : '📖 Manual'}</button>
        <button className="login-lang-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{lang === 'ja' ? '🌐 English' : '🌐 日本語'}</button>
      </div>
      <div className="login-hero-section">
        <h1 className="login-burning-text">{t.appTitle}</h1><h2 className="login-burning-subtitle">{t.appSubtitle}</h2>
        <button className="login-google-btn" onClick={handleLogin}>{t.loginWithGoogle || (lang==='ja'?'Googleでログイン':'Login with Google')}</button>
        {isInAppBrowser && <div style={{ marginTop: '20px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '8px', maxWidth: '350px', margin: '20px auto 0', lineHeight: '1.5' }}>{lang==='ja'?'⚠️ LINEやInstagramのブラウザではログインエラーになる場合があります。「Safari/ブラウザで開く」を選択してください。':'⚠️ Login may fail in in-app browsers. Please open in Safari or Chrome.'}</div>}
      </div>
    </div>
  );

  if (view === 'manual') return <Manual t={t} setView={setView} />;
  if (view === 'printPreview') return <PrintPreview t={t} setView={setView} printCards={printCards} printMode={printMode} activeDeck={activeDeck} shufflePrintCards={shufflePrintCards} handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd} handleClick={unlockAudio} />;
  if (view === 'test') return <div className="app-container gentle-bg desk-view" onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><TestMode t={t} setView={setView} allCards={allCards} /></div>;

  if (view === 'boxes') return (
    <div className="app-container gentle-bg desk-view" style={{padding: 0}} onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      
      {/* ★ スマホで重ならないように元のクラス指定に完全修復したヘッダーボタン群 ★ */}
      <div className="top-right-actions">
        <button className="lang-toggle-btn logout-btn" onClick={handleLogout} style={{backgroundColor: 'rgba(231, 76, 60, 0.8)', borderColor: 'transparent'}}>{t.logout || (lang==='ja'?'ログアウト':'Logout')}</button>
        <button className="manual-link-btn" onClick={() => window.open('https://english-t24.com', '_blank')} style={{backgroundColor: '#e67e22', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>🌐 Blog</button>
        <button className="manual-link-btn" onClick={() => window.open('https://app.english-t24.com', '_blank')} style={{backgroundColor: '#3498db', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>📊 Log</button>
        <div style={{width: '2px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 5px'}}></div>
        <button className="manual-link-btn" onClick={() => setShowDictSettings(true)} style={{backgroundColor: '#0f172a', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>{lang === 'ja' ? '⚙️ 辞書設定' : '⚙️ Dict Settings'}</button>
        <button className="manual-link-btn" onClick={() => setView('manual')}>{lang === 'ja' ? '📖 使い方' : '📖 Guide'}</button>
        <button className="lang-toggle-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{lang === 'ja' ? '🌐 English' : '🌐 日本語'}</button>
      </div>

      {showDictSettings && (
        <div className="modal-overlay" onClick={() => setShowDictSettings(false)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" style={{ borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '20px', fontWeight: '800'}}>{lang === 'ja' ? '⚙️ マイ辞書設定' : '⚙️ Dict Settings'}</h3>
            <p style={{fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5'}}>
              {lang === 'ja' ? 'カードの裏面に表示する辞書を選んでください。\n気になった単語をワンタップで深く調べられます。' : 'Select dictionaries to show on the back of cards.\nYou can deeply explore words with a single tap.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }}>
              {DICTIONARIES.map(dict => (
                <label key={dict.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>{dict.icon} {dict.name}</span>
                  <input 
                    type="checkbox" 
                    checked={activeDicts.includes(dict.id)} 
                    onChange={() => toggleDictSelection(dict.id)} 
                    style={{ transform: 'scale(1.2)' }}
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="add-btn" style={{ width: '100%', background: '#0f172a', borderRadius: '999px', padding: '14px', fontSize: '16px' }} onClick={() => setShowDictSettings(false)}>{lang === 'ja' ? '保存して閉じる' : 'Save & Close'}</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="hero-section">
        <h1 className="burning-text">{t.appTitle}</h1><h2 className="burning-subtitle">{t.appSubtitle}</h2>
        <div className="creation-header-row">
          <span className="creation-label" title="Box" style={{color: '#fff'}}>📦</span>
          <input type="text" placeholder={t.boxPlaceholder || (lang==='ja'?'箱の名前を入力':'Box Name')} value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
          <button onClick={createNewBox} className="add-btn mini-btn">{t.createBtn || (lang==='ja'?'作る':'Create')}</button>
        </div>
      </div>

      <div style={{ width: '90%', maxWidth: '800px', margin: '0 auto 30px auto', background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CURRENT LEVEL</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#2c3e50' }}>
              {currentLvl.eng} <span style={{ fontSize: '13px', fontWeight: '500', color: '#7f8c8d', marginLeft: '6px' }}>{currentLvl.jp}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TOTAL WORDS</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#2c3e50', lineHeight: '1' }}>{totalMemorizedWords}</div>
          </div>
        </div>

        {currentLevelIdx < totalSections && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d' }}>
              <span>{lang==='ja'?'次の目標: ':'To '}{nextLvl.eng}</span>
              <span>{totalMemorizedWords} / 30,000 {lang==='ja'?'(教養あるネイティブ)':'(Native)'}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${overallProgressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #3498db, #2ecc71)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '10px', padding: '15px', background: '#f8fafc', borderRadius: '12px', fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
          <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>{lang==='ja'?'💡 語彙力マスターの目安（最終目標：30,000語）':'💡 Vocab Master Guide (Goal: 30,000)'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
            {lang === 'ja' ? (
              <>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>1,200語</span><span>中学卒業・英検3級レベル</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>3,000語</span><span>高校卒業・英検2級レベル（日常会話）</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>5,000語</span><span>難関大入試・英検準1級レベル</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>8,000語</span><span>TOEIC高得点・英検1級（プロレベル）</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>12,000語</span><span>海外大学進学レベル</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>20,000語</span><span>一般的なネイティブスピーカー</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right', color: '#e74c3c' }}>30,000語</span><span style={{ fontWeight: 'bold', color: '#e74c3c' }}>教養あるネイティブ・限界突破！</span>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>1,200</span><span>Jr. High / Eiken 3</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>3,000</span><span>High School / Eiken 2 (Daily Conv.)</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>5,000</span><span>Univ. Entrance / Eiken Pre-1</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>8,000</span><span>TOEIC High Score / Eiken 1 (Pro)</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>12,000</span><span>Study Abroad Level</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right' }}>20,000</span><span>General Native Speaker</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right', color: '#e74c3c' }}>30,000</span><span style={{ fontWeight: 'bold', color: '#e74c3c' }}>Educated Native / Limit Break!</span>
              </>
            )}
          </div>
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
                <span className="box-instruction">{hasReview ? <span className="alert-text">{t.review || (lang==='ja'?'復習！':'Review!')}</span> : (t.tapToOpen || (lang==='ja'?'👇タップで開く':'👇Tap to open'))}</span>
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
      
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>{t.editCardTitle || (lang==='ja'?'カードを編集':'Edit Card')}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq || (lang==='ja'?'英単語 (必須)':'Word (Req)')}</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel || (lang==='ja'?'品詞':'Part of Speech')}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer', userSelect: 'auto' }} value={editingCard.pos || ''} onChange={(e) => setEditingCard({...editingCard, pos: e.target.value})}>
              <option value="">{lang === 'ja' ? '-- 指定なし --' : '-- None --'}</option>
              <option value={lang === 'ja' ? '名詞' : 'Noun'}>{lang === 'ja' ? '名詞' : 'Noun'}</option>
              <option value={lang === 'ja' ? '動詞' : 'Verb'}>{lang === 'ja' ? '動詞' : 'Verb'}</option>
              <option value={lang === 'ja' ? '形容詞' : 'Adjective'}>{lang === 'ja' ? '形容詞' : 'Adjective'}</option>
              <option value={lang === 'ja' ? '副詞' : 'Adverb'}>{lang === 'ja' ? '副詞' : 'Adverb'}</option>
              <option value={lang === 'ja' ? '代名詞' : 'Pronoun'}>{lang === 'ja' ? '代名詞' : 'Pronoun'}</option>
              <option value={lang === 'ja' ? '前置詞' : 'Preposition'}>{lang === 'ja' ? '前置詞' : 'Preposition'}</option>
              <option value={lang === 'ja' ? '接続詞' : 'Conjunction'}>{lang === 'ja' ? '接続詞' : 'Conjunction'}</option>
              <option value={lang === 'ja' ? '熟語' : 'Idiom'}>{lang === 'ja' ? '熟語' : 'Idiom'}</option>
              <option value={lang === 'ja' ? 'その他' : 'Other'}>{lang === 'ja' ? 'その他' : 'Other'}</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq || (lang==='ja'?'日本語訳 (必須)':'Meaning (Req)')}</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint || (lang==='ja'?'英語例文':'Example Sentence')}</label>
            <textarea className="modal-input" value={editingCard.example} onChange={(e) => setEditingCard({...editingCard, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint || (lang==='ja'?'例文和訳':'Translation')}</label>
            <textarea className="modal-input" value={editingCard.translation} onChange={(e) => setEditingCard({...editingCard, translation: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{lang === 'ja' ? '💡 メモ (語源や注意点など)' : '💡 Memo'}</label>
            <input className="modal-input" value={editingCard.memo || ''} onChange={(e) => setEditingCard({...editingCard, memo: e.target.value})} />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>{t.cancelBtn || (lang==='ja'?'キャンセル':'Cancel')}</button><button className="add-btn" onClick={saveEditedCard}>{t.saveBtn || (lang==='ja'?'保存':'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {addingCard && (
        <div className="modal-overlay" onClick={() => setAddingCard(false)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#27ae60'}}>{t.newCardTitle || (lang==='ja'?'カードを追加':'Add Card')}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq || (lang==='ja'?'英単語 (必須)':'Word (Req)')}</label>
            <input className="modal-input" value={newCardData.word} onChange={(e) => setNewCardData({...newCardData, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel || (lang==='ja'?'品詞':'Part of Speech')}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer', userSelect: 'auto' }} value={newCardData.pos || ''} onChange={(e) => setNewCardData({...newCardData, pos: e.target.value})}>
              <option value="">{lang === 'ja' ? '-- 指定なし --' : '-- None --'}</option>
              <option value={lang === 'ja' ? '名詞' : 'Noun'}>{lang === 'ja' ? '名詞' : 'Noun'}</option>
              <option value={lang === 'ja' ? '動詞' : 'Verb'}>{lang === 'ja' ? '動詞' : 'Verb'}</option>
              <option value={lang === 'ja' ? '形容詞' : 'Adjective'}>{lang === 'ja' ? '形容詞' : 'Adjective'}</option>
              <option value={lang === 'ja' ? '副詞' : 'Adverb'}>{lang === 'ja' ? '副詞' : 'Adverb'}</option>
              <option value={lang === 'ja' ? '代名詞' : 'Pronoun'}>{lang === 'ja' ? '代名詞' : 'Pronoun'}</option>
              <option value={lang === 'ja' ? '前置詞' : 'Preposition'}>{lang === 'ja' ? '前置詞' : 'Preposition'}</option>
              <option value={lang === 'ja' ? '接続詞' : 'Conjunction'}>{lang === 'ja' ? '接続詞' : 'Conjunction'}</option>
              <option value={lang === 'ja' ? '熟語' : 'Idiom'}>{lang === 'ja' ? '熟語' : 'Idiom'}</option>
              <option value={lang === 'ja' ? 'その他' : 'Other'}>{lang === 'ja' ? 'その他' : 'Other'}</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq || (lang==='ja'?'日本語訳 (必須)':'Meaning (Req)')}</label>
            <input className="modal-input" value={newCardData.meaning} onChange={(e) => setNewCardData({...newCardData, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint || (lang==='ja'?'英語例文':'Example Sentence')}</label>
            <textarea className="modal-input" value={newCardData.example} onChange={(e) => setNewCardData({...newCardData, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint || (lang==='ja'?'例文和訳':'Translation')}</label>
            <textarea className="modal-input" value={newCardData.translation} onChange={(e) => setNewCardData({...newCardData, translation: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{lang === 'ja' ? '💡 メモ (語源や注意点など)' : '💡 Memo'}</label>
            <input className="modal-input" value={newCardData.memo || ''} onChange={(e) => setNewCardData({...newCardData, memo: e.target.value})} />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAddingCard(false)}>{t.cancelBtn || (lang==='ja'?'キャンセル':'Cancel')}</button>
              <button className="add-btn" style={{backgroundColor: '#27ae60'}} onClick={saveNewCard}>{t.addBtn || (lang==='ja'?'追加':'Add')}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'decks' && (() => {
        const boxDecks = decks.filter(d => d.boxId === currentBoxId);
        const unmemorizedDecks = boxDecks.filter(d => !(d.cards.length > 0 && d.cards.every(c => c.isMemorized)));
        const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.cards.every(c => c.isMemorized));
        return (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={() => setView('boxes')}>{t.backToHome || (lang==='ja'?'◀ ホームに戻る':'◀ Home')}</button>
              <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2><div style={{width: '80px'}}></div>
            </div>
            
            <div className="integrated-creation-area">
              <div className="creation-row">
                <span className="creation-label" title="Deck">🔖</span>
                <input type="text" placeholder={t.deckPlaceholder || (lang==='ja'?'新しい束の名前':'New Deck Name')} value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">{t.addBtn || (lang==='ja'?'追加':'Add')}</button>
                <button onClick={importDeckByCode} className="add-btn mini-btn" style={{ backgroundColor: '#8e44ad', marginLeft: '5px' }} disabled={loading}>{lang === 'ja' ? '🔗 共有コード' : '🔗 Share'}</button>
              </div>
            </div>

            <div className="decks-split-layout">
              <div className="decks-unmemorized-area"><h3 className="area-title">{t.unmemTitle || (lang==='ja'?'📖 学習中・未修の束':'📖 To Study')}</h3><p className="area-hint">{t.unmemHint || (lang==='ja'?'※すべての単語を覚えると、暗記済みに移動します。':'Words move to Mastered when memorized.')}</p>{unmemorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noUnmem || (lang==='ja'?'束がありません':'No Decks')}</p> : <div className="decks-grid">{unmemorizedDecks.map(renderDeckCard)}</div>}</div>
              <div className="decks-memorized-area"><h3 className="area-title" style={{color: '#27ae60'}}>{t.memTitle || (lang==='ja'?'🏆 暗記済の束':'🏆 Mastered')}</h3><p className="area-hint">{t.memHint || (lang==='ja'?'※完璧に覚えた束がここに並びます！':'Perfectly memorized decks appear here!')}</p>{memorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noMem || (lang==='ja'?'まだ暗記済みの束はありません。':'No mastered decks yet.')}</p> : <div className="decks-grid memorized-grid">{memorizedDecks.map(renderDeckCard)}</div>}</div>
            </div>
          </div>
        );
      })()}

      {view === 'study' && (
        <div className="study-dashboard">
          {!isFullscreen && (
            <div className="side-panel left-panel">
              <h3 className="panel-title">{t.learningPanel || (lang==='ja'?'📖 学習中':'📖 Learning')} ({studyCards.length})</h3>
              <div className="panel-top-action">
                {!isDeleteMode ? (
                  <>
                    <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                      <button onClick={() => setAddingCard(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '13px', backgroundColor: '#27ae60', margin: 0}}>{lang === 'ja' ? '✏️ 手動で追加' : '✏️ Add'}</button>
                      <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '13px', backgroundColor: '#e67e22', margin: 0}}>{lang === 'ja' ? '📂 CSVで追加' : '📂 Add CSV'}</button>
                    </div>
                    <button onClick={() => setIsDeleteMode(true)} className="add-btn bulk-toggle-btn" style={{width: '100%', padding: '10px 0', fontSize: '13px', backgroundColor: '#94a3b8', margin: 0}}>{lang === 'ja' ? '🗑️ 一括削除' : '🗑️ Bulk Delete'}</button>
                  </>
                ) : (
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button onClick={() => {setIsDeleteMode(false); setSelectedForDelete(new Set());}} className="cancel-btn" style={{flex: 1, padding: '10px 0', fontSize: '13px', margin: 0}}>{t.cancelBulkDelete || (lang==='ja'?'キャンセル':'Cancel')}</button>
                    <button onClick={executeBulkDelete} className="add-btn" style={{flex: 1, padding: '10px 0', fontSize: '13px', backgroundColor: '#e74c3c', margin: 0}}>{t.executeBulkDelete || (lang==='ja'?'実行':'Delete')} ({selectedForDelete.size})</button>
                  </div>
                )}
              </div>
              {/* ★ スマホで学習中リストがたくさん見えるように高さを確保 ★ */}
              <div className="mini-card-list" style={{ flex: 1, minHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>{studyCards.map((c, i) => renderMiniCard(c, false, i + 1, `study-${i}`))}</div>
            </div>
          )}
          
          <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`}>
            {!isFullscreen && (
              <>
                <div className="study-controls-top">
                  <button className="back-to-desk-btn" onClick={closeDeck} style={{color: '#7f8c8d', textShadow: 'none', background: 'none'}}>{t.backBtn || (lang==='ja'?'◀ 戻る':'◀ Back')}</button>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <button className="mute-toggle-btn" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? (lang === 'ja' ? '🔇 音声: オフ' : '🔇 Audio: OFF') : (lang === 'ja' ? '🔊 音声: オン' : '🔊 Audio: ON')}
                    </button>
                    <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible', background: '#fff', color: '#333', textShadow: 'none' }}>⏱ {formatTime(studyTime)}</div>
                  </div>
                </div>
                <div className="study-title-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px', width: '100%' }}>
                  <h2 className="study-deck-title" style={{ margin: 0, fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: '800', color: '#34495e', letterSpacing: '0.1em', textShadow: '1px 2px 4px rgba(0,0,0,0.1)', fontStyle: 'normal', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif', textAlign: 'center' }}>{activeDeck?.name}</h2>
                  
                  {allCards.length >= 4 && (
                    <div ref={actionMenuRef} style={{ position: 'relative', marginTop: '10px' }}>
                      <button onClick={() => setShowActionMenu(!showActionMenu)} style={{ backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {lang === 'ja' ? '🎯 テスト ＆ プリント ▼' : '🎯 Test & Print ▼'}
                      </button>
                      {showActionMenu && (
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => { setView('test'); setShowActionMenu(false); }} style={{ background: 'none', border: 'none', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}>{lang === 'ja' ? '📝 アプリでテストする' : '📝 Take a Test'}</button>
                          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '2px 0' }}></div>
                          <button onClick={() => { openPrintPreview('word'); setShowActionMenu(false); }} style={{ background: 'none', border: 'none', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}>{lang === 'ja' ? '🖨️ 単語プリントを作る' : '🖨️ Print Word List'}</button>
                          <button onClick={() => { openPrintPreview('example'); setShowActionMenu(false); }} style={{ background: 'none', border: 'none', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}>{lang === 'ja' ? '🖨️ 例文プリントを作る' : '🖨️ Print Example List'}</button>
                          <button onClick={() => { openPrintPreview('choice'); setShowActionMenu(false); }} style={{ background: 'none', border: 'none', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}>{lang === 'ja' ? '🖨️ 4択プリント (英検形式)' : '🖨️ 4-Choice Quiz'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {!isFullscreen && isBulkMode && (
              <div className="bulk-input-section" style={{ marginTop: '0px', width: '100%', maxWidth: '600px' }}>
                <p className="bulk-hint" style={{fontSize:'16px', color:'#333'}}>{t.csvHint}</p>
                <div className="bulk-file-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
                  <button onClick={downloadTemplate} style={{ backgroundColor: '#f39c12', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0 }}>{lang === 'ja' ? '📥 テンプレート(CSV)をダウンロード' : '📥 Download CSV Template'}</button>
                  <label style={{ backgroundColor: '#27ae60', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0, textAlign: 'center' }}>
                    {loading ? (t.loading || 'Loading...') : (lang === 'ja' ? '📂 CSVファイルをインポートする' : '📂 Import CSV File')}
                    <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                  </label>
                </div>
                <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5', whiteSpace: 'pre-wrap', textAlign: 'left', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '14px' }}>
                  {chatGptPrompt}
                </p>
                <div className="bulk-actions" style={{ marginTop: '15px' }}><button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>{t.closeBtn || (lang==='ja'?'閉じる':'Close')}</button></div>
              </div>
            )}
            
            {allCards.length > 0 && studyCards.length === 0 ? (
              <div className="empty-deck-msg" style={{marginTop: '60px'}}><h2 style={{color: '#27ae60'}}>{t.allMemorizedMsg || (lang==='ja'?'🎉 すべて暗記しました！':'🎉 All Mastered!')}</h2><button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>{t.resetBtn || (lang==='ja'?'最初からやり直す':'Reset & Study Again')}</button></div>
            ) : studyCards.length > 0 && !isBulkMode ? (
              <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                
                <div className={`card-header-actions ${isFullscreen ? 'fullscreen-stealth-top' : ''}`}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '15px' }}>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => setQLang(qLang === 'en' ? 'ja' : 'en')} className="setting-badge-btn" title="Toggle Language">{qLang === 'en' ? (lang === 'ja' ? '🇺🇸 英→日' : '🇺🇸 En→Jp') : (lang === 'ja' ? '🇯🇵 日→英' : '🇯🇵 Jp→En')}</button>
                      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '50px', padding: '3px', border: '1px solid #e2e8f0' }}>
                        <button onClick={() => setQType('word')} className={`toggle-tab-btn ${qType === 'word' ? 'active' : ''}`}>{lang === 'ja' ? '🔤 単語' : '🔤 Word'}</button>
                        <button onClick={() => setQType('example')} className={`toggle-tab-btn ${qType === 'example' ? 'active' : ''}`}>{lang === 'ja' ? '📝 例文' : '📝 Example'}</button>
                      </div>
                    </div>

                    <div className="card-counter" style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#94a3b8', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input type="number" className="card-counter-input" min="1" max={studyCards.length} key={currentIndex} defaultValue={currentIndex + 1}
                        onBlur={(e) => {
                          let val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) { val = Math.max(1, Math.min(val, studyCards.length)); if (val - 1 !== currentIndex) { stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex(val - 1); } else e.target.value = currentIndex + 1; } else e.target.value = currentIndex + 1;
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
                        style={{ width: '2.5em', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px dashed #cbd5e1', color: 'inherit', font: 'inherit', outline: 'none', padding: '0 5px', marginRight: '5px' }}
                      /> / {studyCards.length}
                    </div>

                    <div ref={settingsRef} style={{ position: 'relative' }}>
                      <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="setting-badge-btn" style={{ backgroundColor: showSettingsMenu ? '#e2e8f0' : '#fff' }}>{lang === 'ja' ? '⚙️ 表示オプション ▼' : '⚙️ Options ▼'}</button>
                      {showSettingsMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: '50%', transform: 'translateX(50%)', marginTop: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {qType === 'word' ? (
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>{lang === 'ja' ? '例文を表示' : 'Show Examples'}</span><input type="checkbox" checked={showExOnBack} onChange={() => setShowExOnBack(!showExOnBack)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                          ) : (
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>{lang === 'ja' ? '単語を表示' : 'Show Words'}</span><input type="checkbox" checked={showWordOnExMode} onChange={() => setShowWordOnExMode(!showWordOnExMode)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                          )}
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>{lang === 'ja' ? 'メモを表示' : 'Show Memos'}</span><input type="checkbox" checked={showMemoOnBack} onChange={() => setShowMemoOnBack(!showMemoOnBack)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }}></div>
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}><span>{lang === 'ja' ? '自動めくり: 表面のみ' : 'Auto-play: Front only'}</span><input type="checkbox" checked={isFrontOnlyAuto} onChange={() => setIsFrontOnlyAuto(!isFrontOnlyAuto)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} /></label>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* ★ カードのリアルなアスペクト比（1.5:1）を適用し、スマホで巨大化するのを防ぐ ★ */}
                <div className="card-animation-wrapper" key={currentIndex} style={isFullscreen ? { width: '100%', height: '100vh' } : { width: '100%', maxWidth: '800px', margin: '0 auto', aspectRatio: '1.5 / 1', minHeight: '220px', maxHeight: '450px' }}>
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped); setShowDeepDive(false);}} style={{ height: '100%' }}>
                    <div className="card-inner">
                      <div className="card-front">
                        <div className="ring-hole"></div><button className="memorize-check-btn" onClick={(e) => { e.stopPropagation(); if (studyCards[currentIndex]) { setIsFlipped(false); setShowDeepDive(false); toggleMemorize(e, studyCards[currentIndex], true); } }}>✔</button>
                        {renderCardFront(studyCards[currentIndex], isFullscreen)}
                      </div>
                      <div className="card-back">{renderCardBack(studyCards[currentIndex], isFullscreen)}</div>
                    </div>
                  </div>
                </div>
                
                <div className={isFullscreen ? "fullscreen-stealth-bottom" : "autoplay-controls"} style={isFullscreen ? {} : {background: '#fff', border: '1px solid #e1e4e8', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box'}}>
                  <div className="autoplay-actions-row">
                    <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                    <button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); if (!isAutoPlaying) { playAudio((qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word); } setIsAutoPlaying(!isAutoPlaying); }}>
                      {isAutoPlaying ? (lang === 'ja' ? '■ 停止' : '■ Stop') : (lang === 'ja' ? '▶ 自動めくり' : '▶ Auto Play')}
                    </button>
                    <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                    <button className="repeat-btn" onClick={handleRepeat} style={isFullscreen ? {} : {background: '#f8f9fa', color: '#555'}}>{lang === 'ja' ? '🔄 もう1回' : '🔄 Restart'}</button>
                    <button className="fullscreen-btn" onClick={toggleFullScreen} style={isFullscreen ? {} : {background: '#f8f9fa', color: '#555'}}>{isFullscreen ? (lang==='ja'?'元に戻す':'Exit') : (lang==='ja'?'全集中 🔥':'Focus 🔥')}</button>
                  </div>
                  <div className="speed-slider-container" style={isFullscreen ? {} : {marginTop: '15px'}}>
                    <div className={isFullscreen ? "speed-slider-label" : ""} style={isFullscreen ? {} : {fontSize: '13px', color: '#7f8c8d', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                      {lang === 'ja' ? '表示間隔: ' : 'Interval: '}{displaySeconds === 0 ? (lang==='ja'?`${t.godspeed || '神速'} (0.0 ${t.sec||'秒'})`:`Godspeed (0.0 sec)`) : `${displaySeconds.toFixed(1)} ${lang==='ja'?'秒':'sec'}`}
                    </div>
                    <div className="speed-slider-wrapper" style={isFullscreen ? {} : { display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                      <span className="speed-min-max" style={isFullscreen ? {} : { fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'right' }}>{lang === 'ja' ? '速 🐇' : 'Fast 🐇'}</span>
                      <div style={isFullscreen ? {} : { flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {!isFullscreen && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '12px', color: '#bdc3c7', fontWeight: 'bold', marginBottom: '2px' }}><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>}
                        <input type="range" min="0" max="4.0" step="0.1" value={displaySeconds} onChange={(e) => setDisplaySeconds(Number(e.target.value))} className="speed-slider" style={isFullscreen ? {} : { width: '100%', margin: 0 }} />
                      </div>
                      <span className="speed-min-max" style={isFullscreen ? {} : { fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'left' }}>{lang === 'ja' ? '🐢 遅' : '🐢 Slow'}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
          {!isFullscreen && (
            <div className="side-panel right-panel">
              <h3 className="panel-title">{t.memorizedPanel || (lang==='ja'?'🏆 暗記済':'🏆 Mastered')} ({memorizedCards.length})</h3>
              {/* ★ スマホで暗記済リストがたくさん見えるように高さを確保 ★ */}
              <div className="mini-card-list" style={{ flex: 1, minHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>{memorizedCards.length === 0 ? <p className="empty-mini-msg">{t.dragHereMsg || (lang==='ja'?'左の ✅ ボタンでここに移動！':'Click ✅ to move words here!')}</p> : memorizedCards.map((c, i) => renderMiniCard(c, true, null, `mem-${i}`))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;