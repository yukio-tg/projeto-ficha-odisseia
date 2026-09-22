'use client';
import { useState } from 'react';
import { Poder } from '@/lib/types';

interface PowerTreeProps {
  poderes: Poder[];
}

export default function PowerTree({ poderes }: PowerTreeProps) {
  const [selecionado, setSelecionado] = useState<Poder | null>(null);

  const tiers = poderes.reduce((acc, p) => {
    if (!acc[p.tier]) acc[p.tier] = [];
    acc[p.tier].push(p);
    return acc;
  }, {} as Record<number, Poder[]>);

  return (
    <div className="power-tree">
      {Object.entries(tiers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([tier, pods]) => (
          <div key={tier} className="tier-row">
            <span className="tier-label">Tier {tier}</span>
            <div className="pods-row">
              {pods.map(poder => (
                <button
                  key={poder.id}
                  className={`poder-card ${poder.tipo === 'ativo' ? 'ativo-type' : 'passivo'} ${
                    selecionado?.id === poder.id ? 'ativo' : ''
                  }`}
                  onClick={() => setSelecionado(selecionado?.id === poder.id ? null : poder)}
                >
                  <span className="poder-nome">{poder.nome}</span>
                  <span className="poder-tipo">{poder.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

      {selecionado && (
        <div className="poder-detalhe">
          <h3 className="text-lg font-medieval text-odisseia-gold mb-2">{selecionado.nome}</h3>
          <p className="text-sm text-odisseia-text mb-3">{selecionado.descricao}</p>
          <div className="mb-2">
            <span className="text-xs text-odisseia-muted uppercase tracking-wide">Efeitos:</span>
            <ul className="mt-1 space-y-1">
              {selecionado.efeitos.map((ef, i) => (
                <li key={i} className="text-sm text-odisseia-text flex items-start gap-2">
                  <span className="text-odisseia-gold mt-1">•</span>
                  {ef}
                </li>
              ))}
            </ul>
          </div>
          {selecionado.cooldown && (
            <p className="text-xs text-odisseia-muted">
              <span className="text-odisseia-gold">Cooldown:</span> {selecionado.cooldown}
            </p>
          )}
          {selecionado.pre_requisitos.length > 0 && (
            <p className="text-xs text-odisseia-muted mt-1">
              <span className="text-odisseia-purple">Pré-requisitos:</span>{' '}
              {selecionado.pre_requisitos.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
