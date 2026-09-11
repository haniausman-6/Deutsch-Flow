import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import {
  chatWithGermanTutor,
  generateSessionSummary,
  getHelpWithPhrase,
} from './server/geminiService.ts';

dotenv.config();

const app = express();
app.use(express.json());

// API health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userLevelPreference, scenarioContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }
    const response = await chatWithGermanTutor(
      messages,
      userLevelPreference,
      scenarioContext
    );
    res.json(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Chat error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/session-summary', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }
    const summary = await generateSessionSummary(messages);
    res.json(summary);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Summary error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/help-phrase', async (req: Request, res: Response) => {
  try {
    const { englishQuery, context } = req.body;
    if (!englishQuery) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }
    const help = await getHelpWithPhrase(englishQuery, context);
    res.json(help);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Help phrase error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// Serve static frontend in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
