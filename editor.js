export function getEditorText(editor) {
  return editor.innerText.replace(/\u00a0/g, '');
}

export function setEditorText(editor, text) {
  editor.textContent = text;
}

export function getCaretOffset(container) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

export function setCaretToOffset(container, offset) {
  const range = document.createRange();
  const sel = window.getSelection();
  let current = 0;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = current + node.textContent.length;
      if (offset <= next) {
        range.setStart(node, Math.max(0, offset - current));
        range.collapse(true);
        return true;
      }
      current = next;
    }
    for (const child of node.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  }

  if (!walk(container)) {
    range.selectNodeContents(container);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

export function isCaretAtParagraphEndWithPeriod(editor) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return false;
  const text = getEditorText(editor);
  const caret = getCaretOffset(editor);
  const before = text.slice(0, caret);
  const currentParagraph = before.split(/\n\n+/).pop().trimEnd();
  if (!currentParagraph.endsWith('.')) return false;
  const after = text.slice(caret);
  return !after || /^\s*(\n\n|$)/.test(after);
}

export function insertTextAtCaret(editor, text) {
  editor.focus();
  document.execCommand('insertText', false, text);
}

export function replaceRange(range, text) {
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
}
