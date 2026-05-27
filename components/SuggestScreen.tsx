import { useState } from "react";
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { fetchSuggestedCoords } from "../lib/api";
import { BRAND, TPOS } from "../lib/constants";
import type { CoordItem } from "../lib/constants";
import type { ClothItem } from "../lib/db";
import { useLang } from "../lib/i18n";
import type { WeatherInfo } from "../lib/weather";

export function SuggestScreen({
  clothes,
  clothesMap,
  weather,
  weatherLoading,
}: {
  clothes: ClothItem[];
  clothesMap: Map<string, ClothItem>;
  weather: WeatherInfo | null;
  weatherLoading: boolean;
}) {
  const { lang, t } = useLang();
  const [tpo, setTpo] = useState(TPOS[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [coords, setCoords] = useState<CoordItem[]>([]);
  const [loading, setLoading] = useState(false);

  const regen = async () => {
    setLoading(true);
    try {
      const next = await fetchSuggestedCoords(clothes, tpo, weather, lang);
      setCoords(next);
    } catch {
      Alert.alert(t.errorTitle, t.suggestError);
    } finally {
      setLoading(false);
    }
  };

  const weatherLabel = weather ? (lang === 'en' ? weather.labelEn : weather.label) : '';
  const weatherStr = weatherLoading
    ? t.weatherLoading
    : weather
      ? `${weather.emoji} ${weather.city} ${weather.temp}°C・${weatherLabel}`
      : t.weatherError;

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAF7" }}>
      <View style={s.darkHdr}>
        <Text style={s.darkSub}>{t.todayPickSub}</Text>
        <Text style={s.darkTitle}>{t.suggestTitle}</Text>
        <Text style={s.darkWeather}>{weatherStr}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {TPOS.map(tp => (
            <TouchableOpacity key={tp} style={[s.tpoChip, tpo === tp && s.tpoChipOn]} onPress={() => setTpo(tp)}>
              <Text style={[s.tpoTxt, tpo === tp && s.tpoTxtOn]}>{t.tpoLabels[tp] ?? tp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {coords.length === 0 && !loading && (
          <View style={{ alignItems: "center", marginTop: 40, marginBottom: 24 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✨</Text>
            <Text style={{ fontSize: 15, color: "#999", textAlign: "center", lineHeight: 22 }}>{t.suggestPrompt}</Text>
          </View>
        )}

        {coords.map(co => (
          <TouchableOpacity
            key={co.id}
            style={[s.coCard, open === co.id && s.coCardOn]}
            onPress={() => setOpen(open === co.id ? null : co.id)}
          >
            <View style={s.coHdr}>
              <View>
                <View style={s.tpoBadge}>
                  <Text style={s.tpoBadgeTxt}>{t.tpoLabels[co.tpo] ?? co.tpo}</Text>
                </View>
                <Text style={s.coWeather}>{co.weather}</Text>
              </View>
              <View style={s.score}>
                <Text style={s.scoreTxt}>{co.score}</Text>
              </View>
            </View>
            <View style={s.coItems}>
              {co.ids.map(id => {
                const cl = clothesMap.get(id);
                return cl ? (
                  <View key={id} style={[s.coItem, { backgroundColor: cl.bg }]}>
                    {cl.image
                      ? <Image source={{ uri: cl.image }} style={{ width: "100%", height: "100%", borderRadius: 14 }} />
                      : <Text style={{ fontSize: 22 }}>{cl.icon}</Text>
                    }
                  </View>
                ) : null;
              })}
            </View>
            {open === co.id && (
              <View style={s.coDetail}>
                <Text style={s.coComment}>{co.comment}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[s.regenBtn, loading && { opacity: 0.7 }]} onPress={regen} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.regenTxt}>{coords.length === 0 ? t.generateBtn : t.regenBtn}</Text>
          }
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  darkHdr: { backgroundColor: BRAND, padding: 20, paddingBottom: 16 },
  darkSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 4 },
  darkTitle: { fontSize: 28, fontWeight: "400", color: "#fff" },
  darkWeather: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  tpoChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", marginRight: 8 },
  tpoChipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  tpoTxt: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  tpoTxtOn: { color: BRAND, fontWeight: "700" },
  coCard: { backgroundColor: "#fff", borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: "#E8E8E0", overflow: "hidden" },
  coCardOn: { borderColor: BRAND, borderWidth: 2 },
  coHdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12 },
  tpoBadge: { backgroundColor: "#F0EDE8", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 4 },
  tpoBadgeTxt: { fontSize: 11, color: "#666" },
  coWeather: { fontSize: 11, color: "#999" },
  score: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F0EDE8", alignItems: "center", justifyContent: "center" },
  scoreTxt: { fontSize: 16, fontWeight: "700", color: BRAND },
  coItems: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  coItem: { flex: 1, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  coDetail: { borderTopWidth: 1, borderTopColor: "#F0EDE8", padding: 16 },
  coComment: { fontSize: 13, color: "#555", lineHeight: 20 },
  regenBtn: { backgroundColor: BRAND, borderRadius: 20, padding: 18, alignItems: "center" },
  regenTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
