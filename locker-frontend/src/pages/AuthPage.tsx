import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, Lock, User, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-indigo-600 p-2.5 rounded-xl">
            <Database className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">LOCKER</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create a new workspace'}
          </h2>
          <p className="text-xs text-slate-400 font-mono mb-6">
            {mode === 'login' ? 'Access your distributed file cluster.' : 'Provision a new tenant namespace.'}
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono px-3 py-2.5 rounded-xl mb-4">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Username */}
          <div className="mb-3">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="your_username"
                className="w-full pl-9 pr-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all"
          >
            {isSubmitting
              ? (mode === 'login' ? 'Authenticating...' : 'Provisioning...')
              : (mode === 'login' ? 'Sign In' : 'Create Workspace')}
          </button>

          {/* Toggle */}
          <p className="text-center text-xs text-slate-400 mt-4">
            {mode === 'login' ? "Don't have a workspace? " : 'Already have a workspace? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-300 font-mono mt-6">
          High-availability immutable chunk data management center.
        </p>
      </div>
    </div>
  );
}