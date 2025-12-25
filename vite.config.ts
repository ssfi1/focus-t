
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포를 위해 기본 경로를 상대 경로('./')로 설정합니다.
  // 이렇게 하면 https://username.github.io/repo-name/ 에서도 리소스를 올바르게 찾습니다.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
