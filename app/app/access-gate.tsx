'use client';
import { useState } from 'react';
import { ArrowRight, LoaderCircle, KeyRound } from 'lucide-react';
import InstallApp from './install-app';
export default function AccessGate({
  onSuccess,
}: {
  onSuccess: () => Promise<void>;
}) {
  const [code, setCode] = useState(''),
    [name, setName] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error || 'Não foi possível entrar.');
      setCode('');
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="access panel">
      <img src="/logo-oficial.png" alt="OCA Águia Dourada" />
      <p className="eyebrow">BEM-VINDO À SUA LOJA</p>
      <h1>Um espaço para prosperar</h1>
      <p>Informe o código fornecido pelo responsável.</p>
      <form onSubmit={submit} className="access-form">
        <label className="field">
          <span>Seu nome no histórico (opcional)</span>
          <input
            autoComplete="nickname"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como deseja ser identificado?"
          />
        </label>
        <label className="field">
          <span>Código de acesso</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={32}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Digite seu código"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <KeyRound size={18} />
          )}
          Entrar na loja <ArrowRight size={18} />
        </button>
      </form>
      <InstallApp />
    </section>
  );
}
