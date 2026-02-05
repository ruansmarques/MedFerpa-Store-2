import { GitHubNode, RepoFile } from '../types';

const BASE_URL = 'https://api.github.com/repos';

export const fetchRepoContents = async (owner: string, repo: string, path: string = ''): Promise<GitHubNode[]> => {
  try {
    const url = `${BASE_URL}/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repositório ou caminho não encontrado.');
      }
      if (response.status === 403) {
        throw new Error('Limite de taxa da API do GitHub excedido. Tente novamente mais tarde.');
      }
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Sort directories first, then files
    return Array.isArray(data) ? data.sort((a: GitHubNode, b: GitHubNode) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'dir' ? -1 : 1;
    }) : [data]; // Handle case where path points to a file
  } catch (error) {
    console.error("Failed to fetch repo:", error);
    throw error;
  }
};

export const fetchFileContent = async (downloadUrl: string): Promise<string> => {
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Falha ao baixar conteúdo do arquivo");
  return await response.text();
};

// Fetch recursive tree using Git Database API
export const fetchRepoTree = async (owner: string, repo: string): Promise<any[]> => {
  // Get default branch reference usually works with HEAD
  const url = `${BASE_URL}/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao buscar árvore de arquivos do repositório.");
  const data = await response.json();
  return data.tree; // Array of objects with path, type, url, etc.
};

export const fetchBatchFiles = async (owner: string, repo: string, filePaths: string[]): Promise<RepoFile[]> => {
  // GitHub raw content URL pattern: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
  // To avoid branch detection issues, we can use the API, but rate limits are stricter.
  // Using the API content endpoint is safer for small batches.
  
  const promises = filePaths.map(async (path) => {
    try {
      const url = `${BASE_URL}/${owner}/${repo}/contents/${path}`;
      const res = await fetch(url);
      if(!res.ok) return null;
      const data = await res.json();
      if(data.encoding === 'base64') {
        const content = atob(data.content); // Simple decoding for text files
        return { path, content };
      }
      return null;
    } catch (e) {
      console.warn(`Skipped file ${path}:`, e);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((f): f is RepoFile => f !== null);
};
