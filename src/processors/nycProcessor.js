const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('underscore');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

const regexDataFragmentHash = /\/_next\/static\/([a-zA-Z0-9\_]+)\/_ssgManifest.js$/
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
    constructor(settings) {
        super(settings);
        this._htmlLandingPage = 'https://nycvaccinelist.com';
        this._jsonUrlTemplate = 'https://nycvaccinelist.com/_next/data/{{HASH}}/index.json';
    }

    async fetchVaccineInfo(filters) {
        // filters:        
        //   city: string, e.g.: "QUEENS" or "*" <optional>

        filters = _.pick(filters, 'city') || { city: '*' };        
        var city = filters.city ? filters.city.toUpperCase() : '*';

        const queryUrl = this._htmlLandingPage;
        var result = await axios.get(queryUrl)
                                .catch(function(err) {
                                    console.log(`fetchVaccineInfo threw error: ${err}`);
                                    result = null;
                                });

        if (result && result.status === 200) {            
            const htmlData = result.data;
            const $ = cheerio.load(htmlData);
            const hintAttribute = $("script[src*='/_ssgManifest.js']");

            if (!hintAttribute || hintAttribute.length === 0) {
                console.log('NYC Processor could not find hint attribute');
                return null;
            }

            const srcText = hintAttribute[0].attribs.src;
            const matches = regexDataFragmentHash.exec(srcText);

            if (!matches || matches.length != 2) {
                console.log('NYC Processor found an unexpected number of data fragment hashes in the HTML. Page may have changed.');
                return null;
            }
            
            const hashKey = matches[1];            
            var jsonFetchResult = null;
            const cachedDataSet = super.getCachedDataSet(hashKey);

            if (!cachedDataSet) {
                const jsonQueryUrl = this._jsonUrlTemplate.replace('{{HASH}}', hashKey);
                jsonFetchResult = await axios.get(jsonQueryUrl)
                                                    .catch(function(err){
                                                        console.log(`Attempt to retrieve JSON feed using hash: ${hashKey} failed: ${err}`)
                                                        jsonFetchResult = null;
                                                    });
            }

            if (cachedDataSet || (jsonFetchResult && jsonFetchResult.status == 200 && jsonFetchResult.data)) {                
                // Because of how dense this data set is, we'll only add locations with slots
                const payloadData = cachedDataSet || jsonFetchResult.data;
                var siteArray = cachedDataSet || payloadData.pageProps.locations.locationsWithSlots;
                super.saveDataSet(siteArray, hashKey);

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
