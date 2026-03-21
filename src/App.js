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
    try { const saved = localStorage.getItem('redline_dicts'); return saved ? JSON.parse(saved) : ['weblio', 'images', 'youglish']; } catch(e) { return ['weblio', 'images', 'youglish']; }
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

  const [showPodcast, setShowPodcast] = useState(false);
  const [podOpts, setPodOpts] = useState({ ja: true, ex: true, gap: 1.0 });
  const [isPodPlaying, setIsPodPlaying] = useState(false);
  const [podIndex, setPodIndex] = useState(0);
  const podIndexRef = useRef(0);
  const isPodPlayingRef = useRef(false);

  // ★ 俯瞰モード
  const [showOverview, setShowOverview] = useState(false);
  const [ovSelected, setOvSelected] = useState(new Set());
  const [ovTab, setOvTab] = useState('study');

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



  const chatGptPrompt = lang === 'ja' ? `💡 ChatGPTへの指示コピペ用：\n「以下の英単語リストを学習アプリ用のCSVデータに変換してください。\n【絶対ルール】\n1. A列に英単語、B列に日本語訳、C列に英語例文、D列に例文和訳、E列に品詞の5列構成にすること。1行目はヘッダーにすること。\n2. すべての値をダブルクォーテーション("")で囲むこと。\n3. 英語例文と例文和訳の中にある「対象の単語・訳」は ** で囲むこと（例: I have an **apple**.）。\n4. 挨拶や解説文は一切出力せず、CSV形式のコードブロックのみを返すこと。\n【リスト】（ここに単語を貼る）」`
    : `💡 Prompt for ChatGPT:\n"Convert the following word list into CSV for a flashcard app.\n[Rules]\n1. Col A: Word, Col B: Meaning, Col C: Example, Col D: Translation, Col E: Part of Speech.\n2. Enclose all values in double quotes ("").\n3. Wrap target words in examples with ** (e.g., I have an **apple**).\n4. Output ONLY the CSV block. No greetings.\n[List] (Paste words here)"`;

  // =========================================================================
  // useEffects
  // =========================================================================

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
        setDoc(doc(db, "users", currentUser.uid), { boxes: safeBoxes, decks: safeDecks }, { merge: true }).catch(e => console.log(e));
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
          if (c.word === 'have')  return { ...c, meaning: t.card2_mean, translation: t.card2_trans };
          if (c.word === 'make')  return { ...c, meaning: t.card3_mean, translation: t.card3_trans };
          if (c.word === 'attack') return { ...c, meaning: t.card4_mean, translation: t.card4_trans };
          return c;
        });
        return { ...d, name: t[d.nameKey], cards: newCards };
      }
      return d;
    }));
  }, [lang, t]);

  // =========================================================================
  // Helpers
  // =========================================================================

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const toggleFullScreen = () => {
    if (!isFullscreen) {
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
      case 'weblio':     url = `https://ejje.weblio.jp/content/${encoded}`; break;
      case 'eijiro':     url = `https://eow.alc.co.jp/search?q=${encoded}`; break;
      case 'goo':        url = `https://dictionary.goo.ne.jp/word/en/${encoded}/`; break;
      case 'cambridge':  url = `https://dictionary.cambridge.org/dictionary/english/${encoded}`; break;
      case 'oxford':     url = `https://www.oxfordlearnersdictionaries.com/definition/english/${encoded}`; break;
      case 'longman':    url = `https://www.ldoceonline.com/dictionary/${encoded}`; break;
      case 'google':     url = `https://translate.google.com/?sl=en&tl=ja&text=${encoded}`; break;
      case 'images':     url = `https://www.google.com/search?tbm=isch&q=${encoded}`; break;
      case 'youglish':   url = `https://youglish.com/pronounce/${encoded}/english`; break;
      case 'monokakido': url = `mkdictionaries://?text=${encoded}`; break;
      default: return;
    }
    if (dictId === 'monokakido') { window.location.href = url; } else { window.open(url, '_blank'); }
  };

  const toggleDictSelection = (dictId) => {
    setActiveDicts(prev => prev.includes(dictId) ? prev.filter(id => id !== dictId) : [...prev, dictId]);
  };

  const moveDictUp = (dictId) => {
    setActiveDicts(prev => {
      const idx = prev.indexOf(dictId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDictDown = (dictId) => {
    setActiveDicts(prev => {
      const idx = prev.indexOf(dictId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const shuffleCurrentDeck = () => {
    if(window.confirm(lang === 'ja' ? '現在の束をシャッフルしますか？' : 'Shuffle current deck?')) {
      setDecks(prev => prev.map(d => {
        if(d.id === currentDeckId) {
          const shuffled = [...d.cards].sort(() => Math.random() - 0.5);
          return { ...d, cards: shuffled };
        }
        return d;
      }));
      setCurrentIndex(0); setIsFlipped(false); setShowSettingsMenu(false);
    }
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
      await setDoc(doc(db, "sharedDecks", code), { name: deckToShare.name, cards: deckToShare.cards, authorUid: currentUser.uid, createdAt: Date.now() });
      navigator.clipboard.writeText(code).catch(() => {});
      alert(lang === 'ja' ? `【共有コードを発行しました】\n\n${code}\n\n※クリップボードにコピーされました。` : `[Share Code Generated]\n\n${code}\n\nCopied to clipboard.`);
    } catch(err) {
      alert(lang === 'ja' ? "共有コードの発行に失敗しました。" : "Failed to generate code.");
    } finally { setLoading(false); }
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
        const newDeck = { id: Date.now(), boxId: currentBoxId, name: `${sharedData.name} ${lang === 'ja' ? '(共有)' : '(Shared)'}`, lastStudied: null, lastRecordTime: null, cards: importedCards };
        setDecks(prev => [...prev, newDeck]);
        setToastMessage(lang === 'ja' ? `🎉 「${sharedData.name}」をダウンロードしました！` : `🎉 Downloaded "${sharedData.name}"!`);
        setTimeout(() => setToastMessage(''), 3000);
      } else { alert(lang === 'ja' ? "コードが見つかりません。" : "Code not found."); }
    } catch(err) { alert(lang === 'ja' ? "ダウンロードに失敗しました。" : "Download failed.");
    } finally { setLoading(false); }
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

  const playAudio = useCallback((text) => {
    if (isMuted || !text) return;
    const cleanWord = String(text).replace(/\*\*/g, '').replace(/[〜…~]/g, '').trim();
    if (!cleanWord) return;
    let rate = 1.0;
    if (displaySeconds < 2.0) rate = 1.0 + ((2.0 - displaySeconds) / 2.0) * 0.5;
    else if (displaySeconds > 2.0) rate = 1.0 - ((displaySeconds - 2.0) / 2.0) * 0.2;
    rate = Math.max(0.5, Math.min(rate, 1.5));
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      const isJapaneseText = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(cleanWord);
      utterance.lang = isJapaneseText ? 'ja-JP' : 'en-US';
      utterance.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const targetVoices = voices.filter(v => v.lang.startsWith(isJapaneseText ? 'ja' : 'en'));
      const premiumVoice = targetVoices.find(v => v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Siri') || v.name.includes('Samantha') || v.name.includes('Alex') || v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Google US English') || v.name.includes('Google 日本語'));
      if (premiumVoice) utterance.voice = premiumVoice;
      else if (targetVoices.length > 0) utterance.voice = targetVoices[0];
      window.speechSynthesis.speak(utterance);
    }
  }, [displaySeconds, isMuted]);

  const stopPodcast = useCallback(() => {
    isPodPlayingRef.current = false; setIsPodPlaying(false); window.speechSynthesis.cancel();
  }, []);

  const runPodcast = useCallback(async () => {
    if (!isPodPlayingRef.current) return;
    if (podIndexRef.current >= studyCards.length) { stopPodcast(); return; }
    const card = studyCards[podIndexRef.current];
    setPodIndex(podIndexRef.current);
    const speakAndWait = (text, langStr) => new Promise(resolve => {
      if (!isPodPlayingRef.current) return resolve();
      const u = new SpeechSynthesisUtterance(text); u.lang = langStr; u.rate = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const targetVoices = voices.filter(v => v.lang.startsWith(langStr.substring(0, 2)));
      const premiumVoice = targetVoices.find(v => v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Siri') || v.name.includes('Samantha') || v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Google US English') || v.name.includes('Google 日本語'));
      if (premiumVoice) u.voice = premiumVoice; else if (targetVoices.length > 0) u.voice = targetVoices[0];
      u.onend = resolve; u.onerror = resolve; window.speechSynthesis.speak(u);
    });
    const wait = (ms) => new Promise(res => setTimeout(res, ms));
    const cleanWord = String(card.word).replace(/\*\*/g, '').replace(/[〜…~]/g, '').trim();
    await speakAndWait(cleanWord, 'en-US');
    if (!isPodPlayingRef.current) return;
    if (podOpts.ja && card.meaning) { await wait(podOpts.gap * 1000); if (!isPodPlayingRef.current) return; const cleanMeaning = cleanText(card.meaning.split('/')[0]); await speakAndWait(cleanMeaning, 'ja-JP'); }
    if (podOpts.ex && card.example) { await wait(podOpts.gap * 1000); if (!isPodPlayingRef.current) return; const cleanEx = card.example.replace(/\*\*/g, ''); await speakAndWait(cleanEx, 'en-US'); }
    await wait(podOpts.gap * 1000);
    if (!isPodPlayingRef.current) return;
    podIndexRef.current += 1; runPodcast();
  }, [studyCards, podOpts, stopPodcast]);

  const startPodcast = () => {
    if(studyCards.length === 0) return alert(lang === 'ja' ? '学習する単語がありません。' : 'No words to study.');
    window.speechSynthesis.cancel(); podIndexRef.current = 0; isPodPlayingRef.current = true; setIsPodPlaying(true); runPodcast();
  };

  const handleCardFlip = () => {
    stopAutoPlayIfActive();
    setIsFlipped(prev => !prev);
    setShowDeepDive(false);
  };

  const handleNextCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex((currentIndex + 1) % studyCards.length); }, [currentIndex, studyCards]);
  const handlePrevCard = useCallback((e) => { if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex((currentIndex - 1 + studyCards.length) % studyCards.length); }, [currentIndex, studyCards]);
  const handleRepeat = () => { stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setShowDeepDive(false); setStudyTime(0); setHasRecorded(false); playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; };

  useEffect(() => {
    if (studyCards.length === 0 || isCompleted || view !== 'study' || isBulkMode || showPodcast) return;
    const currentCard = studyCards[currentIndex];
    if (!currentCard) return;
    let shouldPlay = (qLang === 'en' && !isFlipped) || (qLang === 'ja' && isFlipped);
    if (shouldPlay && (playedRef.current.index !== currentIndex || playedRef.current.flipped !== isFlipped || playedRef.current.lang !== qLang || playedRef.current.type !== qType)) {
      playAudio((qType === 'example' && currentCard.example) ? currentCard.example : currentCard.word);
      playedRef.current = { index: currentIndex, flipped: isFlipped, lang: qLang, type: qType };
    }
  }, [currentIndex, isFlipped, qLang, qType, studyCards, isCompleted, view, isBulkMode, playAudio, showPodcast]);

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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || view !== 'study' || isBulkMode || showPodcast) return;
      unlockAudio();
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stopAutoPlayIfActive(); setIsFlipped(p => !p); setShowDeepDive(false); }
      else if (e.code === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); handleNextCard(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevCard(); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isBulkMode, isAutoPlaying, handleNextCard, handlePrevCard, unlockAudio, showPodcast]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let timer = null;
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted && !showPodcast) {
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
  }, [isAutoPlaying, isFlipped, currentIndex, displaySeconds, studyCards.length, isCompleted, isFrontOnlyAuto, showPodcast]);

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
    setSelectedForDelete(prev => { const next = new Set(prev); if (next.has(word)) next.delete(word); else next.add(word); return next; });
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

  const shareBox = async (e, box) => {
    e.stopPropagation();
    if (!currentUser) return alert(lang === 'ja' ? "共有するにはログインが必要です。" : "Login required to share.");
    const decksInBox = decks.filter(d => d.boxId === box.id && d.cards && d.cards.length > 0);
    if (decksInBox.length === 0) return alert(lang === 'ja' ? "共有できる束がありません。" : "No decks to share.");
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const allCards = decksInBox.flatMap(d => d.cards.map(c => ({ ...c, _deck: d.name })));
      await setDoc(doc(db, "sharedDecks", code), { name: box.name, cards: allCards, authorUid: currentUser.uid, createdAt: Date.now() });
      navigator.clipboard.writeText(code).catch(() => {});
      alert(lang === 'ja' ? `【共有コードを発行しました】\n\n${code}\n\n※クリップボードにコピーされました。` : `[Share Code Generated]\n\n${code}\n\nCopied to clipboard.`);
    } catch(err) {
      alert(lang === 'ja' ? "共有コードの発行に失敗しました。" : "Failed to generate code.");
    } finally { setLoading(false); }
  };

  const openDeck = (id) => {
    unlockAudio(); setCurrentIndex(0); setIsFlipped(false); setShowDeepDive(false); setHasRecorded(false);
    setIsAutoPlaying(false); setCurrentDeckId(id); setView('study');
    setIsDeleteMode(false); setSelectedForDelete(new Set()); playedRef.current = { index: 0, flipped: false, lang: qLang, type: qType };
  };

  const closeDeck = useCallback(() => {
    const isDocFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isDocFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    setIsFullscreen(false);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); stopPodcast(); setShowPodcast(false); setCurrentDeckId(null); setView('decks');
    setIsDeleteMode(false); setSelectedForDelete(new Set()); setShowDeepDive(false);
    setShowOverview(false); setOvSelected(new Set()); setOvTab('study');
  }, [currentDeckId, stopPodcast]);

  const handleTouchStart = (e) => {
    unlockAudio();
    const card = e.target.closest('.card-container');
    if (card) { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }
    else { touchStartX.current = null; touchStartY.current = null; }
  };
  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) handleNextCard(); else handlePrevCard();
    }
    touchStartX.current = null; touchEndX.current = null;
  };

  const handleClick = () => unlockAudio();

  // =========================================================================
  // UI Helpers
  // =========================================================================

  const getPosColors = (pos) => {
    switch (pos) {
      case '名詞': case 'Noun':        return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      case '動詞': case 'Verb':        return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
      case '形容詞': case 'Adjective': return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
      case '副詞': case 'Adverb':      return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
      case '代名詞': case 'Pronoun':   return { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
      case '前置詞': case 'Preposition': case '接続詞': case 'Conjunction': return { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' };
      case '熟語': case 'Idiom':       return { color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' };
      default: return null;
    }
  };

  const getPosBadgeStyle = (pos) => {
    const c = getPosColors(pos) || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
    return { position: 'absolute', top: '12px', left: '12px', padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', zIndex: 10, border: `2px solid ${c.border}`, color: c.color, backgroundColor: c.bg };
  };

  // =========================================================================
  // renderMiniCard
  // =========================================================================

  const renderMiniCard = (c, isMemorizedList, index = null, uid = null) => {
    const isSelected = selectedForDelete.has(c.word);
    const miniColors = c.pos ? getPosColors(c.pos) : null;
    return (
      <div key={uid} className={`mini-card ${isDeleteMode && isSelected ? 'selected-for-delete' : ''}`}
        style={{ ...(miniColors ? { borderLeft: `5px solid ${miniColors.color}` } : {}), ...(isDeleteMode && isSelected ? { backgroundColor: '#fff0f0', borderColor: '#ffcccc' } : {}) }}
        onClick={() => {
          if (isDeleteMode) toggleDeleteSelection(c.word);
          else if (!isMemorizedList && index !== null) { stopAutoPlayIfActive(); setIsFlipped(false); setShowDeepDive(false); setCurrentIndex(index - 1); }
        }}>
        <div className="mini-card-header">
          {isDeleteMode && <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '8px', pointerEvents: 'none'}} />}
          {!isDeleteMode && index !== null && <span className="mini-index" style={{marginRight:'5px', fontWeight:'bold', flexShrink:0}}>{index}.</span>}
          <div className="mini-text-container">
            <span className="mini-word" style={{ fontWeight: 'bold', color: '#334155' }}>{c.word}</span>
            <span className="mini-meaning" style={{ fontSize: '13px', color: '#64748b' }}>{c.meaning}</span>
          </div>
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

  // =========================================================================
  // renderDeckCard
  // =========================================================================

  const renderDeckCard = (deck) => {
    const status = getEbbinghausStatus(deck);
    return (
      <div key={deck.id} data-id={deck.id} className={`deck-bundle ${status.shake ? 'polite-shake-once' : ''}`} onClick={() => openDeck(deck.id)}>
        <div className="deck-paper stack-bottom"></div>
        <div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          <h3 className="deck-name" title={deck.name}>
            {deck.name}
            <button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button>
            <button className="inline-edit-btn" onClick={(e) => shareDeck(e, deck.id)} style={{ marginLeft: '5px' }}>🔗</button>
          </h3>
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>
          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini">
              <span>🗂 {(deck.cards || []).length}{lang==='ja'?'枚':' cards'}</span>
              {deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}
              {deck.lastRecordTime !== null && <span>⏱ {(lang==='ja'?'最速 ':'Best ')}{formatTime(deck.lastRecordTime)}</span>}
              <button className="inline-edit-btn" onClick={(e) => shareDeck(e, deck.id)} title={lang==='ja'?'共有コードを発行':'Generate share code'}>🔗</button>
            </div>
          </div>
          {(deck.cards || []).length > 0 && (deck.cards || []).every(c => c.isMemorized) && <div className="memorized-stamp">{lang==='ja'?'PERFECT':'PERFECT'}</div>}
        </div>
        <div className="rubber-band"></div>
      </div>
    );
  };

  // =========================================================================
  // renderCardFront
  // =========================================================================

  const renderCardFront = (card, isFullscreen) => {
    if (!card) return null;
    const fWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '';
    const fMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fExEn = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(24px, 4.5vw, 36px)';
    const fExJa = isFullscreen ? 'clamp(24px, 4vw, 48px)' : 'clamp(20px, 3.2vw, 28px)';
    const isJapanese = qLang === 'ja';
    const posColors = card.pos ? getPosColors(card.pos) : null;
    const markerColor = posColors ? posColors.border : null;

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: (isJapanese && card.pos) ? '52px' : '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={getPosBadgeStyle(card.pos)}>{card.pos}</span>}
        {qType === 'word' ? (
          qLang === 'en'
            ? <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><h1 className="word-text" style={{ textAlign: 'left', margin: 0, fontSize: fWord, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1></div>
            : <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><div className="core-meaning-large" style={{ textAlign: 'left', margin: 0, fontSize: fMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>{cleanText((card.meaning || '').split('/')[0])}</div></div>
        ) : (
          qLang === 'en'
            ? <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fExEn, lineHeight: '1.8', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', width: '100%', display: 'inline-block', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '', markerColor)}</p></div>
            : <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fExJa, lineHeight: '1.8', fontWeight: 'bold', color: '#334155', width: '100%', display: 'inline-block'}}>{cleanTranslation(card.translation)}</p></div>
        )}
        {/* 辞書ボタン（右下） */}
        {activeDicts.length > 0 && (
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeepDive(!showDeepDive); }}
              style={{ background: showDeepDive ? '#334155' : '#f1f5f9', border: '1px solid', borderColor: showDeepDive ? '#334155' : '#cbd5e1', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', color: showDeepDive ? '#fff' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              onMouseOver={e => { if (!showDeepDive) { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}}
              onMouseOut={e => { if (!showDeepDive) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}}
              title={lang==='ja'?'辞書で調べる':'Dictionary'}
            >{showDeepDive ? '✕' : '🔍'}</button>
            {showDeepDive && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0', minWidth: '140px' }}>
                {activeDicts.map(dictId => {
                  const dict = DICTIONARIES.find(d => d.id === dictId);
                  if (!dict) return null;
                  return (
                    <button key={dictId}
                      onClick={(e) => { handleOpenDict(e, dictId, card.word); setShowDeepDive(false); }}
                      style={{ background: 'transparent', border: 'none', padding: '8px 10px', fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s', width: '100%', textAlign: 'left' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    ><span style={{fontSize: '16px'}}>{dict.icon}</span> {dict.name}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // renderCardBack
  // =========================================================================

  const renderCardBack = (card, isFullscreen) => {
    if (!card) return null;
    const fWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '48px';
    const fMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fExEn = isFullscreen ? 'clamp(24px, 4vw, 40px)' : '';
    const fExJa = isFullscreen ? 'clamp(20px, 3.5vw, 36px)' : '';
    const fExModeJa = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(22px, 3.5vw, 30px)';
    const fExModeEn = isFullscreen ? 'clamp(32px, 5.5vw, 64px)' : 'clamp(26px, 4vw, 36px)';
    const isJapanese = qLang === 'en';
    const posColors = card.pos ? getPosColors(card.pos) : null;
    const markerColor = posColors ? posColors.border : null;

    return (
      <div className="back-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: (isJapanese && card.pos) ? '52px' : '20px', paddingBottom: '60px', boxSizing: 'border-box', overflowY: 'auto' }}>
        {isJapanese && card.pos && <span style={getPosBadgeStyle(card.pos)}>{card.pos}</span>}

        {/* メインコンテンツ */}
        {qType === 'word' ? (
          <>
            {qLang === 'en'
              ? <div className="meaning-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: 0, padding: 0, border: 'none' }}>
                  <div className="core-meaning-large" style={{ textAlign: 'left', fontSize: fMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>
                    {String(card.meaning || '').split('/').map((m, i) => <div key={i} className="meaning-line" style={{textAlign: 'left'}}>{cleanText(m)}</div>)}
                  </div>
                </div>
              : <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <h1 className="word-text" style={{textAlign: 'left', fontSize: fWord, margin: 0, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1>
                </div>
            }
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
              {qLang === 'en'
                ? <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fExModeJa, color: '#1e293b', fontWeight: 'bold', lineHeight: 1.8}}>{renderHighlightedText(card.translation || '', markerColor)}</p></div>
                : <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}><p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fExModeEn, fontWeight: 'bold', color: '#1e293b', lineHeight: 1.5, fontFamily: '"Times New Roman", Times, serif', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); playAudio(card.example); }}>{renderHighlightedText(card.example || '', markerColor)}</p></div>
              }
            </div>
            {showWordOnExMode && (
              <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', gap:'15px', opacity: 0.7, marginTop: isFullscreen ? '40px' : '25px', width: '100%' }}>
                <div className="word-text" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(32px, 5vw, 56px)' : '18px', fontWeight:'bold', margin: 0, cursor: 'pointer', color:'#333', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</div>
                <div className="core-meaning-large" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(24px, 4vw, 40px)' : '15px', color:'#64748b', fontWeight:'bold', margin: 0, display: 'inline-block', maxWidth: '100%'}}>{cleanText((card.meaning || '').split('/')[0])}</div>
              </div>
            )}
          </div>
        )}

        {/* ★ Deep Dive ボタン（右下） */}
        {activeDicts.length > 0 && (
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeepDive(!showDeepDive); }}
              style={{ background: showDeepDive ? '#334155' : '#f1f5f9', border: '1px solid', borderColor: showDeepDive ? '#334155' : '#cbd5e1', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', color: showDeepDive ? '#fff' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              onMouseOver={e => { if (!showDeepDive) { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}}
              onMouseOut={e => { if (!showDeepDive) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}}
              title={lang==='ja'?'辞書で調べる':'Dictionary'}
            >
              {showDeepDive ? '✕' : '🔍'}
            </button>
            {showDeepDive && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0', minWidth: '140px' }}>
                {activeDicts.map(dictId => {
                  const dict = DICTIONARIES.find(d => d.id === dictId);
                  if(!dict) return null;
                  return (
                    <button key={dictId}
                      onClick={(e) => { handleOpenDict(e, dictId, card.word); setShowDeepDive(false); }}
                      style={{ background: 'transparent', border: 'none', padding: '8px 10px', fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s', width: '100%', textAlign: 'left' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{fontSize: '16px'}}>{dict.icon}</span> {dict.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // ★ renderOverview — 全カード俯瞰モード
  // =========================================================================

  const renderOverview = () => {
    const toggleOvSelect = (word) => {
      setOvSelected(prev => {
        const next = new Set(prev);
        next.has(word) ? next.delete(word) : next.add(word);
        return next;
      });
    };

    const bulkMasterize = () => {
      if (ovSelected.size === 0) return;
      setDecks(prev => prev.map(d =>
        d.id !== currentDeckId ? d : {
          ...d, cards: d.cards.map(c =>
            ovSelected.has(c.word) ? { ...c, isMemorized: true } : c
          )
        }
      ));
      setOvSelected(new Set());
      setToastMessage(lang === 'ja' ? `✅ ${ovSelected.size}語を暗記済みに移動しました` : `✅ Moved ${ovSelected.size} words to mastered`);
      setTimeout(() => setToastMessage(''), 3000);
    };

    const bulkDelete = () => {
      if (ovSelected.size === 0) return;
      if (!window.confirm(lang === 'ja' ? `選択した ${ovSelected.size}語を削除しますか？` : `Delete ${ovSelected.size} selected words?`)) return;
      setDecks(prev => prev.map(d =>
        d.id !== currentDeckId ? d : { ...d, cards: d.cards.filter(c => !ovSelected.has(c.word)) }
      ));
      setOvSelected(new Set());
    };

    const displayCards = ovTab === 'study' ? studyCards : memorizedCards;

    const posColorMap = {
      '名詞': '#2563eb', 'Noun': '#2563eb',
      '動詞': '#dc2626', 'Verb': '#dc2626',
      '形容詞': '#16a34a', 'Adjective': '#16a34a',
      '副詞': '#d97706', 'Adverb': '#d97706',
      '熟語': '#4f46e5', 'Idiom': '#4f46e5',
      '代名詞': '#0891b2', 'Pronoun': '#0891b2',
      '前置詞': '#9333ea', 'Preposition': '#9333ea',
      '接続詞': '#9333ea', 'Conjunction': '#9333ea',
    };

    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,20,0.88)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={() => setShowOverview(false)}
      >
        {/* ── ヘッダー ── */}
        <div
          style={{ padding: '14px 20px', background: '#0d0f14', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {/* タブ */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {[
                { key: 'study',   label: lang === 'ja' ? `学習中 (${studyCards.length})` : `Learning (${studyCards.length})` },
                { key: 'mastered', label: lang === 'ja' ? `暗記済 (${memorizedCards.length})` : `Mastered (${memorizedCards.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => { setOvTab(tab.key); setOvSelected(new Set()); }}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.18s', background: ovTab === tab.key ? '#fff' : 'transparent', color: ovTab === tab.key ? '#0d0f14' : 'rgba(255,255,255,0.45)' }}
                >{tab.label}</button>
              ))}
            </div>

            {/* 選択中バッジ */}
            {ovSelected.size > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#E8294A', background: 'rgba(232,41,74,0.15)', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                {ovSelected.size}{lang === 'ja' ? '件選択中' : ' selected'}
              </span>
            )}
          </div>

          {/* 右側アクション */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {/* 全選択 / 全解除 */}
            <button
              onClick={() => {
                if (ovSelected.size === displayCards.length) {
                  setOvSelected(new Set());
                } else {
                  setOvSelected(new Set(displayCards.map(c => c.word)));
                }
              }}
              style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: ovSelected.size === displayCards.length ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >{ovSelected.size === displayCards.length ? (lang === 'ja' ? '全解除' : 'Deselect All') : (lang === 'ja' ? '全選択' : 'Select All')}</button>
            {ovSelected.size > 0 && ovTab === 'study' && (
              <button onClick={bulkMasterize}
                style={{ height: '34px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#1DB86E', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}
              >{lang === 'ja' ? '✅ 暗記済みに移動' : '✅ Mark Mastered'}</button>
            )}
            {ovSelected.size > 0 && (
              <button onClick={bulkDelete}
                style={{ height: '34px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#E8294A', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}
              >{lang === 'ja' ? '🗑 削除' : '🗑 Delete'}</button>
            )}
            {ovSelected.size > 0 && (
              <button onClick={() => setOvSelected(new Set())}
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >{lang === 'ja' ? '解除' : 'Clear'}</button>
            )}
            <button onClick={() => setShowOverview(false)}
              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        </div>

        {/* 操作ヒント */}
        <div style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif" }}>
            {lang === 'ja'
              ? 'カードをタップ → そのカードへ移動　／　長押し or チェック → 複数選択して一括操作'
              : 'Tap card → jump to it  ／  Long-press or check → multi-select for bulk actions'}
          </p>
        </div>

        {/* ── カードグリッド ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }} onClick={e => e.stopPropagation()}>
          {displayCards.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '60px', fontSize: '14px' }}>
              {lang === 'ja' ? 'カードがありません' : 'No cards'}
            </p>
          ) : (
            <div className="ov-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {displayCards.map((c, i) => {
                const isCurrent = ovTab === 'study' && i === currentIndex;
                const isSelected = ovSelected.has(c.word);
                const posColor = c.pos ? (posColorMap[c.pos] || '#6b7280') : null;

                return (
                  <div
                    key={`ov-${ovTab}-${i}`}
                    className="ov-card"
                    onClick={() => {
                      if (ovTab === 'study') {
                        setCurrentIndex(i);
                        setIsFlipped(false);
                        setShowDeepDive(false);
                        setShowOverview(false);
                      }
                    }}
                    style={{
                      background: isSelected ? 'rgba(37,99,235,0.15)' : (ovTab === 'mastered' ? 'rgba(29,184,110,0.08)' : '#ffffff'),
                      borderRadius: '14px',
                      padding: '12px',
                      cursor: ovTab === 'study' ? 'pointer' : 'default',
                      border: isSelected
                        ? '2px solid #2563EB'
                        : isCurrent
                          ? '2px solid #E8294A'
                          : ovTab === 'mastered'
                            ? '1.5px solid rgba(29,184,110,0.2)'
                            : '1.5px solid #e5e7eb',
                      borderTop: posColor && ovTab === 'study' ? `3px solid ${posColor}` : undefined,
                      boxShadow: isCurrent ? '0 0 0 3px rgba(232,41,74,0.14)' : isSelected ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 2px 8px rgba(0,0,0,0.07)',
                      position: 'relative',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { if (ovTab === 'study' && !isSelected) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {/* 選択チェックボックス（右上） */}
                    <div
                      onClick={e => { e.stopPropagation(); toggleOvSelect(c.word); }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '18px', height: '18px', borderRadius: '5px',
                        border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                        background: isSelected ? '#2563EB' : 'rgba(255,255,255,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.15s', zIndex: 5,
                        fontSize: '11px', color: '#fff', fontWeight: 900,
                      }}
                    >{isSelected ? '✓' : ''}</div>

                    {/* 現在地ドット */}
                    {isCurrent && !isSelected && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', width: '7px', height: '7px', borderRadius: '50%', background: '#E8294A', boxShadow: '0 0 6px rgba(232,41,74,0.6)' }} />
                    )}

                    {/* 番号 */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: ovTab === 'mastered' ? 'rgba(255,255,255,0.3)' : '#9ca3af', marginBottom: '6px', fontFamily: "'DM Mono', monospace" }}>#{i + 1}</div>

                    {/* 単語 */}
                    <div style={{ fontSize: '16px', fontWeight: 900, color: ovTab === 'mastered' ? '#fff' : '#0d0f14', marginBottom: '4px', lineHeight: 1.2, wordBreak: 'break-word', fontFamily: "'Outfit', sans-serif', letterSpacing: '-0.3px", paddingRight: '20px' }}>
                      {c.word}
                    </div>

                    {/* 意味 */}
                    <div style={{ fontSize: '11px', color: ovTab === 'mastered' ? 'rgba(255,255,255,0.4)' : '#6b7280', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: c.memo ? '6px' : 0 }}>
                      {c.meaning}
                    </div>

                    {/* メモ */}
                    {c.memo && (
                      <div style={{ fontSize: '10px', color: '#b45309', background: '#fffbeb', borderRadius: '5px', padding: '3px 7px', lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        💡 {c.memo}
                      </div>
                    )}

                    {/* アクションボタン */}
                    {ovTab === 'study' && (
                      <div
                        className="ov-card-actions"
                        style={{ display: 'flex', gap: '4px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* 暗記済みに移動 */}
                        <button
                          onClick={() => {
                            toggleMemorize(null, c, true);
                            setToastMessage(lang === 'ja' ? `✅ "${c.word}" を暗記済みに移動` : `✅ "${c.word}" marked as mastered`);
                            setTimeout(() => setToastMessage(''), 2500);
                          }}
                          style={{ flex: 1, height: '26px', borderRadius: '6px', border: 'none', background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          title={lang === 'ja' ? '暗記済みに移動' : 'Mark as mastered'}
                          onMouseOver={e => { e.currentTarget.style.background = '#dcfce7'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                        >✅</button>

                        {/* 編集 */}
                        <button
                          onClick={() => {
                            setEditingCard({ originalCard: c, originalWord: c.word, word: c.word, meaning: c.meaning, example: c.example || '', translation: c.translation || '', pos: c.pos || '', memo: c.memo || '' });
                            setShowOverview(false);
                          }}
                          style={{ flex: 1, height: '26px', borderRadius: '6px', border: 'none', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          title={lang === 'ja' ? '編集' : 'Edit'}
                          onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4338ca'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                        >✏️</button>

                        {/* 削除 */}
                        <button
                          onClick={() => {
                            if (!window.confirm(lang === 'ja' ? `「${c.word}」を削除しますか？` : `Delete "${c.word}"?`)) return;
                            setDecks(prev => prev.map(d =>
                              d.id !== currentDeckId ? d : { ...d, cards: d.cards.filter(card => card !== c) }
                            ));
                          }}
                          style={{ flex: 1, height: '26px', borderRadius: '6px', border: 'none', background: '#f8fafc', color: '#94a3b8', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          title={lang === 'ja' ? '削除' : 'Delete'}
                          onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#E8294A'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; }}
                        >✕</button>
                      </div>
                    )}

                    {/* 暗記済みタブ: 学習中に戻すボタン */}
                    {ovTab === 'mastered' && (
                      <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleMemorize(null, c, false)}
                          style={{ width: '100%', height: '26px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >{lang === 'ja' ? '↩ 学習中に戻す' : '↩ Move to Learning'}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // Main Rendering
  // =========================================================================

  if (isAuthLoading) return <div className="app-container gentle-bg desk-view" style={{justifyContent:'center', height:'100vh'}}><h2 style={{color:'#7f8c8d'}}>{t.loading}</h2></div>;

  if (!currentUser) return (
    <div className="login-screen-bg">
      <div className="login-top-right">
        <button className="manual-link-btn" onClick={() => setView('manual')}>{lang === 'ja' ? '📖 マニュアル' : '📖 Manual'}</button>
        <button className="login-lang-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{lang === 'ja' ? '🌐 English' : '🌐 日本語'}</button>
      </div>
      <div className="login-hero-section">
        <h1 className="login-burning-text">{t.appTitle}</h1>
        <h2 className="login-burning-subtitle">{t.appSubtitle}</h2>
        <button className="login-google-btn" onClick={handleLogin}>{t.loginWithGoogle || (lang==='ja'?'Googleでログイン':'Login with Google')}</button>
        {isInAppBrowser && <div style={{ marginTop: '20px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '8px', maxWidth: '350px', margin: '20px auto 0', lineHeight: '1.5' }}>{lang==='ja'?'⚠️ LINEやInstagramのブラウザではログインエラーになる場合があります。「Safari/ブラウザで開く」を選択してください。':'⚠️ Login may fail in in-app browsers. Please open in Safari or Chrome.'}</div>}
      </div>
    </div>
  );

  if (view === 'manual') return <Manual t={t} setView={setView} />;
  if (view === 'printPreview') return <PrintPreview t={t} setView={setView} printCards={printCards} printMode={printMode} activeDeck={activeDeck} shufflePrintCards={shufflePrintCards} handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd} handleClick={unlockAudio} />;
  if (view === 'test') return <div className="app-container gentle-bg desk-view" onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><TestMode t={t} setView={setView} allCards={allCards} /></div>;

  // =========================================================================
  // BOXES VIEW
  // =========================================================================

  if (view === 'boxes') return (
    <div className="app-container gentle-bg desk-view" style={{padding: 0}} onClick={unlockAudio} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
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
            <p style={{fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5'}}>{lang === 'ja' ? 'カードの裏面に表示する辞書を選んでください。' : 'Select dictionaries to show on the back of cards.'}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '-12px 0 12px', lineHeight: '1.4' }}>{lang === 'ja' ? '▲▼で表示順を変更できます' : 'Use ▲▼ to reorder'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '6px' }}>
              {/* 有効な辞書（順番通り） */}
              {activeDicts.map((dictId, idx) => {
                const dict = DICTIONARIES.find(d => d.id === dictId);
                if (!dict) return null;
                return (
                  <div key={dict.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <button onClick={() => moveDictUp(dictId)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '11px', color: idx === 0 ? '#cbd5e1' : '#334155', padding: '0 4px', lineHeight: 1 }}>▲</button>
                      <button onClick={() => moveDictDown(dictId)} disabled={idx === activeDicts.length - 1} style={{ background: 'none', border: 'none', cursor: idx === activeDicts.length - 1 ? 'default' : 'pointer', fontSize: '11px', color: idx === activeDicts.length - 1 ? '#cbd5e1' : '#334155', padding: '0 4px', lineHeight: 1 }}>▼</button>
                    </div>
                    <span style={{ flex: 1, fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>{dict.icon} {dict.name}</span>
                    <input type="checkbox" checked={true} onChange={() => toggleDictSelection(dictId)} style={{ transform: 'scale(1.2)', accentColor: '#16a34a' }} />
                  </div>
                );
              })}
              {/* 無効な辞書 */}
              {DICTIONARIES.filter(d => !activeDicts.includes(d.id)).length > 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: '4px 0 2px' }}>{lang === 'ja' ? '── 未選択 ──' : '── Disabled ──'}</div>
              )}
              {DICTIONARIES.filter(d => !activeDicts.includes(d.id)).map(dict => (
                <label key={dict.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', cursor: 'pointer', border: '1px solid #e2e8f0', opacity: 0.6 }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>{dict.icon} {dict.name}</span>
                  <input type="checkbox" checked={false} onChange={() => toggleDictSelection(dict.id)} style={{ transform: 'scale(1.2)' }} />
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
        <h1 className="burning-text">{t.appTitle}</h1>
        <h2 className="burning-subtitle">{t.appSubtitle}</h2>
      </div>

      {/* ── 箱を作る ── */}
      <div style={{ width: '92%', maxWidth: '760px', margin: '16px auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', border: '1.5px dashed #e2e8f0', borderRadius: '14px', padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>📦</span>
            <input
              type="text"
              placeholder={t.boxPlaceholder || (lang==='ja'?'新しい箱の名前を入力...':'Box Name')}
              value={newBoxName}
              onChange={(e) => setNewBoxName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNewBox()}
              style={{
                flex: 1, minWidth: 0, padding: '10px 14px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                fontSize: '14px', background: '#f8fafc', color: '#334155',
                fontFamily: "'Noto Sans JP', sans-serif", outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#E8294A'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(232,41,74,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={createNewBox}
              style={{
                flex: 1, height: '40px',
                background: '#E8294A', color: '#fff', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 3px 10px rgba(232,41,74,0.3)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.88)'}
              onMouseOut={e => e.currentTarget.style.filter = 'none'}
            >{t.createBtn || (lang==='ja'?'+ 作る':'+ Create')}</button>
            <button
              onClick={importDeckByCode}
              disabled={loading}
              style={{ flex: 1, height: '40px', borderRadius: '10px', border: 'none', background: '#7C3AED', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 2px 8px rgba(124,58,237,0.25)', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={e => e.currentTarget.style.filter = 'none'}
            >🔗 {lang==='ja'?'共有コード':'Share Code'}</button>
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
              <div className={`storage-box ${isOpening ? 'opening-anim' : ''}`} onClick={() => openBox(box.id)}>
                <div className="box-lid-line">
                  <div className="box-top-actions" onClick={e => e.stopPropagation()}>
                    <span className="box-instruction">{hasReview ? <span className="alert-text">{t.review || (lang==='ja'?'復習！':'Review!')}</span> : (t.tapToOpen || (lang==='ja'?'👇タップで開く':'👇Tap to open'))}</span>
                    <button className="box-icon-btn" onClick={(e) => shareBox(e, box)} title={lang==='ja'?'共有':'Share'}>🔗</button>
                    <button className="box-icon-btn" onClick={(e) => renameBox(e, box.id, box.name)}>✏️</button>
                    <button className="box-icon-btn delete-box-btn" onClick={(e) => deleteBox(e, box.id)}>✖</button>
                  </div>
                </div>
                <div className="box-label-wrapper"><span className="box-label" title={box.name}>{box.name}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================
  // DECKS + STUDY VIEW
  // =========================================================================

  return (
    <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

      {/* Toast */}
      {toastMessage && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(39, 174, 96, 0.95)', color: '#fff', padding: '20px 40px', borderRadius: '16px', fontWeight: 'bold', zIndex: 10001, fontSize: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'popInOut 3s forwards', textAlign: 'center', whiteSpace: 'nowrap' }}>{toastMessage}</div>}

      {/* ★ 俯瞰モード */}
      {showOverview && renderOverview()}

      {/* Podcast Modal */}
      {showPodcast && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ borderRadius: '24px', padding: '30px', maxWidth: '450px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>{lang === 'ja' ? '🎧 聴き流しモード' : '🎧 Podcast Mode'}</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '25px', lineHeight: '1.6' }}>{lang === 'ja' ? '通学中や就寝前の「画面を見ない学習」に最適です。\n※ブラウザの仕様上、画面を点けたままご利用ください。' : 'Perfect for hands-free learning!\n*Keep screen on due to browser specs.'}</p>
            {!isPodPlaying ? (
              <>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                  <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '15px', fontSize: '15px', textAlign: 'left' }}>{lang === 'ja' ? '読み上げる項目' : 'Read Aloud Items'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', color: '#475569', cursor: 'pointer' }}>
                      <span style={{fontWeight:'bold'}}>🇺🇸 {lang === 'ja' ? '英単語 (固定)' : 'Word (Fixed)'}</span>
                      <input type="checkbox" checked={true} readOnly style={{ transform: 'scale(1.2)' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', color: '#475569', cursor: 'pointer' }}>
                      <span>🇯🇵 {lang === 'ja' ? '日本語訳' : 'Meaning (JP)'}</span>
                      <input type="checkbox" checked={podOpts.ja} onChange={(e) => setPodOpts({...podOpts, ja: e.target.checked})} style={{ transform: 'scale(1.2)' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', color: '#475569', cursor: 'pointer' }}>
                      <span>📝 {lang === 'ja' ? '英語例文' : 'Example'}</span>
                      <input type="checkbox" checked={podOpts.ex} onChange={(e) => setPodOpts({...podOpts, ex: e.target.checked})} style={{ transform: 'scale(1.2)' }} />
                    </label>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#334155', marginTop: '25px', marginBottom: '10px', fontSize: '15px', textAlign: 'left' }}>{lang === 'ja' ? '間隔 (ポーズ): ' : 'Interval: '}{podOpts.gap.toFixed(1)} {lang === 'ja' ? '秒' : 'sec'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>0s</span>
                    <input type="range" min="0" max="3.0" step="0.5" value={podOpts.gap} onChange={(e) => setPodOpts({...podOpts, gap: Number(e.target.value)})} style={{ flexGrow: 1 }} />
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>3s</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="cancel-btn" style={{ flex: 1, padding: '15px', fontSize: '16px' }} onClick={() => setShowPodcast(false)}>{t.cancelBtn || (lang==='ja'?'閉じる':'Close')}</button>
                  <button className="add-btn" style={{ flex: 2, padding: '15px', fontSize: '16px', background: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={startPodcast}>▶️ {lang === 'ja' ? '再生スタート' : 'Start Podcast'}</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>NOW PLAYING... ({podIndex + 1} / {studyCards.length})</div>
                <div style={{ fontSize: 'clamp(32px, 8vw, 50px)', fontWeight: '900', color: '#0f172a', wordBreak: 'break-word', lineHeight: '1.2', marginBottom: '40px' }}>{studyCards[podIndex]?.word}</div>
                <button className="cancel-btn" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '999px', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }} onClick={stopPodcast}>■ {lang === 'ja' ? '停止する' : 'Stop'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>{t.editCardTitle || (lang==='ja'?'カードを編集':'Edit Card')}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq || (lang==='ja'?'英単語 (必須)':'Word (Req)')}</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel || (lang==='ja'?'品詞':'Part of Speech')}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer' }} value={editingCard.pos || ''} onChange={(e) => setEditingCard({...editingCard, pos: e.target.value})}>
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
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>{t.cancelBtn || (lang==='ja'?'キャンセル':'Cancel')}</button>
              <button className="add-btn" onClick={saveEditedCard}>{t.saveBtn || (lang==='ja'?'保存':'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {addingCard && (
        <div className="modal-overlay" onClick={() => setAddingCard(false)} onTouchStart={e => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#27ae60'}}>{t.newCardTitle || (lang==='ja'?'カードを追加':'Add Card')}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq || (lang==='ja'?'英単語 (必須)':'Word (Req)')}</label>
            <input className="modal-input" value={newCardData.word} onChange={(e) => setNewCardData({...newCardData, word: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel || (lang==='ja'?'品詞':'Part of Speech')}</label>
            <select className="modal-input" style={{ appearance: 'menulist', WebkitAppearance: 'menulist', marginBottom: '15px', cursor: 'pointer' }} value={newCardData.pos || ''} onChange={(e) => setNewCardData({...newCardData, pos: e.target.value})}>
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

      {/* ===================== DECKS VIEW ===================== */}
      {view === 'decks' && (() => {
        const boxDecks = decks.filter(d => d.boxId === currentBoxId);
        const unmemorizedDecks = boxDecks.filter(d => !(d.cards.length > 0 && d.cards.every(c => c.isMemorized)));
        const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.cards.every(c => c.isMemorized));
        return (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={() => setView('boxes')}>{t.backToHome || (lang==='ja'?'◀ ホームに戻る':'◀ Home')}</button>
              <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
              <div style={{width: '80px'}}></div>
            </div>
            <div className="integrated-creation-area">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {/* 入力欄（常に全幅） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <span className="creation-label" title="Deck">🔖</span>
                  <input
                    type="text"
                    className="creation-row"
                    placeholder={t.deckPlaceholder || (lang==='ja'?'新しい暗記カードの名前を入力...':'New Deck Name')}
                    value={newDeckNameInside}
                    onChange={(e) => setNewDeckNameInside(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()}
                    style={{ flex: 1, minWidth: 0, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', color: '#334155', fontFamily: "'Noto Sans JP', sans-serif", outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = '#E8294A'; e.target.style.boxShadow = '0 0 0 3px rgba(232,41,74,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* ボタン行（2つ均等） */}
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={createNewDeckInsideBox}
                    style={{ flex: 1, height: '40px', borderRadius: '10px', border: 'none', background: '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.18s' }}
                    onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseOut={e => e.currentTarget.style.filter = 'none'}
                  >{t.addBtn || (lang==='ja'?'+ 追加':'+ Add')}</button>
                  <button
                    onClick={importDeckByCode}
                    disabled={loading}
                    style={{ flex: 1, height: '40px', borderRadius: '10px', border: 'none', background: '#7C3AED', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 2px 8px rgba(124,58,237,0.25)', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseOut={e => e.currentTarget.style.filter = 'none'}
                  >🔗 {lang==='ja'?'共有コード':'Share Code'}</button>
                </div>
              </div>
            </div>
            <div className="decks-split-layout">
              <div className="decks-unmemorized-area">
                <h3 className="area-title">{t.unmemTitle || (lang==='ja'?'📖 学習中・未修の束':'📖 To Study')}</h3>
                <p className="area-hint">{t.unmemHint || (lang==='ja'?'※すべての単語を覚えると、暗記済みに移動します。':'Words move to Mastered when memorized.')}</p>
                {unmemorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noUnmem || (lang==='ja'?'束がありません':'No Decks')}</p> : <div className="decks-grid">{unmemorizedDecks.map(renderDeckCard)}</div>}
              </div>
              <div className="decks-memorized-area">
                <h3 className="area-title" style={{color: '#27ae60'}}>{t.memTitle || (lang==='ja'?'🏆 暗記済の束':'🏆 Mastered')}</h3>
                <p className="area-hint">{t.memHint || (lang==='ja'?'※完璧に覚えた束がここに並びます！':'Perfectly memorized decks appear here!')}</p>
                {memorizedDecks.length === 0 ? <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noMem || (lang==='ja'?'まだ暗記済みの束はありません。':'No mastered decks yet.')}</p> : <div className="decks-grid memorized-grid">{memorizedDecks.map(renderDeckCard)}</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================== STUDY VIEW ===================== */}
      {view === 'study' && (
        // ★ サイドパネル廃止 → study-dashboard-solo でカードを中央最大化
        <div className="study-dashboard-solo">
          <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`}>

            {/* 全集中モード: 閉じるボタン（右下に移動） */}
            {isFullscreen && (
              <button onClick={toggleFullScreen} style={{ position: 'absolute', bottom: '24px', right: '24px', width: '44px', height: '44px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.4)', opacity: 0.7, transition: 'opacity 0.2s' }}
                onMouseOver={e => e.currentTarget.style.opacity = 1}
                onMouseOut={e => e.currentTarget.style.opacity = 0.7}
              >✕</button>
            )}

            {/* 通常モード: 上部 */}
            {!isFullscreen && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '6px' }}>
                <button className="back-to-desk-btn" onClick={closeDeck} style={{color: '#7f8c8d', textShadow: 'none', background: 'none'}}>{t.backBtn || (lang==='ja'?'◀ 戻る':'◀ Back')}</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', visibility: isBulkMode ? 'hidden' : 'visible' }}>
                  <button onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? (lang==='ja'?'音声オフ':'Muted') : (lang==='ja'?'音声オン':'Sound on')}
                    style={{ height: '30px', width: '30px', borderRadius: '8px', border: isMuted ? '1px solid #fecaca' : '1px solid #e8ecf2', background: isMuted ? '#fef2f2' : '#f8fafc', color: isMuted ? '#E8294A' : '#64748b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', flexShrink: 0 }}
                  >{isMuted ? '🔇' : '🔊'}</button>
                  <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`}
                    style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 600, background: '#f8fafc', border: '1px solid #e8ecf2', color: '#475569' }}>
                    {formatTime(studyTime)}
                  </div>
                </div>
              </div>
            )}

            {/* ━━━━━━ メインコントロール ━━━━━━ */}
            {!isFullscreen && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 className="study-deck-title" style={{ margin: 0 }}>{activeDeck?.name}</h2>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: '8px', padding: '4px 10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {currentIndex + 1} / {studyCards.length}
                  </span>
                </div>

                {/* ── Row 1: カード管理ボタン（1行）── */}
                {!isBulkMode && !isDeleteMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>

                    {/* カード一覧 */}
                    <button onClick={() => setShowOverview(true)}
                      style={{ height: '34px', padding: '0 12px', borderRadius: '10px', border: 'none', background: '#475569', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(71,85,105,0.2)', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                      onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                      onMouseOut={e => e.currentTarget.style.filter = 'none'}
                    >▦ {lang==='ja'?'一覧':'Cards'}</button>

                    {/* 手動で追加 */}
                    <button onClick={() => setAddingCard(true)}
                      style={{ height: '34px', padding: '0 12px', borderRadius: '10px', border: 'none', background: '#1DB86E', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(29,184,110,0.2)', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                      onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                      onMouseOut={e => e.currentTarget.style.filter = 'none'}
                    >✏ {lang==='ja'?'手動':'Add'}</button>

                    {/* CSVで追加 */}
                    <button onClick={() => setIsBulkMode(true)}
                      style={{ height: '34px', padding: '0 12px', borderRadius: '10px', border: 'none', background: '#F59E0B', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(245,158,11,0.2)', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                      onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                      onMouseOut={e => e.currentTarget.style.filter = 'none'}
                    >⬆ CSV</button>

                    {/* テスト作成（アイコン＋短縮ラベル） */}
                    {allCards.length >= 4 && (
                      <div ref={actionMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setShowActionMenu(!showActionMenu)}
                          style={{ height: '34px', padding: '0 12px', background: '#0891B2', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(8,145,178,0.2)', transition: 'all 0.18s' }}
                          onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                          onMouseOut={e => e.currentTarget.style.filter = 'none'}
                        >🎯 {lang==='ja'?'テスト':'Test'} <span style={{ fontSize: '8px', opacity: 0.7 }}>▼</span></button>
                        {showActionMenu && (
                          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {[
                              { fn: () => setView('test'), icon: '📝', label: lang==='ja'?'テスト':'Test' },
                              { fn: () => openPrintPreview('word'), icon: '🖨', label: lang==='ja'?'単語プリント':'Words' },
                              { fn: () => openPrintPreview('example'), icon: '🖨', label: lang==='ja'?'例文プリント':'Examples' },
                              { fn: () => openPrintPreview('choice'), icon: '🖨', label: lang==='ja'?'4択プリント':'4-Choice' },
                            ].map((item, idx) => (
                              <button key={idx} onClick={() => { item.fn(); setShowActionMenu(false); }}
                                style={{ background: 'none', border: 'none', padding: '9px 12px', fontSize: '13px', fontWeight: 600, color: '#334155', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}
                                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                              >{item.icon} {item.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 全集中 */}
                    <button onClick={toggleFullScreen}
                      style={{ height: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid #fca5a5', background: isFullscreen ? '#ef4444' : '#fff1f2', color: isFullscreen ? '#fff' : '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}
                      onMouseOver={e => { if (!isFullscreen) { e.currentTarget.style.background='#fee2e2'; }}}
                      onMouseOut={e => { if (!isFullscreen) { e.currentTarget.style.background='#fff1f2'; }}}
                    >{isFullscreen ? (lang==='ja'?'× 解除':'× Exit') : (lang==='ja'?'全集中':'Focus')}</button>

                    {/* シャッフル */}
                    <button onClick={shuffleCurrentDeck}
                      title={lang==='ja'?'シャッフル':'Shuffle'}
                      style={{ height: '34px', width: '34px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', flexShrink: 0 }}
                      onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >🔀</button>
                  </div>
                )}

                {/* 削除モード */}
                {!isBulkMode && isDeleteMode && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setIsDeleteMode(false); setSelectedForDelete(new Set()); }} className="cancel-btn" style={{ height: '34px', padding: '0 16px', borderRadius: '10px', fontSize: '13px', margin: 0 }}>{lang==='ja'?'キャンセル':'Cancel'}</button>
                    <button onClick={executeBulkDelete} style={{ height: '34px', padding: '0 16px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700, background: '#E8294A', color: '#fff', cursor: 'pointer' }}>{lang==='ja'?'削除実行':'Delete'} ({selectedForDelete.size})</button>
                  </div>
                )}

              </div>
            )}

            {/* CSV一括追加モード */}
            {!isFullscreen && isBulkMode && (
              <div className="bulk-input-section" style={{ marginTop: '0px', width: '100%', maxWidth: '600px' }}>
                <p className="bulk-hint" style={{fontSize:'16px', color:'#333'}}>{t.csvHint}</p>
                <div className="bulk-file-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
                  <button onClick={downloadTemplate} style={{ backgroundColor: '#f39c12', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', boxSizing: 'border-box', margin: 0 }}>{lang === 'ja' ? '📥 テンプレート(CSV)をダウンロード' : '📥 Download CSV Template'}</button>
                  <label style={{ backgroundColor: '#27ae60', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', boxSizing: 'border-box', margin: 0, textAlign: 'center' }}>
                    {loading ? (t.loading || 'Loading...') : (lang === 'ja' ? '📂 CSVファイルをインポートする' : '📂 Import CSV File')}
                    <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                  </label>
                </div>
                <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5', whiteSpace: 'pre-wrap', textAlign: 'left', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '14px' }}>{chatGptPrompt}</p>
                <div className="bulk-actions" style={{ marginTop: '15px' }}><button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>{t.closeBtn || (lang==='ja'?'閉じる':'Close')}</button></div>
              </div>
            )}

            {/* 全暗記済み */}
            {allCards.length > 0 && studyCards.length === 0 ? (
              <div className="empty-deck-msg" style={{marginTop: '60px'}}>
                <h2 style={{color: '#27ae60'}}>{t.allMemorizedMsg || (lang==='ja'?'🎉 すべて暗記しました！':'🎉 All Mastered!')}</h2>
                <button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>{t.resetBtn || (lang==='ja'?'最初からやり直す':'Reset & Study Again')}</button>
              </div>
            ) : studyCards.length > 0 && !isBulkMode ? (
              <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

                {/* ★ カード本体 */}
                <div className="card-animation-wrapper" key={currentIndex} style={{ width: '100%', maxWidth: '800px', margin: '0 auto', aspectRatio: '1.5 / 1', minHeight: '220px', maxHeight: isFullscreen ? '60vh' : '450px', boxSizing: 'border-box' }}>
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={handleCardFlip} style={{ height: '100%' }}>
                    <div className="card-inner">
                      <div className="card-front">
                        <div className="ring-hole"></div>
                        <button className="memorize-check-btn" onClick={(e) => { e.stopPropagation(); if (studyCards[currentIndex]) { setIsFlipped(false); setShowDeepDive(false); toggleMemorize(e, studyCards[currentIndex], true); } }}>✔</button>
                        {renderCardFront(studyCards[currentIndex], isFullscreen)}
                      </div>
                      <div className="card-back">{renderCardBack(studyCards[currentIndex], isFullscreen)}</div>
                    </div>
                  </div>
                </div>

                {/* 操作パネル */}
                <div style={isFullscreen
                  ? { position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '520px', background: 'rgba(255,255,255,0.97)', padding: '12px 16px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.18)', boxSizing: 'border-box', zIndex: 10000, backdropFilter: 'blur(10px)' }
                  : { background: '#fff', border: '1px solid #e1e4e8', borderRadius: '20px', width: '100%', maxWidth: '520px', margin: '16px auto 0', boxSizing: 'border-box', padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }
                }>
                  {/* ── PC/タブレット: 2行 ── */}
                  <div className="ctrl-hide-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    {/* Row 1: ‹ 自動めくり › ↺ */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={handlePrevCard} style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', fontWeight: 700 }}
                        onMouseOver={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1'; }}
                        onMouseOut={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}
                      >‹</button>
                      <button onClick={(e) => { e.stopPropagation(); if (!isAutoPlaying) playAudio((qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word); setIsAutoPlaying(!isAutoPlaying); }}
                        style={{ flexShrink: 0, padding: '0 18px', height: '36px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', fontFamily: "'Outfit', sans-serif", background: isAutoPlaying ? '#E8294A' : '#2563EB', color: '#fff', boxShadow: isAutoPlaying ? '0 3px 10px rgba(232,41,74,0.3)' : '0 3px 10px rgba(37,99,235,0.25)', minWidth: '110px' }}
                      >{isAutoPlaying ? (lang==='ja'?'■ 停止':'■ Stop') : (lang==='ja'?'▶ 自動めくり':'▶ Auto')}</button>
                      <button onClick={handleNextCard} style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', fontWeight: 700 }}
                        onMouseOver={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1'; }}
                        onMouseOut={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}
                      >›</button>
                      <button onClick={handleRepeat} style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}
                        onMouseOver={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1'; }}
                        onMouseOut={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}
                        title={lang==='ja'?'もう1回':'Restart'}
                      >↺</button>
                    </div>
                    {/* Row 2: 速度スライダー（中央） */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', maxWidth: '400px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>{lang==='ja'?'速度':'SPD'}</span>
                      <input type="range" min="0" max="4.0" step="0.1" value={displaySeconds} onChange={(e) => setDisplaySeconds(Number(e.target.value))} className="speed-slider" style={{ flex: 1, height: '4px', accentColor: '#E8294A' }} />
                      <span style={{ fontSize: '11px', color: '#0d0f14', fontWeight: 800, whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: '38px', textAlign: 'center', background: '#f1f5f9', padding: '3px 7px', borderRadius: '6px' }}>
                        {displaySeconds === 0 ? 'MAX' : `${displaySeconds.toFixed(1)}s`}
                      </span>
                    </div>
                  </div>

                  {/* ── スマホ: 2行レイアウト ── */}
                  <div className="ctrl-mobile-only" style={{ flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {/* スマホ Row1: ナビ・自動めくり・↺・全集中 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <button onClick={handlePrevCard} style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>‹</button>
                      <button onClick={(e) => { e.stopPropagation(); if (!isAutoPlaying) playAudio((qType === 'example' && studyCards[currentIndex]?.example) ? studyCards[currentIndex].example : studyCards[currentIndex]?.word); setIsAutoPlaying(!isAutoPlaying); }}
                        style={{ flex: 1, height: '38px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", background: isAutoPlaying ? '#E8294A' : '#2563EB', color: '#fff', boxShadow: isAutoPlaying ? '0 3px 10px rgba(232,41,74,0.3)' : '0 3px 10px rgba(37,99,235,0.25)' }}
                      >{isAutoPlaying ? (lang==='ja'?'■ 停止':'■ Stop') : (lang==='ja'?'▶ 自動めくり':'▶ Auto')}</button>
                      <button onClick={handleNextCard} style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>›</button>
                      <button onClick={handleRepeat} style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
                    </div>
                    {/* スマホ Row2: スライダー全幅 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>{lang==='ja'?'速度':'SPD'}</span>
                      <input type="range" min="0" max="4.0" step="0.1" value={displaySeconds} onChange={(e) => setDisplaySeconds(Number(e.target.value))} className="speed-slider" style={{ flex: 1, height: '4px', accentColor: '#E8294A' }} />
                      <span style={{ fontSize: '12px', color: '#0d0f14', fontWeight: 800, whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: '40px', textAlign: 'center', background: '#f1f5f9', padding: '4px 8px', borderRadius: '7px' }}>
                        {displaySeconds === 0 ? 'MAX' : `${displaySeconds.toFixed(1)}s`}
                      </span>
                    </div>
                  </div>

                  {/* ── Row 2: 聴き流し / 音声 / 英→日 / 単語・例文 / チェックボックス ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>

                    {/* 🎧 聴き流し（先頭） */}
                    <button onClick={() => setShowPodcast(true)}
                      style={{ height: '28px', padding: '0 10px', borderRadius: '7px', border: '1px solid #dbeafe', background: '#eff6ff', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}
                      onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
                      onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}
                    >🎧 {lang==='ja'?'聴き流し':'Podcast'}</button>

                    <div style={{ width: '1px', height: '16px', background: '#e2e8f0', flexShrink: 0 }} />

                    {/* 英→日 */}
                    <button onClick={() => setQLang(qLang === 'en' ? 'ja' : 'en')}
                      style={{ height: '28px', padding: '0 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', flexShrink: 0 }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                    >{qLang === 'en' ? (lang==='ja'?'🇺🇸 英→日':'🇺🇸 En→Jp') : (lang==='ja'?'🇯🇵 日→英':'🇯🇵 Jp→En')}</button>

                    {/* 単語 / 例文 */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '7px', padding: '2px', border: '1px solid #e8ecf2', flexShrink: 0 }}>
                      {[{ key: 'word', label: lang==='ja'?'単語':'Word' }, { key: 'example', label: lang==='ja'?'例文':'Example' }].map(item => (
                        <button key={item.key} onClick={() => setQType(item.key)}
                          style={{ height: '24px', padding: '0 10px', borderRadius: '5px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: qType === item.key ? '#fff' : 'transparent', color: qType === item.key ? '#0f172a' : '#94a3b8', boxShadow: qType === item.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}
                        >{item.label}</button>
                      ))}
                    </div>

                    <div style={{ width: '1px', height: '16px', background: '#e2e8f0', flexShrink: 0 }} />
                    {qType === 'word' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={showExOnBack} onChange={() => setShowExOnBack(!showExOnBack)} style={{ accentColor: '#E8294A', width: '13px', height: '13px', cursor: 'pointer' }} />
                        {lang==='ja'?'裏に例文':'Ex. back'}
                      </label>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={showWordOnExMode} onChange={() => setShowWordOnExMode(!showWordOnExMode)} style={{ accentColor: '#E8294A', width: '13px', height: '13px', cursor: 'pointer' }} />
                        {lang==='ja'?'裏に単語':'Word back'}
                      </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={isFrontOnlyAuto} onChange={() => setIsFrontOnlyAuto(!isFrontOnlyAuto)} style={{ accentColor: '#E8294A', width: '13px', height: '13px', cursor: 'pointer' }} />
                      {lang==='ja'?'表面のみ':'Front only'}
                    </label>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;