/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const API_KEY = 'AIzaSyDgKNqCHpejyKy67b3SKuUFI5_ONiZqmvw'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

function App() {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const touchEndY = useRef(null);

  const [pullDownY, setPullDownY] = useState(0);
  const [isStoring, setIsStoring] = useState(false);

  // --- 階層管理 ---
  const [boxes, setBoxes] = useState([
    { id: 1, name: '中学英語マスター箱' },
    { id: 2, name: '資格・オリジナル箱' }
  ]);

  const [decks, setDecks] = useState([
    { 
      id: 1, boxId: 1, name: '基本の動詞', 
      lastStudied: Date.now() - (1000 * 60 * 60 * 48), 
      lastRecordTime: 125,
      cards: [
        { word: 'play', meaning: '【動詞】する / 遊ぶ', example: 'I **play** soccer.', translation: '私はサッカーをします。' },
        { word: 'have', meaning: '【動詞】持っている / 食べる', example: 'I **have** a book.', translation: '私は本を持っています。' },
        { word: 'make', meaning: '【動詞】作る', example: 'She **makes** dinner.', translation: '彼女は夕食を作ります。' }
      ] 
    },
    { 
      id: 2, boxId: 1, name: '重要名詞', 
      lastStudied: null, lastRecordTime: null,
      cards: [
        { word: 'environment', meaning: '【名詞】環境', example: 'Protect the **environment**.', translation: '環境を守ろう。' },
        { word: 'experience', meaning: '【名詞】経験', example: 'A good **experience**.', translation: '良い経験。' }
      ] 
    },
    { 
      id: 3, boxId: 1, name: '重要形容詞・副詞', 
      lastStudied: Date.now() - (1000 * 60 * 60 * 80),
      lastRecordTime: null,
      cards: [
        { word: 'necessary', meaning: '【形容詞】必要な', example: 'Water is **necessary**.', translation: '水は必要です。' },
        { word: 'popular', meaning: '【形容詞】人気のある', example: 'A **popular** sport.', translation: '人気のあるスポーツ。' }
      ] 
    },
    { 
      id: 4, boxId: 2, name: '初めてのオリジナル単語帳', 
      lastStudied: null, lastRecordTime: null,
      cards: [] 
    }
  ]);

  const [view, setView] = useState('boxes');
  const [currentBoxId, setCurrentBoxId] = useState(null);
  const [currentDeckId, setCurrentDeckId] = useState(null);

  // ⭐️ 作成用ステート
  const [newBoxName, setNewBoxName] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [selectedBoxForDeck, setSelectedBoxForDeck] = useState(1); // 束を作る時の対象箱

  const [studyTime, setStudyTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState('normal'); 

  // ⭐️ 追加モード用ステート
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeDeck = decks.find(d => d.id === currentDeckId);
  const cards = activeDeck ? activeDeck.cards : [];
  const isCompleted = cards.length > 0 && currentIndex === cards.length - 1 && isFlipped;

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const playAudio = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = ['fast', 'superfast', 'sonic', 'godspeed'].includes(playSpeed) ? 1.5 : 0.85;

      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
      );
      utterance.voice = premiumVoice || voices.find(v => v.lang.startsWith('en'));
      window.speechSynthesis.speak(utterance);
    }
  }, [playSpeed]);

  useEffect(() => {
    if (view === 'study' && !isFlipped && cards.length > 0 && cards[currentIndex]) {
      playAudio(cards[currentIndex].word);
    }
  }, [currentIndex, isFlipped, cards, view, playAudio]);

  useEffect(() => {
    let interval = null;
    if (view === 'study' && !isCompleted) {
      interval = setInterval(() => setStudyTime(prev => prev + 1), 1000);
    } else if (view !== 'study') {
      setStudyTime(0);
    }
    return () => clearInterval(interval);
  }, [view, isCompleted]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastRecordTime: studyTime } : d));
      setHasRecorded(true); 
    }
  }, [isCompleted, currentDeckId, studyTime]);

  const getDelayBySpeed = (speed) => {
    switch(speed) {
      case 'slow': return 3500;
      case 'normal': return 2500;
      case 'fast': return 1200;
      case 'superfast': return 600;
      case 'sonic': return 300;
      case 'godspeed': return 150;
      default: return 2500;
    }
  };

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150);
  }, [cards.length]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 150);
  }, [cards.length]);

  useEffect(() => {
    let autoTimer = null;
    if (isAutoPlaying && cards.length > 0 && !isCompleted) {
      const delay = getDelayBySpeed(playSpeed);
      autoTimer = setTimeout(() => {
        if (!isFlipped) setIsFlipped(true);
        else if (currentIndex < cards.length - 1) nextCard();
        else setIsAutoPlaying(false);
      }, delay);
    }
    return () => clearTimeout(autoTimer);
  }, [isAutoPlaying, isFlipped, currentIndex, playSpeed, cards.length, isCompleted, nextCard]);

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const getEbbinghausStatus = (lastStudied) => {
    if (!lastStudied) return { label: '🆕 未学習', className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / (1000 * 60 * 60);
    if (hoursPassed < 24) return { label: '✅ 定着中', className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: '🔥 復習時', className: 'status-review', needsReview: true };
    return { label: '💤 リセット', className: 'status-warning', needsReview: false };
  };

  const fetchMeaning = async (targetWord) => {
    const prompt = `英単語「${targetWord}」【条件】1行目:【品詞】意味(最大2つ) 2行目:中学レベル例文(**で囲む) 3行目:和訳【禁止】挨拶・番号・空行`;
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const lines = data.candidates[0].content.parts[0].text.split('\n').map(l => l.trim().replace(/^[1-3].\s*/, '')).filter(l => l);
      return { coreMeaning: lines[0] || '取得失敗', exampleText: lines[1] || '例文なし', translationText: lines[2] || '' };
    } catch (e) { 
      return { coreMeaning: 'エラー', exampleText: e.message, translationText: '' }; 
    }
  };

  const handleAddCard = async () => {
    if (!word.trim()) return;
    setLoading(true);
    const res = await fetchMeaning(word);
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...d.cards, { word, ...res }] } : d));
    setWord(''); setCurrentIndex(cards.length); setIsFlipped(false); setHasRecorded(false);
    setLoading(false);
  };

  // ⭐️ 新機能：Excelやスプレッドシートからの一括追加処理
  const handleBulkAdd = async () => {
    const wordList = bulkInput.split('\n').map(w => w.trim()).filter(w => w);
    if (wordList.length === 0) return;

    setLoading(true);
    setBulkProgress({ current: 0, total: wordList.length });
    
    const newCards = [];
    // レート制限を避けるため、1つずつ順番にAIにリクエストを送る
    for (let i = 0; i < wordList.length; i++) {
      const targetWord = wordList[i];
      const res = await fetchMeaning(targetWord);
      newCards.push({ word: targetWord, ...res });
      setBulkProgress({ current: i + 1, total: wordList.length });
      // API制限対策のわずかなウェイト
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...d.cards, ...newCards] } : d));
    setBulkInput('');
    setIsBulkMode(false);
    setLoading(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasRecorded(false);
  };

  const deleteCard = () => {
    stopAutoPlayIfActive();
    if (window.confirm('このカードを削除しますか？')) {
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: d.cards.filter((_, i) => i !== currentIndex) } : d));
      if (currentIndex >= cards.length - 1 && cards.length > 1) setCurrentIndex(cards.length - 2);
      setIsFlipped(false); setHasRecorded(false);
    }
  };

  // --- 箱と束の作成 ---
  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    const newBox = { id: Date.now(), name: newBoxName };
    setBoxes([...boxes, newBox]);
    setSelectedBoxForDeck(newBox.id); // 新しい箱をプルダウンのデフォルトにする
    setNewBoxName('');
  };

  const createNewDeck = () => {
    if (!newDeckName.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: Number(selectedBoxForDeck), name: newDeckName, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckName('');
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm('箱と中の束をすべて削除しますか？')) {
      setBoxes(boxes.filter(b => b.id !== boxId));
      setDecks(decks.filter(d => d.boxId !== boxId));
    }
  };

  const openBox = (boxId) => { setCurrentBoxId(boxId); setView('decks'); };
  const openDeck = (id) => { setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); };
  
  const closeDeck = useCallback(() => {
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks');
  }, [currentDeckId]);

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm('束を削除しますか？')) setDecks(decks.filter(d => d.id !== id)); };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <span key={i} className="highlight-word">{part}</span> : part);
  };

  // ドラッグアクション
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null; touchEndY.current = null;
  };
  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current;
    const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  const handleTouchEnd = () => {
    if (pullDownY > 120) {
      setIsStoring(true); setPullDownY(window.innerHeight);
      setTimeout(() => {
        if (view === 'study') closeDeck(); else if (view === 'decks') setView('boxes');
        setIsStoring(false); setPullDownY(0);
      }, 400);
    } else {
      setPullDownY(0);
      const diffX = touchStartX.current - (touchEndX.current || touchStartX.current);
      if (Math.abs(diffX) > 50 && view === 'study') {
        stopAutoPlayIfActive();
        if (diffX > 0) nextCard(); else prevCard();
      }
    }
  };

  const dynamicStyle = { transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`, opacity: 1 - pullDownY / 800, transition: isStoring ? 'all 0.4s' : (pullDownY === 0 ? '0.3s' : 'none'), width: '100%', height: '100%' };

  // ==========================================
  // 画面1：すべての箱が並ぶホーム画面（作成UI統合版）
  // ==========================================
  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view">
        <h2 className="app-title">あなたの単語帳ボックス</h2>
        
        {/* ⭐️ 箱と束の作成エリアを同じ場所に統合 */}
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
            const needsReview = decks.filter(d => d.boxId === box.id).some(d => getEbbinghausStatus(d.lastStudied).needsReview);
            return (
              <div key={box.id} className={`storage-box-container ${needsReview ? 'polite-shake' : ''}`} onClick={() => openBox(box.id)}>
                <div className="storage-box"><div className="box-lid"></div><div className="box-body"><span className="box-label">{box.name}</span></div></div>
                <p className="box-instruction">{needsReview ? <span className="alert-text">🔥 復習のタイミング！</span> : 'タップして開ける'}</p>
                <button className="delete-deck-btn" style={{top: '10px'}} onClick={e => deleteBox(e, box.id)}>×</button>
              </div>
            );
          })}
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
              {decks.filter(d => d.boxId === currentBoxId).map(deck => {
                const status = getEbbinghausStatus(deck.lastStudied);
                return (
                  <div key={deck.id} className="deck-bundle" onClick={() => openDeck(deck.id)}>
                    <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
                    <div className="deck-paper top-cover">
                      <h3 className="deck-name">{deck.name}</h3><p className="deck-count">{deck.cards.length} 枚</p>
                      <div className={`status-badge ${status.className}`}>{status.label}</div>
                      {deck.lastRecordTime !== null && <p className="deck-record">⏱ {formatTime(deck.lastRecordTime)}</p>}
                      <button className="delete-deck-btn" onClick={e => deleteDeck(e, deck.id)}>×</button>
                    </div><div className="rubber-band"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'study' && (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={closeDeck}>◀ 箱に戻す</button>
              <h2 className="app-title">{activeDeck?.name}</h2>
              <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`}>⏱ {formatTime(studyTime)}</div>
            </div>
            
            {/* ⭐️ 一括追加モードの切り替え */}
            {!isBulkMode ? (
              <div className="input-section" style={{ marginTop: '20px' }}>
                <input type="text" placeholder="単語を追加..." value={word} onChange={e => setWord(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddCard()} disabled={loading} />
                <button onClick={handleAddCard} className="add-btn" disabled={loading}>{loading ? '...' : '追加'}</button>
                <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn">📑 エクセル等で一括追加</button>
              </div>
            ) : (
              <div className="bulk-input-section" style={{ marginTop: '20px' }}>
                <p className="bulk-hint">Excelやスプレッドシートの単語列をコピーして貼り付けてください（改行区切り）</p>
                <textarea 
                  className="bulk-textarea" 
                  placeholder="apple&#10;banana&#10;orange" 
                  value={bulkInput} 
                  onChange={e => setBulkInput(e.target.value)} 
                  disabled={loading}
                />
                <div className="bulk-actions">
                  <button onClick={handleBulkAdd} className="add-btn bulk-start-btn" disabled={loading || !bulkInput.trim()}>
                    {loading ? `自動生成中... (${bulkProgress.current} / ${bulkProgress.total})` : '🚀 一気にAI生成して追加'}
                  </button>
                  <button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>キャンセル</button>
                </div>
              </div>
            )}

            {cards.length > 0 ? (
              <div className="flashcard-area">
                <p className="card-counter">{currentIndex + 1} / {cards.length}</p>
                <div className="card-animation-wrapper" key={currentIndex}>
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                    <div className="card-inner">
                      <div className="card-front"><div className="ring-hole"></div><h1 className="word-text">{cards[currentIndex]?.word}</h1></div>
                      <div className="card-back"><div className="ring-hole"></div>
                        <div className="back-content">
                          <div className="meaning-section">
                            <h2 className="core-meaning">{cards[currentIndex]?.meaning.split('/').map((m, i) => <span key={i} style={{display:'block', margin:'4px 0'}}>{m.trim()}</span>)}</h2>
                          </div>
                          <div className="example-section">
                            <p className="example-en">{renderHighlightedText(cards[currentIndex]?.example)}</p>
                            <p className="example-ja">{cards[currentIndex]?.translation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {isCompleted && <div className="completion-message">🎉 完了! タイム: {formatTime(studyTime)}</div>}
                <div className="controls"><button onClick={() => {stopAutoPlayIfActive(); prevCard();}} className="nav-btn">◀</button><button onClick={deleteCard} className="delete-btn">捨てる</button><button onClick={() => {stopAutoPlayIfActive(); nextCard();}} className="nav-btn">▶</button></div>
                <div className="autoplay-controls"><button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={() => setIsAutoPlaying(!isAutoPlaying)}>{isAutoPlaying ? '⏸ 停止' : '▶️ 自動再生'}</button>
                  <div className="speed-selectors">{['slow','normal','fast','superfast','sonic','godspeed'].map(s => <button key={s} className={`speed-btn ${playSpeed === s ? 'selected' : ''}`} onClick={() => setPlaySpeed(s)}>{s === 'godspeed' ? '💫 神速' : s === 'sonic' ? '🚀 音速' : s === 'superfast' ? '⚡ 超速' : s === 'fast' ? '🐇 高速' : s === 'normal' ? '🚶 普通' : '🐢 遅め'}</button>)}</div>
                </div>
              </div>
            ) : (
              <div className="empty-deck-msg"><p>まだこの束にはカードがありません。</p></div>
            )}
          </div>
        )}
      </div>
      {pullDownY > 10 && <div className="virtual-drop-zone" style={{ opacity: Math.min(1, pullDownY / 100) }}><div className="storage-box drop-box-mini"><div className="box-body"><span className="box-label">👇 しまう</span></div></div></div>}
    </div>
  );
}

export default App;