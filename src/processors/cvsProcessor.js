const puppeteer = require('puppeteer');
const _ = require('underscore');
const BaseProcessor = require('./baseProcessor');
const ProcessorResult = require('../models/processorResult');
const VaccinationSiteModel = require('../models/vaccinationSiteModel');

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
        var state = filters.state.toUpperCase();
        var city = filters.city ? filters.city.toUpperCase() : '*';

        const queryUrl = this._queryUrlTemplate.replace('{{STATE}}', state);
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

        var payloadData = content.responsePayloadData;
        var stateDataArray = payloadData.data[state];

        // Apply filter if needed
        if (city != '*') {
            stateDataArray = _.filter(stateDataArray, function(d) {
                return d.city.toUpperCase() === city;
            });
        }

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

        var self = this;
        var outputModels = _.map(stateDataArray, function (o) {
            return self.transformToSiteModel(o);
        })

        var result = new ProcessorResult();
        result.timestamp = payloadData.currentTime;
        result.siteData = outputModels;

        return result;
    }

    transformToSiteModel(inputModel) {
        // inputModel is one of the elements within the array inside of the <STATE> field
        var siteModel = new VaccinationSiteModel();
        siteModel.availableSlots = parseInt(inputModel.totalAvailable);
        siteModel.hasAppointmentsAvailable = siteModel.availableSlots > 0;
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
