import React, { useState, useEffect } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { ShoppingCart, Zap, Stars, Banknote, History, ExternalLink } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Expense } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { CATEGORIES } from '../constants';

const Insights: React.FC = () => {
  const { household } = useHousehold();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!household) return;

    const q = query(
      collection(db, 'expenses'),
      where('householdId', '==', household.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses_insights');
    });

    return () => unsubscribe();
  }, [household]);

  if (loading) return <div className="p-12 text-center font-bold animate-pulse text-slate-400">Analisando dados familiares...</div>;

  // Calculate Category Data
  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = CATEGORIES.map(cat => ({
    name: cat.id,
    value: expensesByCategory[cat.id] || 0,
    color: cat.color
  })).filter(c => c.value > 0);

  // Fallback for demo if no data
  const displayCategoryData = categoryData.length > 0 ? categoryData : [
    { name: 'Sem dados', value: 1, color: '#e2e8f0' }
  ];

  // Calculate Monthly History (Last 6 months)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const now = new Date();
  const barData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthIndex = d.getMonth();
    const monthName = monthNames[monthIndex];
    
    const monthTotal = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === monthIndex && expDate.getFullYear() === d.getFullYear();
    }).reduce((acc, exp) => acc + exp.amount, 0);

    return {
      name: monthName,
      spent: monthTotal
    };
  });

  const totalSpentThisMonth = barData[5].spent;
  const totalSpentLastMonth = barData[4].spent;
  const percentChange = totalSpentLastMonth > 0 
    ? ((totalSpentThisMonth - totalSpentLastMonth) / totalSpentLastMonth) * 100 
    : 0;

  return (
    <div className="space-y-10 pb-12">
      <section className="space-y-2">
        <h1 className="font-headline-md text-3xl font-bold text-primary">Análises Mensais</h1>
        <p className="text-on-surface-variant font-body-md opacity-70">Saúde financeira da sua família em tempo real.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Total Spending History Card */}
        <div className="md:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gasto Total (Mês Atual)</span>
              <h2 className="font-headline-md text-3xl font-bold flex items-baseline gap-2 mt-1">
                {formatCurrency(totalSpentThisMonth)}
                <span className={cn(
                  "text-sm font-bold flex items-center mb-1",
                  percentChange <= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  <Banknote className="w-4 h-4 mr-1" /> {Math.abs(percentChange).toFixed(1)}% vs mês anterior
                </span>
              </h2>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar 
                  dataKey="spent" 
                  fill="#e2e8f0" 
                  radius={[8, 8, 0, 0]} 
                  animationDuration={1500}
                >
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={index === 5 ? '#3a86ff' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Breakdown Card */}
        <div className="md:col-span-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-widest">Categorias</span>
            <h2 className="font-headline-md text-2xl font-bold mt-1 mb-8">Maiores Gastos</h2>
            
            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.length > 0 ? (
                categoryData.sort((a,b) => b.value - a.value).map(cat => (
                  <div key={cat.name} className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                    <span className="flex-grow font-bold text-sm text-slate-600 truncate">{cat.name}</span>
                    <span className="font-bold text-primary whitespace-nowrap">{formatCurrency(cat.value)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-300 text-sm italic">Sem despesas registradas.</p>
              )}
            </div>
          </div>

          <div className="relative w-44 h-44 mx-auto mt-8 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {displayCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-slate-800 uppercase">{monthNames[now.getMonth()]}</span>
              <span className="text-[10px] font-bold text-slate-400">2026</span>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-2xl font-bold text-primary">Hábitos de Consumo</h2>
          <button className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] flex items-center hover:underline">
            Ver Histórico <History className="w-4 h-4 ml-2" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 1, title: 'Mestre do Mercado', text: 'Você economizou 12% em compras este mês!', icon: ShoppingCart, bg: 'bg-emerald-50', color: 'text-emerald-600', subBg: 'bg-emerald-200' },
            { id: 2, title: 'Alerta de Energia', text: 'Custos de energia subiram 8%. Revise o uso.', icon: Zap, bg: 'bg-slate-900', color: 'text-white', subBg: 'bg-slate-700' },
            { id: 3, title: 'Mesada Pronta', text: 'As metas das crianças estão 90% completas.', icon: Stars, bg: 'bg-blue-50', color: 'text-blue-600', subBg: 'bg-blue-200' }
          ].map(habit => (
            <div key={habit.id} className={cn("p-6 rounded-2xl flex gap-4 border border-transparent shadow-sm hover:shadow-md transition-all cursor-pointer", habit.bg)}>
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm", habit.subBg)}>
                <habit.icon className={cn("w-6 h-6", habit.color === 'text-white' ? 'text-white' : habit.color)} />
              </div>
              <div>
                <h4 className={cn("font-bold text-sm", habit.color === 'text-white' ? 'text-white' : habit.color)}>{habit.title}</h4>
                <p className={cn("text-xs mt-1 leading-relaxed opacity-80", habit.color === 'text-white' ? 'text-slate-400' : 'text-slate-500 font-medium')}>
                  {habit.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-headline-md text-2xl font-bold text-primary">Oportunidades de Economia</h2>
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {[
            { id: 1, type: 'BANCÁRIO', title: 'Rendimento de Juros', text: 'Mude sua reserva para uma conta HYS e ganhe R$ 45 extras/mês.', icon: <Banknote className="w-12 h-12" />, btn: 'Explorar' },
            { id: 2, type: 'RECORRENTE', title: 'Assinaturas Esquecidas', text: 'Encontramos 2 serviços que você não usa há 60 dias. Poupe R$ 24,99.', icon: <History className="w-12 h-12" />, btn: 'Ver Serviços' }
          ].map(opp => (
            <div key={opp.id} className="min-w-[320px] bg-white p-8 rounded-2xl shadow-sm border border-slate-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 transition-all text-primary">
                {opp.icon}
              </div>
              <span className="font-bold text-[9px] text-primary bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">{opp.type}</span>
              <h3 className="font-headline-md text-xl font-bold mt-4 mb-2">{opp.title}</h3>
              <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">{opp.text}</p>
              <button className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                {opp.btn} <ExternalLink className="w-4 h-4 opacity-50" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Insights;
