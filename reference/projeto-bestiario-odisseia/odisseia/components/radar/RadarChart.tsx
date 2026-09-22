'use client';
import { useEffect, useRef } from 'react';
import { AtributosRPG, ModificadoresRPG } from '@/lib/types';

interface RadarChartProps {
  atributos: AtributosRPG;
  modificadores?: ModificadoresRPG;
  nivel?: number;
  onChange?: (atributos: AtributosRPG, nivel: number) => void;
  somenteLeitura?: boolean;
}

const ORDEM_ATRIBUTOS = ['FOR', 'DES', 'CAR', 'SAB', 'INT', 'CON'] as const;

export default function RadarChart({
  atributos,
  modificadores = {},
  nivel = 1,
  onChange,
  somenteLeitura = true,
}: RadarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const inicializar = () => {
      const container = containerRef.current!;
      const RadarRPG = (window as any).RadarRPG;
      if (!RadarRPG) return;

      if (instanceRef.current?.ro) {
        instanceRef.current.ro.disconnect();
      }

      const values = ORDEM_ATRIBUTOS.map(k => atributos[k]);
      const modValues = ORDEM_ATRIBUTOS.map(k => modificadores[k] || '');

      instanceRef.current = RadarRPG.create(container, {
        values,
        modValues,
        level: nivel,
        mode: 'raw',
      });

      if (!somenteLeitura && onChange) {
        const onInput = () => {
          const inst = instanceRef.current;
          const novosAtributos = ORDEM_ATRIBUTOS.reduce((acc, key, i) => {
            acc[key] = inst.values[i];
            return acc;
          }, {} as unknown as AtributosRPG);
          onChange(novosAtributos, inst.levelVal);
        };

        container.addEventListener('input', onInput);
        listenerRef.current = () => container.removeEventListener('input', onInput);
      }

      if (somenteLeitura) {
        setTimeout(() => {
          container.querySelectorAll('input').forEach((inp: HTMLInputElement) => {
            inp.setAttribute('readonly', 'true');
            inp.style.pointerEvents = 'none';
            inp.style.cursor = 'default';
          });
        }, 100);
      }
    };

    if (!(window as any).RadarRPG) {
      const script = document.createElement('script');
      script.src = '/radar-rpg.js';
      script.onload = inicializar;
      document.head.appendChild(script);
    } else {
      inicializar();
    }

    return () => {
      if (listenerRef.current) listenerRef.current();
      if (instanceRef.current?.ro) instanceRef.current.ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    ORDEM_ATRIBUTOS.forEach((key, i) => {
      inst.values[i] = atributos[key];
    });
    inst.levelVal = nivel;
    inst.maxPoints = 10 + nivel;
    inst.draw?.();
    inst.updateTotal?.();
    inst.updateHexGlow?.();
  }, [atributos, nivel]);

  return (
    <div
      ref={containerRef}
      className="radar-wrapper"
      style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        background: 'transparent',
        color: '#d4a828',
      }}
    />
  );
}
