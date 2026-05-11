import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, OAuthProvider, User, onAuthStateChanged, signInWithCredential, signOut as fbSignOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth } from './firebase';

WebBrowser.maybeCompleteAuthSession();

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // EXPO_PUBLIC_GOOGLE_CLIENT_ID: Google Cloud Console の「ウェブクライアント」ID
  // EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: Google Cloud Console の「iOSクライアント」ID
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? clientId;
  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId,
    iosClientId,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch(console.error);
      }
    }
  }, [googleResponse]);

  const signInWithGoogle = async () => {
    await promptGoogleAsync();
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') return;
    try {
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const provider = new OAuthProvider('apple.com');
        const firebaseCredential = provider.credential({ idToken: credential.identityToken });
        await signInWithCredential(auth, firebaseCredential);
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ERR_CANCELED') {
        console.error(e);
      }
    }
  };

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
