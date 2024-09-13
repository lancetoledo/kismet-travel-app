// generateCountyNames.js
const fs = require('fs');
const csv = require('csv-parser');

const countyNames = {};

// Define the headers explicitly
const headers = [
  'fips',
  'county_name',
  'state_abbr',
  'state_name',
  'long_name',
  'sumlev',
  'region',
  'division',
  'state',
  'county',
  'crosswalk',
  'region_name',
  'division_name',
];

fs.createReadStream('county_fips_master.csv')
  .pipe(csv({ headers: headers, skipLines: 1 })) // Skip the header line
  .on('data', (row) => {
    console.log('Processing row:', row); // Debugging statement

    const fipsCode = row['fips'];
    const countyName = row['county_name'];

    if (fipsCode && countyName) {
      const formattedFips = fipsCode.padStart(5, '0');
      countyNames[formattedFips] = countyName;
    } else {
      console.error('Missing data in row:', row);
    }
  })
  .on('end', () => {
    console.log('Total counties processed:', Object.keys(countyNames).length);
    fs.writeFileSync('countyNames.json', JSON.stringify(countyNames, null, 2));
    console.log('countyNames.json has been created.');
  })
  .on('error', (error) => {
    console.error('Error while reading the CSV file:', error);
  });
