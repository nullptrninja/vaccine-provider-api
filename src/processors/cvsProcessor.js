const axios = require('axios');
const _ = require('underscore');
const moment = require('moment-timezone');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

/* payload looks like:
{
    currentTime: string,
    isBookingCompleted: bool, no idea what this is for
    data: {
        <STATE>: [
            {
                totalAvailable: int as string,
                city: upper case string,
                state: upper case string,
                pctAvailable: 0.00% as string
                status: string, e.g.: "Fully Booked"
            }
        ]
    }
}
*/

class CvsProcessor extends BaseProcessor {
    constructor() {
        super();
        this._queryUrlTemplate = 'https://www.cvs.com/immunizations/covid-19-vaccine/immunizations/covid-19-vaccine.vaccine-status.{{STATE}}.json';
    }

    async fetchVaccineInfo(filters) {
        // filters:
        //   state: string, e.g.: "NY"  <required>
        //   city: string, e.g.: "BETHPAGE" or "*" <optional>

        filters = _.pick(filters, 'state', 'city') || { state: 'NY' };
        const state = filters.state.toUpperCase();
        const city = filters.city ? filters.city.toUpperCase() : '*';

        const queryUrl = this._queryUrlTemplate.replace('{{STATE}}', state);        
        const result = await axios.get(queryUrl);

        if (result.status === 200) {            
            const payloadData = result.data.responsePayloadData;
            var stateDataArray = payloadData.data[state];

            // Apply filter if needed
            if (city != '*') {
                stateDataArray = _.filter(stateDataArray, function(d) {
                    return d.city.toUpperCase() === city;
                });
            }

            const self = this;
            const outputModels = _.map(stateDataArray, function (o) {
                return self.transformToSiteModel(o);
            })

            var procResult = new ProcessorResult();
            procResult.timestamp = moment.tz(payloadData.currentTime, 'MST').tz('EST').format('hh:mm A') + ' EST';      // CVS gives us mountain time
            procResult.siteData = outputModels;

            return procResult;
        }

        // Sorry.
        // Main will check for truthy result and handle accordingly
        return null;
    }

    transformToSiteModel(inputModel) {
        // inputModel is one of the elements within the array inside of the <STATE> field
        var siteModel = new VaccinationSiteModel();
        siteModel.availableSlots = parseInt(inputModel.totalAvailable);
        siteModel.hasAppointmentsAvailable = inputModel.status === 'Available' || inputModel.availableSlots > 0;       // Slots don't always come back as non-zero when available
        siteModel.city = inputModel.city;
        siteModel.state = inputModel.state;
        siteModel.status = inputModel.status;
        siteModel.bookingUrl = 'https://www.cvs.com/immunizations/covid-19-vaccine';        // Static URL, can't deep link into this one
        siteModel.siteName = 'CVS Pharmacy';        // We don't get a name back but I guess we can assume they're all CVSs? Not like this is gonna be
                                                    // one of those Taco Bell + KFC situations I guess; although Target + CVS is a possibility.

        return siteModel;
    }
}

module.exports = CvsProcessor;
