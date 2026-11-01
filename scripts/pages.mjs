import {mkdirSync,cpSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../dist/',import.meta.url)),target=fileURLToPath(new URL('../docs/',import.meta.url));
mkdirSync(target,{recursive:true});cpSync(source,target,{recursive:true});writeFileSync(new URL('../docs/.nojekyll',import.meta.url),'');console.log('Pages files ready in docs/. Publish main /docs in repository Settings > Pages.');
