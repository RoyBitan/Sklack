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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (fetchId !== fetchIdRef.current) return;

            if (error) {
                console.error(`[AuthContext] #${fetchId} Error:`, error);
                setAuthState(prev => ({
                    ...prev,
                    error: 'Failed to fetch profile',
                    profile: null,
                    loading: false
                }));
            } else {
                console.log(`[AuthContext] #${fetchId} Success:`, data);

                setAuthState(prev => {
                    const isUnchanged = JSON.stringify(prev.profile) === JSON.stringify(data);
                    if (isUnchanged && !prev.loading) return prev;

                    return {
                        ...prev,
                        profile: data as Profile,
                        error: null,
                        loading: false
                    };
                });
            }
        } catch (err: any) {
            console.error(`[AuthContext] #${fetchId} Exception:`, err);
            setAuthState(prev => ({
                ...prev,
                error: err.message || 'Error occurred',
                profile: null,
                loading: false
            }));
        } finally {
            if (fetchId === fetchIdRef.current) {
                isFetchingRef.current = null;
                clearFailSafe();
            }
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        failSafeTimerRef.current = setTimeout(() => {
            if (mounted) {
                setAuthState(prev => prev.loading ? { ...prev, loading: false } : prev);
            }
        }, 5000);

        const handleAuth = async (sess: Session | null) => {
            if (!mounted) return;

            const newUser = sess?.user ?? null;

            // Step 1: Update Auth State
            setAuthState(prev => ({
                ...prev,
                session: sess,
                user: newUser,
                loading: newUser ? true : false,
                profile: newUser ? prev.profile : null
            }));

            // Step 2: Fetch Profile if user exists
            if (newUser) {
                await fetchProfile(newUser.id);
            } else {
                clearFailSafe();
            }
        };

        supabase.auth.getSession().then(({ data: { session: sess } }) => {
            handleAuth(sess);
        }).catch(() => {
            if (mounted) setAuthState(prev => ({ ...prev, loading: false }));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
            handleAuth(sess);
        });

        return () => {
            mounted = false;
            if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = useCallback(async () => {
        setAuthState(prev => ({ ...prev, loading: true }));
        await supabase.auth.signOut();
        setAuthState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null
        });
    }, []);

    const refreshProfile = useCallback(async () => {
        if (userRef.current) {
            setAuthState(prev => ({ ...prev, loading: true }));
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
        refreshProfile
    }), [
        authState.user,
        authState.session,
        authState.profile,
        authState.loading,
        authState.error,
        signOut,
        refreshProfile
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
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
