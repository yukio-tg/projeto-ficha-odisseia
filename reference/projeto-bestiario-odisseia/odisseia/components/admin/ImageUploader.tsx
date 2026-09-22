'use client';
import { useState, useRef } from 'react';
import { fileToBase64, isValidImageUrl } from '@/lib/storage';
import { Imagem } from '@/lib/types';

interface ImageUploaderProps {
  imagens: Imagem[];
  onImagensChange: (imagens: Imagem[]) => void;
}

export default function ImageUploader({ imagens, onImagensChange }: ImageUploaderProps) {
  const [converting, setConverting] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [erro, setErro] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addImagem = (url: string) => {
    const tipo = imagens.length === 0 ? 'principal' : 'detalhe';
    const novaImagem: Imagem = { url, tipo: tipo as Imagem['tipo'], legenda: '' };
    onImagensChange([...imagens, novaImagem]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConverting(true);
    setErro('');
    try {
      const base64 = await fileToBase64(file);
      addImagem(base64);
    } catch (err: any) {
      setErro(err.message || 'Erro ao converter imagem');
    } finally {
      setConverting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    setErro('');
    if (!isValidImageUrl(urlInput)) {
      setErro('URL inválida. Use https://... ou uma URL de imagem válida.');
      return;
    }
    addImagem(urlInput.trim());
    setUrlInput('');
  };

  const handleRemove = (index: number) => {
    onImagensChange(imagens.filter((_, i) => i !== index));
  };

  const handleLegendaChange = (index: number, legenda: string) => {
    const novas = [...imagens];
    novas[index] = { ...novas[index], legenda };
    onImagensChange(novas);
  };

  const handleTipoChange = (index: number, tipo: Imagem['tipo']) => {
    const novas = [...imagens];
    novas[index] = { ...novas[index], tipo };
    onImagensChange(novas);
  };

  return (
    <div className="space-y-4">
      {/* Adicionar por URL */}
      <div className="space-y-2">
        <label className="block text-sm text-odisseia-muted">Adicionar por URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
            placeholder="https://exemplo.com/imagem.jpg"
            className="input-field flex-1"
          />
          <button type="button" onClick={handleAddUrl} className="btn-secondary text-sm whitespace-nowrap">
            + URL
          </button>
        </div>
      </div>

      {/* Adicionar por arquivo (converte para base64) */}
      <div className="flex items-center gap-4">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={converting}
          className="btn-secondary text-sm"
        >
          {converting ? 'Convertendo...' : 'Arquivo local (base64)'}
        </button>
        <span className="text-xs text-odisseia-muted">{imagens.length} imagem(ns)</span>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {/* Preview das imagens */}
      {imagens.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {imagens.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.url}
                alt={img.legenda || `Imagem ${i + 1}`}
                className="w-full h-32 object-cover rounded border border-odisseia-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).alt = 'Erro ao carregar';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div className="mt-1 space-y-1">
                <input
                  type="text"
                  value={img.legenda}
                  onChange={(e) => handleLegendaChange(i, e.target.value)}
                  placeholder="Legenda..."
                  className="w-full text-xs input-field py-1 px-2"
                />
                <select
                  value={img.tipo}
                  onChange={(e) => handleTipoChange(i, e.target.value as Imagem['tipo'])}
                  className="w-full text-xs input-field py-1 px-2"
                >
                  <option value="principal">Principal</option>
                  <option value="detalhe">Detalhe</option>
                  <option value="galeria">Galeria</option>
                </select>
              </div>
              {img.url.startsWith('data:') && (
                <span className="text-[10px] text-odisseia-muted">base64</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
