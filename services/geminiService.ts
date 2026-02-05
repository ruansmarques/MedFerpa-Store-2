import { GoogleGenAI } from "@google/genai";
import { RepoFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MIGRATION_SYSTEM_INSTRUCTION = `
Você é um Engenheiro de Software especialista em migração de legados para ambientes Cloud Modernos baseados em React/Vite/Tailwind.
Seu objetivo é transformar código legado (HTML/CSS/JS puro ou React antigo) para o formato XML específico usado pelo AI Studio.

REGRAS RÍGIDAS:
1. **Saída**: APENAS um bloco XML válido no formato <changes><change>...</change></changes>. Não explique nada.
2. **Estilo**: Converta TODO CSS/SCSS para classes utilitárias do Tailwind CSS. Não crie arquivos .css.
3. **Estrutura**: "Achate" (Flatten) a estrutura se possível. O ambiente roda melhor com poucos arquivos na raiz ou 1 nível de profundidade.
4. **React**:
   - Use 'export const Component = () => {}'
   - Se houver roteamento, use bibliotecas padrão ou renderização condicional simples (o ambiente não suporta SPA complexo com History API, prefira HashRouter se necessário, mas evite se possível).
   - Remova importações de CSS.
5. **Assets**: Imagens locais NÃO funcionam. Substitua por placeholders (https://placehold.co/600x400) ou mantenha a URL se for absoluta.
6. **Entrada**: Você receberá JSON com vários arquivos. Analise-os e gere a versão "App.tsx", "index.html" etc. migrada.
`;

export const analyzeCodeForMigration = async (fileName: string, code: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Você é um Engenheiro de Software Sênior especialista em React e TypeScript.
    Analise o seguinte arquivo de código ('${fileName}') de um repositório GitHub.
    O objetivo é migrar este código para um ambiente React "Single-Page App" que roda em um único bloco XML, usando Tailwind CSS para estilos (sem arquivos CSS externos).

    Código:
    \`\`\`
    ${code.substring(0, 15000)} 
    \`\`\`
    (Código truncado se for muito longo)

    Forneça um relatório conciso em PORTUGUÊS (Brasil) cobrindo:
    1. **Compatibilidade**: Este arquivo pode ser migrado diretamente?
    2. **Bibliotecas**: Liste importações que precisam ser removidas ou substituídas (ex: react-router-dom deve ser HashRouter, bibliotecas de Node.js não funcionam).
    3. **Estilos**: Se houver CSS/SCSS importado, explique como converter para Tailwind.
    4. **Sugestão de Refatoração**: Um exemplo curto de como adaptar este componente.

    Seja direto e técnico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao contatar o Gemini para análise.";
  }
};

export const generateProjectMigration = async (files: RepoFile[]): Promise<string> => {
  const model = "gemini-3-flash-preview"; // Using flash for large context window capability

  // Prepare context
  const fileContext = files.map(f => `--- FILE: ${f.path} ---\n${f.content}\n--- END FILE ---`).join('\n\n');

  const prompt = `
    Aqui estão os arquivos de um projeto que preciso migrar para um ambiente React Single-File (App.tsx + components).
    
    ARQUIVOS DO PROJETO ORIGINAL:
    ${fileContext}

    TAREFA:
    Gere o código XML (<changes>...</changes>) necessário para criar este app no novo ambiente.
    
    1. Crie um 'index.html' com Tailwind via CDN.
    2. Crie um 'App.tsx' que contenha a lógica principal.
    3. Se houver muitos arquivos, combine componentes pequenos ou crie componentes separados no XML se for crucial.
    4. Converta estilos CSS globais do projeto original para classes Tailwind no <body> ou nos componentes.
    
    IMPORTANTE: Retorne APENAS o XML.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: MIGRATION_SYSTEM_INSTRUCTION
      }
    });
    return response.text || "Falha ao gerar migração.";
  } catch (error) {
    console.error("Gemini Migration Error:", error);
    return "Erro ao processar migração completa.";
  }
};
