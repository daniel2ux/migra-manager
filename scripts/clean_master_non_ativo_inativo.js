/**
 * clean_master_non_ativo_inativo.js
 *
 * Remove do cadastro mestre (`masterObjects`) todos os documentos cujo
 * status não seja ATIVO nem INATIVO (ex.: LEGACY).
 * Status ausente é tratado como ATIVO e mantido.
 *
 * Uso:
 *   node scripts/clean_master_non_ativo_inativo.js           # DRY RUN
 *   node scripts/clean_master_non_ativo_inativo.js --execute # apaga de verdade
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const EXECUTE = process.argv.includes('--execute');
const DRY_RUN = !EXECUTE;
const BATCH = 400;
const COLLECTION = 'masterObjects';

function normalizeStatus(data) {
  return String(data?.status || 'ATIVO').trim().toUpperCase();
}

function shouldDelete(data) {
  const status = normalizeStatus(data);
  return status !== 'ATIVO' && status !== 'INATIVO';
}

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('[ABORT] FIREBASE_ADMIN_PRIVATE_KEY ausente em .env');
    process.exit(2);
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function run() {
  console.log('\n=== LIMPAR masterObjects (status ≠ ATIVO e ≠ INATIVO) ===');
  console.log(`Modo: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE (apaga de verdade)'}\n`);

  const toDelete = [];
  let scanned = 0;
  let lastDoc = null;

  while (true) {
    let q = db.collection(COLLECTION).orderBy('__name__').limit(1000);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      scanned++;
      const data = docSnap.data() || {};
      if (shouldDelete(data)) {
        toDelete.push({
          ref: docSnap.ref,
          id: docSnap.id,
          name: data.name || '(sem nome)',
          status: normalizeStatus(data),
        });
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 1000) break;
  }

  const byStatus = toDelete.reduce((acc, x) => {
    acc[x.status] = (acc[x.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`Documentos varridos: ${scanned}`);
  console.log(`A remover: ${toDelete.length}`);
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  status="${status}" → ${count}`);
  });

  if (toDelete.length > 0) {
    console.log('\nAmostra (até 30):');
    toDelete.slice(0, 30).forEach((x) => {
      console.log(`  - ${x.name} [${x.id}] status=${x.status}`);
    });
    if (toDelete.length > 30) {
      console.log(`  ... e mais ${toDelete.length - 30}`);
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNada a fazer.\n');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN: nada apagado. Rode com --execute para aplicar.\n');
    process.exit(0);
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const chunk = toDelete.slice(i, i + BATCH);
    const batch = db.batch();
    chunk.forEach((x) => batch.delete(x.ref));
    await batch.commit();
    deleted += chunk.length;
    process.stdout.write(`\rApagados ${deleted}/${toDelete.length}...`);
  }
  console.log('\n\nConcluído.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n[ERRO FATAL]', err.stack || err.message);
  process.exit(1);
});
