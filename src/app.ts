import 'dotenv/config';
import { App, LogLevel } from '@slack/bolt';
import { registerAgentListeners } from './listeners/agent';
import { registerShortcutListeners } from './listeners/shortcuts';
import { registerCommandListeners } from './listeners/commands';
import { registerEventListeners } from './listeners/events';
import { registerActionListeners } from './listeners/actions';
import { initRTS } from './core/rts';

// Fail-closed on missing required env
const requiredEnv = ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'OPENAI_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    console.error('App refusing to start. See .env.example');
    process.exit(1);
  }
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  // Log level can be DEBUG for dev
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
});

initRTS(process.env.SLACK_BOT_TOKEN!);

// Initialize DB early
import('./core/profiles'); // side effect creates tables

// Register all listeners
registerAgentListeners(app);
registerShortcutListeners(app);
registerCommandListeners(app);
registerEventListeners(app);
registerActionListeners(app);

(async () => {
  try {
    await app.start();
    console.log('⚡️ Clarion Bolt app is running in Socket Mode!');
    console.log('Agent is ready in Slack agent panel.');
  } catch (error) {
    console.error('Failed to start Clarion:', error);
    process.exit(1);
  }
})();
