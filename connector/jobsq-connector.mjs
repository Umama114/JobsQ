// JobsQ Connector: runs the JobsQ agents' AI work on this computer with your own Claude Code or Codex subscription
// ("Your own AI" plan). It asks JobsQ for work, runs it, and sends the answer back. It only makes outgoing requests.
//
// First time (key from JobsQ, Settings, Your AI):   node jobsq-connector.mjs --key jqc_...
// After that (the key is remembered):               node jobsq-connector.mjs
// Options: --tool claude|codex (default: whichever is installed), --server https://..., --model sonnet (Claude only)
// Development only: --house runs JobsQ's own connector (the "JobsQ AI" plan without an API key), key from ../.env
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAVED = join(homedir(), '.jobsq-connector.json');
const PARALLEL = 2;
const RUN_TIMEOUT_MS = 10 * 60_000;
const isWin = process.platform === 'win32';

// ---------- settings ----------
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const house = argv.includes('--house');
let saved = {};
try { saved = JSON.parse(readFileSync(SAVED, 'utf8')); } catch {}
if (house) { try { process.loadEnvFile(join(HERE, '..', '.env')); } catch {} }

const KEY = house ? process.env.CONNECTOR_HOUSE_KEY : (arg('key') || saved.key);
const SERVER = (arg('server') || (house ? 'http://localhost:8000' : saved.server) || 'http://localhost:8000').replace(/\/$/, '');
const MODEL = arg('model') || (house ? process.env.CONNECTOR_MODEL : saved.model) || 'sonnet';
if (!KEY) {
  console.log(house ? 'Set CONNECTOR_HOUSE_KEY in .env first.'
    : 'No key yet. In JobsQ open Settings > Your AI, press "Make a connector key", then run:\n  node jobsq-connector.mjs --key <your key>');
  process.exit(1);
}
if (!house && arg('key')) {
  writeFileSync(SAVED, JSON.stringify({ key: KEY, server: SERVER, model: MODEL }), { mode: 0o600 });
}

// ---------- which AI tool ----------
const CLAUDE = process.env.CLAUDE_BIN || [join(homedir(), '.local/bin/claude.exe'), join(homedir(), '.local/bin/claude')].find(existsSync) || (isWin ? 'claude.cmd' : 'claude');
const CODEX = process.env.CODEX_BIN || (isWin ? 'codex.cmd' : 'codex');
const works = (bin) => { try { return spawnSync(bin, ['--version'], { shell: isWin && bin.endsWith('.cmd'), windowsHide: true, timeout: 20_000 }).status === 0; } catch { return false; } };
let TOOL = arg('tool');
if (!TOOL) TOOL = works(CLAUDE) ? 'claude' : works(CODEX) ? 'codex' : '';
if (!['claude', 'codex'].includes(TOOL)) {
  console.log('Neither Claude Code nor Codex was found on this computer. Install one and sign in to it first:\n'
    + '  Claude Code: https://claude.com/claude-code   (then run: claude, and log in)\n'
    + '  Codex:       npm install -g @openai/codex       (then run: codex, and sign in)');
  process.exit(1);
}

// Keep JobsQ's and other secrets out of the AI tool's environment.
function childEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|OPENAI_API_KEY|CLAUDECODE|CONNECTOR_HOUSE_KEY|JSEARCH_RAPIDAPI_KEY|SERPAPI_KEY|HUNTER_API_KEY|PASSWORD_PEPPER)$/.test(k)
      || /^(WHATSAPP_|SEED_|CLAUDE_CODE_)/.test(k)) delete env[k];
  }
  return env;
}

function runProcess(bin, args, input, cwd) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, env: childEnv(), windowsHide: true, shell: isWin && bin.endsWith('.cmd') });
    let out = '', err = '';
    const timer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out, err: e.message }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
    child.stdin.end(input);
  });
}

// One Claude Code turn. Web work may only search and fetch pages; other work gets no tools at all.
async function runClaude({ system, prompt, web }, cwd) {
  const args = ['-p', '--output-format', 'json', '--model', MODEL, '--setting-sources', 'project', '--permission-mode', 'dontAsk', '--append-system-prompt', system || ''];
  if (web) args.push('--allowedTools', 'WebSearch,WebFetch'); else args.push('--tools', '');
  const r = await runProcess(CLAUDE, args, prompt, cwd);
  try {
    const j = JSON.parse(r.out);
    const u = j.usage || {};
    return { ok: !j.is_error, text: String(j.result ?? ''), error: j.is_error ? String(j.result || 'error') : null,
      usage: { turns: j.num_turns, input: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), output: u.output_tokens || 0 } };
  } catch { return { ok: false, error: `Claude Code gave no answer: ${(r.err || r.out).slice(0, 300)}` }; }
}

// One Codex turn, read-only. Codex has no separate system prompt, so the instructions go first.
async function runCodex({ system, prompt, web }, cwd) {
  const outFile = join(cwd, 'answer.txt');
  const q = (s) => (isWin ? `"${s}"` : s);
  const args = ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--output-last-message', q(outFile)];
  if (web) args.push('-c', 'tools.web_search=true');
  args.push('-');
  const r = await runProcess(CODEX, args, `Instructions:\n${system || ''}\n\nTask:\n${prompt}`, cwd);
  let text = '';
  try { text = readFileSync(outFile, 'utf8').trim(); } catch {}
  return text ? { ok: true, text, usage: {} } : { ok: false, error: `Codex gave no answer: ${(r.err || r.out).slice(-300)}` };
}

// ---------- talking to JobsQ ----------
async function call(path, body) {
  const res = await fetch(`${SERVER}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401) {
    const j = await res.json().catch(() => ({}));
    console.log(j.detail || 'JobsQ rejected this key. Make a new one in JobsQ (Settings > Your AI).');
    process.exit(1);
  }
  if (!res.ok) throw new Error(`JobsQ answered ${res.status}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toLocaleTimeString();
let warned = false;

async function worker() {
  for (;;) {
    let task;
    try {
      ({ task } = await call('/connector/next', { tool: TOOL, version: '1' }));
      if (warned) { console.log(`${now()}  Connected again.`); warned = false; }
    } catch (e) {
      if (!warned) { console.log(`${now()}  Can't reach JobsQ at ${SERVER} (${e.message}). Retrying...`); warned = true; }
      await sleep(5000);
      continue;
    }
    if (!task) continue;
    console.log(`${now()}  Working: ${task.agent || 'task'} ${task.web ? '(with web search)' : ''}`);
    const cwd = mkdtempSync(join(tmpdir(), 'jobsq-ai-')); // an empty folder: the AI sees none of your files
    const t0 = Date.now();
    let r;
    try { r = TOOL === 'codex' ? await runCodex(task, cwd) : await runClaude(task, cwd); }
    finally { try { rmSync(cwd, { recursive: true, force: true }); } catch {} }
    console.log(`${now()}  ${r.ok ? 'Done' : 'Failed'}: ${task.agent || 'task'} in ${Math.round((Date.now() - t0) / 1000)}s${r.ok ? '' : ' - ' + r.error}`);
    try { await call(`/connector/tasks/${task.id}`, r); } catch (e) { console.log(`${now()}  Couldn't send the answer back: ${e.message}`); }
  }
}

console.log(`JobsQ Connector ${house ? '(JobsQ AI, development)' : ''}`);
console.log(`Using ${TOOL === 'codex' ? 'Codex' : `Claude Code (model ${MODEL})`}, connected to ${SERVER}.`);
console.log('Keep this window open while you use JobsQ. Press Ctrl+C to stop.\n');
for (let i = 0; i < PARALLEL; i++) worker();
