const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cgptGetRawCodeText,
  cgptParseCodeBlockMetadata,
  cgptGetNormalizedCodeText,
  cgptGetDisplayCodeText,
} = require('../../extension/content/codeBlockMetadata.js');

test('cgptParseCodeBlockMetadata always returns null after file-line metadata removal', () => {
  const metadata = cgptParseCodeBlockMetadata({ innerText: '// file: src/app.js\nconsole.log("still code");' });
  assert.strictEqual(metadata, null);
});

test('cgptGetNormalizedCodeText converts CRLF to LF', () => {
  const code = { innerText: 'line1\r\nline2' };
  assert.strictEqual(cgptGetNormalizedCodeText(code), 'line1\nline2');
});

test('cgptGetDisplayCodeText keeps the full code text', () => {
  const code = { innerText: '// file: src/app.js\nconsole.log("ok");' };
  assert.strictEqual(cgptGetDisplayCodeText(code), '// file: src/app.js\nconsole.log("ok");');
});

test('cgptGetDisplayCodeText keeps full text when metadata is missing', () => {
  const code = { innerText: 'console.log("plain");\nconsole.log("text");' };
  assert.strictEqual(cgptGetDisplayCodeText(code), 'console.log("plain");\nconsole.log("text");');
});

test('cgptGetRawCodeText reads CodeMirror-style content containers', () => {
  const cmContent = {
    innerText: 'const answer = 42;\nconsole.log(answer);',
  };
  const pre = {
    matches: () => false,
    querySelector: (selector) => (selector === 'code, .cm-content' ? cmContent : null),
  };
  assert.strictEqual(
    cgptGetRawCodeText(pre),
    'const answer = 42;\nconsole.log(answer);'
  );
});

test('cgptParseCodeBlockMetadata stays disabled for CodeMirror-style content containers', () => {
  const cmContent = {
    innerText: '// file: src/cm.js\nconsole.log("cm");',
  };
  const pre = {
    matches: () => false,
    querySelector: (selector) => (selector === 'code, .cm-content' ? cmContent : null),
  };
  const metadata = cgptParseCodeBlockMetadata(pre);
  assert.strictEqual(metadata, null);
});


test('cgptGetRawCodeText ignores helper action text in cloned code containers', () => {
  const clone = {
    textContent: 'echo okSaveSave AsCopyCompactExpand',
    innerText: '',
    querySelectorAll: (selector) => {
      assert.match(selector, /data-cgpt-code-actions/);
      return [
        {
          remove: () => {
            clone.textContent = 'echo ok';
          },
        },
      ];
    },
  };
  const code = {
    cloneNode: () => clone,
    innerText: 'echo okSaveSave AsCopyCompactExpand',
    textContent: 'echo okSaveSave AsCopyCompactExpand',
  };

  assert.strictEqual(cgptGetRawCodeText(code), 'echo ok');
});
