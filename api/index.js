// Vercel serverless entry — exposes the Express app as a function handler.
// vercel.json rewrites every request to this file; Express then routes normally.
import app from '../server.js';

export default app;
