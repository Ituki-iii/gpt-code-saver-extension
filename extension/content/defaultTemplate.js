(function initCgptDefaultTemplate(root) {
  const CGPT_BUILTIN_TEMPLATES = [
    {
      id: "builtin:path-default",
      title: "Code output guide (PATH format)",
      content: `// 出力ルール
// - コードブロックの中に file path を書かないでください。
// - 各コードブロックの直前に "PATH: src/app.js" の形式で相対パスを 1 行だけ書いてください。
// - PATH 行とコードブロックの間に説明文を挟まないでください。
// - 各コードブロックは 1 ファイルのみを表し、単一責務になるよう小さく保ってください。
// 品質チェック
// - 可能であれば npm run lint / npm test などの構文・動作チェックを実行し、結果を報告してください。
// - 実行できない場合は理由を明記し、代替として静的な検証(型チェック・自己レビュー)を行ってください。
// 例
// PATH: src/app.js
// \`\`\`js
// console.log("hello");
// \`\`\`
`,
    },
    {
      id: "builtin:path-multi-file",
      title: "Multi-file output guide (strict PATH format)",
      content: `複数ファイルを出力するときは次の形式を厳守してください。

- コードブロックの中に file path を書かない
- 各コードブロックの直前に \`PATH: relative/path\` を 1 行だけ書く
- 1 つの PATH に対してコードブロックは 1 つ
- PATH 行とコードブロックの間に説明文を入れない
- 余計な説明はファイル列挙の前後にまとめる

例:

PATH: src/main.ts
\`\`\`ts
console.log("main");
\`\`\`

PATH: src/lib/util.ts
\`\`\`ts
export const add = (a, b) => a + b;
\`\`\`
`,
    },
  ];

  const DEFAULT_TEMPLATE_CONTENT = CGPT_BUILTIN_TEMPLATES[0].content;

  function cgptGetBuiltinTemplates() {
    return CGPT_BUILTIN_TEMPLATES.map((template) => ({ ...template }));
  }

  function cgptGetDefaultTemplateContent() {
    return DEFAULT_TEMPLATE_CONTENT;
  }

  function cgptCreateDefaultTemplate(id) {
    const firstTemplate = cgptGetBuiltinTemplates()[0];
    return {
      ...firstTemplate,
      id: id || firstTemplate.id,
    };
  }

  root.DEFAULT_TEMPLATE_CONTENT = DEFAULT_TEMPLATE_CONTENT;
  root.cgptGetBuiltinTemplates = cgptGetBuiltinTemplates;
  root.cgptGetDefaultTemplateContent = cgptGetDefaultTemplateContent;
  root.cgptCreateDefaultTemplate = cgptCreateDefaultTemplate;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CGPT_BUILTIN_TEMPLATES,
      DEFAULT_TEMPLATE_CONTENT,
      cgptGetBuiltinTemplates,
      cgptGetDefaultTemplateContent,
      cgptCreateDefaultTemplate,
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
