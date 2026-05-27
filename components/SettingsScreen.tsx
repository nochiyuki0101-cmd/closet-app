import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { BRAND } from "../lib/constants";
import type { SettingKey } from "../lib/constants";
import { useLang } from "../lib/i18n";

export function SettingsScreen() {
  const { t } = useLang();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<SettingKey, boolean>>({
    weatherSync: true,
    considerHistory: true,
    morningNotif: false,
  });

  const toggle = (key: SettingKey) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const settingRows: [SettingKey, string, string][] = [
    ['weatherSync', t.weatherSync, t.weatherSyncSub],
    ['considerHistory', t.considerHistory, t.considerHistorySub],
    ['morningNotif', t.morningNotif, t.morningNotifSub],
  ];

  const avatarInitial = (user?.displayName ?? user?.email ?? '?')[0].toUpperCase();
  const displayName = user?.displayName ?? user?.email ?? '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAF7" }}>
      <View style={s.hdr}>
        <Text style={s.hdrSub}>{t.settingsSub}</Text>
        <Text style={s.hdrTitle}>{t.settingsTitle}</Text>
      </View>

      <View style={[s.card, { marginBottom: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={s.avatar}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{displayName}</Text>
            <Text style={s.cardSub}>{user?.email ?? ''}</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.section}>{t.suggestSettings}</Text>
        {settingRows.map(([key, lb, sub]) => (
          <View key={key} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{lb}</Text>
              <Text style={s.rowSub}>{sub}</Text>
            </View>
            <TouchableOpacity style={[s.tog, settings[key] && s.togOn]} onPress={() => toggle(key)}>
              <View style={[s.togThumb, settings[key] && s.togThumbOn]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 20, paddingBottom: 12 },
  hdrSub: { fontSize: 11, color: "#999", letterSpacing: 1, marginBottom: 4 },
  hdrTitle: { fontSize: 28, fontWeight: "400", color: "#1a1a1a", letterSpacing: -0.5 },
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 20, padding: 20, borderWidth: 1, borderColor: "#E8E8E0" },
  section: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  cardSub: { fontSize: 12, color: "#999", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5F5F0" },
  rowLabel: { fontSize: 14, color: "#333" },
  rowSub: { fontSize: 11, color: "#999", marginTop: 2 },
  tog: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#DDD", padding: 3, justifyContent: "center" },
  togOn: { backgroundColor: BRAND },
  togThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: "flex-start" },
  togThumbOn: { alignSelf: "flex-end" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
});
