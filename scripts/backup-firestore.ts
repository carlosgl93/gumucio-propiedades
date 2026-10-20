import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
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
const db = getFirestore(app);

async function backup() {
  console.log('Descargando snapshot de propiedades desde Firestore producción...');
  const snapshot = await getDocs(collection(db, 'properties'));
  const properties: any[] = [];

  snapshot.forEach((doc) => {
    properties.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `properties-backup-${timestamp}.json`);
  const latestPath = path.join(backupDir, 'properties-backup-latest.json');

  fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), 'utf-8');
  fs.writeFileSync(latestPath, JSON.stringify(properties, null, 2), 'utf-8');

  console.log(`Snapshot guardado: ${properties.length} propiedades en:`);
  console.log(`- ${filePath}`);
  console.log(`- ${latestPath}`);
}

backup().catch((err) => {
  console.error('Error al generar snapshot:', err);
  process.exit(1);
});
