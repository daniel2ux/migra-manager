const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();
const uid = '9sTbj0ERgMMVfaqDEZGluQ75EmG2';

async function run() {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) {
    console.log('USER_NOT_FOUND');
  } else {
    console.log('USER_DOC:', JSON.stringify(doc.data(), null, 2));
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
