const http = require('http');
const fs = require("fs");
const CvsProcessor = require('./processors/cvsProcessor');
const NysProcessor = require('./processors/nysProcessor');

const settings = JSON.parse(fs.readFileSync('./production.settings.json'));
const hostname = '127.0.0.1';
const port = settings.apiPort;

const regexRootRoute = /^(\/[\w]+\/)*/
const regexRouteParam1 = /^\/[\w]+\/([\w]+)/
const regexRouteParam2 = /^\/[\w]+\/[\w]+\/([\w]+)/
const regexRouteParam3 = /^\/[\w]+\/[\w]+\/[\w]+\/([\w]+)/

const routeTable = {
  '/schedules/': handleRouteSchedules,
  '/list/': handleList
};

const registeredProcessors = {
  'cvs': new CvsProcessor(),
  'nys': new NysProcessor()
};

function denormalizeUrlPathParams(path) {
  // Technically we can just url decode, but i wanted to keep the URLs looking cleaner for ease of use. So we do some light normalization here.
  return path.replace('_', ' ');
}

// /available/*
async function handleRouteSchedules(method, url, res) {
  var resultData = null;

  if (method === 'GET') {
    // /schedules/{VACCINE_PROVIDER}/{STATE}/{CITY}/

    // Param 1 is the vaccination provider (e.g.: CVS, NYS, Walgreens, etc)
    let availabilitySourceName = regexRouteParam1.exec(url)[1].toLowerCase();

    // Param 2 is the state <required>. This is the 2 character code. No spaces.
    let state = regexRouteParam2.exec(url)[1].toUpperCase();

    // Param 3 is the city <optional>. Defaults to wild card if missing. Encoded (not URL, but our own) spaces may exist so we gotta denormalize them
    let parseCity = regexRouteParam3.exec(url);
    let city = parseCity != null ? denormalizeUrlPathParams(parseCity[1].toUpperCase()) : '*';

    let filters = {
      state: state,
      city: city
    };

    // Get appropriate processor
    var proc = registeredProcessors[availabilitySourceName];
    if (proc != undefined) {
      resultData = await proc.fetchVaccineInfo(filters);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(resultData));
    return;
  }
  
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end('Not found');  
}

// /list/*
async function handleList(method, url, res) {
  if (method === 'GET') {
    let topicName = regexRouteParam1.exec(url)[1].toLowerCase();

    // /list/providers
    if (topicName === 'providers') {
      var providerNames = Object.getOwnPropertyNames(registeredProcessors);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(providerNames));
      return;
    }
  }

  res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end('Not found');
}

const server = http.createServer(async (req, res) => {
  var { method, url } = req;

  var getRouteKey = regexRootRoute.exec(url);
  if (getRouteKey != null && getRouteKey.length > 1) {
    var routeKey = getRouteKey[1];
    await routeTable[routeKey](method, url, res);
  }
  else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Derp');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
