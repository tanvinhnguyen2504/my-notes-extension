import { stripBrackets } from '@/src/core/english_utils';

export function speakEnglish(en: string): void {
  if (typeof speechSynthesis === 'undefined') {
    return;
  }
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(stripBrackets(en));
  // Line 2 is Vietnamese but only the English is ever spoken, and `lang` is
  // what picks the voice -- the default follows the page.
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
}
