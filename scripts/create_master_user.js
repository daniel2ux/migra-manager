/**
 * Script para criar/atualizar usuário MASTER no Firestore
 * 
 * Uso:
 * 1. npm install firebase-admin dotenv
 * 2. Preencha as variáveis abaixo
 * 3. node scripts/create_master_user.js
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Configura Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Dados do usuário master
const MASTER_UID = '9sTbj0ERgMMVfaqDEZGluQ75EmG2'; // Seu UID master
const MASTER_EMAIL = 'daniel2ux@gmail.com'; // Seu email
const MASTER_NAME = 'DANIEL'; // Seu nome

async function createOrUpdateMasterUser() {
  try {
    const userRef = db.collection('users').doc(MASTER_UID);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log('Usuário encontrado. Atualizando dados...');
      await userRef.update({
        email: MASTER_EMAIL,
        name: MASTER_NAME,
        role: 'master',
        isDisabled: false,
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Usuário master atualizado com sucesso!');
    } else {
      console.log('Usuário não encontrado. Criando novo usuário...');
      await userRef.set({
        uid: MASTER_UID,
        email: MASTER_EMAIL,
        name: MASTER_NAME,
        role: 'master',
        isDisabled: false,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Usuário master criado com sucesso!');
    }

    console.log('\n📋 Dados do usuário:');
    console.log(`   UID: ${MASTER_UID}`);
    console.log(`   Email: ${MASTER_EMAIL}`);
    console.log(`   Nome: ${MASTER_NAME}`);
    console.log(`   Role: master`);
    console.log('\n⚠️  IMPORTANTE: Você precisa criar o usuário no Firebase Auth com a mesma senha que deseja usar.');
    console.log('   Firebase Console → Authentication → Add user');
    console.log(`   Email: ${MASTER_EMAIL}`);
    console.log('   Senha: [defina uma senha]');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createOrUpdateMasterUser();
