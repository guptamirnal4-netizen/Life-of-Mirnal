// Jana Gana Mana, India's National Anthem (Rabindranath Tagore, 1911). The official full version lasts about 52 seconds.
// Recording: U.S. Navy Band instrumental (public domain), see audio/ATTRIBUTION.md.
// Lyric timings are spread over the recording's real length, so they are approximate.
export const ANTHEM_AUDIO_URL = 'audio/jana-gana-mana.ogg';

export const ANTHEM_DURATION = 52;

export const ANTHEM_LINES = [
  { at: 0, dev: 'जन-गण-मन अधिनायक जय हे, भारत-भाग्य-विधाता!', rom: 'Jana-gana-mana-adhinayaka jaya he, Bharata-bhagya-vidhata!' },
  { at: 8, dev: 'पंजाब सिन्धु गुजरात मराठा द्राविड़ उत्कल बंग', rom: 'Punjaba Sindhu Gujarata Maratha Dravida Utkala Banga' },
  { at: 15, dev: 'विन्ध्य हिमाचल यमुना गंगा उच्छल जलधि तरंग', rom: 'Vindhya Himachala Yamuna Ganga uchchhala jaladhi taranga' },
  { at: 22, dev: 'तव शुभ नामे जागे, तव शुभ आशिष मागे,', rom: 'Tava shubha name jage, tava shubha ashisha mage,' },
  { at: 29, dev: 'गाहे तव जयगाथा।', rom: 'Gahe tava jaya-gatha.' },
  { at: 33, dev: 'जन-गण-मंगलदायक जय हे, भारत-भाग्य-विधाता!', rom: 'Jana-gana-mangala-dayaka jaya he, Bharata-bhagya-vidhata!' },
  { at: 41, dev: 'जय हे, जय हे, जय हे, जय जय जय, जय हे।', rom: 'Jaya he, jaya he, jaya he, jaya jaya jaya, jaya he.' },
];

export const LYRIC_WORDS = new Set(
  ANTHEM_LINES.flatMap((l) => `${l.dev} ${l.rom}`.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ').split(/\s+/))
    .filter((w) => w.length > 1),
);
