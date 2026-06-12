/**
 * set_concluido_mock10.js — Marca como CARGA_CONCLUIDA todos os objetos
 * de um mock que possuam chargeEndTime preenchido.
 *
 * Uso:
 *   node scripts/set_concluido_mock10.js <MOCK_ID>
 *
 * Exemplos:
 *   node scripts/set_concluido_mock10.js d9m1g9cmd   # MOCK-10
 *   node scripts/set_concluido_mock10.js g2e1hag3u   # MOCK-09
 *
 * Requer variáveis em .env.local:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const PROJECT_ID = 'tenwoap3j';
const MOCK_ID    = process.argv[2];

if (!MOCK_ID) {
  console.error('ERRO: Informe o mockId como argumento.');
  console.error('Uso: node scripts/set_concluido_mock10.js <MOCK_ID>');
  process.exit(1);
}

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function main() {
  console.log(`Mock: ${MOCK_ID}`);

  const colRef = db.collection('projects').doc(PROJECT_ID)
    .collection('mocks').doc(MOCK_ID)
    .collection('migrationObjects');

  const snap = await colRef.get();

  if (snap.empty) {
    console.log('Nenhum objeto encontrado.');
    return;
  }

  const toUpdate = snap.docs.filter(d => {
    const endTime = d.data().chargeEndTime;
    return endTime && endTime.trim() !== '';
  });

  console.log(`Total de objetos: ${snap.size}`);
  console.log(`Com chargeEndTime preenchido: ${toUpdate.length}`);

  if (toUpdate.length === 0) {
    console.log('Nenhum objeto elegível para atualização.');
    return;
  }

  const BATCH_SIZE = 400;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    for (const docSnap of chunk) {
      batch.update(docSnap.ref, { status: 'CARGA_CONCLUIDA' });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`  Atualizados: ${updated}/${toUpdate.length}`);
  }

  console.log(`\nConcluído. ${updated} objeto(s) marcado(s) como CARGA_CONCLUIDA.`);
}

main().catch(err => {
  console.error('ERRO:', err);
  process.exit(1);
});
