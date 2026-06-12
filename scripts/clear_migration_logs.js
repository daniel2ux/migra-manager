/**
 * clear_migration_logs.js
 *
 * Apaga documentos da coleção `migrationLogs` no Firestore.
 * Opcionalmente filtra por mock e reseta `hasTechLogs` nos migrationObjects.
 *
 * Uso:
 *   node scripts/clear_migration_logs.js
 *   node scripts/clear_migration_logs.js --mock=<mockId>
 *   node scripts/clear_migration_logs.js --mock=<mockId> --reset-flags
 *   node scripts/clear_migration_logs.js --dry-run
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const DRY_RUN     = process.argv.includes('--dry-run');
const RESET_FLAGS = process.argv.includes('--reset-flags');
const BATCH_SIZE  = 400;

const mockArg = process.argv.find(a => a.startsWith('--mock='));
const MOCK_ID = mockArg ? mockArg.split('=')[1] : null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function deleteLogs(mockId) {
  let total = 0;
  while (true) {
    let q = db.collection('migrationLogs');
    if (mockId) q = q.where('mock', '==', mockId);
    const snap = await q.limit(BATCH_SIZE).get();
    if (snap.empty) break;

    if (!DRY_RUN) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    total += snap.size;
    process.stdout.write(`\r  ${total} documentos ${DRY_RUN ? 'encontrados' : 'deletados'}...`);
    if (snap.size < BATCH_SIZE) break;
  }
  console.log();
  return total;
}

async function resetHasTechLogs(mockId) {
  let total = 0;
  const projectsSnap = await db.collection('projects').get();

  for (const projectDoc of projectsSnap.docs) {
    let mocksSnap;
    if (mockId) {
      const mockDoc = await db.collection('projects').doc(projectDoc.id).collection('mocks').doc(mockId).get();
      if (!mockDoc.exists) continue;
      mocksSnap = { docs: [mockDoc] };
    } else {
      mocksSnap = await db.collection('projects').doc(projectDoc.id).collection('mocks').get();
    }

    for (const mockDoc of mocksSnap.docs) {
      const objectsRef = db
        .collection('projects').doc(projectDoc.id)
        .collection('mocks').doc(mockDoc.id)
        .collection('migrationObjects');

      const flaggedSnap = await objectsRef.where('hasTechLogs', '==', true).get();
      if (flaggedSnap.empty) continue;

      for (let i = 0; i < flaggedSnap.docs.length; i += 500) {
        const chunk = flaggedSnap.docs.slice(i, i + 500);
        if (!DRY_RUN) {
          const batch = db.batch();
          chunk.forEach(d => batch.update(d.ref, { hasTechLogs: false }));
          await batch.commit();
        }
        total += chunk.length;
      }

      console.log(`  projeto=${projectDoc.id} mock=${mockDoc.id}: ${flaggedSnap.size} objetos`);
    }
  }
  return total;
}

async function run() {
  const scope = MOCK_ID ? `mock=${MOCK_ID}` : 'TODOS OS MOCKS';
  console.log(`\n=== LIMPAR LOGS DE MIGRAÇÃO [${scope}]${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  console.log('Deletando documentos em migrationLogs...');
  const deleted = await deleteLogs(MOCK_ID);
  console.log(`  Total: ${deleted} documentos ${DRY_RUN ? 'seriam deletados' : 'deletados'}.`);

  if (RESET_FLAGS) {
    console.log('\nResetando flag hasTechLogs nos migrationObjects...');
    const flagsReset = await resetHasTechLogs(MOCK_ID);
    console.log(`  Total: ${flagsReset} objetos ${DRY_RUN ? 'seriam atualizados' : 'atualizados'}.`);
  }

  console.log('\nConcluído.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n[ERRO FATAL]', err.message);
  process.exit(1);
});
