import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import readline from 'node:readline';
const username=process.argv[2];
if(!username||!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)){console.error('Usage: node provision-admin-standalone.mjs <username>');process.exit(2);}
if(!process.stdin.isTTY){console.error('Interactive SSH terminal required');process.exit(2);}
if(process.getuid?.()!==undefined&&process.getuid()!==undefined&&process.getuid()!==0&&process.env.USER!=='postgres'){console.error('Run as postgres OS user');process.exit(2);}
let hidden=false;
const output={write(chunk){if(!hidden)process.stdout.write(chunk);}};
const rl=readline.createInterface({input:process.stdin,output,terminal:true});
const ask=q=>new Promise(resolve=>{process.stdout.write(q);hidden=true;rl.question('',answer=>{hidden=false;process.stdout.write('\n');resolve(answer);});});
try{
 const password=await ask('New admin password (minimum 14 characters): ');
 const confirmation=await ask('Repeat password: ');
 if(password.length<14||password.length>256||password!==confirmation)throw Error('Password length or confirmation invalid');
 const salt=crypto.randomBytes(16).toString('hex');
 const hash=salt+':'+crypto.scryptSync(password,salt,64).toString('hex');
 const sql="INSERT INTO app.users(username,password_hash,role,active) VALUES ('"+username+"','"+hash+"','admin',true) ON CONFLICT (username) DO NOTHING RETURNING id;";
 const result=spawnSync('/usr/bin/psql',['-d','sk_translines','-v','ON_ERROR_STOP=1','-At'],{input:sql,encoding:'utf8'});
 if(result.status!==0)throw Error('Database insert failed: '+result.stderr.trim());
 if(!/^\d+$/m.test(result.stdout.trim()))throw Error('Username already exists; account not changed');
 console.log('Administrator created:',username);
}catch(e){console.error('Provisioning failed:',e.message);process.exitCode=1;}finally{rl.close();}
