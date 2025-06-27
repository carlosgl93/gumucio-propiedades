import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express from 'express';

import { newDiaryEntry } from './newDiaryEntry';

dotenv.config();
admin.initializeApp();
export const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/newDiaryEntry', newDiaryEntry);

export const api = functions.https.onRequest(app);
