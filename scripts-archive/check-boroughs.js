/**
 * Geospatial Validation Script - Verify Borough Assignments
 * 
 * Validates that public spaces are correctly associated with their NYC boroughs
 * by performing point-in-polygon spatial analysis against official borough boundaries.
 * Identifies and reports mismatches between mentioned and actual borough locations.
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const turf = require('@turf/turf');

// Define file paths
const geojsonFilePath = path.join(__dirname, '../mts-pipeline/tmp/combined.ndjson');
const boroughsFilePath = path.join(__dirname, '../tmp/new-york-city-boroughs.geojson');

// Load NYC borough boundaries
const boroughsGeoJSON = JSON.parse(fs.readFileSync(boroughsFilePath, 'utf8'));

// Extract borough features
const boroughs = boroughsGeoJSON.features;

// Counter for mismatches
let mismatchCount = 0;
const outputCsvPath = path.join(__dirname, 'mismatched-boroughs.csv');
const outputStream = fs.createWriteStream(outputCsvPath);
outputStream.write('space_id\n'); // CSV header

// Function to determine which borough contains a point
const getBoroughForPoint = (point) => {
    for (const borough of boroughs) {
        if (turf.booleanPointInPolygon(point, borough)) {
            return borough.properties.name; // Assuming each borough feature has a `borough` property
        }
    }
    return null;
};
// Function to process each feature
const processFeature = (feature, index) => {
    if (!feature || feature.type !== 'Feature' || !feature.geometry || feature.geometry.type !== 'Point') {
        console.warn(`Skipping invalid feature at index ${index}`);
        return;
    }

    const { properties, geometry } = feature;
    const featureCoords = geometry.coordinates;
    const featurePoint = turf.point(featureCoords);

    // Check if the feature references a borough in its properties (case-insensitive)
    let mentionedBorough = null;
    for (const value of Object.values(properties)) {
        if (typeof value === 'string') {
            mentionedBorough = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].find(borough =>
                value.toLowerCase().includes(borough.toLowerCase())
            );
            if (mentionedBorough) break; // Stop at the first match
        }
    }

    // Perform spatial lookup
    const actualBorough = getBoroughForPoint(featurePoint);

    // Only log mismatches
    if (mentionedBorough && actualBorough && mentionedBorough !== actualBorough) {
        mismatchCount++;
        outputStream.write(`${properties.space_id}\n`); // Write space_id to CSV
    }
};

// Read and process the NDJSON file line by line
const readStream = fs.createReadStream(geojsonFilePath, 'utf8');
const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
});

let featureIndex = 0;

rl.on('line', (line) => {
    try {
        const json = JSON.parse(line);

        if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
            json.features.forEach((feature, index) => processFeature(feature, index));
        } else if (json.type === 'Feature') {
            processFeature(json, featureIndex++);
        } else {
            console.warn('Unexpected JSON object:', json);
        }
    } catch (error) {
        console.error('Error parsing line:', line, error);
    }
});

rl.on('close', () => {
    console.log(`Finished processing NDJSON file. Total mismatches: ${mismatchCount}`);
    outputStream.end(); // Close the file

});