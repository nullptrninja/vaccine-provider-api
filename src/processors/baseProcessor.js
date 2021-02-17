const ProcessorResult = require('../models/processorResult');

class BaseProcessor {    
    async fetchVaccineInfo(filters) {
        // filters:
        //   state: string, e.g.: "NY"
        //   city: string, "QUEENS"

        return new ProcessorResult();
    }
}

module.exports = BaseProcessor;
