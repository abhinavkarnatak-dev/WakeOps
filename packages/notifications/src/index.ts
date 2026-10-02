import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { z } from 'zod';

export const incidentNotificationSchema = z.object({
  eventId: z.string().min(1),
  incidentId: z.string().min(1),
  organizationId: z.string().min(1),
  alertName: z.string().min(1),
  severity: z.string().min(1),
  application: z.string().min(1),
  environment: z.string().min(1),
  resource: z.string().min(1),
  value: z.string().nullable(),
  startedAt: z.string().datetime(),
  dashboardUrl: z.string().url(),
});

export type IncidentNotification = z.infer<typeof incidentNotificationSchema>;

export type DeliveryResult = {
  providerMessageId: string;
};

export interface EmailProvider {
  sendIncident(destination: string, event: IncidentNotification): Promise<DeliveryResult>;
}

export interface SlackProvider {
  sendIncident(channelId: string, event: IncidentNotification): Promise<DeliveryResult>;
}

function encryptionKey(value: string) {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must contain 32 Base64 encoded bytes.');
  return key;
}

export function encryptSecret(value: string, keyValue: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(keyValue), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string, keyValue: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Encrypted secret is invalid.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(keyValue),
    Buffer.from(ivValue, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeSlack(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function incidentReference(id: string) {
  return `INC-${id.slice(-8).toUpperCase()}`;
}

function emailHtml(event: IncidentNotification) {
  const reference = incidentReference(event.incidentId);
  const severity = event.severity.toUpperCase();
  const severityStyle =
    severity === 'CRITICAL'
      ? 'background:#321416;color:#ff8f98;border:1px solid #7f1d1d'
      : severity === 'WARNING'
        ? 'background:#30250b;color:#facc15;border:1px solid #854d0e'
        : 'background:#14200b;color:#b6fb45;border:1px solid #3f6212';
  const rows = [
    ['Application', event.application],
    ['Environment', event.environment],
    ['Resource', event.resource],
    ['Value', event.value ?? 'Not provided'],
    ['Started', new Date(event.startedAt).toISOString()],
    ['Incident', reference],
  ];
  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:11px 0;color:#8b96a9;font-size:13px;width:42%">${escapeHtml(label ?? '')}</td><td style="padding:11px 0;color:#f8fafc;font-size:14px;font-weight:600">${escapeHtml(value ?? '')}</td></tr>`,
    )
    .join('');
  return `<div style="margin:0;padding:32px 16px;background:#080a08;font-family:Arial,sans-serif;color:#f8fafc"><div style="max-width:620px;margin:0 auto;background:#101310;border:1px solid #283127;border-radius:16px;overflow:hidden"><div style="padding:24px 28px;border-bottom:1px solid #283127"><div style="font-size:12px;font-weight:700;letter-spacing:1.8px;color:#b6fb45">WAKEOPS / INCIDENT RESPONSE</div><div style="margin-top:18px"><span style="display:inline-block;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.8px;${severityStyle}">${escapeHtml(severity)}</span></div><h1 style="margin:16px 0 0;font-size:26px;line-height:1.25;color:#ffffff">${escapeHtml(event.alertName)}</h1><p style="margin:10px 0 0;color:#aab4c5;font-size:15px;line-height:1.55">WakeOps received a Grafana alert and started the incident response workflow.</p></div><div style="padding:12px 28px 24px"><table style="border-collapse:collapse;width:100%"><tbody>${table}</tbody></table><div style="margin-top:18px;padding-top:22px;border-top:1px solid #283127"><a href="${escapeHtml(event.dashboardUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#b6fb45;color:#071003;font-size:14px;font-weight:700;text-decoration:none">Open incident</a></div></div></div></div>`;
}

export function createResendEmailProvider(apiKey: string, from: string): EmailProvider {
  return {
    async sendIncident(destination, event) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `incident-email-${event.incidentId}`,
        },
        body: JSON.stringify({
          from,
          to: [destination],
          subject: `[${event.severity.toUpperCase()}] ${incidentReference(event.incidentId)} · ${event.alertName}`,
          html: emailHtml(event),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.message ?? `Resend returned HTTP ${response.status}.`);
      }
      return { providerMessageId: body.id };
    },
  };
}

export function slackIncidentMessage(event: IncidentNotification) {
  const reference = incidentReference(event.incidentId);
  const fields = [
    { type: 'mrkdwn', text: `*Service*\n${escapeSlack(event.application)}` },
    { type: 'mrkdwn', text: `*Environment*\n${escapeSlack(event.environment)}` },
    { type: 'mrkdwn', text: `*Resource*\n${escapeSlack(event.resource)}` },
    { type: 'mrkdwn', text: '*Status*\nCalling assigned engineer' },
  ];
  if (event.value) {
    fields.splice(3, 0, {
      type: 'mrkdwn',
      text: `*Reported value*\n${escapeSlack(event.value)}`,
    });
  }
  return {
    text: `${event.severity} incident: ${event.alertName} on ${event.application}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${event.severity.toUpperCase()} - ${event.alertName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Incident ${reference}*\nWakeOps received a Grafana alert and started the response workflow.`,
        },
      },
      { type: 'section', fields },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: `Open Incident ${reference}`, emoji: true },
            url: event.dashboardUrl,
            action_id: 'open_incident',
            style: 'primary',
          },
        ],
      },
    ],
  };
}

export function slackClientMessageId(incidentId: string) {
  const hash = createHash('sha256')
    .update(`wakeops-slack-${incidentId}`)
    .digest('hex')
    .slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
}

export function createSlackProvider(token: string): SlackProvider {
  return {
    async sendIncident(channelId, event) {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelId,
          client_msg_id: slackClientMessageId(event.incidentId),
          ...slackIncidentMessage(event),
        }),
      });
      const body = (await response.json()) as { ok: boolean; ts?: string; error?: string };
      if (!response.ok || !body.ok || !body.ts) {
        throw new Error(body.error ?? `Slack returned HTTP ${response.status}.`);
      }
      return { providerMessageId: body.ts };
    },
  };
}
