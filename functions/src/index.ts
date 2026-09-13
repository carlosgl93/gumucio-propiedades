import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express from 'express';

import { newDiaryEntry } from './newDiaryEntry';
import { verifyDocumentHandler, upload } from './verifyDocument/handler';

dotenv.config();
admin.initializeApp();
export const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/newDiaryEntry', newDiaryEntry);
app.post('/verifyDocument', upload.single('file'), verifyDocumentHandler);

export const api = functions.https.onRequest(app);
