'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarEntidade, atualizarEntidade } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Colecao, AtributosRPG, Poder, Imagem } from '@/lib/types';
import RadarChart from '@/components/radar/RadarChart';
import ImageUploader from './ImageUploader';

interface EntityFormProps {
  colecao: Colecao;
  dados?: any;
  entityId?: string;
}

const ATRIBUTOS_DEFAULT: AtributosRPG = { FOR: 10, DES: 10, CAR: 10, SAB: 10, INT: 10, CON: 10 };

export default function EntityForm({ colecao, dados, entityId }: EntityFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isEditing = !!entityId;

  const [nome, setNome] = useState(dados?.nome || '');
  const [subtitulo, setSubtitulo] = useState(dados?.subtitulo || '');
  const [categoria, setCategoria] = useState(dados?.categoria || '');
  const [resumo, setResumo] = useState(dados?.narrativa?.resumo || '');
  const [descricaoLonga, setDescricaoLonga] = useState(
    dados?.narrativa?.descricao_longa || dados?.narrativa?.biografia || ''
  );
  const [lore, setLore] = useState(dados?.narrativa?.lore || dados?.narrativa?.historia || '');
  const [nivel, setNivel] = useState(dados?.tatico?.nivel || 1);
  const [atributos, setAtributos] = useState<AtributosRPG>(dados?.tatico?.atributos || ATRIBUTOS_DEFAULT);
  const [poderes, setPoderes] = useState<Poder[]>(dados?.tatico?.poderes || []);
  const [imagens, setImagens] = useState<Imagem[]>(dados?.imagens || []);
  const [publicado, setPublicado] = useState(dados?.meta?.publicado ?? true);
  const [saving, setSaving] = useState(false);

  // Campos específicos por coleção
  const [raridade, setRaridade] = useState(dados?.raridade || '');
  const [ameaca, setAmeaca] = useState(dados?.ameaca || 1);
  const [habitat, setHabitat] = useState(dados?.narrativa?.habitat || '');
  const [comportamento, setComportamento] = useState(dados?.narrativa?.comportamento || '');
  const [tags, setTags] = useState<string>(dados?.tags?.join(', ') || '');
  const [alinhamento, setAlinhamento] = useState(dados?.alinhamento || '');
  const [faccao, setFaccao] = useState(dados?.faccao || '');
  const [classe, setClasse] = useState(dados?.tatico?.classe || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return alert('Nome é obrigatório');
    setSaving(true);

    try {
      const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      let docData: any = {
        slug,
        nome,
        subtitulo,
        tipo: colecao === 'criaturas' ? 'criatura' : colecao === 'espacos' ? 'espaco' : 'personagem',
        categoria,
        imagens,
        meta: {
          criadoPor: user?.uid || '',
          publicado,
        },
      };

      if (colecao === 'criaturas') {
        docData = {
          ...docData,
          raridade,
          ameaca: Number(ameaca),
          narrativa: { resumo, descricao_longa: descricaoLonga, lore, habitat, comportamento },
          tatico: { nivel: Number(nivel), atributos, modificadores: {}, poderes },
          relacoes: { espacos: [], personagens: [], criaturas_relacionadas: [] },
        };
      } else if (colecao === 'espacos') {
        docData = {
          ...docData,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          narrativa: { resumo, descricao_longa: descricaoLonga, historia: lore, atmosfera: '', pontos_de_interesse: [] },
          dados_mecanicos: { nivel_recomendado: '', dificuldade: '', tipo_terreno: '', modificadores_ambientais: [] },
          relacoes: { criaturas: [], personagens: [], espacos_conectados: [] },
        };
      } else {
        docData = {
          ...docData,
          alinhamento,
          faccao,
          narrativa: { resumo, biografia: descricaoLonga, personalidade: '', objetivos: '', segredos: '' },
          tatico: { nivel: Number(nivel), classe, atributos, modificadores: {}, poderes },
          relacoes: { espacos: [], criaturas: [], personagens_relacionados: [] },
        };
      }

      if (isEditing) {
        await atualizarEntidade(colecao, entityId, docData);
      } else {
        await criarEntidade(colecao, docData);
      }

      router.push(`/admin/${colecao}`);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar entidade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Dados básicos */}
      <section className="space-y-4">
        <h2 className="section-title">Dados Básicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-odisseia-muted mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm text-odisseia-muted mb-1">Subtítulo</label>
            <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-odisseia-muted mb-1">Categoria</label>
            <input value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field" />
          </div>
          {colecao === 'criaturas' && (
            <>
              <div>
                <label className="block text-sm text-odisseia-muted mb-1">Raridade</label>
                <select value={raridade} onChange={e => setRaridade(e.target.value)} className="input-field">
                  <option value="">Selecionar</option>
                  <option value="Comum">Comum</option>
                  <option value="Incomum">Incomum</option>
                  <option value="Raro">Raro</option>
                  <option value="Lendário">Lendário</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-odisseia-muted mb-1">Ameaça (1-5)</label>
                <input type="number" min={1} max={5} value={ameaca} onChange={e => setAmeaca(e.target.value)} className="input-field" />
              </div>
            </>
          )}
          {colecao === 'espacos' && (
            <div>
              <label className="block text-sm text-odisseia-muted mb-1">Tags (separadas por vírgula)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} className="input-field" />
            </div>
          )}
          {colecao === 'personagens' && (
            <>
              <div>
                <label className="block text-sm text-odisseia-muted mb-1">Alinhamento</label>
                <input value={alinhamento} onChange={e => setAlinhamento(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-odisseia-muted mb-1">Facção</label>
                <input value={faccao} onChange={e => setFaccao(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-odisseia-muted mb-1">Classe</label>
                <input value={classe} onChange={e => setClasse(e.target.value)} className="input-field" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Narrativa */}
      <section className="space-y-4">
        <h2 className="section-title">Narrativa</h2>
        <div>
          <label className="block text-sm text-odisseia-muted mb-1">Resumo</label>
          <textarea value={resumo} onChange={e => setResumo(e.target.value)} className="textarea-field" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-odisseia-muted mb-1">
            {colecao === 'personagens' ? 'Biografia' : 'Descrição Longa'}
          </label>
          <textarea value={descricaoLonga} onChange={e => setDescricaoLonga(e.target.value)} className="textarea-field" rows={6} />
        </div>
        <div>
          <label className="block text-sm text-odisseia-muted mb-1">
            {colecao === 'espacos' ? 'História' : 'Lore'}
          </label>
          <textarea value={lore} onChange={e => setLore(e.target.value)} className="textarea-field" rows={4} />
        </div>
        {colecao === 'criaturas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-odisseia-muted mb-1">Habitat</label>
              <input value={habitat} onChange={e => setHabitat(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-odisseia-muted mb-1">Comportamento</label>
              <input value={comportamento} onChange={e => setComportamento(e.target.value)} className="input-field" />
            </div>
          </div>
        )}
      </section>

      {/* Imagens */}
      <section className="space-y-4">
        <h2 className="section-title">Imagens</h2>
        <ImageUploader
          imagens={imagens}
          onImagensChange={setImagens}
        />
      </section>

      {/* Tático (criaturas e personagens) */}
      {colecao !== 'espacos' && (
        <section className="space-y-4">
          <h2 className="section-title">Dados Táticos</h2>
          <div className="mb-4">
            <label className="block text-sm text-odisseia-muted mb-1">Nível (1-20)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={nivel}
              onChange={e => setNivel(Number(e.target.value))}
              className="input-field w-24"
            />
          </div>
          <RadarChart
            atributos={atributos}
            nivel={nivel}
            somenteLeitura={false}
            onChange={(novosAtrs, novoNivel) => {
              setAtributos(novosAtrs);
              setNivel(novoNivel);
            }}
          />
        </section>
      )}

      {/* Publicação */}
      <section className="flex items-center gap-4 pt-4 border-t border-odisseia-border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={publicado}
            onChange={e => setPublicado(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-odisseia-text">Publicado (visível para usuários)</span>
        </label>
      </section>

      {/* Submit */}
      <div className="flex gap-4">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
