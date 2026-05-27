import { Timestamp, addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';

export async function uploadClothImage(uid: string, base64: string, mimeType: string): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg';
  const imageRef = ref(storage, `users/${uid}/clothes/${Date.now()}.${ext}`);
  await uploadString(imageRef, base64, 'base64', { contentType: mimeType });
  return getDownloadURL(imageRef);
}

export type ClothItem = {
  id: string;
  name: string;
  cat: string;
  bg: string;
  icon: string;
  last: string;
  image: string | null;
  color?: string;
  season?: string;
};

function clothesCol(uid: string) {
  return collection(db, 'users', uid, 'clothes');
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

export async function deleteCloth(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(clothesCol(uid), id));
}
