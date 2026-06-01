import express from 'express';
import http from 'http';
import cors from 'cors';
import Gun from 'gun';
import 'gun/axe';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint to list all groups
app.get('/api/groups', (req, res) => {
  const groupsRef = gun.get('friendscount').get('groups');
  
  // Get all groups
  const groups: any[] = [];
  groupsRef.map().once((group: any, id: string) => {
    if (group && group.meta) {
      groups.push({
        id,
        ...group,
      });
    }
  });
  
  // Wait a bit for the data to be collected
  setTimeout(() => {
    res.json({ groups });
  }, 1000);
});

// API endpoint to get a specific group by ID
app.get('/api/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  const groupRef = gun.get('friendscount').get('groups').get(groupId);
  
  groupRef.once((group: any) => {
    if (group && group.meta) {
      res.json({
        id: groupId,
        ...group,
      });
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize GunDB with WebSocket relay
const gun = Gun({
  file: 'radata', // Persist data to radata directory (production-ready)
  web: server as any, // Attach to HTTP server for WebSocket
});

// Enable GunDB's real-time sync
gun.on('auth', () => {
  console.log('GunDB authenticated');
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 GunDB Relay Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/gun`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});