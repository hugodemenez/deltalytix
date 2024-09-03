'use client'
import { createClient } from '@/hooks/auth';
import { getTrades } from '@/server/database';
import { Trade } from '@prisma/client';
import React, { createContext, useState, useContext, useEffect, Dispatch, SetStateAction } from 'react';

const supabase = createClient();

interface TradeDataContextProps {
  trades: Trade[];
  setTrades: Dispatch<SetStateAction<Trade[]>>;
}

const TradeDataContext = createContext<TradeDataContextProps | undefined>(undefined);

export const TradeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tradesData = await getTrades(user.id);
        setTrades(tradesData);
      }
    };

    fetchTrades();
  }, []);

  return (
    <TradeDataContext.Provider value={{ trades, setTrades }}>
      {children}
    </TradeDataContext.Provider>
  );
};

export const useTrades = () => {
  const context = useContext(TradeDataContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradeDataProvider');
  }
  return context;
};