/**
 * Google Sheets Integration Script - CSV to GeoJSON
 * 
 * Downloads data from a published Google Sheets CSV URL and converts it to line-delimited GeoJSON.
 * Validates data structure including space IDs, coordinates, and required fields.
 * Handles redirects and performs comprehensive data validation before output.
 */

const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');
const path = require('path');

// Google Sheets CSV URL
const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0g8F0gpVZP-4Z59oPS0AzbRd_Vd5qvowi4Js1jmGEY4S73aiqGiCh8wctV96cxjlU92MsC9ZkHBw-/pub?gid=776272730&single=true&output=csv';

// Output file paths
const outputFilePath = path.join(__dirname, 'ld/combined.ndjson');

// Create a write stream for the line-delimited GeoJSON output
const outputStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

// List of valid types
const validTypes = ['park', 'pops', 'misc', 'stp', 'plaza', 'wpaa'];

// Array to store validation errors
const validationErrors = [];

// Function to validate space_id (lowercase and kebab-case)
function isValidSpaceId(space_id) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(space_id);
}

// Function to validate type
function isValidType(type) {
  return validTypes.includes(type);
}

// Function to validate that a string is not empty
function isNonEmptyString(value) {
  return value && value.trim() !== '';
}

// Function to validate GeoJSON Point geometry
function isValidGeoJSONPoint(geometry) {
  return geometry &&
         geometry.type === 'Point' &&
         Array.isArray(geometry.coordinates) &&
         geometry.coordinates.length === 2 &&
         !isNaN(geometry.coordinates[0]) &&
         !isNaN(geometry.coordinates[1]);
}

// Function to handle downloading CSV and following redirects
function downloadCsvAndConvertToGeoJSON(url) {
  https.get(url, (response) => {
    // If the status code is 307, follow the redirect
    if (response.statusCode === 307 || response.statusCode === 302) {
      const redirectUrl = response.headers.location;
      console.log(`Redirecting to ${redirectUrl}`);
      downloadCsvAndConvertToGeoJSON(redirectUrl);
    } else if (response.statusCode === 200) {
      // Process CSV if successful response
      response.pipe(csv())
        .on('data', (row) => {
          const rowErrors = [];

          // Validate space_id
          if (!isValidSpaceId(row.space_id)) {
            rowErrors.push(`Invalid space_id: ${row.space_id}`);
          }

          // Validate type
          if (!isValidType(row.type)) {
            rowErrors.push(`Invalid type: ${row.type}`);
          }

          // Validate name
          if (!isNonEmptyString(row.name)) {
            rowErrors.push('Name should not be empty');
          }

          // Validate description
          if (!isNonEmptyString(row.description)) {
            rowErrors.push('Description should not be empty');
          }

          // Validate geometry
          let geometry;
          try {
            geometry = JSON.parse(row.geometry);
          } catch (e) {
            rowErrors.push('Invalid GeoJSON format in geometry');
          }

          if (geometry && !isValidGeoJSONPoint(geometry)) {
            rowErrors.push(`Invalid GeoJSON Point geometry - ${row.space_id}`);
          }

          // If there are errors, push them to validationErrors with row details
          if (rowErrors.length > 0) {
            validationErrors.push({
              row: row,
              errors: rowErrors
            });
          } else {
            // If no errors, write the feature as a line-delimited GeoJSON string
            const feature = {
              type: 'Feature',
              geometry: geometry,
              properties: {
                type: row.type,
                name: row.name,
                location: row.location,
                url: row.url,
                space_id: row.space_id,
                description: row.description
              }
            };

            outputStream.write(JSON.stringify(feature) + '\n');
          }
        })
        .on('end', () => {
          if (validationErrors.length > 0) {
            // Log all validation errors
            console.error('Validation errors found:');
            validationErrors.forEach((errorEntry, index) => {
              errorEntry.errors.forEach((err) => {
                console.error(`  - ${err}`);
              });
            });

            // Exit with a non-zero status code
            process.exit(1);
          } else {
            console.log(`Line-delimited GeoJSON written to ${outputFilePath}`);
          }

          outputStream.end();
        })
        .on('error', (err) => {
          console.error('Error reading CSV data:', err);
          process.exit(1);
        });
    } else {
      console.error(`Failed to fetch CSV. Status code: ${response.statusCode}`);
      process.exit(1);
    }
  }).on('error', (err) => {
    console.error('Error downloading CSV:', err);
    process.exit(1);
  });
}

// Call the function to start the process
downloadCsvAndConvertToGeoJSON(googleSheetsUrl);
