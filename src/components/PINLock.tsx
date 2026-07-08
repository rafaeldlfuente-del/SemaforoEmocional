/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { hashPIN } from '../utils';
import { Shield, ShieldAlert, Lock, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PINLockProps {
  onUnlock: () => void;
}

export default function PINLock({ onUnlock }: PINLockProps) {
  const [hasPIN, setHasPIN] = useState<boolean>(false);
  const [pinMode, setPinMode] = useState<'create' | 'confirm' | 'unlock'>('unlock');
  const [pinCode, setPinCode] = useState<string>('');
  const [tempPIN, setTempPIN] = useState<string>(''); // For confirmation matching
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    const savedHash = localStorage.getItem('semaforo_pin_hash');
    if (!savedHash) {
      setHasPIN(false);
      setPinMode('create');
    } else {
      setHasPIN(true);
      setPinMode('unlock');
    }
  }, []);

  const handleNumberTap = async (num: string) => {
    setErrorMsg('');
    if (pinCode.length >= 4) return;
    const newPin = pinCode + num;
    setPinCode(newPin);

    if (newPin.length === 4) {
      // Small timeout for visual feedback of the last digit dot filling up
      setTimeout(() => {
        processPIN(newPin);
      }, 150);
    }
  };

  const handleBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const processPIN = async (code: string) => {
    if (pinMode === 'create') {
      setTempPIN(code);
      setPinCode('');
      setPinMode('confirm');
    } else if (pinMode === 'confirm') {
      if (code === tempPIN) {
        const hash = await hashPIN(code);
        localStorage.setItem('semaforo_pin_hash', hash);
        setHasPIN(true);
        setPinCode('');
        onUnlock();
      } else {
        setErrorMsg('Los códigos PIN no coinciden. Inténtalo de nuevo.');
        setPinCode('');
        setPinMode('create');
      }
    } else if (pinMode === 'unlock') {
      const savedHash = localStorage.getItem('semaforo_pin_hash');
      const hashedAttempt = await hashPIN(code);
      if (hashedAttempt === savedHash) {
        onUnlock();
      } else {
        setErrorMsg('PIN incorrecto. Inténtalo de nuevo.');
        setPinCode('');
      }
    }
  };

  const handleHardReset = () => {
    localStorage.clear();
    setHasPIN(false);
    setPinMode('create');
    setPinCode('');
    setTempPIN('');
    setErrorMsg('Se han eliminado todos los datos y restablecido la aplicación.');
    setShowResetConfirm(false);
  };

  return (
    <div id="pin-lock-container" className="min-h-screen bg-[#FDFCFB] flex flex-col justify-between p-6 select-none font-sans text-[#333333]">
      {/* Upper header */}
      <div className="flex flex-col items-center mt-12">
        <div className="w-16 h-16 rounded-full bg-[#E5E1DD] flex items-center justify-center text-[#7D736A] mb-4 shadow-xs border border-[#F0EDEA]">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1F2937] text-center">
          Semáforo Emocional
        </h1>
        <p className="text-xs uppercase tracking-widest font-bold text-[#9A8F85] mt-2 text-center max-w-xs">
          Diario Terapéutico Personal
        </p>
      </div>

      {/* Primary Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#7D736A]">
            {pinMode === 'create' && 'Crea tu PIN de privacidad (4 dígitos)'}
            {pinMode === 'confirm' && 'Confirma tu PIN de acceso'}
            {pinMode === 'unlock' && 'Acceso protegido'}
          </h2>
          <p className="text-xs text-[#9A8F85] mt-1">
            {pinMode === 'create' && 'Esta clave protegerá tus registros en este dispositivo'}
            {pinMode === 'confirm' && 'Introduce el mismo código para verificar'}
            {pinMode === 'unlock' && 'Introduce tu código PIN para entrar'}
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex space-x-5 justify-center mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                pinCode.length > index
                  ? 'bg-[#4A5568] border-[#4A5568] scale-110 shadow-xs'
                  : 'bg-white border-[#E5E1DD]'
              }`}
            />
          ))}
        </div>

        {/* Error / Feedback Message */}
        <div className="h-6 text-center mb-4">
          {errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold uppercase tracking-wide text-[#C62828]"
            >
              {errorMsg}
            </motion.p>
          )}
        </div>

        {/* Simple tactile mobile keypad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumberTap(num)}
              className="h-14 w-14 rounded-full bg-white hover:bg-[#F9F8F6] active:bg-[#E5E1DD] border border-[#E5E1DD] text-lg font-medium text-[#333333] flex items-center justify-center shadow-xs cursor-pointer transition-colors duration-100"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {/* Optional reset trigger inside the grid */}
            {pinMode === 'unlock' && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-[#C62828] hover:opacity-80 font-bold uppercase tracking-wider p-2"
                title="Restablecer"
              >
                Resetear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleNumberTap('0')}
            className="h-14 w-14 rounded-full bg-white hover:bg-[#F9F8F6] active:bg-[#E5E1DD] border border-[#E5E1DD] text-lg font-medium text-[#333333] flex items-center justify-center shadow-xs cursor-pointer transition-colors duration-100 mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 w-14 rounded-full bg-[#F9F8F6] hover:bg-[#E5E1DD] text-[#7D736A] flex items-center justify-center cursor-pointer transition-colors duration-100 border border-[#E5E1DD]"
          >
            ←
          </button>
        </div>
      </div>

      {/* Footer Restablecer Area */}
      <div className="w-full max-w-sm mx-auto text-center mt-6">
        <p className="text-[10px] text-[#9A8F85] font-bold uppercase tracking-widest">
          Privacidad: Datos almacenados localmente
        </p>
      </div>

      {/* Hard Reset Modal Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-[#333333]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 border border-[#F0EDEA] shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#FFEBEE] text-[#C62828] flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1F2937] text-center">
              ¿Borrar y restablecer?
            </h3>
            <p className="text-xs text-[#7D736A] text-center mt-2 leading-relaxed">
              Esta acción eliminará <strong>permanentemente</strong> todas tus notas guardadas y tu PIN actual. No es posible recuperar los datos una vez borrados.
            </p>
            <div className="mt-5 flex flex-col space-y-2">
              <button
                type="button"
                onClick={handleHardReset}
                className="w-full py-2.5 bg-[#C62828] hover:bg-[#991B1B] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar todo permanentemente
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-2.5 bg-white hover:bg-[#F9F8F6] border border-[#E5E1DD] text-[#7D736A] rounded-xl text-xs font-bold cursor-pointer uppercase tracking-wider text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
