const bridges = [
  'and the silence answered in a voice only {subject} could hear.',
  'while the next breath carried a promise {subject} could no longer ignore.',
  'as if the room itself leaned closer to witness what came next.',
  'and even then, {subject} sensed the night was withholding its truest name.',
  'until the smallest sound made every certainty feel suddenly fragile.',
];

function detectSubject(text) {
  if (/\bI\b/.test(text)) return 'I';
  if (/\bhe\b/i.test(text)) return 'he';
  if (/\bshe\b/i.test(text)) return 'she';
  if (/\bthey\b/i.test(text)) return 'they';
  return 'they';
}

export async function generateContinuation(context, intents = {}) {
  const fullContext = `${context}\n${intents.story_intent || ''}\n${intents.chapter_intent || ''}`.trim();
  const subject = detectSubject(fullContext);
  const line = bridges[Math.floor(Math.random() * bridges.length)].replaceAll('{subject}', subject);
  const words = line.split(/\s+/).slice(0, 30).join(' ');
  const sentence = words.endsWith('.') ? words : `${words.replace(/[.!?]+$/, '')}.`;
  return sentence;
}

export async function rewriteText(selected, instruction) {
  const lower = instruction.toLowerCase();
  if (lower.includes('short')) {
    return selected.split(/[,.]/)[0].trim().replace(/[.!?]*$/, '.') || selected;
  }
  if (lower.includes('tense') && lower.includes('past')) {
    return selected
      .replace(/\bis\b/g, 'was')
      .replace(/\bare\b/g, 'were')
      .replace(/\bwalks\b/g, 'walked');
  }
  if (lower.includes('poetic') || lower.includes('lyrical')) {
    return `${selected.replace(/[.!?]*$/, '')}, like ink dissolving into dusk.`;
  }
  if (lower.includes('clear') || lower.includes('clar')) {
    return selected.replace(/\s+/g, ' ').trim();
  }
  return `${selected.replace(/[.!?]*$/, '')}.`;
}
