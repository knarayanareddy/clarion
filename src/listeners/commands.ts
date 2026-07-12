import { App } from '@slack/bolt';
import { getProfile } from '../core/profiles';
import { profileModal } from '../blocks/profileModal';

export function registerCommandListeners(app: App) {
  // /clarion profile — reopen modal
  app.command('/clarion', async ({ command, ack, client, respond }) => {
    await ack();

    const subcommand = (command.text || '').trim().toLowerCase();

    if (subcommand === 'profile' || !subcommand) {
      const profile = getProfile(command.user_id);
      await client.views.open({
        trigger_id: command.trigger_id,
        view: profileModal(profile) as any
      });
    } else if (subcommand === 'check') {
      await respond({ text: '`/clarion check` is a stretch feature (F8). Coming soon!' });
    } else if (subcommand === 'digest') {
      await respond({ text: 'Digest feature (F6) is stretch. Run `npm run mcp` for tools or use agent chat.' });
    } else {
      await respond({ text: 'Usage: `/clarion profile`' });
    }
  });
}
