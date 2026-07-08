/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, EmotionalEntry } from '../types';
import { generatePlainTextLog } from '../utils';
import { Settings, Info, Key, FileText, CheckCircle, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

interface AdvancedSettingsProps {
  entries: EmotionalEntry[];
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onMarkEntriesAsSynced: (ids: string[]) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function AdvancedSettings({
  entries,
  settings,
  onSaveSettings,
  onMarkEntriesAsSynced,
}: AdvancedSettingsProps) {
  const [clientId, setClientId] = useState<string>(settings.googleClientId || '');
  const [docId, setDocId] = useState<string>(settings.googleDocId || '');
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastSync, setLastSync] = useState<string | undefined>(settings.lastSyncedAt);

  // Load Google Identity Services script dynamically
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script.');
    };
    document.head.appendChild(script);

    return () => {
      // Keep script loaded for simplicity or remove if needed
    };
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      googleClientId: clientId.trim(),
      googleDocId: docId.trim(),
      lastSyncedAt: lastSync,
    });
    setSyncStatus('success');
    setStatusMessage('Configuración guardada correctamente de forma local.');
    setTimeout(() => {
      setSyncStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleSyncToGoogleDocs = async () => {
    if (!clientId.trim() || !docId.trim()) {
      setSyncStatus('error');
      setStatusMessage('Debes configurar y guardar tu Client ID y el ID del Documento de Google antes de sincronizar.');
      return;
    }

    if (!isScriptLoaded || !window.google?.accounts?.oauth2) {
      setSyncStatus('error');
      setStatusMessage('El script de Google Identity Services aún no se ha cargado. Verifica tu conexión a internet.');
      return;
    }

    // Get unsynced entries
    const unsyncedEntries = entries.filter(e => !e.syncedToGoogleDocs);
    if (unsyncedEntries.length === 0) {
      setSyncStatus('success');
      setStatusMessage('Todos tus registros ya se encuentran sincronizados con Google Docs.');
      return;
    }

    setSyncStatus('loading');
    setStatusMessage('Iniciando autenticación con Google...');

    try {
      // 1. Initialize OAuth 2.0 token client
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/documents',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setSyncStatus('error');
            setStatusMessage(`Error de autorización: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }

          const accessToken = tokenResponse.access_token;
          await performDocAppend(accessToken, unsyncedEntries);
        },
        error_callback: (err: any) => {
          setSyncStatus('error');
          setStatusMessage(`Fallo en el flujo de inicio de sesión: ${err.message || 'Popup bloqueado o cancelado.'}`);
        }
      });

      // 2. Trigger the Google sign-in / authorization popup
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (err: any) {
      console.error('Error during Google OAuth:', err);
      setSyncStatus('error');
      setStatusMessage(`Ocurrió un error inesperado al conectar: ${err.message || err}`);
    }
  };

  const performDocAppend = async (accessToken: string, unsynced: EmotionalEntry[]) => {
    setStatusMessage('Conectando con Google Docs API y añadiendo registros...');
    
    // Format the text of unsynced entries precisely like the user's export format
    // Let's sort unsynced chronologically
    const sortedUnsynced = [...unsynced].sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());
    
    // Build a neat text string specifically for these new entries
    const groups: { [key: string]: EmotionalEntry[] } = {};
    sortedUnsynced.forEach(entry => {
      const dateOnly = new Date(entry.dateTimeISO).toDateString();
      if (!groups[dateOnly]) groups[dateOnly] = [];
      groups[dateOnly].push(entry);
    });

    const sortedDays = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    let appendText = `\n\n--- REGISTROS SINCRONIZADOS EL ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ---\n\n`;
    
    sortedDays.forEach(dayStr => {
      const dayEntries = groups[dayStr];
      dayEntries.sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());
      
      const firstEntryDate = dayEntries[0].dateTimeISO;
      appendText += `📅 ${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(firstEntryDate))}\n`;
      
      dayEntries.forEach(entry => {
        const emoji = entry.color === 'green' ? '🟢' : entry.color === 'yellow' ? '🟡' : '🔴';
        const time = new Date(entry.dateTimeISO).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        appendText += `  ${emoji} ${time} — ${entry.description}\n`;
      });
      appendText += '\n';
    });

    try {
      // 3. Make batchUpdate POST request to Google Docs API
      // To append text to the end of a document, set endOfSegmentLocation to {}
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId.trim()}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: appendText,
                endOfSegmentLocation: {}
              }
            }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error del servidor de Google (HTTP ${response.status})`);
      }

      // Sync success!
      const syncTime = new Date().toISOString();
      setLastSync(syncTime);
      onSaveSettings({
        googleClientId: clientId.trim(),
        googleDocId: docId.trim(),
        lastSyncedAt: syncTime,
      });

      // Mark the synced entries in parent state
      const syncedIds = unsynced.map(e => e.id);
      onMarkEntriesAsSynced(syncedIds);

      setSyncStatus('success');
      setStatusMessage(`¡Sincronización exitosa! Se han añadido ${unsynced.length} registros nuevos a tu documento.`);
    } catch (err: any) {
      console.error('Google Docs API append error:', err);
      setSyncStatus('error');
      setStatusMessage(`Error al escribir en el documento: ${err.message || err}. Asegúrate de que el ID del documento es correcto y que tienes permisos de edición.`);
    }
  };

  const unsyncedCount = entries.filter(e => !e.syncedToGoogleDocs).length;

  return (
    <div id="advanced-settings" className="bg-white rounded-2xl p-6 border border-[#F0EDEA] shadow-xs font-sans">
      <div className="flex items-center gap-2 mb-4 border-b border-[#F0EDEA] pb-3">
        <Settings className="w-4 h-4 text-[#7D736A]" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A8F85]">
          Ajustes Avanzados (Google Docs)
        </h2>
      </div>

      <div className="p-4 bg-[#F9F8F6] border border-[#F0EDEA] rounded-xl mb-5 text-[11px] text-[#7D736A] leading-relaxed space-y-1.5">
        <p className="font-bold text-[#1F2937]">📌 ¿Cómo funciona esto?</p>
        <p>
          Puedes sincronizar automáticamente tus registros diarios directamente con un documento de Google Docs privado de tu elección, para que tu psicólogo pueda consultarlo o para que tengas una copia de seguridad en la nube.
        </p>
        <p>
          <strong>Configuración inicial de una sola vez:</strong>
        </p>
        <ol className="list-decimal list-inside pl-1 space-y-1">
          <li>Crea un proyecto en <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#333333] underline font-semibold">Google Cloud Console</a>.</li>
          <li>Habilita la API de Google Docs y crea un <strong>ID de cliente de OAuth 2.0 (Aplicación Web)</strong>.</li>
          <li>En la consola de Google Cloud, añade como origen autorizado y URI de redirección autorizado el origen de esta aplicación: <code className="bg-[#E5E1DD] px-1 py-0.5 rounded text-[#333333] font-mono text-[10px]">{window.location.origin}</code></li>
          <li>Crea un Google Doc en tu Google Drive y copia su ID de la barra de direcciones (la cadena larga de caracteres entre <code className="bg-[#E5E1DD] px-1 py-0.5 rounded text-[#333333]">/d/</code> y <code className="bg-[#E5E1DD] px-1 py-0.5 rounded text-[#333333]">/edit</code>).</li>
        </ol>
      </div>

      {/* Sync Status Alert */}
      {syncStatus !== 'idle' && (
        <div className={`p-4 rounded-xl mb-5 flex items-start gap-2.5 text-xs font-medium border ${
          syncStatus === 'loading' ? 'bg-[#FFF8E1] border-[#FEF3C7] text-[#F59E0B]' :
          syncStatus === 'success' ? 'bg-[#E8F5E9] border-[#D1EAD0] text-[#2E7D32]' :
          'bg-[#FFEBEE] border-[#FEE2E2] text-[#C62828]'
        }`}>
          {syncStatus === 'loading' && <RefreshCw className="w-4 h-4 animate-spin mt-0.5 shrink-0" />}
          {syncStatus === 'success' && <CheckCircle className="w-4 h-4 text-[#2E7D32] mt-0.5 shrink-0" />}
          {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-[#C62828] mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="leading-relaxed">{statusMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Client ID */}
          <div className="space-y-1.5">
            <label htmlFor="clientId" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#7D736A]" />
              Google OAuth Client ID
            </label>
            <input
              id="clientId"
              type="text"
              placeholder="e.g. 123456-abcde.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-[#E5E1DD] bg-white px-3.5 py-2.5 text-xs text-[#333333] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A] transition-all"
            />
          </div>

          {/* Doc ID */}
          <div className="space-y-1.5">
            <label htmlFor="docId" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#7D736A]" />
              ID del Google Doc
            </label>
            <input
              id="docId"
              type="text"
              placeholder="e.g. 1aBCdeFgHiJkLmNoPqRsTuVwXyZ"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="w-full rounded-xl border border-[#E5E1DD] bg-white px-3.5 py-2.5 text-xs text-[#333333] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A] transition-all"
            />
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="text-[11px] text-[#7D736A]">
            {lastSync ? (
              <p>Última sincronización: <strong className="text-[#333333]">{new Date(lastSync).toLocaleString('es-ES')}</strong></p>
            ) : (
              <p>Aún no se ha realizado ninguna sincronización con Google Docs.</p>
            )}
            {unsyncedCount > 0 ? (
              <p className="mt-0.5 text-[#F59E0B] font-semibold">⚠️ Tienes {unsyncedCount} registros nuevos pendientes de sincronizar.</p>
            ) : (
              <p className="mt-0.5 text-[#2E7D32] font-semibold">✓ Todos tus registros están al día.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2.5 bg-white hover:bg-[#F9F8F6] border border-[#E5E1DD] text-[#7D736A] text-xs font-bold uppercase tracking-wide rounded-xl cursor-pointer transition-colors"
            >
              Guardar Configuración
            </button>
            <button
              type="button"
              disabled={syncStatus === 'loading'}
              onClick={handleSyncToGoogleDocs}
              className="px-4 py-2.5 bg-[#4A5568] hover:bg-[#3d4654] text-white text-xs font-bold uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
