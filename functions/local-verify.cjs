// Load .env from functions/ if present (real LLM calls when key is set)
try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
process.env.GCLOUD_PROJECT = 'gumucio-pro';
process.env.FIREBASE_PROJECT_ID = 'gumucio-pro';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { verifyDocumentHandler } = require('./lib/verifyDocument/handler.js');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.post('/verifyDocument', upload.single('file'), verifyDocumentHandler);

const port = process.env.PORT || 5050;
app.listen(port, () => console.log('local verify server on :' + port));
