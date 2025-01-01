'use client'
import { createClient } from '@/hooks/auth';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSubscriptionDetails } from "@/server/subscription"

const supabase = createClient();

interface UserDataContextType {
  user: User | null
  subscription: {
    isActive: boolean
    plan: string | null
    status: string
    endDate: Date | null
    trialEndsAt: Date | null
  } | null
  isPlusUser: () => boolean
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserDataContextType['subscription']>(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) {
        // router.push('/authentication');
      }
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        setUser(user);
      }
    };

    getUser();
  }, [router]);

  useEffect(() => {
    if (user?.email) {
      getSubscriptionDetails(user.email).then(setSubscription)
    }
  }, [user?.email])

  const isPlusUser = () => {
    return Boolean(subscription?.isActive && ['plus', 'pro'].includes(subscription?.plan?.split('_')[0].toLowerCase()||''));
  };

  return (
    <UserDataContext.Provider value={{ user, subscription, isPlusUser }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUser must be used within a UserDataProvider');
  }
  return context;
};