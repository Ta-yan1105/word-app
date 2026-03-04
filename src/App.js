import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const API_KEY = 'AIzaSyDgKNqCHpejyKy67b3SKuUFI5_ONiZqmvw'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

function App() {
  // ⭐️ スワイプ・引っ張りアクションの計算用（エラー修正済）
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
      id: 1, boxId: 1, name: '基本の動詞（中学レベル）', 
      lastStudied: Date.now() - (1000 * 60 * 60 * 48), 
      lastRecordTime: 125,
      cards: [
        { word: 'play', meaning: '【動詞】する / 遊ぶ', example: 'I **play** soccer.', translation: '私はサッカーをします。' },
        { word: 'have', meaning: '【動詞】持っている / 食べる', example: 'I **have** a book.', translation: '私は本を持っています。' },
        { word: 'make', meaning: '【動詞】作る', example: 'She **makes** dinner.', translation: '彼女は夕食を作ります。' }
      ] 
    },
    { 
      id: 2, boxId: 1, name: '重要名詞（中学レベル）', 
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

  const [newBoxName, setNewBoxName] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  
  const [studyTime, setStudyTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState('normal'); 

  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // ⭐️ デプロイ警告回避：音声を鳴らす関数をuseCallbackでメモ化
  const playAudio = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = ['fast', 'superfast', 'sonic', 'godspeed'].includes(playSpeed) ? 1.5 : 0.85;

      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));

      if (englishVoices.length > 0) {
        const premiumVoice = englishVoices.find(v => 
          v.name.includes('Google US English') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Samantha')
        );
        utterance.voice = premiumVoice || englishVoices[0];
      }
      window.speechSynthesis.speak(utterance);
    }
  }, [playSpeed]);

  const activeDeck = decks.find(d => d.id === currentDeckId);
  const cards = activeDeck ? activeDeck.cards : [];
  const isCompleted = cards.length > 0 && currentIndex === cards.length - 1 && isFlipped;

  useEffect(() => {
    if (view === 'study' && !isFlipped && cards.length > 0) {
      playAudio(cards[currentIndex]?.word || '');
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
    if (isCompleted && !hasRecorded) {
      setDecks(prevDecks => prevDecks.map(deck => 
        deck.id === currentDeckId ? { ...deck, lastRecordTime: studyTime } : deck
      ));
      setHasRecorded(true); 
    }
  }, [isCompleted, currentDeckId, hasRecorded, studyTime]);

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

  // ⭐️ デプロイ警告回避：カード操作関数をメモ化
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
        else {
          if (currentIndex < cards.length - 1) nextCard();
          else setIsAutoPlaying(false);
        }
      }, delay);
    }
    return () => clearTimeout(autoTimer);
  }, [isAutoPlaying, isFlipped, currentIndex, playSpeed, cards.length, isCompleted, nextCard]);

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };

  const getEbbinghausStatus = (lastStudied) => {
    if (!lastStudied) return { label: '🆕 未学習', className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / (1000 * 60 * 60);
    if (hoursPassed < 24) return { label: '✅ 記憶定着中', className: 'status-fresh', needsReview: false };
    else if (hoursPassed < 72) return { label: '🔥 復習のベスト時期', className: 'status-review', needsReview: true };
    else return { label: '💤 長期放置（リセット）', className: 'status-warning', needsReview: false }; 
  };

  const doesBoxNeedReview = (boxId) => {
    const boxDecks = decks.filter(d => d.boxId === boxId);
    return boxDecks.some(deck => getEbbinghausStatus(deck.lastStudied).needsReview);
  };

  const fetchMeaning = async (targetWord) => {
    setLoading(true);
    const prompt = `英単語「${targetWord}」について、必ず以下の【条件】に従って出力してください。
    【条件】
    1行目：【品詞】最もよく使われる意味（※最大2つまで。2つの場合は「 / 」で区切る）
    2行目：中学レベルの英文（※対象単語を「**」で囲む）
    3行目：和訳
    【禁止事項】挨拶、説明、箇条書き番号、空行は一切含めないでください。`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const aiResponse = data.candidates[0].content.parts[0].text;
      const lines = aiResponse.split('\n').map(l => l.trim().replace(/^(1|2|3)[.．:：行目]*\s*/, '')).filter(l => l !== '');
      return { coreMeaning: lines[0] || '取得失敗', exampleText: lines[1] || '例文なし', translationText: lines[2] || '' };
    } catch (error) {
      return { coreMeaning: 'エラー', exampleText: `原因: ${error.message}`, translationText: '通信を確認してください。' };
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (word.trim() === '') return;
    const result = await fetchMeaning(word);
    const newCard = { word, meaning: result.coreMeaning, example: result.exampleText, translation: result.translationText };
    setDecks(decks.map(deck => deck.id === currentDeckId ? { ...deck, cards: [...deck.cards, newCard] } : deck));
    setWord(''); setCurrentIndex(cards.length); setIsFlipped(false); setHasRecorded(false);
  };

  const deleteCard = () => {
    stopAutoPlayIfActive();
    if (window.confirm('このカードを削除しますか？')) {
      setDecks(decks.map(deck => {
        if (deck.id === currentDeckId) return { ...deck, cards: deck.cards.filter((_, index) => index !== currentIndex) };
        return deck;
      }));
      if (currentIndex >= cards.length - 1 && cards.length > 1) setCurrentIndex(cards.length - 2);
      setIsFlipped(false); setHasRecorded(false);
    }
  };

  const createNewBox = () => {
    if (newBoxName.trim() === '') return;
    setBoxes([...boxes, { id: Date.now(), name: newBoxName }]);
    setNewBoxName('');
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm('この箱と、中に入っている単語帳をすべて削除しますか？')) {
      setBoxes(boxes.filter(b => b.id !== boxId));
      setDecks(decks.filter(d => d.boxId !== boxId));
    }
  };

  const openBox = (boxId) => {
    setCurrentBoxId(boxId); setView('decks');
  };

  const createNewDeck = () => {
    if (newDeckName.trim() === '') return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckName, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckName('');
  };

  const openDeck = (id) => {
    setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id);
    setView('study');
  };

  // ⭐️ デプロイ警告回避
  const closeDeck = useCallback(() => {
    setDecks(prevDecks => prevDecks.map(deck => deck.id === currentDeckId ? { ...deck, lastStudied: Date.now() } : deck));
    setIsAutoPlaying(false); setCurrentDeckId(null);
    setView('decks');
  }, [currentDeckId]);

  const deleteDeck = (e, id) => {
    e.stopPropagation(); 
    if (window.confirm('この単語の束をまるごと削除しますか？')) setDecks(decks.filter(deck => deck.id !== id));
  };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    return text.split(/\*\*(.*?)\*\*/g).map((part, index) => index % 2 === 1 ? <span key={index} className="highlight-word">{part}</span> : part);
  };

  // ⭐️⭐️ 指で引っ張って箱にしまう「ドラッグ＆ドロップ」処理（エラー完全修正済） ⭐️⭐️
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;

    const diffX = touchStartX.current - touchEndX.current; // 横移動
    const diffY = touchEndY.current - touchStartY.current; // 縦移動（下へ引くとプラス）

    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) {
      setPullDownY(diffY);
    }
  };

  const handleTouchEnd = () => {
    // 縦に120px以上引っ張って指を離した場合、収納アニメーションを発動
    if (pullDownY > 120) {
      setIsStoring(true);
      setPullDownY(window.innerHeight); // 画面の下まで一気に突き落とす
      setTimeout(() => {
        if (view === 'study') closeDeck();
        else if (view === 'decks') setView('boxes');
        setIsStoring(false);
        setPullDownY(0);
      }, 400); // 落下時間待機
    } else {
      // 引っ張りが足りない場合は元に戻す
      setPullDownY(0);
      
      // 横スワイプの判定（カードめくり）
      if (touchStartX.current && touchEndX.current && view === 'study') {
        const diffX = touchStartX.current - touchEndX.current;
        if (Math.abs(diffX) > 50 && pullDownY < 50) {
          stopAutoPlayIfActive();
          if (diffX > 0) nextCard(); else prevCard(); 
        }
      }
    }
    
    // 値をリセット
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  // ⭐️ 引っ張った時の画面の変形スタイル
  const dynamicStyle = {
    transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`,
    opacity: 1 - pullDownY / 800,
    transition: isStoring ? 'all 0.4s cubic-bezier(0.5, 0, 0, 1)' : (pullDownY === 0 ? 'all 0.3s' : 'none'),
    width: '100%',
    height: '100%'
  };

  // ==========================================
  // 画面1：すべての箱が並ぶホーム画面
  // ==========================================
  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view">
        <h2 className="app-title">あなたの単語帳ボックス</h2>
        <div className="create-deck-section">
          <input type="text" placeholder="新しい箱の名前 (例: 英検用)" value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createNewBox()} />
          <button onClick={createNewBox} className="add-btn">箱を作る</button>
        </div>
        <div className="boxes-grid">
          {boxes.map(box => {
            const needsReview = doesBoxNeedReview(box.id);
            return (
              <div key={box.id} className={`storage-box-container ${needsReview ? 'polite-shake' : ''}`} onClick={() => openBox(box.id)}>
                <div className="storage-box">
                  <div className="box-lid"></div>
                  <div className="box-body"><span className="box-label">{box.name}</span></div>
                </div>
                {needsReview ? (
                  <p className="box-instruction alert-text">🔥 復習のタイミング！</p>
                ) : (
                  <p className="box-instruction">タップして開ける</p>
                )}
                <button className="delete-deck-btn" style={{top: '10px'}} onClick={(e) => deleteBox(e, box.id)}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // 画面2＆3：束一覧 ＆ 暗記モード（ドラッグ対応枠）
  // ==========================================
  return (
    <div 
      className="app-container gentle-bg desk-view"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overflow: 'hidden', position: 'relative' }} 
    >
      <div style={dynamicStyle}>
        
        {/* === 画面2：箱の中身（束一覧） === */}
        {view === 'decks' && (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={() => setView('boxes')}>◀ 箱を閉じる</button>
              <h2 className="app-title" style={{ marginBottom: 0 }}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
              <div style={{ width: '80px' }}></div>
            </div>
            <p className="hint-text">💡 画面を下に引っ張っても箱を閉じれます</p>

            <div className="create-deck-section" style={{ marginTop: '20px' }}>
              <input type="text" placeholder="この箱に新しい束を作る..." value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createNewDeck()} />
              <button onClick={createNewDeck} className="add-btn">束ねる</button>
            </div>

            <div className="decks-grid">
              {decks.filter(d => d.boxId === currentBoxId).map(deck => {
                const status = getEbbinghausStatus(deck.lastStudied);
                return (
                  <div key={deck.id} className="deck-bundle" onClick={() => openDeck(deck.id)}>
                    <div className="deck-paper stack-bottom"></div>
                    <div className="deck-paper stack-middle"></div>
                    <div className="deck-paper top-cover">
                      <h3 className="deck-name">{deck.name}</h3>
                      <p className="deck-count">{deck.cards.length} 枚</p>
                      <div className={`status-badge ${status.className}`}>{status.label}</div>
                      {deck.lastRecordTime !== null && <p className="deck-record">⏱ 前回: {formatTime(deck.lastRecordTime)}</p>}
                      <button className="delete-deck-btn" onClick={(e) => deleteDeck(e, deck.id)}>×</button>
                    </div>
                    <div className="rubber-band"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === 画面3：暗記モード === */}
        {view === 'study' && (
          <div className="inner-view-wrapper">
            <div className="study-header">
              <button className="back-to-desk-btn" onClick={closeDeck}>◀ 束を戻す</button>
              <h2 className="app-title" style={{ marginBottom: 0 }}>{activeDeck.name}</h2>
              <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`}>
                <span className="timer-icon">⏱</span> {formatTime(studyTime)}
              </div>
            </div>
            
            <div className="input-section" style={{ marginTop: '30px' }}>
              <input type="text" placeholder="この束に英単語を追加..." value={word} onChange={(e) => setWord(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddCard()} disabled={loading} />
              <button onClick={handleAddCard} className="add-btn" disabled={loading}>{loading ? '生成中...' : '追加'}</button>
            </div>

            {cards.length > 0 ? (
              <div className="flashcard-area">
                <p className="card-counter">{currentIndex + 1} / {cards.length}</p>
                <div className="card-animation-wrapper" key={currentIndex}>
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => { stopAutoPlayIfActive(); setIsFlipped(!isFlipped); }}>
                    <div className="card-inner">
                      <div className="card-front"><div className="ring-hole"></div><h1 className="word-text">{cards[currentIndex]?.word}</h1></div>
                      <div className="card-back">
                        <div className="ring-hole"></div>
                        <div className="back-content">
                          <div className="meaning-section">
                            <h2 className="core-meaning">
                              {cards[currentIndex]?.meaning.split('/').map((m, i) => <span key={i} style={{ display: 'block', margin: '6px 0' }}>{m.trim()}</span>)}
                            </h2>
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

                {isCompleted && <div className="completion-message">🎉 学習完了！ 記録タイム: {formatTime(studyTime)}</div>}

                <div className="controls">
                  <button onClick={() => { stopAutoPlayIfActive(); prevCard(); }} className="nav-btn">◀</button>
                  <button onClick={deleteCard} className="delete-btn">捨てる</button>
                  <button onClick={() => { stopAutoPlayIfActive(); nextCard(); }} className="nav-btn">▶</button>
                </div>

                <div className="autoplay-controls">
                  <button className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
                    {isAutoPlaying ? '⏸ 自動めくり停止' : '▶️ 自動めくり開始'}
                  </button>
                  <div className="speed-selectors">
                    <button className={`speed-btn ${playSpeed === 'slow' ? 'selected' : ''}`} onClick={() => setPlaySpeed('slow')}>🐢 遅め</button>
                    <button className={`speed-btn ${playSpeed === 'normal' ? 'selected' : ''}`} onClick={() => setPlaySpeed('normal')}>🚶 普通</button>
                    <button className={`speed-btn ${playSpeed === 'fast' ? 'selected' : ''}`} onClick={() => setPlaySpeed('fast')}>🐇 高速</button>
                    <button className={`speed-btn ${playSpeed === 'superfast' ? 'selected' : ''}`} onClick={() => setPlaySpeed('superfast')}>⚡ 超速</button>
                    <button className={`speed-btn ${playSpeed === 'sonic' ? 'selected' : ''}`} onClick={() => setPlaySpeed('sonic')}>🚀 音速</button>
                    <button className={`speed-btn ${playSpeed === 'godspeed' ? 'selected' : ''}`} onClick={() => setPlaySpeed('godspeed')}>💫 神速</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-deck-msg"><p>まだこの束にはカードがありません。</p></div>
            )}
          </div>
        )}
      </div>

      {/* ⭐️ 引っ張っている時に下部から現れる「仮想ボックス」 */}
      {pullDownY > 10 && (
        <div className="virtual-drop-zone" style={{ opacity: Math.min(1, pullDownY / 100) }}>
          <div className="storage-box drop-box-mini">
             <div className="box-body"><span className="box-label">👇 ここにしまう</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;