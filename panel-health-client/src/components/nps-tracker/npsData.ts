export const npsTimeSeriesData = [
  { month: "July", year: 2024, date: "2024-07", nps: 14, count: 29, promoters: 13, detractors: 9, avgRating: 7.0, screenouts: { count: 69, promoters: 22, detractors: 40, nps: -26, avgRating: 5.7 }, dashboard: 22, postSurvey: -14, overall: -9 },
  { month: "August", year: 2024, date: "2024-08", nps: 24, count: 21, promoters: 11, detractors: 6, avgRating: 7.7, screenouts: { count: 90, promoters: 20, detractors: 53, nps: -37, avgRating: 5.1 }, dashboard: -9, postSurvey: -25, overall: -23 },
  { month: "September", year: 2024, date: "2024-09", nps: 30, count: 23, promoters: 12, detractors: 5, avgRating: 7.7, screenouts: { count: 96, promoters: 25, detractors: 53, nps: -29, avgRating: 5.7 }, dashboard: 48, postSurvey: -18, overall: -9 },
  { month: "October", year: 2024, date: "2024-10", nps: 19, count: 16, promoters: 8, detractors: 5, avgRating: 7.7, screenouts: { count: 113, promoters: 32, detractors: 55, nps: -20, avgRating: 5.8 }, dashboard: 0, postSurvey: -16, overall: -13 },
  { month: "November", year: 2024, date: "2024-11", nps: 25, count: 20, promoters: 10, detractors: 5, avgRating: 7.7, screenouts: { count: 72, promoters: 20, detractors: 40, nps: -28, avgRating: 5.5 }, dashboard: 4, postSurvey: -16, overall: -13 },
  { month: "December", year: 2024, date: "2024-12", nps: -3, count: 34, promoters: 13, detractors: 14, avgRating: 7.3, screenouts: { count: 43, promoters: 13, detractors: 21, nps: -21, avgRating: 6.0 }, dashboard: 6, postSurvey: -14, overall: -10 },
  { month: "January", year: 2025, date: "2025-01", nps: 33, count: 18, promoters: 10, detractors: 4, avgRating: 7.8, screenouts: { count: 49, promoters: 13, detractors: 21, nps: -19, avgRating: 6.6 }, dashboard: 14, postSurvey: -3, overall: 9 },
  { month: "February", year: 2025, date: "2025-02", nps: 36, count: 14, promoters: 8, detractors: 3, avgRating: 7.8, screenouts: { count: 54, promoters: 18, detractors: 24, nps: -11, avgRating: 6.3 }, dashboard: 26, postSurvey: -1, overall: 9 },
  { month: "March", year: 2025, date: "2025-03", nps: 24, count: 17, promoters: 9, detractors: 5, avgRating: 7.7, screenouts: { count: 73, promoters: 28, detractors: 29, nps: -1, avgRating: 6.7 }, dashboard: 29, postSurvey: 3, overall: 14 },
  { month: "April", year: 2025, date: "2025-04", nps: 44, count: 18, promoters: 11, detractors: 3, avgRating: 8.1, screenouts: { count: 108, promoters: 42, detractors: 50, nps: -7, avgRating: 6.5 }, dashboard: 14, postSurvey: 0, overall: 4 },
  { month: "May", year: 2025, date: "2025-05", nps: 43, count: 7, promoters: 4, detractors: 1, avgRating: 8.1, screenouts: { count: 100, promoters: 43, detractors: 42, nps: 1, avgRating: 6.8 }, dashboard: 17, postSurvey: -4, overall: 8 },
  { month: "June", year: 2025, date: "2025-06", nps: 33, count: 15, promoters: 8, detractors: 3, avgRating: 8.3, screenouts: { count: 125, promoters: 51, detractors: 55, nps: -3, avgRating: 6.8 }, dashboard: 30, postSurvey: 1, overall: 12 },
];

function getMonthIndex(month: string) {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ].indexOf(month);
}

export function filterNpsData(data: any[], dateRange: any) {
  if (!dateRange || dateRange.type === "last12months") {
    return data.slice(-12);
  }
  if (dateRange.type === "custom" && dateRange.from && dateRange.to) {
    const fromIdx = data.findIndex(
      d => d.year === Number(dateRange.from.year) && d.month === dateRange.from.month
    );
    const toIdx = data.findIndex(
      d => d.year === Number(dateRange.to.year) && d.month === dateRange.to.month
    );
    if (fromIdx === -1 || toIdx === -1) return data;
    let filtered = data.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1);
    if (dateRange.frequency === "quarterly") {
      filtered = filtered.filter((_, i) => i % 3 === 0);
    }
    return filtered;
  }
  return data;
} 