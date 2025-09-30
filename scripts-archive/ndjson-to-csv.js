/**
 * Data Conversion Script - NDJSON to CSV
 * 
 * Converts newline-delimited GeoJSON (NDJSON) format to CSV for easier data analysis.
 * Processes combined public space data and generates kebab-case IDs from type and name fields.
 * Exports flattened properties with geometry as JSON string for spreadsheet compatibility.
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { parse } = require('json2csv');

// Input and output file paths
const inputFilePath = path.join(__dirname, 'ld/combined.ndjson');
const outputFilePath = path.join(__dirname, 'tmp/output.csv');

// Create a read stream for the line-delimited GeoJSON file
const rl = readline.createInterface({
  input: fs.createReadStream(inputFilePath),
  output: process.stdout,
  terminal: false
});

// Array to hold all the CSV rows
const dataRows = [];

// Helper function to convert string to kebab-case
const toKebabCase = (str) => {
  if (str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  }
  return '';
};

// Process each line in the GeoJSON file
rl.on('line', (line) => {
  try {
    // Parse the GeoJSON feature
    const feature = JSON.parse(line);

    // Extract properties and geometry as GeoJSON string
    const { properties, geometry } = feature;

    // Create the `id` by concatenating `type` and `name`, converting to lowercase and kebab-case
    const type = properties.type || '';
    const name = properties.name || '';
    const id = `${toKebabCase(type)}-${toKebabCase(name)}`;

    // Add the `id` and the geometry as a string to the properties object
    properties.id = id;
    properties.geometry = JSON.stringify(geometry);

    // Push the properties object to the rows array
    dataRows.push(properties);
  } catch (err) {
    console.error('Error parsing line:', err);
  }
});

// When reading is complete, convert the rows to CSV and write to file
rl.on('close', () => {
  if (dataRows.length > 0) {
    try {
      // Convert the data to CSV format
      const csv = parse(dataRows);

      // Write the CSV to a file
      fs.writeFileSync(outputFilePath, csv, 'utf8');
      console.log(`CSV written to ${outputFilePath}`);
    } catch (err) {
      console.error('Error writing CSV:', err);
    }
  } else {
    console.log('No data found to write.');
  }
});
