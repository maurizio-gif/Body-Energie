// Orari di apertura (dati reali del sito originale). Una sola fonte: li usano
// il footer ("Vieni a trovarci", orari estivi), la pagina orari e il PDF degli orari
// (scripts/genera-pdf-orari.mjs, che legge direttamente il JSON).
import dati from './orari-apertura.json';

export interface FasciaOraria {
	giorni: string;
	ore: string;
}

export interface BloccoOrari {
	titolo: string;
	righe: FasciaOraria[];
}

export const orari: BloccoOrari[] = dati.orari;
export const orariEstivi: BloccoOrari[] = dati.orariEstivi;
