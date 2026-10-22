// Familles de caractères visuellement proches, utilisées pour les distracteurs
// du stage 3. Les variantes dakuten/handakuten (は/ば/ぱ) sont rapprochées
// automatiquement (cf. features/quiz/questions), inutile de les lister ici.
export const CONFUSABLE_SETS: readonly string[][] = [
  // Hiragana
  ['あ', 'お', 'め', 'ぬ'],
  ['ぬ', 'め', 'ね', 'れ', 'わ'],
  ['い', 'り', 'こ', 'に'],
  ['き', 'さ', 'ち', 'ら'],
  ['は', 'ほ', 'け', 'に'],
  ['る', 'ろ', 'そ'],
  ['う', 'ら', 'つ'],
  ['ゆ', 'よ'],
  ['た', 'な', 'に'],
  ['ま', 'も', 'し'],
  ['く', 'へ', 'て', 'し'],
  ['す', 'お', 'む'],
  ['ゃ', 'ゅ', 'ょ'],

  // Katakana
  ['シ', 'ツ', 'ン', 'ソ', 'ノ', 'リ'],
  ['ク', 'ケ', 'タ', 'ワ', 'ウ', 'フ'],
  ['コ', 'ユ', 'ロ', 'ヨ', 'エ'],
  ['チ', 'テ', 'ナ', 'ト'],
  ['ナ', 'メ', 'ヌ', 'ス', 'ネ'],
  ['フ', 'ヌ', 'ラ', 'ヲ', 'ワ', 'ス'],
  ['マ', 'ム', 'ア', 'ヤ'],
  ['ル', 'レ', 'ハ'],
  ['オ', 'ホ', 'キ', 'モ', 'ヲ'],
  ['セ', 'ヤ', 'サ', 'ヒ'],
  ['カ', 'ヤ', 'セ', 'ク'],
  ['イ', 'ト', 'ヒ', 'ニ'],
  ['ャ', 'ュ', 'ョ'],
  ['ァ', 'ィ', 'ゥ', 'ェ', 'ォ'],
]
