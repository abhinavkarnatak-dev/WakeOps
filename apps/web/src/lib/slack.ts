import { decryptSecret } from '@wakeops/notifications';

type SlackChannel = { id: string; name: string; is_archived?: boolean };

export function requireSlackConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    throw new Error('Slack OAuth is not configured.');
  }
  return { clientId, clientSecret, redirectUri, encryptionKey };
}

export async function slackChannels(accessTokenEncrypted: string) {
  const { encryptionKey } = requireSlackConfig();
  const token = decryptSecret(accessTokenEncrypted, encryptionKey);
  const response = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  const body = (await response.json()) as {
    ok: boolean;
    channels?: SlackChannel[];
    error?: string;
  };
  if (!response.ok || !body.ok)
    throw new Error(body.error ?? 'Slack channels could not be loaded.');
  return (body.channels ?? [])
    .filter((channel) => !channel.is_archived)
    .map((channel) => ({ id: channel.id, name: channel.name }));
}

export function decryptSlackToken(accessTokenEncrypted: string) {
  return decryptSecret(accessTokenEncrypted, requireSlackConfig().encryptionKey);
}
