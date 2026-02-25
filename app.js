import { createStory, getStory, listStories, saveStory } from './storage.js';
import { getCaretOffset, getEditorText, replaceRange, setEditorText } from './editor.js';
import { setupGem } from './gem.js';
import { buildMarkdown, parseFrontmatter } from './intent.js';
import { rewriteText } from './ai.js';

const editor = document.getElementById('editor');
const saveStatus = document.getElementById('save-status');
const titleButton = document.getElementById('story-title');
const storyOverlay = document.getElementById('story-overlay');
const storyList = document.getElementById('story-list');
const storyIntent = document.getElementById('story-intent');
const chapterIntent = document.getElementById('chapter-intent');

const gem = setupGem({
  editor,
  gemLine: document.getElementById('gem-line'),
  gemBtn: document.getElementById('gem'),
  gemHelp: document.getElementById('gem-help'),
  gemTip: document.getElementById('gem-tip'),
  getIntents: () => ({ story_intent: storyIntent.value, chapter_intent: chapterIntent.value }),
  onAfterInsert: scheduleSave,
});

let currentStory;
let saveTimer;
let rewriteRange;
let rewriteResult = '';

async function bootstrap() {
  const stories = await listStories();
  if (stories.length === 0) {
    currentStory = await createStory('Untitled');
  } else if (stories.length === 1) {
    currentStory = stories[0];
  } else {
    currentStory = stories[0];
  }
  loadStory(currentStory);
  await refreshStoryList();
}

function loadStory(story) {
  currentStory = story;
  const parsed = parseFrontmatter(story.content_markdown || '');
  titleButton.textContent = story.title || 'Untitled';
  setEditorText(editor, parsed.body || '');
  storyIntent.value = story.story_intent || parsed.story_intent || '';
  chapterIntent.value = story.chapter_intent || parsed.chapter_intent || '';
  gem.updateGemVisibility();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveStatus.textContent = 'Saving…';
  saveTimer = setTimeout(async () => {
    const body = getEditorText(editor);
    currentStory.content_markdown = buildMarkdown(body, storyIntent.value, chapterIntent.value);
    currentStory.story_intent = storyIntent.value;
    currentStory.chapter_intent = chapterIntent.value;

    const firstHeading = body.split('\n').find((line) => line.startsWith('## '));
    currentStory.title = firstHeading ? firstHeading.replace(/^##\s+/, '').trim() : (currentStory.title || 'Untitled');
    if (!currentStory.title) currentStory.title = 'Untitled';
    titleButton.textContent = currentStory.title;

    await saveStory(currentStory);
    saveStatus.textContent = 'Saved';
    refreshStoryList();
  }, 1200);
}

async function refreshStoryList() {
  const stories = await listStories();
  storyList.innerHTML = '';
  for (const s of stories) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.innerHTML = `<div>${escapeHtml(s.title || 'Untitled')}</div><small>${new Date(s.last_modified).toLocaleString()}</small>`;
    button.addEventListener('click', async () => {
      const full = await getStory(s.id);
      loadStory(full);
      hideOverlay();
    });
    li.appendChild(button);
    storyList.appendChild(li);
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hideOverlay() {
  storyOverlay.classList.add('hidden');
}

function showOverlay() {
  refreshStoryList();
  storyOverlay.classList.remove('hidden');
}

document.getElementById('new-story').addEventListener('click', async () => {
  const story = await createStory('Untitled');
  loadStory(story);
  await refreshStoryList();
  hideOverlay();
});

document.getElementById('export-md').addEventListener('click', () => {
  const content = buildMarkdown(getEditorText(editor), storyIntent.value, chapterIntent.value);
  downloadFile(`${(currentStory.title || 'story').replace(/\s+/g, '_')}.md`, content, 'text/markdown');
});

document.getElementById('export-txt').addEventListener('click', () => {
  downloadFile(`${(currentStory.title || 'story').replace(/\s+/g, '_')}.txt`, getEditorText(editor), 'text/plain');
});

document.getElementById('close-overlay').addEventListener('click', hideOverlay);
titleButton.addEventListener('click', showOverlay);

editor.addEventListener('input', scheduleSave);
storyIntent.addEventListener('input', scheduleSave);
chapterIntent.addEventListener('input', scheduleSave);

editor.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    gem.continueAnywhere();
  }
});

const rewriteUI = document.getElementById('rewrite-ui');
const rewriteTrigger = document.getElementById('rewrite-trigger');
const rewritePanel = document.getElementById('rewrite-panel');
const rewriteDiff = document.getElementById('rewrite-diff');
const rewriteInput = document.getElementById('rewrite-input');

function hideRewrite() {
  rewriteUI.classList.add('hidden');
  rewritePanel.classList.add('hidden');
  rewriteDiff.classList.add('hidden');
  rewriteInput.value = '';
  rewriteRange = null;
}

function maybeShowRewrite() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !editor.contains(sel.anchorNode)) {
    hideRewrite();
    return;
  }
  rewriteRange = sel.getRangeAt(0).cloneRange();
  const rect = rewriteRange.getBoundingClientRect();
  rewriteUI.style.left = `${rect.right + 8}px`;
  rewriteUI.style.top = `${rect.top + window.scrollY - 6}px`;
  rewriteUI.classList.remove('hidden');
}

rewriteTrigger.addEventListener('click', () => {
  rewritePanel.classList.toggle('hidden');
  rewriteDiff.classList.add('hidden');
  rewriteInput.focus();
});

document.getElementById('rewrite-run').addEventListener('click', async () => {
  if (!rewriteRange) return;
  const selected = rewriteRange.toString();
  rewriteResult = await rewriteText(selected, rewriteInput.value.trim());
  document.getElementById('diff-old').textContent = selected;
  document.getElementById('diff-new').textContent = rewriteResult;
  rewriteDiff.classList.remove('hidden');
});

document.getElementById('rewrite-accept').addEventListener('click', () => {
  if (!rewriteRange) return;
  replaceRange(rewriteRange, rewriteResult);
  scheduleSave();
  hideRewrite();
});

document.getElementById('rewrite-reject').addEventListener('click', hideRewrite);

document.addEventListener('selectionchange', () => setTimeout(maybeShowRewrite, 0));
document.addEventListener('click', (e) => {
  if (!rewriteUI.contains(e.target) && !editor.contains(e.target)) hideRewrite();
});

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

bootstrap();
