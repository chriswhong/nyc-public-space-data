/**
 * Data Enhancement Script - Schoolyard Name and Description Improvement
 * 
 * Uses geospatial analysis to match schoolyard locations with official school names
 * and generates standardized descriptions for NYC Schoolyards to Playgrounds program.
 * Finds nearest school feature for each coordinate and updates CSV data accordingly.
 */

const fs = require('fs');
const csvParser = require('csv-parser');
const turf = require('@turf/turf'); // Ensure to install @turf/turf for geospatial analysis

async function getNearestFeatureName(lng, lat, featureCollection) {
    const point = turf.point([lng, lat]);
    let nearestFeature = null;
    let minDistance = Infinity;

    for (const feature of featureCollection.features) {
        const distance = turf.distance(point, feature, { units: 'kilometers' });
        if (distance < minDistance) {
            minDistance = distance;
            nearestFeature = feature;
        }
    }

    return nearestFeature ? nearestFeature.properties.Name : 'Unknown';
}

async function processCSV(inputFilePath, outputFilePath, featureCollectionPath) {
    const results = [];
    const featureCollection = JSON.parse(fs.readFileSync(featureCollectionPath, 'utf8'));
    const rows = [];

    // Read and parse the CSV file into an array
    await new Promise((resolve, reject) => {
        fs.createReadStream(inputFilePath)
            .pipe(csvParser())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Iterate over rows sequentially, finding the nearest feature
    for (const row of rows) {
        if (row.geometry) {
            const geojson = JSON.parse(row.geometry);
            const [lng, lat] = geojson.coordinates;
            const nearestName = await getNearestFeatureName(lng, lat, featureCollection);

            if (nearestName) {
                row.name = nearestName;
                row.description = `The schoolyard at ${nearestName} which is open to the public after school hours as part of the schoolyards to playgrounds program.`;
            }
        }
        results.push(row);
    }

    // Write the updated rows back to a CSV file with all fields wrapped in double quotes and doubled double quotes as escape
    const csvHeader = Object.keys(results[0]).map(field => `"${field}"`).join(',') + '\n';
    const csvContent = results.map(row => Object.values(row).map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');

    fs.writeFileSync(outputFilePath, csvHeader + csvContent);
    console.log('CSV processing completed. Updated CSV saved to:', outputFilePath);
}

// Replace these file paths with your input and output CSV paths
const inputFilePath = './schoolyard-improvements/exported-data.csv'; // Path to your input CSV
const outputFilePath = './schoolyard-improvements/improved.csv'; // Path to your output CSV
const featureCollectionPath = './schoolyard-improvements/schools.geojson'; // Path to your GeoJSON feature collection

processCSV(inputFilePath, outputFilePath, featureCollectionPath);