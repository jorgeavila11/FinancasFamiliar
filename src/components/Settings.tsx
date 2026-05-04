import React, { useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { motion } from 'motion/react';
import { User, Shield, Bell, CreditCard, Users, ChevronRight, Save, LogOut, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { signOut } from 'firebase/auth';

const Settings: React.FC = () => {
  const { household, profile, refreshHousehold } = useHousehold();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [householdName, setHouseholdName] = useState(household?.name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(household?.monthlyIncome?.toString() || '');
  const [geminiApiKey, setGeminiApiKey] = useState(profile?.geminiApiKey || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  // Keep local state in sync with profile data when it loads
  React.useEffect(() => {
    if (profile?.displayName && !displayName) {
      setDisplayName(profile.displayName);
    }
    if (profile?.geminiApiKey && !geminiApiKey) {
      setGeminiApiKey(profile.geminiApiKey);
    }
  }, [profile?.displayName, profile?.geminiApiKey]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSaveSuccess(false);
    const userPath = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: displayName,
        geminiApiKey: geminiApiKey,
        updatedAt: serverTimestamp()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveHousehold = async () => {
    if (!household) return;
    setIsSaving(true);
    const householdPath = `households/${household.id}`;
    try {
      await updateDoc(doc(db, 'households', household.id), {
        name: householdName,
        monthlyIncome: parseFloat(monthlyIncome.replace(',', '.')) || 0
      });
      await refreshHousehold();
      alert('Dados da família atualizados!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, householdPath);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'family', label: 'Configurações', icon: Users },
    { id: 'banking', label: 'Pagamentos & Planos', icon: CreditCard },
    { id: 'privacy', label: 'Privacidade & Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <h2 className="text-2xl font-black text-primary mb-6 px-4">Configurações</h2>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group",
                activeSection === section.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className={cn("w-5 h-5", activeSection === section.id ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                <span className="font-bold text-sm">{section.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 opacity-50", activeSection === section.id ? "block" : "hidden group-hover:block")} />
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-sm">Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            {activeSection === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-black text-primary mb-1">Meu Perfil</h3>
                  <p className="text-sm text-slate-400 font-medium">Gerencie suas informações pessoais.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-black">
                          {profile?.displayName?.[0]}
                        </div>
                      )}
                    </div>
                    <button className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                      <Save className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 w-full space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome de Exibição</label>
                      <input 
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail (Não editável)</label>
                      <div className="w-full h-14 bg-slate-100 dark:bg-slate-900 rounded-2xl px-6 flex items-center font-bold text-slate-400 border border-slate-200 dark:border-slate-800">
                        {profile?.email}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chave API Gemini (Para Scanner)</label>
                      <input 
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="AIzaSy..."
                      />
                      <p className="text-[10px] text-slate-400 px-1 leading-tight">
                        Obtenha sua chave gratuita em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>. Isso evita o uso dos limites do sistema.
                      </p>
                    </div>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className={cn(
                        "h-14 px-8 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto shadow-lg flex items-center justify-center gap-2",
                        saveSuccess ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-primary text-white shadow-primary/20"
                      )}
                    >
                      {isSaving ? (
                        'Salvando...'
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-5 h-5" />
                          Salvo com sucesso!
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'family' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-black text-primary mb-1">Meu Orçamento</h3>
                  <p className="text-sm text-slate-400 font-medium">Configurações globais do seu orçamento.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Agrupamento (SaaS)</label>
                    <input 
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Ex: Meu Orçamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Renda Total Projetada (Mensal)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-primary">R$</span>
                      <input 
                        type="text"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl pl-14 pr-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="14.000,00"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                       Acesso Individual
                    </h4>
                    <p className="text-xs text-slate-500">No momento, o aplicativo é de uso pessoal. No futuro, você poderá convidar membros da família.</p>
                  </div>

                  <button 
                    onClick={handleSaveHousehold}
                    disabled={isSaving}
                    className="bg-primary text-white h-14 px-8 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>
            )}

            {['banking', 'privacy', 'notifications'].includes(activeSection) && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                {React.createElement(sections.find(s => s.id === activeSection)?.icon || Shield, { className: "w-16 h-16 mb-4" })}
                <h3 className="text-xl font-bold mb-2">Em Breve</h3>
                <p className="text-sm">Esta funcionalidade está sendo preparada para a próxima atualização do seu app.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
