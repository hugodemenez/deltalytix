'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Mood } from '@prisma/client';

interface MoodContextType {
  moods: Mood[];
  setMoods: (moods: Mood[]) => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export function MoodProvider({ children, initialMoods = [] }: { children: ReactNode; initialMoods?: Mood[] }) {
  const [moods, setMoods] = React.useState<Mood[]>(initialMoods);

  return (
    <MoodContext.Provider value={{ moods, setMoods }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const context = useContext(MoodContext);
  if (context === undefined) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
} 