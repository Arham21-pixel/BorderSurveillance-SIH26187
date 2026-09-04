import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = "sentinel_auth_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isDemoMode = !isSupabaseConfigured;

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session && mounted) {
            setSession(data.session);
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || "operator@sentinel.in",
              role: data.session.user.user_metadata?.role || "Tactical Operator",
              name: data.session.user.user_metadata?.name || "Capt. V. Sharma",
            });
          }
        } catch {
          // Fallback or offline
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          if (newSession?.user) {
            setUser({
              id: newSession.user.id,
              email: newSession.user.email || "operator@sentinel.in",
              role: newSession.user.user_metadata?.role || "Tactical Operator",
              name: newSession.user.user_metadata?.name || "Capt. V. Sharma",
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        });

        if (mounted) setIsLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Persisted local session for demo/offline evaluation
        try {
          const saved = localStorage.getItem(DEMO_STORAGE_KEY);
          if (saved && mounted) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
          }
        } catch {
          // Ignore parse errors
        }
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isDemoMode]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            role: data.user.user_metadata?.role || "Tactical Operator",
            name: data.user.user_metadata?.name || "Capt. V. Sharma",
          });
        }
        setIsLoading(false);
        return { error: null };
      } else {
        // Demo authentication mode
        await new Promise((resolve) => setTimeout(resolve, 600)); // realistic network delay

        // Allow demo credentials or any non-empty password for mock evaluation
        if (!email || !password) {
          setIsLoading(false);
          return { error: "Operator email and access cipher required." };
        }

        if (password.length < 6) {
          setIsLoading(false);
          return { error: "Access cipher must be at least 6 characters." };
        }

        const demoUser: AuthUser = {
          id: "op-402-local",
          email,
          role: "Tactical Operator",
          name: email.includes("capt") ? "Capt. V. Sharma" : "Operator #402",
        };

        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        setIsLoading(false);
        return { error: null };
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : "Authentication handshake failed";
      return { error: message };
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isDemoMode,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
