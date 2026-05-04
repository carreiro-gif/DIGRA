import React, { useState } from 'react';
import { AuthService } from '../services/AuthService';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await AuthService.loginWithGoogle();
      if (AuthService.isAuthorized(user)) {
        onLogin();
      } else {
        setError('Acesso restrito. Somente usuários autorizados podem acessar o histórico.');
        await AuthService.logout();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-neutral-200 shadow-xl text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Acesso Restrito</h1>
        <p className="text-neutral-500 mb-8">
          Somente usuários autorizados (Alexandre ou Chefe) podem acessar o histórico de orçamentos.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              AUTENTICANDO...
            </>
          ) : (
            <>
              <LogIn className="w-6 h-6" />
              ENTRAR COM GOOGLE
            </>
          )}
        </button>
      </div>
    </div>
  );
};
