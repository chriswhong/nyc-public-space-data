/**
 * Data Validation Script - Check URL-Friendly IDs
 * 
 * Validates and corrects space_id fields in Firestore to ensure they are URL-friendly slugs.
 * Interactive script that suggests corrections for invalid IDs and updates the database
 * to maintain consistent, web-safe identifiers for public spaces.
 */

const admin = require('firebase-admin');
const readline = require('readline');

const serviceAccount = require('../nyc-public-space-firebase-adminsdk-d0vzi-51af4be4f4.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Slugify utility
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')                   // remove accents
    .replace(/[\u0300-\u036f]/g, '')    // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, '-')        // non-alphanumerics to -
    .replace(/^-+|-+$/g, '')            // trim -
    .replace(/--+/g, '-');              // collapse --
}

// CLI prompt setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
  const snapshot = await db.collection('public-spaces-main').get();

  const slugRegex = /^[a-z0-9\-]+$/;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentId = data.space_id;

    if (!slugRegex.test(currentId)) {
      const suggested = slugify(currentId);
      console.log(doc.id)
      console.log(`\n❌ Invalid slug: "${currentId}" (doc: ${doc.id})`);
      console.log(`💡 Suggested slug: "${suggested}"`);

      const input = await promptUser('Press Enter to accept, type new slug to override, or "s" to skip: ');
      const newSlug = input === '' ? suggested : (input === 's' ? null : input);

      if (newSlug) {
        await db.collection('public-spaces-main').doc(doc.id).update({ space_id: newSlug });
        console.log(`✅ Updated to: ${newSlug}`);
      } else {
        console.log('⏭️ Skipped');
      }
    }
  }

  rl.close();
  console.log('\n🎉 Done!');
})();
