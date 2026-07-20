/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrafficLightColor, EmotionalEntry, AppSettings } from './types';
import { generatePlainTextLog, formatLongDate, formatTime } from './utils';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

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
  Upload,
  FileText,
  CheckCircle,
  AlertCircle
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

  // Toast and PDF Report states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pdfRange, setPdfRange] = useState<'all' | 'month' | 'two-weeks' | 'week'>('all');
  const [patientName, setPatientName] = useState<string>('');

  // Auto-clear toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
        setToast({ message: '¡Registro copiado al portapapeles con éxito!', type: 'success' });
        setTimeout(() => setCopyStatus('idle'), 2500);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        setToast({ message: 'Error al copiar el registro al portapapeles.', type: 'error' });
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
    setToast({ message: '¡Registro descargado en formato de texto (.txt) con éxito!', type: 'success' });
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
      setToast({ message: '¡Copia de seguridad (.json) exportada con éxito!', type: 'success' });
    } catch (error) {
      console.error("Error exporting backup:", error);
      setImportStatus('Error al exportar la copia de seguridad.');
      setToast({ message: 'Error al exportar la copia de seguridad.', type: 'error' });
    }
  };

  // Generate professional therapeutic PDF report using jsPDF
  const handleGeneratePdf = () => {
    // 1. Filter entries based on selected range
    let filteredEntries = [...entries];
    let rangeText = 'Todos los registros históricos';
    const now = new Date();

    if (pdfRange === 'month') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      filteredEntries = entries.filter(e => new Date(e.dateTimeISO) >= cutoff);
      rangeText = 'Último mes (últimos 30 días)';
    } else if (pdfRange === 'two-weeks') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 14);
      cutoff.setHours(0, 0, 0, 0);
      filteredEntries = entries.filter(e => new Date(e.dateTimeISO) >= cutoff);
      rangeText = 'Últimas dos semanas (últimos 14 días)';
    } else if (pdfRange === 'week') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      filteredEntries = entries.filter(e => new Date(e.dateTimeISO) >= cutoff);
      rangeText = 'Última semana (últimos 7 días)';
    }

    if (filteredEntries.length === 0) {
      setToast({
        message: 'No hay registros en el período seleccionado para generar el informe.',
        type: 'error'
      });
      return;
    }

    // Sort chronologically (oldest first for progression analysis)
    const sortedEntries = [...filteredEntries].sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());

    // Grouping by day
    const groups: { [key: string]: EmotionalEntry[] } = {};
    sortedEntries.forEach(entry => {
      const dateOnly = new Date(entry.dateTimeISO).toDateString();
      if (!groups[dateOnly]) {
        groups[dateOnly] = [];
      }
      groups[dateOnly].push(entry);
    });

    const sortedDays = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Statistics calculations
    const totalCount = sortedEntries.length;
    const greenCount = sortedEntries.filter(e => e.color === 'green').length;
    const yellowCount = sortedEntries.filter(e => e.color === 'yellow').length;
    const redCount = sortedEntries.filter(e => e.color === 'red').length;

    const greenPct = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;
    const yellowPct = totalCount > 0 ? Math.round((yellowCount / totalCount) * 100) : 0;
    const redPct = totalCount > 0 ? Math.round((redCount / totalCount) * 100) : 0;

    // Initialize jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let y = 20;
    const leftMargin = 20;
    const rightMargin = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    let pageNum = 1;

    // Helper to draw header/footer decoration
    const drawFooter = (docInstance: typeof doc, pNum: number) => {
      docInstance.setFont('Helvetica', 'normal');
      docInstance.setFontSize(8);
      docInstance.setTextColor(154, 143, 133); // #9A8F85
      docInstance.text(
        `Informe Terapéutico Personalizado — Semáforo Emocional — Página ${pNum}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
      );
    };

    const addPage = () => {
      drawFooter(doc, pageNum);
      doc.addPage();
      pageNum++;
      y = 20;
    };

    // --- Header ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55); // #1F2937 (Slate 800)
    doc.text('INFORME TERAPÉUTICO EMOCIONAL', leftMargin, y);
    y += 4;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(125, 115, 106); // #7D736A
    doc.text('Auto-observación diaria y registro de estados de ánimo', leftMargin, y);
    y += 5;

    // Decorative line
    doc.setDrawColor(229, 225, 221); // #E5E1DD
    doc.setLineWidth(0.5);
    doc.line(leftMargin, y, pageWidth - rightMargin, y);
    y += 10;

    // --- Patient and period info ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 85, 104); // #4A5568

    doc.text('Paciente:', leftMargin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(patientName.trim() || 'Auto-observación anónima', leftMargin + 38, y);
    y += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(74, 85, 104);
    doc.text('Período del informe:', leftMargin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(rangeText, leftMargin + 38, y);
    y += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(74, 85, 104);
    doc.text('Fecha de emisión:', leftMargin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    const dateFormatted = new Date().toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    doc.text(dateFormatted, leftMargin + 38, y);
    y += 12;

    // --- Statistics and distribution ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('Resumen de Estados Emocionales', leftMargin, y);
    y += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(74, 85, 104);
    doc.text(`Total de sucesos registrados en este período: `, leftMargin, y);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`${totalCount}`, leftMargin + 65, y);
    y += 8;

    // Stats block cards (Green, Yellow, Red)
    const statBoxY = y;
    const boxHeight = 14;
    const boxWidth = contentWidth / 3;

    // Green Card
    doc.setFillColor(232, 245, 233); // Light soft green #E8F5E9
    doc.rect(leftMargin, statBoxY, boxWidth - 2, boxHeight, 'F');
    // Green dot
    doc.setFillColor(16, 185, 129); // #10B981
    doc.ellipse(leftMargin + 6, statBoxY + boxHeight / 2, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(46, 125, 50); // Deep green #2E7D32
    doc.text(`Verde (Positivo)`, leftMargin + 11, statBoxY + boxHeight / 2 - 1.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${greenCount} reg. (${greenPct}%)`, leftMargin + 11, statBoxY + boxHeight / 2 + 3);

    // Yellow Card
    doc.setFillColor(254, 243, 199); // Light soft yellow #FEF3C7
    doc.rect(leftMargin + boxWidth, statBoxY, boxWidth - 2, boxHeight, 'F');
    // Yellow dot
    doc.setFillColor(251, 191, 36); // #FBBF24
    doc.ellipse(leftMargin + boxWidth + 6, statBoxY + boxHeight / 2, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // Deep yellow #B45309
    doc.text(`Amarillo (Alerta)`, leftMargin + boxWidth + 11, statBoxY + boxHeight / 2 - 1.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${yellowCount} reg. (${yellowPct}%)`, leftMargin + boxWidth + 11, statBoxY + boxHeight / 2 + 3);

    // Red Card
    doc.setFillColor(254, 226, 226); // Light soft red #FEE2E2
    doc.rect(leftMargin + boxWidth * 2, statBoxY, boxWidth - 2, boxHeight, 'F');
    // Red dot
    doc.setFillColor(244, 63, 94); // #F43F5E
    doc.ellipse(leftMargin + boxWidth * 2 + 6, statBoxY + boxHeight / 2, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Deep red #B91C1C
    doc.text(`Rojo (Crítico)`, leftMargin + boxWidth * 2 + 11, statBoxY + boxHeight / 2 - 1.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${redCount} reg. (${redPct}%)`, leftMargin + boxWidth * 2 + 11, statBoxY + boxHeight / 2 + 3);

    y += boxHeight + 12;

    // --- Detailed Entries section ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('Detalle del Registro Diario', leftMargin, y);
    y += 5;

    // Thin line
    doc.setDrawColor(240, 237, 234); // #F0EDEA
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, pageWidth - rightMargin, y);
    y += 8;

    // Grouped entries list
    sortedDays.forEach(dayStr => {
      const dayEntries = groups[dayStr];
      
      const firstEntryDate = dayEntries[0].dateTimeISO;
      const dayHeader = formatLongDate(firstEntryDate);

      // Check height needed for day header
      if (y + 12 > pageHeight - 25) {
        addPage();
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(dayHeader, leftMargin, y);
      y += 6;

      dayEntries.forEach(entry => {
        const timeStr = formatTime(entry.dateTimeISO);
        
        // Multi-line description wrapping
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        const textWidth = contentWidth - 40; // 40mm for spacing, bullet, time, label
        const lines = doc.splitTextToSize(entry.description, textWidth);
        const rowHeight = lines.length * 4.5 + 4; // approximate height

        // If page break is needed
        if (y + rowHeight > pageHeight - 25) {
          addPage();
          
          // Re-draw day header on new page with (continuación) label
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(31, 41, 55);
          doc.text(`${dayHeader} (continuación)`, leftMargin, y);
          y += 6;
        }

        // Set bullet color based on entry color
        let colorName = '';
        let r = 0, g = 0, b = 0;
        let textR = 0, textG = 0, textB = 0;
        
        if (entry.color === 'green') {
          colorName = 'Verde';
          r = 16; g = 185; b = 129; // #10B981
          textR = 46; textG = 125; textB = 50; // #2E7D32
        } else if (entry.color === 'yellow') {
          colorName = 'Amarillo';
          r = 251; g = 191; b = 36; // #FBBF24
          textR = 180; textG = 83; textB = 9; // #B45309
        } else {
          colorName = 'Rojo';
          r = 244; g = 63; b = 94; // #F43F5E
          textR = 185; textG = 28; textB = 28; // #B91C1C
        }

        // 1. Bullet circle
        doc.setFillColor(r, g, b);
        doc.ellipse(leftMargin + 3, y + 1.2, 1.5, 1.5, 'F');

        // 2. Time string
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(110, 120, 135); // Slate 500
        doc.text(timeStr, leftMargin + 8, y + 2);

        // 3. Color category badge
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textR, textG, textB);
        doc.text(`[${colorName}]`, leftMargin + 20, y + 2);

        // 4. Description body text
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85); // Slate 700

        let textY = y + 2;
        lines.forEach((lineText: string) => {
          doc.text(lineText, leftMargin + 38, textY);
          textY += 4.5;
        });

        y = textY + 2; // Advance cursor
      });

      y += 4; // gap between days
    });

    // Draw footer on last page
    drawFooter(doc, pageNum);

    // Save/Download PDF
    const filenameSuffix = now.toISOString().slice(0, 10);
    const pdfFilename = `informe_terapeutico_${filenameSuffix}.pdf`;
    doc.save(pdfFilename);

    setToast({
      message: '¡Informe PDF terapéutico creado con éxito!',
      type: 'success'
    });
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

          {/* PDF Report Generation section */}
          <div className="mt-6 pt-5 border-t border-[#F0EDEA]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A8F85] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#7D736A]" />
              Crear Informe Completo (PDF)
            </h3>
            <p className="text-xs text-[#7D736A] leading-relaxed mb-4">
              Genera un documento PDF estructurado y listo para presentar ante un profesional de la psicología. Incluye análisis estadístico, porcentajes y un desglose detallado de tus sucesos agrupados por día.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F9F8F6] p-4 rounded-xl border border-[#F0EDEA]">
              {/* Patient Name field */}
              <div className="space-y-1.5">
                <label htmlFor="patientNameInput" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1">
                  Nombre del Paciente (Opcional)
                </label>
                <input
                  id="patientNameInput"
                  type="text"
                  placeholder="Ej. Juan Pérez (o dejar vacío)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full text-xs bg-white rounded-xl border border-[#E5E1DD] px-3.5 py-2.5 text-[#333333] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A] transition-all"
                />
              </div>

              {/* Range Selector */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <label className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider">
                  Rango del Informe
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-[#E5E1DD]/30 p-1 rounded-xl border border-[#E5E1DD]/60">
                  <button
                    type="button"
                    onClick={() => setPdfRange('all')}
                    className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                      pdfRange === 'all'
                        ? 'bg-white text-[#1F2937] shadow-xs'
                        : 'text-[#7D736A] hover:bg-white/40'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfRange('month')}
                    className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                      pdfRange === 'month'
                        ? 'bg-white text-[#1F2937] shadow-xs'
                        : 'text-[#7D736A] hover:bg-white/40'
                    }`}
                  >
                    1 Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfRange('two-weeks')}
                    className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                      pdfRange === 'two-weeks'
                        ? 'bg-white text-[#1F2937] shadow-xs'
                        : 'text-[#7D736A] hover:bg-white/40'
                    }`}
                  >
                    2 Sem.
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfRange('week')}
                    className={`py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                      pdfRange === 'week'
                        ? 'bg-white text-[#1F2937] shadow-xs'
                        : 'text-[#7D736A] hover:bg-white/40'
                    }`}
                  >
                    1 Sem.
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#7D736A] hover:bg-[#6c6258] text-white text-xs font-bold uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Crear informe completo (PDF)</span>
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

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-white shadow-lg text-xs font-semibold max-w-sm"
            style={{
              borderColor: toast.type === 'success' ? '#D1EAD0' : '#FEE2E2',
              color: toast.type === 'success' ? '#2E7D32' : '#C62828',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-[#2E7D32]" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-[#C62828]" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
