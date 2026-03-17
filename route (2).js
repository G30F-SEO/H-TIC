@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --bg: #0a0a0f;
  --bg-surface: #111118;
  --bg-card: #17171f;
  --bg-card-hover: #1c1c26;
  --border: rgba(255,255,255,0.07);
  --border-strong: rgba(255,255,255,0.14);
  --text-primary: #f0f0f5;
  --text-secondary: #8888a0;
  --text-muted: #55556a;
  --accent: #6c63ff;
  --accent-soft: rgba(108,99,255,0.12);
  --accent-border: rgba(108,99,255,0.4);
  --success: #22c55e;
  --success-soft: rgba(34,197,94,0.12);
  --danger: #ef4444;
  --danger-soft: rgba(239,68,68,0.1);
  --warning: #f59e0b;
  --warning-soft: rgba(245,158,11,0.1);
  --blue: #3b82f6;
  --blue-soft: rgba(59,130,246,0.12);
  --green: #22c55e;
  --green-soft: rgba(34,197,94,0.12);
  --amber: #f59e0b;
  --amber-soft: rgba(245,158,11,0.12);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--accent-soft); color: var(--text-primary); }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }

input, textarea, select {
  font-family: var(--font-sans);
  font-size: 14px;
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  color: var(--text-primary);
  width: 100%;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
  appearance: none;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

input::placeholder, textarea::placeholder { color: var(--text-muted); }

select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 32px;
  cursor: pointer;
}

select option { background: var(--bg-card); }

textarea { resize: vertical; min-height: 80px; }

button { font-family: var(--font-sans); cursor: pointer; border: none; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}

.required { color: var(--danger); }

.field { display: flex; flex-direction: column; }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 20px;
}

.badge-blue { background: var(--blue-soft); color: var(--blue); }
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-amber { background: var(--amber-soft); color: var(--amber); }
.badge-success { background: var(--success-soft); color: var(--success); }
.badge-danger { background: var(--danger-soft); color: var(--danger); }
.badge-muted { background: rgba(255,255,255,0.05); color: var(--text-secondary); }

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in { animation: fadeIn 0.2s ease both; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin { animation: spin 0.8s linear infinite; }

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
