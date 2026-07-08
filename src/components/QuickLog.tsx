/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrafficLightColor } from '../types';
import { Smile, AlertTriangle, AlertCircle } from 'lucide-react';

interface QuickLogProps {
  onSelectColor: (color: TrafficLightColor) => void;
}

export default function QuickLog({ onSelectColor }: QuickLogProps) {
  return (
    <div id="quick-log" className="bg-white rounded-2xl p-6 border border-[#F0EDEA] shadow-xs">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A8F85] mb-4">
        ¿Cómo te has sentido?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GREEN BUTTON */}
        <button
          type="button"
          onClick={() => onSelectColor('green')}
          className="group text-left p-5 bg-[#D1EAD0] hover:bg-[#C2E0C1] text-[#2D5A27] rounded-3xl border border-transparent transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            🟢
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-[#2D5A27]">Verde</div>
            <div className="text-xs opacity-90 font-medium">Bienestar y felicidad</div>
            <p className="text-[11px] opacity-75 mt-1 leading-normal hidden sm:block">
              Bienestar, alegría o satisfacción personal.
            </p>
          </div>
        </button>

        {/* YELLOW BUTTON */}
        <button
          type="button"
          onClick={() => onSelectColor('yellow')}
          className="group text-left p-5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] rounded-3xl border border-transparent transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            🟡
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-[#92400E]">Amarillo</div>
            <div className="text-xs opacity-90 font-medium">Incomodidad o malestar</div>
            <p className="text-[11px] opacity-75 mt-1 leading-normal hidden sm:block">
              Fricción, incomodidad, malestar no grave.
            </p>
          </div>
        </button>

        {/* RED BUTTON */}
        <button
          type="button"
          onClick={() => onSelectColor('red')}
          className="group text-left p-5 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] rounded-3xl border border-transparent transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            🔴
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-[#991B1B]">Rojo</div>
            <div className="text-xs opacity-90 font-medium">Vulneración de voluntad</div>
            <p className="text-[11px] opacity-75 mt-1 leading-normal hidden sm:block">
              Vulneración de voluntad o límites personales.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
