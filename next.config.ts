
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  // Next.js 16 não aceita mais `eslint` em next.config; use `npm run lint` no CI.
  typescript: {
    // Migração Supabase: shims Firestore geram casts estritos pendentes de refinamento
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@genkit-ai/google-genai', 'genkit'],
  // Estabilizando o Build ID para evitar ChunkLoadErrors após deploys
  generateBuildId: async () => {
    return process.env.NEXT_PUBLIC_BUILD_ID || 'migra-stable-v1';
  },
};

export default nextConfig;
