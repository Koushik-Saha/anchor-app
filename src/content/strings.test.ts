import { describe, expect, it } from 'vitest';
import { protocolDurationSec, type Protocol } from '../engine';
import { BREATH_PATTERNS } from './breathPatterns';
import { crisisLineText, resolveCrisisLine } from './crisisLines';
import { cueText } from './cueText';
import { formatDuration } from './format';
import { localizeProtocol } from './localize';
import { protocols } from './protocols';
import { en, es, languageFromLocales, protocolText, resolveLanguage, STRINGS } from './strings';

const words = (s: string) => s.trim().split(/\s+/).length;

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}
function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(leaves);
}
function flowText(p: Protocol): string[] {
  return p.phases.flatMap((phase) =>
    phase.kind === 'grounding' ? phase.steps.map((s) => s.prompt) : phase.kind === 'lines' ? [...phase.lines] : [],
  );
}

describe('the Spanish table', () => {
  it('has every English key, and nothing extra', () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort());
  });

  it('has no empty strings', () => {
    for (const text of leaves(es)) expect(text.trim()).not.toBe('');
  });

  it('every reset-flow line is ≤ 8 words and not much longer than the English', () => {
    const groups = [es.breath, es.grounding, es.calm] as const;
    const english = [en.breath, en.grounding, en.calm] as const;
    groups.forEach((group, g) => {
      for (const [key, text] of Object.entries(group)) {
        const source = (english[g] as Record<string, string>)[key] ?? '';
        expect(words(text), text).toBeLessThanOrEqual(8);
        expect(text.length, text).toBeLessThanOrEqual(Math.ceil(source.length * 1.35));
      }
    });
  });

  it('pattern lines are one short line', () => {
    for (const p of BREATH_PATTERNS) expect(words(es.patterns[p.id].line)).toBeLessThanOrEqual(8);
  });

  it('avoids the known mistranslations', () => {
    const all = leaves(es).join('\n');
    expect(all).not.toMatch(/siempre pasa\b/i); // means "always happens"
    expect(all).not.toMatch(/\bsost[eé]n\b/i); // also means "bra"
    expect(all).not.toMatch(/\bbienvenid[oa]\b/i); // gendered
  });

  it('keeps Calm lines meaning "this will pass"', () => {
    expect(es.calm.passes).toBe('Esto también pasará.');
    expect(es.done.subtitle).toBe('Esto también pasará.');
  });
});

describe('choosing the language', () => {
  it.each([['es'], ['es-ES'], ['es-MX'], ['es-US'], ['es_419'], ['ES-mx']])('%s → Spanish', (locale) => {
    expect(languageFromLocales([locale])).toBe('es');
  });

  it.each([['en-US'], ['fr-FR'], ['pt-BR'], ['est'], ['']])('"%s" → English', (locale) => {
    expect(languageFromLocales([locale])).toBe('en');
  });

  it('follows the first language only, and defaults to English', () => {
    expect(languageFromLocales(['en-US', 'es-MX'])).toBe('en');
    expect(languageFromLocales([])).toBe('en');
  });

  it('a manual choice wins over the device', () => {
    expect(resolveLanguage('en', ['es-MX'])).toBe('en');
    expect(resolveLanguage('es', ['en-US'])).toBe('es');
    expect(resolveLanguage('auto', ['es-MX'])).toBe('es');
  });
});

describe('language and crisis line are independent', () => {
  it('a Spanish speaker in the US gets 988', () => {
    const line = resolveCrisisLine('auto', ['es-US'], STRINGS[resolveLanguage('auto', ['es-US'])]);
    expect(line.region).toBe('us');
    expect(line.segments.flatMap((s) => (s.href ? [s.href] : []))).toEqual(['tel:988', 'sms:988']);
    expect(crisisLineText(line)).toBe('Llama o escribe al 988 (Prevención del Suicidio y Crisis)');
  });

  it.each(['us', 'ca', 'uk-ie', 'au', 'other'] as const)('%s has the same numbers in both languages', (region) => {
    const hrefs = (s: typeof en) => resolveCrisisLine(region, [], s).segments.flatMap((x) => (x.href ? [x.href] : []));
    expect(hrefs(es)).toEqual(hrefs(en));
    expect(resolveCrisisLine(region, [], es).region).toBe(region);
  });

  it('changing the language setting never changes the chosen line', () => {
    expect(resolveCrisisLine('uk-ie', ['es-US'], es).region).toBe('uk-ie');
    expect(crisisLineText(resolveCrisisLine('au', [], es))).toBe('Llama a Lifeline, 13 11 14');
    expect(resolveCrisisLine('other', ['es-MX'], es).extra).toBe('o tu número local de emergencias');
  });
});

describe('localized protocols', () => {
  it.each(protocols.map((p) => [p.id, p] as const))('%s keeps its timing and has Spanish text', (id, p) => {
    const localized = localizeProtocol(p, es);
    expect(protocolDurationSec(localized)).toBe(protocolDurationSec(p));
    expect(localized.name).toBe(protocolText(es, id)?.name);
    expect(localized.description).toBe(protocolText(es, id)?.description);
    const english = new Set(flowText(p));
    for (const line of flowText(localized)) {
      expect(english.has(line), line).toBe(false);
      expect(words(line)).toBeLessThanOrEqual(8);
    }
  });

  it('English is unchanged', () => {
    for (const p of protocols) expect(localizeProtocol(p, en)).toEqual(p);
  });

  it('breath cues and durations come from the language table', () => {
    const cue = { kind: 'breathing', part: 'hold' } as Parameters<typeof cueText>[0];
    expect(cueText(cue, es.breath)).toBe('Retén');
    expect(formatDuration(40, es.units)).toBe('40 seg');
  });
});
