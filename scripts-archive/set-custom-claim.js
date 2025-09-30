/**
 * Firebase Admin Script - Set Custom User Claims
 * 
 * Sets custom authentication claims for a Firebase user to grant editor permissions.
 * Used to manage user roles and permissions in the NYC Public Space App.
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./credentials/nyc-public-space-firebase-adminsdk-d0vzi-71d3dfd79e.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Set a custom claim for a user
async function setCustomClaims(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { role: "editor" });
    console.log(`Custom claims set for user (${uid}): { role: "editor" }`);
  } catch (error) {
    console.error("Error setting custom claims:", error);
  }
}

// Call the function with the user's UID
setCustomClaims("HqrZnler74aBKXHkqbpfPuz5PXu1");