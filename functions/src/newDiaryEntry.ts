import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';
import { logger } from 'firebase-functions';

import { db } from '.';
import { buildPrompt } from './prompt';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export const newDiaryEntry = async (req: Request, res: Response) => {
  try {
    const { userId, entry, timestamp } = req.body;
    if (!userId || !entry) return res.status(400).json({ error: 'Missing fields' });

    const createdAt = timestamp ? new Date(timestamp) : new Date();

    // Store the entry in Firestore
    const diaryRef = await db.collection('users').doc(userId).collection('journal').add({
      entry,
      createdAt,
    });

    // Generate quests using Gemini
    const prompt = buildPrompt(entry);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-preview-06-17',
      contents: prompt,
    });
    logger.info('Gemini response:', response);
    let content = response.text;
    if (content) {
      content = content.replace(/^```json|^```|```$/gm, '').trim();
    }
    const quests = JSON.parse(content || '[]');
    console.log('Generated quests:', quests);
    logger.log('Generated quests:', quests);

    // Optionally store quests
    const batch = db.batch();
    quests.forEach((q: any) => {
      const ref = db.collection('users').doc(userId).collection('quests').doc();
      batch.set(ref, {
        ...q,
        createdAt: new Date(),
        fromEntry: diaryRef.id,
      });
    });
    await batch.commit();

    return res.status(200).json({ quests });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
