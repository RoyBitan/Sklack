import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchIdRef = useRef(0);
    const isFetchingRef = useRef<string | null>(null);
    const failSafeTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (fetchId !== fetchIdRef.current) return;

            if (error) {
                console.error(`[AuthContext] #${fetchId} Error:`, error);
                setError('Failed to fetch profile. Please try again.');
                setProfile(null);
            } else {
                console.log(`[AuthContext] #${fetchId} Success:`, data);

                // STRICT CHANGE DETECTION: Only update state if data actually changed
                setProfile(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) {
                        console.log(`[AuthContext] #${fetchId} Profile unchanged, skipping setProfile`);
                        return prev;
                    }
                    return data as Profile;
                });
                setError(null);
            }
        } catch (err: any) {
            console.error(`[AuthContext] #${fetchId} Exception:`, err);
            setError(err.message || 'An unexpected error occurred');
            setProfile(null);
        } finally {
            if (fetchId === fetchIdRef.current) {
                isFetchingRef.current = null;
                clearFailSafe();
                setLoading(false);
                console.log(`[AuthContext] #${fetchId} Loading finished`);
            }
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        // Fail-safe to prevent indefinite Loading screen
        failSafeTimerRef.current = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[AuthContext] Loading fail-safe triggered after 5s');
                setLoading(false);
            }
        }, 5000);

        const handleAuth = async (sess: Session | null) => {
            if (!mounted) return;
            console.log('[AuthContext] Processing auth state:', sess?.user?.id || 'none');

            setSession(sess);
            setUser(sess?.user ?? null);

            if (sess?.user) {
                await fetchProfile(sess.user.id);
            } else {
                // CRITICAL: Clear state in correct order before setting loading to false
                setUser(null);
                setProfile(null);
                clearFailSafe(); // Clear timer
                setLoading(false);
                console.log('[AuthContext] No user, state cleared, loading finished');
            }
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: sess } }) => {
            console.log('[AuthContext] getSession returned');
            handleAuth(sess);
        }).catch(err => {
            console.error('[AuthContext] getSession error:', err);
            if (mounted) setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
            console.log('[AuthContext] onAuthStateChange:', _event);
            handleAuth(sess);
        });

        // Realtime Profile Listener: Keep profile in sync without manual refreshes
        // This is guarded by the change detection in setProfile (called via fetchProfile or direct set)
        const profileChannel = supabase.channel(`profile-sync-${Math.random()}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles'
            }, (payload) => {
                if (payload.new.id === user?.id) {
                    console.log('[AuthContext] Realtime profile update received:', payload.new);
                    setProfile(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(payload.new)) return prev;
                        return payload.new as Profile;
                    });
                }
            })
            .subscribe();

        return () => {
            mounted = false;
            if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current);
            subscription.unsubscribe();
            supabase.removeChannel(profileChannel);
        };
    }, [user?.id]);

    const signOut = useCallback(async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setProfile(null);
        setLoading(false);
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            setLoading(true);
            await fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

    const value = React.useMemo(() => ({
        user, session, profile, loading, error, signOut, refreshProfile
    }), [user, session, profile, loading, error, signOut, refreshProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
