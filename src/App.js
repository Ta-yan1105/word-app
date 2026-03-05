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
        { word: 'play', meaning: '【動詞】する / 遊ぶ', example: 'I **play** soccer.', translation: '私はサッカーを**します**。', isMemorized: false },
        { word: 'have', meaning: '【動詞】持っている / 食べる', example: 'I **have** a book.', translation: '私は本を**持っています**。', isMemorized: false },
        { word: 'make', meaning: '【動詞】作る', example: 'She **makes** dinner.', translation: '彼女は夕食を**作ります**。', isMemorized: false }
      ] 
    }
  ]);

  const [view, setView] = useState('boxes');
  const [currentBoxId, setCurrentBoxId] = useState(null);
  const [currentDeckId, setCurrentDeckId] = useState(null);

  const [newBoxName, setNewBoxName] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [selectedBoxForDeck, setSelectedBoxForDeck] = useState(1); 

  const [studyTime, setStudyTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  
  // ⭐️ スピードレベルを無段階（1〜100）で管理
  const [speedLevel, setSpeedLevel] = useState(40); 

  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeDeck = decks.find(d => d.id === currentDeckId);
  const allCards = activeDeck ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
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

  // ⭐️ 音声を極限までネイティブに近づける探索処理
  const playAudio = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      
      // スピードレベル(1〜100)から、音声速度(0.7倍〜1.5倍)を計算
      const rate = 0.7 + (speedLevel - 1) * (0.8 / 99);
      utterance.rate = rate;
      utterance.pitch = 1.05; // 少しピッチを調整するとAIっぽさが減ります

      const voices = window.speechSynthesis.getVoices();
      // 端末内の最も高品質な「人間らしい声（Premium, Naturalなど）」を優先的に探す
      const premiumVoice = voices.find(v => 
        v.lang.startsWith('en') && (
          v.name.includes('Online Natural') || 
          v.name.includes('Premium') || 
          v.name.includes('Samantha') || 
          v.name.includes('Google US English')
        )
      );
      utterance.voice = premiumVoice || voices.find(v => v.lang.startsWith('en'));
      window.speechSynthesis.speak(utterance);
    }
  }, [speedLevel]);

  useEffect(() => {
    if (view === 'study' && !isFlipped && studyCards.length > 0 && studyCards[currentIndex]) {
      playAudio(studyCards[currentIndex].word);
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

  const formatTime = (seconds) => seconds ? `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}` : '--:--';

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastRecordTime: studyTime } : d));
      setHasRecorded(true); 
    }
  }, [isCompleted, currentDeckId, studyTime]);

  const nextCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev + 1) % studyCards.length), 150); }, [studyCards.length]);
  const prevCard = useCallback(() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev - 1 + studyCards.length) % studyCards.length), 150); }, [studyCards.length]);

  // ⭐️ スピードレベル(1〜100)から、めくる間隔(4000ms〜400ms)を計算
  useEffect(() => {
    let autoTimer = null;
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      const delay = 4000 - (speedLevel - 1) * (3600 / 99); // スピード1=4秒, スピード100=0.4秒(神速)
      autoTimer = setTimeout(() => { if (!isFlipped) setIsFlipped(true); else if (currentIndex < studyCards.length - 1) nextCard(); else setIsAutoPlaying(false); }, delay);
    }
    return () => clearTimeout(autoTimer);
  }, [isAutoPlaying, isFlipped, currentIndex, speedLevel, studyCards.length, isCompleted, nextCard]);

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const handleRepeat = () => {
    stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setStudyTime(0); setHasRecorded(false);
  };

  const markAsMemorized = (e, wordToMark) => {
    e.stopPropagation(); stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => c.word === wordToMark ? { ...c, isMemorized: true } : c) };
    }));
  };

  const resetMemorized = () => {
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: d.cards.map(c => ({ ...c, isMemorized: false })) };
    }));
    handleRepeat();
  };

  const getEbbinghausStatus = (lastStudied) => {
    if (!lastStudied) return { label: '🆕 未学習', className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: '✅ 定着中', className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: '🔥 復習時', className: 'status-review', needsReview: true };
    return { label: '💤 リセット', className: 'status-warning', needsReview: false };
  };

  const fetchMeaning = async (targetWord) => {
    const prompt = `英単語「${targetWord}」について、必ず以下の【条件】に従って出力してください。
    【条件】
    1行目:【品詞】意味(最大2つ。2つの場合は「 / 」で区切る)
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

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; touchEndX.current = null; touchEndY.current = null; };
  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current; const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  const handleTouchEnd = () => {
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

  // ==========================================
  // 画面1：すべての箱が並ぶホーム画面
  // ==========================================
  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view">
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
          {boxes.map(box => (
            <div key={box.id} className={`storage-box-container ${decks.filter(d => d.boxId === box.id).some(d => getEbbinghausStatus(d.lastStudied).needsReview) ? 'polite-shake' : ''}`} onClick={() => openBox(box.id)}>
              <div className="storage-box"><div className="box-lid"></div><div className="box-body"><span className="box-label">{box.name}</span></div></div>
              <p className="box-instruction">{decks.filter(d => d.boxId === box.id).some(d => getEbbinghausStatus(d.lastStudied).needsReview) ? <span className="alert-text">🔥 復習のタイミング！</span> : 'タップして開ける'}</p>
              <button className="delete-deck-btn" style={{top: '10px'}} onClick={e => deleteBox(e, box.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // 画面2＆3：束一覧 ＆ 暗記モード
  // ==========================================
  return (
    <div className="app-container gentle-bg desk-view" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ overflow: 'hidden', position: 'relative' }}>
      <div style={dynamicStyle}>
        
        {view === 'decks' && (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={() => setView('boxes')}>◀ 机に戻る</button>
              <h2 className="app-title">📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
              <div style={{width: '80px'}}></div>
            </div>
            <p className="hint-text">💡 画面を下に引っ張っても戻れます</p>

            <div className="decks-grid">
              {decks.filter(d => d.boxId === currentBoxId).map(deck => (
                <div key={deck.id} className="deck-bundle" onClick={() => openDeck(deck.id)}>
                  <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
                  <div className="deck-paper top-cover">
                    <h3 className="deck-name">{deck.name}</h3><p className="deck-count">{deck.cards.length} 枚</p>
                    <div className={`status-badge ${getEbbinghausStatus(deck.lastStudied).className}`}>{getEbbinghausStatus(deck.lastStudied).label}</div>
                    {deck.lastRecordTime !== null && <p className="deck-record">⏱ {formatTime(deck.lastRecordTime)}</p>}
                    <button className="delete-deck-btn" onClick={e => deleteDeck(e, deck.id)}>×</button>
                  </div><div className="rubber-band"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'study' && (
          <div className="inner-view-wrapper">
            
            {!isFullscreen && (
              <div className="study-header">
                <button className="back-to-desk-btn" onClick={closeDeck}>◀ 箱に戻す</button>
                <h2 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{activeDeck?.name}</h2>
                <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible' }}>⏱ {formatTime(studyTime)}</div>
              </div>
            )}
            
            {!isFullscreen && !isBulkMode && (
              <div className="input-section" style={{ marginTop: '20px' }}>
                <input type="text" placeholder="単語を追加..." value={word} onChange={e => setWord(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddCard()} disabled={loading} />
                <button onClick={handleAddCard} className="add-btn" disabled={loading}>{loading ? '...' : '追加'}</button>
                <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn">📑 エクセルで丸投げ追加</button>
              </div>
            )}

            {!isFullscreen && isBulkMode && (
              <div className="bulk-input-section" style={{ marginTop: '20px' }}>
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
                        <button className="memorize-check-btn" onClick={(e) => markAsMemorized(e, studyCards[currentIndex]?.word)} title="覚えたらチェック！">✔</button>
                        <h1 className="word-text">{studyCards[currentIndex]?.word}</h1>
                      </div>
                      
                      <div className="card-back">
                        <div className="ring-hole"></div>
                        <button className="memorize-check-btn" onClick={(e) => markAsMemorized(e, studyCards[currentIndex]?.word)} title="覚えたらチェック！">✔</button>
                        
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
                  
                  {/* ⭐️ スピードボタンを4つに厳選 */}
                  <div className="speed-selectors">
                    <button className={`speed-btn ${speedLevel === 15 ? 'selected' : ''}`} onClick={() => setSpeedLevel(15)}>🐢 遅め</button>
                    <button className={`speed-btn ${speedLevel === 40 ? 'selected' : ''}`} onClick={() => setSpeedLevel(40)}>🚶 普通</button>
                    <button className={`speed-btn ${speedLevel === 70 ? 'selected' : ''}`} onClick={() => setSpeedLevel(70)}>🐇 高速</button>
                    <button className={`speed-btn ${speedLevel === 100 ? 'selected' : ''}`} onClick={() => setSpeedLevel(100)}>💫 神速</button>
                  </div>

                  {/* ⭐️ 無段階スピードスライダー */}
                  <div className="speed-slider-container">
                    <span style={{fontSize:'12px', color:'#a39c96'}}>遅</span>
                    <input 
                      type="range" min="1" max="100" 
                      value={speedLevel} 
                      onChange={(e) => setSpeedLevel(Number(e.target.value))}
                      className="speed-slider"
                    />
                    <span style={{fontSize:'12px', color:'#a39c96'}}>速</span>
                  </div>
                </div>
              </div>
            ) : (
              !isFullscreen && <div className="empty-deck-msg"><p>まだこの束にはカードがありません。</p></div>
            )}
          </div>
        )}
      </div>
      {pullDownY > 10 && <div className="virtual-drop-zone" style={{ opacity: Math.min(1, pullDownY / 100) }}><div className="storage-box drop-box-mini"><div className="box-body"><span className="box-label">👇 しまう</span></div></div></div>}
    </div>
  );
}

export default App;