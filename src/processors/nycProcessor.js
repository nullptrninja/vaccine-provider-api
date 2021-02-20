const axios = require('axios');
//const cheerio = require('cheerio');
const _ = require('underscore');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

/* payload looks like:
    {
        name: string
        total_available: int
        url: string
        borough_county: string ex: "Brooklyn"
        slots: [] - we can ignore this one since it's count is aggregated by total_available
    }
*/
// Apologies in advance to nycvaccinelist.com, it was simply easier to pull from your already aggregated source
class NycProcessor extends BaseProcessor {
    constructor() {
        super();
        // Not sure if the hash in the URL is dynamically generated or not, but we'll find out soon enough
        this._queryUrlTemplate = 'https://nycvaccinelist.com/_next/data/OGEuAf55KCDKYApu1V7h0/index.json';
    }

    async fetchVaccineInfo(filters) {
        // filters:        
        //   city: string, e.g.: "QUEENS" or "*" <optional>

        filters = _.pick(filters, 'city') || { city: '*' };        
        var city = filters.city ? filters.city.toUpperCase() : '*';

        const queryUrl = this._queryUrlTemplate;
        const result = await axios.get(queryUrl);

        if (result.status === 200) {
            // Cheerio experimental for now
            // const htmlData = result.data;
            // const $ = cheerio.load(htmlData);
            // const embeddedJsonSiteList = $('script[id="__NEXT_DATA__"]').text();
            // const payloadData = JSON.parse(embeddedJsonSiteList);
            const payloadData = result.data;

            if (payloadData && payloadData.pageProps) {
                // Because of how dense this data set is, we'll only add locations with slots
                var siteArray = payloadData.pageProps.locations.locationsWithSlots;

                // Apply filter if needed
                if (city != '*') {
                    siteArray = _.filter(siteArray, function(d) {
                        return d.borough_county.toUpperCase().startsWith(city);
                    });
                }

                var self = this;
                var outputModels = _.map(siteArray, function (o) {
                    return self.transformToSiteModel(o);
                })

                var procResult = new ProcessorResult();
                procResult.timestamp = 'Unavailable';
                procResult.siteData = outputModels;

                return procResult;
            }
        }

        return null;
    }

    transformToSiteModel(inputModel) {        
        var areSlotsAvailable = inputModel.total_available > 0;

        var siteModel = new VaccinationSiteModel();
        siteModel.availableSlots = inputModel.total_available;
        siteModel.hasAppointmentsAvailable = areSlotsAvailable;
        siteModel.city = inputModel.borough_county;
        siteModel.state = 'NY';
        siteModel.status = inputModel.publicNotes;
        siteModel.bookingUrl = inputModel.url;
        siteModel.siteName = inputModel.name;

        return siteModel;
    }
}

module.exports = NycProcessor;
