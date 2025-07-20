import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { addDoc, collection, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Firebase config for emulator
const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'gumucio-pro',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators
connectFirestoreEmulator(db, 'localhost', 8081);
connectAuthEmulator(auth, 'http://localhost:9099');
connectStorageEmulator(storage, 'http://localhost:9199', 9199);

const now = new Date();

const user = {
  uid: 'test-user',
  email: import.meta.env.VITE_TEST_USER_EMAIL,
  password: import.meta.env.VITE_TEST_USER_PASSWORD,
};

const properties = [
  // Rent properties
  {
    title: 'Departamento céntrico en Santiago',
    description: 'Luminoso departamento cerca de metro y servicios.',
    type: 'rent',
    price: 450000,
    currency: 'CLP',
    propertyType: 'departamento',
    status: 'disponible',
    address: {
      street: 'Av. Providencia 1234',
      city: 'Santiago',
      commune: 'Providencia',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 2,
      bathrooms: 1,
      parkingSpaces: 1,
      totalArea: 60,
      builtArea: 55,
      yearBuilt: 2015,
    },
    amenities: ['Piscina', 'Gimnasio', 'Seguridad 24/7'],
    images: [],
    contactInfo: {
      phone: '+56 9 1234 5678',
      email: 'contacto@gumucio.cl',
      whatsapp: '+56 9 1234 5678',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: false,
  },
  {
    title: 'Casa en arriendo en La Florida',
    description: 'Casa familiar con amplio jardín y estacionamiento.',
    type: 'rent',
    price: 800000,
    currency: 'CLP',
    propertyType: 'casa',
    status: 'disponible',
    address: {
      street: 'Calle Los Robles 456',
      city: 'Santiago',
      commune: 'La Florida',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 2,
      totalArea: 120,
      builtArea: 110,
      yearBuilt: 2010,
    },
    amenities: ['Jardín', 'Quincho', 'Bodega'],
    images: [],
    contactInfo: {
      phone: '+56 9 8765 4321',
      email: 'arriendos@gumucio.cl',
      whatsapp: '+56 9 8765 4321',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: true,
  },
  {
    title: 'Oficina en arriendo en Las Condes',
    description: 'Moderna oficina en edificio corporativo.',
    type: 'rent',
    price: 1200000,
    currency: 'CLP',
    propertyType: 'oficina',
    status: 'disponible',
    address: {
      street: 'Av. Apoquindo 7890',
      city: 'Santiago',
      commune: 'Las Condes',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 0,
      bathrooms: 2,
      parkingSpaces: 3,
      totalArea: 90,
      builtArea: 90,
      yearBuilt: 2018,
    },
    amenities: ['Ascensor', 'Estacionamiento visitas', 'Aire acondicionado'],
    images: [],
    contactInfo: {
      phone: '+56 9 5555 5555',
      email: 'oficinas@gumucio.cl',
      whatsapp: '+56 9 5555 5555',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: false,
  },
  // Sale properties
  {
    title: 'Casa en venta en Vitacura',
    description: 'Casa de lujo con piscina y gran terreno.',
    type: 'sale',
    price: 350000000,
    currency: 'CLP',
    propertyType: 'casa',
    status: 'disponible',
    address: {
      street: 'Camino Real 123',
      city: 'Santiago',
      commune: 'Vitacura',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 5,
      bathrooms: 4,
      parkingSpaces: 4,
      totalArea: 500,
      builtArea: 400,
      yearBuilt: 2005,
    },
    amenities: ['Piscina', 'Jardín', 'Quincho', 'Bodega'],
    images: [],
    contactInfo: {
      phone: '+56 9 1111 2222',
      email: 'ventas@gumucio.cl',
      whatsapp: '+56 9 1111 2222',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: true,
  },
  {
    title: 'Departamento en venta en Ñuñoa',
    description: 'Departamento nuevo, excelente conectividad.',
    type: 'sale',
    price: 120000000,
    currency: 'CLP',
    propertyType: 'departamento',
    status: 'disponible',
    address: {
      street: 'Irarrázaval 2345',
      city: 'Santiago',
      commune: 'Ñuñoa',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      totalArea: 90,
      builtArea: 85,
      yearBuilt: 2022,
    },
    amenities: ['Piscina', 'Gimnasio', 'Ascensor'],
    images: [],
    contactInfo: {
      phone: '+56 9 3333 4444',
      email: 'ventas@gumucio.cl',
      whatsapp: '+56 9 3333 4444',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: false,
  },
  {
    title: 'Terreno en venta en Colina',
    description: 'Terreno amplio para desarrollo inmobiliario.',
    type: 'sale',
    price: 250000000,
    currency: 'CLP',
    propertyType: 'terreno',
    status: 'disponible',
    address: {
      street: 'Ruta 5 Norte km 28',
      city: 'Colina',
      commune: 'Colina',
      region: 'Metropolitana',
      country: 'Chile',
    },
    features: {
      bedrooms: 0,
      bathrooms: 0,
      parkingSpaces: 0,
      totalArea: 1000,
      builtArea: 0,
      yearBuilt: 2020,
    },
    amenities: [],
    images: [],
    contactInfo: {
      phone: '+56 9 6666 7777',
      email: 'ventas@gumucio.cl',
      whatsapp: '+56 9 6666 7777',
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isFeatured: false,
  },
];

async function seed() {
  console.log('Seeding properties...');
  await createUserWithEmailAndPassword(auth, user.email, user.password);
  console.log(`Seeded: ${user.email}`);

  for (const prop of properties) {
    await addDoc(collection(db, 'properties'), prop);
    console.log(`Seeded: ${prop.title}`);
  }
  console.log('✅ Seeding complete!');
}

await seed().catch(console.error);
process.exit(0);
