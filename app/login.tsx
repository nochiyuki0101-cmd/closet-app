import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (action: 'signIn' | 'signUp') => {
    setError('');
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      if (action === 'signIn') await signIn(email, password);
      else await signUp(email, password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (code === 'auth/email-already-in-use') {
        setError('このメールアドレスはすでに登録されています');
      } else if (code === 'auth/weak-password') {
        setError('パスワードは6文字以上で入力してください');
      } else if (code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else {
        setError('認証に失敗しました。もう一度お試しください');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.top}>
            <Text style={s.emoji}>👗</Text>
            <Text style={s.title}>{t.loginTitle}</Text>
            <Text style={s.subtitle}>{t.loginSubtitle}</Text>
          </View>
          <View style={s.form}>
            <TextInput
              style={s.input}
              placeholder="メールアドレス"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={s.input}
              placeholder="パスワード"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <TouchableOpacity style={s.primaryBtn} onPress={() => handle('signIn')} disabled={loading} activeOpacity={0.85}>
              <Text style={s.primaryLabel}>ログイン</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => handle('signUp')} disabled={loading} activeOpacity={0.85}>
              <Text style={s.secondaryLabel}>新規登録</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF7' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 60 },
  top: { alignItems: 'center', marginTop: 40 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a0a2e', letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 24 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1a0a2e',
    borderWidth: 1.5,
    borderColor: '#E0E0D8',
  },
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
  error: { fontSize: 14, color: '#d32f2f', textAlign: 'center' },
});
