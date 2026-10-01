import type { MetadataRoute } from 'next';

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/login', '/onboarding'],
    },
    sitemap: `${webUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
