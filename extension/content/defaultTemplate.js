(function initCgptDefaultTemplate(root) {
  const CGPT_BUILTIN_TEMPLATES = [
    {
      id: "builtin:path-format",
      title: "PATH format",
      content: `コードを出力するときは次の形式を守ってください。

- コードブロックの中に file path を書かない
- 各コードブロックの直前に \`PATH: relative/path\` を 1 行だけ書く
- 1 つの PATH に対してコードブロックは 1 つ
- PATH 行とコードブロックの間に説明文を入れない
- 各コードブロックは 1 ファイルのみを表し、単一責務になるよう小さく保つ
- 余計な説明はファイル列挙の前後にまとめる
- 可能であれば \`npm run lint\` / \`npm test\` などを実行し、結果を報告する
- 実行できない場合は理由を明記し、代替として静的な検証を行う

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
