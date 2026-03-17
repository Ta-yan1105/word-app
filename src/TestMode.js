import React, { useState, useEffect } from 'react';

const TestMode = ({ t, setView, allCards }) => {
  const [testQuestions, setTestQuestions] = useState([]); 
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [score, setScore] = useState(0); 
  const [showTestResult, setShowTestResult] = useState(false); 
  const [testEffect, setTestEffect] = useState(null); 
  const [combo, setCombo] = useState(0);

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
    if (allCards.length < 4) { 
      alert(t.testNeeds4); 
      setView('study');
      return; 
    }
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
    const questions = shuffledCards.map(card => {
      const correctMeaning = card.meaning || '意味なし';
      
      // Setを使って、重複しない選択肢（正解を含む）のリストを作成
      const optionsSet = new Set([correctMeaning]);
      
      // 自分自身のカードを除外（単語の一致ではなくオブジェクト自身を除外）してシャッフル
      const otherCards = [...allCards].filter(c => c !== card).sort(() => Math.random() - 0.5);
      
      // 異なる意味を持つ選択肢を4つになるまで追加していく
      for (const otherCard of otherCards) {
        optionsSet.add(otherCard.meaning || '意味なし');
        if (optionsSet.size === 4) break;
      }
      
      // 万が一、アプリ全体で登録されている「意味」の種類が4つ未満の場合、プレースホルダーで確実に4枠埋める
      let counter = 1;
      while (optionsSet.size < 4) {
        optionsSet.add(`(他の選択肢 ${counter++})`);
      }
      
      // 配列に変換して選択肢の並び順をシャッフル
      const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
      
      return { word: card.word, correct: correctMeaning, options: options };
    });
    
    setTestQuestions(questions); 
    setCurrentTestIndex(0); 
    setScore(0); 
    setShowTestResult(false); 
    setTestEffect(null); 
    setCombo(0);
  };

  // 画面が開かれた瞬間にテストを生成してスタート
  useEffect(() => {
    startTest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (testQuestions.length === 0) return null;

  return (
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
            <button className="add-btn" onClick={startTest}>{t.tryAgainBtn}</button>
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
  );
};

export default TestMode;