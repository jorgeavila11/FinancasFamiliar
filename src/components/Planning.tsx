import React, { useState, useEffect } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, Zap, Car, PiggyBank, ChevronLeft, ChevronRight, Save, Target, Banknote, Plus, Trash2, Calendar } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { FixedExpense } from '../types';

const Planning: React.FC = () => {
  const { household } = useHousehold();
  const [activeTab, setActiveTab] = useState<'calendar' | 'budget' | 'fixed'>('calendar');
  const [budgetValues, setBudgetValues] = useState<Record<string, number>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  // Fixed Expense Form State
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newFixedCategory, setNewFixedCategory] = useState(CATEGORIES[0].id);
  const [newFixedDay, setNewFixedDay] = useState('5');

  useEffect(() => {
    if (household?.budget) {
      setBudgetValues(household.budget);
    }
    if (household?.monthlyIncome) {
      setMonthlyIncome(household.monthlyIncome.toString());
    }
  }, [household]);

  useEffect(() => {
    if (!household) return;
    const q = query(collection(db, 'fixedExpenses'), where('householdId', '==', household.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setFixedExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'fixedExpenses');
    });
    return () => unsubscribe();
  }, [household]);

  const handleSaveBudget = async () => {
    if (!household || !auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'households', household.id), {
        budget: budgetValues,
        monthlyIncome: parseFloat(monthlyIncome.replace(',', '.')) || 0
      });
      alert('Planejamento familiar atualizado!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `households/${household.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !auth.currentUser || !newFixedName || !newFixedAmount) return;

    try {
      await addDoc(collection(db, 'fixedExpenses'), {
        name: newFixedName,
        amount: parseFloat(newFixedAmount.replace(',', '.')),
        category: newFixedCategory,
        dueDate: parseInt(newFixedDay),
        householdId: household.id,
        createdAt: serverTimestamp(),
      });
      setNewFixedName('');
      setNewFixedAmount('');
      setNewFixedDay('5');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fixedExpenses');
    }
  };

  const handleDeleteFixedExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fixedExpenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'fixedExpenses');
    }
  };

  const updateBudgetValue = (catId: string, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    setBudgetValues(prev => ({ ...prev, [catId]: numValue }));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Mock data for the chart as seen in mockup
  const chartData = [
    { day: '01 OUT', projected: 12450, actual: 12450 },
    { day: '08 OUT', projected: 12800, actual: 12600 },
    { day: '15 OUT', projected: 14200, actual: 13800 },
    { day: '22 OUT', projected: 11500, actual: 11000 },
    { day: '31 OUT', projected: 11120, actual: null },
  ];

  const totalBudgetLimit = (Object.values(budgetValues) as number[]).reduce((acc, curr) => acc + (curr || 0), 0);
  const totalFixed = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPlannedOverall = totalBudgetLimit + totalFixed;
  const incomeNum = parseFloat(monthlyIncome.replace(',', '.')) || 0;
  const remainingToPlan = incomeNum - totalPlannedOverall;

  // Calendar Helpers
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const yearName = currentDate.getFullYear();

  return (
    <div className="space-y-12 pb-24">
      {/* Sub-navigation */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-3xl font-bold text-primary">Previsão e Agenda</h1>
          <p className="text-on-surface-variant font-body-md opacity-70">Estruture o futuro financeiro da sua família.</p>
        </div>
        <div className="flex bg-slate-100/80 backdrop-blur rounded-2xl p-1.5 gap-1 self-start md:self-auto border border-slate-200">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'calendar' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('budget')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'budget' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Orçamento
          </button>
          <button 
            onClick={() => setActiveTab('fixed')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'fixed' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Fixos
          </button>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'calendar' && (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Fluxo de Caixa Section */}
            <section className="space-y-6">
              <div className="flex md:items-center justify-between flex-col md:row-gap-2 md:flex-row gap-4">
                <h2 className="font-headline-md text-2xl font-black text-primary">Previsão de Fluxo de Caixa</h2>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Projetado
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Atual
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between h-32">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Saldo Inicial</p>
                    <p className="text-3xl font-black text-primary">R$ 12.450,<span className="text-xl text-slate-400">00</span></p>
                  </div>
                  <div className="p-6 rounded-2xl bg-emerald-50/30 border border-emerald-100 flex flex-col justify-between h-32">
                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-1">Pico Previsto</p>
                    <p className="text-3xl font-black text-emerald-600">R$ 14.200,<span className="text-xl opacity-60">00</span></p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between h-32">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Final Estimado</p>
                    <p className="text-3xl font-black text-primary">R$ 11.120,<span className="text-xl text-slate-400">00</span></p>
                  </div>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorProjNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8', letterSpacing: '0.1em' }} 
                        dy={15} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="projected" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorProjNew)" 
                        animationDuration={2000}
                        strokeDasharray="8 8"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#0f172a" 
                        strokeWidth={4} 
                        fillOpacity={0} 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Calendar Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-primary capitalize">{monthName} {yearName}</h2>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                  <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all text-slate-600">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all text-slate-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(firstDayOfMonth(currentDate))].map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 p-2 opacity-20 bg-slate-50/50 rounded-xl" />
                  ))}
                  {[...Array(daysInMonth(currentDate))].map((_, i) => {
                    const day = i + 1;
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                    const isSelected = selectedDay === day;
                    const dayExpenses = fixedExpenses.filter(e => e.dueDate === day);
                    
                    return (
                      <div 
                        key={day} 
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "h-24 p-3 rounded-2xl flex flex-col justify-between transition-all group cursor-pointer border-2",
                          isSelected 
                            ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20" 
                            : dayExpenses.length > 0 
                              ? "bg-primary/5 text-primary border-primary/20 hover:border-primary/40 shadow-sm" 
                              : "bg-white hover:bg-slate-50 text-primary border-transparent"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className={cn("font-black text-xl", isSelected ? "text-white" : "text-primary")}>{day}</span>
                          {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </div>

                        {dayExpenses.length > 0 && (
                          <div className="space-y-1 mt-1 overflow-hidden">
                            <div className={cn("h-1 w-8 rounded-full mb-2", isSelected ? "bg-white/20" : "bg-primary/10")} />
                            {dayExpenses.length === 1 ? (
                              <p className={cn(
                                "text-[8px] font-black uppercase tracking-widest truncate leading-tight",
                                isSelected ? "text-white/80" : "text-primary/70"
                              )}>
                                {dayExpenses[0].name}
                              </p>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <p className={cn(
                                  "text-[8px] font-black uppercase tracking-widest truncate leading-tight",
                                  isSelected ? "text-white/80" : "text-primary/70"
                                )}>
                                  {dayExpenses.length} CONTAS
                                </p>
                                <div className="flex gap-0.5">
                                  {dayExpenses.slice(0, 3).map((_, idx) => (
                                    <div key={idx} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/40" : "bg-primary/30")} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!dayExpenses.length && !isSelected && (
                          <div className="h-1 w-4 bg-emerald-400 rounded-full mx-auto opacity-0 group-hover:opacity-100 transition-all" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Projected Expenses Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-2xl font-black text-primary">
                  {selectedDay ? `Compromissos do Dia ${selectedDay}` : 'Próximos Gastos Projetados'}
                </h2>
                {selectedDay && (
                  <button 
                    onClick={() => setSelectedDay(null)}
                    className="text-[10px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors"
                  >
                    Ver Todos
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {/* Fixed Expenses for selected day or all */}
                {fixedExpenses
                  .filter(exp => !selectedDay || exp.dueDate === selectedDay)
                  .sort((a, b) => a.dueDate - b.dueDate)
                  .map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">
                          {CATEGORIES.find(c => c.id === exp.category)?.icon || 'home'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-black text-primary text-lg">{exp.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {exp.dueDate} DE {monthName.toUpperCase()} • Contas Fixas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-rose-500 text-xl">-{formatCurrency(exp.amount)}</p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">DÉBITO AUTOMÁTICO</p>
                    </div>
                  </div>
                ))}

                {/* Variable budget items (only shown when showing all or if they don't have a specific due date logic yet) */}
                {(!selectedDay) && (Object.entries(budgetValues) as [string, number][]).filter(([_, val]) => val > 0).map(([catId, amount]) => {
                  const cat = CATEGORIES.find(c => c.id === catId);
                  return (
                    <div key={catId} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm opacity-80 group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-3xl">{cat?.icon || 'category'}</span>
                        </div>
                        <div>
                          <h4 className="font-black text-primary text-lg">Reserva {catId}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            LIMITE MENSAL • Contas Variáveis
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-xl">-{formatCurrency(amount)}</p>
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">PROJETADO</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Summary Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">RESTANTE PARA PLANEJAR</p>
                <h3 className="text-7xl font-black text-white mb-8">
                  {formatCurrency(remainingToPlan < 0 ? 0 : remainingToPlan).split(',')[0]}
                </h3>
                
                <div className="space-y-4">
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((totalPlannedOverall / incomeNum) * 100, 100)}%` }}
                      className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    {Math.round((totalPlannedOverall / incomeNum) * 100)}% da meta mensal atingida
                  </p>
                </div>
              </div>

              {/* Piggybank icon watermark */}
              <div className="absolute right-0 bottom-0 -mb-6 -mr-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <PiggyBank className="w-64 h-64 text-white" />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'budget' && (
          <motion.div 
            key="budget"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-primary">Renda Familiar</h2>
                    <p className="text-sm text-slate-400 font-medium">Cadastre o total disponível (salários, ganhos) para o mês.</p>
                  </div>
                </div>
                
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-primary">Salário Mensal Total</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                    <input 
                      type="text"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-16 bg-white border-none rounded-xl pl-12 pr-4 font-black text-primary text-2xl focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-primary">Limites Mensais</h2>
                    <p className="text-sm text-slate-400 font-medium">Defina quanto sua família pode gastar por categoria.</p>
                  </div>
                  <button 
                    onClick={handleSaveBudget}
                    disabled={isSaving}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                      </div>
                      <span className="font-bold text-primary">{cat.id}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                      <input 
                        type="number"
                        value={budgetValues[cat.id] || ''}
                        onChange={(e) => updateBudgetValue(cat.id, e.target.value)}
                        placeholder="0,00"
                        className="w-full h-14 bg-white border-none rounded-xl pl-12 pr-4 font-black text-primary text-xl focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-emerald-900 mb-2">Por que definir um orçamento?</h3>
                <p className="text-sm text-emerald-700/80 leading-relaxed font-medium">
                  Pessoas que definem limites mensais economizam, em média, 15% a mais do que aquelas que apenas rastreiam gastos.
                </p>
                <div className="mt-6 pt-6 border-t border-emerald-200/50 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Limites Variáveis</p>
                    <p className="text-xl font-black text-emerald-900">
                      {formatCurrency(totalBudgetLimit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Custos Fixos</p>
                    <p className="text-xl font-black text-emerald-900">
                      {formatCurrency(totalFixed)}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-emerald-200/30">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Total Geral Planejado</p>
                    <p className="text-3xl font-black text-emerald-900">
                      {formatCurrency(totalPlannedOverall)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'fixed' && (
          <motion.div 
            key="fixed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-2xl font-black text-primary mb-6">Novo Gasto Fixo</h3>
                <form onSubmit={handleAddFixedExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Gasto</label>
                    <input 
                      type="text" 
                      value={newFixedName}
                      onChange={(e) => setNewFixedName(e.target.value)}
                      placeholder="Ex: Aluguel, Internet..."
                      className="w-full bg-slate-50 border-none h-14 rounded-xl px-4 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                      required
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                      <input 
                        type="text" 
                        value={newFixedAmount}
                        onChange={(e) => setNewFixedAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-slate-50 border-none h-14 rounded-xl pl-10 pr-4 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dia de Vencimento</label>
                    <select 
                      value={newFixedDay}
                      onChange={(e) => setNewFixedDay(e.target.value)}
                      className="w-full bg-slate-50 border-none h-14 rounded-xl px-4 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                    >
                      {[...Array(31)].map((_, i) => (
                        <option key={i+1} value={i+1}>Dia {i+1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                    <select 
                      value={newFixedCategory}
                      onChange={(e) => setNewFixedCategory(e.target.value)}
                      className="w-full bg-slate-50 border-none h-14 rounded-xl px-4 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 pt-2">
                    <button 
                      type="submit"
                      className="w-full bg-primary text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Plus className="w-5 h-5" /> Cadastrar Gasto Fixo
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-xl font-black text-primary mb-6">Gastos Cadastrados</h3>
                <div className="space-y-3">
                  {fixedExpenses.length > 0 ? (
                    fixedExpenses.sort((a,b) => a.dueDate - b.dueDate).map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
                            <span className="material-symbols-outlined text-xl">
                              {CATEGORIES.find(c => c.id === exp.category)?.icon || 'receipt_long'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-primary">{exp.name}</h4>
                            <p className="text-xs text-slate-400">Vence dia {exp.dueDate} • {exp.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="font-bold text-primary text-lg">{formatCurrency(exp.amount)}</p>
                          <button 
                            onClick={() => handleDeleteFixedExpense(exp.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-slate-400 font-medium">Nenhum gasto fixo cadastrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-blue-900 mb-2">Previsibilidade</h3>
                <p className="text-sm text-blue-700/80 leading-relaxed font-medium">
                  Estes gastos são descontados automaticamente do seu saldo disponível para dar uma visão real de quanto dinheiro sobra.
                </p>
                <div className="mt-6 pt-6 border-t border-blue-200/50">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Total em Gastos Fixos</p>
                  <p className="text-3xl font-black text-blue-900">
                    {formatCurrency(fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0))}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Planning;
