/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const API_KEY = 'AIzaSyDgKNqCHpejyKy67b3SKuUFI5_ONiZqmvw'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const parseCSV = (text) => {
  const rows = []; let row = []; let currentVal = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const nextChar = text[i+1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentVal += '"'; i++; } 
      else if (char === '"') { inQuotes = false; } 
      else { currentVal += char; }
    } else {
      if (char === '"') { inQuotes = true; } 
      else if (char === ',') { row.push(currentVal); currentVal = ''; } 
      else if (char === '\n' || char === '\r') {
        row.push(currentVal); rows.push(row); row = []; currentVal = '';
        if (char === '\r' && nextChar === '\n') i++; 
      } else { currentVal += char; }
    }
  }
  if (currentVal || row.length > 0) { row.push(currentVal); rows.push(row); }
  return rows;
};

function App() {
  const touchStartX = useRef(null); const touchStartY = useRef(null);
  const touchEndX = useRef(null); const touchEndY = useRef(null);
  const [pullDownY, setPullDownY] = useState(0);
  const [isStoring, setIsStoring] = useState(false);

  const [boxes, setBoxes] = useState([
    { id: 1, name: '中学英語マスター箱' }, { id: 2, name: '資格・オリジナル箱' }
  ]);

  const [decks, setDecks] = useState([
    { 
      id: 1, boxId: 1, name: '基本の動詞', lastStudied: Date.now() - (1000 * 60 * 60 * 48), lastRecordTime: 125,
      cards: [
        { word: 'play', meaning: 'する / 遊ぶ', example: 'I **play** soccer.', translation: '私はサッカーを**します**。', isMemorized: false },
        { word: 'have', meaning: '持っている / 食べる', example: 'I **have** a book.', translation: '私は本を**持っています**。', isMemorized: false },
        { word: 'make', meaning: '作る', example: 'She **makes** dinner.', translation: '彼女は夕食を**作ります**。', isMemorized: false }
      ] 
    }
  ]);

  const [view, setView] = useState('boxes');
  const [currentBoxId, setCurrentBoxId] = useState(null);
  const [currentDeckId, setCurrentDeckId] = useState(null);

  const [newBoxName, setNewBoxName] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [selectedBoxForDeck, setSelectedBoxForDeck] = useState(1); 
  const [newDeckNameInside, setNewDeckNameInside] = useState('');

  const [studyTime, setStudyTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState('normal'); 
  const [speedLevel, setSpeedLevel] = useState(40);

  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const activeDeck = decks.find(d => d.id === currentDeckId);
  const allCards = activeDeck ? activeDeck.cards : [];
  
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  useEffect(() => {
    if (studyCards.length > 0 && currentIndex >= studyCards.length) {
      setCurrentIndex(studyCards.length - 1);
    }
  }, [studyCards.length, currentIndex]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(`Error: ${err.message}`));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const lastPlayedIndexRef = useRef(-1);
  const lastFlippedStateRef = useRef(true);

  const playAudio = useCallback((text) => {
    if (speedLevel >= 85) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.7 + (speedLevel - 1) * (0.8 / 99);
      utterance.pitch = 1.05; 
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Online Natural') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Google US English')));
      utterance.voice = premiumVoice || voices.find(v => v.lang.startsWith('en'));
      window.speechSynthesis.speak(utterance);
    }
  }, [speedLevel]);

  useEffect(() => {
    if (view === 'study' && !isFlipped && studyCards.length > 0 && studyCards[currentIndex]) {
      if (lastPlayedIndexRef.current !== currentIndex || lastFlippedStateRef.current !== isFlipped) {
        playAudio(studyCards[currentIndex].word);
        lastPlayedIndexRef.current = currentIndex;
        lastFlippedStateRef.current = isFlipped;
      }
    } else if (isFlipped) {
      lastPlayedIndexRef.current = -1;
    }
  }, [currentIndex, isFlipped, studyCards, view, playAudio]);

  useEffect(() => {
    let interval = null;
    if (view === 'study' && !isCompleted && !isBulkMode && studyCards.length > 0) {
      interval = setInterval(() => setStudyTime(prev => prev + 1), 1000);
    } else if (view !== 'study') {
      setStudyTime(0);
    }
    return () => clearInterval(interval);
  }, [view, isCompleted, isBulkMode, studyCards.length]);

  // ⭐️ タイムと日付のフォーマット関数
  const formatTime = (seconds) => seconds ? `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}` : '--:--';
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastRecordTime: studyTime } : d));
      setHasRecorded(true); 
    }
  }, [isCompleted, currentDeckId, studyTime]);

  const nextCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev + 1) % studyCards.length), 150); }, [studyCards.length]);
  const prevCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev - 1 + studyCards.length) % studyCards.length), 150); }, [studyCards.length]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let interval = null; 
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      lastTickRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;
        elapsedRef.current += delta;
        const currentDelay = 4000 - (speedLevel - 1) * (3600 / 99);
        if (elapsedRef.current >= currentDelay) {
          elapsedRef.current = 0; 
          if (!isFlipped) setIsFlipped(true); 
          else if (currentIndex < studyCards.length - 1) nextCard(); 
          else setIsAutoPlaying(false);
        }
      }, 50);
    } else { 
      elapsedRef.current = 0; 
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isAutoPlaying, isFlipped, currentIndex, speedLevel, studyCards.length, isCompleted, nextCard]);

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const handleRepeat = () => { stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setStudyTime(0); setHasRecorded(false); };

  const toggleMemorize = (e, wordToMark, isMemorized) => {
    e.stopPropagation(); stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => c.word === wordToMark ? { ...c, isMemorized: isMemorized } : c) };
    }));
  };

  const resetMemorized = () => {
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => ({ ...c, isMemorized: false })) };
    }));
    handleRepeat();
  };

  // ⭐️ 束を一括で「暗記済み」にする機能
  const markDeckAsMemorized = (e, deckId) => {
    e.stopPropagation();
    if (window.confirm('この束をすべて「暗記済み」として完了しますか？')) {
      setDecks(prev => prev.map(d => {
        if (d.id !== deckId) return d;
        return {
          ...d,
          lastStudied: Date.now(), // 完了日を今日に更新
          cards: d.cards.map(c => ({ ...c, isMemorized: true }))
        };
      }));
    }
  };

  const saveEditedCard = () => {
    if (!editingCard) return;
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => c.word === editingCard.originalWord ? { ...c, word: editingCard.word, meaning: editingCard.meaning } : c) };
    }));
    setEditingCard(null); 
  };

  const deleteSpecificCard = (e, wordToDelete) => {
    e.stopPropagation(); stopAutoPlayIfActive();
    if (window.confirm(`「${wordToDelete}」を削除しますか？`)) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => c.word !== wordToDelete) } : d));
    }
  };

  const getEbbinghausStatus = (lastStudied) => {
    if (!lastStudied) return { label: '🆕 未学習', className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: '✅ 定着中', className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: '🔥 復習時', className: 'status-review', needsReview: true, shake: true };
    return { label: '💤 リセット', className: 'status-warning', needsReview: false };
  };

  const getMemorizedStatus = (lastStudied) => {
    if (!lastStudied) return { label: '🏆 暗記完了', className: 'status-perfect', needsReview: false };
    const daysPassed = Math.floor((Date.now() - lastStudied) / (1000 * 60 * 60 * 24));
    
    if (daysPassed >= 14) return { label: `🚨 ${daysPassed}日経過! 復習推奨`, className: 'status-warning', needsReview: true, shake: true };
    if (daysPassed >= 7) return { label: `⚠️ ${daysPassed}日経過! 記憶チェック`, className: 'status-review', needsReview: true, shake: true };
    if (daysPassed >= 3) return { label: `🔥 ${daysPassed}日経過! 復習ベスト`, className: 'status-review', needsReview: true, shake: true };
    if (daysPassed >= 1) return { label: `✅ ${daysPassed}日経過! 短期記憶中`, className: 'status-fresh', needsReview: false };
    
    return { label: '🏆 本日暗記完了!', className: 'status-perfect', needsReview: false };
  };

  const fetchMeaning = async (targetWord) => {
    const prompt = `英単語「${targetWord}」について、必ず以下の【条件】に従って出力してください。
    【条件】
    1行目:意味(最大2つ。2つの場合は「 / 」で区切る。※「動詞」などの品詞名は絶対に書かないこと)
    2行目:中学レベル英文(対象単語を「**」で囲む)
    3行目:和訳(※英文で「**」で囲んだ単語に対応する日本語訳の部分を、必ず「**」で囲む)
    【禁止事項】挨拶、説明、箇条書き番号、空行は一切含めないでください。`;
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const lines = data.candidates[0].content.parts[0].text.split('\n').map(l => l.trim().replace(/^[1-3].\s*/, '')).filter(l => l);
      return { coreMeaning: lines[0] || '取得失敗', exampleText: lines[1] || '例文なし', translationText: lines[2] || '' };
    } catch (e) { return { coreMeaning: 'エラー', exampleText: e.message, translationText: '' }; }
  };

  const handleAddCard = async () => {
    if (!word.trim()) return;
    setLoading(true);
    const res = await fetchMeaning(word);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...d.cards, { word, ...res, isMemorized: false }] } : d));
    setWord(''); setCurrentIndex(studyCards.length); setIsFlipped(false); setHasRecorded(false); setLoading(false);
  };

  const downloadTemplate = () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const content = '英単語,日本語訳,例文,例文訳\napple,りんご,"I have an **apple**.","私は**りんご**を持っています。"\nbanana,,,\n';
    const blob = new Blob([bom, content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '単語帳テンプレート.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const parsedData = parseCSV(text);
      const startIndex = parsedData[0] && parsedData[0][0] && parsedData[0][0].includes('英単語') ? 1 : 0;
      const rows = parsedData.slice(startIndex).filter(row => row.length > 0 && row[0] && row[0].trim() !== '');
      processImportData(rows);
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const processImportData = async (rows) => {
    setLoading(true); setBulkProgress({ current: 0, total: rows.length });
    const newCards = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const targetWord = row[0]?.trim();
      let userMeaning = row[1]?.trim() || '';
      let userExample = row[2]?.trim() || '';
      let userTrans = row[3]?.trim() || '';

      if (!userMeaning || !userExample || !userTrans) {
        const res = await fetchMeaning(targetWord);
        userMeaning = userMeaning || res.coreMeaning;
        userExample = userExample || res.exampleText;
        userTrans = userTrans || res.translationText;
        await new Promise(resolve => setTimeout(resolve, 800)); 
      }
      newCards.push({ word: targetWord, meaning: userMeaning, example: userExample, translation: userTrans, isMemorized: false });
      setBulkProgress({ current: i + 1, total: rows.length });
    }
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...d.cards, ...newCards] } : d));
    setIsBulkMode(false); setLoading(false); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false);
  };

  const deleteCard = () => {
    stopAutoPlayIfActive();
    if (window.confirm('このカードを削除しますか？')) {
      const wordToDelete = studyCards[currentIndex].word;
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => c.word !== wordToDelete) } : d));
      if (currentIndex >= studyCards.length - 1 && studyCards.length > 1) setCurrentIndex(studyCards.length - 2);
      setIsFlipped(false); setHasRecorded(false);
    }
  };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    const newBox = { id: Date.now(), name: newBoxName };
    setBoxes([...boxes, newBox]); setSelectedBoxForDeck(newBox.id); setNewBoxName('');
  };
  const createNewDeck = () => {
    if (!newDeckName.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: Number(selectedBoxForDeck), name: newDeckName, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckName('');
  };
  const createNewDeckInsideBox = () => {
    if (!newDeckNameInside.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckNameInside, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckNameInside('');
  };
  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm('箱と中の束をすべて削除しますか？')) { setBoxes(boxes.filter(b => b.id !== boxId)); setDecks(decks.filter(d => d.boxId !== boxId)); }
  };

  const openBox = (boxId) => { setCurrentBoxId(boxId); setView('decks'); };
  const openDeck = (id) => { setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); };
  
  const closeDeck = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks');
  }, [currentDeckId]);

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm('束を削除しますか？')) setDecks(decks.filter(d => d.id !== id)); };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <span key={i} className="highlight-word">{part}</span> : part);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes') return;
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; touchEndX.current = null; touchEndY.current = null; 
  };
  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes') return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current; const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  const handleTouchEnd = () => {
    if (view === 'boxes') return;
    if (pullDownY > 120) {
      setIsStoring(true); setPullDownY(window.innerHeight);
      setTimeout(() => { if (view === 'study') closeDeck(); else if (view === 'decks') setView('boxes'); setIsStoring(false); setPullDownY(0); }, 400);
    } else {
      setPullDownY(0);
      const diffX = touchStartX.current - (touchEndX.current || touchStartX.current);
      if (Math.abs(diffX) > 50 && view === 'study') { stopAutoPlayIfActive(); if (diffX > 0) nextCard(); else prevCard(); }
    }
  };

  const dynamicStyle = { transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`, opacity: 1 - pullDownY / 800, transition: isStoring ? 'all 0.4s' : (pullDownY === 0 ? '0.3s' : 'none'), width: '100%', height: '100%' };

  const renderMiniCard = (c, isMemorizedList, index = null) => {
    return (
      <div key={c.word} className="mini-card">
        <div className="mini-card-header">
          <span className="mini-word">
            {index !== null && <span className="mini-index">{index}.</span>}
            {c.word}
          </span>
          <div className="mini-icons">
            <button className="mini-icon-btn" onClick={(e) => toggleMemorize(e, c.word, !isMemorizedList)} title={isMemorizedList ? "学習中に戻す" : "覚えた！"}>
              {isMemorizedList ? '↩️' : '✅'}
            </button>
            <button className="mini-icon-btn" onClick={() => { stopAutoPlayIfActive(); setEditingCard({originalWord: c.word, word: c.word, meaning: c.meaning}); }}>✏️</button>
            <button className="mini-icon-btn delete-mini" onClick={(e) => deleteSpecificCard(e, c.word)}>✖</button>
          </div>
        </div>
        <div className="mini-meaning">{c.meaning}</div>
      </div>
    );
  };

  // ⭐️ 束のレンダリング（一括完了ボタンと日付表示を追加）
  const renderDeckCard = (deck, isMemorizedSection) => {
    const status = isMemorizedSection ? getMemorizedStatus(deck.lastStudied) : getEbbinghausStatus(deck.lastStudied);
    return (
      <div key={deck.id} className={`deck-bundle ${status.shake ? 'polite-shake' : ''}`} onClick={() => openDeck(deck.id)}>
        <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          
          {/* ⭐️ 学習中の束なら左上に「✅ 一括暗記完了ボタン」を配置 */}
          {!isMemorizedSection && deck.cards.length > 0 && (
            <button className="deck-memorized-btn" onClick={e => markDeckAsMemorized(e, deck.id)} title="この束をすべて暗記済みにする">
              ✔
            </button>
          )}

          <h3 className="deck-name">{deck.name}</h3><p className="deck-count">{deck.cards.length} 枚</p>
          <div className={`status-badge ${status.className}`}>{status.label}</div>
          
          {/* ⭐️ 具体的な最終学習日を表示 */}
          {deck.lastStudied && <p className="deck-date">🗓 最終学習: {formatDate(deck.lastStudied)}</p>}
          {deck.lastRecordTime !== null && <p className="deck-record">⏱ タイム: {formatTime(deck.lastRecordTime)}</p>}
          
          <button className="delete-deck-btn" onClick={e => deleteDeck(e, deck.id)}>×</button>
        </div><div className="rubber-band"></div>
      </div>
    );
  };


  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view" style={{padding: 0}}>
        <h2 className="app-title">あなたの単語帳ボックス</h2>
        <div className="integrated-creation-area">
          <div className="creation-row">
            <span className="creation-label">📦 新しい箱</span>
            <input type="text" placeholder="箱の名前 (例: 英検用)" value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
            <button onClick={createNewBox} className="add-btn mini-btn">作る</button>
          </div>
          <div className="creation-divider"></div>
          <div className="creation-row">
            <span className="creation-label">🔖 新しい束</span>
            <input type="text" placeholder="束の名前 (例: Day 1)" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeck()} />
            <select value={selectedBoxForDeck} onChange={e => setSelectedBoxForDeck(e.target.value)} className="box-selector">
              {boxes.map(b => <option key={b.id} value={b.id}>{b.name} に収納</option>)}
            </select>
            <button onClick={createNewDeck} className="add-btn mini-btn">作る</button>
          </div>
        </div>

        <div className="boxes-grid">
          {boxes.map(box => {
            const hasReview = decks.filter(d => d.boxId === box.id).some(d => {
              if (d.cards.length > 0 && d.cards.every(c => c.isMemorized)) return getMemorizedStatus(d.lastStudied).needsReview;
              return getEbbinghausStatus(d.lastStudied).needsReview;
            });
            return (
              <div key={box.id} className={`storage-box-container ${hasReview ? 'polite-shake' : ''}`} onClick={() => openBox(box.id)}>
                <div className="storage-box"><div className="box-lid"></div><div className="box-body"><span className="box-label">{box.name}</span></div></div>
                <p className="box-instruction">{hasReview ? <span className="alert-text">🔥 復習のタイミング！</span> : 'タップして開ける'}</p>
                <button className="delete-deck-btn" style={{top: '10px'}} onClick={e => deleteBox(e, box.id)}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container gentle-bg desk-view" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ overflow: 'hidden', position: 'relative', padding: 0 }}>
      
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>カードを編集</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>英単語</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} placeholder="英単語" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>意味</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} placeholder="意味" />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>キャンセル</button>
              <button className="add-btn" onClick={saveEditedCard}>保存する</button>
            </div>
          </div>
        </div>
      )}

      <div style={dynamicStyle}>
        
        {view === 'decks' && (() => {
          const boxDecks = decks.filter(d => d.boxId === currentBoxId);
          const newDecks = boxDecks.filter(d => d.lastStudied === null || d.cards.length === 0);
          const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.lastStudied !== null && d.cards.every(c => c.isMemorized));
          const learningDecks = boxDecks.filter(d => d.cards.length > 0 && d.lastStudied !== null && d.cards.some(c => !c.isMemorized));

          return (
            <div className="inner-view-wrapper" style={{maxWidth: '1000px', width: '100%', padding: '0 20px'}}>
              <div className="study-header">
                <button className="back-to-desk-btn" onClick={() => setView('boxes')}>◀ 戻る</button>
                <h2 className="app-title">📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
                <div style={{width: '80px'}}></div>
              </div>
              <p className="hint-text">💡 画面を下に引っ張っても戻れます</p>

              <div className="box-inner-creation">
                <input type="text" placeholder="新しい束の名前 (例: Day 1)" value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">束を作る</button>
              </div>

              {learningDecks.length > 0 && (
                <div className="decks-section">
                  <h3 className="section-heading">📖 学習中の束</h3>
                  <div className="decks-grid">
                    {learningDecks.map(d => renderDeckCard(d, false))}
                  </div>
                </div>
              )}

              {memorizedDecks.length > 0 && (
                <div className="decks-section">
                  <h3 className="section-heading">🏆 暗記済みの束 <span style={{fontSize:'12px', color:'#a39c96', fontWeight:'normal'}}>(忘却曲線で復習タイミングをお知らせします)</span></h3>
                  <div className="decks-grid">
                    {memorizedDecks.map(d => renderDeckCard(d, true))}
                  </div>
                </div>
              )}

              {newDecks.length > 0 && (
                <div className="decks-section">
                  <h3 className="section-heading">🆕 未学習・新しい束</h3>
                  <div className="decks-grid">
                    {newDecks.map(d => renderDeckCard(d, false))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {view === 'study' && (
          <div className="study-dashboard">
            
            {!isFullscreen && (
              <div className="side-panel left-panel">
                <h3 className="panel-title">📖 学習中 ({studyCards.length})</h3>
                <div className="mini-card-list">
                  {studyCards.map((c, i) => renderMiniCard(c, false, i + 1))}
                </div>
              </div>
            )}

            <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`}>
              {!isFullscreen && (
                <div className="study-header">
                  <button className="back-to-desk-btn" onClick={closeDeck}>◀ 戻る</button>
                  <h2 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{activeDeck?.name}</h2>
                  <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible' }}>⏱ {formatTime(studyTime)}</div>
                </div>
              )}
              
              {!isFullscreen && !isBulkMode && (
                <div className="input-section" style={{ marginTop: '10px' }}>
                  <input type="text" placeholder="単語を追加..." value={word} onChange={e => setWord(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddCard()} disabled={loading} />
                  <button onClick={handleAddCard} className="add-btn" disabled={loading}>{loading ? '...' : '追加'}</button>
                  <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn">📑 エクセルで丸投げ追加</button>
                </div>
              )}

              {!isFullscreen && isBulkMode && (
                <div className="bulk-input-section" style={{ marginTop: '10px' }}>
                  <p className="bulk-hint">テンプレートに単語を書いて、ファイルをアップロードしてください</p>
                  <div className="bulk-file-actions">
                    <button onClick={downloadTemplate} className="add-btn bulk-template-btn">📥 テンプレート(CSV)をダウンロード</button>
                    <label className="add-btn bulk-upload-btn">
                      {loading ? '処理中...' : '📂 ファイルを選択してインポート'}
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                  </div>
                  <p className="bulk-note" style={{ color: '#e74c3c', fontWeight: 'bold' }}>※A列(英単語)だけ入力し、B〜D列が入力されない場合は、AIが自動で作成します！</p>
                  {loading && (
                    <div className="bulk-progress">
                      <p>カードを生成中... ({bulkProgress.current} / {bulkProgress.total})</p>
                      <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}></div></div>
                    </div>
                  )}
                  <div className="bulk-actions" style={{ marginTop: '15px' }}>
                    <button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>閉じる</button>
                  </div>
                </div>
              )}

              {allCards.length > 0 && studyCards.length === 0 ? (
                <div className="empty-deck-msg" style={{marginTop: '60px'}}>
                  <h2 style={{color: '#27ae60'}}>👏 全ての単語を覚えました！</h2>
                  <button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>
                    🔄 覚えた状態をリセットしてもう1回
                  </button>
                </div>
              ) : studyCards.length > 0 ? (
                
                <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`}>
                  {!isFullscreen && <p className="card-counter">{currentIndex + 1} / {studyCards.length}</p>}
                  
                  <div className="card-animation-wrapper" key={currentIndex}>
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="ring-hole"></div>
                          <button className="memorize-check-btn" onClick={(e) => toggleMemorize(e, studyCards[currentIndex]?.word, true)} title="覚えたらチェック！">✔</button>
                          <h1 className="word-text">{studyCards[currentIndex]?.word}</h1>
                        </div>
                        
                        <div className="card-back">
                          <div className="ring-hole"></div>
                          <button className="memorize-check-btn" onClick={(e) => toggleMemorize(e, studyCards[currentIndex]?.word, true)} title="覚えたらチェック！">✔</button>
                          
                          <div className="back-content">
                            <div className="meaning-section">
                              <h2 className="core-meaning">{studyCards[currentIndex]?.meaning.split('/').map((m, i) => <span key={i} style={{display:'block', margin:'4px 0'}}>{m.trim()}</span>)}</h2>
                            </div>
                            <div className="example-section">
                              <p className="example-en">{renderHighlightedText(studyCards[currentIndex]?.example)}</p>
                              <p className="example-ja">{renderHighlightedText(studyCards[currentIndex]?.translation)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!isFullscreen && (
                    <div className="controls"><button onClick={() => {stopAutoPlayIfActive(); prevCard();}} className="nav-btn">◀</button><button onClick={deleteCard} className="delete-btn">捨てる</button><button onClick={() => {stopAutoPlayIfActive(); nextCard();}} className="nav-btn">▶</button></div>
                  )}

                  <div className="autoplay-controls">
                    <div className="autoplay-actions-row">
                      <button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
                        {isAutoPlaying ? '⏸ 停止' : '▶️ スタート'}
                      </button>
                      <button className="repeat-btn" onClick={handleRepeat} title="最初からやり直す">
                        🔄 もう1回
                      </button>
                      <button className="fullscreen-btn" onClick={toggleFullScreen} title="全集中モード">
                        {isFullscreen ? '解除 ↘️' : '全集中 🔥'}
                      </button>
                      {isCompleted && (
                        <div className="completed-timer inline-timer">⏱ {formatTime(studyTime)}</div>
                      )}
                    </div>
                    
                    <div className="speed-selectors">
                      <button className={`speed-btn ${speedLevel === 15 ? 'selected' : ''}`} onClick={() => setSpeedLevel(15)}>🐢 遅め</button>
                      <button className={`speed-btn ${speedLevel === 40 ? 'selected' : ''}`} onClick={() => setSpeedLevel(40)}>🚶 普通</button>
                      <button className={`speed-btn ${speedLevel === 70 ? 'selected' : ''}`} onClick={() => setSpeedLevel(70)}>🐇 高速</button>
                      <button className={`speed-btn ${speedLevel === 95 ? 'selected' : ''}`} onClick={() => setSpeedLevel(95)}>💫 神速</button>
                    </div>

                    <div className="speed-slider-container">
                      <div className="speed-slider-label">めくるスピードを調整:</div>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                        <span style={{fontSize:'12px', color:'#a39c96'}}>遅</span>
                        <input type="range" min="1" max="100" value={speedLevel} onChange={(e) => setSpeedLevel(Number(e.target.value))} className="speed-slider" />
                        <span style={{fontSize:'12px', color:'#a39c96'}}>速</span>
                      </div>
                      {speedLevel >= 85 && (
                        <div style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 'bold', marginTop: '6px' }}>
                          🔇 WPM250以上（音声ミュート中）
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                !isFullscreen && <div className="empty-deck-msg"><p>まだこの束にはカードがありません。</p></div>
              )}
            </div>

            {!isFullscreen && (
              <div className="side-panel right-panel">
                <h3 className="panel-title">✅ 暗記済 ({memorizedCards.length})</h3>
                <div className="mini-card-list">
                  {memorizedCards.length === 0 ? (
                    <p className="empty-mini-msg">カード右上の「✔」を押すとここに移動します</p>
                  ) : (
                    memorizedCards.map(c => renderMiniCard(c, true))
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      {pullDownY > 10 && <div className="virtual-drop-zone" style={{ opacity: Math.min(1, pullDownY / 100) }}><div className="storage-box drop-box-mini"><div className="box-body"><span className="box-label">👇 しまう</span></div></div></div>}
    </div>
  );
}

export default App;