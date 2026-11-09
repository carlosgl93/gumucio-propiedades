// src/services/application.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase';
import type { DocType, Postulacion, VerificationResult } from '@/models/application';

export async function createApplication(input: {
  propertyId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'postulaciones'), {
    ...input,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listApplications(): Promise<Postulacion[]> {
  const snap = await getDocs(query(collection(db, 'postulaciones'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Postulacion);
}

export async function addDocumentWithVerdict(
  postulacionId: string,
  payload: {
    type: DocType;
    fileUrl: string;
    verification: VerificationResult;
    uploadedBy: string;
  },
): Promise<string> {
  const docRef = await addDoc(collection(db, 'postulaciones', postulacionId, 'documentos'), {
    type: payload.type,
    fileUrl: payload.fileUrl,
    score: payload.verification.score,
    verdict: payload.verification.verdict,
    flags: payload.verification.flags,
    extractedFields: payload.verification.extractedFields,
    uploadedAt: serverTimestamp(),
    uploadedBy: payload.uploadedBy,
  });
  return docRef.id;
}

export async function setApplicationStatus(
  postulacionId: string,
  status: Postulacion['status'],
  reviewerUid: string,
): Promise<void> {
  await updateDoc(doc(db, 'postulaciones', postulacionId), {
    status,
    reviewedBy: reviewerUid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
