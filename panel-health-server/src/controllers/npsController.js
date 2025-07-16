const NPSModel = require('../models/npsModel');

const npsController = {
    /**
     * Get NPS Time Series Data
     */
    async getNPSTimeSeriesData(req, res) {
        try {
            await NPSModel.getNPSTimeSeriesData(req, res);
        } catch (error) {
            console.error('Error in npsController.getNPSTimeSeriesData:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    /**
     * Get NPS Summary Metrics
     */
    async getNPSSummaryMetrics(req, res) {
        try {
            await NPSModel.getNPSSummaryMetrics(req, res);
        } catch (error) {
            console.error('Error in npsController.getNPSSummaryMetrics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    /**
     * Get NPS Detailed Data
     */
    async getNPSDetailedData(req, res) {
        try {
            await NPSModel.getNPSDetailedData(req, res);
        } catch (error) {
            console.error('Error in npsController.getNPSDetailedData:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },


};

module.exports = npsController; 