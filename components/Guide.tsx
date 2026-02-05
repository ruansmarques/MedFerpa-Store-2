import React from 'react';
import { Terminal, FileCode, Layers, Box, CheckCircle } from 'lucide-react';

export const Guide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 text-gray-200 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold text-white mb-6">Como trazer seu projeto GitHub para cá</h1>
      
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Diretamente? <span className="text-red-400 font-bold">Não é possível clonar</span> um repositório inteiro com um clique. 
        Este ambiente funciona com uma estrutura de <strong>Arquivo Único (Single-File)</strong> ou <strong>Bloco XML</strong>.
        No entanto, você pode migrar seu projeto manualmente ou com ajuda deste assistente.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          <Layers className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">1. A Estrutura XML</h3>
          <p className="text-sm text-gray-400">
            Todo o código deve ser fornecido em um único bloco XML contendo tags <code>&lt;change&gt;</code> para cada arquivo. Não existe sistema de arquivos persistente ou terminal bash completo.
          </p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          <Box className="w-8 h-8 text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">2. Dependências</h3>
          <p className="text-sm text-gray-400">
            Não há <code>npm install</code>. Use bibliotecas pré-instaladas ou importações via ESM. Estilos devem usar <strong>Tailwind CSS</strong> exclusivamente (sem arquivos .css ou .scss).
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Passo a Passo da Migração</h2>
      
      <div className="space-y-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 font-bold">1</div>
          <div>
            <h4 className="text-lg font-medium text-white">Achatar a Estrutura (Flatten)</h4>
            <p className="text-gray-400 mt-1">
              Copie seus arquivos essenciais (<code>App.tsx</code>, componentes, helpers). Evite pastas muito aninhadas se não for estritamente necessário para organização visual.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 font-bold">2</div>
          <div>
            <h4 className="text-lg font-medium text-white">Adaptar Roteamento</h4>
            <p className="text-gray-400 mt-1">
              Se você usa <code>react-router-dom</code>, mude de <code>BrowserRouter</code> para <strong><code>HashRouter</code></strong>. O servidor não suporta rotas de URL limpas.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 font-bold">3</div>
          <div>
            <h4 className="text-lg font-medium text-white">Converter Estilos</h4>
            <p className="text-gray-400 mt-1">
              Abra a aba "Explorar Repo" neste app. Selecione seus arquivos CSS/SCSS ou componentes Styled. O Gemini irá sugerir as classes Tailwind equivalentes.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-blue-900/20 border border-blue-800 rounded-lg p-6">
        <h4 className="text-blue-300 font-bold flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5" />
            Dica Pro
        </h4>
        <p className="text-blue-200/80 text-sm">
          Use a aba <strong>"Explorar Repo"</strong> acima. Digite o nome do seu repositório GitHub. 
          O Gemini analisará arquivo por arquivo e dirá exatamente o que precisa mudar para rodar aqui.
        </p>
      </div>
    </div>
  );
};
