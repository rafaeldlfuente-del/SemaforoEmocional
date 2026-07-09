/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrafficLightColor, EmotionalEntry, AppSettings } from './types';
import { generatePlainTextLog } from './utils';

// Import our modular sub-components
import PINLock from './components/PINLock';
import QuickLog from './components/QuickLog';
import EntryModal from './components/EntryModal';
import StatsPanel from './components/StatsPanel';
import EntryHistory from './components/EntryHistory';
import AdvancedSettings from './components/AdvancedSettings';

// Icons
import { 
  ShieldAlert, 
  Lock, 
  Download, 
  Copy, 
  Calendar, 
  SlidersHorizontal, 
  Settings, 
  Sparkles, 
  BookOpen, 
  Check, 
  LogOut,
  Upload
} from 'lucide-react';

// Control de Versión de la Aplicación (Modificar al publicar una nueva versión)
const APP_VERSION = 'v1.4.3';
const APP_LAST_UPDATE = '08/07/2026';

export default function App() {
  // Lock state (loaded on open)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  
  // App state
  const [entries, setEntries] = useState<EmotionalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    googleClientId: '',
    googleDocId: ''
  });

  // Modal / Interaction states
  const [activeColorForModal, setActiveColorForModal] = useState<TrafficLightColor | null>(null);
  const [editingEntry, setEditingEntry] = useState<EmotionalEntry | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Exporter Filter states
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');
  const [importStatus, setImportStatus] = useState<string>('');

  // Register Service Worker on mount
  useEffect(() => {
    // Get the base path of the current page, preserving directory subfolder (e.g., for GitHub Pages)
    const basePath = window.location.pathname.endsWith('/') 
      ? window.location.pathname 
      : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${basePath}sw.js`)
          .then((reg) => console.log('Service Worker registrado con éxito:', reg.scope))
          .catch((err) => console.warn('Service Worker no se pudo registrar:', err));
      });
    }
  }, []);

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('semaforo_entries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }

      const savedSettings = localStorage.getItem('semaforo_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  }, []);

  // Save entries to localStorage whenever they change
  const saveEntriesToStorage = (newEntries: EmotionalEntry[]) => {
    try {
      setEntries(newEntries);
      localStorage.setItem('semaforo_entries', JSON.stringify(newEntries));
    } catch (error) {
      console.error("Error saving entries to localStorage:", error);
    }
  };

  // Lock the app manually
  const handleLockApp = () => {
    setIsUnlocked(false);
  };

  // Save / Update settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('semaforo_settings', JSON.stringify(newSettings));
  };

  // Handle addition of a new emotional entry
  const handleSaveNewEntry = (entryData: { dateTimeISO: string; description: string }) => {
    if (!activeColorForModal) return;

    const newEntry: EmotionalEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      dateTimeISO: entryData.dateTimeISO,
      color: activeColorForModal,
      description: entryData.description,
      createdAt: new Date().toISOString(),
      syncedToGoogleDocs: false
    };

    const updatedEntries = [newEntry, ...entries];
    saveEntriesToStorage(updatedEntries);
    setActiveColorForModal(null);
  };

  // Handle editing an existing entry
  const handleSaveEditedEntry = (entryData: { dateTimeISO: string; description: string }) => {
    if (!editingEntry) return;

    const updatedEntries = entries.map((e) => {
      if (e.id === editingEntry.id) {
        return {
          ...e,
          dateTimeISO: entryData.dateTimeISO,
          description: entryData.description,
          // If description or date changes, we mark it as unsynced so Google Doc gets updated
          syncedToGoogleDocs: false 
        };
      }
      return e;
    });

    saveEntriesToStorage(updatedEntries);
    setEditingEntry(null);
  };

  // Delete an entry
  const handleDeleteEntry = (id: string) => {
    const updatedEntries = entries.filter((e) => e.id !== id);
    saveEntriesToStorage(updatedEntries);
  };

  // Mark specific entries as successfully synced to Google Docs
  const handleMarkEntriesAsSynced = (ids: string[]) => {
    const updatedEntries = entries.map((e) => {
      if (ids.includes(e.id)) {
        return { ...e, syncedToGoogleDocs: true };
      }
      return e;
    });
    saveEntriesToStorage(updatedEntries);
  };

  // Clipboard copy exporter
  const handleCopyToClipboard = () => {
    const textLog = generatePlainTextLog(entries, filterStartDate, filterEndDate);
    navigator.clipboard.writeText(textLog)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 2500);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  // File download .txt exporter
  const handleDownloadTxt = () => {
    const textLog = generatePlainTextLog(entries, filterStartDate, filterEndDate);
    // Add UTF-8 BOM (\uFEFF) to guarantee correct accent representation in Spanish text editors
    const blob = new Blob(['\uFEFF' + textLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const filename = `registro_semaforo_emocional_${dateSuffix}.txt`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export JSON backup for reinstallation or device change
  const handleExportBackupJson = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        entries: entries,
        settings: settings
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const filename = `copia_seguridad_semaforo_${dateSuffix}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting backup:", error);
      setImportStatus('Error al exportar la copia de seguridad.');
    }
  };

  // Import JSON backup and merge entries to protect current state
  const handleImportBackupJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        if (backupData && Array.isArray(backupData.entries)) {
          const importedEntries = backupData.entries as EmotionalEntry[];
          
          // Merge strategy: unique by ID, preserve newest first
          const currentEntriesMap = new Map<string, EmotionalEntry>();
          
          importedEntries.forEach(entry => {
            if (entry.id && entry.color && entry.dateTimeISO) {
              currentEntriesMap.set(entry.id, entry);
            }
          });
          
          entries.forEach(entry => {
            currentEntriesMap.set(entry.id, entry);
          });

          const mergedEntries = Array.from(currentEntriesMap.values());
          mergedEntries.sort((a, b) => new Date(b.dateTimeISO).getTime() - new Date(a.dateTimeISO).getTime());

          saveEntriesToStorage(mergedEntries);

          if (backupData.settings) {
            const mergedSettings = {
              ...settings,
              ...backupData.settings
            };
            handleSaveSettings(mergedSettings);
          }

          setImportStatus(`¡Copia de seguridad importada con éxito! Se han integrado ${importedEntries.length} registros.`);
          setTimeout(() => setImportStatus(''), 5000);
        } else {
          setImportStatus('Error: El archivo no contiene un formato de copia de seguridad válido.');
        }
      } catch (err) {
        console.error("Error reading file:", err);
        setImportStatus('Error: El archivo no contiene un JSON válido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // If locked, render PIN check first
  if (!isUnlocked) {
    return <PINLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-[#333333] antialiased selection:bg-[#E5E1DD]">
      
      {/* Upper Navigation Header matching Clean Minimalism */}
      <header className="sticky top-0 bg-[#FDFCFB]/90 backdrop-blur-md border-b border-[#F0EDEA] z-10 px-6 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E5E1DD] flex items-center justify-center text-[#7D736A] font-bold">
              JD
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-semibold text-[#1F2937] tracking-tight">
                  Semáforo Emocional
                </h1>
                <span 
                  className="text-[9px] font-mono font-bold text-[#7D736A] bg-[#E5E1DD]/45 px-1.5 py-0.5 rounded border border-[#E5E1DD]/80 select-none cursor-help"
                  title={`Última actualización: ${APP_LAST_UPDATE}`}
                >
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-[#7D736A] flex items-center gap-1.5">
                <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="text-[10px] text-[#9A8F85] select-none" title="Fecha de compilación de esta versión">
                  • {APP_LAST_UPDATE}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1DD] rounded-lg text-xs font-medium text-[#7D736A] hover:bg-gray-50 transition-all cursor-pointer"
              title="Descargar .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .txt</span>
            </button>
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#4A5568] text-white rounded-lg text-xs font-medium hover:bg-[#3d4654] transition-all cursor-pointer"
              title="Copiar registro"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyStatus === 'success' ? '¡Copiado!' : 'Copiar registro'}</span>
            </button>
            <button
              type="button"
              onClick={handleLockApp}
              className="p-2.5 rounded-lg border border-[#E5E1DD] bg-white text-[#7D736A] hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Bloquear aplicación"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bloquear</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome and intro card */}
        <div className="bg-[#F9F8F6] border border-[#F0EDEA] p-6 rounded-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="flex items-center gap-1.5 bg-[#E5E1DD]/50 text-[#7D736A] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit">
              <Sparkles className="w-3 h-3" />
              Deberes de terapia recomendados
            </div>
            <h2 className="text-base font-bold text-[#1F2937] tracking-tight">
              Bienvenido a tu espacio de auto-observación
            </h2>
            <p className="text-xs text-[#7D736A] leading-relaxed">
              Registra los sucesos de tu día etiquetándolos con un color. Esta práctica te ayudará a identificar disparadores, proteger tus límites y evaluar tu progreso en la próxima sesión con tu psicólogo.
            </p>
          </div>
        </div>

        {/* 1. Quick Log Panel (Primary traffic buttons) */}
        <QuickLog onSelectColor={(color) => setActiveColorForModal(color)} />

        {/* 2. Stats Panel */}
        <StatsPanel entries={entries} />

        {/* 3. Export panel */}
        <section id="export-panel" className="bg-white rounded-2xl p-6 border border-[#F0EDEA] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-[#7D736A]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A8F85]">
              Exportar para tu sesión terapéutica
            </h2>
          </div>
          <p className="text-xs text-[#7D736A] leading-relaxed mb-5">
            Genera un resumen perfectamente formateado con tus eventos para compartirlos por correo, imprimirlos, o agregarlos a tu historial.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end bg-[#F9F8F6] p-4 rounded-xl border border-[#F0EDEA]">
            {/* Filter Date Start */}
            <div className="space-y-1.5 w-full">
              <label htmlFor="expStart" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha de inicio (Opcional)
              </label>
              <input
                id="expStart"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full text-xs bg-white rounded-xl border border-[#E5E1DD] px-3.5 py-2.5 text-[#333333] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A]"
              />
            </div>

            {/* Filter Date End */}
            <div className="space-y-1.5 w-full">
              <label htmlFor="expEnd" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha de fin (Opcional)
              </label>
              <input
                id="expEnd"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full text-xs bg-white rounded-xl border border-[#E5E1DD] px-3.5 py-2.5 text-[#333333] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A]"
              />
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="flex-1 py-2.5 bg-[#4A5568] hover:bg-[#3d4654] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {copyStatus === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar registro
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex-1 py-2.5 bg-white hover:bg-[#F9F8F6] border border-[#E5E1DD] text-[#7D736A] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#7D736A]" />
                Descargar .txt
              </button>
            </div>
          </div>

          {/* Backup / Restore section matching Clean Minimalism exactly */}
          <div className="mt-6 pt-5 border-t border-[#F0EDEA]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A8F85] mb-2 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#7D736A]" />
              Copia de Seguridad y Migración
            </h3>
            <p className="text-xs text-[#7D736A] leading-relaxed mb-4">
              Exporta tus datos a un archivo de copia de seguridad (.json) para guardarlos fuera de este dispositivo, o impórtalo para recuperarlos o sincronizarlos tras una reinstalación.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="flex-1 py-2.5 bg-white hover:bg-[#F9F8F6] border border-[#E5E1DD] text-[#7D736A] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                title="Exportar copia de seguridad en JSON"
              >
                <Download className="w-3.5 h-3.5 text-[#7D736A]" />
                <span>Exportar Copia (.json)</span>
              </button>
              
              <label className="flex-1 py-2.5 bg-white hover:bg-[#F9F8F6] border border-[#E5E1DD] text-[#7D736A] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs text-center">
                <Upload className="w-3.5 h-3.5 text-[#7D736A]" />
                <span>Importar Copia (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
              </label>
            </div>
            
            {importStatus && (
              <p className={`text-xs mt-3 font-semibold ${
                importStatus.includes('Error') ? 'text-[#C62828]' : 'text-[#2E7D32]'
              }`}>
                {importStatus}
              </p>
            )}
          </div>
        </section>

        {/* 4. History Logs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A8F85]">
              Tu Historial de Sucesos
            </h2>
            <span className="text-xs text-[#7D736A] font-medium font-mono bg-[#F9F8F6] px-2 py-0.5 rounded-full border border-[#E5E1DD]">
              {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          
          <EntryHistory
            entries={entries}
            onEdit={(entry) => setEditingEntry(entry)}
            onDelete={handleDeleteEntry}
          />
        </section>

        {/* Advanced Settings section toggle */}
        <div className="pt-6 border-t border-[#F0EDEA] flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-xs font-semibold text-[#7D736A] hover:text-[#1F2937] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E1DD] shadow-xs cursor-pointer transition-all active:scale-98"
          >
            <Settings className="w-3.5 h-3.5" />
            {showAdvancedSettings ? 'Ocultar Ajustes Avanzados' : 'Mostrar Ajustes Avanzados'}
          </button>

          {showAdvancedSettings && (
            <div className="w-full animate-fade-in">
              <AdvancedSettings
                entries={entries}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onMarkEntriesAsSynced={handleMarkEntriesAsSynced}
              />
            </div>
          )}
        </div>

      </main>

      {/* Footer matching Clean Minimalism exactly */}
      <footer className="px-12 py-6 bg-[#F9F8F6] border-t border-[#F0EDEA] flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#9A8F85] font-bold uppercase tracking-widest gap-4 mt-12">
        <div>Privacidad: Datos almacenados localmente</div>
        <div className="flex gap-6 items-center">
          <button 
            type="button" 
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="hover:text-[#4A5568] cursor-pointer bg-transparent border-none uppercase font-bold tracking-widest text-[10px]"
          >
            Ajustes Avanzados
          </button>
          <span>Google Docs Sync ({settings.googleDocId ? 'On' : 'Off'})</span>
        </div>
      </footer>

      {/* MODALS */}
      
      {/* 1. Add Entry Modal */}
      {activeColorForModal !== null && (
        <EntryModal
          color={activeColorForModal}
          onClose={() => setActiveColorForModal(null)}
          onSave={handleSaveNewEntry}
        />
      )}

      {/* 2. Edit Entry Modal */}
      {editingEntry !== null && (
        <EntryModal
          color={editingEntry.color}
          editingEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEditedEntry}
        />
      )}

    </div>
  );
}
