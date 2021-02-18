const puppeteer = require('puppeteer');
const _ = require('underscore');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

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
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],   // We'll be running in isolated container so no-sandbox maybe is ok?
        });

        const page = await browser.newPage();
        await page.goto(queryUrl);

        var content = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        await browser.close();

        var payloadData = content;
        var siteArray = payloadData.providerList;

        // Apply filter if needed
        if (city != '*') {
            siteArray = _.filter(siteArray, function(d) {
                return d.address.toUpperCase().startsWith(city);
            });
        }

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

        var self = this;
        var outputModels = _.map(siteArray, function (o) {
            return self.transformToSiteModel(o);
        })

        var result = new ProcessorResult();
        result.timestamp = payloadData.lastUpdated;
        result.siteData = outputModels;

        return result;
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
