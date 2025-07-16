const mysql = require('mysql2/promise');
const database = require('../config/database');

// Source constants matching PHP implementation
const Source = {
    DASHBOARD: 1,
    SURVEY_SUGGESTER: 2,
    LOOP: 3,
    EMAIL: 4,
    FAX: 5,
    SNAILMAIL: 6,
    WEB_PUSH: 7,
    PUSH: 8,
    NOTIFICATION_PAGE: 9,
    DASHBOARD_EMAIL: 10,
    INTERSURVEY_TRANSITION: 11,
    POST_SURVEY_MODULE: 12,
    NON_LITE_INTERSURVEY_TRANSITION: 13,
    SMS: 14
};

class NPSModel {
    constructor() {
        this.connection = null;
        this.cache = {
            npsData: null,
            lastFetch: null,
            cacheExpiry: 10 * 60 * 1000 // 10 minutes in milliseconds
        };
    }

    // Singleton instance
    static getInstance() {
        if (!NPSModel.instance) {
            NPSModel.instance = new NPSModel();
        }
        return NPSModel.instance;
    }

    async getConnection() {
        if (!this.connection) {
            await database.connect();
            this.connection = await database.getConnection();
        }
        return this.connection;
    }

    /**
     * Get cached NPS data or fetch fresh data if cache is expired
     */
    async getCachedNpsData() {
        const now = Date.now();
        
        // Check if cache is valid
        if (this.cache.npsData && this.cache.lastFetch && 
            (now - this.cache.lastFetch) < this.cache.cacheExpiry) {
            const timeLeft = Math.round((this.cache.cacheExpiry - (now - this.cache.lastFetch)) / 1000 / 60);
            console.log(`📦 Using cached NPS data (${timeLeft} minutes left until auto-refresh)`);
            return this.cache.npsData;
        }
        
        // Cache is expired or doesn't exist, fetch fresh data
        console.log('📦 Cache expired or missing, automatically fetching fresh NPS data');
        const freshData = await this.getNpsData();
        
        // Update cache
        this.cache.npsData = freshData;
        this.cache.lastFetch = now;
        
        console.log('📦 Updated cache with fresh data (will auto-refresh in 10 minutes)');
        return freshData;
    }



    /**
     * Get NPS Data - matches PHP getNpsData() method
     * Fetches all NPS completes and their immediate previous user waves
     */
    async getNpsData() {
        try {
            console.log('Attempting to get database connection...');
            const connection = await this.getConnection();
            console.log('Database connection established successfully');
            
            const npsQuery = `
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
                            wave_id = 83005
                            AND uw.status = 1
                            AND u.type = 1
                    ) nps ON nps.user_id = uw.user_id AND uw.completed_date < nps.start_date
                    AND uw.status IN (1, 2, 3, 4, 6)
                ) ranked_data
                WHERE rankvalue = 1
                ORDER BY ranked_data.nps_completed_date DESC
            `;

            console.log('Executing NPS query...');
            const [rows] = await connection.execute(npsQuery);
            console.log(`Query executed successfully. Found ${rows.length} rows`);
            
            // Debug: Log the first few rows to see data structure
            if (rows.length > 0) {
                console.log('Sample NPS data row:', {
                    nps_completed_date: rows[0].nps_completed_date,
                    type: typeof rows[0].nps_completed_date,
                    isDate: rows[0].nps_completed_date instanceof Date,
                    rating: rows[0].rating,
                    source: rows[0].source,
                    survey_type: rows[0].survey_type
                });
            } else {
                console.log('No data returned from query. This could mean:');
                console.log('1. Database is empty or has no matching records');
                console.log('2. Wave ID 83005 does not exist');
                console.log('3. No users with type = 1');
                console.log('4. No survey responses with the specific question ID');
            }
            
            return rows;
        } catch (error) {
            console.error('Error in getNpsData:', error);
            throw error;
        }
    }

    /**
     * Get Data - matches PHP getData() method
     * Calculates PDT scores with and without lite surveys
     */
    async getData(npsUserWavesWithLite, sources) {
        console.log(`getData called with ${npsUserWavesWithLite.length} records and sources:`, sources);
        
        const npsDataWithLite = this.getProcessedData(npsUserWavesWithLite, sources);
        console.log('npsDataWithLite:', {
            COMPLETE: npsDataWithLite.COMPLETE.length,
            SCREENOUT: npsDataWithLite.SCREENOUT.length
        });
        
        // Filter out lite surveys (survey_type 0, 1, 2, 6, 8)
        const npsUserWavesWithoutLite = npsUserWavesWithLite.filter(npsUserWave => {
            const surveyType = npsUserWave.survey_type;
            return surveyType == 0 || surveyType == '1' || surveyType == '2' || surveyType == '6' || surveyType == '8';
        });
        console.log(`Filtered to ${npsUserWavesWithoutLite.length} records without lite surveys`);
        
        const npsDataWithoutLite = this.getProcessedData(npsUserWavesWithoutLite, sources);
        console.log('npsDataWithoutLite:', {
            COMPLETE: npsDataWithoutLite.COMPLETE.length,
            SCREENOUT: npsDataWithoutLite.SCREENOUT.length
        });
        
        const incidenceRatesWithLite = this.calculateIncidenceRates(npsDataWithLite);
        const incidenceRatesWithoutLite = this.calculateIncidenceRates(npsDataWithoutLite);
        
        console.log('Incidence rates with lite:', incidenceRatesWithLite);
        console.log('Incidence rates without lite:', incidenceRatesWithoutLite);
        
        const normalizedNpsData = this.normalizeData(npsDataWithLite, incidenceRatesWithLite, incidenceRatesWithoutLite);
        
        console.log('Final normalized data:', {
            COMPLETE: normalizedNpsData.COMPLETE.length,
            SCREENOUT: normalizedNpsData.SCREENOUT.length
        });
        
        return normalizedNpsData;
    }

    /**
     * Get Processed Data - matches PHP getProcessedData() method
     * Separates complete and screenout data for given sources
     */
    getProcessedData(npsUserWaves, sources) {
        console.log(`getProcessedData called with ${npsUserWaves.length} records and sources:`, sources);
        
        // Filter by sources
        const userWaves = npsUserWaves.filter(npsUserWave => 
            sources.includes(npsUserWave.source)
        );
        console.log(`After source filtering: ${userWaves.length} records`);

        // Separate completes and screenouts
        const completes = userWaves.filter(userWave => 
            userWave.status == 1 || userWave.status == 6
        );
        console.log(`Completes: ${completes.length} records`);

        const screenouts = userWaves.filter(userWave => 
            userWave.status == 2 || userWave.status == 3 || userWave.status == 4
        );
        console.log(`Screenouts: ${screenouts.length} records`);

        const npsData = {
            'COMPLETE': this.processSubmitData(completes),
            'SCREENOUT': this.processSubmitData(screenouts)
        };

        return npsData;
    }

    /**
     * Process Submit Data - matches PHP processSubmitData() method
     * Groups data by month and calculates metrics
     */
    processSubmitData(submitData) {
        console.log(`processSubmitData called with ${submitData.length} records`);
        const groupedData = {};

        // Process each entry
        submitData.forEach((entry, index) => {
            // Extract month from completed_date (YYYY-MM format)
            // Handle both string and Date objects
            let completedDate;
            if (entry.nps_completed_date instanceof Date) {
                completedDate = entry.nps_completed_date.toISOString();
            } else if (typeof entry.nps_completed_date === 'string') {
                completedDate = entry.nps_completed_date;
            } else {
                console.warn('Invalid nps_completed_date format:', entry.nps_completed_date);
                return; // Skip this entry
            }
            
            const month = completedDate.substring(0, 7);
            
            if (index < 5) { // Log first 5 entries for debugging
                console.log(`Entry ${index}: month=${month}, rating=${entry.rating}, status=${entry.status}`);
            }

            // Initialize group if it doesn't exist
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

            // Update group metrics
            groupedData[month].total_rating += entry.rating;
            groupedData[month].response_count += 1;

            // Categorize rating
            if (entry.rating >= 9) {
                groupedData[month].promoter_count += 1;
            } else if (entry.rating >= 7) {
                groupedData[month].passive_count += 1;
            } else {
                groupedData[month].detractor_count += 1;
            }
        });

        console.log(`Grouped data into ${Object.keys(groupedData).length} months:`, Object.keys(groupedData));

        // Transform to final output format
        const output = Object.values(groupedData).map(data => ({
            month: data.month,
            average_nps: data.response_count > 0 ? Math.round((data.total_rating / data.response_count) * 10) / 10 : 0,
            response_count: data.response_count,
            promoter_count: data.promoter_count,
            detractor_count: data.detractor_count,
            passive_count: data.passive_count
        }));

        // Sort by month descending
        output.sort((a, b) => b.month.localeCompare(a.month));
        
        console.log(`Final output: ${output.length} months with data`);
        if (output.length > 0) {
            console.log('Sample output entry:', output[0]);
        }

        return output;
    }

    /**
     * Calculate Incidence Rates - matches PHP calculateIncidenceRates() method
     */
    calculateIncidenceRates(npsData) {
        // Initialize response counts by month
        const responseCounts = { 'COMPLETE': {}, 'SCREENOUT': {} };
        
        ['COMPLETE', 'SCREENOUT'].forEach(key => {
            npsData[key].forEach(entry => {
                responseCounts[key][entry.month] = entry.response_count;
            });
        });

        // Calculate incidence rates
        const incidenceRates = {};

        npsData['COMPLETE'].forEach(entry => {
            const month = entry.month;
            const completesCount = responseCounts['COMPLETE'][month] || 0;
            const screenoutCount = responseCounts['SCREENOUT'][month] || 0;
            const totalCount = completesCount + screenoutCount;

            const incidenceRate = totalCount > 0 ? Math.round((completesCount / totalCount) * 10000) / 100 : 0;
            incidenceRates[month] = incidenceRate;
        });

        return incidenceRates;
    }

    /**
     * Normalize Data - matches PHP normalizeData() method
     */
    normalizeData(data, incidenceRateWithLite, incidenceRateWithoutLite) {
        ['COMPLETE', 'SCREENOUT'].forEach(key => {
            data[key].forEach(entry => {
                const month = entry.month;
                const currentResponseCount = entry.response_count;

                const rateWithLite = incidenceRateWithLite[month] || 0;
                const rateWithoutLite = incidenceRateWithoutLite[month] || 0;

                // Update COMPLETES response_count if condition is met
                if (key === 'COMPLETE') {
                    if (rateWithoutLite <= rateWithLite) {
                        entry.response_count = Math.round((currentResponseCount * rateWithoutLite) / 100);
                    }
                }

                // Update SCREENOUT response_count if condition is met
                if (key === 'SCREENOUT') {
                    if (rateWithoutLite > rateWithLite) {
                        entry.response_count = Math.round(currentResponseCount * (100 - rateWithoutLite) / 100);
                    }
                }

                // Update promoter, detractor, and passive counts
                const updatedResponseCount = entry.response_count;
                const totalOldCount = entry.promoter_count + entry.detractor_count + entry.passive_count;

                if (totalOldCount > 0) {
                    entry.promoter_count = Math.round((entry.promoter_count * updatedResponseCount) / totalOldCount);
                    entry.detractor_count = Math.round((entry.detractor_count * updatedResponseCount) / totalOldCount);
                    entry.passive_count = Math.round((entry.passive_count * updatedResponseCount) / totalOldCount);
                }
            });
        });

        return data;
    }

    /**
     * Summarize Data - matches PHP summarizeData() method
     */
    summarizeData(data) {
        console.log('summarizeData called with:', {
            COMPLETE: data.COMPLETE.length,
            SCREENOUT: data.SCREENOUT.length
        });
        
        const monthlyTotals = {};

        ['COMPLETE', 'SCREENOUT'].forEach(key => {
            data[key].forEach(entry => {
                const dateParts = entry.month.split('-');
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const keyForMonth = `${year}-${month}`;

                if (!monthlyTotals[keyForMonth]) {
                    monthlyTotals[keyForMonth] = {
                        year: year,
                        month: month,
                        total_response_count: 0,
                        promoter_count: 0,
                        detractor_count: 0,
                        passive_count: 0
                    };
                }

                monthlyTotals[keyForMonth].total_response_count += entry.response_count;
                monthlyTotals[keyForMonth].promoter_count += entry.promoter_count;
                monthlyTotals[keyForMonth].detractor_count += entry.detractor_count;
                monthlyTotals[keyForMonth].passive_count += entry.passive_count;
            });
        });

        // Convert to array and sort by year and month (newest first)
        const result = Object.values(monthlyTotals);
        result.sort((a, b) => {
            if (a.year === b.year) {
                return b.month - a.month; // Descending order
            }
            return b.year - a.year; // Descending order
        });

        console.log(`summarizeData result: ${result.length} months`);
        if (result.length > 0) {
            console.log('Sample summarized entry:', result[0]);
        }

        return result;
    }

    /**
     * Get NPS Time Series Data - API endpoint method
     */
    async getNPSTimeSeriesData(req, res) {
        try {
            console.log('=== getNPSTimeSeriesData START ===');
            const { dateRange, frequency } = req.query;
            console.log('Request params:', { dateRange, frequency });
            
            // Get raw NPS data (cached or fresh)
            let npsData;
            try {
                npsData = await this.getCachedNpsData();
                console.log(`Retrieved ${npsData.length} NPS records (from cache or fresh)`);
            } catch (dbError) {
                console.error('Database error:', dbError);
                // Return fallback data if database fails
                return res.json({
                    overall: [],
                    dashboard: [],
                    postSurvey: [],
                    completes: [],
                    screenouts: []
                });
            }
            
            // Check if we have data
            if (!npsData || npsData.length === 0) {
                console.log('No NPS data found, returning empty results');
                return res.json({
                    overall: [],
                    dashboard: [],
                    postSurvey: [],
                    completes: [],
                    screenouts: []
                });
            }
            
            console.log('=== Processing Overall Data ===');
            // Get data for different sources
            const overallData = await this.getData(npsData, [Source.DASHBOARD, Source.LOOP, Source.POST_SURVEY_MODULE]);
            
            console.log('=== Processing Dashboard Data ===');
            const dashboardData = await this.getData(npsData, [Source.DASHBOARD]);
            
            console.log('=== Processing Post Survey Data ===');
            const postSurveyData = await this.getData(npsData, [Source.POST_SURVEY_MODULE]);
            
            console.log('=== Summarizing Data ===');
            // Summarize data
            const overallPDTScores = this.summarizeData(overallData);
            const dashboardPDTScores = this.summarizeData(dashboardData);
            const postSurveyPDTScores = this.summarizeData(postSurveyData);
            
            // Filter data based on date range
            const filterDataByDateRange = (data) => {
                let startDate, endDate;
                
                // Parse dateRange parameter
                let parsedDateRange;
                try {
                    parsedDateRange = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;
                } catch (e) {
                    console.log('📅 Could not parse dateRange, using last 12 months as default');
                    parsedDateRange = { type: 'last12months' };
                }
                
                console.log('📅 Parsed dateRange:', parsedDateRange);
                
                if (parsedDateRange.type === 'all') {
                    // Return all data without filtering
                    console.log('📅 Returning all data without filtering');
                    return data;
                } else if (parsedDateRange.type === 'custom' && parsedDateRange.from && parsedDateRange.to) {
                    // Custom date range - handle both string dates and object format
                    if (typeof parsedDateRange.from === 'string' && typeof parsedDateRange.to === 'string') {
                        // String format (YYYY-MM-DD)
                        startDate = new Date(parsedDateRange.from);
                        endDate = new Date(parsedDateRange.to);
                    } else if (parsedDateRange.from.month && parsedDateRange.from.year && 
                               parsedDateRange.to.month && parsedDateRange.to.year) {
                        // Object format ({month: 1, year: 2024})
                        startDate = new Date(parsedDateRange.from.year, parsedDateRange.from.month - 1, 1);
                        endDate = new Date(parsedDateRange.to.year, parsedDateRange.to.month, 0); // Last day of the month
                    } else {
                        console.log('📅 Invalid custom date range format, using last 12 months');
                        // Fallback to last 12 months
                        const currentDate = new Date();
                        startDate = new Date();
                        startDate.setMonth(currentDate.getMonth() - 11);
                        startDate.setDate(1);
                        endDate = currentDate;
                    }
                    
                    console.log(`📅 Custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
                } else {
                    // Default to last 12 months
                    const currentDate = new Date();
                    startDate = new Date();
                    startDate.setMonth(currentDate.getMonth() - 11);
                    startDate.setDate(1); // Start of month
                    endDate = currentDate;
                    
                    console.log(`📅 Last 12 months range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
                }
                
                const filteredData = data.filter(entry => {
                    const entryDate = new Date(entry.year, entry.month - 1);
                    const isInRange = entryDate >= startDate && entryDate <= endDate;
                    console.log(`📅 Entry ${entry.year}-${entry.month}: ${entryDate.toISOString()} - In range: ${isInRange}`);
                    return isInRange;
                });
                
                console.log(`📅 Filtered ${data.length} entries to ${filteredData.length} entries`);
                return filteredData;
            };
            
            const filteredOverallPDTScores = filterDataByDateRange(overallPDTScores);
            const filteredDashboardPDTScores = filterDataByDateRange(dashboardPDTScores);
            const filteredPostSurveyPDTScores = filterDataByDateRange(postSurveyPDTScores);
            
            console.log('=== Calculating NPS Scores ===');
            // Calculate NPS scores
            const calculateNPS = (data) => {
                console.log(`calculateNPS called with ${data.length} entries`);
                return data.map(entry => {
                    const total = entry.promoter_count + entry.detractor_count + entry.passive_count;
                    const nps = total > 0 ? Math.round(((entry.promoter_count - entry.detractor_count) / total) * 100) : 0;
                    return {
                        ...entry,
                        nps_score: nps
                    };
                });
            };

            const overall = calculateNPS(filteredOverallPDTScores);
            const dashboard = calculateNPS(filteredDashboardPDTScores);
            const postSurvey = calculateNPS(filteredPostSurveyPDTScores);

            // Get completes and screenouts data for Post Survey
            const completes = postSurveyData.COMPLETE || [];
            const screenouts = postSurveyData.SCREENOUT || [];

            // Filter completes and screenouts based on date range
            const filterDataByDateRangeForData = (data) => {
                let startDate, endDate;
                
                // Parse dateRange parameter
                let parsedDateRange;
                try {
                    parsedDateRange = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;
                } catch (e) {
                    console.log('📅 Could not parse dateRange, using last 12 months as default');
                    parsedDateRange = { type: 'last12months' };
                }
                
                if (parsedDateRange.type === 'custom' && parsedDateRange.from && parsedDateRange.to) {
                    // Custom date range - handle both string dates and object format
                    if (typeof parsedDateRange.from === 'string' && typeof parsedDateRange.to === 'string') {
                        // String format (YYYY-MM-DD)
                        startDate = new Date(parsedDateRange.from);
                        endDate = new Date(parsedDateRange.to);
                    } else if (parsedDateRange.from.month && parsedDateRange.from.year && 
                               parsedDateRange.to.month && parsedDateRange.to.year) {
                        // Object format ({month: 1, year: 2024})
                        startDate = new Date(parsedDateRange.from.year, parsedDateRange.from.month - 1, 1);
                        endDate = new Date(parsedDateRange.to.year, parsedDateRange.to.month, 0); // Last day of the month
                    } else {
                        console.log('📅 Invalid custom date range format, using last 12 months');
                        // Fallback to last 12 months
                        const currentDate = new Date();
                        startDate = new Date();
                        startDate.setMonth(currentDate.getMonth() - 11);
                        startDate.setDate(1);
                        endDate = currentDate;
                    }
                    
                    console.log(`📅 Custom date range for completes/screenouts: ${startDate.toISOString()} to ${endDate.toISOString()}`);
                } else {
                    // Default to last 12 months
                    const currentDate = new Date();
                    startDate = new Date();
                    startDate.setMonth(currentDate.getMonth() - 11);
                    startDate.setDate(1); // Start of month
                    endDate = currentDate;
                    
                    console.log(`📅 Last 12 months range for completes/screenouts: ${startDate.toISOString()} to ${endDate.toISOString()}`);
                }
                
                const filteredData = data.filter(entry => {
                    const entryDate = new Date(entry.month + '-01'); // entry.month is "YYYY-MM" format
                    const isInRange = entryDate >= startDate && entryDate <= endDate;
                    console.log(`📅 Entry ${entry.month}: ${entryDate.toISOString()} - In range: ${isInRange}`);
                    return isInRange;
                });
                
                console.log(`📅 Filtered ${data.length} completes/screenouts to ${filteredData.length} entries`);
                return filteredData;
            };

            const filteredCompletes = filterDataByDateRangeForData(completes);
            const filteredScreenouts = filterDataByDateRangeForData(screenouts);

            // Calculate NPS for completes and screenouts
            const calculateNPSForData = (data) => {
                return data.map(entry => {
                    const total = entry.response_count;
                    const nps = total > 0 ? Math.round(((entry.promoter_count - entry.detractor_count) / total) * 100) : 0;
                    return {
                        ...entry,
                        nps_score: nps
                    };
                });
            };

            const completesWithNPS = calculateNPSForData(filteredCompletes);
            const screenoutsWithNPS = calculateNPSForData(filteredScreenouts);

            const response = {
                overall: overall,
                dashboard: dashboard,
                postSurvey: postSurvey,
                completes: completesWithNPS,
                screenouts: screenoutsWithNPS
            };

            console.log('=== FINAL RESPONSE ===');
            console.log('Response structure:', {
                overall: response.overall.length,
                dashboard: response.dashboard.length,
                postSurvey: response.postSurvey.length,
                completes: response.completes.length,
                screenouts: response.screenouts.length
            });
            
            if (response.overall.length > 0) {
                console.log('Sample overall entry:', response.overall[0]);
            }
            if (response.dashboard.length > 0) {
                console.log('Sample dashboard entry:', response.dashboard[0]);
            }
            if (response.postSurvey.length > 0) {
                console.log('Sample postSurvey entry:', response.postSurvey[0]);
            }
            if (response.completes.length > 0) {
                console.log('Sample completes entry:', response.completes[0]);
            }
            if (response.screenouts.length > 0) {
                console.log('Sample screenouts entry:', response.screenouts[0]);
            }

            console.log('=== SENDING RESPONSE TO CLIENT ===');
            res.json(response);
            console.log('=== getNPSTimeSeriesData END ===');
        } catch (error) {
            console.error('Error in getNPSTimeSeriesData:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get NPS Summary Metrics - API endpoint method
     */
    async getNPSSummaryMetrics(req, res) {
        try {
            const npsData = await this.getNpsData();
            const overallData = await this.getData(npsData, [Source.DASHBOARD, Source.LOOP, Source.POST_SURVEY_MODULE]);
            const overallPDTScores = this.summarizeData(overallData);
            
            // Calculate current month metrics
            const currentMonth = new Date().toISOString().substring(0, 7);
            const currentMonthData = overallPDTScores.find(entry => 
                `${entry.year}-${entry.month.toString().padStart(2, '0')}` === currentMonth
            ) || overallPDTScores[overallPDTScores.length - 1];

            if (currentMonthData) {
                const total = currentMonthData.promoter_count + currentMonthData.detractor_count + currentMonthData.passive_count;
                const nps = total > 0 ? Math.round(((currentMonthData.promoter_count - currentMonthData.detractor_count) / total) * 100) : 0;
                
                res.json({
                    currentNPS: nps,
                    totalResponses: currentMonthData.total_response_count,
                    promoters: currentMonthData.promoter_count,
                    detractors: currentMonthData.detractor_count,
                    passives: currentMonthData.passive_count
                });
            } else {
                res.json({
                    currentNPS: 0,
                    totalResponses: 0,
                    promoters: 0,
                    detractors: 0,
                    passives: 0
                });
            }
        } catch (error) {
            console.error('Error in getNPSSummaryMetrics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get NPS Detailed Data - API endpoint method
     */
    async getNPSDetailedData(req, res) {
        try {
            const { dateRange, source } = req.query;
            
            const npsData = await this.getNpsData();
            
            let sources = [Source.DASHBOARD, Source.LOOP, Source.POST_SURVEY_MODULE];
            if (source) {
                const sourceMap = {
                    'dashboard': [Source.DASHBOARD],
                    'loop': [Source.LOOP],
                    'post-survey': [Source.POST_SURVEY_MODULE]
                };
                sources = sourceMap[source] || sources;
            }
            
            const detailedData = await this.getData(npsData, sources);
            
            res.json(detailedData);
        } catch (error) {
            console.error('Error in getNPSDetailedData:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new NPSModel(); 