/**
 * Every word the app shows, in one place. Copy rules (CLAUDE.md): describe what the app
 * does, never what it cures, treats or reduces. Reset-flow lines stay ≤ 8 words.
 */

export const en = {
  /** For dates in History. undefined = the device's own format. */
  dateLocale: undefined as string | undefined,
  common: {
    home: 'Home',
    library: 'Library',
    back: 'Back',
    close: 'Close',
    next: 'Next',
    save: 'Save',
    savedOnDevice: 'Saved on this device only.',
    saveFailed: 'Couldn’t save on this device.',
    storedOnDevice: 'Stored on this device only.',
  },
  units: { sec: 'sec', min: 'min' },
  home: { start: 'Start reset', more: 'More', library: 'Library', plan: 'My plan', whatHelped: 'What helped', settings: 'Settings' },
  reset: {
    title: 'Reset',
    close: 'Close',
    skip: 'Skip',
    welcomeBack: 'Welcome back.',
    resume: 'Resume',
    startOver: 'Start over',
    progress: (current: number, total: number) => `Part ${current} of ${total}`,
  },
  breath: { inhale: 'Breathe in', topUp: 'A little more in', hold: 'Hold', exhale: 'Breathe out', holdOut: 'Hold' },
  patterns: {
    '4-2-6': { name: 'Classic', line: 'In 4, hold 2, out 6' },
    box: { name: 'Box', line: 'In, hold, out, hold: four each' },
    '4-7-8': { name: '4-7-8', line: 'In 4, hold 7, out 8' },
    'double-inhale': { name: 'Double inhale', line: 'Two inhales, one long exhale' },
  },
  grounding: {
    see: 'Find 5 things you can see.',
    touch: 'Notice 4 things you can touch.',
    hear: 'Listen for 3 sounds.',
    smell: 'Notice 2 things you can smell.',
    taste: 'Notice 1 thing you can taste.',
  },
  calm: {
    passes: 'This always passes.',
    safe: 'You are safe right now.',
    circle: 'Just breathe with the circle.',
    slower: 'Each breath slows things down.',
    nothing: 'Nothing to fix. Just breathe.',
    body: 'Your body knows how to settle.',
  },
  protocols: {
    'classic-90': { name: 'Classic reset', description: 'Breathe, ground, settle. The full 90 seconds.' },
    'breathing-60': { name: 'Just breathing', description: 'One minute of slow breathing with the circle.' },
    'grounding-only': { name: 'Just grounding', description: '5-4-3-2-1: come back through your senses.' },
    'box-breathing': { name: 'Box breathing', description: 'In, hold, out, hold: four even counts.' },
    'extended-3min': { name: 'Extended reset', description: 'A slower, longer reset for when 90 seconds isn’t enough.' },
    'night-protocol': { name: 'Night reset', description: 'Extra dim and silent, with a longer exhale.' },
  },
  library: { title: 'Library', build: 'Build my reset', change: 'Change my reset' },
  picker: { subtitle: 'Pick a rhythm.' },
  done: {
    title: 'You did it.',
    subtitle: 'It always passes.',
    whatHelped: 'What helped?',
    call: (name: string) => `Call ${name}`,
    callContact: 'Call my contact',
    again: 'Again',
  },
  helped: { breathing: 'Breathing', grounding: 'Grounding', both: 'Both', 'not-sure': 'Not sure' },
  history: {
    title: 'History',
    completed: 'Completed',
    stopped: 'Stopped',
    helped: (label: string) => `Helped: ${label}`,
    empty: 'Nothing here yet. This list never leaves your device.',
    deleteAll: 'Delete all history',
    fallbackName: 'Reset',
  },
  whatHelped: {
    title: 'What helped',
    none: 'Finish a few resets and patterns will show up here.',
    helped: (subject: 'breathing' | 'grounding' | 'both', count: number, total: number) =>
      `${{ breathing: 'Breathing', grounding: 'Grounding', both: 'Breathing and grounding' }[subject]} helped ${count} of your last ${total} times.`,
    time: (hour: number) => `You use Anchor most around ${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'am' : 'pm'}.`,
    mostUsed: (name: string) => `${name} is your most-used reset.`,
  },
  plan: {
    title: 'My plan',
    private: 'This never leaves your device.',
    noteLabel: 'Note to self',
    noteHint: 'Shown after every reset.',
    notePlaceholder: 'This passes. You are safe.',
    contact: 'Emergency contact',
    name: 'Name',
    phone: 'Phone',
    phoneHint: 'One tap to call from the screen after a reset.',
    privateLabel: 'Private note (optional)',
    privateHint: 'Only shown here — for example, a medication reminder.',
    delete: 'Delete my plan',
  },
  settings: {
    title: 'Settings',
    feel: 'Feel',
    haptics: 'Haptics',
    sound: 'Sound',
    soundHint: 'Soft tones at each change. Off by default.',
    tonePitch: 'Tone pitch',
    low: 'Low',
    mid: 'Mid',
    display: 'Display',
    largeText: 'Large text',
    reduceMotion: 'Reduce motion',
    motionOs: 'On in your device settings.',
    motionHint: 'The circle fades instead of growing.',
    crisis: 'Crisis line',
    language: 'Language',
    languageAuto: 'Automatic',
    yourData: 'Your data',
    history: 'History',
    about: 'About Anchor',
    disclaimer: 'Anchor is a self-help tool, not a medical device, and not a substitute for professional care.',
    inCrisis: 'In crisis:',
  },
  crisis: {
    prefix: 'In crisis?',
    call: 'Call',
    or: ' or ',
    text: 'text',
    number988: ' 988',
    callAria: (service: string) => `Call 988, ${service}`,
    textAria: (service: string) => `Text 988, ${service}`,
    usService: 'Suicide and Crisis Lifeline',
    caService: 'Suicide Prevention Service', // copy-scan-ok: a service name
    samaritans: 'Call Samaritans free, 116 123',
    lifeline: 'Call Lifeline, 13 11 14',
    elsewhere: 'or your local emergency number',
    choices: { auto: 'Automatic', us: 'United States', ca: 'Canada', 'uk-ie': 'UK & Ireland', au: 'Australia', other: 'Anywhere else' },
  },
  install: {
    title: 'Keep Anchor on your home screen',
    ios: 'Tap Share, then “Add to Home Screen”.',
    prompt: 'It opens in one tap and works offline.',
    menu: 'Open your browser menu, then “Add to Home screen”.',
    add: 'Add to Home Screen',
    notNow: 'Not now',
  },
  builder: {
    defaultName: 'My reset',
    titles: {
      steps: 'Pick your steps',
      pattern: 'Pick a rhythm',
      'breath-length': 'How long to breathe?',
      'lines-length': 'How many calm lines?',
      name: 'Name it',
    },
    stepsHint: 'Tap in order. Breathing is required.',
    steps: { breathing: 'Breathing', grounding: 'Grounding', lines: 'Calm lines' },
    seconds: (sec: number) => `${sec} seconds`,
    lineLengths: { short: 'Short', standard: 'Standard' },
    nameLabel: 'Short name',
    start: 'Start',
    change: 'Change it',
    delete: 'Delete it',
  },
};

export type Strings = typeof en;

/**
 * Spanish. Written for meaning, in plain "tú", and gender-neutral (the reader's gender is
 * unknown). "Reset" is "pausa"; "grounding" is "anclaje". Careful with two traps:
 *   - "Esto siempre pasa" means "this always HAPPENS". Use "Esto también pasará".
 *   - A lone "Sostén" also reads as "bra". Use "Retén" for a breath hold.
 */
export const es: Strings = {
  dateLocale: 'es',
  common: {
    home: 'Inicio',
    library: 'Biblioteca',
    back: 'Atrás',
    close: 'Cerrar',
    next: 'Siguiente',
    save: 'Guardar',
    savedOnDevice: 'Guardado solo en este dispositivo.',
    saveFailed: 'No se pudo guardar en este dispositivo.',
    storedOnDevice: 'Guardado solo en este dispositivo.',
  },
  units: { sec: 'seg', min: 'min' },
  home: { start: 'Empezar pausa', more: 'Más', library: 'Biblioteca', plan: 'Mi plan', whatHelped: 'Lo que ayudó', settings: 'Ajustes' },
  reset: {
    title: 'Pausa',
    close: 'Cerrar',
    skip: 'Saltar',
    welcomeBack: 'Hola de nuevo.',
    resume: 'Continuar',
    startOver: 'Empezar de nuevo',
    progress: (current, total) => `Parte ${current} de ${total}`,
  },
  breath: { inhale: 'Inhala', topUp: 'Un poco más', hold: 'Retén', exhale: 'Exhala', holdOut: 'Retén' },
  patterns: {
    '4-2-6': { name: 'Clásica', line: 'Inhala 4, retén 2, exhala 6' },
    box: { name: 'Caja', line: 'Inhala, retén, exhala, retén: 4 cada uno' },
    '4-7-8': { name: '4-7-8', line: 'Inhala 4, retén 7, exhala 8' },
    'double-inhale': { name: 'Doble inhalación', line: 'Dos inhalaciones, una exhalación larga' },
  },
  grounding: {
    see: 'Busca 5 cosas que puedas ver.',
    touch: 'Fíjate en 4 cosas que puedas tocar.',
    hear: 'Escucha 3 sonidos.',
    smell: 'Fíjate en 2 olores.',
    taste: 'Fíjate en 1 sabor.',
  },
  calm: {
    passes: 'Esto también pasará.',
    safe: 'Ahora mismo estás a salvo.',
    circle: 'Solo respira con el círculo.',
    slower: 'Cada respiración baja el ritmo.',
    nothing: 'Nada que arreglar. Solo respira.',
    body: 'Tu cuerpo sabe cómo calmarse.',
  },
  protocols: {
    'classic-90': { name: 'Pausa clásica', description: 'Respira, ánclate, descansa. Los 90 segundos.' },
    'breathing-60': { name: 'Solo respirar', description: 'Un minuto de respiración lenta con el círculo.' },
    'grounding-only': { name: 'Solo anclaje', description: '5-4-3-2-1: vuelve a través de tus sentidos.' },
    'box-breathing': { name: 'Respiración en caja', description: 'Inhala, retén, exhala, retén: cuatro tiempos.' },
    'extended-3min': { name: 'Pausa larga', description: 'Más lenta, para cuando 90 segundos no bastan.' },
    'night-protocol': { name: 'Pausa de noche', description: 'Muy tenue y en silencio, con exhalación larga.' },
  },
  library: { title: 'Biblioteca', build: 'Crear mi pausa', change: 'Cambiar mi pausa' },
  picker: { subtitle: 'Elige un ritmo.' },
  done: {
    title: 'Lo lograste.',
    subtitle: 'Esto también pasará.',
    whatHelped: '¿Qué te ayudó?',
    call: (name) => `Llamar a ${name}`,
    callContact: 'Llamar a mi contacto',
    again: 'Otra vez',
  },
  helped: { breathing: 'Respirar', grounding: 'Anclaje', both: 'Ambos', 'not-sure': 'No lo sé' },
  history: {
    title: 'Historial',
    completed: 'Completada',
    stopped: 'Detenida',
    helped: (label) => `Ayudó: ${label}`,
    empty: 'Nada por aquí todavía. Esta lista nunca sale de tu dispositivo.',
    deleteAll: 'Borrar todo el historial',
    fallbackName: 'Pausa',
  },
  whatHelped: {
    title: 'Lo que ayudó',
    none: 'Termina algunas pausas y aquí verás patrones.',
    helped: (subject, count, total) =>
      subject === 'both'
        ? `Respirar y el anclaje te ayudaron ${count} de tus últimas ${total} veces.`
        : `${subject === 'breathing' ? 'Respirar' : 'El anclaje'} te ayudó ${count} de tus últimas ${total} veces.`,
    time: (hour) => `Usas Anchor sobre todo hacia ${hour === 1 ? 'la' : 'las'} ${hour}:00.`,
    mostUsed: (name) => `Tu pausa más usada: ${name}.`,
  },
  plan: {
    title: 'Mi plan',
    private: 'Esto nunca sale de tu dispositivo.',
    noteLabel: 'Nota para ti',
    noteHint: 'Se muestra después de cada pausa.',
    notePlaceholder: 'Esto pasará. Estás a salvo.',
    contact: 'Contacto de emergencia',
    name: 'Nombre',
    phone: 'Teléfono',
    phoneHint: 'Un toque para llamar después de una pausa.',
    privateLabel: 'Nota privada (opcional)',
    privateHint: 'Solo se ve aquí; por ejemplo, un recordatorio de medicación.',
    delete: 'Borrar mi plan',
  },
  settings: {
    title: 'Ajustes',
    feel: 'Sensación',
    haptics: 'Vibración',
    sound: 'Sonido',
    soundHint: 'Tonos suaves en cada cambio. Apagado por defecto.',
    tonePitch: 'Tono',
    low: 'Grave',
    mid: 'Medio',
    display: 'Pantalla',
    largeText: 'Texto grande',
    reduceMotion: 'Reducir movimiento',
    motionOs: 'Activado en los ajustes del dispositivo.',
    motionHint: 'El círculo se desvanece en vez de crecer.',
    crisis: 'Línea de crisis',
    language: 'Idioma',
    languageAuto: 'Automático',
    yourData: 'Tus datos',
    history: 'Historial',
    about: 'Acerca de Anchor',
    disclaimer: 'Anchor es una herramienta de autoayuda, no un dispositivo médico ni un sustituto de la atención profesional.',
    inCrisis: 'En crisis:',
  },
  crisis: {
    prefix: '¿En crisis?',
    call: 'Llama',
    or: ' o ',
    text: 'escribe',
    number988: ' al 988',
    callAria: (service) => `Llamar al 988, ${service}`,
    textAria: (service) => `Escribir al 988, ${service}`,
    usService: 'Prevención del Suicidio y Crisis', // copy-scan-ok: the service's Spanish name
    caService: 'Suicide Prevention Service', // copy-scan-ok: a service name, kept in English
    samaritans: 'Llama gratis a Samaritans, 116 123',
    lifeline: 'Llama a Lifeline, 13 11 14',
    elsewhere: 'o tu número local de emergencias',
    choices: {
      auto: 'Automático',
      us: 'Estados Unidos',
      ca: 'Canadá',
      'uk-ie': 'Reino Unido e Irlanda',
      au: 'Australia',
      other: 'Otro lugar',
    },
  },
  install: {
    title: 'Ten Anchor en tu pantalla de inicio',
    ios: 'Toca Compartir y luego “Añadir a pantalla de inicio”.',
    prompt: 'Se abre con un toque y funciona sin conexión.',
    menu: 'Abre el menú del navegador y elige “Añadir a pantalla de inicio”.',
    add: 'Añadir a inicio',
    notNow: 'Ahora no',
  },
  builder: {
    defaultName: 'Mi pausa',
    titles: {
      steps: 'Elige tus pasos',
      pattern: 'Elige un ritmo',
      'breath-length': '¿Cuánto respirar?',
      'lines-length': '¿Cuántas frases de calma?',
      name: 'Ponle nombre',
    },
    stepsHint: 'Toca en orden. Respirar es obligatorio.',
    steps: { breathing: 'Respirar', grounding: 'Anclaje', lines: 'Frases de calma' },
    seconds: (sec) => `${sec} segundos`,
    lineLengths: { short: 'Pocas', standard: 'Normal' },
    nameLabel: 'Nombre corto',
    start: 'Empezar',
    change: 'Cambiarla',
    delete: 'Borrarla',
  },
};

export type Language = 'en' | 'es';
export const STRINGS: Readonly<Record<Language, Strings>> = { en, es };

/** Spanish if the device's first language is Spanish; everything else is English. */
export function languageFromLocales(locales: readonly string[]): Language {
  return /^es([-_]|$)/i.test(locales[0] ?? '') ? 'es' : 'en';
}

/** A manual choice in Settings wins over the device. */
export function resolveLanguage(choice: 'auto' | Language, locales: readonly string[]): Language {
  return choice === 'auto' ? languageFromLocales(locales) : choice;
}

/** A built-in reset's name and description, or undefined for a custom or retired id. */
export function protocolText(s: Strings, id: string): { name: string; description: string } | undefined {
  return (s.protocols as Readonly<Record<string, { name: string; description: string } | undefined>>)[id];
}
