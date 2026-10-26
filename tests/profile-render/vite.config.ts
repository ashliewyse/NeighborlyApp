import {defineConfig,mergeConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import appConfig from '../../vite.config';
export default mergeConfig(appConfig,defineConfig({
 optimizeDeps:{noDiscovery:true,entries:[]},
 plugins:[{name:'profile-render-exports',enforce:'pre',transform(code,id){if(id.replace(/\\/g,'/').endsWith('/src/app/App.tsx'))return code+'\nexport {UserProfileView,BusinessProfileView};\n';}}],
 resolve:{alias:[{find:'@/lib/supabase',replacement:fileURLToPath(new URL('./supabase.ts',import.meta.url))}]},
 server:{host:'127.0.0.1',port:8097,strictPort:true},
}));
