import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { addDoc, collection, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Firebase config for emulator
const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'gumucio-pro',
  storageBucket: 'gumucio-pro.default-bucket.appspot.com',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators
connectFirestoreEmulator(db, 'localhost', 8081);
connectAuthEmulator(auth, 'http://localhost:9099');
connectStorageEmulator(storage, 'localhost', 9199);

const now = new Date();

const user = {
  uid: 'test-user',
  email: 'admin@gmail.com',
  password: '123456',
};

// List of local images to use for seeding
const localImages = [
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'modern-house-bg.png',
];

// Helper to upload an image and return the image object for Firestore
async function uploadImage(propertyId: string, fileName: string, order: number) {
  const filePath = path.join(process.cwd(), 'public', fileName);
  const fileBuffer = fs.readFileSync(filePath);
  const imageId = `${propertyId}_img${order}`;
  const storageRef = ref(storage, `properties/${propertyId}/images/${imageId}.png`);
  await uploadBytes(storageRef, fileBuffer, { contentType: 'image/png' });
  const url = await getDownloadURL(storageRef);
  return {
    id: imageId,
    url,
    order,
    caption: `Imagen ${order + 1}`,
    uploadedAt: now,
  };
}

async function seed() {
  console.log('Seeding properties...');
  await createUserWithEmailAndPassword(auth, user.email || '', user.password || '');
  console.log(`Seeded: ${user.email}`);

  for (let i = 0; i < 6; i++) {
    const isRent = i < 3;
    const propertyId = `property_${i + 1}`;
    const images = [];
    for (let j = 0; j < localImages.length; j++) {
      const img = await uploadImage(propertyId, localImages[j], j);
      images.push(img);
    }
    const prop = {
      title: isRent ? `Propiedad en arriendo ${i + 1}` : `Propiedad en venta ${i - 2}`,
      description: isRent
        ? 'Propiedad de ejemplo para arriendo.'
        : 'Propiedad de ejemplo para venta.',
      type: isRent ? 'rent' : 'sale',
      price: isRent ? 500000 + i * 100000 : 100000000 + i * 50000000,
      currency: 'CLP',
      propertyType: isRent ? 'departamento' : 'casa',
      status: 'disponible',
      address: {
        street: `Calle ${i + 1}`,
        city: 'Santiago',
        commune: isRent ? 'Providencia' : 'Vitacura',
        region: 'Metropolitana',
        country: 'Chile',
      },
      features: {
        bedrooms: 2 + i,
        bathrooms: 1 + (i % 2),
        parkingSpaces: 1,
        totalArea: 60 + i * 10,
        builtArea: 55 + i * 10,
        yearBuilt: 2010 + i,
      },
      amenities: ['Piscina', 'Gimnasio'],
      images,
      contactInfo: {
        phone: '+56 9 1234 5678',
        email: 'contacto@gumucio.cl',
        whatsapp: '+56 9 1234 5678',
      },
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isFeatured: i % 2 === 0,
    };
    await addDoc(collection(db, 'properties'), prop);
    console.log(`Seeded: ${prop.title}`);
  }
  console.log('✅ Seeding complete!');
}

seed().catch(console.error);
