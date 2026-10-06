// Funzioni comuni agli script che trasformano il JSON Elementor del vecchio sito
// in dati puliti (src/data/pagine/*.json). Si lanciano dalla radice del progetto:
// i percorsi dei media vengono verificati dentro public/.
import fs from 'node:fs';

export const strip = (h) =>
	(h || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();

// Percorso assoluto del vecchio sito -> percorso del nuovo (stessi URL dei media).
const percorsoGrezzo = (url) => (url ? url.replace(/^https?:\/\/(www\.)?bodyenergie\.it/i, '') : null);

// WordPress linka spesso una variante ridimensionata (-2048x1365) che nel nuovo
// sito non c'e' (si copiano solo gli originali): se il file non esiste si usa
// l'originale (stesso nome senza misura) o la versione "-scaled".
export function percorso(url) {
	const p = percorsoGrezzo(url);
	if (!p || !p.startsWith('/wp-content/') || fs.existsSync('public' + p)) return p;
	const senzaMisura = p.replace(/-\d+x\d+(\.\w+)$/, '$1');
	for (const c of [senzaMisura, senzaMisura.replace(/(\.\w+)$/, '-scaled$1')]) {
		if (fs.existsSync('public' + c)) return c;
	}
	console.warn('File non trovato in public/:', p);
	return p;
}

// Tiene solo la struttura del testo (paragrafi, grassetti, elenchi, link):
// niente stili, classi o span di Elementor.
// Con { abbassaTitoli: true } gli h1 diventano h2 (la pagina ha gia' il suo h1).
export function pulisci(html, { abbassaTitoli = false } = {}) {
	const testo = (html || '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/<\/?(span|div|font|u|article|section)\b[^>]*>/gi, '')
		.replace(/<(\/?)b\b[^>]*>/gi, '<$1strong>')
		.replace(/<(p|strong|em|i|ul|ol|li|h[1-6]|blockquote|hr)\b[^>]*>/gi, '<$1>')
		.replace(/<a\b([^>]*)>/gi, (_, attrs) => {
			const href = attrs.match(/href="([^"]*)"/i);
			return href ? `<a href="${percorso(href[1])}">` : '<a>';
		})
		.replace(/<br\b[^>]*>/gi, '<br>')
		.replace(/<p>\s*(<br>)?\s*<\/p>/gi, '')
		.replace(/\s+/g, ' ')
		.trim();
	return abbassaTitoli ? testo.replace(/<(\/?)h1>/g, '<$1h2>') : testo;
}

// Tutti i widget sotto un nodo, in ordine di documento.
export function widgets(n, out = []) {
	for (const c of n.elements || []) {
		if (c.elType === 'widget') out.push(c);
		else widgets(c, out);
	}
	return out;
}

export const maiuscoleIniziali = (s) => s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

export const etichetta = (s) => {
	const t = strip(s).toLowerCase();
	return t.charAt(0).toUpperCase() + t.slice(1);
};

// Hero della pagina: foto di fondo e titolo. Il sottotitolo del vecchio sito ("Salute e
// Movimento con Body energie" e simili) non si porta: le hero non hanno sottotitoli. Il titolo originale e' una
// "animated headline" Elementor in modalita' "rotate": testo iniziale + una o piu'
// parole che ruotano (la prima si vede al caricamento). Il campo "highlighted_text"
// ("Amazing") e' il segnaposto di default di Elementor e in questa modalita' non
// viene mai mostrato: non va portato.
// Foto hero scelte dopo la migrazione al posto di quelle del vecchio sito. Nel vecchio sito Yoga, Pilates
// Matwork, Balance e Back School usavano la stessa foto (e Group Cycling e Technogym Ride la stessa):
// ogni corso ha ora la sua. Chiave = indirizzo della pagina. Se si rigenerano le pagine da WordPress
// queste restano (Yoga e Technogym Ride tengono la foto originale, che ora e' solo loro).
export const HERO_SOSTITUTIVE = {
	'back-school': '/wp-content/uploads/2025/08/BACK-SCHOOL-scaled-1-enjoy.jpg',
	'balance-2': '/wp-content/uploads/2025/11/Body-Energie-Azioni-15-scaled.jpg',
	'pilates-matwork': '/wp-content/uploads/2025/09/logan-weaver-lgnwvr-u76Gd0hP5w4-unsplash.jpg',
	'group-cycling': '/wp-content/uploads/2025/08/groupcycling-min-scaled-1.jpg',
};

export function heroDa(sezione, slug) {
	const ws = widgets(sezione);
	const an = ws.find((w) => w.widgetType === 'animated-headline')?.settings || {};
	const parole = String(an.rotating_text || '')
		.split('\n')
		.map((p) => strip(p))
		.filter(Boolean);
	return {
		titolo: strip(an.before_text),
		parole,
		immagine: HERO_SOSTITUTIVE[slug] ?? percorso(sezione.settings?.background_image?.url),
	};
}
