import {startHost} from './host.ts';
const port=Number(process.env.GAME_PORT||8787);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid GAME_PORT.');
const host=startHost({port,dataDir:process.env.DATA_DIR,origins:process.env.ALLOWED_ORIGINS?.split(',')});
host.server.on('listening',()=>console.log(`Tiny Civilization host ready at http://127.0.0.1:${port}/health`));
host.server.on('error',e=>{console.error(e.message);process.exit(1);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{host.close().then(()=>process.exit(0)).catch(()=>process.exit(1));});
