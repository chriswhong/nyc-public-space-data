/**
 * Firestore Update Script - Schoolyard Data Import
 * 
 * Reads improved schoolyard data from CSV and updates Firestore documents with enhanced
 * names and descriptions. Part of the schoolyard improvements workflow to standardize
 * NYC Schoolyards to Playgrounds program data.
 */

const fs = require('fs');
const csvParser = require('csv-parser');
const { Firestore } = require('@google-cloud/firestore');

const serviceAccount = require('../credentials/nyc-public-space-firebase-adminsdk-d0vzi-71d3dfd79e.json');

const firestore = new Firestore({
    projectId: serviceAccount.project_id,
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    }
});

async function updateFirestore(row) {
    try {
        const docRef = firestore.collection('public-spaces-main').doc(row.id);
        const updateData = {
            space_id: row.space_id,
            type: row.type,
            subtype: row.subtype,
            name: row.name,
            location: row.location,
            url: row.url,
            description: row.description,
            geometry: row.geometry,
            google_maps_id: row.google_maps_id,
            closed_for_construction: row.closed_for_construction
        };
        await docRef.set(updateData, { merge: true });
        console.log(`Document ${row.id} updated successfully.`);
    } catch (error) {
        console.error(`Error updating document ${row.id}:`, error);
    }
}

async function processCSV(inputFilePath) {
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

    // Iterate over rows sequentially, updating Firestore
    for (const row of rows) {
        console.log(row)
        if (row.geometry) {
            await updateFirestore(row);
        }
    }

    console.log('CSV processing and Firestore update completed.');
}

// Replace this file path with your input CSV path
const inputFilePath = './schoolyard-improvements/improved.csv'; // Path to your input CSV

processCSV(inputFilePath);