const mysql = require('mysql2/promise');
require('dotenv').config();

class NPSModel {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'zoomrx_nps',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Cache for NPS data to prevent multiple queries
    this.npsDataCache = null;
    this.cacheTimestamp = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  async getNpsData(waveId = 83005) {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (this.npsDataCache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheExpiry) {
      return this.npsDataCache;
    }
    
    const query = `
      SELECT *
      FROM (
        SELECT
          uw.id AS prevuw,
          uw.user_id,
          uw.status,
          uw.completed_date,
          nps.id AS npsuw,
          nps.start_date,
          nps.completed_date as nps_completed_date,
          nps.rating,
          nps.source,
          s.type AS survey_type,
          ROW_NUMBER() OVER (PARTITION BY uw.user_id, nps.id ORDER BY uw.completed_date DESC) AS rankvalue
        FROM users_waves uw
        JOIN waves w ON w.id = uw.wave_id
        JOIN surveys s ON s.id = w.survey_id
        JOIN (
          SELECT
            uw.id,
            uw.user_id,
            uw.start_date,
            uw.completed_date,
            uwd.source,
            CAST(sr.responses->'$."2938156"' AS UNSIGNED INTEGER) AS rating
          FROM users_waves uw
          JOIN users_wave_details uwd ON uwd.id = uw.id
          JOIN survey_responses sr ON sr.id = uw.id
          JOIN users u ON u.id = uw.user_id
          JOIN waves w ON uw.wave_id = w.id
          JOIN surveys s ON s.id = w.survey_id
          WHERE
            wave_id = ?
            AND uw.status = 1
            AND u.type = 1
        ) nps ON nps.user_id = uw.user_id AND uw.completed_date < nps.start_date
        AND uw.status IN (1, 2, 3, 4, 6)
      ) ranked_data
      WHERE rankvalue = 1
      ORDER BY ranked_data.nps_completed_date DESC
    `;

    try {
      const [rows] = await this.pool.execute(query, [waveId]);
      
      // Cache the results
      this.npsDataCache = rows;
      this.cacheTimestamp = now;
      
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getProcessedData(npsUserWaves, sources) {
    // Filter by sources
    const userWaves = npsUserWaves.filter(npsUserWave => 
      sources.includes(npsUserWave.source)
    );

    // Separate completes and screenouts
    const completes = userWaves.filter(userWave => 
      userWave.status == 1 || userWave.status == 6
    );

    const screenouts = userWaves.filter(userWave => 
      userWave.status == 2 || userWave.status == 3 || userWave.status == 4
    );

    return {
      COMPLETE: this.processSubmitData(completes),
      SCREENOUT: this.processSubmitData(screenouts)
    };
  }

  processSubmitData(submitData) {
    const groupedData = {};

    submitData.forEach(entry => {
      // Handle both Date objects and strings
      let month;
      if (entry.nps_completed_date instanceof Date) {
        month = entry.nps_completed_date.toISOString().substring(0, 7); // YYYY-MM format
      } else if (typeof entry.nps_completed_date === 'string') {
        month = entry.nps_completed_date.substring(0, 7); // YYYY-MM format
      } else {
        console.warn('Invalid date format:', entry.nps_completed_date);
        return; // Skip this entry
      }

      if (!groupedData[month]) {
        groupedData[month] = {
          month: month,
          total_rating: 0,
          response_count: 0,
          promoter_count: 0,
          detractor_count: 0,
          passive_count: 0
        };
      }

      const rating = parseInt(entry.rating) || 0;
      groupedData[month].total_rating += rating;
      groupedData[month].response_count += 1;

      if (rating >= 9) {
        groupedData[month].promoter_count += 1;
      } else if (rating <= 6) {
        groupedData[month].detractor_count += 1;
      } else {
        groupedData[month].passive_count += 1;
      }
    });

    // Convert to array and calculate averages
    return Object.values(groupedData).map(group => ({
      ...group,
      average_nps: group.response_count > 0 ? group.total_rating / group.response_count : 0,
      nps_score: group.response_count > 0 ? 
        ((group.promoter_count - group.detractor_count) / group.response_count) * 100 : 0
    }));
  }

  async getNpsTimeSeriesData(dateRange = null, frequency = 'monthly') {
    try {
      // Get raw NPS data (will use cache if available)
      const npsData = await this.getNpsData();
      
      // Process data for different sources
      const overallData = await this.getProcessedData(npsData, [1, 2, 3]); // Dashboard, Loop, Post Survey
      const dashboardData = await this.getProcessedData(npsData, [1]); // Dashboard
      const postSurveyData = await this.getProcessedData(npsData, [3]); // Post Survey

      // Combine all data
      const combinedData = this.combineNpsData(overallData, dashboardData, postSurveyData);
      
      // Filter by date range if provided
      let filteredData = combinedData;
      if (dateRange) {
        filteredData = this.filterDataByDateRange(combinedData, dateRange);
      }

      // Group by frequency if needed
      if (frequency === 'quarterly') {
        filteredData = this.groupByQuarterly(filteredData);
      }

      return filteredData;
    } catch (error) {
      console.error('Error fetching NPS time series data:', error);
      throw error;
    }
  }

  combineNpsData(overallData, dashboardData, postSurveyData) {
    const combined = [];
    
    // Ensure we have valid data structures
    const overallComplete = overallData.COMPLETE || [];
    const overallScreenout = overallData.SCREENOUT || [];
    const dashboardComplete = dashboardData.COMPLETE || [];
    const postSurveyComplete = postSurveyData.COMPLETE || [];
    
    // Process overall data
    overallComplete.forEach(item => {
      const dashboardItem = dashboardComplete.find(d => d.month === item.month);
      const postSurveyItem = postSurveyComplete.find(p => p.month === item.month);
      const screenoutItem = overallScreenout.find(s => s.month === item.month);
      
      combined.push({
        month: item.month,
        year: parseInt(item.month.split('-')[0]),
        date: item.month,
        nps: Math.round(item.nps_score),
        count: item.response_count,
        promoters: item.promoter_count,
        detractors: item.detractor_count,
        avgRating: Math.round(item.average_nps * 10) / 10,
        screenouts: {
          count: screenoutItem?.response_count || 0,
          promoters: screenoutItem?.promoter_count || 0,
          detractors: screenoutItem?.detractor_count || 0,
          nps: Math.round(screenoutItem?.nps_score || 0),
          avgRating: Math.round((screenoutItem?.average_nps || 0) * 10) / 10
        },
        dashboard: Math.round(dashboardItem?.nps_score || 0),
        postSurvey: Math.round(postSurveyItem?.nps_score || 0),
        overall: Math.round(item.nps_score)
      });
    });

    return combined.sort((a, b) => a.month.localeCompare(b.month));
  }

  filterDataByDateRange(data, dateRange) {
    if (dateRange.type === 'last12months') {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const cutoffDate = twelveMonthsAgo.toISOString().substring(0, 7);
      
      return data.filter(item => item.month >= cutoffDate);
    }
    
    if (dateRange.type === 'custom' && dateRange.from && dateRange.to) {
      const fromDate = `${dateRange.from.year}-${String(dateRange.from.month).padStart(2, '0')}`;
      const toDate = `${dateRange.to.year}-${String(dateRange.to.month).padStart(2, '0')}`;
      
      return data.filter(item => item.month >= fromDate && item.month <= toDate);
    }
    
    return data;
  }

  groupByQuarterly(data) {
    const quarterlyData = {};
    
    data.forEach(item => {
      const date = new Date(item.month + '-01');
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const quarterKey = `Q${quarter}-${date.getFullYear()}`;
      
      if (!quarterlyData[quarterKey]) {
        quarterlyData[quarterKey] = {
          quarter: quarterKey,
          year: date.getFullYear(),
          date: quarterKey,
          nps: 0,
          count: 0,
          promoters: 0,
          detractors: 0,
          avgRating: 0,
          totalRating: 0
        };
      }
      
      const quarterItem = quarterlyData[quarterKey];
      quarterItem.count += item.count;
      quarterItem.promoters += item.promoters;
      quarterItem.detractors += item.detractors;
      quarterItem.totalRating += item.avgRating * item.count;
      
      if (quarterItem.count > 0) {
        quarterItem.nps = Math.round(((quarterItem.promoters - quarterItem.detractors) / quarterItem.count) * 100);
        quarterItem.avgRating = Math.round((quarterItem.totalRating / quarterItem.count) * 10) / 10;
      }
    });
    
    return Object.values(quarterlyData).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }

  async getNpsSummaryMetrics() {
    try {
      const npsData = await this.getNpsData();
      const overallData = await this.getProcessedData(npsData, [1, 2, 3]);
      const combinedData = this.combineNpsData(overallData, {}, {});
      
      if (combinedData.length === 0) {
        return {
          current: null,
          previous: null,
          best: null
        };
      }

      const sorted = combinedData.sort((a, b) => a.month.localeCompare(b.month));
      const current = sorted[sorted.length - 1];
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const best = sorted.reduce((acc, cur) => cur.nps > acc.nps ? cur : acc, sorted[0]);

      return {
        current,
        previous,
        best
      };
    } catch (error) {
      console.error('Error fetching NPS summary metrics:', error);
      throw error;
    }
  }
}

module.exports = new NPSModel(); 