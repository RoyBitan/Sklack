import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Profile } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const [authState, setAuthState] = useState<{
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchIdRef = useRef(0);
  const isFetchingRef = useRef<string | null>(null);
  const failSafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userRef = useRef<User | null>(null);

  // Keep userRef in sync for stable callbacks
  useEffect(() => {
    userRef.current = authState.user;
  }, [authState.user]);

  const clearFailSafe = () => {
    if (failSafeTimerRef.current) {
      clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }
  };

  const fetchProfile = useCallback(async (userId: string) => {
    if (isFetchingRef.current === userId) {
      console.log(`[AuthContext] Fetch already in progress for: ${userId}`);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    isFetchingRef.current = userId;
    console.log(`[AuthContext] #${fetchId} Fetching profile for:`, userId);

    try {
      // Fetch profile first
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchId !== fetchIdRef.current) return;

      if (profileError) {
        console.error(`[AuthContext] #${fetchId} Profile Error:`, profileError);
        setAuthState((prev) => ({
          ...prev,
          error: "Failed to fetch profile",
          profile: null,
          loading: false,
        }));
        return;
      }

      // If profile has org_id, fetch organization separately
      let organizationData = null;
      if (profileData?.org_id) {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("name, garage_code")
          .eq("id", profileData.org_id)
          .maybeSingle();

        if (!orgError && orgData) {
          organizationData = orgData;
        }
      }

      // Combine the data
      const data = profileData
        ? {
          ...profileData,
          organization: organizationData,
        }
        : null;

      if (fetchId !== fetchIdRef.current) return;

      console.log(`[AuthContext] #${fetchId} Success:`, data);

      setAuthState((prev) => {
        // Immediate Return Rule: If org_id hasn't changed, skip update to prevent loops
        if (
          prev.profile && data &&
          prev.profile.org_id === (data as any).org_id && !prev.loading
        ) {
          console.log(
            "[AuthContext] org_id unchanged, skipping state update to prevent loop",
          );
          return prev;
        }

        const isUnchanged =
          JSON.stringify(prev.profile) === JSON.stringify(data);
        if (isUnchanged && !prev.loading) return prev;

        return {
          ...prev,
          profile: data as Profile,
          error: null,
          loading: false,
        };
      });
    } catch (err: any) {
      console.error(`[AuthContext] #${fetchId} Exception:`, err);
      setAuthState((prev) => ({
        ...prev,
        error: err.message || "Error occurred",
        profile: null,
        loading: false,
      }));
    } finally {
      // Always clear isFetchingRef, regardless of fetchId match, to allow subsequent fetches
      isFetchingRef.current = null;
      // Clear fail-safe here as the fetch operation has concluded
      clearFailSafe();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    failSafeTimerRef.current = setTimeout(() => {
      if (mounted) {
        console.warn(
          "[AuthContext] Fail-safe timer triggered - forcing loading: false",
        );
        setAuthState((prev) =>
          prev.loading ? { ...prev, loading: false } : prev
        );
      }
    }, 10000); // 10s for slow mobile networks

    const handleAuth = async (sess: Session | null) => {
      if (!mounted) return;

      const newUser = sess?.user ?? null;
      userRef.current = newUser;

      // Step 1: Update Auth State
      // If we have a user, we MUST stay in loading mode until profile is fetched
      setAuthState((prev) => {
        const isSameUser = prev.user?.id === newUser?.id;
        return {
          ...prev,
          session: sess,
          user: newUser,
          loading: newUser ? true : false,
          // Preserve profile ONLY if it's the same user, otherwise null it
          profile: isSameUser ? prev.profile : null,
        };
      });

      // Step 2: Fetch Profile if user exists
      if (newUser) {
        await fetchProfile(newUser.id);
        // ONLY clear fail-safe once profile is actually fetched or failed
        clearFailSafe();
      } else {
        clearFailSafe();
        setAuthState((prev) => ({ ...prev, profile: null, loading: false }));
      }
    };

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      handleAuth(sess);
    }).catch(() => {
      if (mounted) setAuthState((prev) => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        handleAuth(sess);
      },
    );

    // Real-time Profile Updates (Role Changes)
    let profileSubscription: any = null;
    if (authState.user) {
      profileSubscription = supabase
        .channel(`profile-updates-${authState.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${authState.user.id}`,
          },
          (payload) => {
            console.log(
              "[AuthContext] Real-time profile update received:",
              payload,
            );
            fetchProfile(authState.user!.id);
          },
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current);
      subscription.unsubscribe();
      if (profileSubscription) supabase.removeChannel(profileSubscription);
    };
  }, [fetchProfile, authState.user?.id]); // Re-subscribe if user ID changes

  const signOut = useCallback(async () => {
    console.log("[AuthContext] Sign out initiated");
    setAuthState((prev) => ({ ...prev, loading: true }));
    try {
      await supabase.auth.signOut();
      console.log("[AuthContext] Supabase signOut completed");
    } catch (error) {
      console.error("[AuthContext] Supabase signOut failed", error);
    } finally {
      console.log("[AuthContext] Clearing local auth state");
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: null,
      });
      // Force reload to clear any other in-memory states
      // window.location.href = '/login'; // Optional: might be too aggressive, let router handle it
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userRef.current) {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await fetchProfile(userRef.current.id);
    }
  }, [fetchProfile]);

  const value = useMemo(() => ({
    user: authState.user,
    session: authState.session,
    profile: authState.profile,
    loading: authState.loading,
    error: authState.error,
    signOut,
    refreshProfile,
  }), [
    authState.user,
    authState.session,
    authState.profile,
    authState.loading,
    authState.error,
    signOut,
    refreshProfile,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
