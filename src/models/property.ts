// types/property.ts
export interface Property {
  id?: string;
  title: string;
  description: string;
  type: 'sale' | 'rent';
  price: number;
  currency: 'CLP' | 'UF';
  propertyType: 'casa' | 'departamento' | 'oficina' | 'terreno' | 'comercial';
  status: 'disponible' | 'vendido' | 'arrendado' | 'reservado';
  address: {
    street: string;
    city: string;
    commune: string;
    region: string;
    country: string;
  };
  features: {
    bedrooms?: number;
    bathrooms?: number;
    parkingSpaces?: number;
    totalArea: number; // m2
    builtArea?: number; // m2
    yearBuilt?: number;
  };
  amenities: string[]; // ['piscina', 'gimnasio', 'seguridad', 'jardin', etc.]
  images: PropertyImage[];
  contactInfo: {
    phone: string;
    email: string;
    whatsapp?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isFeatured: boolean;
}

export interface PropertyImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  uploadedAt: Date;
}

// Firestore collection structure:
/*
properties/ (collection)
  ├── {propertyId}/ (document)
      ├── title: string
      ├── description: string
      ├── price: number
      ├── currency: string
      ├── propertyType: string
      ├── status: string
      ├── address: object
      ├── features: object
      ├── amenities: array
      ├── images: array
      ├── contactInfo: object
      ├── createdAt: timestamp
      ├── updatedAt: timestamp
      ├── isActive: boolean
      └── isFeatured: boolean

Firebase Storage structure:
/properties/{propertyId}/images/{imageId}.{extension}
/properties/{propertyId}/thumbnails/{imageId}_thumb.{extension}
*/

// Firestore indexes needed (create in Firebase Console):
/*
Collection: properties
- status (ascending), isActive (ascending), createdAt (descending)
- propertyType (ascending), status (ascending), price (ascending)
- isFeatured (ascending), isActive (ascending), createdAt (descending)
- city (ascending), status (ascending), price (ascending)
*/
