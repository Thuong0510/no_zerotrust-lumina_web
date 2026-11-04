// Capture reproducible test output without reading .env or emitting credentials.
import {spawn} from 'node:child_process';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const phase=process.argv[2];
const commands={
  baseline:[['security',['run','test:security']],['probes',['run','test:owasp']]],
  retest:[['probes',['run','test:owasp']]],
  'registration-baseline':[['registration',['run','test:owasp-registration']]],
  'registration-retest':[['registration',['run','test:owasp-registration']]],
  final:[['embedded',['run','test:embedded']],['shopping',['run','test:shopping']],['storefront',['run','test:storefront']],['navigation',['run','test:navigation']],['request-url',['run','test:request-url']],['dependencies',['ls','--depth=0']]],
  backend:[['embedded',['run','test:embedded']]],
  audit:[['npm-audit',['audit','--json']]]
};
if(!Object.hasOwn(commands,phase))throw new Error('Unknown evidence phase: '+phase);
const root=path.resolve('docs/bao-ve/evidence/2026-10-20');
await mkdir(root,{recursive:true});
const npm=process.env.npm_execpath || path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const results=[];
for(const [name,args] of commands[phase]) {
  const start=new Date().toISOString();
  const output=[];
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[npm,...args],{env:{...process.env,TEST_OWASP_PHASE:['baseline','registration-baseline'].includes(phase)?'before':'after',OWASP_EVIDENCE_DIR:root},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',chunk=>output.push(chunk));child.stderr.on('data',chunk=>output.push(chunk));
    child.on('error',reject);child.on('exit',(code,signal)=>resolve(code ?? (signal?1:0)));
  });
  const file=`${phase}-${name}.${phase==='audit'?'json':'txt'}`;
  await writeFile(path.join(root,file),Buffer.concat(output));
  const sha256=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  const result={command:`npm ${args.join(' ')}`,start,end:new Date().toISOString(),exitCode:code,file,sha256};
  results.push(result);console.log(JSON.stringify(result));
}
await writeFile(path.join(root,`${phase}-manifest.json`),JSON.stringify({phase,node:process.version,results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
