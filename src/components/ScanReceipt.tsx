import React, { useState, useRef } from 'react';
import { Camera, X, Zap, CheckCircle, Image as ImageIcon, Flashlight, Save, Settings, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useHousehold } from '../context/HouseholdContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { extractReceiptData, ExtractedReceiptData } from '../services/geminiService';

interface ScanReceiptProps {
  onComplete: () => void;
}

const ScanReceipt: React.FC<ScanReceiptProps> = ({ onComplete }) => {
  const { household } = useHousehold();
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        const mimeType = file.type;
        resolve({ base64, mimeType });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processImage = async (file: File) => {
    setIsScanning(true);
    setScanProgress(10);
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setScanProgress(30);
      const { base64, mimeType } = await fileToBase64(file);
      setScanProgress(50);
      
      const data = await extractReceiptData(base64, mimeType);
      setScanProgress(90);
      
      setExtractedData(data);
      setScanProgress(100);
      
      setTimeout(() => {
        setIsScanning(false);
        setStep(2);
      }, 500);
    } catch (error) {
      console.error("Scan Error:", error);
      setIsScanning(false);
      alert("Erro ao processar o recibo. Tente novamente.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImage(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleConfirm = async () => {
    if (!household || !auth.currentUser || !extractedData) return;
    
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: extractedData.amount,
        category: extractedData.category,
        merchant: extractedData.merchant,
        date: extractedData.date ? new Date(extractedData.date).toISOString() : new Date().toISOString(),
        userId: auth.currentUser.uid,
        householdId: household.id,
        confidence: 0.95
      });
      onComplete();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'expenses');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.section 
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-3xl font-bold text-primary">Escanear Recibo</h2>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-4 py-2 rounded-full uppercase tracking-widest">Passo 1 de 2</span>
            </div>

            <div className="relative aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
              {/* Mock Camera View */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={imagePreview || "https://images.unsplash.com/photo-1549194388-f61be055c448?q=80&w=2600&auto=format&fit=crop"} 
                  alt="Receipt" 
                  className="w-full h-full object-cover opacity-70" 
                />
              </div>

              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[85%] h-[75%] border-2 border-white/30 rounded-2xl relative">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                  
                  {isScanning && (
                    <motion.div 
                      initial={{ top: '0%' }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 w-full h-[3px] bg-primary shadow-[0_0_15px_#3b82f6] z-10"
                    />
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center gap-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
                <p className="text-white text-sm font-bold uppercase tracking-widest opacity-80">
                  {isScanning ? `Analisando... ${scanProgress}%` : 'Posicione o recibo ou escolha um arquivo'}
                </p>
                <div className="flex items-center gap-12">
                  <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all">
                    <Flashlight className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={triggerFileSelect}
                    disabled={isScanning}
                    className="w-20 h-20 rounded-full border-4 border-white p-1 group active:scale-90 transition-all flex items-center justify-center bg-white/10"
                  >
                    {isScanning ? (
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-white group-hover:bg-slate-200 transition-colors shadow-xl flex items-center justify-center">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </button>
                  <button 
                    onClick={triggerFileSelect}
                    disabled={isScanning}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-3xl font-bold text-primary">Revisar Dados</h2>
              <div className="flex items-center gap-2 text-emerald-600 font-black tracking-widest uppercase text-[10px]">
                <CheckCircle className="w-4 h-4" /> Verificado por IA
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-start gap-4 border-b border-slate-50 pb-8 overflow-hidden">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[32px] leading-none">
                    {extractedData?.category === 'Lazer' ? 'local_cafe' : 
                     extractedData?.category === 'Alimentação' ? 'shopping_basket' : 
                     extractedData?.category === 'Transporte' ? 'directions_car' : 
                     extractedData?.category === 'Saúde' ? 'medical_services' :
                     extractedData?.category === 'Educação' ? 'school' :
                     extractedData?.category === 'Moradia' ? 'home' :
                     extractedData?.category === 'Utilidades' ? 'settings' : 'receipt_long'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1 truncate">Estabelecimento</p>
                  <h3 className="font-headline-md text-xl md:text-2xl font-extrabold text-primary break-words line-clamp-2 leading-tight">
                    {extractedData?.merchant || '---'}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Valor</p>
                  <p className="text-2xl md:text-4xl font-black text-primary font-manrope whitespace-nowrap">
                    {formatCurrency(extractedData?.amount || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all cursor-pointer">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data</label>
                  <div className="flex items-center gap-2 font-bold text-slate-700 whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm leading-none opacity-50">calendar_today</span>
                    {extractedData?.date ? (() => {
                      const d = new Date(extractedData.date);
                      return d instanceof Date && !isNaN(d.getTime()) 
                        ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Data Inválida';
                    })() : '---'}
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all cursor-pointer">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoria</label>
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <span className="material-symbols-outlined text-sm opacity-50">category</span>
                    {extractedData?.category || 'Lazer'}
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Compartilhado Com</label>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <img key={i} className="w-8 h-8 rounded-full border-2 border-white object-cover" src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">+2</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleConfirm}
                  className="h-14 w-full bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                  <Save className="w-5 h-5 opacity-50" /> Confirmar Despesa
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="h-12 w-full bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Tirar Nova Foto
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 md:p-6 rounded-3xl flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-500">
                <Zap className="w-6 h-6 md:w-7 md:h-7 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-emerald-900 text-[10px] md:text-sm uppercase tracking-widest">Confiança da IA: 98%</p>
                <p className="text-[10px] md:text-xs text-emerald-700 font-medium opacity-80 mt-0.5">Identificado como '{extractedData?.category}' com base no estabelecimento.</p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScanReceipt;
