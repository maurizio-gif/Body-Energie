// Dati del planning settimanale per i componenti: pagina /orari e planning in fondo a ogni
// sezione delle schede. Un'unica fonte (src/data/orario-corsi.json): se l'orario cambia, cambiano
// tutti insieme (pagina orari, schede e PDF).
import orario from '../data/orario-corsi.json';

export type Voce = { ora: string; nome: string; cat: string; lesMills?: boolean; nuovo?: boolean };
export type GiornoPlanning = { id: string; nome: string; fasce: [string, Voce[]][] };

export const GIORNI = [
	{ id: 'LUN', nome: 'Lunedì' },
	{ id: 'MAR', nome: 'Martedì' },
	{ id: 'MER', nome: 'Mercoledì' },
	{ id: 'GIO', nome: 'Giovedì' },
	{ id: 'VEN', nome: 'Venerdì' },
	{ id: 'SAB', nome: 'Sabato' },
	{ id: 'DOM', nome: 'Domenica' },
];

export const nomiCategoria = orario.categorie as Record<string, string>;

const minuti = (ora: string) => {
	const [h, m] = ora.split(':').map(Number);
	return h * 60 + m;
};

// Raggruppa le lezioni per orario (in ordine di orario).
function perOrario(voci: Voce[]): [string, Voce[]][] {
	const mappa = new Map<string, Voce[]>();
	for (const v of voci) mappa.set(v.ora, [...(mappa.get(v.ora) ?? []), v]);
	return [...mappa.entries()].sort((a, b) => minuti(a[0]) - minuti(b[0]));
}

/** I sette giorni con le fasce orarie. Con `nomi` solo le lezioni di quelle attivita' (es. ["Yoga"]). */
export function giorniDelPlanning(nomi?: string[]): GiornoPlanning[] {
	return GIORNI.map((g) => ({
		...g,
		fasce: perOrario(((orario.giorni as Record<string, Voce[]>)[g.id] ?? []).filter((v) => !nomi || nomi.includes(v.nome))),
	}));
}
