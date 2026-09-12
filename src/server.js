import 'dotenv/config';
import { initDb } from './db.js';
import { seedIfEmpty, ensureDefaultUser, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from './seed.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await initDb();
  seedIfEmpty();
  if (await ensureDefaultUser()) {
    console.log(`created default user "${DEFAULT_ADMIN_USERNAME}"`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`  → log in with username: ${DEFAULT_ADMIN_USERNAME}  password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log(`  → set ADMIN_PASSWORD to choose your own`);
    }
  }
  createApp().listen(PORT, HOST, () => {
    console.log(`Patient intake triage listening on http://${HOST}:${PORT}`);
  });
} catch (err) {
  console.error('Failed to start:', err);
  process.exit(1);
}