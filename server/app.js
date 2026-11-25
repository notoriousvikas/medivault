import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import userRoutes from './modules/users/user.routes.js';
import recordRoutes from './modules/records/record.routes.js';
import prescriptionRoutes from './modules/prescriptions/prescription.routes.js';
import timelineEventRoutes from './modules/timeline-events/timeline-event.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import consultationRoutes from './modules/consultations/consultation.routes.js';
import emergencyRoutes from './modules/emergency/emergency.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import appointmentRoutes from './modules/appointments/appointment.routes.js';
import hotspotRoutes from './modules/hotspot/hotspot.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Set FRONTEND_URL on the backend deployment to the Vercel frontend origin.
// Multiple comma-separated origins can be used for production and preview deployments.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header (health checks, server-to-server) are allowed.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

app.use(express.json({ strict: false }));
// Gracefully recover if client sends empty or non-object JSON body
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    req.body = {};
    return next();
  }
  next(err);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/uploads', express.static('uploads'));

app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/timeline-events', timelineEventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/jagruti', hotspotRoutes);
// Direct shortcut so scanned physical QR codes can hit /emergency/:token
app.use('/emergency', emergencyRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use(errorHandler);

export default app;
