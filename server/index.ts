import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import boardsRouter from './routes/boards.js';
import generateRouter from './routes/generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3010');
const HOST = process.env.HOST || '127.0.0.1';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/boards', boardsRouter);
app.use('/api/generate', generateRouter);

// Serve static files from Vite build in production
const clientDistPath = path.join(__dirname, '../dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
