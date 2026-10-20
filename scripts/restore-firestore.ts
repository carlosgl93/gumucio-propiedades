import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function restore() {
  const backupFile =
    process.argv[2] || path.join(process.cwd(), 'backups', 'properties-backup-latest.json');

  if (!fs.existsSync(backupFile)) {
    console.error('Archivo de backup no encontrado:', backupFile);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupFile, 'utf-8');
  const properties = JSON.parse(raw);
  console.log(`Iniciando restauración de ${properties.length} propiedades desde ${backupFile}...`);

  // Authenticate as admin to have write permissions in production
  if (process.env.VITE_TEST_USER_EMAIL && process.env.VITE_TEST_USER_PASSWORD) {
    console.log(`Autenticando con usuario admin (${process.env.VITE_TEST_USER_EMAIL})...`);
    await signInWithEmailAndPassword(
      auth,
      process.env.VITE_TEST_USER_EMAIL,
      process.env.VITE_TEST_USER_PASSWORD,
    );
  }

  let restored = 0;
  for (const prop of properties) {
    if (!prop.id) continue;
    const propRef = doc(db, 'properties', prop.id);
    await updateDoc(propRef, {
      images: prop.images || [],
    });
    restored++;
    process.stdout.write(`\rRestauradas ${restored}/${properties.length} propiedades...`);
  }

  console.log('\nRestauración de Firestore finalizada exitosamente.');
}

restore().catch((err) => {
  console.error('\nError en restauración:', err);
  process.exit(1);
});
