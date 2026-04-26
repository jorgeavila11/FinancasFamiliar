import React, { useState, useEffect } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Expense, Goal, Subscription, FixedExpense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Plus, TrendingUp, Car, Utensils, Zap, Shield, Music, ShoppingCart, ArrowRight, Banknote, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

import { CATEGORIES, DEFAULT_BUDGET } from '../constants';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { household, loading } = useHousehold();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

  useEffect(() => {
    if (!household) return;

    // Last 5 expenses for the list
    const expensesRecentQuery = query(
      collection(db, 'expenses'),
      where('householdId', '==', household.id),
      orderBy('date', 'desc'),
      limit(5)
    );

    // All expenses for calculations for selected month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const expensesAllQuery = query(
      collection(db, 'expenses'),
      where('householdId', '==', household.id),
      where('date', '>=', startOfMonth.toISOString()),
      where('date', '<=', endOfMonth.toISOString())
    );

    const goalsQuery = query(
      collection(db, 'goals'),
      where('householdId', '==', household.id)
    );
    const subscriptionsQuery = query(
      collection(db, 'subscriptions'),
      where('householdId', '==', household.id),
      limit(4)
    );
    const fixedExpensesQuery = query(
      collection(db, 'fixedExpenses'),
      where('householdId', '==', household.id)
    );

    const unsubExpenses = onSnapshot(expensesRecentQuery, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
    });

    const unsubAllExpenses = onSnapshot(expensesAllQuery, (snap) => {
      setAllExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
    });

    const unsubGoals = onSnapshot(goalsQuery, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'goals');
    });
    const unsubSubs = onSnapshot(subscriptionsQuery, (snap) => {
      setSubscriptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, 'subscriptions');
    });
    const unsubFixed = onSnapshot(fixedExpensesQuery, (snap) => {
      setFixedExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'fixedExpenses');
    });

    return () => {
      unsubExpenses();
      unsubAllExpenses();
      unsubGoals();
      unsubSubs();
      unsubFixed();
    };
  }, [household, currentDate]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando painel...</div>;

  if (!household) {
    const handleCreateHousehold = async () => {
      if (!auth.currentUser) return;
      try {
      const docRef = await addDoc(collection(db, 'households'), {
        name: 'Meu Orçamento',
        ownerId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        budget: DEFAULT_BUDGET,
        createdAt: serverTimestamp()
      });
        // Update user profile with householdId
        await setDoc(doc(db, 'users', auth.currentUser.uid), { householdId: docRef.id }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'households');
      }
    };

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
        <h2 className="text-2xl font-bold mb-4">Bem-vindo ao Family Finance!</h2>
        <p className="text-slate-500 mb-8 max-w-sm">Crie um grupo familiar para começar a gerenciar metas compartilhadas, rastrear despesas e planejar o futuro da sua família juntos.</p>
        <button 
          onClick={handleCreateHousehold}
          className="bg-primary text-on-primary px-10 py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Criar Grupo Familiar
        </button>
      </div>
    );
  }

  const totalFixedExpenses = fixedExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const currentMonthExpenses = expenses;
  const totalVariableExpenses = currentMonthExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalSpentThisMonth = totalFixedExpenses + totalVariableExpenses;
  
  const budget = household.budget as Record<string, number> || {};
  const variableBudget = Object.values(budget).reduce((acc, val) => acc + (val as number), 0);
  const totalBudget = variableBudget + totalFixedExpenses;
  const budgetPercentage = totalBudget > 0 ? (totalSpentThisMonth / totalBudget) * 100 : 0;
  
  const monthlyIncome = household.monthlyIncome || 0;
  const remainingBalance = monthlyIncome - totalSpentThisMonth;
  const balancePercentage = monthlyIncome > 0 ? (totalSpentThisMonth / monthlyIncome) * 100 : 0;
  const fixedPercentage = monthlyIncome > 0 ? (totalFixedExpenses / monthlyIncome) * 100 : 0;

  // Expenses by category for the monthly breakdown
  const expensesByCategory = allExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8 pb-12">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h2 className="font-headline-md text-3xl font-black text-primary">Meu Dashboard</h2>
          <p className="font-body-md text-slate-500 font-medium mt-1">Gerencie seu orçamento e gastos mensais.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex bg-slate-50 rounded-xl p-1 gap-1 border border-slate-100">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all text-slate-400 hover:text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 flex items-center min-w-[140px] justify-center">
              <span className="font-bold text-primary capitalize text-sm">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all text-slate-400 hover:text-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-10 w-[1px] bg-slate-100 mx-1" />
          
          <div 
            onClick={() => onNavigate?.('planning')}
            className="text-right px-2 cursor-pointer hover:bg-slate-50 rounded-xl py-1 transition-colors"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Renda Mensal</p>
            <p className="font-bold text-primary text-sm">{formatCurrency(household?.monthlyIncome || 0)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Spent vs Budget Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[240px]"
        >
          <div className="relative z-10 w-full">
            <span className="font-label-caps text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Saldo Remanescente</span>
            <div className="flex items-end gap-3 mb-6">
              <span className={cn(
                "font-display-lg text-4xl font-bold",
                remainingBalance < 0 ? "text-rose-500" : "text-primary"
              )}>
                {formatCurrency(remainingBalance)}
              </span>
              <span className={cn(
                "font-body-md pb-2 flex items-center text-sm font-semibold",
                balancePercentage > 90 ? "text-rose-500" : "text-emerald-600"
              )}>
                {monthlyIncome > 0 ? `${balancePercentage.toFixed(1)}% utilizado` : 'Defina sua renda'}
              </span>
            </div>
            
            <div className="mb-8">
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-2 relative">
                {/* Fixed Expenses part */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(fixedPercentage, 100)}%` }}
                  className="h-full bg-blue-500 absolute left-0 top-0 transition-all duration-1000 z-20"
                />
                {/* Variable Expenses part */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(balancePercentage, 100)}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 absolute left-0 top-0 z-10",
                    balancePercentage > 90 ? 'bg-rose-500' : balancePercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Fixos: {formatCurrency(totalFixedExpenses)}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Variáveis: {formatCurrency(totalVariableExpenses)}</span>
                </div>
                <span>Total: {formatCurrency(totalSpentThisMonth)} / {formatCurrency(monthlyIncome)}</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button 
                onClick={() => onNavigate?.('planning')}
                className="bg-primary text-on-primary px-6 h-12 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-5 h-5" /> REVER ORÇAMENTO
              </button>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none">
            <svg className="h-full w-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.7,-31.3,87,-15.7,86.5,-0.3C85.9,15.1,81.5,30.2,74.2,43.6C66.9,57,56.7,68.7,43.9,76.4C31.1,84.1,15.5,87.8,-0.2,88.1C-15.9,88.4,-31.8,85.3,-45.5,77.9C-59.2,70.5,-70.7,58.8,-77.8,44.9C-84.9,31,-87.6,14.9,-87, -1.1C-86.3,-17,-82.3,-32.8,-74.3,-46C-66.3,-59.2,-54.3,-69.9,-40.8,-77.1C-27.3,-84.3,-12.3,-88.1,1.5,-90.7C15.3,-93.3,31.2,-83.6,44.7,-76.4Z" fill="currentColor" transform="translate(100 100)"></path>
            </svg>
          </div>
        </motion.div>

        {/* New Car Goal Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onNavigate?.('planning')}
          className="md:col-span-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6" />
              </div>
              <span className="font-label-caps text-[10px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-bold">75%</span>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface mb-1">Minha Meta</h3>
            <p className="font-body-md text-slate-400 text-sm mb-6">Meta: R$ 45.000</p>
          </div>
          <div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '75%' }}></div>
            </div>
            <div className="flex justify-between font-label-caps text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>R$ 33.750 SALVOS</span>
              <span>R$ 11.250 RESTANTES</span>
            </div>
          </div>
        </motion.div>

        {/* Bills & Subscriptions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-12 bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-xl text-on-surface">Compromissos Financeiros</h3>
            <div className="flex gap-4 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixos + Assinaturas</span>
              <button 
                onClick={() => onNavigate?.('planning')}
                className="text-blue-600 font-label-caps text-[10px] font-bold tracking-widest hover:underline uppercase"
              >
                VER TUDO
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Combined list of Fixed Expenses and Subscriptions */}
            {[
              ...fixedExpenses.map(f => ({ ...f, type: 'fixed' as const })),
              ...subscriptions.map(s => ({ ...s, type: 'sub' as const }))
            ].length > 0 ? (
              [
                ...fixedExpenses.map(f => ({ ...f, type: 'fixed' as const })),
                ...subscriptions.map(s => ({ ...s, type: 'sub' as const }))
              ].sort((a,b) => {
                const dayA = 'dueDate' in a ? a.dueDate : 15; // Default for subs for now
                const dayB = 'dueDate' in b ? b.dueDate : 15;
                return dayA - dayB;
              }).slice(0, 6).map((item, idx) => {
                const isFixed = item.type === 'fixed';
                const cat = CATEGORIES.find(c => c.id === (item as any).category);
                
                return (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    onClick={() => onNavigate?.('planning')}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">
                          {isFixed ? (cat?.icon || 'event_repeat') : 'subscriptions'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface truncate max-w-[120px]">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {isFixed ? `Dia ${(item as any).dueDate}` : 'Mensal'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">{formatCurrency(item.amount)}</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                        isFixed ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {isFixed ? 'Fixo' : 'Assinat.'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              // Empty state
              <div className="col-span-full py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-slate-400 font-medium">Nenhum compromisso fixo ou assinatura encontrada.</p>
                <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest mt-1">Cadastre em Planejamento</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Categories Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4"
        >
          {CATEGORIES.slice(0, 4).map((cat) => {
            const spent = expensesByCategory[cat.id] || 0;
            const limit = household.budget[cat.id] || 0;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            
            return (
              <div 
                key={cat.id} 
                onClick={() => onNavigate?.('expenses')}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{cat.id}</p>
                    <p className="font-bold text-sm text-primary">{formatCurrency(spent)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Smart Insight Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-12 bg-emerald-50 rounded-2xl p-8 border border-emerald-100 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="bg-white p-4 rounded-2xl shadow-sm text-emerald-600">
            <Zap className="w-8 h-8 fill-current" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-label-caps text-[10px] text-emerald-800 font-bold uppercase tracking-widest mb-1">IA Insight</h4>
            <p className="text-emerald-900 font-medium">
              {totalSpentThisMonth > totalBudget 
                ? "Atenção: O orçamento familiar foi extrapolado este mês. Recomendamos revisar gastos com 'Estilo de Vida'."
                : "Economia em curso: Você está dentro do planejado! Se continuar assim, poderá investir mais na meta do Carro Novo."}
            </p>
          </div>
          <button 
            onClick={() => onNavigate?.('insights')}
            className="bg-white px-8 py-4 rounded-xl border border-emerald-100 font-bold text-xs shadow-sm hover:bg-emerald-50 transition-all text-emerald-700 w-full md:w-auto active:scale-95"
          >
            ABRIR ANÁLISE
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
