import { generateContinuation } from './ai.js';
import { getEditorText, insertTextAtCaret, isCaretAtParagraphEndWithPeriod, setCaretToOffset } from './editor.js';

export function setupGem({ editor, gemLine, gemBtn, gemHelp, gemTip, getIntents, onAfterInsert }) {
  const firstRun = !localStorage.getItem('storytellers:first-run-complete');
  if (firstRun) {
    gemHelp.classList.remove('hidden');
    gemLine.style.opacity = '0';
    gemLine.style.transition = 'opacity 500ms ease';
    requestAnimationFrame(() => {
      gemLine.style.opacity = '1';
    });
  }

  function updateGemVisibility() {
    const show = isCaretAtParagraphEndWithPeriod(editor);
    gemLine.classList.toggle('hidden', !show);
  }

  async function continueStory(triggeredByShortcut = false) {
    gemLine.classList.add('hidden');
    if (triggeredByShortcut) {
      gemBtn.classList.add('gem-dark');
      await new Promise((r) => setTimeout(r, 300));
      gemBtn.classList.remove('gem-dark');
    }
    const context = getEditorText(editor);
    const sentence = await generateContinuation(context, getIntents());
    const text = context.trimEnd();
    const insertion = `${text ? '\n\n' : ''}${sentence}`;
    editor.focus();
    const offset = getEditorText(editor).length;
    setCaretToOffset(editor, offset);
    insertTextAtCaret(editor, insertion);

    if (!localStorage.getItem('storytellers:gem-tip-seen')) {
      gemTip.classList.remove('hidden');
      setTimeout(() => gemTip.classList.add('hidden'), 2600);
      localStorage.setItem('storytellers:gem-tip-seen', '1');
    }

    localStorage.setItem('storytellers:first-run-complete', '1');
    gemHelp.classList.add('hidden');
    onAfterInsert();
    updateGemVisibility();
  }

  gemBtn.addEventListener('click', () => continueStory(false));
  editor.addEventListener('keyup', updateGemVisibility);
  editor.addEventListener('mouseup', updateGemVisibility);
  editor.addEventListener('input', updateGemVisibility);

  return {
    continueAnywhere: () => continueStory(true),
    updateGemVisibility,
  };
}
