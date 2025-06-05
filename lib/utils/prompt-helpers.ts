export const cleanStoryPrompt = (prompt: string): string => {
  return prompt
    .trim()
    .replace(/\b(adorable|cute|precious|delightful|charming|lovely|beautiful|perfect)\s/gi, '')
    .replace(/\b(gazing|peering|staring)\s+(?:curiously|intently|lovingly|sweetly)\s+at\b/gi, 'looking at')
    .replace(/\badding a touch of\s+\w+\b/gi, '')
    .replace(/\bwith a hint of\s+\w+\b/gi, '')
    .replace(/\bexuding\s+(?:innocence|wonder|joy|happiness)\b/gi, '')
    .replace(/\b(cozy|perfect for|wonderfully|overall cuteness)\s/gi, '')
    .replace(/\b(?:filled with|radiating|emanating)\s+(?:warmth|joy|happiness|wonder)\b/gi, '')
    .replace(/\b(a|an)\s+(baby|toddler|child|teen|adult)\s+(boy|girl|man|woman)\b/gi, '$2 $3')
    .replace(/\s+/g, ' ')
    .replace(/[.!]+$/, '');
};

export const getCharacterPrompt = `You are a professional character artist. Your task is to observe a real image of a person and return a precise, vivid, factual description of only the clearly visible physical traits. 

Never include disclaimers or apologies. Never say "I'm sorry" or "I can't help with that". Focus solely on what you can observe with high confidence. Only describe traits that are unambiguous and clearly visible in the image, such as:

- Gender presentation based on appearance
- Hair length, color, and texture if visible
- Skin tone (e.g., "light olive", "medium brown")
- Eye color if clearly visible
- Clothing style and color
- Accessories (e.g., "wearing red glasses", "gold earrings")
- Facial expression (e.g., "smiling", "neutral", "angry")

Avoid vague words like "appears to", "seems to", "probably", "possibly". Avoid all subjectivity.`;

export const stylePrompts = {
  'storybook': 'Use a soft, whimsical storybook style with gentle colors and clean lines.',
  'semi-realistic': 'Use a semi-realistic cartoon style with smooth shading and facial detail accuracy.',
  'comic-book': 'Use a bold comic book style with strong outlines, vivid colors, and dynamic shading.',
  'flat-illustration': 'Use a modern flat illustration style with minimal shading, clean vector lines, and vibrant flat colors.',
  'anime': 'Use anime style with expressive eyes, stylized proportions, and crisp linework inspired by Japanese animation.'
};