import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Mail, Lock, Eye, EyeOff, Facebook, ArrowLeft, ArrowRight, User } from 'lucide-react';

const Auth: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleFacebookSignIn = async () => {
    const provider = new FacebookAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Ocorreu um erro ao processar sua solicitação.';
      if (err.code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      if (err.code === 'auth/invalid-email') message = 'E-mail inválido.';
      if (err.code === 'auth/weak-password') message = 'A senha é muito fraca.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') message = 'E-mail ou senha incorretos.';
      if (err.message) message = err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#f8fafb] px-6 py-12 overflow-y-auto">
      <motion.div 
        key={isRegistering ? 'register' : 'login'}
        initial={{ opacity: 0, x: isRegistering ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-[420px] w-full flex flex-col items-center"
      >
        {/* Header Section */}
        <div className="w-full flex items-center justify-between mb-8">
          {isRegistering ? (
            <button 
              onClick={() => setIsRegistering(false)}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : <div className="w-10"></div>}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2d6a4f] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-[#0A192F] tracking-tight">FamilyFinance</span>
          </div>
          <div className="w-10"></div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {isRegistering ? 'Criar Conta' : 'Acessar Conta'}
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed max-w-[320px] mx-auto text-lg">
            {isRegistering 
              ? 'Comece a organizar suas finanças pessoais hoje mesmo.' 
              : 'Gerencie seu orçamento de forma inteligente e simples.'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-white rounded-[40px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-gray-100 mb-8">
          <div className="space-y-4">
            {/* Social Buttons */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full h-[56px] flex items-center justify-center gap-4 bg-white border border-gray-100 text-gray-800 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm text-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-5 h-5"
                />
              </div>
              Entrar com Google
            </button>
            
            <button
              onClick={handleFacebookSignIn}
              type="button"
              className="w-full h-[56px] flex items-center justify-center gap-4 bg-white border border-gray-100 text-gray-800 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm text-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Facebook className="w-5 h-5 text-[#1877f2] fill-[#1877f2]" />
              </div>
              Entrar com Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.1em] font-black text-gray-400">
              <span className="px-4 bg-white whitespace-nowrap">ou use seu e-mail</span>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-box"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="block text-gray-700 font-bold mb-2 pl-1 text-sm">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full h-[56px] bg-[#f2f4f7] border-transparent focus:border-transparent focus:ring-0 rounded-2xl pl-12 pr-4 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-gray-700 font-bold mb-2 pl-1 text-sm">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full h-[56px] bg-[#f2f4f7] border-transparent focus:border-transparent focus:ring-0 rounded-2xl pl-12 pr-4 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-gray-700 font-bold text-sm">Senha</label>
                {!isRegistering && (
                  <button type="button" className="text-[#3a86ff] text-xs font-bold hover:underline opacity-80">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[56px] bg-[#f2f4f7] border-transparent focus:border-transparent focus:ring-0 rounded-2xl pl-12 pr-12 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="block text-gray-700 font-bold mb-2 pl-1 text-sm">Confirmar Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[56px] bg-[#f2f4f7] border-transparent focus:border-transparent focus:ring-0 rounded-2xl pl-12 pr-4 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[60px] bg-[#2d6a4f] text-white rounded-2xl font-bold text-lg shadow-[0_10px_30px_rgba(45,106,79,0.2)] hover:bg-[#1b4332] transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isRegistering ? 'Criar Minha Conta' : 'Entrar na Minha Conta'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {isRegistering && (
            <div className="mt-8 text-center text-[10px] text-gray-400 leading-relaxed max-w-[280px] mx-auto font-medium">
              Ao se cadastrar, você concorda com nossos <button type="button" className="text-[#2d6a4f] font-bold">Termos de Uso</button> e <button type="button" className="text-[#2d6a4f] font-bold">Política de Privacidade</button>.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 py-4 border-t border-gray-100 w-full justify-center">
          <span className="text-gray-600 font-bold text-sm tracking-tight">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-[#2d6a4f] font-black text-sm hover:underline"
          >
            {isRegistering ? 'Entrar' : 'Cadastre-se'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
