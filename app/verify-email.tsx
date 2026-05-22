import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';

export default function VerifyEmailScreen() {
  const { user, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  const handleResend = async () => {
    setSending(true);
    setSentMsg('');
    try {
      await sendVerificationEmail();
      setSentMsg('確認メールを再送しました');
    } catch {
      setSentMsg('送信に失敗しました。しばらくしてからお試しください');
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    await reloadUser();
    setChecking(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.top}>
          <Text style={s.emoji}>📧</Text>
          <Text style={s.title}>メールを確認してください</Text>
          <Text style={s.desc}>
            <Text style={s.email}>{user?.email}</Text>
            {'\n'}に確認メールを送信しました。{'\n'}
            メール内のリンクをタップして{'\n'}登録を完了してください。
          </Text>
        </View>

        {sentMsg ? <Text style={s.sentMsg}>{sentMsg}</Text> : null}

        <View style={s.buttons}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleCheck} disabled={checking} activeOpacity={0.85}>
            {checking
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryLabel}>確認済みです</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={handleResend} disabled={sending} activeOpacity={0.85}>
            {sending
              ? <ActivityIndicator color="#1a0a2e" />
              : <Text style={s.secondaryLabel}>メールを再送する</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} activeOpacity={0.7}>
            <Text style={s.signOutLabel}>別のアカウントでやり直す</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF7' },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 60 },
  top: { alignItems: 'center', marginTop: 40 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a0a2e', marginBottom: 20, textAlign: 'center' },
  desc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 26 },
  email: { fontWeight: '700', color: '#1a0a2e' },
  sentMsg: { fontSize: 14, color: '#2e7d32', textAlign: 'center' },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: '#1a0a2e',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  primaryLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0D8',
  },
  secondaryLabel: { fontSize: 16, fontWeight: '600', color: '#1a0a2e' },
  signOutLabel: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 4 },
});
