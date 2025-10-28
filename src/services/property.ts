import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatPropertyData(data: any, id: string): Property {
    return {
      id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      images: data.images || [],
    };
  }
}

export const propertyService = new PropertyService();
