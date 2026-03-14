import React from 'react';

function Manual({ t, setView }) {
  // tの中に日本語が含まれているかで表示言語を自動判定
  const isJa = t.appTitle ? t.appTitle.match(/[ぁ-んァ-ヶ亜-熙]/) : true;

  return (
    <div className="app-container gentle-bg desk-view">
      {/* ヘッダー部分 */}
      <div className="study-header" style={{ marginBottom: '30px' }}>
        <button className="back-to-desk-btn" onClick={() => setView('boxes')}>
          {t.backBtn || '◀ 戻る'}
        </button>
        <h2 className="app-title" style={{ margin: 0, textAlign: 'center', flex: 1, paddingRight: '80px' }}>
          {isJa ? '📖 REDLINE VOCABULARY の使い方' : '📖 How to use REDLINE VOCABULARY'}
        </h2>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: 'clamp(20px, 5vw, 40px)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', lineHeight: '1.8', color: '#334155' }}>

        {isJa ? (
          // ==============================
          // 日本語マニュアル
          // ==============================
          <>
            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>1. 箱と束（デッキ）の作成 📦</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                まずは「箱」を作り、その中に単語の「束（デッキ）」を作成します。<br/>
                先生や友達から<b>「6桁の共有コード」</b>をもらった場合は、「🔗 共有」ボタンからコードを入力するだけで、一瞬で単語帳をダウンロードできます。
              </p>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>2. 単語の追加とCSVインポート 📂</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                「手動で追加」から1語ずつ追加するか、「CSVで追加」から一括インポートが可能です。<br/>
                AI（ChatGPT等）を使って、自分の趣味や興味に合った例文をCSVで作ってもらうと、記憶への定着率が劇的にアップします。
              </p>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>3. 学習と「Deep Dive（深く調べる）」 🔍</h3>
              <ul style={{ paddingLeft: '20px', fontSize: '15px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><b>基本操作:</b> カードをタップしてめくり、右上の「✔」で暗記済みにします。<br/>（スマホの場合はカード上で左右にスワイプ、PCの場合は矢印キーやスペースキーでも快適に操作可能です）</li>
                <li><b>Deep Dive機能:</b> カード裏面の右下にある「🔍」アイコンをタップすると、Weblio、英辞郎、YouGlish（YouTube動画検索）などの辞書に一発でアクセスできます。気になった単語の語源や生きた文脈を深く知りましょう。<br/>※ トップ画面右上の「⚙️ 辞書設定」から、自分好みの辞書をカスタマイズできます。</li>
              </ul>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>4. テスト＆プリント（PDF出力） 🖨️</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                学習画面の「🎯 テスト＆プリント」ボタンから、アプリ内でのテストや、PDF形式の美しいプリントを作成できます。<br/>
                「単語リスト」「例文プリント」さらに「英検形式の4択問題」など、目的に合わせて出力し、印刷して学習に役立ててください。
              </p>
            </section>

            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>5. 目指せ「30,000語（ネイティブレベル）」 👑</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                トップ画面のステータスバーは、あなたが覚えた単語の総数を示しています。<br/>
                基礎レベル（1,200語）から始まり、最終的には教養あるネイティブスピーカーのレベルである<b>「30,000語」</b>を目指して、自分の限界を突破（REDLINE）していきましょう！
              </p>
            </section>
          </>
        ) : (
          // ==============================
          // 英語マニュアル
          // ==============================
          <>
            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>1. Creating Boxes & Decks 📦</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                Start by creating a "Box", and then create "Decks" inside it.<br/>
                If you receive a <b>"6-digit Share Code"</b> from a teacher or friend, simply click the "🔗 Share" button and enter the code to instantly download their deck.
              </p>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>2. Adding Cards & CSV Import 📂</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                You can add cards manually one by one, or bulk import them using the "Add via CSV" feature.<br/>
                Using AI (like ChatGPT) to generate example sentences related to your hobbies or interests greatly improves your memory retention.
              </p>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>3. Study & "Deep Dive" 🔍</h3>
              <ul style={{ paddingLeft: '20px', fontSize: '15px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><b>Controls:</b> Tap to flip the card, and click the "✔" button to mark it as memorized.<br/>(You can also swipe left/right on mobile, or use arrow keys and the spacebar on PC).</li>
                <li><b>Deep Dive:</b> Tap the "🔍" icon at the bottom right of a card to instantly search the word in dictionaries like Cambridge, Oxford, or YouGlish (YouTube context search).<br/>* Customize your preferred dictionaries from "⚙️ Dict Settings" on the home screen.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>4. Tests & Print (PDF) 🖨️</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                Click the "🎯 Test & Print" button in the study view to take an in-app test or generate beautifully formatted PDFs.<br/>
                You can export vocabulary lists, example sentence sheets, and multiple-choice quizzes to print and study offline.
              </p>
            </section>

            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '20px' }}>5. Aim for 30,000 Words 👑</h3>
              <p style={{ fontSize: '15px', color: '#475569' }}>
                The progress bar on the home screen tracks your total memorized words.<br/>
                Starting from the basic level (1,200 words), aim to push your limits (REDLINE) and reach the ultimate goal of <b>30,000 words</b>, which represents an educated native speaker's vocabulary!
              </p>
            </section>
          </>
        )}

        {/* 戻るボタン */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            onClick={() => setView('boxes')}
            style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isJa ? '学習を始める 🚀' : 'Start Learning 🚀'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Manual;