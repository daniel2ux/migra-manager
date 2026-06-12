/**
 * clean_orphan_projects.js
 *
 * Remove do Firestore documentos órfãos que referenciam projetos
 * que NÃO existem mais na coleção `projects`. Mantém intactos apenas
 * os documentos vinculados aos projectIds válidos (atualmente:
 * apenas DECOLA → `tenwoap3j`).
 *
 * Coleções varridas (campo `projectId`):
 *   - masterObjects
 *   - migrationLogs
 *   - audit_logs
 *   - error_logs
 *
 * Uso:
 *   node scripts/clean_orphan_projects.js                # DRY RUN (default)
 *   node scripts/clean_orphan_projects.js --execute      # apaga de verdade
 *   node scripts/clean_orphan_projects.js --execute --collections=masterObjects,migrationLogs
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const EXECUTE   = process.argv.includes('--execute');
const DRY_RUN   = !EXECUTE;
const BATCH     = 400;

const collArg = process.argv.find(a => a.startsWith('--collections='));
const COLLECTIONS = collArg
  ? collArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
  : ['masterObjects', 'migrationLogs', 'audit_logs', 'error_logs'];

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

async function getValidProjectIds() {
  const snap = await db.collection('projects').get();
  const ids = new Set();
  snap.docs.forEach(d => ids.add(d.id));
  return ids;
}

async function sweepCollection(name, validIds) {
  let scanned = 0;
  let toDelete = [];
  let lastDoc = null;

  while (true) {
    let q = db.collection(name).orderBy('__name__').limit(1000);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      scanned++;
      const data = doc.data() || {};
      const pid = data.projectId;
      if (typeof pid === 'string' && pid.length > 0 && !validIds.has(pid)) {
        toDelete.push({ ref: doc.ref, pid });
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 1000) break;
  }

  const byPid = toDelete.reduce((acc, x) => {
    acc[x.pid] = (acc[x.pid] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n[${name}] documentos varridos: ${scanned}`);
  console.log(`[${name}] órfãos detectados: ${toDelete.length}`);
  Object.entries(byPid).forEach(([pid, count]) => {
    console.log(`    projectId="${pid}" → ${count} doc(s)`);
  });

  if (toDelete.length === 0) return { scanned, deleted: 0 };

  if (DRY_RUN) {
    console.log(`[${name}] DRY RUN: nada apagado.`);
    return { scanned, deleted: 0 };
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const chunk = toDelete.slice(i, i + BATCH);
    const batch = db.batch();
    chunk.forEach(x => batch.delete(x.ref));
    await batch.commit();
    deleted += chunk.length;
    process.stdout.write(`\r[${name}] apagados ${deleted}/${toDelete.length}...`);
  }
  console.log();
  return { scanned, deleted };
}

async function run() {
  console.log(`\n=== LIMPAR OBJETOS ÓRFÃOS (não pertencentes a projetos válidos) ===`);
  console.log(`Modo: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE (apaga de verdade)'}`);

  const validIds = await getValidProjectIds();
  console.log(`\nProjetos válidos encontrados em 'projects' (${validIds.size}):`);
  validIds.forEach(id => console.log(`    - ${id}`));

  if (validIds.size === 0) {
    console.error('\n[ABORT] Nenhum projeto válido. Recuse-se a apagar tudo.');
    process.exit(2);
  }

  console.log(`\nColeções a varrer: ${COLLECTIONS.join(', ')}`);

  let totalScanned = 0;
  let totalDeleted = 0;
  for (const c of COLLECTIONS) {
    const { scanned, deleted } = await sweepCollection(c, validIds);
    totalScanned += scanned;
    totalDeleted += deleted;
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Documentos varridos: ${totalScanned}`);
  console.log(`Documentos ${DRY_RUN ? 'que seriam apagados' : 'apagados'}: ${totalDeleted}`);
  if (DRY_RUN) {
    console.log(`\nPara executar de verdade, rode novamente com --execute.\n`);
  } else {
    console.log(`\nConcluído.\n`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('\n[ERRO FATAL]', err.stack || err.message);
  process.exit(1);
});
