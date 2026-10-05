// Riscrive la meta description di ogni pagina con frasi complete, prese dal testo della
// pagina. Le descrizioni arrivate da Yoast erano estratti tagliati a ~160 caratteri con
// "..." a meta' frase, che Google mostra cosi' nei risultati.
//
// Da lanciare dopo gli script normalizza-*.mjs (che riscrivono i JSON con la descrizione
// originale):   node scripts/migrazione/descrizioni-seo.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/data/pagine');
const MAX = 165;
const MIN = 90;

// Pagine il cui testo non si presta (elenchi numerati, frasi lunghissime): descrizione scritta a mano,
// fedele al contenuto della pagina.
const MANUALI = {
	'back-school': 'Impara a conoscere e a usare correttamente la tua colonna vertebrale con esercizi mirati a migliorare mobilità, elasticità e forza.',
	'body-camp': 'Il Body Camp è il centro estivo di Body Energie a Villafranca di Verona per bambini e ragazzi dai 4 ai 13 anni: sport, gioco e creatività.',
	'centro-estetico': 'Il centro estetico di Body Energie è uno spazio dedicato alla cura del corpo e al benessere, tra professionalità e tecnologie avanzate.',
	'corsi-fitness': 'Scopri i Corsi Fitness di Body Energie a Villafranca di Verona, per ogni obiettivo: Respira, Ride, Dinamica e Attiva.',
	'powerlifting-body-energie': 'Powerlifting: impara la tecnica corretta e aumenta la forza nei tre esercizi fondamentali, squat, panca piana e stacco da terra.',
	'technogym-ride': 'Con Technogym Ride l’indoor cycling diventa davvero smart: geometria ispirata alle bici da strada e schermo integrato con app e sessioni di allenamento.',
	'termario': 'Il Termarium di Body Energie è uno spazio dedicato al benessere totale: idromassaggio, bagno turco, sauna finlandese e sauna romana.',
	'zumba-body-energie': 'ZUMBA è puro divertimento a ritmo di musica: ritmi latini e movimenti sinuosi in un mix esplosivo che allena la componente aerobica.',
	'contributo-regione-veneto': 'Con il sostegno dell’Unione Europea (PR Veneto FESR 2021-2027) dodici imprese di Villafranca di Verona hanno realizzato un progetto comune per il territorio.',
	'privacy-body-energie': 'Informativa sulla privacy e sul trattamento dei dati personali di Body Energie, nel rispetto del Regolamento UE 2016/679 (GDPR) e della normativa italiana.',
};

const pulisci = (html) =>
	html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.replace(/\s+([,.;:!?])/g, '$1')
		.replace(/\s+’/g, '’')
		.trim();

const frasi = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean);

function sorgente(p) {
	if (p.tipo === 'testo') return p.html;
	if (p.tipo === 'elenco') return p.intro?.html ?? '';
	return p.intro?.html || p.blocchi?.[0]?.descrizioneHtml || '';
}

// Accorcia una frase lunga: all'ultima virgola/due punti utile, altrimenti all'ultima parola
// "piena" (senza lasciare articoli o congiunzioni appese), e chiude con il punto.
function accorcia(frase, limite) {
	if (frase.length <= limite) return frase;
	const taglio = frase.slice(0, limite);
	const segno = Math.max(taglio.lastIndexOf(','), taglio.lastIndexOf(':'), taglio.lastIndexOf(';'));
	let base = segno > 40 ? taglio.slice(0, segno) : taglio.replace(/s+S*$/, '');
	base = base.replace(/(s+(?:[a-zà-ù]{1,3}|[A-Z]{1,2}))+$/, '').replace(/[,;:s—–-]+$/, '');
	return base + '.';
}

function descrizione(p) {
	if (MANUALI[p.slug]) return MANUALI[p.slug];
	const testo = pulisci(sorgente(p));
	const tutte = frasi(testo);
	let out = '';
	let n = 0;
	for (const f of tutte) {
		const candidata = out ? `${out} ${f}` : f;
		if (candidata.length > MAX) break;
		out = candidata;
		n++;
	}
	if (!out) return accorcia(tutte[0] ?? testo, MAX);
	// Troppo corta: si aggiunge la frase successiva, accorciata se serve.
	if (out.length < MIN && tutte[n]) {
		const resto = MAX - out.length - 1;
		if (resto > 50) out = `${out} ${accorcia(tutte[n], resto)}`;
	}
	return out;
}

for (const f of readdirSync(DIR)) {
	const file = join(DIR, f);
	const raw = readFileSync(file, 'utf8');
	const p = JSON.parse(raw);
	const nuova = descrizione(p);
	if (!nuova) {
		console.warn('[seo] nessun testo per', f);
		continue;
	}
	if (nuova !== p.seo.description) {
		p.seo.description = nuova;
		const crlf = raw.includes('\r\n');
		const out = JSON.stringify(p, null, '\t') + '\n';
		writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
	}
	console.log(`${String(nuova.length).padStart(3)}  ${f.replace('.json', '').padEnd(34)} ${nuova}`);
}
