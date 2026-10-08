import {Pool} from 'pg';
import {hashPassword} from './auth.mjs';
import readline from 'node:readline';
const username=process.argv[2];
if(!username||!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)){
 console.error('Usage: node provision-admin.mjs <username>');process.exit(2);
}
if(!process.stdin.isTTY){console.error('Run from an interactive SSH terminal');process.exit(2);}
const output={write(chunk){if(!hidden)process.stdout.write(chunk);}};
let hidden=false;
const rl=readline.createInterface({input:process.stdin,output,terminal:true});
const ask=q=>new Promise(resolve=>{process.stdout.write(q);hidden=true;rl.question('',answer=>{hidden=false;process.stdout.write('\n');resolve(answer);});});
try{
 const password=await ask('New administrator password (minimum 14 characters): ');
 if(password.length<14||password.length>256)throw Error('Password length must be 14-256 characters');
 const confirmation=await ask('Repeat password: ');
 if(password!==confirmation)throw Error('Passwords do not match');
 if(process.getuid?.()!==undefined && process.getuid()!==undefined && process.env.USER!=='postgres')throw Error('Run as PostgreSQL OS user via runuser -u postgres');
 const pool=new Pool({host:'/var/run/postgresql',database:'sk_translines',user:'postgres',connectionTimeoutMillis:3000});
 try{
  const hash=hashPassword(password);
  const result=await pool.query('INSERT INTO app.users(username,password_hash,role,active) VALUES ($1,$2,$3,true) ON CONFLICT (username) DO NOTHING RETURNING id',[username,hash,'admin']);
  if(!result.rowCount)throw Error('Username already exists; refusing to overwrite account');
  console.log('Administrator created:',username);
 }finally{await pool.end();}
}catch(e){console.error('Provisioning failed:',e.message);process.exitCode=1;}finally{rl.close();}
