import React from 'react';

function Manual({ t, setView }) {
  // ★ バグ修正: t（辞書データ）の「すべての値」をチェックし、確実に日本語/英語を判定する
  const isJa = Object.values(t).some(val => typeof val === 'string' && /[ぁ-んァ-ヶ亜-熙]/.test(val));

  return (
    <div className="app-container gentle-bg desk-view" style={{ overflowY: 'auto' }}>
      {/* ヘッダー部分 */}
      <div className="study-header" style={{ marginBottom: '30px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(248, 250, 252, 0.9)', backdropFilter: 'blur(10px)', padding: '15px 0', borderBottom: '1px solid #e2e8f0' }}>
        <button className="back-to-desk-btn" onClick={() => setView('boxes')}>
          {t.backBtn || '◀ 戻る'}
        </button>
        <h2 className="app-title" style={{ margin: 0, textAlign: 'center', flex: 1, paddingRight: '80px' }}>
          {isJa ? '📖 REDLINE VOCABULARY 完全マニュアル' : '📖 REDLINE VOCABULARY Guide'}
        </h2>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto 50px auto', background: '#fff', borderRadius: '16px', padding: 'clamp(20px, 5vw, 40px)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', lineHeight: '1.8', color: '#334155' }}>

        {isJa ? (
          // ==============================
          // 日本語マニュアル（詳細版）
          // ==============================
          <>
            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📦 1. 箱と束（デッキ）の基本
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                このアプリは<b>「箱の中に、単語の束を入れる」</b>という構造になっています。まずはカテゴリごとの「箱」を作り、その中に学習する「束」を作成しましょう。
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}><b>共有コードで追加：</b> 先生や友人から「6桁の英数字コード」をもらった場合は、束の作成欄にある「🔗 共有」ボタンを押し、コードを入力するだけで一瞬で単語帳を取り込めます。</li>
                <li><b>名前の変更・削除：</b> 箱や束の右上にある「✏️」ボタンで名前の変更、「✖」ボタンで削除ができます。</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📂 2. 単語の追加とCSVインポート
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                束を開くと、左側のメニューから単語を追加できます。
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}><b>手動で追加：</b> 単語、意味、品詞、例文、メモを1語ずつ丁寧に入力します。</li>
                <li>
                  <b>CSVで一括追加：</b> 大量の単語を一気に追加できる強力な機能です。<br/>
                  指定のChatGPTプロンプト（指示文）を使えば、自分の趣味（ゲームやスポーツなど）に合わせた例文をAIに作らせることができます。<br/>
                  ※CSVの構成：A列(単語)、B列(意味)、C列(例文)、D列(例文和訳)、E列(品詞)、F列(メモ)
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔥 3. サクサク進む学習操作
              </h3>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569' }}>
                <div style={{ marginBottom: '10px' }}><b>【基本のめくり方】</b></div>
                <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
                  <li><b>スマホ・タブレット：</b> カードをタップして裏返し、<b>カードの上を左右にスワイプ</b>すると前後の単語に移動します。</li>
                  <li><b>PC・キーボード：</b> <code>Space</code>キー または <code>↑</code> <code>↓</code>キーで裏返し、<code>←</code> <code>→</code>キーで前後に移動できます。</li>
                </ul>
                <div style={{ marginBottom: '10px' }}><b>【その他の便利機能】</b></div>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><b>暗記済みにする：</b> 完全に覚えた単語は、右上の「✔」ボタンを押すと右側のリストに移動し、次回から出題されなくなります。</li>
                  <li><b>自動めくり：</b> 画面下の再生ボタンを押すと、スライダーで設定した秒数ごとに自動でカードがめくられます（ハンズフリー学習）。</li>
                  <li><b>表示オプション：</b> カード上の「⚙️ 表示オプション」から、例文やメモを隠してストイックにテストすることも可能です。</li>
                </ul>
              </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 4. Deep Dive（深く調べる）機能
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                「この単語、どんな場面で使われるんだろう？」「語源は？」と気になったら、カードの右下にある<b>「🔍」アイコン</b>をタップしてください。
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}>Weblioや英辞郎、YouGlish（YouTube上のリアルな発音動画検索）、Google画像検索など、様々な辞書へ1タップでアクセスできます。</li>
                <li>トップ画面の右上の<b>「⚙️ 辞書設定」</b>から、自分が普段よく使う辞書だけを表示するようにカスタマイズが可能です。物書堂アプリへの連携もサポートしています。</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 5. 忘却曲線とプリント出力
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '15px' }}>
                  <b>復習のタイミング：</b> 束（デッキ）につくバッジは、学習からの経過時間を示します。時間が経ち、束が<b>「ブルブルと震え出したら」</b>、脳が忘れかけているサインです。すぐに復習しましょう！
                </li>
                <li>
                  <b>PDFプリント作成：</b> 学習画面の「🎯 テスト＆プリント」から、アプリ内でのテストだけでなく、<b>美しいPDFプリント</b>を出力できます。通学中や学校での学習用に、「単語一覧」「例文テスト」「英検形式の4択問題」などを印刷して活用してください。
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '20px', background: '#0f172a', color: '#fff', padding: '25px', borderRadius: '16px' }}>
              <h3 style={{ borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginTop: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👑 目指せ、限界突破（30,000語）
              </h3>
              <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: 0, lineHeight: '1.8' }}>
                トップ画面のステータスバーは、あなたがこれまでに「暗記済み」にした総単語数をカウントしています。<br/><br/>
                高校入試レベル（1,200語）や難関大レベル（5,000語）を通過し、最終目標である<b>「教養あるネイティブスピーカーレベル（30,000語）」</b>を目指して、日々の学習を積み重ねていきましょう！
              </p>
            </section>
          </>
        ) : (
          // ==============================
          // 英語マニュアル（詳細版）
          // ==============================
          <>
            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📦 1. Basic Structure: Boxes & Decks
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                This app uses a structure where you place <b>"Decks" inside "Boxes."</b> First, create a Box for a specific category, and then create Decks inside it.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}><b>Add via Share Code:</b> If you receive a 6-digit alphanumeric code from a teacher or friend, simply click the "🔗 Share" button and enter the code to instantly download the deck.</li>
                <li><b>Rename / Delete:</b> Use the "✏️" button to rename and the "✖" button to delete a Box or Deck.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📂 2. Adding Words & CSV Import
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                Open a deck to add words using the left sidebar menu.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}><b>Add Manually:</b> Enter the word, meaning, part of speech, example sentence, and memo one by one.</li>
                <li>
                  <b>Bulk Import via CSV:</b> A powerful feature to add many words at once. By using the provided ChatGPT prompt, you can generate personalized example sentences tailored to your hobbies! <br/>
                  *Columns: A(Word), B(Meaning), C(Example), D(Translation), E(POS), F(Memo)
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔥 3. How to Study Efficiently
              </h3>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569' }}>
                <div style={{ marginBottom: '10px' }}><b>[Basic Navigation]</b></div>
                <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
                  <li><b>Mobile/Tablet:</b> Tap the card to flip it, and <b>swipe left or right on the card</b> to move to the next/previous word.</li>
                  <li><b>PC/Keyboard:</b> Press <code>Space</code> or <code>↑</code> <code>↓</code> to flip, and <code>←</code> <code>→</code> to navigate.</li>
                </ul>
                <div style={{ marginBottom: '10px' }}><b>[Useful Features]</b></div>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><b>Mark as Mastered:</b> Click the "✔" button on the top right to move a fully memorized word to the mastered list.</li>
                  <li><b>Auto-Play:</b> Click the play button at the bottom for hands-free learning based on your preferred interval speed.</li>
                  <li><b>Display Options:</b> Use "⚙️ Options" to hide example sentences or memos for strict self-testing.</li>
                </ul>
              </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 4. The "Deep Dive" Feature
              </h3>
              <p style={{ fontSize: '15px', color: '#475569', marginBottom: '10px' }}>
                When you want to know more about a word's nuance or real-life usage, tap the <b>"🔍" icon</b> at the bottom right of the card back.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '8px' }}>Instantly access external dictionaries like Cambridge, Oxford, YouGlish (YouTube context search), or Google Images with just one tap.</li>
                <li>Customize which dictionaries appear by clicking <b>"⚙️ Dict Settings"</b> on the top right of the home screen.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 5. Spaced Repetition & PDF Prints
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li style={{ marginBottom: '15px' }}>
                  <b>Review Timing:</b> The badges on the decks change based on the time elapsed since your last study session. When a deck starts <b>"shaking"</b>, it's the perfect time to review to prevent forgetting!
                </li>
                <li>
                  <b>Generate PDFs:</b> Click "🎯 Test & Print" in the study view to generate beautiful PDF materials. You can print Vocabulary Lists, Example Sheets, or 4-choice Quizzes (Eiken format) for offline studying.
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '20px', background: '#0f172a', color: '#fff', padding: '25px', borderRadius: '16px' }}>
              <h3 style={{ borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginTop: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👑 Aim for 30,000 Words
              </h3>
              <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: 0, lineHeight: '1.8' }}>
                The progress bar on the home screen tracks your total mastered vocabulary.<br/><br/>
                Push your limits (REDLINE) through the basic levels and aim for the ultimate goal: <b>30,000 words</b>, which represents the vocabulary of an educated native speaker. Let's make it happen!
              </p>
            </section>
          </>
        )}

        {/* 戻るボタン */}
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button 
            onClick={() => setView('boxes')}
            style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '16px 48px', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
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