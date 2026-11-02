import { createSocialImage, socialImageSize } from '@/lib/social-image';

export const alt =
  'WakeOps: someone has to wake up. Phone calls, retries and escalation for Grafana alerts.';
export const contentType = 'image/png';
export const size = socialImageSize;

export default async function TwitterImage() {
  return createSocialImage();
}
