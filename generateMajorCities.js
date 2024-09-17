// generateMajorCities.js
const fs = require('fs');
const readline = require('readline');

// Mapping of state abbreviations to state FIPS codes
const stateAbbrToFIPS = {
  'AL': '01',
  'AK': '02',
  'AZ': '04',
  'AR': '05',
  'CA': '06',
  'CO': '08',
  'CT': '09',
  'DE': '10',
  'DC': '11',
  'FL': '12',
  'GA': '13',
  'HI': '15',
  'ID': '16',
  'IL': '17',
  'IN': '18',
  'IA': '19',
  'KS': '20',
  'KY': '21',
  'LA': '22',
  'ME': '23',
  'MD': '24',
  'MA': '25',
  'MI': '26',
  'MN': '27',
  'MS': '28',
  'MO': '29',
  'MT': '30',
  'NE': '31',
  'NV': '32',
  'NH': '33',
  'NJ': '34',
  'NM': '35',
  'NY': '36',
  'NC': '37',
  'ND': '38',
  'OH': '39',
  'OK': '40',
  'OR': '41',
  'PA': '42',
  'RI': '44',
  'SC': '45',
  'SD': '46',
  'TN': '47',
  'TX': '48',
  'UT': '49',
  'VT': '50',
  'VA': '51',
  'WA': '53',
  'WV': '54',
  'WI': '55',
  'WY': '56',
  // Territories
  'AS': '60', // American Samoa
  'GU': '66', // Guam
  'MP': '69', // Northern Mariana Islands
  'PR': '72', // Puerto Rico
  'VI': '78', // U.S. Virgin Islands
};

// Set of valid country codes
const validCountryCodes = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP']);

// Create a read stream for the US.txt file
const fileStream = fs.createReadStream('US.txt');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

const majorCities = [];

// Important cities to include regardless of population
const importantCities = new Set(['San Juan', 'Hagatna', 'Agana', 'Charlotte Amalie', 'Pago Pago']);

rl.on('line', (line) => {
  const fields = line.split('\t');

  // Extract relevant fields
  const geonameid = fields[0];
  const name = fields[1];
  const asciiname = fields[2];
  const alternatenames = fields[3];
  const latitude = fields[4];
  const longitude = fields[5];
  const featureClass = fields[6];
  const featureCode = fields[7];
  const countryCode = fields[8];
  const admin1Code = fields[10];
  const population = parseInt(fields[14], 10) || 0;

  // Filter by country code
  if (!validCountryCodes.has(countryCode)) {
    return;
  }

  // Check for missing admin1Code
  if (!admin1Code || admin1Code.trim() === '') {
    console.warn(`Missing state abbreviation for geonameid: ${geonameid} in country: ${countryCode}`);
    return;
  }

  // Get the state FIPS code
  const stateFIPS = stateAbbrToFIPS[admin1Code];

  if (!stateFIPS) {
    console.warn(`Unknown state abbreviation: '${admin1Code}' for geonameid: ${geonameid} in country: ${countryCode}`);
    return;
  }

  // Filter criteria
  const isPopulatedPlace = featureClass === 'P';
  const isMajorFeatureCode = ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC'].includes(featureCode);
  const hasSufficientPopulation = population >= 50000;
  const isImportantCity = importantCities.has(asciiname);

  if (isPopulatedPlace && isMajorFeatureCode && (hasSufficientPopulation || isImportantCity)) {
    majorCities.push({
      geonameid,
      name: asciiname,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      stateId: stateFIPS,
      population,
    });
  }
});

rl.on('close', () => {
  // Write the data to majorCities.json
  fs.writeFileSync('majorCities.json', JSON.stringify(majorCities, null, 2));
  console.log('majorCities.json has been created.');
});