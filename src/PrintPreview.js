import React, { useMemo } from 'react';
import { chunkArray, cleanText, cleanTranslation, renderBlankExample, renderHighlightedText } from './utils';

const PrintPreview = ({ t, setView, printCards, printMode, activeDeck, shufflePrintCards, handleTouchStart, handleTouchMove, handleTouchEnd, handleClick }) => {
  
  // ★ 4択モード用の選択肢付きカードリストを生成
  const cardsWithChoices = useMemo(() => {
    if (printMode !== 'choice') return printCards;
    
    // Warning解消: 毎回新しい配列を作らないように、定義をuseMemoの中に移動しました
    const allCards = activeDeck?.cards || []; 
    
    return printCards.map(card => {
      // 例文や強調がない場合は選択肢なしとして扱う
      if (!card.example || !card.example.includes('**')) {
        return { ...card, choices: [] };
      }
      const correctAnswer = card.word;
      const targetPos = card.pos;
      const others = allCards.filter(c => c.word !== correctAnswer);
      
      // 同じ品詞を優先してダミーを作成
      const samePos = targetPos ? others.filter(c => c.pos === targetPos).sort(() => Math.random() - 0.5) : [];
      const diffPos = others.filter(c => c.pos !== targetPos).sort(() => Math.random() - 0.5);
      
      const combinedPool = [...samePos, ...diffPos];
      const dummies = combinedPool.slice(0, 3).map(c => c.word);

      // 正解1つ ＋ ダミー3つ をシャッフル
      const choices = [correctAnswer, ...dummies].sort(() => Math.random() - 0.5);
      return { ...card, choices, correctAnswer };
    });
  }, [printCards, printMode, activeDeck?.cards]); // 依存配列も最適化

  // 4択と例文は10問、単語は25問で改ページ
  const chunkSize = printMode === 'word' ? 25 : 10;
  const chunks = chunkArray(cardsWithChoices, chunkSize);
  const title = printMode === 'choice' ? '4択テスト (英検形式)' : (printMode === 'example' ? t.printTestExampleTitle : t.printTestTitle);
  const todayStr = new Date().toLocaleDateString();

  return (
    <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="print-controls no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center', width: '100%', padding: '20px', background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
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
                  <div className="print-score-compact">{t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span></div>
                </div>
              )}
              
              {printMode === 'example' ? (
                <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                  {chunk.map((c, i) => {
                    const globalIndex = pageIndex * chunkSize + i + 1;
                    return (
                      <div key={`ex-${i}`} className="print-q-item-example">
                        <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span></div>
                        <div className="print-q-bottom"><div className="print-q-example-en">{renderBlankExample(c.example)}</div></div>
                      </div>
                    );
                  })}
                </div>
              ) : printMode === 'choice' ? (
                <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                  {chunk.map((c, i) => {
                    const globalIndex = pageIndex * chunkSize + i + 1;
                    return (
                      <div key={`choice-${i}`} className="print-q-item-example" style={{ marginBottom: '25px' }}>
                        <div className="print-q-top">
                          <span className="print-q-num">({globalIndex})</span>
                          <span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span>
                        </div>
                        <div className="print-q-bottom" style={{ marginBottom: '8px' }}>
                          <div className="print-q-example-en">{renderBlankExample(c.example)}</div>
                        </div>
                        {c.choices && c.choices.length > 0 ? (
                          <div style={{ display: 'flex', gap: '15px', paddingLeft: '30px', fontSize: '16px', fontFamily: '"Times New Roman", Times, serif' }}>
                            {c.choices.map((choice, idx) => (
                              <span key={idx} style={{ flex: 1, whiteSpace: 'nowrap' }}>{idx + 1}. {choice}</span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ paddingLeft: '30px', fontSize: '12px', color: '#e74c3c' }}>※例文に ** (強調) が設定されていません。</div>
                        )}
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
                          <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span></div>
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
                          <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span></div>
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
        {printMode === 'choice' ? (
          // ★ 4択モードの解答用紙：数字だけで1枚にスッキリ収める
          <div className="print-page">
            <div className="print-header-compact">
              <div className="print-date-compact">{t.printDate} {todayStr}</div>
              <h1 className="print-title-compact" title={`${activeDeck?.name} ${title} ${t.lang === 'ja' ? '【解答】' : '[Answers]'}`}>
                {activeDeck?.name} {title} <span style={{color: '#e74c3c', fontSize: '18px', marginLeft: '10px'}}>{t.lang === 'ja' ? '【解答】' : '[Answers]'}</span>
              </h1>
              <div className="print-name-compact">{t.printName}</div>
              <div className="print-score-compact">{t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '30px 10px', marginTop: '40px', padding: '0 20px' }}>
              {cardsWithChoices.map((c, i) => {
                const ansIndex = c.choices?.indexOf(c.correctAnswer) + 1;
                return (
                  <div key={`ans-choice-${i}`} style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ color: '#2c3e50', marginRight: '8px', width: '40px', textAlign: 'right' }}>({i + 1})</span>
                    <span style={{ color: '#e74c3c', borderBottom: '1px solid #000', width: '50px', textAlign: 'center', paddingBottom: '2px' }}>
                      {ansIndex ? ansIndex : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          chunks.map((chunk, pageIndex) => {
            return (
              <div key={`answer-page-${pageIndex}`} className="print-page">
                {pageIndex === 0 && (
                  <div className="print-header-compact">
                    <div className="print-date-compact">{t.printDate} {todayStr}</div>
                    <h1 className="print-title-compact" title={`${activeDeck?.name} ${title} ${t.lang === 'ja' ? '【解答】' : '[Answers]'}`}>{activeDeck?.name} {title} <span style={{color: '#e74c3c', fontSize: '18px', marginLeft: '10px'}}>{t.lang === 'ja' ? '【解答】' : '[Answers]'}</span></h1>
                    <div className="print-name-compact">{t.printName}</div>
                    <div className="print-score-compact">{t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span></div>
                  </div>
                )}
                {printMode === 'example' ? (
                  <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                    {chunk.map((c, i) => {
                      const globalIndex = pageIndex * chunkSize + i + 1;
                      return (
                        <div key={`ans-ex-${i}`} className="print-q-item-example">
                          <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span></div>
                          <div className="print-q-bottom"><div className="print-q-example-en" style={{fontWeight: 'bold', color: '#2c3e50'}}>{renderHighlightedText(c.example)}</div></div>
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
                            <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span></div>
                            <div className="print-q-bottom" style={{ borderBottom: '1px solid #000', height: '24px', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', paddingLeft: '5px', fontSize: '15px', fontWeight: 'bold', color: '#e74c3c' }}>{c.word}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="print-column">
                      {chunk.slice(Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + Math.ceil(chunk.length / 2) + i + 1;
                        return (
                          <div key={`ans-right-${i}`} className="print-q-item">
                            <div className="print-q-top"><span className="print-q-num">({globalIndex})</span><span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span></div>
                            <div className="print-q-bottom" style={{ borderBottom: '1px solid #000', height: '24px', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', paddingLeft: '5px', fontSize: '15px', fontWeight: 'bold', color: '#e74c3c' }}>{c.word}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PrintPreview;