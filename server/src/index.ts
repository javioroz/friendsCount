import express from 'express';
import http from 'http';
import cors from 'cors';
import Gun from 'gun';
import 'gun/axe';
import path from 'path';
import { collectMap, deserialize } from './gunHelpers';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server early so Gun can attach to it
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

// Middleware
app.use(cors());
app.use(express.json());

// Add a permissive Content Security Policy so the UI can load local resources
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
  );
  next();
});

// Serve static UI from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve index.html for any non-API GET request. The UI uses hash-based
// routing (#/, #/group/:id) so the server only ever needs to return
// index.html for paths that aren't handled by the API or static assets.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Favicon: respond 204 if not present to avoid CSP console warning
app.get('/favicon.ico', (req, res) => {
  const ico = path.join(__dirname, '..', 'public', 'favicon.ico');
  res.sendFile(ico, err => {
    if (err) res.status(204).end();
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Read a single key from a GunDB node and resolve with the deserialized
 * value (or `undefined` if missing).
 */
const readOnce = (ref: any): Promise<any> => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: any) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      ref.once((data: any) => {
        if (data === undefined || data === null) {
          finish(undefined);
          return;
        }
        finish(deserialize(data));
      }, true);
    } catch (err) {
      finish(undefined);
      return;
    }
    // Safety timeout: GunDB's .once() can sometimes never fire on a missing
    // node. Don't hang the request indefinitely.
    setTimeout(() => finish(undefined), 1500);
  });
};

/**
 * Calculate per-member balances from the expenses list. Mirrors the logic
 * in the mobile client (`calculateBalancesFromExpenses`).
 */
const calculateBalances = (
  members: any[],
  expenses: any[]
): { memberId: string; amount: number }[] => {
  const balances = new Map<string, number>();
  for (const m of members) {
    if (m && m.id) balances.set(m.id, 0);
  }
  for (const expense of expenses) {
    if (!expense) continue;
    const sharedBy: string[] = Array.isArray(expense.sharedBy)
      ? expense.sharedBy
      : [];
    if (sharedBy.length === 0 || !expense.paidBy) continue;
    const perHead = (expense.amount || 0) / sharedBy.length;
    balances.set(
      expense.paidBy,
      (balances.get(expense.paidBy) || 0) + (expense.amount || 0)
    );
    for (const memberId of sharedBy) {
      balances.set(
        memberId,
        (balances.get(memberId) || 0) - perHead
      );
    }
  }
  return Array.from(balances.entries()).map(([memberId, amount]) => ({
    memberId,
    amount: Math.round(amount * 100) / 100,
  }));
};

/**
 * Read every child collection of a single group in parallel and assemble
 * the full JSON shape used by the UI.
 */
const readGroup = async (groupId: string) => {
  const groupRef = gun.get('friendscount').get('groups').get(groupId);
  const [meta, members, expenses, favors, rankings] = await Promise.all([
    readOnce(groupRef.get('meta')),
    collectMap(groupRef.get('members')),
    collectMap(groupRef.get('expenses')),
    collectMap(groupRef.get('favors')),
    collectMap(groupRef.get('rankings')),
  ]);

  const balances = calculateBalances(members, expenses);

  return {
    id: groupId,
    meta: meta || null,
    members,
    expenses,
    favors,
    balances,
    rankings,
  };
};

// Count the children of a GunDB `map()` collection. We collect items via
// `map().once()` and resolve after a short settle window so we don't hang
// on empty collections.
const countMap = (ref: any): Promise<number> => {
  return new Promise((resolve) => {
    let count = 0;
    const finish = (n: number) => {
      resolve(n);
    };
    try {
      ref.map().once(() => {
        count++;
      });
    } catch {
      finish(0);
      return;
    }
    // Give GunDB a moment to deliver the children, then resolve.
    setTimeout(() => finish(count), 600);
  });
};

// API endpoint to list all groups (summary cards)
app.get('/api/groups', async (req, res) => {
  try {
    const groupsRef = gun.get('friendscount').get('groups');

    // First, collect the id + raw meta of every group. The `once()` callback
    // receives the full group node, so we can read its `meta` child directly
    // without a second round-trip.
    const raw: { id: string; group: any }[] = [];
    await new Promise<void>((resolve) => {
      const finish = () => resolve();
      const timer = setTimeout(finish, 1500);
      try {
        groupsRef.map().once((group: any, id: string) => {
          if (group && group.meta) {
            raw.push({ id, group });
          }
        });
      } catch {
        clearTimeout(timer);
        finish();
        return;
      }
      setTimeout(() => {
        clearTimeout(timer);
        finish();
      }, 2000);
    });

    // Now resolve the member count for every group in parallel.
    const summaries = await Promise.all(
      raw.map(async ({ id, group }) => {
        const meta = deserialize(group.meta);
        const memberCount = await countMap(groupsRef.get(id).get('members'));
        return {
          id,
          name: meta?.name ?? null,
          icon: meta?.icon ?? null,
          memberCount,
        };
      })
    );

    res.json({ groups: summaries });
  } catch (err) {
    console.error('Error listing groups:', err);
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

// API endpoint to get a specific group by ID (full details)
app.get('/api/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await readGroup(groupId);
    if (!group.meta) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    res.json(group);
  } catch (err) {
    console.error('Error reading group:', err);
    res.status(500).json({ error: 'Failed to read group' });
  }
});

// (server and gun already initialized above)

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
