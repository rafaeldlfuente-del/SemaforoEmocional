/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EmotionalEntry } from '../types';
import { isThisWeek, isThisMonth } from '../utils';
import { BarChart3, Info } from 'lucide-react';

interface StatsPanelProps {
  entries: EmotionalEntry[];
}

type PeriodType = 'week' | 'month' | 'all';

export default function StatsPanel({ entries }: StatsPanelProps) {
  const [period, setPeriod] = useState<PeriodType>('week');

  // Filter entries based on selected period
  const getFilteredEntries = () => {
    switch (period) {
      case 'week':
        return entries.filter(e => isThisWeek(e.dateTimeISO));
      case 'month':
        return entries.filter(e => isThisMonth(e.dateTimeISO));
      case 'all':
        return entries;
    }
  };

  const filtered = getFilteredEntries();
  const total = filtered.length;

  const greenCount = filtered.filter(e => e.color === 'green').length;
  const yellowCount = filtered.filter(e => e.color === 'yellow').length;
  const redCount = filtered.filter(e => e.color === 'red').length;

  const greenPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const yellowPct = total > 0 ? Math.round((yellowCount / total) * 100) : 0;
  const redPct = total > 0 ? Math.round((redCount / total) * 100) : 0;

  return (
    <div id="stats-panel" className="bg-white rounded-2xl p-6 border border-[#F0EDEA] shadow-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-[#F0EDEA] pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#7D736A]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A8F85]">
            Resumen Semafórico
          </h2>
        </div>
        
        {/* Toggle tabs for period selection */}
        <div className="flex bg-[#F9F8F6] p-0.5 rounded-xl border border-[#E5E1DD] self-start sm:self-center">
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              period === 'week' ? 'bg-[#4A5568] text-white shadow-xs' : 'text-[#7D736A] hover:text-[#4A5568]'
            }`}
          >
            Esta semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              period === 'month' ? 'bg-[#4A5568] text-white shadow-xs' : 'text-[#7D736A] hover:text-[#4A5568]'
            }`}
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              period === 'all' ? 'bg-[#4A5568] text-white shadow-xs' : 'text-[#7D736A] hover:text-[#4A5568]'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-[#7D736A]">
          <p className="text-xs font-medium">No hay registros para este período.</p>
          <p className="text-[10px] mt-1 text-[#9A8F85] uppercase tracking-wider font-bold">
            Comienza a registrar eventos pulsando en los botones superiores.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ratio bar - Stacked visualization */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A8F85]">Distribución de estados</span>
            <div className="w-full h-5 rounded-full overflow-hidden flex bg-[#F9F8F6] border border-[#E5E1DD] p-0.5">
              {greenCount > 0 && (
                <div
                  style={{ width: `${greenPct}%` }}
                  className="bg-[#2E7D32] h-full first:rounded-l-full last:rounded-r-full flex items-center justify-center text-[9px] font-bold text-white transition-all duration-500"
                  title={`Verde: ${greenCount} (${greenPct}%)`}
                >
                  {greenPct >= 10 && `${greenPct}%`}
                </div>
              )}
              {yellowCount > 0 && (
                <div
                  style={{ width: `${yellowPct}%` }}
                  className="bg-[#F59E0B] h-full first:rounded-l-full last:rounded-r-full flex items-center justify-center text-[9px] font-bold text-slate-900 transition-all duration-500"
                  title={`Amarillo: ${yellowCount} (${yellowPct}%)`}
                >
                  {yellowPct >= 10 && `${yellowPct}%`}
                </div>
              )}
              {redCount > 0 && (
                <div
                  style={{ width: `${redPct}%` }}
                  className="bg-[#C62828] h-full first:rounded-l-full last:rounded-r-full flex items-center justify-center text-[9px] font-bold text-white transition-all duration-500"
                  title={`Rojo: ${redCount} (${redPct}%)`}
                >
                  {redPct >= 10 && `${redPct}%`}
                </div>
              )}
            </div>
          </div>

          {/* Detailed counts and meters matching Clean Minimalism precisely */}
          <div className="grid grid-cols-3 gap-3">
            {/* Green count card */}
            <div className="bg-[#E8F5E9] p-4 rounded-2xl flex flex-col items-center">
              <span className="text-2xl font-bold text-[#2E7D32]">{greenCount}</span>
              <span className="text-[10px] uppercase font-bold text-[#2E7D32] opacity-70">Verde</span>
            </div>

            {/* Yellow count card */}
            <div className="bg-[#FFF8E1] p-4 rounded-2xl flex flex-col items-center">
              <span className="text-2xl font-bold text-[#F59E0B]">{yellowCount}</span>
              <span className="text-[10px] uppercase font-bold text-[#F59E0B] opacity-70">Amarillo</span>
            </div>

            {/* Red count card */}
            <div className="bg-[#FFEBEE] p-4 rounded-2xl flex flex-col items-center">
              <span className="text-2xl font-bold text-[#C62828]">{redCount}</span>
              <span className="text-[10px] uppercase font-bold text-[#C62828] opacity-70">Rojo</span>
            </div>
          </div>

          {/* Soft therapeutic advice depending on red and yellow count */}
          <div className="p-4 bg-[#F9F8F6] border border-[#F0EDEA] rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#7D736A] mt-0.5 shrink-0" />
            <p className="text-xs text-[#7D736A] leading-relaxed">
              {redCount > 0
                ? "Tienes registros rojos esta temporada. Recuerda hablar detenidamente con tu psicólogo sobre estas situaciones que han vulnerado tus límites personales."
                : yellowCount > 2
                ? "Has registrado algunas incomodidades amarillas. Observa si hay algún patrón recurrente que esté mermando tu paz."
                : "Buen trabajo registrando tus emociones. Sigue haciéndolo diariamente para mantener la continuidad en tus sesiones de terapia."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
