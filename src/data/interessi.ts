// Le "interest" corrispondono ai 4 form Typeform del sito originale (AbbonamentiBody,
// InfoBody, ProvaBody19) piu' le richieste generiche di informazioni per singolo corso.
export const interessi: Record<string, string> = {
	'prova-gratuita': 'Prova gratuita',
	abbonamento: 'Abbonamenti',
	informazioni: 'Informazioni generali',
	'sala-pesi': 'Sala Pesi',
	'corsi-fitness': 'Corsi Fitness',
	acqua: 'Acqua Fitness',
	'pilates-reformer': 'Pilates Reformer',
	'personal-training': 'Personal Training',
	'nuoto-bimbi': 'Nuoto Bimbi',
	'body-camp': 'Body Summer Camp',
	ciclismo: 'Squadra Ciclistica',
	termario: 'Termarium',
	'back-school': 'Back School',
	'balance-2': 'Balance',
	'balance': 'Shapes',
	'body-pump-body-energie': 'Body Pump',
	'functional-training-body-energie': 'Functional Training',
	'group-cycling': 'Group Cycling',
	'pilates-matwork': 'Pilates Matwork',
	'powerlifting-body-energie': 'Powerlifting',
	'step-body-energie': 'Step',
	'strenght-development': 'Strength Development',
	'technogym-ride': 'Technogym Ride',
	'trx-3': 'TRX',
	'yoga': 'Yoga',
	'zumba-body-energie': 'Zumba',
};

export function etichettaInteresse(id: string | null | undefined): string {
	if (!id) return 'Informazioni generali';
	return interessi[id] ?? id;
}
