import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useLang();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.top}>
          <Text style={s.emoji}>👗</Text>
          <Text style={s.title}>{t.loginTitle}</Text>
          <Text style={s.subtitle}>{t.loginSubtitle}</Text>
        </View>
        <View style={s.buttons}>
          <TouchableOpacity style={s.googleBtn} onPress={signInWithGoogle} activeOpacity={0.85}>
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleLabel}>{t.signInWithGoogle}</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={20}
              style={s.appleBtn}
              onPress={signInWithApple}
            />
          )}
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
  title: { fontSize: 32, fontWeight: '700', color: '#1a0a2e', letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 24 },
  buttons: { gap: 12 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0D8',
    gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleLabel: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  appleBtn: { width: '100%', height: 52 },
});
