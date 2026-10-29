import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./source/',import.meta.url));
export default defineConfig({root,base:'./',build:{outDir:fileURLToPath(new URL('./ui/',import.meta.url)),emptyOutDir:true,target:'es2022',rollupOptions:{input:root+'index.html'}}});
