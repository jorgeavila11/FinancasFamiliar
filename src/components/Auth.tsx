import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { Users, Mail, Lock, Eye, EyeOff, Facebook } from 'lucide-react';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email sign in:', email, password);
    // Placeholder for email sign in
    alert('Entrada com e-mail não disponível nesta demonstração. Use o Google.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafb] px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[420px] w-full flex flex-col items-center"
      >
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-[32px] bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white mb-6">
            <Users className="w-12 h-12 text-[#2d6a4f]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Finance</h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-[280px]">
            Gestão inteligente para o futuro da sua família.
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-white rounded-[40px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-gray-100">
          <div className="space-y-4">
            {/* Social Buttons */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-800 h-[56px] rounded-2xl font-semibold hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-5 h-5"
              />
              Entrar com Google
            </button>
            
            <button
              onClick={handleFacebookSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-800 h-[56px] rounded-2xl font-semibold hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <Facebook className="w-5 h-5 text-[#1877f2] fill-[#1877f2]" />
              Entrar com Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">ou use seu e-mail</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2 pl-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full h-[56px] bg-gray-50 border-none rounded-2xl pl-12 pr-4 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#2d6a4f]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-gray-700 font-medium">Senha</label>
                <button type="button" className="text-[#3a86ff] text-sm font-semibold hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[56px] bg-gray-50 border-none rounded-2xl pl-12 pr-12 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#2d6a4f]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-[60px] bg-[#2d6a4f] text-white rounded-2xl font-bold text-lg shadow-[0_10px_20px_rgba(45,106,79,0.2)] hover:bg-[#1b4332] transition-all active:scale-[0.98] mt-4"
            >
              Entrar
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-gray-600 font-medium tracking-tight">
          Não tem uma conta? <button className="text-[#2d6a4f] font-bold hover:underline">Cadastre-se</button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
