export const BRAND = "#1a0a2e";

export const CATS = [
  "すべて", "トップス", "ジャケット/アウター", "パンツ",
  "オールインワン", "スカート", "ワンピース/ドレス",
  "バッグ", "シューズ", "ファッション雑貨",
];

export const TPOS = ["すべて", "仕事", "デート", "カジュアル"];
export const SEASONS = ["春", "夏", "秋", "冬", "オールシーズン"];

export const SEED_CLOTHES = [
  { name: "白シャツ",     cat: "トップス",           bg: "#F5F5F0", icon: "👔", last: "2日前",    image: null },
  { name: "黒スキニー",   cat: "パンツ",             bg: "#222",    icon: "👖", last: "1週間前",   image: null },
  { name: "コート",       cat: "ジャケット/アウター", bg: "#C9B99A", icon: "🧥", last: "2週間前",   image: null },
  { name: "ネイビーニット", cat: "トップス",           bg: "#1B2A4A", icon: "🧶", last: "3日前",    image: null },
  { name: "スカート",     cat: "スカート",           bg: "#8B6B6B", icon: "👗", last: "1ヶ月前",   image: null },
  { name: "スニーカー",   cat: "シューズ",           bg: "#EFEFEF", icon: "👟", last: "昨日",      image: null },
];

export type CoordItem = {
  id: string;
  tpo: string;
  weather: string;
  ids: string[];
  comment: string;
  score: number;
};

export type SettingKey = 'weatherSync' | 'considerHistory' | 'morningNotif';
