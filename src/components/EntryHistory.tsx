/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EmotionalEntry, TrafficLightColor } from '../types';
import { formatLongDate, formatTime } from '../utils';
import { Search, Calendar, Edit2, Trash2, SlidersHorizontal, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface EntryHistoryProps {
  entries: EmotionalEntry[];
  onEdit: (entry: EmotionalEntry) => void;
  onDelete: (id: string) => void;
}

export default function EntryHistory({ entries, onEdit, onDelete }: EntryHistoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<TrafficLightColor | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = selectedColorFilter === 'all' || entry.color === selectedColorFilter;
    return matchesSearch && matchesColor;
  });

  // Group entries by local date string
  const getGroupedEntries = () => {
    // Sort all entries: newest date first, but within the same day, ordered chronologically or reverse chronologically.
    // Let's sort entries chronologically within a single day, but have the days themselves sorted newest first.
    // First sort overall by dateTimeISO descending
    const sorted = [...filteredEntries].sort(
      (a, b) => new Date(b.dateTimeISO).getTime() - new Date(a.dateTimeISO).getTime()
    );

    const groups: { [key: string]: EmotionalEntry[] } = {};
    sorted.forEach((entry) => {
      // Get local date portion of the entry
      const localDate = new Date(entry.dateTimeISO);
      const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });

    // For entries within each day group, let's sort them ascending by time (chronological) as requested:
    // "most recent day first, entries within a day sorted by time"
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());
    });

    return groups;
  };

  const grouped = getGroupedEntries();
  const sortedDateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // Newest day first

  const getColorStyles = (color: TrafficLightColor) => {
    switch (color) {
      case 'green':
        return {
          lineColor: 'bg-[#2E7D32]',
          badgeBg: 'bg-[#E8F5E9] text-[#2E7D32]',
          emoji: '🟢',
          name: 'Bienestar'
        };
      case 'yellow':
        return {
          lineColor: 'bg-[#F59E0B]',
          badgeBg: 'bg-[#FFF8E1] text-[#F59E0B]',
          emoji: '🟡',
          name: 'Malestar'
        };
      case 'red':
        return {
          lineColor: 'bg-[#C62828]',
          badgeBg: 'bg-[#FFEBEE] text-[#C62828]',
          emoji: '🔴',
          name: 'Rojo'
        };
    }
  };

  return (
    <div id="entry-history" className="space-y-4 font-sans text-[#333333]">
      
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#F0EDEA] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A8F85]" />
          <input
            type="text"
            placeholder="Buscar en tus notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border border-[#E5E1DD] outline-none focus:ring-2 focus:ring-[#F0EDEA] focus:border-[#7D736A] bg-[#FDFCFB]"
          />
        </div>

        {/* Color filters */}
        <div className="flex flex-wrap gap-1.5 items-center w-full md:w-auto">
          <span className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider mr-2 hidden sm:inline">
            Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
              selectedColorFilter === 'all'
                ? 'bg-[#4A5568] text-white border-transparent'
                : 'bg-white hover:bg-[#F9F8F6] text-[#7D736A] border-[#E5E1DD]'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('green')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors border ${
              selectedColorFilter === 'green'
                ? 'bg-[#2E7D32] text-white border-transparent'
                : 'bg-[#E8F5E9] hover:opacity-90 text-[#2E7D32] border-[#D1EAD0]'
            }`}
          >
            <span>🟢</span> Verde
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('yellow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors border ${
              selectedColorFilter === 'yellow'
                ? 'bg-[#F59E0B] text-white border-transparent'
                : 'bg-[#FFF8E1] hover:opacity-90 text-[#F59E0B] border-[#FEF3C7]'
            }`}
          >
            <span>🟡</span> Amarillo
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('red')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors border ${
              selectedColorFilter === 'red'
                ? 'bg-[#C62828] text-white border-transparent'
                : 'bg-[#FFEBEE] hover:opacity-90 text-[#C62828] border-[#FEE2E2]'
            }`}
          >
            <span>🔴</span> Rojo
          </button>
        </div>
      </div>

      {/* Diary Entries List */}
      {sortedDateKeys.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#F0EDEA] shadow-xs">
          <HelpCircle className="w-8 h-8 text-[#9A8F85] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#7D736A]">No hay registros encontrados</h3>
          <p className="text-xs text-[#9A8F85] mt-1 max-w-xs mx-auto">
            {entries.length === 0
              ? 'Aún no has registrado ningún suceso emocional hoy. Elige un color de arriba para empezar tu diario.'
              : 'Prueba a cambiar tus filtros o términos de búsqueda para encontrar lo que buscas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDateKeys.map((dateKey) => {
            const dayEntries = grouped[dateKey];
            const sampleDateStr = dayEntries[0].dateTimeISO;

            return (
              <div key={dateKey} className="space-y-3">
                {/* Day Header matching Clean Minimalism */}
                <h3 className="text-sm font-semibold text-[#7D736A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5E1DD]"></span> {formatLongDate(sampleDateStr)}
                </h3>

                {/* Day's logs */}
                <div className="space-y-3">
                  {dayEntries.map((entry) => {
                    const style = getColorStyles(entry.color);
                    const isConfirmingDelete = deleteConfirmId === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className="bg-white border border-[#F0EDEA] p-4 rounded-2xl flex gap-4 items-stretch shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Vertical color line */}
                        <div className={`w-1 shrink-0 ${style.lineColor} rounded-full`}></div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-[#9A8F85] uppercase tracking-wider">
                              {formatTime(entry.dateTimeISO)}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${style.badgeBg}`}>
                              {style.name}
                            </span>
                          </div>
                          
                          <p className="text-sm leading-relaxed text-[#4A5568] whitespace-pre-wrap pr-4 break-words">
                            {entry.description}
                          </p>
                        </div>

                        {/* Actions column */}
                        <div className="shrink-0 flex items-center gap-1 self-center border-l border-[#F0EDEA] pl-3">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 bg-[#FFEBEE] p-1 rounded-lg border border-[#FEE2E2]">
                              <span className="text-[10px] font-bold text-[#C62828] px-1 uppercase">
                                ¿Borrar?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDelete(entry.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 bg-[#C62828] hover:bg-[#991B1B] text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-white border border-[#E5E1DD] text-[#7D736A] rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => onEdit(entry)}
                                className="p-1.5 rounded-lg hover:bg-[#F9F8F6] text-[#9A8F85] hover:text-[#4A5568] cursor-pointer transition-colors"
                                title="Editar registro"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(entry.id)}
                                className="p-1.5 rounded-lg hover:bg-[#FFEBEE] text-[#9A8F85] hover:text-[#C62828] cursor-pointer transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
