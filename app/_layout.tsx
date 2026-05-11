import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { LangProvider } from "../lib/i18n";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // useEffect(() => {
  //   if (loading) return;
  //   const isPublic = segments[0] === 'login' || segments[0] === 'shared';
  //   if (!user && !isPublic) {
  //     router.replace('/login');
  //   } else if (user && segments[0] === 'login') {
  //     router.replace('/');
  //   }
  // }, [user, loading, segments]);

  // if (loading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF7' }}>
  //       <ActivityIndicator size="large" color="#1a0a2e" />
  //     </View>
  //   );
  // }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LangProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </LangProvider>
    </AuthProvider>
  );
}
