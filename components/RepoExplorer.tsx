import React, { useState } from 'react';
import { GitHubNode, AnalysisResult, RepoFile } from '../types';
import { fetchRepoContents, fetchFileContent, fetchRepoTree, fetchBatchFiles } from '../services/githubService';
import { analyzeCodeForMigration, generateProjectMigration } from '../services/geminiService';
import { Folder, FileText, ChevronRight, Loader2, ArrowRight, AlertCircle, Code, Sparkles, X, Copy, Check } from 'lucide-react';

export const RepoExplorer: React.FC = () => {
  const [repoInput, setRepoInput] = useState('');
  const [currentPath, setCurrentPath] = useState<GitHubNode[]>([]);
  const [pathString, setPathString] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ node: GitHubNode; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult>({ markdown: '', isLoading: false });
  
  // Migration States
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Helper para extrair owner e repo
  const parseRepoInput = (input: string) => {
    const cleanInput = input.trim();
    if (!cleanInput) return null;
    try {
      if (cleanInput.startsWith('http') || cleanInput.includes('github.com')) {
        const urlStr = cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`;
        const url = new URL(urlStr);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
      }
    } catch (e) {}
    const parts = cleanInput.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const loadRepo = async (path: string = '') => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError('Formato inválido. Use "usuario/repositorio" ou a URL completa do GitHub.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { owner, repo } = parsed;
      const nodes = await fetchRepoContents(owner, repo, path);
      setCurrentPath(nodes);
      setPathString(path);
      if (path === '') setSelectedFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (node: GitHubNode) => {
    if (node.type === 'dir') {
      loadRepo(node.path);
    } else {
      if (!node.download_url) return;
      setLoading(true);
      try {
        const content = await fetchFileContent(node.download_url);
        setSelectedFile({ node, content });
        setAnalysis({ markdown: '', isLoading: true });
        const result = await analyzeCodeForMigration(node.name, content);
        setAnalysis({ markdown: result, isLoading: false });
      } catch (err: any) {
        setError("Erro ao carregar arquivo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (!pathString) return;
    const newPath = pathString.split('/').slice(0, -1).join('/');
    loadRepo(newPath);
  };

  const handleAutoMigrate = async () => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) return;
    
    setIsMigrating(true);
    setMigrationResult(null);
    setError(null);

    try {
      const { owner, repo } = parsed;
      
      setMigrationStatus("Mapeando arquivos do repositório...");
      const tree = await fetchRepoTree(owner, repo);
      
      // Filter relevant files (code only, avoid huge assets)
      const relevantFiles = tree.filter((node: any) => 
        node.type === 'blob' && 
        node.size < 50000 && // Skip files > 50kb
        /\.(js|jsx|ts|tsx|html|css|json)$/i.test(node.path) &&
        !node.path.includes('package-lock') &&
        !node.path.includes('yarn.lock')
      ).slice(0, 15); // Hard limit to prevent overload for this demo

      if (relevantFiles.length === 0) {
        throw new Error("Nenhum arquivo de código compatível encontrado para migração.");
      }

      setMigrationStatus(`Baixando conteúdo de ${relevantFiles.length} arquivos...`);
      const fileContents: RepoFile[] = await fetchBatchFiles(owner, repo, relevantFiles.map((n: any) => n.path));

      setMigrationStatus("Gemini está reescrevendo o projeto (isso pode levar 30s)...");
      const xmlResult = await generateProjectMigration(fileContents);
      
      setMigrationResult(xmlResult);
      
    } catch (err: any) {
      setError(`Erro na migração: ${err.message}`);
    } finally {
      setIsMigrating(false);
      setMigrationStatus("");
    }
  };

  const copyToClipboard = () => {
    if (migrationResult) {
      navigator.clipboard.writeText(migrationResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isRepoLoaded = currentPath.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 overflow-hidden relative">
      {/* Header / Input */}
      <div className="p-4 border-b border-gray-800 bg-gray-900 shadow-md">
        <div className="flex flex-col md:flex-row gap-2 max-w-4xl mx-auto items-center">
          <div className="flex-1 w-full flex gap-2">
            <input
              type="text"
              placeholder="Ex: usuario/repo ou https://github.com/..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRepo()}
            />
            <button
              onClick={() => loadRepo()}
              disabled={loading || isMigrating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Explorar
            </button>
          </div>
          
          {isRepoLoaded && (
            <button
              onClick={handleAutoMigrate}
              disabled={isMigrating}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 border border-purple-500/50"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
              {isMigrating ? 'Processando...' : 'Gerar Migração Completa'}
            </button>
          )}
        </div>
        
        {error && (
          <div className="mt-2 max-w-4xl mx-auto text-red-400 text-xs flex items-center gap-1 bg-red-900/20 p-2 rounded">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}
        
        {isMigrating && (
          <div className="mt-2 max-w-4xl mx-auto text-purple-300 text-xs flex items-center gap-2 bg-purple-900/20 p-2 rounded animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> {migrationStatus}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File Tree */}
        <div className="w-1/3 md:w-1/4 border-r border-gray-800 flex flex-col bg-gray-900/50">
          <div className="p-2 border-b border-gray-800 text-xs text-gray-400 font-mono flex items-center h-10">
            {pathString ? (
               <button onClick={handleBack} className="hover:text-white flex items-center gap-1">
                 <div className="bg-gray-800 p-1 rounded hover:bg-gray-700">← Voltar</div>
                 <span className="truncate ml-2">/{pathString}</span>
               </button>
            ) : (
              <span>Raiz</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {currentPath.length === 0 && !loading && (
              <div className="text-gray-500 text-sm text-center mt-10 px-4">
                Digite um repositório acima e clique em Explorar para começar.
              </div>
            )}
            {currentPath.map((node) => (
              <div
                key={node.sha}
                onClick={() => handleFileClick(node)}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm mb-1 transition-colors ${
                  selectedFile?.node.sha === node.sha
                    ? 'bg-blue-900/30 text-blue-200'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                {node.type === 'dir' ? (
                  <Folder className="w-4 h-4 text-yellow-500" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-400" />
                )}
                <span className="truncate">{node.name}</span>
                {node.type === 'dir' && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Code + Analysis */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-950">
          
          {/* Code View */}
          <div className={`flex-1 flex flex-col border-r border-gray-800 ${selectedFile ? 'block' : 'hidden md:block'}`}>
            <div className="h-10 border-b border-gray-800 flex items-center px-4 bg-gray-900">
              <span className="text-xs font-mono text-gray-400 flex items-center gap-2">
                <Code className="w-3 h-3" />
                {selectedFile?.node.name || 'Selecione um arquivo'}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 relative group">
               {selectedFile ? (
                 <pre className="text-xs md:text-sm font-mono text-gray-300 whitespace-pre-wrap break-all">
                   {selectedFile.content}
                 </pre>
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-600">
                    <div className="text-center">
                      <Code className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Selecione um arquivo para ver o código.</p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* AI Analysis Panel */}
          {selectedFile && (
            <div className="w-full md:w-1/3 flex flex-col bg-gray-900 border-l border-gray-800">
               <div className="h-10 border-b border-gray-800 flex items-center px-4 bg-gray-800/50">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    ✨ Gemini Analysis
                  </span>
               </div>
               <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 leading-relaxed">
                  {analysis.isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      <span className="text-xs text-gray-500">Analisando compatibilidade...</span>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">{analysis.markdown}</div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Migration Result Modal */}
      {migrationResult && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl h-full flex flex-col rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Código de Migração Gerado
              </h3>
              <button 
                onClick={() => setMigrationResult(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-blue-900/20 p-4 border-b border-blue-900/30 text-sm text-blue-200">
              <p>O Gemini gerou o código abaixo. Copie e cole na sua conversa principal do AI Studio para aplicar as mudanças.</p>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-950">
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                {migrationResult}
              </pre>
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-800 flex justify-end">
              <button
                onClick={copyToClipboard}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Código XML'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
