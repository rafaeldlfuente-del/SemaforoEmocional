/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrafficLightColor, EmotionalEntry } from '../types';
import { toDatetimeLocalInput } from '../utils';
import { Calendar, AlignLeft, X, Save, Clock } from 'lucide-react';

interface EntryModalProps {
  color: TrafficLightColor;
  editingEntry?: EmotionalEntry | null; // If editing, pass the entry
  onClose: () => void;
  onSave: (entryData: { dateTimeISO: string; description: string }) => void;
}

export default function EntryModal({ color, editingEntry, onClose, onSave }: EntryModalProps) {
  const [dateTime, setDateTime] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editingEntry) {
      setDateTime(toDatetimeLocalInput(editingEntry.dateTimeISO));
      setDescription(editingEntry.description);
    } else {
      // For new entries, default to the current date/time in local time
      setDateTime(toDatetimeLocalInput(new Date().toISOString()));
      setDescription('');
    }
  }, [editingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('La descripción del evento es obligatoria.');
      return;
    }

    if (!dateTime) {
      setError('Por favor, selecciona una fecha y hora válidas.');
      return;
    }

    // Convert local datetime-local value to ISO string
    const isoString = new Date(dateTime).toISOString();
    onSave({
      dateTimeISO: isoString,
      description: description.trim()
    });
  };

  const getThemeConfig = (col: TrafficLightColor) => {
    switch (col) {
      case 'green':
        return {
          title: 'Registro Verde',
          sub: 'Bienestar y felicidad',
          headerBg: 'bg-[#E8F5E9] text-[#2E7D32] border-[#D1EAD0]',
          badge: 'bg-[#D1EAD0] text-[#2E7D32]',
          accentBorder: 'focus:border-[#2E7D32] focus:ring-[#E8F5E9]',
          saveButtonBg: 'bg-[#2E7D32]'
        };
      case 'yellow':
        return {
          title: 'Registro Amarillo',
          sub: 'Incomodidad o malestar (no grave)',
          headerBg: 'bg-[#FFF8E1] text-[#F59E0B] border-[#FEF3C7]',
          badge: 'bg-[#FEF3C7] text-[#F59E0B]',
          accentBorder: 'focus:border-[#F59E0B] focus:ring-[#FFF8E1]',
          saveButtonBg: 'bg-[#F59E0B]'
        };
      case 'red':
        return {
          title: 'Registro Rojo',
          sub: 'Vulneración de voluntad o dignidad',
          headerBg: 'bg-[#FFEBEE] text-[#C62828] border-[#FEE2E2]',
          badge: 'bg-[#FEE2E2] text-[#C62828]',
          accentBorder: 'focus:border-[#C62828] focus:ring-[#FFEBEE]',
          saveButtonBg: 'bg-[#C62828]'
        };
    }
  };

  const config = getThemeConfig(color);

  return (
    <div className="fixed inset-0 bg-[#333333]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl border border-[#F0EDEA] flex flex-col max-h-[90vh]">
        
        {/* Modal Header banner reflecting the color */}
        <div className={`p-5 border-b ${config.headerBg} flex items-center justify-between`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${config.badge}`}>
                {color === 'green' ? 'Verde' : color === 'yellow' ? 'Amarillo' : 'Rojo'}
              </span>
              <span className="text-xs opacity-80 font-medium">
                {editingEntry ? '• Editando registro' : '• Nuevo registro'}
              </span>
            </div>
            <h3 className="text-sm font-bold mt-1 uppercase tracking-wide">
              {config.sub}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7D736A] hover:text-[#333333] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-[#FFEBEE] border border-[#FEE2E2] text-[#C62828] rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Date and Time Pickers */}
          <div className="space-y-2">
            <label htmlFor="dateTime" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7D736A]" />
              Fecha y Hora del Suceso
            </label>
            <div className="relative">
              <input
                id="dateTime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                className={`w-full rounded-xl border border-[#E5E1DD] bg-white px-4 py-3 text-sm text-[#333333] shadow-xs outline-none focus:ring-3 focus:border-[#7D736A] transition-all ${config.accentBorder}`}
              />
            </div>
            <p className="text-[11px] text-[#7D736A] leading-normal">
              Puedes ajustar la hora si estás registrando una situación pasada de forma retroactiva.
            </p>
          </div>

          {/* Event description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-[10px] font-bold text-[#9A8F85] uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-[#7D736A]" />
              ¿Qué ha pasado exactamente?
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe detalladamente lo que ocurrió, tus sentimientos, pensamientos, o la acción concreta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className={`w-full rounded-xl border border-[#E5E1DD] bg-white px-4 py-3 text-sm text-[#333333] shadow-xs outline-none focus:ring-3 focus:border-[#7D736A] transition-all resize-none ${config.accentBorder}`}
            />
            <p className="text-[11px] text-[#7D736A] leading-normal">
              Sugerencia terapéutica: Describe los hechos de forma objetiva, indicando tu respuesta emocional o los límites marcados.
            </p>
          </div>
        </form>

        {/* Footer actions */}
        <div className="p-4 bg-[#F9F8F6] border-t border-[#F0EDEA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#FDFCFB] border border-[#E5E1DD] text-[#7D736A] text-xs font-bold uppercase tracking-wide rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-5 py-2 text-white text-xs font-bold uppercase tracking-wide rounded-xl shadow-xs flex items-center gap-1.5 hover:opacity-95 cursor-pointer transition-opacity ${config.saveButtonBg}`}
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Registro
          </button>
        </div>

      </div>
    </div>
  );
}
