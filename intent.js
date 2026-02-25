export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { body: content, story_intent: '', chapter_intent: '' };
  const fm = match[1];
  const story_intent = (fm.match(/^story_intent:\s*(.*)$/m) || [])[1] || '';
  const chapter_intent = (fm.match(/^chapter_intent:\s*(.*)$/m) || [])[1] || '';
  return { body: content.slice(match[0].length), story_intent, chapter_intent };
}

export function buildMarkdown(body, storyIntent, chapterIntent) {
  const hasIntent = storyIntent.trim() || chapterIntent.trim();
  if (!hasIntent) return body;
  return `---\nstory_intent: ${storyIntent.trim()}\nchapter_intent: ${chapterIntent.trim()}\n---\n\n${body}`;
}
