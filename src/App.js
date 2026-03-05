/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const parseCSV = (text) => {
  text = text.replace(/^\uFEFF/, ''); 
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
    { id: 1, name: '中学レベル' }, { id: 2, name: '資格・オリジナル箱' }
  ]);

  const [decks, setDecks] = useState([
    { 
      id: 1, boxId: 1, name: '基本の動詞', lastStudied: Date.now() - (1000 * 60 * 60 * 48), lastRecordTime: 125,
      cards: [
        { word: 'shine', meaning: '輝く / 光る', example: 'The stars **shine** brightly.', translation: '星が明るく**輝く**。', isMemorized: false },
        { word: 'have', meaning: '持っている / 食べる', example: 'I **have** a book.', translation: '私は本を**持っています**。', isMemorized: false },
        { word: 'make', meaning: '作る', example: 'She **makes** dinner.', translation: '彼女は夕食を**作ります**。', isMemorized: false },
        { word: 'attack', meaning: '攻撃する', example: 'The dog will not **attack** you.', translation: 'その犬はあなたを**攻撃し**ません。', isMemorized: false }
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
  const [speedLevel, setSpeedLevel] = useState(40);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [loading, setLoading] = useState(false);

  const [testQuestions, setTestQuestions] = useState([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showTestResult, setShowTestResult] = useState(false);
  const [printCards, setPrintCards] = useState([]);

  const [draggedDeckId, setDraggedDeckId] = useState(null);
  const [ghostPos, setGhostPos] = useState(null); 
  const touchDragTimer = useRef(null);

  const activeDeck = decks.find(d => d.id === currentDeckId);
  const allCards = activeDeck ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };
  
  const deleteCard = () => {
    stopAutoPlayIfActive();
    if (window.confirm('このカードを削除しますか？')) {
      const wordToDelete = studyCards[currentIndex]?.word;
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => c.word !== wordToDelete) } : d));
      if (currentIndex >= studyCards.length - 1 && studyCards.length > 1) {
        setCurrentIndex(studyCards.length - 2);
      }
      setIsFlipped(false); 
      setHasRecorded(false);
    }
  };

  const deleteSpecificCard = (e, wordToDelete) => {
    e.stopPropagation(); stopAutoPlayIfActive();
    if (window.confirm(`「${wordToDelete}」を削除しますか？`)) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter(c => c.word !== wordToDelete) } : d));
    }
  };

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
        playAudio(studyCards[currentIndex]?.word || '');
        lastPlayedIndexRef.current = currentIndex;
        lastFlippedStateRef.current = isFlipped;
      }
    } else if (isFlipped) {
      lastPlayedIndexRef.current = -1;
    }
  }, [currentIndex, isFlipped, studyCards, view, playAudio]);

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
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => {
        if (d.id === currentDeckId) {
          const isFaster = d.lastRecordTime === null || studyTime < d.lastRecordTime;
          return { ...d, lastRecordTime: isFaster ? studyTime : d.lastRecordTime };
        }
        return d;
      }));
      setHasRecorded(true); 
    }
  }, [isCompleted, currentDeckId, studyTime]);

  const nextCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev + 1) % studyCards.length), 150); }, [studyCards.length]);
  const prevCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev - 1 + studyCards.length) % studyCards.length), 150); }, [studyCards.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (view !== 'study' || isBulkMode) return;

      if (e.code === 'Space') {
        e.preventDefault();
        stopAutoPlayIfActive();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        stopAutoPlayIfActive();
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopAutoPlayIfActive();
        prevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isBulkMode, isAutoPlaying, nextCard, prevCard]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let autoPlayTimer = null; 
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      lastTickRef.current = Date.now();
      autoPlayTimer = setInterval(() => {
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
    return () => { if (autoPlayTimer) clearInterval(autoPlayTimer); };
  }, [isAutoPlaying, isFlipped, currentIndex, speedLevel, studyCards.length, isCompleted, nextCard]);

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

  const markDeckAsMemorized = (e, deckId) => {
    e.stopPropagation();
    if (window.confirm('この束をすべて「暗記済み」として完了しますか？')) {
      setDecks(prev => prev.map(d => {
        if (d.id !== deckId) return d;
        return { ...d, lastStudied: Date.now(), cards: d.cards.map(c => ({ ...c, isMemorized: true })) };
      }));
    }
  };

  const saveEditedCard = () => {
    if (!editingCard) return;
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => c.word === editingCard.originalWord ? { 
        ...c, 
        word: editingCard.word, 
        meaning: editingCard.meaning,
        example: editingCard.example,
        translation: editingCard.translation
      } : c) };
    }));
    setEditingCard(null); 
  };

  const renameBox = (e, boxId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt('箱の新しい名前を入力してください:', currentName);
    if (newName !== null && newName.trim() !== '') {
      setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, name: newName.trim() } : b));
    }
  };

  const renameDeck = (e, deckId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt('束の新しい名前を入力してください:', currentName);
    if (newName !== null && newName.trim() !== '') {
      setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName.trim() } : d));
    }
  };

  const getEbbinghausStatus = (deck) => {
    if (deck.cards.length > 0 && deck.cards.every(c => c.isMemorized)) {
       return { label: '🏆 暗記済', className: 'status-perfect', needsReview: false };
    }
    const lastStudied = deck.lastStudied;
    if (!lastStudied) return { label: '🆕 未学習', className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: '✅ 学習中', className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: '🔥 復習推奨', className: 'status-review', needsReview: true, shake: true };
    return { label: '💤 放置気味', className: 'status-warning', needsReview: false };
  };

  const downloadTemplate = () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const content = '英単語,日本語訳,英語例文(**で囲むと黄色マーカー),例文和訳(**で囲むと黄色マーカー)\napple,りんご,"I have an **apple**.","私は**りんご**を持っています。"\nsolution,解決策,"We need a good **solution**.","私たちは良い**解決策**が必要です。"\n';
    const blob = new Blob([bom, content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '単語帳インポート用データ.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsedData = parseCSV(text);
      const startIndex = parsedData[0] && parsedData[0][0] && String(parsedData[0][0]).includes('英単語') ? 1 : 0;
      const rows = parsedData.slice(startIndex).filter(row => row.length > 0 && row[0] && String(row[0]).trim() !== '');
      processImportData(rows); 
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const processImportData = (rows) => {
    setLoading(true);
    try {
      const newCards = [];
      for (const row of rows) {
        const targetWord = row[0] ? String(row[0]).trim() : '';
        if (!targetWord) continue;
        newCards.push({ 
          word: targetWord, 
          meaning: row[1] ? String(row[1]).trim() : '', 
          example: row[2] ? String(row[2]).trim() : '', 
          translation: row[3] ? String(row[3]).trim() : '', 
          isMemorized: false 
        });
      }
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...(d.cards || []), ...newCards] } : d));
    } catch(e) {
      alert("ファイルの読み込み中にエラーが発生しました。");
    } finally {
      setIsBulkMode(false); 
      setCurrentIndex(0); 
      setIsFlipped(false); 
      setHasRecorded(false);
      setLoading(false);
    }
  };

  const startTest = () => {
    if (allCards.length < 4) {
      alert("テストを行うには、この束に最低4枚のカードが必要です！");
      return;
    }
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
    const questions = shuffledCards.map(card => {
      const wrongAnswers = allCards.filter(c => c.word !== card.word)
                                   .sort(() => Math.random() - 0.5)
                                   .slice(0, 3)
                                   .map(c => c.meaning || '意味なし');
      const options = [card.meaning || '意味なし', ...wrongAnswers].sort(() => Math.random() - 0.5);
      return {
        word: card.word,
        correct: card.meaning || '意味なし',
        options: options
      };
    });

    setTestQuestions(questions);
    setCurrentTestIndex(0);
    setScore(0);
    setShowTestResult(false);
    setView('test');
  };

  const handleAnswer = (selectedOption) => {
    const isCorrect = selectedOption === testQuestions[currentTestIndex].correct;
    if (isCorrect) setScore(prev => prev + 1);
    
    if (currentTestIndex < testQuestions.length - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      setShowTestResult(true);
    }
  };

  const openPrintPreview = () => {
    if (allCards.length === 0) {
      alert("印刷するカードがありません。");
      return;
    }
    setPrintCards([...allCards].sort(() => Math.random() - 0.5));
    setView('printPreview');
  };

  const shufflePrintCards = () => {
    setPrintCards([...printCards].sort(() => Math.random() - 0.5));
  };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    const newBox = { id: Date.now(), name: newBoxName };
    setBoxes([...boxes, newBox]); setSelectedBoxForDeck(newBox.id); setNewBoxName('');
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
  
  const openDeck = (id) => { 
    if (draggedDeckId) return;
    setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); 
  };
  
  const closeDeck = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks');
  }, [currentDeckId]);

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm('束を削除しますか？')) setDecks(decks.filter(d => d.id !== id)); };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    try {
      return String(text).split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <span key={i} className="highlight-word">{part}</span> : part);
    } catch(e) {
      return String(text);
    }
  };

  const onDragStart = (e, id) => {
    setDraggedDeckId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropToArea = (e, targetArea) => {
    e.preventDefault();
    if (!draggedDeckId) return;
    setDecks(prev => {
      const newDecks = [...prev];
      const index = newDecks.findIndex(d => d.id === draggedDeckId);
      if (index !== -1) {
        const d = newDecks[index];
        if (targetArea === 'memorized') {
          newDecks[index] = { ...d, lastStudied: Date.now(), cards: d.cards.map(c => ({...c, isMemorized: true})) };
        } else if (targetArea === 'unmemorized') {
          newDecks[index] = { ...d, cards: d.cards.map(c => ({...c, isMemorized: false})) };
        }
      }
      return newDecks;
    });
    setDraggedDeckId(null);
  };
  
  const onTouchStartDeck = (e, deck) => {
    e.stopPropagation(); 
    const touch = e.touches[0];
    touchDragTimer.current = setTimeout(() => {
      setDraggedDeckId(deck.id);
      setGhostPos({ x: touch.clientX, y: touch.clientY, title: deck.name });
    }, 400); 
  };
  const onTouchMoveDeck = (e) => {
    if (!draggedDeckId) {
      clearTimeout(touchDragTimer.current);
      return;
    }
    e.preventDefault(); 
    const touch = e.touches[0];
    setGhostPos(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
  };
  const onTouchEndDeck = (e) => {
    clearTimeout(touchDragTimer.current);
    if (draggedDeckId) {
      const touch = e.changedTouches[0];
      if(touch) {
         const elem = document.elementFromPoint(touch.clientX, touch.clientY);
         const targetMemArea = elem?.closest('.decks-memorized-area');
         const targetUnmemArea = elem?.closest('.decks-unmemorized-area');

         setDecks(prev => {
            let newDecks = [...prev];
            const index = newDecks.findIndex(d => d.id === draggedDeckId);
            if (index !== -1) {
              if (targetMemArea) {
                 newDecks[index] = { ...newDecks[index], lastStudied: Date.now(), cards: newDecks[index].cards.map(c => ({...c, isMemorized: true})) };
              } else if (targetUnmemArea) {
                 newDecks[index] = { ...newDecks[index], cards: newDecks[index].cards.map(c => ({...c, isMemorized: false})) };
              }
            }
            return newDecks;
         });
      }
      setTimeout(() => {
        setDraggedDeckId(null);
        setGhostPos(null);
      }, 100);
    }
  };

  const handleTouchStart = (e) => {
    if (draggedDeckId || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview') return;
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; touchEndX.current = null; touchEndY.current = null; 
  };
  const handleTouchMove = (e) => {
    if (draggedDeckId || window.scrollY > 10) return;
    if (!touchStartX.current || !touchStartY.current || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview') return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current; const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  const handleTouchEnd = () => {
    if (view === 'boxes' || view === 'printPreview') return;
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
            <button className="mini-icon-btn" onClick={() => { 
              stopAutoPlayIfActive(); 
              setEditingCard({
                originalWord: c.word, 
                word: c.word, 
                meaning: c.meaning,
                example: c.example || '',
                translation: c.translation || ''
              }); 
            }}>✏️</button>
            <button className="mini-icon-btn delete-mini" onClick={(e) => deleteSpecificCard(e, c.word)}>✖</button>
          </div>
        </div>
        <div className="mini-meaning">{c.meaning}</div>
      </div>
    );
  };

  const renderDeckCard = (deck) => {
    const status = getEbbinghausStatus(deck);
    const isDragging = draggedDeckId === deck.id;
    const isAllMemorized = deck.cards.length > 0 && deck.cards.every(c => c.isMemorized);

    return (
      <div 
        key={deck.id} 
        data-id={deck.id}
        className={`deck-bundle ${status.shake ? 'polite-shake-once' : ''} ${isDragging ? 'dragging' : ''}`} 
        onClick={() => openDeck(deck.id)}
        draggable="true"
        onDragStart={(e) => onDragStart(e, deck.id)}
        onDragEnd={() => setDraggedDeckId(null)}
        onTouchStart={(e) => onTouchStartDeck(e, deck)}
        onTouchMove={onTouchMoveDeck}
        onTouchEnd={onTouchEndDeck}
        title="PC:ドラッグ / スマホ:長押しで並べ替え"
      >
        <div className="deck-paper stack-bottom"></div>
        <div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          <h3 className="deck-name" title={deck.name}>
            {deck.name}
            <button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button>
          </h3>
          
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>

          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini">
              <span>🗂 {deck.cards.length}枚</span>
              {deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}
              {deck.lastRecordTime !== null && <span>⏱ 最速 {formatTime(deck.lastRecordTime)}</span>}
            </div>
          </div>

          {isAllMemorized && <div className="memorized-stamp">💮 暗記済</div>}

        </div>
        <div className="rubber-band"></div>
      </div>
    );
  };

  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view">
        <div className="hero-section">
          <h1 className="app-main-title">Redline Vocabulary</h1>
        </div>

        <div className="integrated-creation-area">
          <div className="creation-row">
            <span className="creation-label" title="新しい箱を作る">📦</span>
            <input type="text" placeholder="箱の名前を入力して追加" value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
            <button onClick={createNewBox} className="add-btn mini-btn">作る</button>
          </div>
        </div>

        <div className="boxes-grid">
          {boxes.map(box => {
            const hasReview = decks.filter(d => d.boxId === box.id).some(d => {
              if (d.cards.length > 0 && d.cards.every(c => c.isMemorized)) return false;
              return getEbbinghausStatus(d).needsReview;
            });
            return (
              <div key={box.id} className={`storage-box-container ${hasReview ? 'polite-shake-once' : ''}`}>
                <div className="storage-box" onClick={() => openBox(box.id)}>
                  <div className="box-lid-line"></div>
                  <div className="box-label-wrapper">
                    <span className="box-label" title={box.name}>{box.name}</span>
                  </div>
                  <div className="box-handle"></div>
                </div>
                <button className="inline-edit-btn box-edit-icon" onClick={(e) => renameBox(e, box.id, box.name)}>✏️</button>
                <p className="box-instruction">{hasReview ? <span className="alert-text">🔥 復習のタイミング！</span> : 'タップして開く'}</p>
                <button className="delete-deck-btn" style={{top: '5px'}} onClick={e => deleteBox(e, box.id)}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'test') {
    return (
      <div className="app-container gentle-bg desk-view">
        <div className="test-container">
          {showTestResult ? (
            <div className="test-result">
              <h2 style={{fontSize: '32px', color: '#27ae60'}}>テスト終了！</h2>
              <p style={{fontSize: '24px', fontWeight: 'bold'}}>スコア: {score} / {testQuestions.length}</p>
              <div className="test-actions">
                <button className="add-btn" onClick={() => startTest()}>🔄 もう一度テストする</button>
                <button className="cancel-btn" onClick={() => setView('study')}>◀ 学習に戻る</button>
              </div>
            </div>
          ) : (
            <div className="test-quiz-area">
              <p className="test-counter">問題 {currentTestIndex + 1} / {testQuestions.length}</p>
              <h1 className="test-word">{testQuestions[currentTestIndex]?.word}</h1>
              <p className="test-hint">この単語の正しい意味はどれ？</p>
              
              <div className="test-options">
                {testQuestions[currentTestIndex]?.options.map((option, idx) => (
                  <button key={idx} className="test-option-btn" onClick={() => handleAnswer(option)}>
                    {option}
                  </button>
                ))}
              </div>
              <button className="cancel-btn" style={{marginTop: '30px'}} onClick={() => setView('study')}>中断して戻る</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'printPreview') {
    return (
      <div className="app-container gentle-bg desk-view">
        <div className="print-controls no-print">
          <button className="cancel-btn" onClick={() => setView('study')}>◀ 学習に戻る</button>
          <button className="add-btn" onClick={shufflePrintCards} style={{backgroundColor: '#8e44ad'}}>🔄 問題をシャッフル</button>
          <button className="add-btn" onClick={() => window.print()} style={{backgroundColor: '#e74c3c'}}>🖨️ 印刷する (PDF保存)</button>
        </div>

        <div className="print-preview-container print-area">
          <div className="print-header">
            <div>
              <h1 className="print-title">{activeDeck?.name} - 単語テスト</h1>
            </div>
            <div className="print-info-box">
              <span>　　年　　月　　日</span>
              <span>氏名：____________________________</span>
              <span>得点：　　 / {printCards.length}</span>
            </div>
          </div>
          
          <div className="print-questions">
            {printCards.map((c, i) => (
              <div key={i} className="print-q-row">
                <div className="print-q-num">({i + 1})</div>
                <div className="print-q-ja">{(c.meaning || '').split('/')[0]}</div>
                <div className="print-q-ans"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container gentle-bg desk-view" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      
      {ghostPos && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }}>
          {ghostPos.title}
        </div>
      )}

      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>カードを編集</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>英単語</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} placeholder="英単語" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>意味</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} placeholder="意味" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>英語例文 <span style={{fontWeight:'normal', fontSize:'11px'}}>(**で囲むと黄色い線が引かれます)</span></label>
            <textarea className="modal-input" value={editingCard.example} onChange={(e) => setEditingCard({...editingCard, example: e.target.value})} placeholder="I have an **apple**." rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>例文和訳 <span style={{fontWeight:'normal', fontSize:'11px'}}>(**で囲むと黄色い線が引かれます)</span></label>
            <textarea className="modal-input" value={editingCard.translation} onChange={(e) => setEditingCard({...editingCard, translation: e.target.value})} placeholder="私は**りんご**を持っています。" rows="2" />
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
          const unmemorizedDecks = boxDecks.filter(d => !(d.cards.length > 0 && d.cards.every(c => c.isMemorized)));
          const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.cards.every(c => c.isMemorized));

          return (
            <div className="inner-view-wrapper">
              <div className="study-header">
                <button className="back-to-desk-btn" onClick={() => setView('boxes')}>◀ 箱に戻る</button>
                <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
                <div style={{width: '80px'}}></div>
              </div>
              
              <div className="integrated-creation-area">
                <div className="creation-row">
                  <span className="creation-label" title="新しい束を作る">🔖</span>
                  <input type="text" placeholder="新しい暗記カードの束を入力" value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                  <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">追加</button>
                </div>
              </div>

              <div className="decks-split-layout">
                <div 
                  className="decks-unmemorized-area"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropToArea(e, 'unmemorized')}
                >
                  <h3 className="area-title">📖 学習中・未修の束</h3>
                  <p className="area-hint">※右のエリアにドロップすると、すべて暗記済みになります。</p>
                  
                  {unmemorizedDecks.length === 0 ? (
                     <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>未修の束はありません。</p>
                  ) : (
                    <div className="decks-grid">
                      {unmemorizedDecks.map(d => renderDeckCard(d))}
                    </div>
                  )}
                </div>

                <div 
                  className="decks-memorized-area"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropToArea(e, 'memorized')}
                >
                  <h3 className="area-title" style={{color: '#27ae60'}}>🏆 暗記済の束</h3>
                  <p className="area-hint">※ここに束をドロップすると一発で暗記済みに！</p>

                  {memorizedDecks.length === 0 ? (
                     <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>まだ暗記済みの束はありません。</p>
                  ) : (
                    <div className="decks-grid memorized-grid">
                      {memorizedDecks.map(d => renderDeckCard(d))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {view === 'study' && (
          <div className="study-dashboard">
            
            {!isFullscreen && (
              <div className="side-panel left-panel">
                <h3 className="panel-title">📖 学習中 ({studyCards.length})</h3>
                
                <div className="panel-top-action" style={{ padding: '10px' }}>
                  <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn" style={{width: '100%', padding: '10px 0', fontSize: '13px', backgroundColor: '#e67e22'}}>
                    📂 CSVから単語を追加
                  </button>
                </div>
                
                <div className="mini-card-list">
                  {studyCards.map((c, i) => renderMiniCard(c, false, i + 1))}
                </div>
              </div>
            )}

            <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`}>
              
              {/* ⭐️ タイトルとボタンを画面上部に美しく独立配置（要望通り） */}
              {!isFullscreen && (
                <>
                  <div className="study-controls-top" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <button className="back-to-desk-btn" onClick={closeDeck}>◀ 戻る</button>
                    <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible' }}>⏱ {formatTime(studyTime)}</div>
                  </div>
                  
                  <div className="study-title-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px', width: '100%' }}>
                    <h2 className="study-deck-title" style={{ margin: 0 }}>
                      {activeDeck?.name}
                    </h2>
                    {allCards.length >= 4 && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="test-start-btn" onClick={startTest} title="4択テストに挑戦！">📝 テスト</button>
                        <button className="test-start-btn print-btn" onClick={openPrintPreview} title="紙のテストを印刷する">🖨️ プリント</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {!isFullscreen && isBulkMode && (
                <div className="bulk-input-section" style={{ marginTop: '0px' }}>
                  <p className="bulk-hint" style={{fontSize:'16px', color:'#333'}}>スプレッドシートやChatGPTで作成したCSVデータを読み込みます。</p>
                  
                  <div className="bulk-file-actions">
                    <button onClick={downloadTemplate} className="add-btn bulk-template-btn">📥 テンプレート(CSV)をダウンロード</button>
                    <label className="add-btn bulk-upload-btn" style={{backgroundColor: '#27ae60'}}>
                      {loading ? '読み込み中...' : '📂 CSVファイルを選択して追加'}
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                  </div>
                  <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5' }}>
                    💡 ChatGPTへの指示例コピペ用：<br/>
                    <span style={{color: '#555', fontWeight: 'normal', display: 'block', background: '#f0f2f5', padding: '10px', borderRadius: '8px', marginTop: '5px', textAlign: 'left'}}>
                      「以下の英単語リストをアプリ用にCSV化して。<br/>
                      【条件】1.列は「英単語, 日本語訳, 英語例文, 例文和訳」の4列。<br/>
                      2.例文と和訳内の対象単語を ** で囲む。3.コードブロックで出力。<br/>
                      【リスト】（ここに単語を貼る）」
                    </span>
                  </p>
                  
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
                
                <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ display: isBulkMode ? 'none' : 'flex' }}>
                  {!isFullscreen && <p className="card-counter">{currentIndex + 1} / {studyCards.length}</p>}
                  
                  <div className="card-animation-wrapper" key={currentIndex}>
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="ring-hole"></div>
                          <button className="memorize-check-btn" onClick={(e) => toggleMemorize(e, studyCards[currentIndex]?.word, true)} title="覚えたらチェック！">✔</button>
                          <h1 className="word-text">{studyCards[currentIndex]?.word || ''}</h1>
                        </div>
                        
                        <div className="card-back">
                          <div className="back-content">
                            <div className="meaning-section">
                              <div className="core-meaning-large">
                                {String(studyCards[currentIndex]?.meaning || '').split('/').map((m, i) => <div key={i} className="meaning-line">{m.trim()}</div>)}
                              </div>
                            </div>
                            <div className="example-section">
                              <p className="example-en">{renderHighlightedText(studyCards[currentIndex]?.example || '')}</p>
                              <p className="example-ja">{renderHighlightedText(studyCards[currentIndex]?.translation || '')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!isFullscreen && (
                    <div className="controls">
                      <button onClick={() => {stopAutoPlayIfActive(); prevCard();}} className="nav-btn">◀</button>
                      <button onClick={deleteCard} className="delete-btn">捨てる</button>
                      <button onClick={() => {stopAutoPlayIfActive(); nextCard();}} className="nav-btn">▶</button>
                    </div>
                  )}

                  <div className="autoplay-controls">
                    <div className="autoplay-actions-row">
                      <button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
                        {isAutoPlaying ? '⏸ 停止' : '▶️ 自動めくり'}
                      </button>
                      <button className="repeat-btn" onClick={handleRepeat} title="最初からやり直す">
                        🔄 もう1回
                      </button>
                      <button className="fullscreen-btn" onClick={toggleFullScreen} title="全集中モード">
                        {isFullscreen ? '解除 ↘️' : '全集中 🔥'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
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
    </div>
  );
}

export default App;