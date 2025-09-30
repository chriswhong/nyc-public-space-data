/**
 * Data Export Script - Schoolyard Data Download from Firestore
 * 
 * Exports all schoolyard (STP - Schoolyards to Playgrounds) records from Firestore
 * to CSV format for processing and improvement. Part of the data enhancement workflow
 * to standardize schoolyard names and descriptions.
 */

const { Firestore } = require('@google-cloud/firestore');
const fs = require('fs');
const { Parser } = require('json2csv');

const serviceAccount = require('../credentials/nyc-public-space-firebase-adminsdk-d0vzi-71d3dfd79e.json');

const firestore = new Firestore({
    projectId: serviceAccount.project_id,
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    }
});
async function exportToCSV() {
  const snapshot = await firestore.collection('public-spaces-main').where('type', '==', 'stp').get();
  
  if (snapshot.empty) {
    console.log('No matching documents found.');
    return;
  }

  const data = [];
  snapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });

  const fields = Object.keys(data[0]); // Extract fields for CSV header
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);

  fs.writeFileSync('./exported-data.csv', csv);
  console.log('CSV export completed.');
}

exportToCSV().catch(console.error);