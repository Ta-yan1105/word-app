import React from 'react';
import { chunkArray, cleanText, cleanTranslation, renderBlankExample, renderHighlightedText } from './utils';

const PrintPreview = ({ t, setView, printCards, printMode, activeDeck, shufflePrintCards, handleTouchStart, handleTouchMove, handleTouchEnd, handleClick }) => {
  const chunkSize = printMode === 'example' ? 10 : 25;
  const chunks = chunkArray(printCards, chunkSize);
  const title = printMode === 'example' ? t.printTestExampleTitle : t.printTestTitle;
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
        {chunks.map((chunk, pageIndex) => {
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
        })}
      </div>
    </div>
  );
};

export default PrintPreview;