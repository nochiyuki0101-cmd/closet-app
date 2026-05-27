import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Linking, Modal,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { fetchClothAnalysis } from "../lib/api";
import { BRAND, CATS, SEASONS } from "../lib/constants";
import type { ClothItem } from "../lib/db";
import { addCloth, deleteCloth, uploadClothImage } from "../lib/db";
import type { T } from "../lib/i18n";
import { useLang } from "../lib/i18n";

async function requestAndPick(
  cam: boolean,
  t: T,
): Promise<{ uri: string; base64: string; mimeType: string } | null> {
  const { status, canAskAgain } = cam
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      cam ? t.cameraPermTitle : t.albumPermTitle,
      cam ? t.cameraPermMsg : t.albumPermMsg,
      canAskAgain
        ? [{ text: 'OK' }]
        : [{ text: t.cancel, style: 'cancel' }, { text: t.openSettings, onPress: () => Linking.openSettings() }],
    );
    return null;
  }

  const opts = { allowsEditing: true, aspect: [3, 4] as [number, number], quality: 0.7, base64: true };
  const r = cam
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync(opts);

  if (r.canceled) return null;
  const asset = r.assets[0];
  return { uri: asset.uri, base64: asset.base64 ?? '', mimeType: asset.mimeType ?? 'image/jpeg' };
}

export function ClosetScreen({ clothes, uid }: { clothes: ClothItem[]; uid: string }) {
  const { t, lang } = useLang();
  const [cat, setCat] = useState(CATS[0]);
  const [modal, setModal] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nc, setNc] = useState(CATS[1]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('オールシーズン');
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<ClothItem | null>(null);
  const uploadPromiseRef = useRef<Promise<string | null>>(Promise.resolve(null));

  const list = cat === CATS[0] ? clothes : clothes.filter(c => c.cat === cat);

  const resetNameModal = () => {
    setNameModal(false);
    setName("");
    setImg(null);
    setAiSuggestions([]);
    setSuggestionsLoading(false);
    setColor('');
    setSeason('オールシーズン');
    uploadPromiseRef.current = Promise.resolve(null);
  };

  const handleDelete = () => {
    if (!detailItem) return;
    Alert.alert(
      t.deleteConfirmTitle,
      t.deleteConfirmMsg(detailItem.name),
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.deleteItem, style: "destructive", onPress: () => {
            setDetailItem(null);
            deleteCloth(uid, detailItem.id).catch(() => Alert.alert(t.errorTitle, t.deleteError));
          },
        },
      ],
    );
  };

  const pick = (cam: boolean) => {
    setModal(false);
    setTimeout(() => {
      requestAndPick(cam, t)
        .then(result => {
          if (!result) return;
          setImg(result.uri);
          setAiSuggestions([]);
          setColor('');
          setSeason('オールシーズン');
          setSuggestionsLoading(true);
          setNameModal(true);
          uploadPromiseRef.current = uploadClothImage(uid, result.base64, result.mimeType).catch(() => null);
          fetchClothAnalysis(result.base64, result.mimeType, lang)
            .then(analysis => {
              setAiSuggestions(analysis.names);
              setNc(analysis.cat);
              setColor(analysis.color);
              setSeason(analysis.season);
            })
            .catch(() => {})
            .finally(() => setSuggestionsLoading(false));
        })
        .catch(e => Alert.alert(t.errorTitle, e instanceof Error ? e.message : String(e)));
    }, 300);
  };

  const save = async () => {
    if (!name) { Alert.alert(t.chooseName); return; }
    setSaving(true);
    try {
      const persistentUrl = await uploadPromiseRef.current;
      await addCloth(uid, { name, cat: nc, bg: "#E8E8E8", icon: "👗", last: t.noWorn, image: persistentUrl || img, color, season });
      resetNameModal();
    } catch {
      Alert.alert(t.errorTitle, t.deleteError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAF7" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hdr}>
          <View>
            <Text style={s.hdrSub}>{t.closetSub}</Text>
            <Text style={s.hdrTitle}>{t.closetTitle}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
            <Text style={{ color: "#fff", fontSize: 26 }}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 16 }}>
          {CATS.map(c => (
            <TouchableOpacity key={c} style={[s.chip, cat === c && s.chipOn]} onPress={() => setCat(c)}>
              <Text style={[s.chipTxt, cat === c && s.chipTxtOn]}>{t.catLabels[c] ?? c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.grid}>
          {list.map(cl => (
            <TouchableOpacity key={cl.id} style={s.card} onPress={() => setDetailItem(cl)}>
              {cl.image
                ? <Image source={{ uri: cl.image }} style={s.cardImg} />
                : <View style={[s.cardImg, { backgroundColor: cl.bg }]}><Text style={{ fontSize: 36 }}>{cl.icon}</Text></View>
              }
              <Text style={s.cardName}>{cl.name}</Text>
              <Text style={s.cardSub}>{cl.last}</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>{t.catLabels[cl.cat] ?? cl.cat}</Text></View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 追加方法選択モーダル */}
      <Modal visible={modal} transparent animationType="none">
        <TouchableOpacity style={s.overlay} onPress={() => setModal(false)}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{t.addCloth}</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity style={s.sheetOpt} onPress={() => pick(true)}>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={s.sheetOptTxt}>{t.takePhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOpt} onPress={() => pick(false)}>
                <Text style={{ fontSize: 32 }}>🖼️</Text>
                <Text style={s.sheetOptTxt}>{t.fromAlbum}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={() => setModal(false)}>
              <Text style={s.primaryBtnTxt}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 服の情報入力モーダル */}
      <Modal visible={nameModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "88%" }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{t.enterInfo}</Text>
            {img && <Image source={{ uri: img }} style={s.previewImg} />}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>{t.chooseName}</Text>
              <TextInput
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={t.chooseName}
                placeholderTextColor="#BBB"
                maxLength={30}
                returnKeyType="done"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {suggestionsLoading
                  ? <ActivityIndicator color={BRAND} style={{ marginVertical: 6, marginLeft: 4 }} />
                  : (aiSuggestions.length > 0 ? aiSuggestions : t.nameSuggestions).map(n => (
                    <TouchableOpacity key={n} style={[s.chip, name === n && s.chipOn]} onPress={() => setName(n)}>
                      <Text style={[s.chipTxt, name === n && s.chipTxtOn]}>{n}</Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>

              <Text style={s.inputLabel}>{t.categoryLabel}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {CATS.slice(1).map(c => (
                  <TouchableOpacity key={c} style={[s.chip, nc === c && s.chipOn]} onPress={() => setNc(c)}>
                    <Text style={[s.chipTxt, nc === c && s.chipTxtOn]}>{t.catLabels[c] ?? c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.inputLabel}>{t.colorLabel}</Text>
              <TextInput
                style={s.nameInput}
                value={color}
                onChangeText={setColor}
                placeholder={t.colorPlaceholder}
                placeholderTextColor="#BBB"
                maxLength={20}
                returnKeyType="done"
              />

              <Text style={s.inputLabel}>{t.seasonLabel}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {SEASONS.map(sv => (
                  <TouchableOpacity key={sv} style={[s.chip, season === sv && s.chipOn]} onPress={() => setSeason(sv)}>
                    <Text style={[s.chipTxt, season === sv && s.chipTxtOn]}>{t.seasonLabels[sv] ?? sv}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[s.primaryBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>{t.register}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: "center" }} onPress={resetNameModal}>
              <Text style={{ color: "#999", fontSize: 14 }}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 詳細モーダル */}
      <Modal visible={!!detailItem} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "88%" }]}>
            <View style={s.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailItem?.image
                ? <Image source={{ uri: detailItem.image }} style={s.detailImg} />
                : <View style={[s.detailIcon, { backgroundColor: detailItem?.bg }]}>
                  <Text style={{ fontSize: 72 }}>{detailItem?.icon}</Text>
                </View>
              }
              <Text style={s.detailName}>{detailItem?.name}</Text>
              <View style={s.detailInfoBox}>
                <View style={s.detailRow}>
                  <Text style={s.detailRowLabel}>{t.categoryLabel}</Text>
                  <Text style={s.detailRowValue}>{t.catLabels[detailItem?.cat ?? ''] ?? detailItem?.cat}</Text>
                </View>
                {detailItem?.color ? (
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>{t.colorLabel}</Text>
                    <Text style={s.detailRowValue}>{detailItem.color}</Text>
                  </View>
                ) : null}
                {detailItem?.season ? (
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>{t.seasonLabel}</Text>
                    <Text style={s.detailRowValue}>{t.seasonLabels[detailItem.season] ?? detailItem.season}</Text>
                  </View>
                ) : null}
                <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailRowLabel}>{t.lastWorn}</Text>
                  <Text style={s.detailRowValue}>{detailItem?.last}</Text>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteTxt}>{t.deleteItem}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: "center" }} onPress={() => setDetailItem(null)}>
              <Text style={{ color: "#999", fontSize: 14 }}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 20, paddingBottom: 12 },
  hdrSub: { fontSize: 11, color: "#999", letterSpacing: 1, marginBottom: 4 },
  hdrTitle: { fontSize: 28, fontWeight: "400", color: "#1a1a1a", letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: "#E0E0D8", backgroundColor: "#fff", marginRight: 8 },
  chipOn: { backgroundColor: BRAND, borderColor: BRAND },
  chipTxt: { fontSize: 12, color: "#666" },
  chipTxtOn: { color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 },
  card: { width: "47%", backgroundColor: "#fff", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E8E8E0" },
  cardImg: { width: "100%", aspectRatio: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10, resizeMode: "cover" },
  cardName: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  cardSub: { fontSize: 10, color: "#999", marginTop: 2 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#F0EDE8", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, color: "#888" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FAFAF7", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 48 },
  handle: { width: 40, height: 4, backgroundColor: "#DDD", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 20 },
  sheetOpt: { flex: 1, padding: 16, borderWidth: 1.5, borderColor: "#E8E8E0", borderRadius: 16, alignItems: "center", gap: 6, backgroundColor: "#fff" },
  sheetOptTxt: { fontSize: 12, color: "#333", textAlign: "center", marginTop: 4 },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 20, padding: 16, alignItems: "center" },
  primaryBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  previewImg: { width: "100%", aspectRatio: 1, borderRadius: 16, marginBottom: 16, resizeMode: "cover" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", marginBottom: 8 },
  nameInput: { borderWidth: 1.5, borderColor: "#E0E0D8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", backgroundColor: "#fff", marginBottom: 12 },
  detailImg: { width: "100%", aspectRatio: 1, borderRadius: 20, marginBottom: 16, resizeMode: "cover" },
  detailIcon: { width: "100%", aspectRatio: 1, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  detailName: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
  detailInfoBox: { backgroundColor: "#F5F4F0", borderRadius: 16, marginBottom: 24, overflow: "hidden" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#EBEBE6" },
  detailRowLabel: { fontSize: 13, color: "#999" },
  detailRowValue: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", flexShrink: 1, textAlign: "right", marginLeft: 16 },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 20, padding: 16, alignItems: "center" },
  deleteTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
