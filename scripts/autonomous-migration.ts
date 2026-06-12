
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega variáveis do .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const ENERGIA_ID = 'tenwoap3j';
const RUMO_ID = 'NZwk2Zlq0ednbRjAXW1w';

// Inicialização Robusta (baseada no admin.ts do projeto)
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = admin.firestore();

async function runMigration() {
    console.log('🚀 Iniciando migração para autonomia de projetos...');

    // 1. SANITIZAÇÃO DO ENERGIA (MasterObjects)
    console.log('--- Passo 1: Sanitizando MasterObjects do ENERGIA ---');
    const masterObjectsSnap = await db.collection('masterObjects').get();
    
    let sanitizedCount = 0;
    const masterMap = new Map<string, string>(); // oldMasterId -> newMasterId (será preenchido na clonagem)

    for (const doc of masterObjectsSnap.docs) {
        const data = doc.data();
        // Se estiver sem projectId ou for ENERGIA, garantimos o vínculo
        if (!data.projectId || data.projectId === ENERGIA_ID) {
            if (!data.projectId) {
                await doc.ref.update({ projectId: ENERGIA_ID });
                sanitizedCount++;
            }
        }
    }
    console.log(`✅ Sanitizados ${sanitizedCount} MasterObjects no projeto ENERGIA.`);

    // 2. CLONAGEM DE MASTER OBJECTS PARA RUMO
    console.log('--- Passo 2: Clonando MasterObjects para RUMO ---');
    const energiaMastersSnap = await db.collection('masterObjects').where('projectId', '==', ENERGIA_ID).get();
    
    for (const doc of energiaMastersSnap.docs) {
        const data = doc.data();
        const oldId = doc.id;
        
        // Criar cópia para o RUMO
        const newDocRef = db.collection('masterObjects').doc();
        await newDocRef.set({
            ...data,
            id: newDocRef.id,
            projectId: RUMO_ID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            originalMasterId: oldId // Rastro para auditoria
        });
        masterMap.set(oldId, newDocRef.id);
    }
    console.log(`✅ Clonados ${masterMap.size} MasterObjects para o projeto RUMO.`);

    // 3. CLONAGEM DE MOCKS E OBJETOS DE MIGRAÇÃO
    console.log('--- Passo 3: Clonando Mocks e Objetos (Deep Copy) ---');
    const mocksSnap = await db.collection('projects').doc(ENERGIA_ID).collection('mocks').get();
    
    const mockIdMap = new Map<string, string>(); // oldMockId -> newMockId
    const objIdMap = new Map<string, { newId: string, oldData: any }>(); // oldObjId -> new data

    for (const mockDoc of mocksSnap.docs) {
        const mockData = mockDoc.data();
        const oldMockId = mockDoc.id;

        // Criar novo Mock no projeto RUMO
        const newMockRef = db.collection('projects').doc(RUMO_ID).collection('mocks').doc();
        const newMockId = newMockRef.id;
        mockIdMap.set(oldMockId, newMockId);

        await newMockRef.set({
            ...mockData,
            id: newMockId,
            projectId: RUMO_ID,
            status: 'PENDENTE', // Resetamos o status por segurança
            loadHistory: [], // Novo projeto, novo histórico
            isRunning: false,
            isLocked: false
        });

        // Buscar objetos de migração dentro deste Mock
        const objsSnap = await mockDoc.ref.collection('migrationObjects').get();
        console.log(`   > Mock ${mockData.name}: Clonando ${objsSnap.size} objetos...`);

        for (const objDoc of objsSnap.docs) {
            const oldObjData = objDoc.data();
            const oldObjId = objDoc.id;
            const newObjRef = newMockRef.collection('migrationObjects').doc();
            
            objIdMap.set(oldObjId, { 
                newId: newObjRef.id, 
                oldData: {
                    ...oldObjData,
                    id: newObjRef.id,
                    mockId: newMockId,
                    projectId: RUMO_ID,
                    masterObjectId: masterMap.get(oldObjData.masterObjectId) || oldObjData.masterObjectId, // Link para o novo master
                    loadHistory: [], // Reset histórico
                    status: 'PENDENTE'
                }
            });
        }
    }

    // 4. ATUALIZAÇÃO DE DEPENDÊNCIAS NO RUMO
    console.log('--- Passo 4: Remapeando dependências internas no RUMO ---');
    const batch = db.batch();
    let batchCount = 0;

    for (const [, info] of objIdMap.entries()) {
        const newData = { ...info.oldData };
        
        if (newData.dependencyIds && Array.isArray(newData.dependencyIds)) {
            newData.dependencyIds = newData.dependencyIds.map((oldDepId: string) => {
                const depInfo = objIdMap.get(oldDepId);
                return depInfo ? depInfo.newId : oldDepId; // Mapeia para o novo ID se existir
            });
        }

        // Caminho do novo objeto: projects/RUMO_ID/mocks/newMockId/migrationObjects/newObjId
        const newObjRef = db.collection('projects').doc(RUMO_ID)
            .collection('mocks').doc(newData.mockId)
            .collection('migrationObjects').doc(newData.id);
            
        batch.set(newObjRef, newData);
        batchCount++;

        if (batchCount === 500) {
            await batch.commit();
            console.log('   > Lote de 500 objetos processado.');
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Resumo:
       - MasterObjects Sanitizados: ${sanitizedCount}
       - MasterObjects Clonados: ${masterMap.size}
       - Mocks Clonados: ${mockIdMap.size}
       - Objetos Replicados: ${objIdMap.size}`);
}

runMigration().catch(err => {
    console.error('❌ Erro crítico na migração:', err);
    process.exit(1);
});
