export const initialBoxes = [
  { id: 1, nameKey: 'box1Name', name: '中学レベル' },
  { id: 2, nameKey: 'box2Name', name: '資格・オリジナル箱' }
];

export const initialDecks = [
  {
    id: 1, boxId: 1, nameKey: 'deck1Name', name: '基本の動詞', lastStudied: null, lastRecordTime: null,
    cards: [
      { word: 'shine', meaning: '輝く / 光る', example: 'The stars **shine** brightly.', translation: '星が明るく**輝く**。', isMemorized: false, pos: '動詞' },
      { word: 'have', meaning: '持っている / 食べる', example: 'I **have** a book.', translation: '私は本を**持っています**。', isMemorized: false, pos: '動詞' },
      { word: 'make', meaning: '作る', example: 'She **makes** dinner.', translation: '彼女は夕食を**作ります**。', isMemorized: false, pos: '動詞' },
      { word: 'attack', meaning: '攻撃する', example: 'The dog will not **attack** you.', translation: 'その犬はあなたを**攻撃し**ません。', isMemorized: false, pos: '動詞' }
    ]
  }
];