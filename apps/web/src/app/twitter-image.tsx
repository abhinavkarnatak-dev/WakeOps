import { createSocialImage, socialImageSize } from '@/lib/social-image';

export const alt = 'WakeOps incident alerting and engineer escalation';
export const contentType = 'image/png';
export const size = socialImageSize;

export default function TwitterImage() {
  return createSocialImage();
}
