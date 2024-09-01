'use client'
import { createClient } from '@/hooks/auth';
import { User } from '@supabase/supabase-js';
import React, { createContext, useState, useContext, useEffect } from 'react';

const supabase = createClient();

interface UserDataContextProps {
  user: User | null;
}

const UserDataContext = createContext<UserDataContextProps | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        setUser(user);
      }
    };

    getUser();
  }, []);


  return (
    <UserDataContext.Provider value={{ user }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};