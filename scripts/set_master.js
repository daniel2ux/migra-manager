/**
 * set_master.js — Promove um usuário para o perfil MASTER.
 *
 * Uso:
 *   node scripts/set_master.js <UID_DO_USUARIO>
 *
 * Exemplo:
 *   node scripts/set_master.js abc123xyz
 *
 * Requer variáveis em .env.local:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const TARGET_UID = process.argv[2];

if (!TARGET_UID) {
  console.error('ERRO: Informe o UID do usuário como argumento.');
  console.error('Uso: node scripts/set_master.js <UID>');
  process.exit(1);
}

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function run() {
  console.log(`\n[MIGRA] Promovendo usuário para MASTER: ${TARGET_UID}`);

  const userRef = db.collection('users').doc(TARGET_UID);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error('ERRO: Usuário não encontrado no Firestore.');
    process.exit(1);
  }

  const userData = userDoc.data();
  const previousRole = userData?.role ?? 'membro';

  console.log(`[MIGRA] Usuário: ${userData?.name} <${userData?.email}>`);
  console.log(`[MIGRA] Perfil atual: ${previousRole} → master`);

  // Bloqueia promoção redundante
  if (previousRole === 'master') {
    console.log('[MIGRA] Usuário já possui o perfil MASTER. Nenhuma alteração realizada.');
    process.exit(0);
  }

  // Atualiza o perfil
  await userRef.update({
    role: 'master',
    updatedAt: new Date().toISOString(),
  });

  // Registra no log de auditoria
  await db.collection('audit_logs').add({
    action: 'CHANGE_ROLE',
    targetUid: TARGET_UID,
    targetEmail: userData?.email ?? 'N/A',
    targetName: userData?.name ?? 'N/A',
    previousRole,
    newRole: 'master',
    reason: 'Promoção bootstrap via script administrativo (set_master.js)',
    callerUid: 'system',
    callerEmail: 'system',
    timestamp: new Date().toISOString(),
  });

  console.log(`[MIGRA] Usuário promovido para MASTER com sucesso.`);
  console.log(`[MIGRA] Registro de auditoria gravado em audit_logs.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[MIGRA] ERRO:', err.message);
  process.exit(1);
});
