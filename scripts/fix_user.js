const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });
}

const db = admin.firestore();
const uid = '9sTbj0ERgMMVfaqDEZGluQ75EmG2';

async function run() {
  console.log('UPDATING_USER:', uid);
  await db.collection('users').doc(uid).update({
    role: 'admin',
    position: 'Administrador Global' // Ensuring consistency
  });
  console.log('SUCCESS');
  process.exit(0);
}

run().catch(err => { console.error('ERROR:', err); process.exit(1); });
