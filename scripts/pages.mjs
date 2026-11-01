import {mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../dist/',import.meta.url)),target=fileURLToPath(new URL('../docs/',import.meta.url));
const assets=path.resolve(target,'assets');if(!assets.startsWith(path.resolve(target)+path.sep))throw Error('Invalid generated asset directory.');
rmSync(assets,{recursive:true,force:true});mkdirSync(target,{recursive:true});cpSync(source,target,{recursive:true});writeFileSync(new URL('../docs/.nojekyll',import.meta.url),'');console.log('Pages files ready in docs/. Publish main /docs in repository Settings > Pages.');
