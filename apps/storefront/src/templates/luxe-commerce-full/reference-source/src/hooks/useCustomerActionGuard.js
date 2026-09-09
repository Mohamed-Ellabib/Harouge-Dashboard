import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';

export default function useCustomerActionGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCustomerAuthenticated, isCustomerLoading } = useCustomerAuth();

  return useCallback((message = 'سجل الدخول أولاً لحفظ هذا الإجراء في حسابك.') => {
    if (isCustomerAuthenticated) return true;
    if (isCustomerLoading) return false;

    toast.info(message);
    navigate('/account', {
      state: {
        authMessage: message,
        redirectTo: `${location.pathname}${location.search}`,
      },
    });

    return false;
  }, [isCustomerAuthenticated, isCustomerLoading, location.pathname, location.search, navigate]);
}
