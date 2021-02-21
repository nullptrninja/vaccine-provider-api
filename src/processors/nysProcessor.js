const axios = require('axios');
const _ = require('underscore');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

/* payload looks like:
    {
        lastUpdated: "MM/dd/YYYY HH:mm:ss AM/PM"
        providerList: [
        {
            providerName: string
            address: string, "CITY, NY"
            availableAppointments: "NAC" | "AA"
        }
    ]
    }
*/
class NysProcessor extends BaseProcessor {
    constructor() {
        super();
        this._queryUrlTemplate = 'https://am-i-eligible.covid19vaccine.health.ny.gov/api/list-providers';
    }

    async fetchVaccineInfo(filters) {
        // filters:        
        //   city: string, e.g.: "BETHPAGE" or "*" <optional>

        filters = _.pick(filters, 'city') || { city: '*' };        
        var city = filters.city ? filters.city.toUpperCase() : '*';

        const queryUrl = this._queryUrlTemplate;
        const result = await axios.get(queryUrl)
                                    .catch(function(err) {
                                        console.log(`fetchVaccineInfo threw an error while fetching NYS data: ${err}`);
                                        result = null;
                                    });

        if (result && result.status === 200) {
            const payloadData = result.data;
            var siteArray = payloadData.providerList;

            // Apply filter if needed
            if (city != '*') {
                siteArray = _.filter(siteArray, function(d) {
                    return d.address.toUpperCase().startsWith(city);
                });
            }

            var self = this;
            var outputModels = _.map(siteArray, function (o) {
                return self.transformToSiteModel(o);
            })

            var procResult = new ProcessorResult();
            procResult.timestamp = payloadData.lastUpdated;
            procResult.siteData = outputModels;

            return procResult;
        }

        return null;
    }

    transformToSiteModel(inputModel) {
        // inputModel is one of the elements within the array inside of the <STATE> field
        var areSlotsAvailable = inputModel.availableAppointments === 'AA';

        var siteModel = new VaccinationSiteModel();
        siteModel.availableSlots = 'n/a';
        siteModel.hasAppointmentsAvailable = areSlotsAvailable;
        siteModel.city = inputModel.address.replace(', NY', '');
        siteModel.state = 'NY';
        siteModel.status = inputModel.availableAppointments;
        siteModel.bookingUrl = 'https://am-i-eligible.covid19vaccine.health.ny.gov/Public/prescreener';        // Static URL, can't deep link into this one
        siteModel.siteName = inputModel.providerName;

        return siteModel;
    }
}

module.exports = NysProcessor;
