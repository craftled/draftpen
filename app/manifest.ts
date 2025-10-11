import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Draftpen - AI-first content writing software',
    short_name: 'Draftpen',
    description: 'Draftpen is an AI-first content writing software that helps you write better content faster.',
    start_url: '/',
    display: 'standalone',
    categories: ['writing', 'ai', 'productivity'],
    background_color: '#171717',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-maskable.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
    screenshots: [
      {
        src: '/opengraph-image.png',
        type: 'image/png',
        sizes: '1200x630',
      },
    ],
  };
}
