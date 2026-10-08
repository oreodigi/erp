import crypto from 'node:crypto';
const sessions = new Map();
export const hashPassword = (password, salt=crypto.randomBytes(16).toString('hex')) => salt+':'+crypto.scryptSync(password,salt,64).toString('hex');
export function verifyPassword(password, stored) {
 const [salt, hash] = String(stored||'').split(':');
 if (!salt || !/^[a-f0-9]{128}$/i.test(hash||'')) return false;
 return crypto.timingSafeEqual(crypto.scryptSync(password,salt,64),Buffer.from(hash,'hex'));
}
export function createSession(user) {
 const token=crypto.randomBytes(32).toString('hex');
 sessions.set(crypto.createHash('sha256').update(token).digest('hex'),{user,expires:Date.now()+8*3600000});
 return token;
}
export function readSession(token) {
 if(typeof token!=='string'||!token)return null;
 const key=crypto.createHash('sha256').update(token).digest('hex');
 const record=sessions.get(key);
 if(!record)return null;
 if(record.expires<Date.now()){sessions.delete(key);return null;}
 return record.user;
}
export function revokeSession(token) {
 if(typeof token==='string')sessions.delete(crypto.createHash('sha256').update(token).digest('hex'));
}
