// Genera il PDF degli orari dei corsi (A4 orizzontale) a partire dai dati del sito:
// stesso planning della pagina /orari (src/data/orario-corsi.json), stessi orari di
// apertura del footer (src/data/orari-apertura.json) e, per descrizioni e regole, le
// schede dei corsi e src/data/pdf-orari.json. Segue a grandi linee il layout del
// vecchio "ORARIO-CORSI" (una scheda per giorno, colonne per area).
//
// Pensato per la stampa: sfondo bianco (nessun fondo nero da stampare), bordi sottili al posto
// dei riquadri pieni e nessun elemento a filo foglio, che le stampanti tagliano.
//
// Parte da solo prima di `npm run dev` e `npm run build`: a ogni deploy il PDF e' quindi
// allineato ai dati, senza doverlo rifare a mano. Il file va in public/ ed e' escluso da git.
//
//   node scripts/genera-pdf-orari.mjs
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const USCITA = join(ROOT, 'public', 'orari-corsi-body-energie.pdf');
const leggi = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const orario = leggi('src/data/orario-corsi.json');
const apertura = leggi('src/data/orari-apertura.json');
const extra = leggi('src/data/pdf-orari.json');
const schedeCorsi = leggi('src/data/orari-schede.json');

// Contatti: dalla stessa fonte del footer (src/data/site.ts), senza duplicarli.
const siteTs = readFileSync(join(ROOT, 'src/data/site.ts'), 'utf8');
const dalSito = (chiave) => siteTs.match(new RegExp(`${chiave}:\\s*'([^']+)'`))?.[1] ?? '';
const contatti = {
	nome: 'Body Energie ssd srl',
	indirizzo: dalSito('address').replace(/,\s*\d{5}\s*/, ' - ').replace(/\s*\(VR\)/, ''),
	telefono: dalSito('phone').replace(/\s+/g, ''),
	web: 'bodyenergie.it',
	email: dalSito('email'),
};

// ---- Colori e font ---------------------------------------------------------------
const ARANCIO = '#ec740f';
const NERO = '#111111';
const GRIGIO_BORDO = '#cfcfcf';
const TESTO_SECONDARIO = '#3a3a3a';
// Versioni scure dei colori delle aree, per titoli e filetti su sfondo bianco.
const COLORI_TITOLO = { d: '#e8720c', a: '#d9480f', r: '#2f9e44', q: '#1c7ed6', f: '#b08900', ride: '#6b6b6b' };
const BIANCO = '#ffffff';
const COLORI = { d: '#ffa552', a: '#f2742a', r: '#8fe08a', q: '#7db4ff', f: '#f3f27a', ride: '#c9c9c9' };
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/montserrat/files');

const GIORNI = [
	['LUN', 'Lunedì'],
	['MAR', 'Martedì'],
	['MER', 'Mercoledì'],
	['GIO', 'Giovedì'],
	['VEN', 'Venerdì'],
	['SAB', 'Sabato'],
	['DOM', 'Domenica'],
];
const COLONNE = ['d', 'a', 'r', 'q', 'f'];

const doc = new PDFDocument({
	size: 'A4',
	layout: 'landscape',
	margin: 0,
	autoFirstPage: false,
	info: {
		Title: `Orario corsi Body Energie - stagione ${orario.stagione}`,
		Author: 'Body Energie',
		Subject: 'Orario dei corsi, orari di apertura e regole del centro',
	},
});
for (const peso of [400, 600, 700, 800, 900]) doc.registerFont(`M${peso}`, join(FONT_DIR, `montserrat-latin-${peso}-normal.woff`));

const M = 24; // margine
const PAGINE = 5;
let W = 0;
let H = 0;
let numeroPagina = 0;

// ---- Utilita' ----------------------------------------------------------------------
function nuovaPagina() {
	doc.addPage();
	numeroPagina++;
	W = doc.page.width;
	H = doc.page.height;
}

// Testo che si rimpicciolisce finche' sta nello spazio dato (larghezza e altezza).
function testoAdattato(testo, x, y, w, h, { peso = 'M800', dimensione = 6.4, minimo = 4.2, colore = NERO, align = 'center', spaziatura = 0.25, verticale = true } = {}) {
	let size = dimensione;
	const opzioni = () => ({ width: w, align, characterSpacing: spaziatura, lineGap: 0.4 });
	doc.font(peso);
	for (; size > minimo; size -= 0.2) {
		doc.fontSize(size);
		const parole = testo.split(/\s+/);
		const piuLarga = Math.max(...parole.map((p) => doc.widthOfString(p, { characterSpacing: spaziatura })));
		if (piuLarga <= w && doc.heightOfString(testo, opzioni()) <= h) break;
	}
	doc.fontSize(size);
	const alt = doc.heightOfString(testo, opzioni());
	doc.fillColor(colore).text(testo, x, verticale ? y + Math.max(0, (h - alt) / 2) : y, opzioni());
	return alt;
}

function stella(cx, cy, r, colore) {
	const punti = [];
	for (let i = 0; i < 10; i++) {
		const a = (Math.PI / 5) * i - Math.PI / 2;
		const raggio = i % 2 === 0 ? r : r * 0.42;
		punti.push([cx + Math.cos(a) * raggio, cy + Math.sin(a) * raggio]);
	}
	doc.polygon(...punti).fill(colore);
}

function intestazione(titolo, sottotitolo) {
	doc.font('M900').fontSize(27).fillColor(ARANCIO).text(titolo, M, 22, { characterSpacing: 0.4, lineBreak: false });
	if (sottotitolo) doc.font('M600').fontSize(8).fillColor(TESTO_SECONDARIO).text(sottotitolo, M, 54, { characterSpacing: 0.3, lineBreak: false });
	doc.image(join(ROOT, 'public/wp-content/uploads/2025/10/Logo-Body-Energie-header.png'), W - M - 118, 18, { width: 118 });
	// Filetto arancio sotto l'intestazione (al posto della striscia a filo foglio).
	doc.rect(M, 68, W - 2 * M, 1.6).fill(ARANCIO);
}

function legenda(x, y) {
	let cursore = x;
	doc.font('M700').fontSize(6.4);
	const voci = [...COLONNE.map((c) => [COLORI[c], orario.categorie[c]]), [COLORI.ride, 'Ride']];
	for (const [colore, nome] of voci) {
		doc.roundedRect(cursore, y, 7, 7, 1.5).fill(colore);
		doc.fillColor(NERO).text(nome.toUpperCase(), cursore + 10, y + 1, { characterSpacing: 0.3, lineBreak: false });
		cursore += 10 + doc.widthOfString(nome.toUpperCase(), { characterSpacing: 0.3 }) + 12;
	}
	stella(cursore + 3.5, y + 3.7, 3.7, ARANCIO);
	doc.fillColor(NERO).text('NOVITÀ', cursore + 10, y + 1, { characterSpacing: 0.3, lineBreak: false });
}

function piePagina() {
	doc.font('M600').fontSize(6).fillColor('#777777').text(
		`Body Energie · Orario corsi stagione ${orario.stagione} · ${contatti.web} · pagina ${numeroPagina}/${PAGINE}`,
		M,
		H - 14,
		{ width: W - 2 * M, align: 'right', lineBreak: false }
	);
}

// ---- Scheda di un giorno -----------------------------------------------------------
// Una riga per ogni orario; se nello stesso orario ci sono due lezioni della stessa area
// (es. due "Respira") la riga si raddoppia, come nel vecchio planning.
function righeDelGiorno(voci) {
	const perOra = new Map();
	for (const v of voci) perOra.set(v.ora, [...(perOra.get(v.ora) ?? []), v]);
	const righe = [];
	for (const [, lista] of perOra) {
		const perCol = Object.fromEntries(COLONNE.map((c) => [c, lista.filter((v) => v.cat === c)]));
		const n = Math.max(...COLONNE.map((c) => perCol[c].length));
		for (let k = 0; k < n; k++) righe.push(Object.fromEntries(COLONNE.map((c) => [c, perCol[c][k] ?? null])));
	}
	return righe;
}

function schedaGiorno(x, y, w, h, nomeGiorno, voci, altezzaRigaMax = 60) {
	const righe = righeDelGiorno(voci);
	const zonaTitolo = 40;
	const pad = 8;
	const rialzo = w * Math.tan((6 * Math.PI) / 180);

	// Pannello bianco con il bordo alto inclinato e titolo del giorno sopra.
	doc.polygon([x, y + zonaTitolo], [x + w, y + zonaTitolo - rialzo], [x + w, y + h], [x, y + h]).lineWidth(0.9).fillAndStroke(BIANCO, '#bdbdbd');
	doc.save();
	doc.rotate(-6, { origin: [x + 4, y + zonaTitolo - 6] });
	doc.font('M900').fontSize(17).fillColor(NERO).text(nomeGiorno.toUpperCase(), x + 4, y + zonaTitolo - 24, { characterSpacing: 0.5, lineBreak: false });
	doc.restore();

	const colW = (w - 2 * pad) / 5;
	const gap = 1.6;
	const yIntest = y + zonaTitolo + 4;
	const hIntest = 17;
	const intestaz = [
		[0, 2, 'DINAMICA & ATTIVA', COLORI.a],
		[2, 1, 'RESPIRA', COLORI.r],
		[3, 1, 'ACQUA', COLORI.q],
		[4, 1, 'FORMA', COLORI.f],
	];
	for (const [da, n, testo, colore] of intestaz) {
		const cx = x + pad + da * colW + gap / 2;
		const cw = n * colW - gap;
		doc.roundedRect(cx, yIntest, cw, hIntest, 2).fill(colore);
		testoAdattato(testo, cx + 1, yIntest, cw - 2, hIntest, { peso: 'M900', dimensione: 5.6, minimo: 4, colore: da === 0 ? BIANCO : NERO, spaziatura: 0.2 });
	}

	const yRighe = yIntest + hIntest + 5;
	const hRighe = y + h - pad - yRighe;
	const hRiga = Math.min(altezzaRigaMax, hRighe / Math.max(righe.length, 1));
	righe.forEach((riga, i) => {
		const ry = yRighe + i * hRiga;
		COLONNE.forEach((col, j) => {
			const cx = x + pad + j * colW + gap / 2;
			const cw = colW - gap;
			const ch = hRiga - gap;
			const v = riga[col];
			const colore = v && /group cycling/i.test(v.nome) ? COLORI.ride : COLORI[col];
			doc.rect(cx, ry, cw, ch).fillOpacity(v ? 1 : 0.16).fill(colore);
			doc.fillOpacity(1);
			if (!v) return;
			const margineInterno = 1.5;
			doc.font('M900').fontSize(7.2);
			const hOra = 8.6;
			doc.fillColor(NERO).text(v.ora, cx + margineInterno, ry + 2.2, { width: cw - 2 * margineInterno, align: 'center', characterSpacing: 0.4, lineBreak: false });
			testoAdattato(v.nome.toUpperCase(), cx + margineInterno, ry + 2.2 + hOra, cw - 2 * margineInterno, ch - hOra - 3.5, {
				dimensione: 6.2,
				minimo: 3.8,
				spaziatura: 0.2,
			});
			if (v.nuovo) stella(cx + cw - 4.2, ry + 4.4, 2.8, '#c0300a');
		});
	});
	return { righe: righe.length, altezzaRiga: hRiga };
}

// ---- Pagine 1 e 2: i giorni --------------------------------------------------------
const giorniPerPagina = [
	['LUN', 'MAR', 'MER'],
	['GIO', 'VEN', 'SAB'],
];
const legendaY = 33;
const sottotitoloStagione = `Stagione ${orario.stagione} · ${orario.validita.split('·')[0].trim()}`;

giorniPerPagina.forEach((gruppo) => {
	nuovaPagina();
	intestazione('ORARIO CORSI', sottotitoloStagione);
	legenda(300, legendaY - 2);
	const gap = 16;
	const cw = (W - 2 * M - 2 * gap) / 3;
	const top = 72;
	const altezza = H - top - 26;
	// Stessa altezza di riga in tutte le schede della pagina (e' quella del giorno piu' pieno).
	const massimo = Math.max(...gruppo.map((g) => righeDelGiorno(orario.giorni[g]).length));
	const hRighe = altezza - 40 - 4 - 17 - 5 - 8;
	const altezzaRiga = Math.min(60, hRighe / massimo);
	gruppo.forEach((g, i) => {
		const nome = GIORNI.find(([id]) => id === g)[1];
		schedaGiorno(M + i * (cw + gap), top, cw, altezza, nome, orario.giorni[g], altezzaRiga);
	});
	piePagina();
});

// ---- Pagina 3: domenica, nuoto libero, orari di apertura ---------------------------
nuovaPagina();
intestazione('ORARI E SERVIZI', sottotitoloStagione);
{
	const gap = 16;
	const cw = (W - 2 * M - 2 * gap) / 3;
	const top = 72;
	const righeDom = righeDelGiorno(orario.giorni.DOM).length;
	const hDom = 40 + 4 + 17 + 5 + 8 + righeDom * 44 + 6;
	schedaGiorno(M, top, cw, hDom, 'Domenica', orario.giorni.DOM, 44);

	// Orario del centro, sotto la domenica.
	const centro = apertura.orari[0];
	const yCentro = top + hDom + 22;
	doc.font('M800').fontSize(13).fillColor(NERO).text('ORARIO DEL CENTRO', M, yCentro, { characterSpacing: 0.4, lineBreak: false });
	let ry = yCentro + 26;
	for (const r of centro.righe) {
		doc.font('M800').fontSize(14).fillColor(ARANCIO).text(r.giorni.toUpperCase(), M, ry, { characterSpacing: 0.4, lineBreak: false });
		doc.text(r.ore.replace(/\./g, ':'), M + 118, ry, { characterSpacing: 0.4, lineBreak: false });
		ry += 25;
	}

	// Nuoto libero: pannello arancio a destra.
	const nx = M + cw + gap;
	const nw = W - M - nx;
	const nh = 296;
	doc.roundedRect(nx, top, nw, nh, 10).lineWidth(2).stroke(ARANCIO);
	doc.font('M800').fontSize(21).fillColor(ARANCIO).text(extra.nuotoLibero.titolo, nx, top + 16, { width: nw, align: 'center', characterSpacing: 0.3, lineBreak: false });
	const rigaH = 27;
	let yy = top + 56;
	for (const g of extra.nuotoLibero.giorni) {
		doc.roundedRect(nx + 24, yy, 56, 20, 10).fill('#bcd6ff');
		doc.font('M800').fontSize(10).fillColor(NERO).text(g.g, nx + 24, yy + 5.5, { width: 56, align: 'center', characterSpacing: 0.4, lineBreak: false });
		doc.roundedRect(nx + 88, yy, nw - 88 - 24, 20, 10).lineWidth(0.8).fillAndStroke(BIANCO, GRIGIO_BORDO);
		testoAdattato(g.orari.replace(/\s*\/\s*/g, '   /   '), nx + 98, yy, nw - 88 - 24 - 20, 20, { peso: 'M600', dimensione: 9.5, minimo: 6, colore: '#1a1a1a', spaziatura: 0, align: 'center' });
		yy += rigaH;
	}
	doc.font('M700').fontSize(7.2).fillColor(NERO);
	doc.text(extra.nuotoLibero.avviso, nx + 24, yy + 6, { width: nw - 48, align: 'center', lineGap: 1.2 });

	// Orario del termarium sotto il nuoto libero.
	const termarium = apertura.orari[1];
	const ty = top + nh + 22;
	doc.font('M800').fontSize(13).fillColor(NERO).text('ORARIO DEL TERMARIUM', nx, ty, { characterSpacing: 0.4, lineBreak: false });
	let tr = ty + 26;
	for (const r of termarium.righe) {
		doc.font('M800').fontSize(14).fillColor(ARANCIO).text(r.giorni.toUpperCase().replace(/ - /g, ' · '), nx, tr, { characterSpacing: 0.4, lineBreak: false });
		doc.text(r.ore.replace(/\./g, ':'), nx + 190, tr, { characterSpacing: 0.4, lineBreak: false });
		tr += 25;
	}
}
piePagina();

// ---- Pagina 4: la tua area ---------------------------------------------------------
const pagineDati = {};
for (const f of readdirSync(join(ROOT, 'src/data/pagine'))) {
	const p = leggi(join('src/data/pagine', f));
	pagineDati[p.slug] = p;
}

// Prima frase (al massimo ~lunghezza caratteri) del testo della scheda del corso.
function sintesiCorso(nome, lunghezza = 150) {
	const ref = schedeCorsi[nome];
	if (!ref) return '';
	const blocco = pagineDati[ref.slug]?.blocchi?.[ref.blocco ?? 0];
	if (!blocco?.descrizioneHtml) return '';
	const testo = blocco.descrizioneHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
	const frasi = testo.split(/(?<=[.!?])\s+/);
	let out = frasi[0] ?? '';
	for (const f of frasi.slice(1)) {
		if ((out + ' ' + f).length > lunghezza) break;
		out += ' ' + f;
	}
	return out.length > lunghezza + 40 ? out.slice(0, lunghezza + 37).replace(/\s+\S*$/, '') + '…' : out;
}

nuovaPagina();
intestazione('LA TUA AREA', 'I corsi del planning, divisi per area');
{
	const gap = 14;
	const cw = (W - 2 * M - 2 * gap) / 3;
	const top = 76;
	const ch = (H - top - 26 - gap) / 2;
	// Tutti i riquadri usano lo stesso corpo del testo: il piu' grande che sta in quello piu' pieno.
	const larghezza = cw - 32;
	const disponibile = ch - 44;
	const contenuti = extra.aree.map((area) => ({
		area,
		corsi: area.corsi.map((nome) => ({ nome: extra.nomiCorso?.[nome] ?? nome, testo: sintesiCorso(nome) })),
	}));
	const altezzaCorsi = (corsi, s) =>
		corsi.reduce((tot, c) => {
			doc.font('M700').fontSize(s);
			const t = c.testo ? `${c.nome.toUpperCase()}: ${c.testo}` : c.nome.toUpperCase();
			return tot + doc.heightOfString(t, { width: larghezza, lineGap: 1 }) + 7;
		}, 0);
	let size = 9;
	while (size > 5 && contenuti.some((c) => altezzaCorsi(c.corsi, size) > disponibile)) size -= 0.2;

	contenuti.forEach(({ area, corsi }, i) => {
		const x = M + (i % 3) * (cw + gap);
		const y = top + Math.floor(i / 3) * (ch + gap);
		const colore = COLORI_TITOLO[area.id] ?? COLORI_TITOLO.ride;
		doc.roundedRect(x, y, cw, ch, 6).lineWidth(0.9).stroke(GRIGIO_BORDO);
		doc.rect(x, y + 10, 3, ch - 20).fill(colore);
		doc.font('M900').fontSize(15).fillColor(colore).text(area.titolo.toUpperCase(), x + 16, y + 12, { characterSpacing: 0.5, lineBreak: false });
		let cy = y + 38;
		for (const c of corsi) {
			doc.font('M800').fontSize(size).fillColor(NERO).text(c.nome.toUpperCase() + (c.testo ? ': ' : ''), x + 16, cy, { width: larghezza, continued: !!c.testo, lineGap: 1 });
			if (c.testo) doc.font('M400').fillColor(TESTO_SECONDARIO).text(c.testo, { lineGap: 1 });
			cy = doc.y + 7;
		}
	});
}
piePagina();

// ---- Pagina 5: regole e contatti ---------------------------------------------------
nuovaPagina();
{
	doc.font('M900').fontSize(23).fillColor(ARANCIO).text(extra.regole.titolo.toUpperCase(), 0, 20, { width: W, align: 'center', characterSpacing: 0.5, lineBreak: false });
	doc.rect(M, 62, W - 2 * M, 2).fill(ARANCIO);

	const colonne = 2;
	const gapC = 28;
	const cw = (W - 2 * M - gapC) / colonne;
	const yInizio = 82;
	const yFine = H - 92;
	const rientro = 11;
	let size = 9;

	// Testo con parti in grassetto (**cosi'**): uno stesso paragrafo cambia font a meta'.
	const segmenti = (testo) => testo.split('**').map((parte, i) => ({ parte, grassetto: i % 2 === 1 })).filter((s) => s.parte);
	const altezzaVoce = (testo) => {
		doc.font('M600').fontSize(size);
		return doc.heightOfString(testo.replace(/\*\*/g, ''), { width: cw - rientro, lineGap: 1.4 }) + 5;
	};

	// Il corpo scende finche' il testo, diviso in due colonne di pari altezza, sta nella pagina.
	const totale = () => extra.regole.voci.reduce((t, v) => t + altezzaVoce(v), 0);
	while (size > 6.4 && totale() / 2 + 28 > yFine - yInizio) size -= 0.2;
	const meta = totale() / 2;

	let colonna = 0;
	let y = yInizio;
	let accumulato = 0;
	for (const voce of extra.regole.voci) {
		const h = altezzaVoce(voce);
		// Si passa alla seconda colonna quando la voce supera la meta' del testo.
		if (colonna < colonne - 1 && accumulato + h / 2 > meta) {
			colonna++;
			y = yInizio;
		}
		accumulato += h;
		const x = M + colonna * (cw + gapC);
		doc.circle(x + 3, y + 4.2, 1.7).fill(NERO);
		const parti = segmenti(voce);
		parti.forEach((s, i) => {
			doc.font(s.grassetto ? 'M800' : 'M600').fontSize(size).fillColor(NERO);
			const opzioni = { width: cw - rientro, lineGap: 1.4, continued: i < parti.length - 1 };
			if (i === 0) doc.text(s.parte, x + rientro, y, opzioni);
			else doc.text(s.parte, opzioni);
		});
		y += h;
	}
	if (y > yFine + 4 && colonna === colonne - 1) console.warn('[pdf-orari] le regole non stanno nella pagina: ridurre il testo o il corpo.');

	// Contatti in fondo, sotto un filetto (niente fascia nera da stampare).
	doc.rect(M, H - 82, W - 2 * M, 1.2).fill(GRIGIO_BORDO);
	doc.font('M800').fontSize(13).fillColor(NERO).text(contatti.nome, M, H - 70, { characterSpacing: 1, lineBreak: false });
	doc.font('M600').fontSize(11.5).fillColor(TESTO_SECONDARIO);
	doc.text(contatti.indirizzo.replace(/s*-s*/, ' - '), M, H - 51, { characterSpacing: 0.8, lineBreak: false });
	doc.text(`T. ${contatti.telefono}   ${contatti.web}   ${contatti.email}`, M, H - 34, { characterSpacing: 0.8, lineBreak: false });
	doc.font('M600').fontSize(6).fillColor('#777777').text(`Pagina ${numeroPagina}/${PAGINE}`, 0, H - 22, { width: W - M, align: 'right', lineBreak: false });
}

mkdirSync(join(ROOT, 'public'), { recursive: true });
const flusso = createWriteStream(USCITA);
doc.pipe(flusso);
doc.end();
flusso.on('finish', () => console.log(`[pdf-orari] ${numeroPagina} pagine A4 orizzontali: public/orari-corsi-body-energie.pdf`));
