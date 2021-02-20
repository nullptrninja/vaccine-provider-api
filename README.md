# vaccine-provider-api
Local web server + API that pulls vaccine appointment availability from multiple data sources. This is my first foray into NodeJS so be gentle.

In the quest to find various stubborn parents a vaccine appointment, it would be useful if you can easily pull together data from various sources using publicaly available APIs and into an easy to use singular API. This project provides an extensible platform that can back various front-end access points (for example: https://github.com/nullptrninja/discord-vaccine-finder-bot) to provide them with parsable JSON data in a consistent data model format.

## Installation
Installation steps (including docker support) are still WIP. For now you can do it manually:
1. `npm install`
2. `node ./src/main.js`
3. (Optional) Modify `production.settings.json` and change the listening port as needed.

## Usage
This was based on NodeJS' default HTTP project as a starting point, so for now it deploys to `localhost:3000` but the port is configurable.

You can make HTTP calls to the following endpoints:

### Get vaccine appointments
`/schedules/{provider}/{state}/{city}`  
**provider**: one of the available provider names (see below). For example `cvs`  
**state**: the 2-character state code. For example `ny`  
**city**: (Optional) the name of a specific city that appears in the provider's vaccination site list. It's recommended you run without specifying `city` at first to see what cities are actually available. Specifying city will only show that city's appointment status. Cities with a space should use an underscore in place of the space.
  
EXAMPLE:  
`http://localhost:3000/schedules/cvs/ny/new_york`  

### List vaccine providers  
`/list/providers`  
Shows a list of the currently supported vaccine providers. These are the current providers so far:  
1. `cvs`: This is CVS Pharmacy
2. `nys`: This is New York State's government managed list
3. `nyc`: This is a list from https://nycvaccinelist.com for NYC sites with available appointments. We reduce their dataset significantly so go there if you want more detailed data.
