/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import './App.css';

const DICT = {
  ja: {
    appTitle: "REDLINE VOCABULARY", appSubtitle: "〜 限界突破の英単語 〜", loginWithGoogle: "Googleでログインして始める", logout: "🚪 ログアウト",
    boxPlaceholder: "箱の名前を入力して追加", createBtn: "作る", manualLink: "📖 このアプリの使い方", langToggle: "🌐 English",
    tapToOpen: "👇 タップで開く", review: "🔥 復習！", backToHome: "◀ 箱(ホーム)に戻る", printPdfBtn: "🖨️ PDFで保存 / 印刷",
    deckPlaceholder: "新しい暗記カードの束を入力", addBtn: "追加", unmemTitle: "📖 学習中・未修の束", unmemHint: "※暗記エリアにドロップすると、すべて暗記済みになります。",
    noUnmem: "未修の束はありません。", memTitle: "🏆 暗記済の束", memHint: "※ここに束をドロップすると一発で暗記済みに！", noMem: "まだ暗記済みの束はありません。",
    cardsCount: "枚", bestTime: "最速", statusPerfect: "🏆 暗記済", statusNew: "🆕 未学習", statusFresh: "✅ 学習中",
    statusReview: "🔥 復習推奨", statusWarning: "💤 放置気味", stampMem: "💮 暗記済", learningPanel: "📖 学習中",
    addManualBtn: "✏️ 手動で追加", addCsvBtn: "📂 CSVで追加", backBtn: "◀ 戻る", audioOn: "🔊 音声: オン", audioOff: "🔇 音声: オフ",
    testBtn: "📝 テスト", printBtn: "🖨️ 単語プリント", printExampleBtn: "📝 例文プリント", bulkDeleteBtn: "🗑️ 一括削除",
    cancelBulkDelete: "キャンセル", executeBulkDelete: "選択分を削除",
    csvHint: "スプレッドシートやChatGPTで作成したCSVデータを読み込みます。",
    chatGptNote: "💡 ChatGPTへの指示コピペ用：\n「以下の英単語リストを学習アプリ用のCSVデータに変換してください。\n【絶対ルール】\n1. A列に英単語、B列に日本語訳、C列に英語例文、D列に例文和訳の4列構成にすること。1行目はヘッダーにすること。\n2. すべての値をダブルクォーテーション(\"\")で囲むこと。\n3. 英語例文と例文和訳の中にある「対象の単語・訳」は ** で囲むこと（例: I have an **apple**.）。\n4. 挨拶や解説文は一切出力せず、CSV形式のコードブロックのみを返すこと。\n【リスト】（ここに単語を貼る）」",
    closeBtn: "閉じる", allMemorizedMsg: "👏 全ての単語を覚えました！", resetBtn: "🔄 覚えた状態をリセットしてもう1回", discardBtn: "捨てる",
    autoPlayStart: "▶️ 自動めくり", autoPlayStop: "⏸ 停止", repeatBtn: "🔄 もう1回", fullScreenEnter: "全集中 🔥", fullScreenExit: "解除 ↘️",
    intervalLabel: "表示間隔", sec: "秒", godspeed: "⚡️ 神速", fast: "速", slow: "遅", memorizedPanel: "✅ 暗記済", dragHereMsg: "左の単語をここにドラッグで移動！",
    markUnmem: "学習中に戻す", markMem: "覚えた！", editCardTitle: "カードを編集", newCardTitle: "新しいカードを作成", wordReq: "英単語 (必須)", meanReq: "意味 (必須)", posLabel: "品詞 (任意)",
    exHint: "英語例文 (**で囲むと黄色い線)", trHint: "例文和訳 (**で囲むと黄色い線)", cancelBtn: "キャンセル", saveBtn: "保存する",
    confirmDeleteDeck: "束を削除しますか？", confirmDeleteBox: "箱と中の束をすべて削除しますか？", confirmMemorizeAll: "この束をすべて「暗記済み」として完了しますか？",
    promptBoxRename: "箱の新しい名前を入力してください:", promptDeckRename: "束の新しい名前を入力してください:", alertReq: "「英単語」と「意味」は必ず入力してください！", alertCsvError: "ファイルの読み込み中にエラーが発生しました。",
    testNeeds4: "テストには最低4枚のカードが必要です！", testFinished: "テスト終了！", score: "スコア:", tryAgainBtn: "🔄 もう一度テストする", backToStudyBtn: "◀ 学習に戻る",
    question: "問題", testHint: "この単語の正しい意味はどれ？", quitBtn: "中断して戻る", noPrintCards: "印刷するカードがありません。", shuffleBtn: "🔄 問題をシャッフル",
    printTestTitle: "- 単語テスト", printTestExampleTitle: "- 例文テスト", printDate: "出力日:", printName: "氏名：__________________________", printScore: "得点：      / ",
    
    m_h1: "公式 取扱説明書", m_s1: "1. はじめに（基本構造）", m_p1: "このアプリは、現実の単語帳と同じように直感的に操作できます。",
    m_l1_1: "📦 箱（Box）：一番外側の入れ物です。「中学英語」「英検」など大きなカテゴリを作ります。", m_l1_2: "🔖 束（Deck）：箱の中に入る単語カードの束です。「基本動詞 50語」など、学習しやすい単位で作ります。", m_l1_3: "📇 単語カード：実際のフラッシュカードです。束を開くと学習が始まります。",
    m_s2: "2. 単語カードの作り方", m_p2: "学習画面（束を開いた状態）の左側メニューから追加できます。", m_s2_1: "✏️ 手動で1枚ずつ追加", m_p2_1: "「手動で単語を1枚追加」ボタンを押すと、その場でカードを作成できます。この時、タブから「名詞」「動詞」などの品詞を登録しておくと、学習時に日本語の横に品詞バッジが表示されます。",
    m_s2_2: "📂 CSVから一括で追加", m_p2_2: "Excelやスプレッドシートで作ったデータを一気に読み込めます。ChatGPTに「以下の単語をCSV化して」と指示してコピペするのが一番簡単です！（※品詞は後から編集画面で追加できます）", m_p2_3: "※例文の中で黄色くマーカーを引きたい部分は **apple** のように **（アスタリスク2つ）で囲んでください。",
    m_s3: "3. 学習画面の操作", m_p3: "本物の紙のカードのように、めくって学習します。全画面アイコン（全集中🔥）を押すと、大迫力の巨大フォントで没入学習が可能です。", m_l3_1: "カードをめくる：カードの真ん中をクリック、またはキーボードの [スペースキー] / [上下矢印]", m_l3_2: "次の単語へ：右下の「▶」ボタン、またはキーボードの [右矢印] / [Enter]", m_l3_3: "前の単語へ：左下の「◀」ボタン、またはキーボードの [左矢印]", m_l3_4: "音声を聞く：表示されている「英単語の文字」を直接クリックするとネイティブ音声が流れます。",
    m_s4: "4. 自動めくり機能 ＆ 表示間隔（スピード）", m_p4: "画面下の「▶️ 自動めくり」を押すと、設定した秒数ごとに自動でカードがめくられ、音声が流れます。「表面のみ」をONにすると、意味を確認せず次々と高速フラッシュできます。", m_l4_1: "🐢 遅（4.0秒）：じっくり意味を確認したい時に。", m_l4_2: "🐇 標準（2.0秒）：テンポよく進めたい時に。", m_l4_3: "👼 神速（0.0秒）：脳に直接刷り込む超高速フラッシュモード！",
    m_s5: "5. 暗記の管理（ドラッグ＆ドロップ）", m_p5: "覚えた単語は、カード右上の「✔」ボタンを押すか、リストから「✅ 暗記済」や「📖 学習中」エリアへドラッグ＆ドロップして移動させましょう！スマホでも長押しで移動可能です。", m_p5_1: "束（デッキ）を丸ごと「暗記済」エリアにドラッグして、一気に完了させることも可能です。",
    m_s6: "6. テスト ＆ 印刷機能 ＆ 注意事項", m_l6_1: "📝 テスト：4択クイズに挑戦できます。連続正解でド派手な演出が待っています！", m_l6_2: "🖨️ プリント：実際の授業で配れる「紙の小テスト」として印刷できます。例文プリントでは対象単語が自動で穴埋め（＿＿＿）になります。", m_l6_3: "⚠️ ログイン注意：LINEやInstagram等のアプリ内ブラウザからはログインエラーになります。標準ブラウザ（Safari/Chrome）で開いてください。",
    box1Name: "中学レベル", box2Name: "資格・オリジナル箱", deck1Name: "基本の動詞", card1_mean: "輝く / 光る", card1_trans: "星が明るく**輝く**。", card2_mean: "持っている / 食べる", card2_trans: "私は本を**持っています**。", card3_mean: "作る", card3_trans: "彼女は夕食を**作ります**。", card4_mean: "攻撃する", card4_trans: "その犬はあなたを**攻撃し**ません。"
  },
  en: {
    appTitle: "REDLINE VOCABULARY", appSubtitle: "— Break Your Limits —", loginWithGoogle: "Login with Google", logout: "🚪 Logout",
    boxPlaceholder: "Enter box name to add", createBtn: "Create", manualLink: "📖 How to use this app", langToggle: "🌐 日本語",
    tapToOpen: "👇 Tap to open", review: "🔥 Review!", backToHome: "◀ Back to Home", printPdfBtn: "🖨️ Print / Save as PDF",
    deckPlaceholder: "Enter new deck name", addBtn: "Add", unmemTitle: "📖 Learning Decks", unmemHint: "* Drop to Memorized area to complete all.",
    noUnmem: "No learning decks.", memTitle: "🏆 Memorized Decks", memHint: "* Drop decks here to mark as memorized!", noMem: "No memorized decks yet.",
    cardsCount: "cards", bestTime: "Best", statusPerfect: "🏆 Memorized", statusNew: "🆕 New", statusFresh: "✅ Learning",
    statusReview: "🔥 Review", statusWarning: "💤 Neglected", stampMem: "💮 DONE", learningPanel: "📖 Learning",
    addManualBtn: "✏️ Add Manually", addCsvBtn: "📂 Add via CSV", backBtn: "◀ Back", audioOn: "🔊 Audio: ON", audioOff: "🔇 Audio: OFF",
    testBtn: "📝 Test", printBtn: "🖨️ Print Words", printExampleBtn: "📝 Print Examples", bulkDeleteBtn: "🗑️ Bulk Delete",
    cancelBulkDelete: "Cancel", executeBulkDelete: "Delete Selected",
    csvHint: "Import CSV data created in Spreadsheets or ChatGPT.",
    downloadTemplate: "📥 Download CSV Template", uploadCsv: "📂 Select CSV File", loading: "Loading...",
    chatGptNote: "💡 Prompt for ChatGPT:\n'Create a CSV for flashcards with 4 columns: Word, Meaning, Example, Translation. Wrap the target word in ** to highlight it. Output in code block.'",
    closeBtn: "Close", allMemorizedMsg: "👏 You've memorized all words!", resetBtn: "🔄 Reset and try again", discardBtn: "Discard",
    autoPlayStart: "▶️ Auto Play", autoPlayStop: "⏸ Stop", repeatBtn: "🔄 もう1回", fullScreenEnter: "Focus 🔥", fullScreenExit: "Exit ↘️",
    intervalLabel: "Interval", sec: "sec", godspeed: "⚡️ Godspeed", fast: "Fast", slow: "Slow", memorizedPanel: "✅ Memorized", dragHereMsg: "Drag words here from the left!",
    markUnmem: "Move to Learning", markMem: "Memorized!", editCardTitle: "Edit Card", newCardTitle: "Create New Card", wordReq: "Word (Required)", meanReq: "Meaning (Required)", posLabel: "Part of Speech (Optional)",
    exHint: "Example (Wrap in ** to highlight)", trHint: "Translation (Wrap in ** to highlight)", cancelBtn: "Cancel", saveBtn: "Save",
    confirmDeleteDeck: "Delete this deck?", confirmDeleteBox: "Delete this box and all its decks?", confirmMemorizeAll: "Mark all cards in this deck as memorized?",
    promptBoxRename: "Enter new name for the box:", promptDeckRename: "Enter new name for the deck:", alertReq: "'Word' and 'Meaning' are required!", alertCsvError: "Error occurred while reading the file.",
    testNeeds4: "At least 4 cards are required for a test!", testFinished: "Test Finished!", score: "Score:", tryAgainBtn: "🔄 Try Again", backToStudyBtn: "◀ Back to Study",
    question: "Question", testHint: "Which is the correct meaning?", quitBtn: "Quit", noPrintCards: "No cards to print.", shuffleBtn: "🔄 Shuffle",
    printTestTitle: "- Vocabulary Test", printTestExampleTitle: "- Example Test", printDate: "Date: ", printName: "Name: _________________________", printScore: "Score:      / ",
    
    m_h1: "Official User Manual", m_s1: "1. Introduction (Basic Structure)", m_p1: "This app works just like real physical flashcards.",
    m_l1_1: "📦 Box: The outermost container (e.g., 'Basic Level', 'TOEFL').", m_l1_2: "🔖 Deck: A bundle of cards inside a box (e.g., 'Basic Verbs 50').", m_l1_3: "📇 Card: The actual flashcard. Open a deck to start learning.",
    m_s2: "2. How to create cards", m_p2: "You can add cards from the left menu in the study view.", m_s2_1: "✏️ Add Manually", m_p2_1: "Click 'Add 1 Card Manually' to create a card on the spot.",
    m_s2_2: "📂 Import from CSV", m_p2_2: "Import data from Excel/Spreadsheets. The easiest way is to ask ChatGPT to 'Create a CSV for flashcards' and paste it!", m_p2_3: "* Enclose the target word in ** (double asterisks) to highlight it in yellow.",
    m_s3: "3. Learning Controls", m_p3: "Flip and learn like real paper cards. Click the 'Focus 🔥' button for an immersive, large-font full-screen mode.", m_l3_1: "Flip Card: Click the center of the card, or press [Space] / [Up/Down Arrow].", m_l3_2: "Next Card: '▶' button, or [Right Arrow] / [Enter].", m_l3_3: "Prev Card: '◀' button, or [Left Arrow].", m_l3_4: "Play Audio: Click the English word itself to hear native pronunciation.",
    m_s4: "4. Auto Play & Speed", m_p4: "Click '▶️ Auto Play' to automatically flip cards. Turn on 'Front Only' to skip the back and flash through words quickly.", m_l4_1: "🐢 Slow (4.0s): When you want to carefully check the meaning.", m_l4_2: "🐇 Normal (2.0s): For a good learning tempo.", m_l4_3: "👼 Godspeed (0.0s): Ultra-fast flash mode to burn into your brain!",
    m_s5: "5. Memorization (Drag & Drop)", m_p5: "Click the '✔' button on the card, or Long-Press & Drag the word to the '✅ Memorized' area on the right!", m_p5_1: "You can also drag an entire deck to the 'Memorized' area to complete it instantly.",
    m_s6: "6. Test, Print & Notes", m_l6_1: "📝 Test: Take a fast-paced 4-choice quiz. Incorrect answers will highlight the correct choice.", m_l6_2: "🖨️ Print: Print a paper quiz. In Example Print mode, target words automatically become blanks (___).", m_l6_3: "⚠️ Login Note: Google login is blocked in in-app browsers like LINE/Instagram. Please open in a standard browser (Safari/Chrome)."
  }
};

const initialBoxes = [ { id: 1, nameKey: 'box1Name', name: '中学レベル' }, { id: 2, nameKey: 'box2Name', name: '資格・オリジナル箱' } ];
const initialDecks = [ { id: 1, boxId: 1, nameKey: 'deck1Name', name: '基本の動詞', lastStudied: null, lastRecordTime: null, cards: [ { word: 'shine', meaning: '輝く / 光る', example: 'The stars **shine** brightly.', translation: '星が明るく**輝く**。', isMemorized: false, pos: '動詞' }, { word: 'have', meaning: '持っている / 食べる', example: 'I **have** a book.', translation: '私は本を**持っています**。', isMemorized: false, pos: '動詞' }, { word: 'make', meaning: '作る', example: 'She **makes** dinner.', translation: '彼女は夕食を**作ります**。', isMemorized: false, pos: '動詞' }, { word: 'attack', meaning: '攻撃する', example: 'The dog will not **attack** you.', translation: 'その犬はあなたを**攻撃し**ません。', isMemorized: false, pos: '動詞' } ] } ];

const parseCSV = (text) => {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let currentVal = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentVal);
        rows.push(row);
        row = [];
        currentVal = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentVal += char;
      }
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    rows.push(row);
  }
  return rows;
};

const chunkArray = (array, size) => {
  const chunked = [];
  if (!Array.isArray(array)) return chunked;
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const cleanText = (text) => {
  if (!text) return '';
  return String(text).replace(/[\r\n]+/g, '').trim();
};

const cleanTranslation = (text) => {
  if (!text) return '';
  return cleanText(text).split(/\*\*(.*?)\*\*/g).join('');
};

const renderBlankExample = (text) => {
  if (!text) return <span className="print-blank-line"></span>;
  const cleanedText = cleanText(text);
  if (!cleanedText.includes('**')) return <>{cleanedText} <span className="print-blank-line"></span></>;
  
  const parts = cleanedText.split(/\*\*(.*?)\*\*/g);
  const elements = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const blank = <span key={`blank-${i}`} className="print-blank-line"></span>;
      if (i + 1 < parts.length && /^[.,!?;:]/.test(parts[i + 1])) {
        const match = parts[i + 1].match(/^[.,!?;:]+/);
        const punc = match[0];
        const rest = parts[i + 1].substring(punc.length);
        elements.push(
          <span key={`group-${i}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {blank}<span>{punc}</span>
          </span>
        );
        parts[i + 1] = rest;
      } else {
        elements.push(blank);
      }
    } else {
      if (parts[i]) {
        elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
    }
  }
  return <>{elements}</>;
};

const renderHighlightedText = (text) => {
  if (!text) return null;
  try {
    const parts = String(text).split(/\*\*(.*?)\*\*/g);
    const elements = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        const highlight = <span key={`highlight-${i}`} className="highlight-word">{parts[i]}</span>;
        if (i + 1 < parts.length && /^[.,!?;:]/.test(parts[i + 1])) {
          const match = parts[i + 1].match(/^[.,!?;:]+/);
          const punc = match[0];
          const rest = parts[i + 1].substring(punc.length);
          elements.push(
            <span key={`group-${i}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {highlight}<span>{punc}</span>
            </span>
          );
          parts[i + 1] = rest;
        } else {
          elements.push(highlight);
        }
      } else {
        if (parts[i]) {
          elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
        }
      }
    }
    return <>{elements}</>;
  } catch(e) {
    return String(text);
  }
};

function App() {
  const [lang, setLang] = useState('ja'); 
  const t = DICT[lang];

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  
  const [boxes, setBoxes] = useState(() => { 
    try {
      const savedBoxes = localStorage.getItem('redline_boxes'); 
      const parsed = savedBoxes ? JSON.parse(savedBoxes) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialBoxes;
    } catch(e) { return initialBoxes; }
  });
  
  const [decks, setDecks] = useState(() => { 
    try {
      const savedDecks = localStorage.getItem('redline_decks'); 
      const parsed = savedDecks ? JSON.parse(savedDecks) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialDecks;
    } catch(e) { return initialDecks; }
  });

  useEffect(() => {
    const ua = (navigator.userAgent || navigator.vendor || window.opera).toLowerCase();
    const isWebView = /line|instagram|fban|fbav|twitter|gsa|yahoouisearch|yabrowser/.test(ua) || 
                      (ua.includes('iphone') && !ua.includes('safari')) || 
                      (ua.includes('android') && ua.includes('wv'));
    if (isWebView) {
      setIsInAppBrowser(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) { 
            const fetchedBoxes = docSnap.data().boxes;
            const fetchedDecks = docSnap.data().decks;
            setBoxes(Array.isArray(fetchedBoxes) && fetchedBoxes.length > 0 ? fetchedBoxes : initialBoxes); 
            setDecks(Array.isArray(fetchedDecks) && fetchedDecks.length > 0 ? fetchedDecks : initialDecks); 
          } else { 
            setBoxes(initialBoxes); 
            setDecks(initialDecks); 
            await setDoc(docRef, { boxes: initialBoxes, decks: initialDecks }); 
          }
        } catch (e) {
          console.error("Firestore read/write error. Check Rules.", e);
          setBoxes(prev => Array.isArray(prev) && prev.length > 0 ? prev : initialBoxes);
          setDecks(prev => Array.isArray(prev) && prev.length > 0 ? prev : initialDecks);
        }
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('redline_boxes', JSON.stringify(boxes));
      localStorage.setItem('redline_decks', JSON.stringify(decks));
    } catch (e) { console.warn("localStorage save error", e); }

    if (currentUser && Array.isArray(boxes) && boxes.length > 0) {
      const timer = setTimeout(() => { 
        setDoc(doc(db, "users", currentUser.uid), { boxes, decks }, { merge: true }).catch(e => console.log("Save error", e)); 
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [boxes, decks, currentUser]);

  const handleLogin = () => {
    if (isInAppBrowser) {
      alert("【ログインエラーの回避】\nGoogleアプリやLINEなどの「アプリ内ブラウザ」ではセキュリティ制限によりログインできません。\n画面下部や右上のメニュー（共有ボタンなど）から「Safariで開く」または「ブラウザで開く」を選択して、もう一度お試しください。");
      return;
    }
    
    signInWithPopup(auth, provider).catch((error) => {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Popup Login Error:", error);
        alert("ログインに失敗しました。\n\n【エラー403が出た場合】\nGoogleアプリ等の「アプリ内ブラウザ」が原因です。画面下部や右上の「共有ボタン」等から「Safariで開く」を選択し、Safari上で再度お試しください。\n\n【ポップアップがブロックされた場合】\n「許可」または「常に表示」をタップしてください。");
      }
    });
  };
  
  const handleLogout = () => { signOut(auth).then(() => { setBoxes([]); setDecks([]); }); };

  const touchStartX = useRef(null); 
  const touchStartY = useRef(null); 
  const touchEndX = useRef(null); 
  const touchEndY = useRef(null);
  const touchStartPos = useRef({x: 0, y: 0});
  
  const [pullDownY, setPullDownY] = useState(0); 
  const [isStoring, setIsStoring] = useState(false);
  const [view, setView] = useState('boxes'); 
  const [currentBoxId, setCurrentBoxId] = useState(null); 
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [studyTime, setStudyTime] = useState(0); 
  const [hasRecorded, setHasRecorded] = useState(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); 
  const [displaySeconds, setDisplaySeconds] = useState(2.0); 
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false); 
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [newBoxName, setNewBoxName] = useState(''); 
  const [newDeckNameInside, setNewDeckNameInside] = useState('');
  const [editingCard, setEditingCard] = useState(null); 
  const [addingCard, setAddingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ word: '', meaning: '', example: '', translation: '', pos: '' });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [testQuestions, setTestQuestions] = useState([]); 
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [score, setScore] = useState(0); 
  const [showTestResult, setShowTestResult] = useState(false); 
  const [printCards, setPrintCards] = useState([]);
  const [printMode, setPrintMode] = useState('word');
  const [draggedDeckId, setDraggedDeckId] = useState(null); 
  const touchDragTimer = useRef(null);
  const [ghostPos, setGhostPos] = useState(null); 
  const [draggedCardWord, setDraggedCardWord] = useState(null); 
  const [openingBoxId, setOpeningBoxId] = useState(null);
  
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());

  const [qLang, setQLang] = useState('en'); 
  const [qType, setQType] = useState('word'); 
  const [showExOnBack, setShowExOnBack] = useState(true); 
  const [showWordOnExMode, setShowWordOnExMode] = useState(true); 
  const [isFrontOnlyAuto, setIsFrontOnlyAuto] = useState(false); 

  const [testEffect, setTestEffect] = useState(null); 
  const [combo, setCombo] = useState(0);

  const playedRef = useRef({ index: -1, flipped: false, lang: '', type: '' });

  const activeDeck = (Array.isArray(decks) ? decks : []).find(d => d.id === currentDeckId);
  const allCards = activeDeck && Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
  const studyCards = allCards.filter(c => !c.isMemorized);
  const memorizedCards = allCards.filter(c => c.isMemorized);
  const isCompleted = studyCards.length > 0 && currentIndex === studyCards.length - 1 && isFlipped;

  useEffect(() => {
    setBoxes(prev => (Array.isArray(prev) ? prev : []).map(b => b.nameKey ? { ...b, name: t[b.nameKey] } : b));
    setDecks(prev => (Array.isArray(prev) ? prev : []).map(d => {
      if (d.nameKey) {
        const newCards = (Array.isArray(d.cards) ? d.cards : []).map(c => {
          if (c.word === 'shine') return { ...c, meaning: t.card1_mean, translation: t.card1_trans };
          if (c.word === 'have') return { ...c, meaning: t.card2_mean, translation: t.card2_trans };
          if (c.word === 'make') return { ...c, meaning: t.card3_mean, translation: t.card3_trans };
          if (c.word === 'attack') return { ...c, meaning: t.card4_mean, translation: t.card4_trans };
          return c;
        });
        return { ...d, name: t[d.nameKey], cards: newCards };
      }
      return d;
    }));
  }, [lang, t]);

  const stopAutoPlayIfActive = () => { if (isAutoPlaying) setIsAutoPlaying(false); };
  
  const deleteCard = () => {
    stopAutoPlayIfActive();
    const wordToDelete = studyCards[currentIndex]?.word;
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: (d.cards || []).filter(c => c.word !== wordToDelete) } : d));
    if (currentIndex >= studyCards.length - 1 && studyCards.length > 1) { setCurrentIndex(studyCards.length - 2); }
    setIsFlipped(false); setHasRecorded(false);
  };

  const deleteSpecificCard = (e, wordToDelete) => {
    e.stopPropagation(); 
    stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: (d.cards || []).filter(c => c.word !== wordToDelete) } : d));
  };

  const toggleDeleteSelection = (word) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const executeBulkDelete = () => {
    if (selectedForDelete.size === 0) { setIsDeleteMode(false); return; }
    setDecks(prev => prev.map(d => {
      if (d.id === currentDeckId) { return { ...d, cards: (d.cards || []).filter(c => !selectedForDelete.has(c.word)) }; }
      return d;
    }));
    setSelectedForDelete(new Set());
    setIsDeleteMode(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  useEffect(() => {
    if (studyCards.length > 0 && currentIndex >= studyCards.length) { setCurrentIndex(studyCards.length - 1); }
  }, [studyCards.length, currentIndex]);

  const toggleFullScreen = () => {
    if (!isFullscreen) {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch(err => console.log(err));
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.log(err));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFull) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const unlockAudio = useCallback(() => {
    if ('speechSynthesis' in window && !isMuted) {
      const dummy = new SpeechSynthesisUtterance(''); dummy.volume = 0; window.speechSynthesis.speak(dummy);
    }
  }, [isMuted]);

  const fallbackTTS = useCallback((text, rate) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = rate; window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playAudio = useCallback((text) => {
    if (isMuted || !text) return; 
    const cleanWord = String(text).replace(/[^a-zA-Z\s\-']/g, '').trim(); if (!cleanWord) return;
    let rate = 1.0;
    if (displaySeconds < 2.0) { rate = 1.0 + ((2.0 - displaySeconds) / 2.0) * 0.5; } else if (displaySeconds > 2.0) { rate = 1.0 - ((displaySeconds - 2.0) / 2.0) * 0.2; }
    rate = rate > 1.5 ? 1.5 : (rate < 0.5 ? 0.5 : rate);
    try {
      const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
      const audio = new Audio(audioUrl); audio.playbackRate = rate;
      const playPromise = audio.play();
      if (playPromise !== undefined) { playPromise.catch(() => { fallbackTTS(cleanWord, rate); }); }
    } catch (e) { fallbackTTS(cleanWord, rate); }
  }, [displaySeconds, isMuted, fallbackTTS]);

  useEffect(() => {
    if (studyCards.length === 0 || isCompleted || view !== 'study' || isBulkMode) return;
    const currentCard = studyCards[currentIndex];
    if (!currentCard) return;

    let shouldPlay = false;
    if (qLang === 'en' && !isFlipped) shouldPlay = true;
    if (qLang === 'ja' && isFlipped) shouldPlay = true;

    if (shouldPlay) {
      if (playedRef.current.index !== currentIndex || playedRef.current.flipped !== isFlipped || playedRef.current.lang !== qLang || playedRef.current.type !== qType) {
        playAudio(currentCard.word);
        playedRef.current = { index: currentIndex, flipped: isFlipped, lang: qLang, type: qType };
      }
    }
  }, [currentIndex, isFlipped, qLang, qType, studyCards, isCompleted, view, isBulkMode, playAudio]);

  const handleNextCard = useCallback((e) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false);
    const nextIdx = (currentIndex + 1) % studyCards.length; setCurrentIndex(nextIdx); 
  }, [currentIndex, studyCards]);

  const handlePrevCard = useCallback((e) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive(); setIsFlipped(false);
    const prevIdx = (currentIndex - 1 + studyCards.length) % studyCards.length; setCurrentIndex(prevIdx); 
  }, [currentIndex, studyCards]);

  const handleRepeat = () => { 
    stopAutoPlayIfActive(); setCurrentIndex(0); setIsFlipped(false); setStudyTime(0); setHasRecorded(false); 
    playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };

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
  const formatDate = (timestamp) => { if (!timestamp) return ''; const d = new Date(timestamp); return `${d.getMonth() + 1}/${d.getDate()}`; };

  useEffect(() => {
    if (isCompleted && !hasRecorded && currentDeckId) {
      setDecks(prev => prev.map(d => {
        if (d.id === currentDeckId) { const isFaster = d.lastRecordTime === null || studyTime < d.lastRecordTime; return { ...d, lastRecordTime: isFaster ? studyTime : d.lastRecordTime }; }
        return d;
      }));
      setHasRecorded(true); 

      if (currentUser) {
        const durationMinutes = Math.max(1, Math.round(studyTime / 60)); 
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const deckName = decks.find(d => d.id === currentDeckId)?.name || "単語帳";

        addDoc(collection(db, 'logs'), {
          uid: currentUser.uid,
          date: dateStr,
          minutes: durationMinutes,
          categories: ['Vocabulary'],
          content: `アプリ学習: ${deckName}`,
          reflection: `自動記録: ${formatTime(studyTime)} で暗記完了！`,
          quality: 100,
          timestamp: Date.now()
        }).catch(e => console.error("Auto-sync failed:", e));
      }
    }
  }, [isCompleted, currentDeckId, studyTime, currentUser, decks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (view !== 'study' || isBulkMode) return;
      unlockAudio();
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stopAutoPlayIfActive(); setIsFlipped(prev => !prev); } 
      else if (e.code === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); handleNextCard(); } 
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevCard(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isBulkMode, isAutoPlaying, handleNextCard, handlePrevCard, unlockAudio]);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let autoPlayTimer = null; 
    if (isAutoPlaying && studyCards.length > 0 && !isCompleted) {
      lastTickRef.current = Date.now();
      autoPlayTimer = setInterval(() => {
        const now = Date.now(); const delta = now - lastTickRef.current; lastTickRef.current = now; elapsedRef.current += delta;
        const currentDelay = displaySeconds === 0 ? 150 : displaySeconds * 1000;
        if (elapsedRef.current >= currentDelay) {
          elapsedRef.current = 0; 
          if (!isFlipped && displaySeconds !== 0 && !isFrontOnlyAuto) { 
            setIsFlipped(true); 
          } else if (currentIndex < studyCards.length - 1) {
            const nextIdx = currentIndex + 1; setCurrentIndex(nextIdx); setIsFlipped(false);
          } else { setIsAutoPlaying(false); }
        }
      }, 50); 
    } else { elapsedRef.current = 0; }
    return () => { if (autoPlayTimer) clearInterval(autoPlayTimer); };
  }, [isAutoPlaying, isFlipped, currentIndex, displaySeconds, studyCards.length, isCompleted, isFrontOnlyAuto]);

  const toggleMemorize = (e, wordToMark, isMemorized) => {
    if (e) e.stopPropagation(); stopAutoPlayIfActive();
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: (d.cards || []).map(c => c.word === wordToMark ? { ...c, isMemorized: isMemorized } : c) };
    }));
  };

  const resetMemorized = () => {
    setDecks(prev => prev.map(d => { if (d.id !== currentDeckId) return d; return { ...d, cards: (d.cards || []).map(c => ({ ...c, isMemorized: false })) }; }));
    handleRepeat();
  };

  const markDeckAsMemorized = (e, deckId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmMemorizeAll)) {
      setDecks(prev => prev.map(d => { if (d.id !== deckId) return d; return { ...d, lastStudied: Date.now(), cards: (d.cards || []).map(c => ({ ...c, isMemorized: true })) }; }));
    }
  };

  const saveNewCard = () => {
    if (!newCardData.word.trim() || !newCardData.meaning.trim()) { alert(t.alertReq); return; }
    setDecks(prev => prev.map(d => {
      if (d.id === currentDeckId) { return { ...d, cards: [...(d.cards || []), { word: newCardData.word.trim(), meaning: newCardData.meaning.trim(), example: newCardData.example.trim(), translation: newCardData.translation.trim(), pos: newCardData.pos, isMemorized: false }] }; }
      return d;
    }));
    setAddingCard(false); setNewCardData({ word: '', meaning: '', example: '', translation: '', pos: '' }); 
  };

  const saveEditedCard = () => {
    if (!editingCard) return;
    setDecks(prev => prev.map(d => {
      if (d.id !== currentDeckId) return d;
      return { ...d, cards: (d.cards || []).map(c => c.word === editingCard.originalWord ? { ...c, word: editingCard.word, meaning: editingCard.meaning, example: editingCard.example, translation: editingCard.translation, pos: editingCard.pos } : c) };
    }));
    setEditingCard(null); 
  };

  const createNewBox = () => {
    if (!newBoxName.trim()) return;
    const newBox = { id: Date.now(), name: newBoxName };
    setBoxes([...boxes, newBox]); setNewBoxName('');
  };

  const renameBox = (e, boxId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptBoxRename, currentName);
    if (newName !== null && newName.trim() !== '') { setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, name: newName.trim(), nameKey: null } : b)); }
  };

  const renameDeck = (e, deckId, currentName) => {
    e.stopPropagation();
    const newName = window.prompt(t.promptDeckRename, currentName);
    if (newName !== null && newName.trim() !== '') { setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName.trim(), nameKey: null } : d)); }
  };

  const getEbbinghausStatus = (deck) => {
    const cards = Array.isArray(deck.cards) ? deck.cards : [];
    if (cards.length > 0 && cards.every(c => c.isMemorized)) { return { label: t.statusPerfect, className: 'status-perfect', needsReview: false }; }
    const lastStudied = deck.lastStudied;
    if (!lastStudied) return { label: t.statusNew, className: 'status-new', needsReview: false };
    const hoursPassed = (Date.now() - lastStudied) / 3600000;
    if (hoursPassed < 24) return { label: t.statusFresh, className: 'status-fresh', needsReview: false };
    if (hoursPassed < 72) return { label: t.statusReview, className: 'status-review', needsReview: true, shake: true };
    return { label: t.statusWarning, className: 'status-warning', needsReview: false };
  };

  const downloadTemplate = () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const content = '英単語,日本語訳,英語例文,例文和訳\n"例: apple",りんご,"I have an **apple**.","私は**りんご**を持っています。"\n';
    const blob = new Blob([bom, content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'import_template.csv'; a.click(); window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result; const parsedData = parseCSV(text);
      const startIndex = parsedData[0] && parsedData[0][0] && String(parsedData[0][0]).includes('英単語') ? 1 : 0;
      const rows = parsedData.slice(startIndex).filter(row => row.length > 0 && row[0] && String(row[0]).trim() !== '');
      processImportData(rows); 
    };
    reader.readAsText(file); e.target.value = null; 
  };

  const processImportData = (rows) => {
    setLoading(true);
    try {
      const newCards = [];
      for (const row of rows) {
        const targetWord = row[0] ? String(row[0]).trim() : ''; if (!targetWord) continue;
        newCards.push({ word: targetWord, meaning: row[1] ? cleanText(row[1]) : '', example: row[2] ? cleanText(row[2]) : '', translation: row[3] ? cleanText(row[3]) : '', pos: '', isMemorized: false });
      }
      setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, cards: [...(d.cards || []), ...newCards] } : d));
      
      setToastMessage(`🎉 ${newCards.length}語追加されました！`);
      setTimeout(() => setToastMessage(''), 3000);
      
    } catch(e) { alert(t.alertCsvError); } finally { setIsBulkMode(false); setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setLoading(false); }
  };

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
    if (allCards.length < 4) { alert(t.testNeeds4); return; }
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
    const questions = shuffledCards.map(card => {
      const wrongAnswers = allCards.filter(c => c.word !== card.word).sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.meaning || '意味なし');
      const options = [card.meaning || '意味なし', ...wrongAnswers].sort(() => Math.random() - 0.5);
      return { word: card.word, correct: card.meaning || '意味なし', options: options };
    });
    setTestQuestions(questions); setCurrentTestIndex(0); setScore(0); setShowTestResult(false); setTestEffect(null); setCombo(0); setView('test');
  };

  const openPrintPreview = (mode) => {
    if (allCards.length === 0) { alert(t.noPrintCards); return; }
    setPrintMode(mode);
    setPrintCards([...allCards].sort(() => Math.random() - 0.5)); 
    setView('printPreview');
  };

  const shufflePrintCards = () => { setPrintCards([...printCards].sort(() => Math.random() - 0.5)); };

  const createNewDeckInsideBox = () => {
    if (!newDeckNameInside.trim()) return;
    setDecks([...decks, { id: Date.now(), boxId: currentBoxId, name: newDeckNameInside, lastStudied: null, lastRecordTime: null, cards: [] }]);
    setNewDeckNameInside('');
  };

  const deleteBox = (e, boxId) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteBox)) { setBoxes(boxes.filter(b => b.id !== boxId)); setDecks(decks.filter(d => d.boxId !== boxId)); }
  };

  const openBox = (boxId) => { 
    if (openingBoxId) return; unlockAudio(); setOpeningBoxId(boxId); 
    setTimeout(() => { setCurrentBoxId(boxId); setView('decks'); setOpeningBoxId(null); }, 450);
  };
  
  const openDeck = (id) => { 
    if (draggedDeckId) return; unlockAudio();
    setCurrentIndex(0); setIsFlipped(false); setHasRecorded(false); setIsAutoPlaying(false); setCurrentDeckId(id); setView('study'); 
    setIsDeleteMode(false); setSelectedForDelete(new Set());
    playedRef.current = { index: -1, flipped: false, lang: '', type: '' }; 
  };
  
  const closeDeck = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    setDecks(prev => prev.map(d => d.id === currentDeckId ? { ...d, lastStudied: Date.now() } : d));
    setIsAutoPlaying(false); setCurrentDeckId(null); setView('decks');
    setIsDeleteMode(false); setSelectedForDelete(new Set());
  }, [currentDeckId]);

  const deleteDeck = (e, id) => { e.stopPropagation(); if (window.confirm(t.confirmDeleteDeck)) setDecks(decks.filter(d => d.id !== id)); };

  const onDragStart = (e, id) => { 
    setDraggedDeckId(id); 
    e.dataTransfer.effectAllowed = "move"; 
    const emptyImage = new Image();
    emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if (e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(emptyImage, 0, 0);
    }
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDropToArea = (e, targetArea) => {
    e.preventDefault(); if (!draggedDeckId) return;
    setDecks(prev => {
      const newDecks = [...prev]; const index = newDecks.findIndex(d => d.id === draggedDeckId);
      if (index !== -1) {
        const d = newDecks[index];
        if (targetArea === 'memorized') { newDecks[index] = { ...d, lastStudied: Date.now(), cards: (d.cards || []).map(c => ({...c, isMemorized: true})) }; } 
        else if (targetArea === 'unmemorized') { newDecks[index] = { ...d, cards: (d.cards || []).map(c => ({...c, isMemorized: false})) }; }
      }
      return newDecks;
    });
    setDraggedDeckId(null);
  };
  
  const onTouchStartDeck = (e, deck) => { 
    e.stopPropagation(); 
    const touch = e.touches[0]; 
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchDragTimer.current = setTimeout(() => { 
      setDraggedDeckId(deck.id); 
      setGhostPos({ x: touch.clientX, y: touch.clientY - 40, title: deck.name });
    }, 400); 
  };
  const onTouchMoveDeck = (e) => { 
    if (!draggedDeckId) { 
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (Math.sqrt(dx*dx + dy*dy) > 20) { clearTimeout(touchDragTimer.current); }
      return; 
    } 
    e.preventDefault(); 
    const touch = e.touches[0]; 
    setGhostPos(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY - 40 } : null);
  };
  const onTouchEndDeck = (e) => {
    clearTimeout(touchDragTimer.current);
    if (draggedDeckId) {
      const touch = e.changedTouches[0];
      if(touch) {
         const elem = document.elementFromPoint(touch.clientX, touch.clientY - 20) || document.elementFromPoint(touch.clientX, touch.clientY);
         const targetMemArea = elem?.closest('.decks-memorized-area'); const targetUnmemArea = elem?.closest('.decks-unmemorized-area');
         setDecks(prev => {
            let newDecks = [...prev]; const index = newDecks.findIndex(d => d.id === draggedDeckId);
            if (index !== -1) {
              if (targetMemArea) { newDecks[index] = { ...newDecks[index], lastStudied: Date.now(), cards: (newDecks[index].cards || []).map(c => ({...c, isMemorized: true})) }; } 
              else if (targetUnmemArea) { newDecks[index] = { ...newDecks[index], cards: (newDecks[index].cards || []).map(c => ({...c, isMemorized: false})) }; }
            }
            return newDecks;
         });
      }
      setTimeout(() => { setDraggedDeckId(null); setGhostPos(null); }, 100);
    }
  };

  const onTouchStartCard = (e, word) => { 
    e.stopPropagation(); 
    if (isDeleteMode) return; 
    const touch = e.touches[0]; 
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchDragTimer.current = setTimeout(() => { 
      setDraggedCardWord(word); 
      setGhostPos({ x: touch.clientX, y: touch.clientY - 40, title: word }); 
    }, 400); 
  };
  
  const onTouchMoveCard = (e) => { 
    if (!draggedCardWord) { 
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (Math.sqrt(dx*dx + dy*dy) > 20) { clearTimeout(touchDragTimer.current); }
      return; 
    } 
    e.preventDefault(); 
    const touch = e.touches[0]; 
    setGhostPos(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY - 40 } : null); 

    const scrollMargin = 100;
    if (touch.clientY < scrollMargin) {
      window.scrollBy(0, -25);
    } else if (window.innerHeight - touch.clientY < scrollMargin) {
      window.scrollBy(0, 25);
    }
  };
  
  const onTouchEndCard = (e) => {
    clearTimeout(touchDragTimer.current);
    if (draggedCardWord) {
      const touch = e.changedTouches[0];
      if(touch) {
         const elem = document.elementFromPoint(touch.clientX, touch.clientY - 20) || document.elementFromPoint(touch.clientX, touch.clientY);
         const targetLeftPanel = elem?.closest('.left-panel'); 
         const targetRightPanel = elem?.closest('.right-panel');
         if (targetRightPanel) { toggleMemorize(null, draggedCardWord, true); } 
         else if (targetLeftPanel) { toggleMemorize(null, draggedCardWord, false); }
      }
      setTimeout(() => { setDraggedCardWord(null); setGhostPos(null); }, 100);
    }
  };

  const handleTouchStart = (e) => {
    unlockAudio();
    if (draggedDeckId || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; touchEndX.current = null; touchEndY.current = null; 
  };
  
  const handleTouchMove = (e) => {
    if (draggedDeckId || window.scrollY > 10) return;
    if (!touchStartX.current || !touchStartY.current || e.target.closest('.side-panel') || e.target.closest('.modal-overlay') || view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    touchEndX.current = e.touches[0].clientX; touchEndY.current = e.touches[0].clientY;
    const diffY = touchEndY.current - touchStartY.current; const diffX = touchStartX.current - touchEndX.current;
    if (diffY > 10 && diffY > Math.abs(diffX) && (view === 'study' || view === 'decks')) setPullDownY(diffY);
  };
  
  const handleTouchEnd = () => {
    if (view === 'boxes' || view === 'printPreview' || view === 'manual') return;
    if (pullDownY > 120) {
      setIsStoring(true); setPullDownY(window.innerHeight);
      setTimeout(() => { if (view === 'study') closeDeck(); else if (view === 'decks') setView('boxes'); setIsStoring(false); setPullDownY(0); }, 400);
    } else {
      setPullDownY(0); const diffX = touchStartX.current - (touchEndX.current || touchStartX.current);
      if (Math.abs(diffX) > 50 && view === 'study') { if (diffX > 0) handleNextCard(); else handlePrevCard(); }
    }
  };

  const handleClick = () => { unlockAudio(); };
  const dynamicStyle = { transform: `translateY(${pullDownY}px) scale(${1 - pullDownY / 2000})`, opacity: 1 - pullDownY / 800, transition: isStoring ? 'all 0.4s' : (pullDownY === 0 ? '0.3s' : 'none'), width: '100%', height: '100%' };

  const renderMiniCard = (c, isMemorizedList, index = null) => {
    const isSelected = selectedForDelete.has(c.word);
    return (
      <div key={c.word} 
        className={`mini-card ${draggedCardWord === c.word ? 'dragging-mini' : ''} ${isDeleteMode && isSelected ? 'selected-for-delete' : ''}`} 
        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitUserDrag: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y', ...(isDeleteMode && isSelected ? { backgroundColor: '#fff0f0', borderColor: '#ffcccc' } : {}) }}
        draggable={!isDeleteMode && "true"}
        onClick={() => { if (isDeleteMode) toggleDeleteSelection(c.word); }}
        onDragStart={(e) => { 
          if(isDeleteMode) return; 
          setDraggedCardWord(c.word); 
          e.dataTransfer.effectAllowed = "move"; 
          const emptyImage = new Image();
          emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          if (e.dataTransfer.setDragImage) {
            e.dataTransfer.setDragImage(emptyImage, 0, 0);
          }
        }} 
        onDragEnd={(e) => {
          setDraggedCardWord(null);
        }} 
        title="Drag & Drop"
        onTouchStart={(e) => onTouchStartCard(e, c.word)} onTouchMove={onTouchMoveCard} onTouchEnd={onTouchEndCard}
      >
        <div className="mini-card-header">
          <span className="mini-word">
            {isDeleteMode && (
              <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '8px', pointerEvents: 'none'}} />
            )}
            {!isDeleteMode && index !== null && <span className="mini-index">{index}.</span>}
            {c.word}
          </span>
          {!isDeleteMode && (
            <div className="mini-icons">
              <button className="mini-icon-btn" onClick={(e) => toggleMemorize(e, c.word, !isMemorizedList)} title={isMemorizedList ? t.markUnmem : t.markMem}>{isMemorizedList ? '↩️' : '✅'}</button>
              <button className="mini-icon-btn" onClick={() => { stopAutoPlayIfActive(); setEditingCard({ originalWord: c.word, word: c.word, meaning: c.meaning, example: c.example || '', translation: c.translation || '', pos: c.pos || '' }); }}>✏️</button>
              <button className="mini-icon-btn delete-mini" onClick={(e) => deleteSpecificCard(e, c.word)}>✖</button>
            </div>
          )}
        </div>
        <div className="mini-meaning">{c.meaning}</div>
      </div>
    );
  };

  const renderDeckCard = (deck) => {
    const status = getEbbinghausStatus(deck); const isDragging = draggedDeckId === deck.id; const isAllMemorized = (deck.cards || []).length > 0 && (deck.cards || []).every(c => c.isMemorized);
    return (
      <div key={deck.id} data-id={deck.id} className={`deck-bundle ${status.shake ? 'polite-shake-once' : ''} ${isDragging ? 'dragging' : ''}`} 
        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitUserDrag: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
        onClick={() => openDeck(deck.id)} draggable="true" onDragStart={(e) => onDragStart(e, deck.id)} onDragEnd={() => setDraggedDeckId(null)}
        onTouchStart={(e) => onTouchStartDeck(e, deck)} onTouchMove={onTouchMoveDeck} onTouchEnd={onTouchEndDeck} title="PC:ドラッグ / スマホ:長押しで並べ替え">
        <div className="deck-paper stack-bottom"></div><div className="deck-paper stack-middle"></div>
        <div className="deck-paper top-cover">
          <h3 className="deck-name" title={deck.name}>{deck.name}<button className="inline-edit-btn" onClick={(e) => renameDeck(e, deck.id, deck.name)}>✏️</button></h3>
          <button className="delete-deck-btn-corner" onClick={e => deleteDeck(e, deck.id)}>×</button>
          <div className="deck-info-bottom">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <div className="deck-stats-mini"><span>🗂 {(deck.cards || []).length}{t.cardsCount}</span>{deck.lastStudied && <span>🗓 {formatDate(deck.lastStudied)}</span>}{deck.lastRecordTime !== null && <span>⏱ {t.bestTime} {formatTime(deck.lastRecordTime)}</span>}</div>
          </div>
          {isAllMemorized && <div className="memorized-stamp">{t.stampMem}</div>}
        </div>
        <div className="rubber-band"></div>
      </div>
    );
  };

  const posBadgeStyle = {
    position: 'absolute',
    top: '15px',
    left: '15px', 
    padding: '4px 12px',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '900',
    color: '#64748b',
    backgroundColor: '#ffffff',
    zIndex: 10
  };

  const renderCardFront = (card, isFullscreen) => {
    if (!card) return null;
    const fontSizeWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '';
    const fontSizeMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fontSizeExEn = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(20px, 4vw, 28px)';
    const fontSizeExJa = isFullscreen ? 'clamp(24px, 4vw, 48px)' : 'clamp(18px, 4vw, 22px)';

    const isJapanese = qLang === 'ja';

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={posBadgeStyle}>{card.pos}</span>}
        
        {qType === 'word' ? (
          qLang === 'en' ? (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <h1 className="word-text" style={{ textAlign: 'left', margin: 0, fontSize: fontSizeWord, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="core-meaning-large" style={{ textAlign: 'left', margin: 0, fontSize: fontSizeMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>{cleanText((card.meaning || '').split('/')[0])}</div>
            </div>
          )
        ) : (
          qLang === 'en' ? (
            <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
              <p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: fontSizeExEn, lineHeight: '1.8', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', width: '100%', display: 'inline-block'}}>
                {renderHighlightedText(card.example || '')}
              </p>
            </div>
          ) : (
            <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
              <p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: fontSizeExJa, lineHeight: '1.8', fontWeight: 'bold', color: '#334155', width: '100%', display: 'inline-block'}}>
                {cleanTranslation(card.translation)}
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  const renderCardBack = (card, isFullscreen) => {
    if (!card) return null; 
    const fontSizeWord = isFullscreen ? 'clamp(40px, 8vw, 80px)' : '48px';
    const fontSizeMean = isFullscreen ? 'clamp(32px, 6vw, 64px)' : '';
    const fontSizeExEn = isFullscreen ? 'clamp(24px, 4vw, 40px)' : '';
    const fontSizeExJa = isFullscreen ? 'clamp(20px, 3.5vw, 36px)' : '';

    const exModeExJaFontSize = isFullscreen ? 'clamp(28px, 5vw, 56px)' : 'clamp(18px, 4vw, 24px)';
    const exModeExEnFontSize = isFullscreen ? 'clamp(32px, 5.5vw, 64px)' : 'clamp(20px, 4vw, 26px)';

    const isJapanese = qLang === 'en'; 

    return (
      <div className="back-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        {isJapanese && card.pos && <span style={posBadgeStyle}>{card.pos}</span>}
        
        {qType === 'word' ? (
          <>
            {qLang === 'en' ? (
              <div className="meaning-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: 0, padding: 0, border: 'none' }}>
                <div className="core-meaning-large" style={{ textAlign: 'left', fontSize: fontSizeMean, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%' }}>
                  {String(card.meaning || '').split('/').map((m, i) => <div key={i} className="meaning-line" style={{textAlign: 'left'}}>{cleanText(m)}</div>)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <h1 className="word-text" style={{textAlign: 'left', fontSize: fontSizeWord, margin: 0, fontWeight: 'bold', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</h1>
              </div>
            )}

            {showExOnBack && (
              <div className="example-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'inline-block', textAlign: 'left', maxWidth: '100%' }}>
                  <p className="example-en" style={{ marginBottom: '8px', fontSize: fontSizeExEn, fontWeight: 'bold', textAlign: 'left' }}>{renderHighlightedText(card.example || '')}</p>
                  <p className="example-ja" style={{ margin: 0, fontSize: fontSizeExJa, fontWeight: 'bold', textAlign: 'left' }}>{renderHighlightedText(card.translation || '')}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
             <div className="example-section" style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
                {qLang === 'en' ? (
                  <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
                    <p className="example-ja" style={{textAlign: 'left', margin: 0, fontSize: exModeExJaFontSize, color: '#1e293b', fontWeight: 'bold', lineHeight: 1.8}}>
                      {renderHighlightedText(card.translation || '')}
                    </p>
                  </div>
                ) : (
                  <div style={{display: 'inline-block', textAlign: 'left', maxWidth: '100%'}}>
                    <p className="example-en" style={{textAlign: 'left', margin: 0, fontSize: exModeExEnFontSize, fontWeight: 'bold', color: '#1e293b', lineHeight: 1.5, fontFamily: '"Times New Roman", Times, serif' }}>
                      {renderHighlightedText(card.example || '')}
                    </p>
                  </div>
                )}
             </div>

             {showWordOnExMode && (
               <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', gap:'15px', opacity: 0.7, marginTop: isFullscreen ? '40px' : '25px', width: '100%' }}>
                  <div className="word-text" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(32px, 5vw, 56px)' : '18px', fontWeight:'bold', margin: 0, cursor: 'pointer', color:'#333', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'}} onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}>{card.word}</div>
                  <div className="core-meaning-large" style={{textAlign: 'left', fontSize: isFullscreen ? 'clamp(24px, 4vw, 40px)' : '15px', color:'#64748b', fontWeight:'bold', margin: 0, display: 'inline-block', maxWidth: '100%'}}>
                    {cleanText((card.meaning || '').split('/')[0])}
                  </div>
               </div>
             )}
          </div>
        )}
      </div>
    );
  };

  if (isAuthLoading) return <div className="app-container gentle-bg desk-view" style={{justifyContent:'center', height:'100vh'}}><h2 style={{color:'#7f8c8d'}}>{t.loading}</h2></div>;

  if (!currentUser) {
    return (
      <div className="login-screen-bg">
        <div className="login-top-right">
          <button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button>
          <button className="login-lang-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button>
        </div>
        <div className="login-hero-section">
          <h1 className="login-burning-text">{t.appTitle}</h1>
          <h2 className="login-burning-subtitle">{t.appSubtitle}</h2>
          
          <button className="login-google-btn" onClick={handleLogin}>{t.loginWithGoogle}</button>

          {isInAppBrowser && (
            <div style={{ marginTop: '20px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '8px', maxWidth: '350px', margin: '20px auto 0', lineHeight: '1.5' }}>
              ⚠️ LINEやInstagramのブラウザではログインエラーになる場合があります。<br/>右上のメニュー等から「<strong>Safari/ブラウザで開く</strong>」を選択してください。
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'manual') {
    return (
      <div className="app-container gentle-bg desk-view">
        <div className="manual-container">
          <div className="study-controls-top no-print" style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '20px', position: 'sticky', top: '10px', zIndex: 100 }}>
             <button className="back-to-desk-btn" onClick={() => setView('boxes')} style={{background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '8px'}}>{t.backToHome}</button>
             <button className="add-btn" onClick={() => window.print()} style={{marginLeft: '15px', backgroundColor: '#e74c3c'}}>{t.printPdfBtn}</button>
          </div>
          <div className="manual-content print-area">
              <h1 className="manual-title">{t.appTitle}<br/>{t.m_h1}</h1>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s1}</h2><p className="manual-p">{t.m_p1}</p><ul className="manual-list"><li>{t.m_l1_1}</li><li>{t.m_l1_2}</li><li>{t.m_l1_3}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s2}</h2><p className="manual-p">{t.m_p2}</p><h3 className="manual-h3">{t.m_s2_1}</h3><p className="manual-p">{t.m_p2_1}</p><h3 className="manual-h3">{t.m_s2_2}</h3><p className="manual-p">{t.m_p2_2}</p><p className="manual-p" style={{background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#555'}}>{t.m_p2_3}</p></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s3}</h2><p className="manual-p">{t.m_p3}</p><ul className="manual-list"><li>{t.m_l3_1}</li><li>{t.m_l3_2}</li><li>{t.m_l3_3}</li><li>{t.m_l3_4}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s4}</h2><p className="manual-p">{t.m_p4}</p><ul className="manual-list"><li>{t.m_l4_1}</li><li>{t.m_l4_2}</li><li>{t.m_l4_3}</li></ul></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s5}</h2><p className="manual-p">{t.m_p5}</p><p className="manual-p">{t.m_p5_1}</p></div>
              <div className="manual-section"><h2 className="manual-h2">{t.m_s6}</h2><ul className="manual-list"><li>{t.m_l6_1}</li><li>{t.m_l6_2}</li><li>{t.m_l6_3}</li></ul></div>
              <div style={{marginTop: '50px', textAlign: 'center', color: '#95a5a6', fontSize: '12px'}}>{t.appTitle}</div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'boxes') {
    return (
      <div className="app-container gentle-bg desk-view" style={{padding: 0}} onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        
        <div className="top-right-actions">
          <button className="lang-toggle-btn logout-btn" onClick={handleLogout} style={{backgroundColor: 'rgba(231, 76, 60, 0.8)', borderColor: 'transparent'}}>{t.logout}</button>
          <button className="manual-link-btn" onClick={() => window.open('https://english-t24.com', '_blank')} style={{backgroundColor: '#e67e22', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>🌐 Blog</button>
          <button className="manual-link-btn" onClick={() => window.open('https://app.english-t24.com', '_blank')} style={{backgroundColor: '#3498db', color: 'white', borderColor: 'transparent', fontWeight: 'bold'}}>📊 Log</button>
          <div style={{width: '2px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 5px'}}></div>
          <button className="manual-link-btn" onClick={() => setView('manual')}>{t.manualLink}</button>
          <button className="lang-toggle-btn" onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>{t.langToggle}</button>
        </div>
        
        <div className="hero-section">
          <h1 className="burning-text">{t.appTitle}</h1>
          <h2 className="burning-subtitle">{t.appSubtitle}</h2>
          <div className="creation-header-row">
            <span className="creation-label" title="Box" style={{color: '#fff'}}>📦</span>
            <input type="text" placeholder={t.boxPlaceholder} value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewBox()} />
            <button onClick={createNewBox} className="add-btn mini-btn">{t.createBtn}</button>
          </div>
        </div>
        <div className="boxes-grid">
          {(Array.isArray(boxes) ? boxes : []).map(box => {
            const hasReview = (Array.isArray(decks) ? decks : []).filter(d => d.boxId === box.id).some(d => { 
              const cards = Array.isArray(d.cards) ? d.cards : [];
              if (cards.length > 0 && cards.every(c => c.isMemorized)) return false; 
              return getEbbinghausStatus(d).needsReview; 
            });
            const isOpening = openingBoxId === box.id;
            return (
              <div key={box.id} className={`storage-box-container ${hasReview ? 'polite-shake-once' : ''}`}>
                <div className="box-top-actions">
                  <span className="box-instruction">{hasReview ? <span className="alert-text">{t.review}</span> : t.tapToOpen}</span>
                  <button className="box-icon-btn" onClick={(e) => renameBox(e, box.id, box.name)}>✏️</button>
                  <button className="box-icon-btn delete-box-btn" onClick={(e) => deleteBox(e, box.id)}>✖</button>
                </div>
                <div className={`storage-box ${isOpening ? 'opening-anim' : ''}`} onClick={() => openBox(box.id)}>
                  <div className="box-lid-line"></div><div className="box-label-wrapper"><span className="box-label" title={box.name}>{box.name}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'test') {
    return (
      <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes superCorrect {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
          }
          @keyframes superWrong {
            0% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            20% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
          }
          @keyframes correctOutline {
            0% { box-shadow: 0 0 0px transparent; }
            50% { box-shadow: 0 0 15px rgba(39, 174, 96, 0.6); }
            100% { box-shadow: 0 0 5px rgba(39, 174, 96, 0.4); }
          }
          .test-effect-overlay {
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1000;
            text-align: center;
            width: 100%;
          }
          .effect-correct-super { animation: superCorrect 0.8s ease-out forwards; }
          .effect-wrong-super { animation: superWrong 1.2s ease-out forwards; }
          .effect-text-main {
            font-size: clamp(50px, 8vw, 100px);
            font-weight: 900;
            text-shadow: 0 5px 20px rgba(0,0,0,0.3);
            margin-bottom: 5px;
          }
          .effect-text-sub {
            font-size: clamp(20px, 4vw, 36px);
            font-weight: bold;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
          }
          .effect-correct-super .effect-text-main, .effect-correct-super .effect-text-sub { color: #27ae60; }
          .effect-wrong-super .effect-text-main { color: #e74c3c; }
          .test-btn-show-correct {
            box-shadow: 0 0 0 4px #27ae60 inset, 0 4px 15px rgba(39, 174, 96, 0.4) !important;
            background-color: #eafff0 !important;
            color: #27ae60 !important;
            font-weight: 900 !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            animation: correctOutline 0.8s ease-out forwards !important;
            z-index: 10;
            position: relative;
          }
          .test-btn-dimmed {
            opacity: 0.3 !important;
            transition: opacity 0.2s ease !important;
          }
        `}} />
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
                <button className="add-btn" onClick={() => startTest()}>{t.tryAgainBtn}</button>
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
      </div>
    );
  }

  if (view === 'printPreview') {
    const chunkSize = printMode === 'example' ? 10 : 25;
    const chunks = chunkArray(printCards, chunkSize);
    const title = printMode === 'example' ? t.printTestExampleTitle : t.printTestTitle;
    const todayStr = new Date().toLocaleDateString();

    return (
      <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div 
          className="print-controls no-print" 
          style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '20px', 
            justifyContent: 'center', 
            width: '100%', 
            padding: '20px', 
            background: '#fff', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)', 
            position: 'sticky', 
            top: 0, 
            zIndex: 100 
          }}
        >
          <button className="cancel-btn" onClick={() => setView('study')} style={{ margin: 0 }}>{t.backToStudyBtn}</button>
          <button className="add-btn" onClick={shufflePrintCards} style={{ backgroundColor: '#8e44ad', margin: 0 }}>{t.shuffleBtn}</button>
          <button className="add-btn" onClick={() => window.print()} style={{ backgroundColor: '#e74c3c', margin: 0 }}>{t.printPdfBtn}</button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0; }
            body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .no-print, .ep-landing-wrapper, .top-right-actions, .study-controls-top { display: none !important; }
            .app-container { background: white !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
            .print-area-wrapper { padding: 0 !important; margin: 0 !important; display: block !important; }
            .print-page { page-break-after: always; margin: 0 !important; padding: 12mm 15mm !important; width: 210mm !important; height: 297mm !important; box-shadow: none !important; box-sizing: border-box; overflow: hidden; }
            .print-page:last-child { page-break-after: auto; }
          }
          
          .print-area-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; padding-bottom: 50px; background: #f1f5f9; }
          .print-page { background: white; width: 210mm; height: 297mm; margin: 0 0 30px 0; padding: 12mm 15mm; box-shadow: 0 10px 30px rgba(0,0,0,0.1); box-sizing: border-box; color: #000; overflow: hidden; position: relative; }

          .print-header-compact { position: relative; border-bottom: none; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
          .print-date-compact { position: absolute; top: -12px; right: 0; font-size: 10px; color: #555; font-weight: bold; }
          .print-title-compact { font-size: 22px; font-weight: 900; margin: 0; white-space: nowrap; max-width: 45%; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
          .print-name-compact { font-size: 16px; font-weight: bold; flex-grow: 1; padding-bottom: 2px; }
          .print-score-compact { font-size: 16px; font-weight: bold; white-space: nowrap; padding-bottom: 2px; }
          .print-score-large-compact { font-size: 26px; font-weight: 900; margin-left: 5px; }

          .print-columns-container { display: flex; gap: 40px; width: 100%; height: calc(100% - 60px); }
          .print-column { flex: 1; display: flex; flex-direction: column; }
          .print-column-single { display: flex; flex-direction: column; width: 100%; height: calc(100% - 60px); }

          .print-q-item { display: flex; flex-direction: column; justify-content: space-between; height: 58px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; } 
          .print-q-top { display: flex; align-items: flex-start; flex-grow: 1; }
          .print-q-num { width: 45px; font-weight: bold; flex-shrink: 0; font-size: 14px; }
          .print-q-ja { font-size: 14px; line-height: 1.2; word-break: keep-all; overflow-wrap: anywhere; }
          .print-q-bottom { padding-left: 45px; width: 100%; box-sizing: border-box; flex-shrink: 0; padding-bottom: 4px; }
          .print-q-ans { width: 100%; border-bottom: 1px solid #000; height: 6px; }

          .print-q-item-example { display: flex; flex-direction: column; justify-content: space-between; min-height: 65px; margin-bottom: 30px; page-break-inside: avoid; break-inside: avoid; }
          .print-q-ja-example { font-size: 14px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
          .print-q-example-en { font-size: 16px; line-height: 1.6; padding-left: 5px; font-family: "Times New Roman", Times, serif; flex-shrink: 0; }
          
          .print-blank-line { display: inline-block; width: 150px; border-bottom: 1.5px solid #000; margin: 0 10px; vertical-align: text-bottom; }
        `}} />

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
                    <div className="print-score-compact">
                      {t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span>
                    </div>
                  </div>
                )}
                
                {printMode === 'example' ? (
                  <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                    {chunk.map((c, i) => {
                      const globalIndex = pageIndex * chunkSize + i + 1;
                      return (
                        <div key={`ex-${i}`} className="print-q-item-example">
                          <div className="print-q-top">
                            <span className="print-q-num">({globalIndex})</span>
                            <span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span>
                          </div>
                          <div className="print-q-bottom">
                            <div className="print-q-example-en">{renderBlankExample(c.example)}</div>
                          </div>
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
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
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
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
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
                    <h1 className="print-title-compact" title={`${activeDeck?.name} ${title} ${lang === 'ja' ? '【解答】' : '[Answers]'}`}>
                      {activeDeck?.name} {title} <span style={{color: '#e74c3c', fontSize: '18px', marginLeft: '10px'}}>{lang === 'ja' ? '【解答】' : '[Answers]'}</span>
                    </h1>
                    <div className="print-name-compact">{t.printName}</div>
                    <div className="print-score-compact">
                      {t.printScore.split('：')[0]}：<span className="print-score-large-compact">　　 / {printCards.length}</span>
                    </div>
                  </div>
                )}
                
                {printMode === 'example' ? (
                  <div className="print-column-single" style={{ marginTop: pageIndex > 0 ? '20px' : '35px' }}>
                    {chunk.map((c, i) => {
                      const globalIndex = pageIndex * chunkSize + i + 1;
                      return (
                        <div key={`ans-ex-${i}`} className="print-q-item-example">
                          <div className="print-q-top">
                            <span className="print-q-num">({globalIndex})</span>
                            <span className="print-q-ja-example">{cleanTranslation(c.translation) || cleanText((c.meaning || '').split('/')[0])}</span>
                          </div>
                          <div className="print-q-bottom">
                            <div className="print-q-example-en" style={{fontWeight: 'bold', color: '#2c3e50'}}>{renderHighlightedText(c.example)}</div>
                          </div>
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
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div 
                              className="print-q-bottom" 
                              style={{ 
                                borderBottom: '1px solid #000', 
                                height: '24px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                paddingBottom: '2px', 
                                paddingLeft: '5px', 
                                fontSize: '15px', 
                                fontWeight: 'bold', 
                                color: '#e74c3c' 
                              }}
                            >
                              {c.word}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="print-column">
                      {chunk.slice(Math.ceil(chunk.length / 2)).map((c, i) => {
                        const globalIndex = pageIndex * chunkSize + Math.ceil(chunk.length / 2) + i + 1;
                        return (
                          <div key={`ans-right-${i}`} className="print-q-item">
                            <div className="print-q-top">
                              <span className="print-q-num">({globalIndex})</span>
                              <span className="print-q-ja">{cleanText((c.meaning || '').split('/')[0])}</span>
                            </div>
                            <div 
                              className="print-q-bottom" 
                              style={{ 
                                borderBottom: '1px solid #000', 
                                height: '24px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                paddingBottom: '2px', 
                                paddingLeft: '5px', 
                                fontSize: '15px', 
                                fontWeight: 'bold', 
                                color: '#e74c3c' 
                              }}
                            >
                              {c.word}
                            </div>
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
  }

  return (
    <div className="app-container gentle-bg desk-view" onClick={handleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(39, 174, 96, 0.95)', color: '#fff', padding: '20px 40px',
          borderRadius: '16px', fontWeight: 'bold', zIndex: 10001, fontSize: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'popInOut 3s forwards',
          textAlign: 'center', whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media(min-width: 1024px) {
          .app-container {
            max-width: 100% !important;
            padding-left: 1vw !important;
            padding-right: 1vw !important;
          }
          .study-dashboard {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            gap: 20px !important;
          }
          .left-panel { flex: 0 0 380px !important; width: 380px !important; max-width: 380px !important; }
          .center-panel { flex: 1 !important; display: flex; flex-direction: column; align-items: center; max-width: 1200px !important; margin: 0 auto !important; }
          .center-panel:not(.fullscreen-active) .card-animation-wrapper { 
            min-height: 520px !important; 
            max-width: 820px !important; 
            width: 100% !important; 
            margin: 0 auto !important; 
          }
          
          /* カード拡大に伴うPCでのテキストサイズ拡張 */
          .center-panel:not(.fullscreen-active) .card-container .word-text { font-size: 72px !important; }
          .center-panel:not(.fullscreen-active) .card-container .core-meaning-large { font-size: 48px !important; }
          .center-panel:not(.fullscreen-active) .card-container .example-en { font-size: 36px !important; line-height: 1.5 !important; }
          .center-panel:not(.fullscreen-active) .card-container .example-ja { font-size: 28px !important; line-height: 1.6 !important; }

          /* 例文モード時の下部の薄い単語表示の調整 */
          .center-panel:not(.fullscreen-active) .card-container div[style*="opacity: 0.7"] .word-text { font-size: 28px !important; }
          .center-panel:not(.fullscreen-active) .card-container div[style*="opacity: 0.7"] .core-meaning-large { font-size: 20px !important; }

          .mini-card-list { display: grid; grid-template-columns: 1fr 1fr !important; gap: 8px; align-content: start; }
        }

        .panel-top-action { width: 100%; box-sizing: border-box; }
        .panel-top-action button { white-space: normal !important; word-break: keep-all !important; overflow-wrap: anywhere !important; line-height: 1.4 !important; height: auto !important; min-height: 44px !important; box-sizing: border-box !important; width: 100%; max-width: 100%; }
        .bulk-file-actions { width: 100%; box-sizing: border-box; }
        .bulk-file-actions button, .bulk-file-actions label { box-sizing: border-box; width: 100%; max-width: 100%; }

        .setting-badge-btn { background: white; border: 2px solid #e2e8f0; border-radius: 50px; padding: 6px 12px; font-size: 13px; font-weight: 900; color: #64748b; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); white-space: nowrap; }
        .setting-badge-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .setting-badge-btn.active { background: #e0e7ff; border-color: #818cf8; color: #4338ca; }
        
        .toggle-tab-btn { background: transparent; border: none; padding: 6px 16px; font-size: 13px; font-weight: 900; color: #94a3b8; border-radius: 50px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .toggle-tab-btn.active { background: white; color: #4338ca; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

        .fullscreen-active {
           position: fixed !important; top: 0; left: 0; width: 100vw !important; height: 100vh !important;
           height: 100dvh !important;
           background: #f1f5f9 !important; z-index: 9999 !important;
           display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;
           max-width: none !important;
           padding: 0 !important; 
           box-sizing: border-box !important;
        }
        
        .fullscreen-active .card-animation-wrapper {
           width: 90vw !important; 
           max-width: 1100px !important; 
           height: auto !important;
           min-height: 40vh !important;
           margin: 0 auto !important; 
        }
        
        .fullscreen-stealth-top {
           position: absolute !important; top: 20px !important; left: 50% !important; transform: translateX(-50%) !important;
           opacity: 0.15; transition: opacity 0.3s; z-index: 10000;
           background: white !important; padding: 10px 20px !important; border-radius: 50px !important;
           box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; margin: 0 !important; width: auto !important;
        }
        .fullscreen-active:hover .fullscreen-stealth-top, .fullscreen-stealth-top:hover, .fullscreen-stealth-top:active { opacity: 1; }

        .fullscreen-stealth-bottom {
           position: absolute !important; bottom: 20px !important; left: 50% !important; transform: translateX(-50%) !important;
           opacity: 0.15; transition: opacity 0.3s; z-index: 10000;
           background: white !important; padding: 10px 25px !important; border-radius: 20px !important;
           box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; 
           width: 90% !important; max-width: 500px !important;
           display: flex; flex-direction: column; gap: 5px; align-items: center; justify-content: center;
           box-sizing: border-box !important;
        }
        @media(min-width: 768px) {
          .fullscreen-stealth-bottom { flex-direction: row !important; justify-content: center !important; }
          .fullscreen-stealth-bottom .autoplay-controls { width: 100% !important; flex: 1 !important; margin-left: 0 !important; }
        }
        .fullscreen-active:hover .fullscreen-stealth-bottom, .fullscreen-stealth-bottom:hover, .fullscreen-stealth-bottom:active { opacity: 1; }
        
        @media (max-width: 900px) and (orientation: portrait) {
           .fullscreen-active {
              padding: 0 !important; 
              justify-content: center !important;
           }
           .fullscreen-stealth-top {
              position: absolute !important; top: 10px !important; left: 50% !important; transform: translateX(-50%) scale(0.85) !important;
              transform-origin: top center !important;
              width: 95% !important; opacity: 1 !important;
           }
           .fullscreen-stealth-bottom {
              position: absolute !important; bottom: 10px !important; left: 50% !important; transform: translateX(-50%) scale(0.85) !important;
              transform-origin: bottom center !important;
              width: 95% !important; opacity: 1 !important;
           }
           .fullscreen-active .card-animation-wrapper {
              flex: none !important; 
              height: 50vh !important; 
              margin: 0 !important;
              display: flex; align-items: center; justify-content: center;
           }
        }
        
        @media (max-width: 900px) and (orientation: landscape) {
          .fullscreen-stealth-top {
            top: 5px !important;
            transform: translateX(-50%) scale(0.7) !important;
            transform-origin: top center !important;
            opacity: 1 !important;
          }
          .fullscreen-stealth-bottom {
            bottom: 5px !important;
            transform: translateX(-50%) scale(0.7) !important;
            transform-origin: bottom center !important;
            width: 95% !important;
            opacity: 1 !important;
          }
          .fullscreen-active .card-animation-wrapper {
            min-height: 40vh !important;
            height: 60vh !important;
          }
        }

        .top-right-actions {
          width: 100% !important;
          position: absolute !important;
          top: 15px !important;
          left: 0 !important;
          right: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          flex-wrap: wrap !important;
          padding: 0 15px !important;
          box-sizing: border-box !important;
          gap: 8px !important;
          pointer-events: none !important;
          z-index: 100 !important;
        }
        .top-right-actions > * {
          pointer-events: auto !important;
        }
        .top-right-actions > .logout-btn {
          position: absolute !important;
          left: 15px !important;
          top: 0 !important;
          margin: 0 !important;
        }
        .top-right-actions > .lang-toggle-btn:not(.logout-btn) {
          position: absolute !important;
          right: 15px !important;
          top: 0 !important;
          margin: 0 !important;
        }
        @media(max-width: 768px) {
          .top-right-actions {
            padding-top: 45px !important;
          }
        }

        .drag-ghost {
          position: fixed;
          pointer-events: none !important;
          z-index: 9999;
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          font-weight: bold;
          color: #333;
          transform: translate(-50%, -50%);
          white-space: nowrap;
        }

        @keyframes popInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }

        .nav-btn-physical {
          background: white; border: 1px solid #e2e8f0; border-radius: 12px;
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: #64748b; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .nav-btn-physical:hover { background: #f8fafc; border-color: #cbd5e1; }
        .nav-btn-physical:active { transform: scale(0.95); background: #f1f5f9; }
      `}} />
      
      {ghostPos && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }}>
          {ghostPos.title}
        </div>
      )}
      
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#6d5b53'}}>{t.editCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={editingCard.word} onChange={(e) => setEditingCard({...editingCard, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'auto', marginBottom: '15px' }} value={editingCard.pos || ''} onChange={(e) => setEditingCard({...editingCard, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option>
              <option value="動詞">動詞</option>
              <option value="形容詞">形容詞</option>
              <option value="副詞">副詞</option>
              <option value="代名詞">代名詞</option>
              <option value="前置詞">前置詞</option>
              <option value="接続詞">接続詞</option>
              <option value="熟語">熟語</option>
              <option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={editingCard.meaning} onChange={(e) => setEditingCard({...editingCard, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={editingCard.example} onChange={(e) => setEditingCard({...editingCard, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={editingCard.translation} onChange={(e) => setEditingCard({...editingCard, translation: e.target.value})} rows="2" />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingCard(null)}>{t.cancelBtn}</button>
              <button className="add-btn" onClick={saveEditedCard}>{t.saveBtn}</button>
            </div>
          </div>
        </div>
      )}

      {addingCard && (
        <div className="modal-overlay" onClick={() => setAddingCard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: '#27ae60'}}>{t.newCardTitle}</h3>
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.wordReq}</label>
            <input className="modal-input" value={newCardData.word} onChange={(e) => setNewCardData({...newCardData, word: e.target.value})} />
            
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.posLabel}</label>
            <select className="modal-input" style={{ appearance: 'auto', marginBottom: '15px' }} value={newCardData.pos || ''} onChange={(e) => setNewCardData({...newCardData, pos: e.target.value})}>
              <option value="">-- 指定なし --</option>
              <option value="名詞">名詞</option>
              <option value="動詞">動詞</option>
              <option value="形容詞">形容詞</option>
              <option value="副詞">副詞</option>
              <option value="代名詞">代名詞</option>
              <option value="前置詞">前置詞</option>
              <option value="接続詞">接続詞</option>
              <option value="熟語">熟語</option>
              <option value="その他">その他</option>
            </select>

            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.meanReq}</label>
            <input className="modal-input" value={newCardData.meaning} onChange={(e) => setNewCardData({...newCardData, meaning: e.target.value})} />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.exHint}</label>
            <textarea className="modal-input" value={newCardData.example} onChange={(e) => setNewCardData({...newCardData, example: e.target.value})} rows="2" />
            <label style={{fontSize: '13px', color: '#a39c96', fontWeight: 'bold'}}>{t.trHint}</label>
            <textarea className="modal-input" value={newCardData.translation} onChange={(e) => setNewCardData({...newCardData, translation: e.target.value})} rows="2" />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAddingCard(false)}>{t.cancelBtn}</button>
              <button className="add-btn" style={{backgroundColor: '#27ae60'}} onClick={saveNewCard}>{t.addBtn}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'decks' && (() => {
        const boxDecks = decks.filter(d => d.boxId === currentBoxId);
        const unmemorizedDecks = boxDecks.filter(d => !(d.cards.length > 0 && d.cards.every(c => c.isMemorized)));
        const memorizedDecks = boxDecks.filter(d => d.cards.length > 0 && d.cards.every(c => c.isMemorized));
        return (
          <div style={dynamicStyle}>
            <div className="inner-view-wrapper">
              <div className="study-header">
                <button className="back-to-desk-btn" onClick={() => setView('boxes')}>{t.backToHome}</button>
                <h2 className="app-title" style={{margin:0}}>📦 {boxes.find(b => b.id === currentBoxId)?.name}</h2>
                <div style={{width: '80px'}}></div>
              </div>
              <div className="integrated-creation-area">
                <div className="creation-row">
                  <span className="creation-label" title="Deck">🔖</span>
                  <input type="text" placeholder={t.deckPlaceholder} value={newDeckNameInside} onChange={(e) => setNewDeckNameInside(e.target.value)} onKeyPress={e => e.key === 'Enter' && createNewDeckInsideBox()} />
                  <button onClick={createNewDeckInsideBox} className="add-btn mini-btn">{t.addBtn}</button>
                </div>
              </div>
              <div className="decks-split-layout">
                <div className="decks-unmemorized-area" onDragOver={onDragOver} onDrop={(e) => onDropToArea(e, 'unmemorized')}>
                  <h3 className="area-title">{t.unmemTitle}</h3><p className="area-hint">{t.unmemHint}</p>
                  {unmemorizedDecks.length === 0 ? (<p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noUnmem}</p>) : (<div className="decks-grid">{unmemorizedDecks.map(d => renderDeckCard(d))}</div>)}
                </div>
                <div className="decks-memorized-area" onDragOver={onDragOver} onDrop={(e) => onDropToArea(e, 'memorized')}>
                  <h3 className="area-title" style={{color: '#27ae60'}}>{t.memTitle}</h3><p className="area-hint">{t.memHint}</p>
                  {memorizedDecks.length === 0 ? (<p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>{t.noMem}</p>) : (<div className="decks-grid memorized-grid">{memorizedDecks.map(d => renderDeckCard(d))}</div>)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'study' && (
        <div style={dynamicStyle}>
          <div className="study-dashboard">
            {!isFullscreen && (
              <div className="side-panel left-panel" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (draggedCardWord) { toggleMemorize(null, draggedCardWord, false); setDraggedCardWord(null); } }}>
                <h3 className="panel-title">{t.learningPanel} ({studyCards.length})</h3>
                
                <div className="panel-top-action" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!isDeleteMode ? (
                    <>
                      <div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}>
                        <button onClick={() => setAddingCard(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#27ae60', margin: 0, boxSizing: 'border-box'}}>✏️ 手動で追加</button>
                        <button onClick={() => setIsBulkMode(true)} className="add-btn bulk-toggle-btn" style={{flex: 1, padding: '10px 4px', fontSize: '12px', backgroundColor: '#e67e22', margin: 0, boxSizing: 'border-box'}}>📂 CSVで追加</button>
                      </div>
                      <button onClick={() => setIsDeleteMode(true)} className="add-btn bulk-toggle-btn" style={{width: '100%', padding: '8px 0', fontSize: '12px', backgroundColor: '#95a5a6', margin: 0, boxSizing: 'border-box'}}>🗑️ 一括削除</button>
                    </>
                  ) : (
                    <div style={{display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box'}}>
                      <button onClick={() => {setIsDeleteMode(false); setSelectedForDelete(new Set());}} className="cancel-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', margin: 0, boxSizing: 'border-box'}}>{t.cancelBulkDelete}</button>
                      <button onClick={executeBulkDelete} className="add-btn" style={{flex: 1, padding: '10px 0', fontSize: '12px', backgroundColor: '#e74c3c', margin: 0, boxSizing: 'border-box'}}>{t.executeBulkDelete} ({selectedForDelete.size})</button>
                    </div>
                  )}
                </div>

                <div className="mini-card-list">{studyCards.map((c, i) => renderMiniCard(c, false, i + 1))}</div>
              </div>
            )}
            
            <div className={`center-panel ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%' }}>
              {!isFullscreen && (
                <>
                  <div className="study-controls-top" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <button className="back-to-desk-btn" onClick={closeDeck} style={{color: '#7f8c8d', textShadow: 'none', background: 'none'}}>{t.backBtn}</button>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <button className="mute-toggle-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? t.audioOff : t.audioOn}</button>
                      <div className={`study-timer-box ${isCompleted ? 'completed-timer' : ''}`} style={{ visibility: isBulkMode ? 'hidden' : 'visible', background: '#fff', color: '#333', textShadow: 'none' }}>⏱ {formatTime(studyTime)}</div>
                    </div>
                  </div>
                  <div className="study-title-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px', width: '100%' }}>
                    <h2 className="study-deck-title" style={{ margin: 0 }}>{activeDeck?.name}</h2>
                    {allCards.length >= 4 && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="test-start-btn" onClick={startTest}>{t.testBtn}</button>
                        <button className="test-start-btn print-btn" onClick={() => openPrintPreview('word')}>{t.printBtn}</button>
                        <button className="test-start-btn print-btn" onClick={() => openPrintPreview('example')} style={{backgroundColor: '#3498db'}}>{t.printExampleBtn}</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {!isFullscreen && isBulkMode && (
                <div className="bulk-input-section" style={{ marginTop: '0px', width: '100%', maxWidth: '600px' }}>
                  <p className="bulk-hint" style={{fontSize:'16px', color:'#333'}}>{t.csvHint}</p>
                  
                  <div className="bulk-file-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
                    <button 
                      onClick={downloadTemplate} 
                      style={{ backgroundColor: '#f39c12', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0 }}
                    >
                      📥 テンプレート(CSV)をダウンロードする
                    </button>
                    
                    <label 
                      style={{ backgroundColor: '#27ae60', color: '#ffffff', border: 'none', padding: '16px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', margin: 0, textAlign: 'center' }}
                    >
                      {loading ? t.loading : '📂 CSVファイルをインポートする'}
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                    </label>
                  </div>

                  <p className="bulk-note" style={{ color: '#27ae60', fontWeight: 'bold', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{t.chatGptNote}</p>
                  <div className="bulk-actions" style={{ marginTop: '15px' }}>
                    <button onClick={() => setIsBulkMode(false)} className="cancel-btn" disabled={loading}>{t.closeBtn}</button>
                  </div>
                </div>
              )}
              
              {allCards.length > 0 && studyCards.length === 0 ? (
                <div className="empty-deck-msg" style={{marginTop: '60px'}}>
                  <h2 style={{color: '#27ae60'}}>{t.allMemorizedMsg}</h2>
                  <button onClick={resetMemorized} className="add-btn" style={{marginTop: '20px', padding: '15px 30px', fontSize: '18px'}}>{t.resetBtn}</button>
                </div>
              ) : studyCards.length > 0 && !isBulkMode ? (
                <div className={`flashcard-area ${isFullscreen ? 'fullscreen-active' : ''}`} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                  
                  <div className={`card-header-actions ${isFullscreen ? 'fullscreen-stealth-top' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isFullscreen ? 0 : '20px', width: '100%', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '15px', width: '100%' }}>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setQLang(qLang === 'en' ? 'ja' : 'en')} className="setting-badge-btn" title="出題言語の切り替え">
                          {qLang === 'en' ? '🇺🇸 英→日' : '🇯🇵 日→英'}
                        </button>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '50px', padding: '3px', border: '1px solid #e2e8f0' }}>
                          <button onClick={() => setQType('word')} className={`toggle-tab-btn ${qType === 'word' ? 'active' : ''}`}>🔤 単語</button>
                          <button onClick={() => setQType('example')} className={`toggle-tab-btn ${qType === 'example' ? 'active' : ''}`}>📝 例文</button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {qType === 'word' ? (
                          <button onClick={() => setShowExOnBack(!showExOnBack)} className={`setting-badge-btn ${showExOnBack ? 'active' : ''}`} title="裏面の例文表示">
                            例文 {showExOnBack ? 'ON' : 'OFF'}
                          </button>
                        ) : (
                          <button onClick={() => setShowWordOnExMode(!showWordOnExMode)} className={`setting-badge-btn ${showWordOnExMode ? 'active' : ''}`} title="裏面の単語表示">
                            単語 {showWordOnExMode ? 'ON' : 'OFF'}
                          </button>
                        )}
                        <button onClick={() => setIsFrontOnlyAuto(!isFrontOnlyAuto)} className={`setting-badge-btn ${isFrontOnlyAuto ? 'active' : ''}`} title="自動めくり時に裏面をスキップします">
                          表面のみ {isFrontOnlyAuto ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="card-counter" style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#94a3b8', padding: '0 10px' }}>
                        {currentIndex + 1} / {studyCards.length}
                      </div>

                    </div>
                  </div>

                  <div className="card-animation-wrapper" key={currentIndex} style={{ width: '100%' }}>
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => {stopAutoPlayIfActive(); setIsFlipped(!isFlipped);}}>
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="ring-hole"></div><button className="memorize-check-btn" onClick={(e) => toggleMemorize(e, studyCards[currentIndex]?.word, true)}>✔</button>
                          {renderCardFront(studyCards[currentIndex], isFullscreen)}
                        </div>
                        <div className="card-back">
                          {renderCardBack(studyCards[currentIndex], isFullscreen)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isFullscreen ? (
                    <div className="fullscreen-stealth-bottom">
                      <div className="autoplay-controls" style={{ margin: 0, border: 'none', padding: 0, width: '100%', boxSizing: 'border-box' }}>
                        <div className="autoplay-actions-row">
                          <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                          <button 
                            className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isAutoPlaying) { playAudio(studyCards[currentIndex]?.word); } 
                              setIsAutoPlaying(!isAutoPlaying); 
                            }}
                          >
                            {isAutoPlaying ? t.autoPlayStop : t.autoPlayStart}
                          </button>
                          <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                          <button className="repeat-btn" onClick={handleRepeat} style={{background: '#f8f9fa', color: '#555'}}>{t.repeatBtn}</button>
                          <button className="fullscreen-btn" onClick={toggleFullScreen} style={{background: '#f8f9fa', color: '#555'}}>{isFullscreen ? t.fullScreenExit : t.fullScreenEnter}</button>
                        </div>
                        <div className="speed-slider-container" style={{marginTop: '15px'}}>
                          <div style={{fontSize: '11px', color: '#7f8c8d', fontWeight: 'bold', marginBottom: '2px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                            {t.intervalLabel}: {displaySeconds === 0 ? `${t.godspeed} (0.0 ${t.sec})` : `${displaySeconds.toFixed(1)} ${t.sec}`}
                          </div>
                          <div className="speed-slider-wrapper" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '35px', textAlign: 'right' }}>{t.fast} {displaySeconds === 0 ? '👼' : '🐇'}</span>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '10px', color: '#bdc3c7', fontWeight: 'bold', marginBottom: '1px' }}><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>
                              <input 
                                type="range" min="0" max="4.0" step="0.1" 
                                value={displaySeconds} 
                                onChange={(e) => setDisplaySeconds(Number(e.target.value))} 
                                className="speed-slider" 
                                style={{ width: '100%', margin: 0 }} 
                              />
                            </div>
                            <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '35px', textAlign: 'left' }}>🐢 {t.slow}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="autoplay-controls" style={{background: '#fff', border: '1px solid #e1e4e8', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box'}}>
                      <div className="autoplay-actions-row">
                        <button className="nav-btn-physical" onClick={handlePrevCard}>◀</button>
                        <button 
                          className={`autoplay-toggle-btn ${isAutoPlaying ? 'active' : ''}`} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (!isAutoPlaying) { playAudio(studyCards[currentIndex]?.word); } 
                            setIsAutoPlaying(!isAutoPlaying); 
                          }}
                        >
                          {isAutoPlaying ? t.autoPlayStop : t.autoPlayStart}
                        </button>
                        <button className="nav-btn-physical" onClick={handleNextCard}>▶</button>
                        <button className="repeat-btn" onClick={handleRepeat} style={{background: '#f8f9fa', color: '#555'}}>{t.repeatBtn}</button>
                        <button className="fullscreen-btn" onClick={toggleFullScreen} style={{background: '#f8f9fa', color: '#555'}}>{isFullscreen ? t.fullScreenExit : t.fullScreenEnter}</button>
                      </div>
                      <div className="speed-slider-container" style={{marginTop: '15px'}}>
                        <div style={{fontSize: '13px', color: '#7f8c8d', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                          {t.intervalLabel}: {displaySeconds === 0 ? `${t.godspeed} (0.0 ${t.sec})` : `${displaySeconds.toFixed(1)} ${t.sec}`}
                        </div>
                        <div className="speed-slider-wrapper" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                          <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'right' }}>{t.fast} {displaySeconds === 0 ? '👼' : '🐇'}</span>
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '12px', color: '#bdc3c7', fontWeight: 'bold', marginBottom: '2px' }}><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>
                            <input 
                              type="range" min="0" max="4.0" step="0.1" 
                              value={displaySeconds} 
                              onChange={(e) => setDisplaySeconds(Number(e.target.value))} 
                              className="speed-slider" 
                              style={{ width: '100%', margin: 0 }} 
                            />
                          </div>
                          <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: 'bold', whiteSpace: 'nowrap', width: '45px', textAlign: 'left' }}>🐢 {t.slow}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {!isFullscreen && (
              <div className="side-panel right-panel" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (draggedCardWord) { toggleMemorize(null, draggedCardWord, true); setDraggedCardWord(null); } }}>
                <h3 className="panel-title">{t.memorizedPanel} ({memorizedCards.length})</h3>
                <div className="mini-card-list">
                  {memorizedCards.length === 0 ? (<p className="empty-mini-msg">{t.dragHereMsg}</p>) : (memorizedCards.map(c => renderMiniCard(c, true)))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;