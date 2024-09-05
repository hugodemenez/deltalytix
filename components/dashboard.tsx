'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { useTrades } from './context/trades-data'
import { CalendarData } from '@/lib/types'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { FilterSelectors } from './filters'
import Statistics from './statistics'
import { DateRangeSelector } from './date-range-selector'
import { GraphsSection } from './sections/graphs-section'
import { CalendarSection } from './sections/calendar-section'
import StatisticsSection from './sections/statistics-section'

export default function Dashboard() {
  const { trades } = useTrades()
  const [instrument, setInstrument] = useState<string>("all")
  const [accountNumber, setAccountNumber] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: new Date(),
    to: new Date()
  }))
  const [activeSection, setActiveSection] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (trades.length === 0) return;

    const sortedTrades = trades.sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
    setDateRange({
      from: new Date(sortedTrades[0].buyDate),
      to: new Date(sortedTrades[sortedTrades.length - 1].buyDate)
    });
  }, [trades]);

  const formattedTrades = useMemo(() => {
    return trades
      .sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime())
      .filter((trade) => {
        const buyDate = new Date(trade.buyDate);
        if (isNaN(buyDate.getTime())) return false;
        if (instrument !== "all" && trade.instrument !== instrument) return false;
        if (accountNumber !== "all" && trade.accountNumber !== accountNumber) return false;
        if (dateRange?.from && dateRange?.to) {
          if (buyDate < dateRange.from || buyDate > dateRange.to) return false;
        }
        return true;
      });
  }, [trades, instrument, accountNumber, dateRange]);

  const statistics = calculateStatistics(formattedTrades);
  const calendarData: CalendarData = formatCalendarData(formattedTrades);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const sections = ['accomplishments', 'graphs', 'analytics', 'calendar'];
      const currentSection = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          return scrollPosition >= offsetTop - 100 && scrollPosition < offsetTop + offsetHeight - 100;
        }
        return false;
      });
      if (currentSection) setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const yOffset = -80;
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen ">
      <main className="flex-grow py-4 lg:py-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between gap-y-4 mb-4 px-2">
          <DateRangeSelector dateRange={dateRange} setDateRange={setDateRange} />
          <FilterSelectors
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            instrument={instrument}
            setInstrument={setInstrument}
            trades={trades}
          />
        </div>
        <StatisticsSection statistics={statistics}></StatisticsSection>
        <GraphsSection calendarData={calendarData} />
        <CalendarSection dateRange={dateRange} calendarData={calendarData} />
      </main>
    </div>
  );
}