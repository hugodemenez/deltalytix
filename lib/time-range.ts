export function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60; // Convert seconds to minutes

  if (minutes < 1) return "under1min";
  if (minutes >= 1 && minutes < 5) return "1to5min";
  if (minutes >= 5 && minutes < 10) return "5to10min";
  if (minutes >= 10 && minutes < 15) return "10to15min";
  if (minutes >= 15 && minutes < 30) return "15to30min";
  if (minutes >= 30 && minutes < 60) return "30to60min";
  if (minutes >= 60 && minutes < 120) return "1to2hours";
  if (minutes >= 120 && minutes < 300) return "2to5hours";
  return "over5hours";
}

