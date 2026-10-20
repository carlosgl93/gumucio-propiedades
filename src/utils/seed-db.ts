import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
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
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'gumucio-pro.firebasestorage.app',
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
  try {
    await createUserWithEmailAndPassword(auth, user.email || '', user.password || '');
    console.log(`Seeded user: ${user.email}`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`User already exists: ${user.email}, signing in...`);
      await signInWithEmailAndPassword(auth, user.email || '', user.password || '');
    } else {
      console.error('Error creating user:', err);
    }
  }

  for (let i = 0; i < 12; i++) {
    const isRent = i < 6;
    const isUF = i % 3 === 0;
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
      price: isUF
        ? isRent
          ? 15.5 + i * 2.5
          : 3500.5 + i * 500
        : isRent
          ? 500000 + i * 100000
          : 100000000 + i * 50000000,
      currency: isUF ? 'UF' : 'CLP',
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
        bathrooms: 1.5 + (i % 2),
        parkingSpaces: 1,
        totalArea: 60.5 + i * 10,
        builtArea: 55.5 + i * 10,
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
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
