import type { Script } from '@/data/kana'

/** Écriture d'une phrase : tout hiragana, tout katakana, ou mélange naturel. */
export type SentenceScript = Script | 'mixed'

export interface Sentence {
  /** Le texte, qui sert aussi d'id stable. */
  id: string
  /** Mots séparés par des espaces ; particules は / へ / を isolées (lues wa / e / o). */
  text: string
  /** Sens en français. */
  meaning: string
  script: SentenceScript
  /** Série d'anime d'où vient la réplique (absent pour les phrases d'exemple). */
  series?: AnimeSeries
  /** Réplique originale (avec kanji et ponctuation), montrée après la réponse. */
  original?: string
  /** Scène de la réplique. */
  scene?: string
}

export type AnimeSeries = 'dragonball'

// Phrases simples (niveau débutant), sans kanji ni ponctuation. Les phrases tout
// en hiragana existent aussi converties en katakana ; celles qui contiennent des
// mots empruntés (katakana) forment la série « mixte ».
const RAW: [text: string, meaning: string][] = [
  // Tout en hiragana
  ['わたし は がくせい です', 'Je suis étudiant.'],
  ['これ は ほん です', 'Ceci est un livre.'],
  ['それ は なん です か', "Qu'est-ce que c'est ?"],
  ['あれ は やま です', 'Là-bas, c’est une montagne.'],
  ['ねこ が すき です', "J'aime les chats."],
  ['いぬ は かわいい です', 'Le chien est mignon.'],
  ['きょう は さむい です', "Il fait froid aujourd'hui."],
  ['あした は あめ です', 'Demain, il pleuvra.'],
  ['みず を のみます', "Je bois de l'eau."],
  ['ごはん を たべます', 'Je mange (du riz).'],
  ['まいにち にほんご を べんきょう します', "J'étudie le japonais tous les jours."],
  ['がっこう へ いきます', "Je vais à l'école."],
  ['うち へ かえります', 'Je rentre à la maison.'],
  ['えき は どこ です か', 'Où est la gare ?'],
  ['いま なんじ です か', 'Quelle heure est-il ?'],
  ['おなまえ は なん です か', 'Comment vous appelez-vous ?'],
  ['わたし の なまえ は ゆき です', "Je m'appelle Yuki."],
  ['ともだち と あそびます', 'Je joue avec des amis.'],
  ['こうえん で さんぽ します', 'Je me promène dans le parc.'],
  ['ほん を よみます', 'Je lis un livre.'],
  ['てがみ を かきます', "J'écris une lettre."],
  ['おんがく を ききます', "J'écoute de la musique."],
  ['にほん は きれい な くに です', 'Le Japon est un beau pays.'],
  ['この りんご は おいしい です', 'Cette pomme est délicieuse.'],
  ['その かばん は たかい です', 'Ce sac est cher.'],
  ['あの ひと は だれ です か', 'Qui est cette personne ?'],
  ['へや に ねこ が います', 'Il y a un chat dans la chambre.'],
  ['つくえ の うえ に ほん が あります', 'Il y a un livre sur le bureau.'],
  ['はな が きれい です ね', "Les fleurs sont jolies, n'est-ce pas ?"],
  ['そら が あおい です', 'Le ciel est bleu.'],
  ['やま に のぼります', 'Je gravis la montagne.'],
  ['うみ で およぎます', 'Je nage dans la mer.'],
  ['でんしゃ で いきます', "J'y vais en train."],
  ['くるま が ほしい です', 'Je voudrais une voiture.'],
  ['おちゃ を ください', "Du thé, s'il vous plaît."],
  ['すこし まって ください', "Attendez un peu, s'il vous plaît."],
  ['もう いちど おねがい します', "Encore une fois, s'il vous plaît."],
  ['わかりません', 'Je ne comprends pas.'],
  ['ありがとう ございます', 'Merci beaucoup.'],
  ['おはよう ございます', 'Bonjour (le matin).'],
  ['どうぞ よろしく おねがい します', 'Enchanté, je compte sur vous.'],
  ['はじめまして', 'Enchanté (première rencontre).'],
  ['げんき です か', 'Comment allez-vous ?'],
  ['はい げんき です', 'Oui, je vais bien.'],
  ['いいえ ちがいます', "Non, ce n'est pas ça."],
  ['あさ ろくじ に おきます', 'Je me lève à six heures du matin.'],
  ['よる じゅうじ に ねます', 'Je me couche à dix heures du soir.'],
  ['しゅうまつ は なに を します か', 'Que faites-vous le week-end ?'],
  ['にちようび に えいが を みます', 'Je regarde un film dimanche.'],
  ['かぞく は よにん です', 'Nous sommes quatre dans ma famille.'],
  ['あに が ひとり います', "J'ai un grand frère."],
  ['いもうと は じゅっさい です', 'Ma petite sœur a dix ans.'],
  ['ちち は いしゃ です', 'Mon père est médecin.'],
  ['はは は りょうり が じょうず です', 'Ma mère cuisine bien.'],
  ['この みち を まっすぐ いきます', 'Je vais tout droit sur cette route.'],
  ['みぎ に まがって ください', "Tournez à droite, s'il vous plaît."],
  ['びょういん は となり です', "L'hôpital est à côté."],
  ['なつ は あつい です', "L'été, il fait chaud."],
  ['ふゆ に ゆき が ふります', 'Il neige en hiver.'],
  ['はる に さくら が さきます', 'Les cerisiers fleurissent au printemps.'],
  ['きのう は いそがしかった です', "Hier, j'étais occupé."],
  ['あたま が いたい です', "J'ai mal à la tête."],
  ['くすり を のんで ください', "Prenez le médicament, s'il vous plaît."],
  ['おなか が すきました', "J'ai faim."],
  ['のど が かわきました', "J'ai soif."],
  ['ねむい です', "J'ai sommeil."],
  ['にほんご は むずかしい です か', 'Le japonais, est-ce difficile ?'],
  ['いいえ たのしい です', "Non, c'est amusant."],
  ['ひらがな を おぼえました', "J'ai appris les hiragana."],
  ['かたかな も べんきょう します', "J'étudie aussi les katakana."],
  ['えんぴつ で かいて ください', "Écrivez au crayon, s'il vous plaît."],
  ['まど を あけて ください', "Ouvrez la fenêtre, s'il vous plaît."],
  ['でんき を けして ください', "Éteignez la lumière, s'il vous plaît."],
  ['いっしょ に たべましょう', 'Mangeons ensemble.'],
  ['どこ へ いきます か', 'Où allez-vous ?'],
  ['とうきょう へ いきたい です', 'Je veux aller à Tokyo.'],
  ['きょうと で おてら を みました', "J'ai vu des temples à Kyoto."],
  ['おんせん に はいりたい です', 'Je veux aller aux sources chaudes.'],
  ['ふじさん は たかい やま です', 'Le mont Fuji est une haute montagne.'],
  ['いくら です か', "C'est combien ?"],
  ['これ を ください', 'Je prends ceci.'],
  ['しずか に して ください', "Silence, s'il vous plaît."],
  ['ゆっくり はなして ください', "Parlez lentement, s'il vous plaît."],
  ['また あした', 'À demain.'],
  ['おやすみ なさい', 'Bonne nuit.'],
  ['ごちそうさま でした', 'Merci pour ce repas.'],
  ['とり が そら を とんで います', 'Un oiseau vole dans le ciel.'],
  ['こども が こうえん で あそんで います', 'Des enfants jouent au parc.'],
  ['さかな が かわ で およいで います', 'Des poissons nagent dans la rivière.'],
  ['あめ が ふって います', 'Il pleut.'],
  ['かぜ が つよい です', 'Le vent est fort.'],
  ['ねこ を にひき かって います', "J'ai deux chats."],
  ['らいねん にほん へ いきます', "L'an prochain, j'irai au Japon."],
  ['しけん は らいしゅう です', "L'examen est la semaine prochaine."],
  ['しゅくだい を わすれました', "J'ai oublié mes devoirs."],
  ['せんせい に しつもん します', 'Je pose une question au professeur.'],
  ['としょかん で ほん を かりました', "J'ai emprunté un livre à la bibliothèque."],
  ['えき まで あるきます', "Je marche jusqu'à la gare."],
  ['あの みせ は やすい です', 'Ce magasin est bon marché.'],
  ['おかね が ありません', "Je n'ai pas d'argent."],
  ['にわ に はな が たくさん あります', 'Il y a beaucoup de fleurs dans le jardin.'],
  ['うた を うたいましょう', 'Chantons une chanson.'],
  ['おとうと は やきゅう が すき です', 'Mon petit frère aime le baseball.'],

  // Mixte : mots empruntés en katakana
  ['わたし は コーヒー が すき です', "J'aime le café."],
  ['まいあさ パン を たべます', 'Je mange du pain tous les matins.'],
  ['テレビ を みます', 'Je regarde la télévision.'],
  ['レストラン で ばんごはん を たべます', 'Je dîne au restaurant.'],
  ['スーパー で やさい を かいます', "J'achète des légumes au supermarché."],
  ['コンビニ は どこ です か', 'Où est la supérette ?'],
  ['ホテル に とまります', "Je loge à l'hôtel."],
  ['バス で がっこう へ いきます', "Je vais à l'école en bus."],
  ['タクシー を よんで ください', "Appelez un taxi, s'il vous plaît."],
  ['パソコン で メール を かきます', "J'écris un e-mail sur l'ordinateur."],
  ['スマホ を わすれました', "J'ai oublié mon smartphone."],
  ['アイス が たべたい です', "J'ai envie d'une glace."],
  ['ジュース を ください', "Un jus, s'il vous plaît."],
  ['ケーキ は あまい です', 'Le gâteau est sucré.'],
  ['この シャツ は いくら です か', 'Combien coûte cette chemise ?'],
  ['あたらしい くつ と ズボン を かいました', "J'ai acheté des chaussures et un pantalon neufs."],
  ['ピアノ を ひきます', 'Je joue du piano.'],
  ['ギター が じょうず です ね', 'Tu joues bien de la guitare.'],
  ['サッカー を します', 'Je joue au football.'],
  ['テニス は たのしい です', "Le tennis, c'est amusant."],
  ['フランス から きました', 'Je viens de France.'],
  ['パリ に すんで います', "J'habite à Paris."],
  ['ワイン と チーズ が すき です', "J'aime le vin et le fromage."],
  ['カレー は からい です', 'Le curry est épicé.'],
  ['ラーメン を たべに いきましょう', 'Allons manger des ramen.'],
  ['アニメ を みる の が すき です', "J'aime regarder des anime."],
  ['マンガ を よみます', 'Je lis des mangas.'],
  ['ゲーム を して います', 'Je joue à un jeu vidéo.'],
  ['トイレ は どこ です か', 'Où sont les toilettes ?'],
  ['カメラ で しゃしん を とります', "Je prends des photos avec l'appareil."],
  ['ノート に なまえ を かいて ください', "Écrivez votre nom sur le cahier, s'il vous plaît."],
  ['テスト は むずかしかった です', 'Le contrôle était difficile.'],
  ['プール で およぎます', 'Je nage à la piscine.'],
  ['デパート で プレゼント を かいました', "J'ai acheté un cadeau au grand magasin."],
  ['パーティー は なんじ から です か', 'À quelle heure commence la fête ?'],
  ['ホテル の へや は ひろい です', "La chambre d'hôtel est spacieuse."],
  ['チケット を にまい ください', "Deux billets, s'il vous plaît."],
  ['パスポート を みせて ください', "Montrez votre passeport, s'il vous plaît."],
  ['コーヒー に ミルク を いれます', 'Je mets du lait dans mon café.'],
  ['ドア を しめて ください', "Fermez la porte, s'il vous plaît."],
  ['ベッド で ねます', 'Je dors dans un lit.'],
  ['エアコン を つけて ください', "Allumez la climatisation, s'il vous plaît."],
  ['ニュース を ききました か', 'Avez-vous écouté les informations ?'],
  ['メニュー を ください', "La carte, s'il vous plaît."],
  ['デザート は ケーキ に します', 'Comme dessert, je prends un gâteau.'],
  ['バナナ と りんご を かいます', "J'achète des bananes et des pommes."],
  ['カフェ で ともだち に あいます', 'Je retrouve un ami au café.'],
  ['ジム に いきます', 'Je vais à la salle de sport.'],
  ['ダンス を ならって います', "J'apprends la danse."],
  ['エレベーター は どこ です か', "Où est l'ascenseur ?"],
]

const HIRAGANA_START = 0x3041
const HIRAGANA_END = 0x3096
const KATAKANA_OFFSET = 0x60

/** Hiragana → katakana, caractère par caractère (le reste est inchangé). */
export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + KATAKANA_OFFSET))
}

const hasKatakana = (text: string) => /[ァ-ヺ]/.test(text)
const hasHiragana = (text: string) =>
  [...text].some((c) => c.charCodeAt(0) >= HIRAGANA_START && c.charCodeAt(0) <= HIRAGANA_END)

/** Écriture d'un texte : mélange si hiragana et katakana s'y côtoient. */
export function scriptOf(text: string): SentenceScript {
  if (hasKatakana(text) && hasHiragana(text)) return 'mixed'
  return hasKatakana(text) ? 'katakana' : 'hiragana'
}

export const SENTENCES: readonly Sentence[] = RAW.flatMap(([text, meaning]): Sentence[] => {
  if (hasKatakana(text) && hasHiragana(text)) return [{ id: text, text, meaning, script: 'mixed' }]
  const katakana = toKatakana(text)
  return [
    { id: text, text, meaning, script: 'hiragana' },
    { id: katakana, text: katakana, meaning, script: 'katakana' },
  ]
})
