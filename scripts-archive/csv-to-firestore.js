/**
 * Database Import Script - CSV to Firestore
 * 
 * Imports processed public space data from CSV format into Firebase Firestore database.
 * Used to populate the main database collection for the NYC Public Space App
 * with validated and cleaned space information.
 */

const admin = require('firebase-admin');
const csv = require('csv-parser');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require('./credentials/nyc-public-space-firebase-adminsdk-d0vzi-71d3dfd79e.json'); // Update path
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // For Firestore
// Or use the line below for Realtime Database
// const db = admin.database();

const collectionName = 'public-spaces-main'; // Change to your desired collection

// Read CSV file and upload to Firebase
fs.createReadStream('tmp/spaces-main.csv')
  .pipe(csv())
  .on('data', async (row) => {
    try {
      await db.collection(collectionName).add(row); // For Firestore
      // Or use the line below for Realtime Database
      // await db.ref(collectionName).push(row);
      console.log('Uploaded:', row);
    } catch (error) {
      console.error('Error uploading:', error);
    }
  })
  .on('end', () => {
    console.log('CSV file successfully processed and uploaded to Firebase.');
  });