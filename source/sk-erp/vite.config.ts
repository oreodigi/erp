import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// SK_API_PROXY is only set by scripts/dev-stack.mjs for local QA; production serves /auth and /api via erp-gateway.php.
const apiProxy = process.env.SK_API_PROXY ? { '/auth': process.env.SK_API_PROXY, '/api': process.env.SK_API_PROXY } : undefined;
export default defineConfig({ plugins: [react()], base: './', server: { proxy: apiProxy }, preview: { proxy: apiProxy }, build: { chunkSizeWarningLimit: 750, assetsInlineLimit: 4096, cssCodeSplit: true, rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'; if (id.includes('node_modules/lucide-react')) return 'icons'; } } } } });
