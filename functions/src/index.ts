import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import cors from 'cors';
import express from 'express';

import { newDiaryEntry } from './newDiaryEntry';
import { verifyDocumentHandler, parseMultipart } from './verifyDocument/handler';

const minimaxApiKey = defineSecret('GEMINI_API_KEY');

dotenv.config();
admin.initializeApp();
export const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/newDiaryEntry', newDiaryEntry);
app.post('/verifyDocument', parseMultipart, verifyDocumentHandler);
app.post('/api/verifyDocument', parseMultipart, verifyDocumentHandler);

export const api = functions.runWith({ secrets: [minimaxApiKey] }).https.onRequest(app);
