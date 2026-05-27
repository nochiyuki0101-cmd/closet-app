import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClosetScreen } from "../components/ClosetScreen";
import { SettingsScreen } from "../components/SettingsScreen";
import { SuggestScreen } from "../components/SuggestScreen";
import { BRAND, SEED_CLOTHES } from "../lib/constants";
import type { ClothItem } from "../lib/db";
import { addCloth, subscribeToClothes } from "../lib/db";
import { useLang } from "../lib/i18n";
import type { WeatherInfo } from "../lib/weather";
import { fetchWeather } from "../lib/weather";

const uid = 'test-user';

export default function App() {
  const { t } = useLang();
  const tabs = useMemo(() => [
    { label: t.tabCloset, icon: "🗂️" },
    { label: t.tabSuggest, icon: "✨" },
    { label: t.tabSettings, icon: "⚙️" },
  ], [t]);

  const [tab, setTab] = useState(0);
  const [clothes, setClothes] = useState<ClothItem[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const seeded = useRef(false);

  const clothesMap = useMemo(() => new Map(clothes.map(c => [c.id, c])), [clothes]);

  useEffect(() => {
    return subscribeToClothes(uid, items => {
      if (!seeded.current) {
        seeded.current = true;
        if (items.length === 0) {
          Promise.all(SEED_CLOTHES.map(item => addCloth(uid, item))).catch(console.error);
          return;
        }
      }
      setClothes(items);
    });
  }, []);

  useEffect(() => {
    fetchWeather()
      .then(setWeather)
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {tab === 0 && <ClosetScreen clothes={clothes} uid={uid} />}
        {tab === 1 && <SuggestScreen clothes={clothes} clothesMap={clothesMap} weather={weather} weatherLoading={weatherLoading} />}
        {tab === 2 && <SettingsScreen />}
      </View>
      <View style={s.bar}>
        {tabs.map((tb, i) => (
          <TouchableOpacity key={i} style={[s.barBtn, tab === i && s.barBtnOn]} onPress={() => setTab(i)}>
            <Text style={{ fontSize: 20 }}>{tb.icon}</Text>
            <Text style={[s.barLabel, tab === i && s.barLabelOn]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAF7" },
  bar: { flexDirection: "row", backgroundColor: "#FAFAF7", borderTopWidth: 1, borderTopColor: "#E8E8E0", paddingBottom: 8, paddingTop: 4 },
  barBtn: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 12, marginHorizontal: 4 },
  barBtnOn: { backgroundColor: BRAND },
  barLabel: { fontSize: 9, color: "#999", marginTop: 2 },
  barLabelOn: { color: "#fff", fontWeight: "700" },
});
