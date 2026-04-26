import React from 'react';
import { Home, Wallet, Camera, Calendar, PieChart } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'expenses', icon: Wallet, label: 'Gastos' },
    { id: 'scan', icon: Camera, label: 'Escanear', isFab: true },
    { id: 'planning', icon: Calendar, label: 'Planejamento' },
    { id: 'insights', icon: PieChart, label: 'Painel' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_24px_rgba(10,25,47,0.04)] h-20 rounded-t-2xl flex justify-around items-center px-4 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isFab) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center -mt-10"
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90",
                isActive ? "bg-primary text-on-primary ring-4 ring-primary/20" : "bg-primary text-on-primary"
              )}>
                <Icon className="w-7 h-7" />
              </div>
              <span className="font-manrope text-[10px] font-medium uppercase tracking-wider mt-1 text-slate-400">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center px-3 py-1"
          >
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all",
              isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
            )}>
              <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="font-manrope text-[10px] font-medium uppercase tracking-wider">
                {tab.label}
              </span>
            </div>
            {isActive && (
              <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></div>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
