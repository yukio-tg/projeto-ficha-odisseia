'use client';
import { useState } from 'react';
import { Imagem } from '@/lib/types';

interface ImageGalleryProps {
  imagens: Imagem[];
}

export default function ImageGallery({ imagens }: ImageGalleryProps) {
  const [selecionada, setSelecionada] = useState(0);

  if (!imagens || imagens.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Main image: contain dentro de caixa com tamanho máximo fixo */}
      <div
        className="w-full border border-odisseia-border bg-odisseia-bgMid flex items-center justify-center overflow-hidden"
        style={{ maxHeight: '520px', minHeight: '200px' }}
      >
        <img
          src={imagens[selecionada].url}
          alt={imagens[selecionada].legenda}
          style={{
            maxWidth: '100%',
            maxHeight: '520px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
      {imagens[selecionada].legenda && (
        <p className="font-italic text-sm italic text-odisseia-muted text-center">
          {imagens[selecionada].legenda}
        </p>
      )}
      {imagens.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {imagens.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelecionada(i)}
              className={`shrink-0 w-20 h-20 overflow-hidden border-2 transition-colors bg-odisseia-bgMid flex items-center justify-center ${
                i === selecionada ? 'border-odisseia-borderGold' : 'border-odisseia-border hover:border-odisseia-borderGold/50'
              }`}
            >
              <img
                src={img.url}
                alt={img.legenda}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
