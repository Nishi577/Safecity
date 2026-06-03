import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/lib/roleValidation';

interface UserRoleState {
  role: AppRole | null;
  isApproved: boolean;
  loading: boolean;
}

export function useUserRole() {
  const { user } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isApproved: false,
    loading: true,
  });

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setState({ role: null, isApproved: false, loading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, is_approved')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setState({ role: null, isApproved: false, loading: false });
          return;
        }

        setState({
          role: data.role as AppRole,
          isApproved: data.is_approved,
          loading: false,
        });
      } catch (err) {
        console.error('Error fetching user role:', err);
        setState({ role: null, isApproved: false, loading: false });
      }
    }

    fetchUserRole();
  }, [user]);

  return state;
}
