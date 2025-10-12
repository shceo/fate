
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import url from 'url';


const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'secret_admin_key_please_change';

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

function ensureDB(){
  if(!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if(!fs.existsSync(DB_FILE)){
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: [],
      questions: [
        "Какой маленький момент вы не хотите забыть?",
        "Опишите чувство дома в трёх предложениях.",
        "Сообщение себе в будущем:"
      ],
      answers: {},
      covers: {},
      ordered: {},
      status: {}
    }, null, 2));
  }
}
function readDB(){ ensureDB(); return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

(function seedAdmin(){
  ensureDB();
  const db = readDB();
  const email = process.env.SEED_ADMIN_EMAIL;
  const pass  = process.env.SEED_ADMIN_PASSWORD;
  if(email && pass && !db.users.find(u=>u.email.toLowerCase()===email.toLowerCase())){
    const passHash = bcrypt.hashSync(pass, 10);
    db.users.push({ id: nanoid(), name: 'Fate Admin', email, passHash, isAdmin: true, createdAt: new Date().toISOString() });
    writeDB(db);
    console.log('Seeded admin:', email);
  }
})();

app.use(cors({ origin: ['http://localhost:5173','http://127.0.0.1:5173'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

function signToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }
function authRequired(req, res, next){
  const token = req.cookies['fate_token'];
  if(!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try{ req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({ error: 'INVALID_TOKEN' }); }
}
function adminRequired(req, res, next){
  if(!req.user?.isAdmin) return res.status(403).json({ error: 'FORBIDDEN' });
  next();
}

app.post('/api/auth/register', (req, res)=>{
  const { name, email, password } = req.body || {};
  if(!name || !email || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });
  const db = readDB();
  if(db.users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return res.status(409).json({ error: 'EMAIL_TAKEN' });
  const passHash = bcrypt.hashSync(password, 10);
  const user = { id: nanoid(), name, email, passHash, isAdmin: false, createdAt: new Date().toISOString() };
  db.users.push(user); writeDB(db);
  const token = signToken({ id:user.id, email:user.email, name:user.name, isAdmin:false });
  res.cookie('fate_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ id:user.id, name:user.name, email:user.email, isAdmin:false });
});

app.post('/api/auth/login', (req, res)=>{
  const { email, password } = req.body || {};
  const db = readDB();
  const user = db.users.find(u=>u.email.toLowerCase()===String(email||'').toLowerCase());
  if(!user) return res.status(401).json({ error:'INVALID_CREDENTIALS' });
  const ok = bcrypt.compareSync(password||'', user.passHash);
  if(!ok) return res.status(401).json({ error:'INVALID_CREDENTIALS' });
  const token = signToken({ id:user.id, email:user.email, name:user.name, isAdmin:!!user.isAdmin });
  res.cookie('fate_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ id:user.id, name:user.name, email:user.email, isAdmin:!!user.isAdmin });
});

app.post('/api/admin/login', (req, res)=>{
  const { email, password, secretKey } = req.body || {};
  if(secretKey !== ADMIN_SECRET_KEY) return res.status(403).json({ error:'INVALID_SECRET' });
  const db = readDB();
  const user = db.users.find(u=>u.email.toLowerCase()===String(email||'').toLowerCase());
  if(!user) return res.status(401).json({ error:'INVALID_CREDENTIALS' });
  const ok = bcrypt.compareSync(password||'', user.passHash);
  if(!ok) return res.status(401).json({ error:'INVALID_CREDENTIALS' });
  user.isAdmin = true; writeDB(db);
  const token = signToken({ id:user.id, email:user.email, name:user.name, isAdmin:true });
  res.cookie('fate_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ id:user.id, name:user.name, email:user.email, isAdmin:true });
});

app.post('/api/auth/logout', (req, res)=>{ res.clearCookie('fate_token'); res.json({ ok:true }); });
app.get('/api/me', authRequired, (req, res)=>{
  const db = readDB();
  const u = db.users.find(x=>x.id===req.user.id);
  if(!u) return res.status(404).json({ error:'NOT_FOUND' });
  res.json({ id:u.id, name:u.name, email:u.email, isAdmin:!!u.isAdmin });
});

app.get('/api/questions', authRequired, (req, res)=>{
  const db = readDB(); res.json(db.questions);
});
app.post('/api/answers', authRequired, (req, res)=>{
  const { entries } = req.body || {};
  if(!Array.isArray(entries)) return res.status(400).json({ error:'INVALID' });
  const db = readDB();
  db.answers[req.user.id] = entries.map(e=>({questionIndex:Number(e.questionIndex)||0, text:String(e.text||''), createdAt:new Date().toISOString()}));
  writeDB(db); res.json({ ok:true });
});
app.post('/api/cover', authRequired, (req, res)=>{
  const { name } = req.body || {};
  const db = readDB();
  db.covers[req.user.id] = String(name||'');
  writeDB(db); res.json({ ok:true });
});
app.post('/api/complete', authRequired, (req, res)=>{ res.json({ ok:true }); });

app.get('/api/admin/users', authRequired, adminRequired, (req, res)=>{
  const db = readDB();
  res.json(db.users.map(u=>({
    id:u.id, name:u.name, email:u.email, isAdmin:!!u.isAdmin,
    cover: db.covers[u.id] || null,
    ordered: !!db.ordered[u.id],
    status: db.status[u.id] || null,
    answersCount: (db.answers[u.id] || []).length,
    createdAt: u.createdAt
  })));
});
app.get('/api/admin/users/:id', authRequired, adminRequired, (req, res)=>{
  const db = readDB();
  const u = db.users.find(x=>x.id===req.params.id);
  if(!u) return res.status(404).json({ error:'NOT_FOUND' });
  res.json({
    id:u.id, name:u.name, email:u.email, isAdmin:!!u.isAdmin,
    cover: db.covers[u.id] || null,
    ordered: !!db.ordered[u.id],
    status: db.status[u.id] || null,
    answers: db.answers[u.id] || [],
    createdAt: u.createdAt
  });
});
app.post('/api/admin/users/:id/order', authRequired, adminRequired, (req, res)=>{
  const { ordered } = req.body || {};
  const db = readDB(); db.ordered[req.params.id] = !!ordered; writeDB(db); res.json({ ok:true });
});
app.post('/api/admin/users/:id/status', authRequired, adminRequired, (req, res)=>{
  const { status } = req.body || {};
  const allowed = ['in_review','in_design','printing','ready','shipped','delivered', null];
  if(!allowed.includes(status)) return res.status(400).json({ error:'INVALID_STATUS' });
  const db = readDB(); db.status[req.params.id] = status; writeDB(db); res.json({ ok:true });
});

app.listen(PORT, ()=> console.log('Fate API http://localhost:'+PORT));
