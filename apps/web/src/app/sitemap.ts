import type { MetadataRoute } from 'next';

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: webUrl,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
