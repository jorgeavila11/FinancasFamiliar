import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { Bell, LogOut, User, Settings, Shield } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  profile: UserProfile | null;
  onNavigate?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ profile, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (tab: string) => {
    onNavigate?.(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[100] h-16 flex items-center justify-between px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4 relative" ref={menuRef}>
        <div 
          className={cn(
            "w-10 h-10 rounded-full border-2 overflow-hidden cursor-pointer transition-all duration-300",
            isMenuOpen ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-slate-200 hover:border-primary/50"
          )}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile?.displayName?.[0] || 'U'}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-14 left-0 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden z-[101]"
            >
              <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 mb-2">
                <p className="font-bold text-slate-900 dark:text-white truncate">{profile?.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{profile?.email}</p>
              </div>
              
              <div className="space-y-1">
                <button 
                  onClick={() => handleNavigate('settings')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4" /> Meu Perfil & Configurações
                </button>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h1 className="font-manrope font-extrabold text-[#0A192F] dark:text-white tracking-tight text-lg">Minhas Finanças</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-full relative">
          <Bell className="w-6 h-6" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-white"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
