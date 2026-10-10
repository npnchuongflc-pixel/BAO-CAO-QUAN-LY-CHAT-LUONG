import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const OFFICIAL_SUPPORT_EMAIL = 'quanlychatluongcvsg@gmail.com';
export const TARGET_SENDER_EMAIL = 'quanlychatluongcvsg@gmail.com';

// Fallback configuration if external json is ever missing in external CI builds
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0375685705",
  appId: "1:366318710084:web:955c55c21ca9e610dcbb11",
  apiKey: "AIzaSyA53GdPiJqfaCKmEJguN1Mpwby_kK3a7lw",
  authDomain: "gen-lang-client-0375685705.firebaseapp.com",
  storageBucket: "gen-lang-client-0375685705.firebasestorage.app",
  messagingSenderId: "366318710084",
  oAuthClientId: "366318710084-gbk3pn4b4ddln3k4pbui4k8ig77m8c9q.apps.googleusercontent.com",
};

const effectiveConfig = (firebaseConfig && (firebaseConfig as any).apiKey) 
  ? firebaseConfig 
  : DEFAULT_FIREBASE_CONFIG;

// Registered Workspace scopes per application integration
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
];

const STORAGE_KEY_TOKEN = 'workspace_gmail_access_token';
const STORAGE_KEY_TOKEN_EXP = 'workspace_gmail_token_exp';
const STORAGE_KEY_USER_EMAIL = 'workspace_gmail_user_email';

const app = getApps().length > 0 ? getApp() : initializeApp(effectiveConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Pre-fill target email quanlychatluongcvsg@gmail.com on Google sign-in popup
provider.setCustomParameters({
  login_hint: TARGET_SENDER_EMAIL,
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize cachedAccessToken from localStorage if available and not expired
try {
  const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  const savedExp = localStorage.getItem(STORAGE_KEY_TOKEN_EXP);
  if (savedToken) {
    if (!savedExp || Date.now() < parseInt(savedExp, 10)) {
      cachedAccessToken = savedToken;
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
    }
  }
} catch (e) {
  // localStorage not available
}

export const purgeOldSenderAccount = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
    localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
  } catch (e) {}
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được Access Token từ tài khoản Google.');
    }

    cachedAccessToken = credential.accessToken;
    
    // Save token to localStorage with expiration timestamp (55 minutes safe buffer for Google OAuth)
    try {
      const expiresInMs = 55 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
      localStorage.setItem(STORAGE_KEY_TOKEN_EXP, (Date.now() + expiresInMs).toString());
      if (result.user.email) {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, result.user.email);
      }
    } catch (e) {
      console.warn('Could not save token to localStorage:', e);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      // User closed the popup before finishing Google sign-in. Normal cancellation, return null safely.
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const savedExp = localStorage.getItem(STORAGE_KEY_TOKEN_EXP);
    if (savedToken) {
      if (!savedExp || Date.now() < parseInt(savedExp, 10)) {
        cachedAccessToken = savedToken;
        return cachedAccessToken;
      } else {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
      }
    }
  } catch (e) {
    console.error(e);
  }

  return null;
};

export const getSavedUserEmail = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_EMAIL) || auth.currentUser?.email || null;
  } catch {
    return auth.currentUser?.email || null;
  }
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
    localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
  } catch (e) {}
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  await purgeOldSenderAccount();
};



