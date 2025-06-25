import { useEffect, useState, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  user_id: string
  role: 'admin' | 'viewer'
  created_at: string
  Name?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionTimeoutRef = useRef<NodeJS.Timeout>()
  const currentSessionRef = useRef<string | null>(null)
  const sessionCheckInProgressRef = useRef(false)
  
  // Track user session with improved debounce and duplicate prevention
  const trackSession = async (userId: string) => {
    try {
      // Prevent concurrent session checks
      if (sessionCheckInProgressRef.current) {
        return;
      }
      sessionCheckInProgressRef.current = true;

      // Clear any pending session creation
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }

      // First check if this user should be tracked
      const { data: excluded } = await supabase
        .from('excluded_users')
        .select('user_id')
        .eq('user_id', userId);

      // If user is excluded, don't track
      if (excluded && excluded.length > 0) {
        console.log('User excluded from tracking');
        sessionCheckInProgressRef.current = false;
        return;
      }

      // Check for existing active session
      const { data: existingSessions } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', userId)
        .is('ended_at', null);

      // If there's an active session, use it
      if (existingSessions?.length > 0) {
        currentSessionRef.current = existingSessions[0].id;
        sessionCheckInProgressRef.current = false;
        return;
      }

      // Create new session after delay
      sessionTimeoutRef.current = setTimeout(async () => {
        const { data: session, error } = await supabase
          .from('user_sessions')
          .insert([{
            user_id: userId,
            ip_address: 'Client IP',
            user_agent: navigator.userAgent,
            device_type: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          sessionCheckInProgressRef.current = false;
          return;
        }

        if (session?.id) {
          currentSessionRef.current = session.id;
        }
        sessionCheckInProgressRef.current = false;
      }, 1000);
    } catch (error) {
      console.error('Error tracking session:', error);
      sessionCheckInProgressRef.current = false;
    }
  }

  // Track user action with enhanced logging
  const trackAction = async (actionType: string, details: any = {}) => {
    try {
      if (!currentSessionRef.current || !user) return;

      const trackableActions = [
        'sign_in',
        'sign_out',
        'create_user',
        'view_inventory',
        'start_count',
        'complete_count',
        'generate_adjustment',
        'view_master_data',
        'add_item',
        'update_item',
        'delete_item',
        'add_product',
        'update_product',
        'delete_product',
        'add_warehouse',
        'update_warehouse',
        'delete_warehouse',
        'view_transactions',
        'create_transaction',
        'update_transaction',
        'delete_transaction',
        'advance_transaction',
        'view_reports',
        'run_customer_report',
        'run_item_report',
        'run_product_report',
        'run_warehouse_report',
        'run_negative_report'
      ];

      if (!trackableActions.includes(actionType)) return;

      // Check if user should be tracked before inserting action
      const { data: excluded } = await supabase
        .from('excluded_users')
        .select('user_id')
        .eq('user_id', user.id);

      if (excluded && excluded.length > 0) {
        return;
      }

      const { error } = await supabase
        .from('user_actions')
        .insert([{
          session_id: currentSessionRef.current,
          action_type: actionType,
          action_details: details
        }]);

      if (error) {
        console.error('Error inserting user action:', error);
      }
    } catch (error) {
      console.error('Error tracking action:', error)
    }
  }

  // End session
  const endSession = async () => {
    try {
      if (!currentSessionRef.current) return;

      await supabase
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', currentSessionRef.current)
        .is('ended_at', null); // Only update if not already ended

      currentSessionRef.current = null;
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible' && user) {
        trackSession(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    console.log('[useAuth] initializing session…')
    setLoading(true)

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[useAuth] getSession →', { session, error })
      if (error) console.error('[useAuth] getSession error', error)

      if (session?.user) {
        setUser(session.user)
        trackSession(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] onAuthStateChange', { event, session })
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        trackSession(session.user.id)
        trackAction('sign_in')
      } else if (event === 'SIGNED_OUT') {
        endSession()
        setUser(null)
        trackAction('sign_out')
      }
    })

    return () => {
      subscription.unsubscribe()
      endSession()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      console.log('[useAuth] no user—clearing profile')
      setProfile(null)
      return
    }

    console.log('[useAuth] fetching profile for', user.id)
    setLoading(true)

    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error, status }) => {
        console.log('[useAuth] fetchProfile →', { data, error, status })
        if (error && status !== 406 /* no rows—for single() */) {
          console.error('[useAuth] real fetchProfile error', error)
        }

        setProfile(data ?? null)
      })
      .catch((err) => console.error('[useAuth] unexpected error', err))
      .finally(() => {
        setLoading(false)
      })
  }, [user])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    console.log('[useAuth] signIn →', { data, error })
    
    if (!error) {
      trackAction('sign_in')
    }
    
    setLoading(false)
    return error
  }

  const signOut = async () => {
    setLoading(true)
    await endSession()
    trackAction('sign_out')
    const { error } = await supabase.auth.signOut()
    console.log('[useAuth] signOut →', { error })
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  const createUser = async (email: string, password: string, role: 'admin' | 'viewer') => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error('Not authenticated')
      }

      trackAction('create_user')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ email, password, role }),
        }
      )

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      return true
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user')
      return false
    }
  }

  const isAdmin = () => profile?.role === 'admin'

  return { 
    user, 
    profile, 
    loading, 
    signIn, 
    signOut, 
    isAdmin, 
    createUser,
    trackAction
  }
}