import { Timestamp, addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type ClothItem = {
  id: string;
  name: string;
  cat: string;
  bg: string;
  icon: string;
  last: string;
  image: string | null;
};

export type WearRecord = {
  id: string;
  date: string;
  ids: string[];
  tpo: string;
};

function formatLast(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return '今日';
  if (diff === 1) return '昨日';
  if (diff < 7) return `${diff}日前`;
  if (diff < 14) return '1週間前';
  if (diff < 30) return `${Math.floor(diff / 7)}週間前`;
  return `${Math.floor(diff / 30)}ヶ月前`;
}

function clothesCol(uid: string) {
  return collection(db, 'users', uid, 'clothes');
}

function historyCol(uid: string) {
  return collection(db, 'users', uid, 'wearHistory');
}

export function subscribeToClothes(uid: string, cb: (items: ClothItem[]) => void): () => void {
  return onSnapshot(
    clothesCol(uid),
    snap => { cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClothItem))); },
    () => {}
  );
}

export async function addCloth(uid: string, item: Omit<ClothItem, 'id'>): Promise<void> {
  await addDoc(clothesCol(uid), { ...item, createdAt: Timestamp.now() });
}

export function subscribeToWearHistory(uid: string, cb: (records: WearRecord[]) => void): () => void {
  const q = query(historyCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as WearRecord))); },
    () => {}
  );
}

export async function deleteCloth(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(clothesCol(uid), id));
}

export async function addWearRecord(uid: string, record: Omit<WearRecord, 'id'>): Promise<void> {
  await addDoc(historyCol(uid), { ...record, createdAt: Timestamp.now() });
  await Promise.all(
    record.ids.map(id => updateDoc(doc(clothesCol(uid), id), { last: formatLast(record.date) }))
  );
}

export async function deleteWearRecord(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(historyCol(uid), id));
}

export async function updateWearRecord(uid: string, id: string, record: Omit<WearRecord, 'id'>): Promise<void> {
  await updateDoc(doc(historyCol(uid), id), { ids: record.ids, tpo: record.tpo, date: record.date });
  await Promise.all(
    record.ids.map(rid => updateDoc(doc(clothesCol(uid), rid), { last: formatLast(record.date) }))
  );
}
