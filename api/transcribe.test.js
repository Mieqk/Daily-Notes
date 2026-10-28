import { describe, expect, it } from 'vitest';
import { cleanTranscript, sanitizeAudio } from './transcribe.js';

describe('transcribe', () => {
  it('принимает только известное аудио в base64', () => {
    expect(sanitizeAudio({ mime: 'audio/webm;codecs=opus', data: 'QUJD' })).toEqual({ mime: 'audio/webm', data: 'QUJD' });
    expect(sanitizeAudio({ mime: 'text/html', data: 'QUJD' })).toBeNull();
    expect(sanitizeAudio({ mime: 'audio/webm', data: '<script>' })).toBeNull();
    expect(sanitizeAudio({ mime: 'audio/webm', data: 'A'.repeat(3_000_001) })).toBeNull();
  });
  it('убирает подпись и кавычки', () => {
    expect(cleanTranscript('Расшифровка: «Привет»')).toBe('Привет');
  });
});
