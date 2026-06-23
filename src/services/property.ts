import {
  DocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/firebase';
import { Property, PropertyImage } from '@/models';

export class PropertyService {
  private collectionName = 'properties';

  async createProperty(
    property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const now = new Date();
    const propertyData = {
      ...property,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(collection(db, this.collectionName), propertyData);
    return docRef.id;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async deleteProperty(id: string): Promise<void> {
    // Delete images from storage first
    await this.deleteAllPropertyImages(id);

    // Delete the document
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async getProperty(id: string): Promise<Property | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    console.log('PropertyService.getProperty', id, docSnap.exists());

    if (docSnap.exists()) {
      return this.formatPropertyData(docSnap.data(), docSnap.id);
    }
    return null;
  }

  async getAllProperties(filters?: {
    status?: string;
    propertyType?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<Property[]> {
    let q = query(collection(db, this.collectionName));

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.propertyType) {
      q = query(q, where('propertyType', '==', filters.propertyType));
    }
    if (filters?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive));
    }
    if (filters?.isFeatured !== undefined) {
      q = query(q, where('isFeatured', '==', filters.isFeatured));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.formatPropertyData(doc.data(), doc.id));
  }

  async getPropertiesCount(type: 'rent' | 'sale', isActive: boolean): Promise<number> {
    const q = query(
      collection(db, this.collectionName),
      where('type', '==', type),
      where('isActive', '==', isActive),
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  }

  async getPropertiesPaginated(
    type: 'rent' | 'sale',
    isActive: boolean,
    pageLimit: number,
    cursor: DocumentSnapshot | null,
  ): Promise<{ properties: Property[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
    let q = query(
      collection(db, this.collectionName),
      where('type', '==', type),
      where('isActive', '==', isActive),
      orderBy('createdAt', 'desc'),
      limit(pageLimit + 1),
    );

    if (cursor) {
      q = query(
        collection(db, this.collectionName),
        where('type', '==', type),
        where('isActive', '==', isActive),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageLimit + 1),
      );
    }

    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > pageLimit;
    const docs = hasMore ? snapshot.docs.slice(0, pageLimit) : snapshot.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      properties: docs.map((d) => this.formatPropertyData(d.data(), d.id)),
      lastDoc,
      hasMore,
    };
  }

  async getAvailableProperties(): Promise<Property[]> {
    return this.getAllProperties({ status: 'disponible', isActive: true });
  }

  async getFeaturedProperties(): Promise<Property[]> {
    return this.getAllProperties({ isFeatured: true, isActive: true });
  }

  async uploadPropertyImage(
    propertyId: string,
    file: File,
    caption?: string,
  ): Promise<PropertyImage> {
    const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExtension = file.name.split('.').pop();

    const imageRef = ref(storage, `properties/${propertyId}/images/${imageId}.${fileExtension}`);

    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);

    const propertyImage: PropertyImage = {
      id: imageId,
      url,
      caption,
      order: 0, // Will be updated when adding to property
      uploadedAt: new Date(),
    };

    return propertyImage;
  }

  async deletePropertyImage(propertyId: string, imageId: string): Promise<void> {
    // List all files in the property's images folder to find the one matching the imageId
    const imagesRef = ref(storage, `properties/${propertyId}/images`);
    const imagesList = await listAll(imagesRef);

    // Find the file that starts with the imageId (includes extension)
    const imageToDelete = imagesList.items.find(
      (item) => item.name.startsWith(imageId) || item.name === imageId,
    );

    if (imageToDelete) {
      await deleteObject(imageToDelete);
    } else {
      console.warn(`Image with ID ${imageId} not found in storage`);
    }
  }

  private async deleteAllPropertyImages(propertyId: string): Promise<void> {
    const imagesRef = ref(storage, `properties/${propertyId}/images`);
    const imagesList = await listAll(imagesRef);

    const deletePromises = imagesList.items.map((item) => deleteObject(item));
    await Promise.all(deletePromises);
  }

  private formatPropertyData(data: any, id: string): Property {
    return {
      id,
      title: data.title ?? '',
      description: data.description ?? '',
      type: data.type ?? 'rent',
      price: data.price ?? 0,
      currency: data.currency ?? 'CLP',
      propertyType: data.propertyType ?? 'casa',
      status: data.status ?? 'disponible',
      address: {
        street: data.address?.street ?? '',
        city: data.address?.city ?? '',
        commune: data.address?.commune ?? '',
        region: data.address?.region ?? '',
        country: data.address?.country ?? 'Chile',
      },
      features: {
        bedrooms: data.features?.bedrooms ?? 0,
        bathrooms: data.features?.bathrooms ?? 0,
        parkingSpaces: data.features?.parkingSpaces ?? 0,
        totalArea: data.features?.totalArea ?? 0,
        builtArea: data.features?.builtArea ?? 0,
        yearBuilt: data.features?.yearBuilt ?? 0,
      },
      amenities: data.amenities ?? [],
      images: data.images ?? [],
      contactInfo: {
        phone: data.contactInfo?.phone ?? '',
        email: data.contactInfo?.email ?? '',
        whatsapp: data.contactInfo?.whatsapp ?? '',
      },
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
    };
  }
}

export const propertyService = new PropertyService();
