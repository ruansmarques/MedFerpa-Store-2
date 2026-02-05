export interface GitHubNode {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface AnalysisResult {
  markdown: string;
  isLoading: boolean;
  error?: string;
}

export interface RepoFile {
  path: string;
  content: string;
}

export enum Tab {
  GUIDE = 'GUIDE',
  EXPLORER = 'EXPLORER',
}
