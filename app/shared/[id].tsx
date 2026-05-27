import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClothItem } from '../../lib/db';
import { subscribeToClothes } from '../../lib/db';
import { useLang } from '../../lib/i18n';

const BRAND = '#1a0a2e';

export default function SharedClosetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const router = useRouter();
  const [clothes, setClothes] = useState<ClothItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return subscribeToClothes(id, items => {
      setClothes(items);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ fontSize: 18, color: BRAND }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.hdrSub}>SHARED CLOSET</Text>
            <Text style={s.hdrTitle}>{t.sharedClosetTitle}</Text>
          </View>
        </View>
        {clothes.length === 0 ? (
          <Text style={s.empty}>{t.sharedClosetTitle}</Text>
        ) : (
          <View style={s.grid}>
            {clothes.map(cl => (
              <View key={cl.id} style={s.card}>
                {cl.image
                  ? <Image source={{ uri: cl.image }} style={s.cardImg} />
                  : <View style={[s.cardImg, { backgroundColor: cl.bg }]}>
                      <Text style={{ fontSize: 36 }}>{cl.icon}</Text>
                    </View>
                }
                <Text style={s.cardName}>{cl.name}</Text>
                <Text style={s.cardSub}>{cl.last}</Text>
                <View style={s.badge}><Text style={s.badgeTxt}>{cl.cat}</Text></View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF7' },
  hdr: { flexDirection: 'row', alignItems: 'flex-end', padding: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', marginRight: 8 },
  hdrSub: { fontSize: 11, color: '#999', letterSpacing: 1, marginBottom: 4 },
  hdrTitle: { fontSize: 28, fontWeight: '400', color: '#1a1a1a', letterSpacing: -0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#E8E8E0' },
  cardImg: { height: 88, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10, resizeMode: 'cover' },
  cardName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  cardSub: { fontSize: 10, color: '#999', marginTop: 2 },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F0EDE8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, color: '#888' },
  empty: { textAlign: 'center', color: '#999', marginTop: 80, lineHeight: 22 },
});
