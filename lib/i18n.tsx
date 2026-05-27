import React, { createContext, useContext, useState } from 'react';

export type Lang = 'ja' | 'en';

function detectLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'ja';
  }
}

const ja = {
  tabCloset: 'クローゼット',
  tabSuggest: 'コーデ提案',
  tabSettings: '設定',
  closetSub: 'MY CLOSET',
  closetTitle: 'クローゼット',
  addCloth: '服を追加',
  takePhoto: '写真を撮る',
  fromAlbum: 'アルバムから',
  cancel: 'キャンセル',
  enterInfo: '服の情報を入力',
  chooseName: '名前を入力してください',
  categoryLabel: 'カテゴリ',
  register: '登録する',
  lastWorn: '最終着用',
  deleteItem: '削除する',
  deleteConfirmTitle: '削除の確認',
  deleteConfirmMsg: (name: string) => `「${name}」を削除しますか？`,
  close: '閉じる',
  noWorn: 'まだ着用なし',
  nameSuggestions: ['白シャツ','黒スキニー','コート','ニット','スカート','ドレス','ジーンズ','スニーカー','バッグ'],
  catLabels: {
    'すべて':'すべて','トップス':'トップス','ジャケット/アウター':'ジャケット/アウター',
    'パンツ':'パンツ','オールインワン':'オールインワン','スカート':'スカート',
    'ワンピース/ドレス':'ワンピース/ドレス','バッグ':'バッグ','シューズ':'シューズ',
    'ファッション雑貨':'ファッション雑貨',
  } as Record<string,string>,
  tpoLabels: {
    'すべて':'すべて','仕事':'仕事','デート':'デート','カジュアル':'カジュアル',
  } as Record<string,string>,
  todayPickSub: "TODAY'S PICK",
  suggestTitle: 'コーデ提案',
  weatherLoading: '天気を取得中...',
  weatherError: '天気情報を取得できませんでした',
  regenBtn: '✨ AIで再提案する',
  generateBtn: '✨ AIでコーデを提案する',
  suggestPrompt: 'ボタンを押してAIにコーデを提案してもらいましょう',
  suggestError: 'コーデの取得に失敗しました',
  settingsSub: 'SETTINGS',
  settingsTitle: '設定',
  userName: 'ユーザー名',
  suggestSettings: '提案の設定',
  weatherSync: '天気連動',
  weatherSyncSub: '気温に合わせる',
  considerHistory: '履歴を考慮',
  considerHistorySub: '最近着た服は除外',
  morningNotif: '朝の通知',
  morningNotifSub: '毎朝7時に通知',
  languageLabel: '言語',
  colorLabel: '色',
  colorPlaceholder: '例：白、ネイビー、ベージュ',
  seasonLabel: '季節',
  seasonLabels: {
    '春':'春','夏':'夏','秋':'秋','冬':'冬','オールシーズン':'オールシーズン',
  } as Record<string,string>,
  cameraPermTitle: 'カメラへのアクセスが必要です',
  cameraPermMsg: '服の写真を撮るにはカメラへのアクセスを許可してください',
  albumPermTitle: 'アルバムへのアクセスが必要です',
  albumPermMsg: '服の写真を選ぶにはフォトライブラリへのアクセスを許可してください',
  openSettings: '設定を開く',
  errorTitle: 'エラー',
  deleteError: '削除に失敗しました',
  editRecord: '記録を編集',
  saveChanges: '変更を保存',
  signOut: 'サインアウト',
  shareMyCloset: 'クローゼットをシェア',
  signInWithGoogle: 'Googleでサインイン',
  signInWithApple: 'Appleでサインイン',
  loginTitle: 'My Closet',
  loginSubtitle: 'あなたのファッションを\nスマートに管理しよう',
  sharedClosetTitle: 'シェアされたクローゼット',
  aiLang: 'ja' as const,
};

const en: typeof ja = {
  tabCloset: 'Closet',
  tabSuggest: 'Outfits',
  tabSettings: 'Settings',
  closetSub: 'MY CLOSET',
  closetTitle: 'Closet',
  addCloth: 'Add Item',
  takePhoto: 'Take Photo',
  fromAlbum: 'From Album',
  cancel: 'Cancel',
  enterInfo: 'Item Details',
  chooseName: 'Enter a name',
  categoryLabel: 'Category',
  register: 'Save',
  lastWorn: 'Last worn',
  deleteItem: 'Delete',
  deleteConfirmTitle: 'Delete Item',
  deleteConfirmMsg: (name: string) => `Delete "${name}"?`,
  close: 'Close',
  noWorn: 'Never worn',
  nameSuggestions: ['White Shirt','Black Pants','Coat','Knit','Skirt','Dress','Jeans','Sneakers','Bag'],
  catLabels: {
    'すべて':'All','トップス':'Tops','ジャケット/アウター':'Jacket/Outer',
    'パンツ':'Pants','オールインワン':'All-in-One','スカート':'Skirt',
    'ワンピース/ドレス':'Dress','バッグ':'Bag','シューズ':'Shoes',
    'ファッション雑貨':'Accessories',
  },
  tpoLabels: {
    'すべて':'All','仕事':'Work','デート':'Date','カジュアル':'Casual',
  },
  todayPickSub: "TODAY'S PICK",
  suggestTitle: 'Outfit Suggest',
  weatherLoading: 'Loading weather...',
  weatherError: 'Weather unavailable',
  regenBtn: '✨ Regenerate with AI',
  generateBtn: '✨ Generate Outfits with AI',
  suggestPrompt: 'Tap the button below to get AI outfit suggestions',
  suggestError: 'Failed to fetch outfits',
  settingsSub: 'SETTINGS',
  settingsTitle: 'Settings',
  userName: 'Username',
  suggestSettings: 'Suggestion Settings',
  weatherSync: 'Weather Sync',
  weatherSyncSub: 'Match with temperature',
  considerHistory: 'Consider History',
  considerHistorySub: 'Exclude recently worn',
  morningNotif: 'Morning Notification',
  morningNotifSub: 'Daily at 7am',
  languageLabel: 'Language',
  colorLabel: 'Color',
  colorPlaceholder: 'e.g. White, Navy, Beige',
  seasonLabel: 'Season',
  seasonLabels: {
    '春':'Spring','夏':'Summer','秋':'Autumn','冬':'Winter','オールシーズン':'All Season',
  } as Record<string,string>,
  cameraPermTitle: 'Camera Access Required',
  cameraPermMsg: 'Please allow camera access to take photos of your clothes.',
  albumPermTitle: 'Photo Library Access Required',
  albumPermMsg: 'Please allow photo library access to select photos.',
  openSettings: 'Open Settings',
  errorTitle: 'Error',
  deleteError: 'Failed to delete item',
  today: 'Today',
  yesterday: 'Yesterday',
  editRecord: 'Edit Record',
  saveChanges: 'Save Changes',
  signOut: 'Sign Out',
  shareMyCloset: 'Share My Closet',
  signInWithGoogle: 'Sign in with Google',
  signInWithApple: 'Sign in with Apple',
  loginTitle: 'My Closet',
  loginSubtitle: 'Manage your fashion\nsmart and simple',
  sharedClosetTitle: 'Shared Closet',
  aiLang: 'en' as const,
};

export const translations = { ja, en };
export type T = typeof ja;

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: T };
const LangContext = createContext<LangCtx>({ lang: 'ja', setLang: () => {}, t: ja });
export const useLang = () => useContext(LangContext);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}
