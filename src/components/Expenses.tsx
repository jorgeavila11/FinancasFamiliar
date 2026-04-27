import React, { useState, useEffect } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Expense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Laptop, Sofa, MoreHorizontal, X, Save, Store, Tag, Calendar } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { CATEGORIES } from '../constants';

const Expenses: React.FC = () => {
  const { household, loading } = useHousehold();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'installments'>('list');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!household) return;
    const q = query(collection(db, 'expenses'), where('householdId', '==', household.id), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)).reverse());
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
    });
    return () => unsubscribe();
  }, [household]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !auth.currentUser || !amount || !merchant) return;

    setIsSubmitting(true);
    try {
      const baseAmount = parseFloat(amount.replace(',', '.'));
      const numInstallments = isInstallment ? parseInt(totalInstallments) : 1;
      
      const batch = [];
      const now = new Date();

      for (let i = 0; i < numInstallments; i++) {
        const expenseDate = new Date(now);
        expenseDate.setMonth(now.getMonth() + i);
        
        const data: any = {
          amount: isInstallment ? baseAmount / numInstallments : baseAmount,
          category,
          merchant: isInstallment ? `${merchant} (${i + 1}/${numInstallments})` : merchant,
          date: expenseDate.toISOString(),
          userId: auth.currentUser.uid,
          householdId: household.id,
          createdAt: serverTimestamp(),
        };

        if (isInstallment) {
          data.installments = numInstallments;
          data.installmentIndex = i + 1;
        }
        
        batch.push(data);
      }

      await Promise.all(batch.map(exp => addDoc(collection(db, 'expenses'), exp)));

      setShowAddModal(false);
      setAmount('');
      setMerchant('');
      setCategory(CATEGORIES[0].id);
      setIsInstallment(false);
      setTotalInstallments('2');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-12 font-bold animate-pulse text-slate-400">Carregando despesas...</div>;

  const installmentPurchases = expenses.filter(e => e.installments && e.installments > 1);
  
  interface GroupedInstallment {
    name: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    remainingAmount: number;
    category: string;
  }

  // Group by merchant base name to show summary
  const groupedInstallments = installmentPurchases.reduce((acc, exp) => {
    const baseName = exp.merchant.split(' (')[0];
    if (!acc[baseName]) {
      acc[baseName] = {
        name: baseName,
        totalAmount: exp.amount * (exp.installments || 0),
        installmentAmount: exp.amount,
        totalInstallments: exp.installments || 0,
        paidInstallments: 0,
        remainingAmount: 0,
        category: exp.category
      };
    }
    
    const expDate = new Date(exp.date);
    const now = new Date();
    if (expDate <= now) {
      acc[baseName].paidInstallments++;
    } else {
      acc[baseName].remainingAmount += exp.amount;
    }
    
    return acc;
  }, {} as Record<string, GroupedInstallment>);

  const monthlyInstallmentImpact = (Object.values(groupedInstallments) as GroupedInstallment[]).reduce((sum, item) => sum + item.installmentAmount, 0);

  return (
    <div className="space-y-8 pb-12">
      <section className="flex justify-between items-end">
        <div>
          <span className="font-label-caps text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
            {activeView === 'installments' ? 'PLANO ATUAL' : 'FLUXO FAMILIAR'}
          </span>
          <h1 className="font-headline-md text-3xl font-bold text-primary">
            {activeView === 'installments' ? 'Parcelamentos' : 'Histórico'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveView('list')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeView === 'list' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            LISTA
          </button>
          <button 
            onClick={() => setActiveView('installments')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeView === 'installments' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            ATIVOS
          </button>
        </div>
      </section>

      <button 
        onClick={() => setShowAddModal(true)}
        className="w-full bg-primary text-white py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all group"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        <span className="font-bold">Lançamento Rápido</span>
      </button>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[32px] md:rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-primary">Nova Despesa</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                    <input 
                      type="text" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      required
                      className="w-full bg-slate-50 border-none h-16 rounded-2xl pl-14 pr-6 text-2xl font-black text-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                  <div className="relative">
                    <Store className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Ex: Supermercado, Aluguel..."
                      required
                      className="w-full bg-slate-50 border-none h-14 rounded-2xl pl-14 pr-6 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-primary text-sm">Compra Parcelada</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dividir em meses futuros</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsInstallment(!isInstallment)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative p-1",
                      isInstallment ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-all",
                      isInstallment ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {isInstallment && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nº Parcelas</label>
                      <select 
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        className="w-full bg-slate-50 border-none h-14 rounded-xl px-4 font-bold text-primary focus:ring-2 focus:ring-primary/10"
                      >
                        {[2,3,4,5,6,10,12,18,24].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor da Parcela</label>
                      <div className="h-14 flex items-center px-4 bg-slate-50 rounded-xl font-bold text-primary text-sm opacity-60">
                        {formatCurrency(parseFloat(amount.replace(',', '.')) / parseInt(totalInstallments) || 0)}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                  <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                          category === cat.id ? "bg-primary/5 border-primary text-primary" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        <span className="material-symbols-outlined text-lg leading-none">{cat.icon}</span>
                        <span className="text-xs font-bold">{cat.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white h-16 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  {isSubmitting ? "Salvando..." : <><Save className="w-5 h-5" /> Confirmar Lançamento</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeView === 'installments' ? (
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <p className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-widest">IMPACTO NO ORÇAMENTO MENSAL</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display-lg text-4xl font-bold text-primary">{formatCurrency(monthlyInstallmentImpact)}</span>
                <span className="font-body-md text-slate-400 font-medium">/ mês</span>
              </div>
              <div className="mt-6 w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full w-[65%]"></div>
              </div>
              <p className="mt-3 font-label-caps text-[9px] text-slate-400 font-bold uppercase opacity-70">
                IMPACTO DAS PARCELAS NO ORÇAMENTO FAMILIAR
              </p>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-lg font-bold text-slate-800">Parcelamentos Ativos</h2>
            <div className="space-y-3">
              {(Object.values(groupedInstallments) as GroupedInstallment[]).length > 0 ? (
                (Object.values(groupedInstallments) as GroupedInstallment[]).map(item => {
                  const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
                  return (
                    <motion.div 
                      key={item.name}
                      whileHover={{ x: 5 }}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4 cursor-pointer"
                    >
                      <div className={cn("w-12 h-12 flex items-center justify-center rounded-xl bg-primary/5 text-primary")}>
                        <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-primary">{item.name}</h3>
                        <p className="text-slate-400 text-xs font-medium">{item.paidInstallments} / {item.totalInstallments} parcelas pagas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(item.installmentAmount)}</p>
                        <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest">RESTANTE: {formatCurrency(item.remainingAmount)}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">Nenhum parcelamento ativo</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Crie um novo lançamento marcando "Compra Parcelada"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-lg font-bold text-slate-800">Histórico</h2>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{expenses.length} registros</span>
          </div>
          <div className="space-y-3">
            {expenses.length > 0 ? (
              expenses.map(exp => {
                const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[CATEGORIES.length - 1];
                return (
                  <motion.div 
                    key={exp.id} 
                    whileHover={{ x: 3 }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary/5 transition-colors">
                      <span className="material-symbols-outlined text-xl leading-none">
                        {cat.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-primary line-clamp-1">{exp.merchant}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{exp.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">{formatCurrency(exp.amount)}</p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {new Date(exp.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                  <Tag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-400">Nenhum gasto registrado</h3>
                  <p className="text-xs text-slate-300 px-8">Comece a controlar o orçamento familiar adicionando sua primeira despesa.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
