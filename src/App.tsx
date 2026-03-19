import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  History, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  Ruler, 
  DollarSign, 
  Layers,
  Tag,
  MessageCircle,
  Phone,
  RefreshCw,
  TrendingUp,
  Download,
  Edit2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Measurement {
  id: string;
  name: string;
  length: number;
  width: number;
  quantity: number;
  pricePerM2: number;
  area: number;
  cost: number;
  timestamp: number;
}

export default function App() {
  // Global Settings
  const [globalPrice, setGlobalPrice] = useState<string>(() => localStorage.getItem('m2_premium_global_price') || '');
  
  // Current Input State
  const [name, setName] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  
  // History/Project State
  const [items, setItems] = useState<Measurement[]>(() => {
    try {
      const saved = localStorage.getItem('m2_premium_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [projectName, setProjectName] = useState(() => localStorage.getItem('m2_premium_project_name') || 'Mi Proyecto');
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(() => localStorage.getItem('m2_premium_whatsapp') || '');
  const [bcvRate, setBcvRate] = useState<number>(() => {
    const saved = localStorage.getItem('m2_premium_bcv');
    return saved ? Math.ceil(parseFloat(saved)) : 0;
  });
  const [bcvSource, setBcvSource] = useState<string>(() => localStorage.getItem('m2_premium_bcv_source') || '');
  const [isFetchingBcv, setIsFetchingBcv] = useState(false);
  const [lastBcvUpdate, setLastBcvUpdate] = useState<string>(() => localStorage.getItem('m2_premium_bcv_time') || '');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (globalPrice && parseFloat(globalPrice) < 0) {
      newErrors.globalPrice = 'El precio no puede ser negativo';
    }
    if (!length) {
      newErrors.length = 'El largo es requerido';
    } else if (parseFloat(length) <= 0) {
      newErrors.length = 'Debe ser mayor a 0';
    }
    if (!width) {
      newErrors.width = 'El ancho es requerido';
    } else if (parseFloat(width) <= 0) {
      newErrors.width = 'Debe ser mayor a 0';
    }
    if (!quantity) {
      newErrors.quantity = 'Requerido';
    } else if (parseInt(quantity) <= 0) {
      newErrors.quantity = 'Mínimo 1';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  // Fetch BCV Rate
  const fetchBcvRate = async () => {
    setIsFetchingBcv(true);
    setFetchError(null);
    try {
      // Usar nuestro proxy local para evitar problemas de CORS
      // Añadimos un timestamp para evitar cache
      const response = await fetch(`/api/bcv?t=${Date.now()}`);
      
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) errorMessage += `: ${errorData.details}`;
        }
        throw new Error(errorMessage);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respuesta del servidor no es válida (no JSON)");
      }

      const data = await response.json();
      
      if (data && data.rate) {
        setBcvRate(Math.ceil(data.rate));
        setBcvSource(data.source || '');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastBcvUpdate(time);
        localStorage.setItem('m2_premium_bcv', data.rate.toString());
        localStorage.setItem('m2_premium_bcv_source', data.source || '');
        localStorage.setItem('m2_premium_bcv_time', time);
        return;
      }
      throw new Error('Tasa no encontrada en la respuesta');
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
      setFetchError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setIsFetchingBcv(false);
    }
  };

  useEffect(() => {
    // Solo actualizar si no tenemos una tasa reciente o si es 0
    if (bcvRate === 0) {
      fetchBcvRate();
    }
    
    const interval = setInterval(fetchBcvRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('m2_premium_items', JSON.stringify(items));
    localStorage.setItem('m2_premium_whatsapp', whatsappNumber);
    localStorage.setItem('m2_premium_project_name', projectName);
    localStorage.setItem('m2_premium_global_price', globalPrice);
  }, [items, whatsappNumber, projectName, globalPrice]);

  // Derived Calculations for Current Input
  const currentLength = parseFloat(length) || 0;
  const currentWidth = parseFloat(width) || 0;
  const currentQuantity = parseInt(quantity) || 1;
  const currentPrice = parseFloat(globalPrice) || 0;

  const currentArea = (currentLength / 100) * (currentWidth / 100) * currentQuantity;
  const currentCost = currentArea * currentPrice;

  // Derived Calculations for Totals
  const totalArea = items.reduce((sum, item) => sum + item.area, 0);
  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

  const handleAddItem = () => {
    if (!validate()) return;

    if (editingId) {
      setItems(items.map(item => 
        item.id === editingId 
          ? {
              ...item,
              name: name.trim() || `Área ${items.length}`,
              length: currentLength,
              width: currentWidth,
              quantity: currentQuantity,
              pricePerM2: currentPrice,
              area: currentArea,
              cost: currentCost,
            }
          : item
      ));
      setEditingId(null);
    } else {
      const newItem: Measurement = {
        id: crypto.randomUUID(),
        name: name.trim() || `Área ${items.length + 1}`,
        length: currentLength,
        width: currentWidth,
        quantity: currentQuantity,
        pricePerM2: currentPrice,
        area: currentArea,
        cost: currentCost,
        timestamp: Date.now(),
      };

      setItems([newItem, ...items]);
    }
    
    // Reset inputs but keep price
    setName('');
    setLength('');
    setWidth('');
    setQuantity('1');
    setErrors({});
  };

  const handleEditItem = (item: Measurement) => {
    setEditingId(item.id);
    setName(item.name);
    setLength(item.length.toString());
    setWidth(item.width.toString());
    setQuantity(item.quantity.toString());
    setGlobalPrice(item.pricePerM2.toString());
    
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setLength('');
    setWidth('');
    setQuantity('1');
    setErrors({});
  };

  const handleRemoveItem = (id: string) => {
    if (editingId === id) {
      handleCancelEdit();
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setShowClearConfirm(false);
  };

  const handleCopyQuote = () => {
    if (items.length === 0) return;

    let text = `Cotización de Áreas (m²)\n`;
    text += `========================\n\n`;
    
    items.forEach((item, index) => {
      text += `${index + 1}. ${item.name}\n`;
      text += `   Dimensiones: ${item.length}cm x ${item.width}cm (Cant: ${item.quantity})\n`;
      text += `   Área: ${item.area.toFixed(4)} m²\n`;
      if (item.pricePerM2 > 0) {
        text += `   Costo: $${item.cost.toFixed(2)}\n`;
      }
      text += `\n`;
    });

    text += `========================\n`;
    text += `ÁREA TOTAL: ${totalArea.toFixed(4)} m²\n`;
    if (totalCost > 0) {
      text += `COSTO TOTAL: $${totalCost.toFixed(2)}\n`;
      text += `Nota: El diseño va incluido en el costo.\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendWhatsApp = () => {
    if (items.length === 0 || !whatsappNumber) return;

    let text = `*Cotización de Áreas (m²)*\n`;
    text += `========================\n\n`;
    
    items.forEach((item, index) => {
      text += `*${index + 1}. ${item.name}*\n`;
      text += `Dimensiones: ${item.length}cm x ${item.width}cm (Cant: ${item.quantity})\n`;
      if (item.pricePerM2 > 0) {
        text += `Costo: $${item.cost.toFixed(2)}\n`;
        if (bcvRate > 0) {
          text += `Costo (Bs.): ${(item.cost * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.\n`;
        }
      }
      text += `\n`;
    });

    text += `========================\n`;
      if (totalCost > 0) {
      text += `*COSTO TOTAL: $${totalCost.toFixed(2)}*\n`;
      if (bcvRate > 0) {
        text += `*TOTAL BS. (BCV): ${(totalCost * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.*\n`;
        text += `_Tasa BCV: ${Math.ceil(bcvRate)}_\n`;
      }
      text += `\n_Nota: El diseño va incluido en el costo._\n`;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    // Remove leading zero if present (common in Venezuela mobile numbers)
    const processedNumber = cleanNumber.startsWith('0') ? cleanNumber.substring(1) : cleanNumber;
    const finalNumber = `58${processedNumber}`;
    
    const url = `https://wa.me/${finalNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-indigo-500">
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-lg tracking-tight text-neutral-900 leading-none">
                Calculadora m² <span className="text-indigo-600">Premium</span>
              </h1>
              <div className="flex items-center gap-1 mt-1 group cursor-pointer" onClick={() => setIsEditingProjectName(true)}>
                {isEditingProjectName ? (
                  <input
                    autoFocus
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setIsEditingProjectName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingProjectName(false)}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 border-none outline-none rounded px-1 py-0.5 w-32"
                  />
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {projectName}
                    </span>
                    <Edit2 className="w-2.5 h-2.5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {bcvRate > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                <TrendingUp className="w-3 h-3" />
                BCV: {Math.ceil(bcvRate)}
              </div>
            )}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-full transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Instalar
              </button>
            )}
            {items.length > 0 && (
              <button
                onClick={handleCopyQuote}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-indigo-600 transition-colors bg-neutral-100 hover:bg-indigo-50 px-3 py-1.5 rounded-full"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-neutral-100 bg-neutral-50/50">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Nueva Medición
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Global Price */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-neutral-700 flex items-center justify-between w-full">
                    <span>Precio por m² ($)</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">Persistente</span>
                  </label>
                  {errors.globalPrice && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.globalPrice}</span>}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className={`h-4 w-4 ${errors.globalPrice ? 'text-red-400' : 'text-neutral-400'}`} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalPrice}
                    onChange={(e) => { setGlobalPrice(e.target.value); clearError('globalPrice'); }}
                    className={`block w-full pl-9 pr-3 py-2.5 bg-white border ${errors.globalPrice ? 'border-red-300 ring-2 ring-red-500/10' : 'border-neutral-300'} rounded-xl text-neutral-900 focus:ring-2 ${errors.globalPrice ? 'focus:ring-red-500/20 focus:border-red-500' : 'focus:ring-indigo-600/20 focus:border-indigo-600'} transition-all sm:text-sm`}
                    placeholder="Ej: 1500"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-neutral-700">Nombre / Etiqueta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all sm:text-sm"
                    placeholder={`Ej: Área ${items.length + 1}`}
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-neutral-700">Largo (cm)</label>
                  {errors.length && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.length}</span>}
                </div>
                <input
                  type="number"
                  min="0"
                  value={length}
                  onChange={(e) => { setLength(e.target.value); clearError('length'); }}
                  className={`block w-full px-3 py-2.5 bg-white border ${errors.length ? 'border-red-300 ring-2 ring-red-500/10' : 'border-neutral-300'} rounded-xl text-neutral-900 focus:ring-2 ${errors.length ? 'focus:ring-red-500/20 focus:border-red-500' : 'focus:ring-indigo-600/20 focus:border-indigo-600'} transition-all sm:text-sm`}
                  placeholder="Ej: 120"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-neutral-700">Ancho (cm)</label>
                  {errors.width && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.width}</span>}
                </div>
                <input
                  type="number"
                  min="0"
                  value={width}
                  onChange={(e) => { setWidth(e.target.value); clearError('width'); }}
                  className={`block w-full px-3 py-2.5 bg-white border ${errors.width ? 'border-red-300 ring-2 ring-red-500/10' : 'border-neutral-300'} rounded-xl text-neutral-900 focus:ring-2 ${errors.width ? 'focus:ring-red-500/20 focus:border-red-500' : 'focus:ring-indigo-600/20 focus:border-indigo-600'} transition-all sm:text-sm`}
                  placeholder="Ej: 60"
                />
              </div>
              
              {/* Quantity */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-neutral-700">Cantidad</label>
                  {errors.quantity && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.quantity}</span>}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers className={`h-4 w-4 ${errors.quantity ? 'text-red-400' : 'text-neutral-400'}`} />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => { setQuantity(e.target.value); clearError('quantity'); }}
                    className={`block w-full pl-9 pr-3 py-2.5 bg-white border ${errors.quantity ? 'border-red-300 ring-2 ring-red-500/10' : 'border-neutral-300'} rounded-xl text-neutral-900 focus:ring-2 ${errors.quantity ? 'focus:ring-red-500/20 focus:border-red-500' : 'focus:ring-indigo-600/20 focus:border-indigo-600'} transition-all sm:text-sm`}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview & Action */}
          <div className="p-5 sm:p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light tracking-tight text-neutral-900">
                  {currentArea.toFixed(4)}
                </span>
                <span className="text-neutral-500 font-medium">m²</span>
              </div>
              {currentPrice > 0 && (
                <div className="text-lg font-medium text-emerald-600 mt-1">
                  ${currentCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
                >
                  <XCircle className="w-5 h-5" />
                  Cancelar
                </button>
              )}
              <button
                onClick={handleAddItem}
                disabled={currentArea <= 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
              >
                {editingId ? <RefreshCw className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Actualizar Área' : 'Añadir al Proyecto'}
              </button>
            </div>
          </div>
        </section>

        {/* Project List */}
        {items.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" />
                Desglose del Proyecto
              </h2>
              {showClearConfirm ? (
                <div className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                  <span className="text-sm text-red-800 font-medium">¿Borrar todo?</span>
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-red-600 hover:text-red-700 font-bold"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-sm text-neutral-500 hover:text-neutral-700 font-medium"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
              <ul className="divide-y divide-neutral-100">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-neutral-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-neutral-500 mt-1">
                            {item.length}cm × {item.width}cm {item.quantity > 1 ? `(×${item.quantity})` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-semibold text-neutral-900">
                            {item.area.toFixed(4)} m²
                          </div>
                          {item.pricePerM2 > 0 && (
                            <div className="text-sm font-medium text-emerald-600 mt-0.5">
                              ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            aria-label="Editar item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Eliminar item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              
              {/* Totals Footer */}
              <div className="bg-neutral-50 p-5 sm:p-6 border-t border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
                    Total del Proyecto
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-neutral-900">
                      {totalArea.toFixed(4)} <span className="text-lg text-neutral-500 font-normal">m²</span>
                    </div>
                    {totalCost > 0 && (
                      <div className="space-y-1 mt-1">
                        <div className="text-xl font-medium text-emerald-600">
                          ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {bcvRate > 0 && (
                          <div className="text-sm font-semibold text-neutral-500">
                            ≈ {(totalCost * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </div>
                        )}
                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-2 bg-indigo-50 inline-block px-2 py-0.5 rounded">
                          Diseño Incluido
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BCV Rate Input/Display */}
                <div className="mt-4 p-3 bg-white rounded-xl border border-neutral-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-neutral-500 uppercase">Tasa BCV</span>
                    </div>
                    {lastBcvUpdate && (
                      <span className="text-[10px] text-neutral-400 font-medium ml-6">
                        Actualizado: {lastBcvUpdate} {bcvSource && `(${bcvSource})`}
                      </span>
                    )}
                    {fetchError && (
                      <span className="text-[10px] text-red-500 font-medium ml-6 max-w-[150px] leading-tight">
                        {fetchError}. Ingrese manual.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bcvRate || ''}
                      onChange={(e) => setBcvRate(Math.ceil(parseFloat(e.target.value) || 0))}
                      className="w-24 text-right px-2 py-1 text-sm font-bold text-neutral-900 border-b border-neutral-200 focus:border-indigo-500 outline-none"
                      placeholder="0"
                    />
                    <button
                      onClick={fetchBcvRate}
                      disabled={isFetchingBcv}
                      title="Actualizar tasa ahora"
                      className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingBcv ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* WhatsApp Export */}
                <div className="mt-6 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 flex group">
                    <div className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm font-semibold">
                      +58
                    </div>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="414 1234567"
                      className="block w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-r-xl text-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={!whatsappNumber || items.length === 0}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white px-6 py-2.5 rounded-xl font-medium transition-all active:scale-[0.98]"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Enviar WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
