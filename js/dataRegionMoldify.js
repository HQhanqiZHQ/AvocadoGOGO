// dataRegionMoldigy.js
console.log("in main")
const locationToStateMap = {
    'Albany': ['NY'],
    'Atlanta': ['GA'],
    'BaltimoreWashington': ['MD', 'DC', 'VA'],
    'Boise': ['ID'],
    'Boston': ['MA'],
    'BuffaloRochester': ['NY'],
    'California': ['CA'],
    'Charlotte': ['NC'],
    'Chicago': ['IL'],
    'CincinnatiDayton': ['OH'],
    'Columbus': ['OH'],
    'DallasFtWorth': ['TX'],
    'Denver': ['CO'],
    'Detroit': ['MI'],
    'GrandRapids': ['MI'],
    'GreatLakes': ['MI', 'WI', 'IL', 'IN', 'OH'],
    'HarrisburgScranton': ['PA'],
    'HartfordSpringfield': ['CT', 'MA'],
    'Houston': ['TX'],
    'Indianapolis': ['IN'],
    'Jacksonville': ['FL'],
    'LasVegas': ['NV'],
    'LosAngeles': ['CA'],
    'Louisville': ['KY'],
    'MiamiFtLauderdale': ['FL'],
    'Midsouth': ['TN', 'KY', 'MS', 'AL'],
    'Nashville': ['TN'],
    'NewOrleansMobile': ['LA', 'AL'],
    'NewYork': ['NY'],
    'Northeast': ['NY', 'NJ', 'PA', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME'],
    'NorthernNewEngland': ['ME', 'NH', 'VT'],
    'Orlando': ['FL'],
    'Philadelphia': ['PA'],
    'PhoenixTucson': ['AZ'],
    'Pittsburgh': ['PA'],
    'Plains': ['KS', 'NE', 'SD', 'ND'],
    'Portland': ['OR'],
    'RaleighGreensboro': ['NC'],
    'RichmondNorfolk': ['VA'],
    'Roanoke': ['VA'],
    'Sacramento': ['CA'],
    'SanDiego': ['CA'],
    'SanFrancisco': ['CA'],
    'Seattle': ['WA'],
    'SouthCarolina': ['SC'],
    'SouthCentral': ['TX', 'OK', 'AR', 'LA'],
    'Southeast': ['GA', 'FL', 'AL', 'SC', 'NC', 'TN'],
    'Spokane': ['WA'],
    'StLouis': ['MO'],
    'Syracuse': ['NY'],
    'Tampa': ['FL'],
    'TotalUS': ['ALL'],
    'West': ['CA', 'OR', 'WA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM'],
    'WestTexNewMexico': ['TX', 'NM']
};

function mapLocationToStates(location) {
    return locationToStateMap[location] || null;
}

function getAllUniqueStates(locations) {
    return [...new Set(
        locations
            .map(location => locationToStateMap[location])
            .filter(states => states) // Remove null values
            .flat()
            .filter(state => state !== 'ALL') // Remove 'ALL' placeholder
    )].sort();
}

// // Usage examples:
// const locations = ['Albany', 'Atlanta', 'BaltimoreWashington'];
// const states = getAllUniqueStates(locations);
// console.log(states); // ['DC', 'GA', 'MD', 'NY', 'VA']
//
// // Get states for a single location
// console.log(mapLocationToStates('BaltimoreWashington')); // ['MD', 'DC', 'VA']

let avocado_data;
let indStates;
let multiStates;
d3.csv("data/avocado.csv").then(data => {
    // console.log(data[0].region)
    const uniqueRegions = [...new Set(data.map(item => item.region))];
    console.log(uniqueRegions)
    avocado_data = data;

    const result1 = {};
    const result2 = {};
    avocado_data.forEach(row => {
        const states = mapLocationToStates(row.region);

        // Only process if region maps to exactly one state
        if (states && states.length === 1) {
            const state = states[0];

            // Initialize array for state if it doesn't exist
            if (!result1[state]) {
                result1[state] = [];
            }

            // Add the row to the appropriate state array
            result1[state].push(row);
        }
        else if (states && states.length > 1) {  // Check if states exists and has multiple entries
            states.forEach(state => {
                // Initialize array for state if it doesn't exist
                if (!result2[state]) {
                    result2[state] = [];
                }

                result2[state].push(row);
            });
        }
    });
    console.log(result2)

    indStates = new IndividualState(result1);
    multiStates = new MultiStates(result2);

})