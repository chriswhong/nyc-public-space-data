// Import required modules
// Usage:
//   node firebase-to-geojson.js (exports GeoJSON, NDJSON, and CSV files)
const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

// Load the credentials
const serviceAccount = require('../credentials/nyc-public-space-firebase-adminsdk-d0vzi-71d3dfd79e.json');

// Initialize Firestore with credentials
const firestore = new Firestore({
    projectId: serviceAccount.project_id,
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    }
});

// Define the collection you want to export
const COLLECTION_NAME = 'public-spaces-main'; // Replace with your collection name

// Helper function to limit coordinate precision
function limitPrecision(coords, precision = 6) {
    if (Array.isArray(coords[0])) {
        // Multi-dimensional array (like Polygon coordinates)
        return coords.map(subCoords => limitPrecision(subCoords, precision));
    } else {
        // Single coordinate pair [lng, lat]
        return coords.map(coord => Number(coord.toFixed(precision)));
    }
}

async function verifyAccess() {
    try {
        // Check the Firestore connection by getting a small document
        const doc = await firestore.collection(COLLECTION_NAME).limit(1).get();
        if (!doc.empty) {
            console.log('Firestore access verified. Proceeding with export...');
        } else {
            console.warn('Access verified, but collection appears to be empty.');
        }
    } catch (error) {
        console.error('Access verification failed:', error);
        process.exit(1); // Exit if access is not verified
    }
}

async function exportToGeoJSON() {
    const outputFile = './data/nyc-public-space.geojson';
    console.log('Exporting GeoJSON...');
    
    const fileStream = fs.createWriteStream(outputFile, { flags: 'w' });

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).get();
        fileStream.write('{\n  "type": "FeatureCollection",\n  "features": [\n');

        let featureCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();

            if (data.archived === true) {
                console.log(`Skipping archived document ${doc.id}`);
                return;
            }

            let geometry;
            try {
                geometry = JSON.parse(data.geometry);
            } catch (error) {
                console.warn(`Invalid geometry format in document ${doc.id}:`, error);
                return;
            }

            if (data.details) {
                data.details = JSON.stringify(data.details);
            }
            if (data.amenities) {
                data.amenities = JSON.stringify(data.amenities);
            }
            if (data.equipment) {
                data.equipment = JSON.stringify(data.equipment);
            }

            if (geometry && geometry.type && geometry.coordinates) {
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: geometry.type,
                        coordinates: limitPrecision(geometry.coordinates)
                    },
                    properties: {
                        ...data,
                        firestoreId: doc.id
                    }
                };

                delete feature.properties.geometry;

                if (featureCount > 0) {
                    fileStream.write(',\n');
                }
                fileStream.write(`    ${JSON.stringify(feature)}`);
                featureCount++;
            }
        });

        fileStream.write('\n  ]\n}');
        console.log(`GeoJSON exported successfully to ${outputFile}`);
    } catch (error) {
        console.error('Error exporting GeoJSON:', error);
    } finally {
        fileStream.end();
    }
}

async function exportToNDJSON() {
    const outputFile = './data/nyc-public-space.ndjson';
    console.log('Exporting NDJSON...');
    
    const fileStream = fs.createWriteStream(outputFile, { flags: 'w' });

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).get();

        snapshot.forEach(doc => {
            const data = doc.data();

            if (data.archived === true) {
                console.log(`Skipping archived document ${doc.id}`);
                return;
            }

            let geometry;
            try {
                geometry = JSON.parse(data.geometry);
            } catch (error) {
                console.warn(`Invalid geometry format in document ${doc.id}:`, error);
                return;
            }

            if (data.details) {
                data.details = JSON.stringify(data.details);
            }
            if (data.amenities) {
                data.amenities = JSON.stringify(data.amenities);
            }
            if (data.equipment) {
                data.equipment = JSON.stringify(data.equipment);
            }

            if (geometry && geometry.type && geometry.coordinates) {
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: geometry.type,
                        coordinates: limitPrecision(geometry.coordinates)
                    },
                    properties: {
                        ...data,
                        firestoreId: doc.id
                    }
                };

                delete feature.properties.geometry;
                fileStream.write(JSON.stringify(feature) + '\n');
            }
        });

        console.log(`NDJSON exported successfully to ${outputFile}`);
    } catch (error) {
        console.error('Error exporting NDJSON:', error);
    } finally {
        fileStream.end();
    }
}

async function exportToCSV() {
    const outputFile = './data/nyc-public-space.csv';
    console.log('Exporting CSV...');
    
    const fileStream = fs.createWriteStream(outputFile, { flags: 'w' });

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).get();
        const rows = [];
        const allKeys = new Set();

        // First pass: collect all unique keys and build rows
        snapshot.forEach(doc => {
            const data = doc.data();

            if (data.archived === true) {
                return;
            }

            let geometry;
            try {
                geometry = JSON.parse(data.geometry);
            } catch (error) {
                console.warn(`Invalid geometry format in document ${doc.id}:`, error);
                return;
            }

            if (geometry && geometry.type && geometry.coordinates) {
                const limitedCoords = limitPrecision(geometry.coordinates);
                
                const row = {
                    ...data,
                    firestoreId: doc.id,
                    longitude: limitedCoords[0],
                    latitude: limitedCoords[1]
                };

                delete row.geometry;

                // Convert objects to JSON strings
                if (row.details) {
                    row.details = JSON.stringify(row.details);
                }
                if (row.amenities) {
                    row.amenities = JSON.stringify(row.amenities);
                }
                if (row.equipment) {
                    row.equipment = JSON.stringify(row.equipment);
                }

                rows.push(row);
                Object.keys(row).forEach(key => allKeys.add(key));
            }
        });

        // Write CSV header
        const headers = Array.from(allKeys);
        fileStream.write(headers.map(h => `"${h}"`).join(',') + '\n');

        // Write CSV rows
        rows.forEach(row => {
            const csvRow = headers.map(header => {
                const value = row[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            fileStream.write(csvRow.join(',') + '\n');
        });

        console.log(`CSV exported successfully to ${outputFile}`);
    } catch (error) {
        console.error('Error exporting CSV:', error);
    } finally {
        fileStream.end();
    }
}

// Main execution
(async () => {
    await verifyAccess();
    await exportToGeoJSON();
    await exportToNDJSON();
    await exportToCSV();
})();
