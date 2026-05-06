import React, { useState } from 'react';
import { AuthService } from '../services/AuthService';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

export const LoginGate: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError('Email ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthService.resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setError('Erro ao enviar email. Verifique o endereço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/mascote-sorrindo.png" alt="DIGRA" className="w-20 h-20 object-contain mb-4" />
          <h1 className="text-2xl font-black text-slate-800">
            <span className="text-blue-600">DIGRA</span> — Acesso ao Sistema
          </h1>
          <p className="text-slate-400 text-sm mt-1">Espaço Carreiro</p>
        </div>

        {!showReset ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              ENTRAR NO SISTEMA
            </button>

            <button
              type="button"
              onClick={() => { setShowReset(true); setError(''); }}
              className="w-full text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <h2 className="text-lg font-black text-slate-700 text-center">Recuperar Senha</h2>
            <p className="text-sm text-slate-500 text-center">Digite seu email para receber o link de recuperação</p>

            {resetSent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="text-emerald-700 font-bold text-center">Email enviado! Verifique sua caixa de entrada.</p>
                <button onClick={() => { setShowReset(false); setResetSent(false); }} className="text-blue-600 font-bold text-sm">
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  ENVIAR LINK DE RECUPERAÇÃO
                </button>
                <button type="button" onClick={() => { setShowReset(false); setError(''); }} className="w-full text-sm text-slate-400 hover:text-blue-600 font-medium">
                  Voltar ao login
                </button>
              </>
            )}
          </form>
        )}

        <p className="text-center text-xs text-slate-300 mt-6">⚡ Alexandre | DIGRA Apps</p>
      </motion.div>
    </div>
  );
};
