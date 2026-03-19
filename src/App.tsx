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
  TrendingUp
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
  const [globalPrice, setGlobalPrice] = useState<string>('');
  
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

  const [copied, setCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(() => localStorage.getItem('m2_premium_whatsapp') || '');
  const [bcvRate, setBcvRate] = useState<number>(() => {
    const saved = localStorage.getItem('m2_premium_bcv');
    return saved ? parseFloat(saved) : 0;
  });
  const [isFetchingBcv, setIsFetchingBcv] = useState(false);
  const [lastBcvUpdate, setLastBcvUpdate] = useState<string>(() => localStorage.getItem('m2_premium_bcv_time') || '');
  const [fetchError, setFetchError] = useState(false);

  // Fetch BCV Rate
  const fetchBcvRate = async () => {
    setIsFetchingBcv(true);
    setFetchError(false);
    try {
      // Usar nuestro proxy local para evitar problemas de CORS
      // En Vercel, esto llamará a /api/bcv.ts
      const response = await fetch('/api/bcv');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.rate) {
        setBcvRate(data.rate);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastBcvUpdate(time);
        localStorage.setItem('m2_premium_bcv', data.rate.toString());
        localStorage.setItem('m2_premium_bcv_time', time);
        return;
      }
      throw new Error('Datos inválidos');
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
      setFetchError(true);
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
  }, [items, whatsappNumber]);

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
    if (currentArea <= 0) return;

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
    
    // Reset inputs but keep price
    setName('');
    setLength('');
    setWidth('');
    setQuantity('1');
  };

  const handleRemoveItem = (id: string) => {
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
      text += `Área: ${item.area.toFixed(4)} m²\n`;
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
        text += `_Tasa BCV: ${bcvRate.toFixed(2)}_\n`;
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
          <div className="flex items-center gap-2 text-indigo-600">
            <Calculator className="w-6 h-6" />
            <h1 className="font-semibold text-lg tracking-tight">Calculadora m² <span className="text-neutral-400 font-normal">Pro</span></h1>
          </div>
          <div className="flex items-center gap-3">
            {bcvRate > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                <TrendingUp className="w-3 h-3" />
                BCV: {bcvRate.toFixed(2)}
              </div>
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
                <label className="text-sm font-medium text-neutral-700">Precio por m² ($) <span className="text-neutral-400 font-normal">(Opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalPrice}
                    onChange={(e) => setGlobalPrice(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all sm:text-sm"
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
                <label className="text-sm font-medium text-neutral-700">Largo (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all sm:text-sm"
                  placeholder="Ej: 120"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Ancho (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all sm:text-sm"
                  placeholder="Ej: 60"
                />
              </div>
              
              {/* Quantity */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-neutral-700">Cantidad</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all sm:text-sm"
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
            
            <button
              onClick={handleAddItem}
              disabled={currentArea <= 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Añadir al Proyecto
            </button>
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
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="shrink-0 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                        Actualizado: {lastBcvUpdate}
                      </span>
                    )}
                    {fetchError && (
                      <span className="text-[10px] text-red-500 font-medium ml-6">
                        Error de conexión. Ingrese manual.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bcvRate || ''}
                      onChange={(e) => setBcvRate(parseFloat(e.target.value) || 0)}
                      className="w-24 text-right px-2 py-1 text-sm font-bold text-neutral-900 border-b border-neutral-200 focus:border-indigo-500 outline-none"
                      placeholder="0.00"
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
