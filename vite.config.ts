import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import {
  chatWithGermanTutor,
  generateSessionSummary,
  getHelpWithPhrase,
} from './server/geminiService.ts';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      const apiApp = express();
      apiApp.use(express.json());

      apiApp.post('/api/chat', async (req, res) => {
        try {
          const { messages, userLevelPreference, scenarioContext } = req.body;
          const result = await chatWithGermanTutor(
            messages,
            userLevelPreference,
            scenarioContext
          );
          res.json(result);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('API /api/chat error:', errorMsg);
          res.status(500).json({ error: errorMsg });
        }
      });

      apiApp.post('/api/session-summary', async (req, res) => {
        try {
          const { messages } = req.body;
          const result = await generateSessionSummary(messages);
          res.json(result);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('API /api/session-summary error:', errorMsg);
          res.status(500).json({ error: errorMsg });
        }
      });

      apiApp.post('/api/help-phrase', async (req, res) => {
        try {
          const { englishQuery, context } = req.body;
          const result = await getHelpWithPhrase(englishQuery, context);
          res.json(result);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('API /api/help-phrase error:', errorMsg);
          res.status(500).json({ error: errorMsg });
        }
      });

      server.middlewares.use(apiApp);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
