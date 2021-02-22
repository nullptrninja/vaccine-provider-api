const ProcessorResult = require('../models/processorResult');

class BaseProcessor {    
    constructor(settings) {
        this._settings = settings;
        this._cachedDataSet = null;
        this._cacheDataSetKey = null;
        this._dataSetCachedTimeStamp = Date.now();
    }

    getCachedDataSet(optionalDataSetKey) {
        if (optionalDataSetKey && !this._cacheDataSetKey) {            
            console.log(`No such cache with key: ${optionalDataSetKey}, returning nothing`);
            return null;            
        }

        if (this._settings.enableDataSetCaching === true && this._cachedDataSet) {
            const elapsedSeconds = (Date.now() - this._dataSetCachedTimeStamp) / 1000;
            if (elapsedSeconds > this._settings.dataSetCachingDurationSeconds) {
                return null;
            }

            return this._cachedDataSet;
        }

        return null;
    }

    saveDataSet(dataSet, optionalDataSetKey) {
        if (this._settings.enableDataSetCaching) {
            this._cachedDataSet = dataSet;
            this._dataSetCachedTimeStamp = Date.now();
            
            if (optionalDataSetKey) {
                this._cacheDataSetKey = optionalDataSetKey;
            }
        }
    }

    async fetchVaccineInfo(filters) {
        return new ProcessorResult();
    }
}

module.exports = BaseProcessor;
