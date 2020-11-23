// Chart Data
export namespace Chart {
	export type Data = Number | Letter;

	export interface Number {
		type: 'number';

		labels: Labels.Number;
		series: Series.Number;

		max: number;
	}

	export interface Letter {
		type: 'letter';

		labels: Labels.Letter;
		series: Series.Letter;

		max: number;
	}

	export namespace Labels {
		export type Number = string[];

		export type Letter = {
			[key: string]: string;
		};
	}

	export namespace Series {
		export type Number = {
			name: string;
			data: { name: string; y: number }[];
		}[];

		export type Letter = {
			name: string;
			data: [number];
		}[];
	}
}

// Parsed Data
export namespace Parsed {
	export type Subject = Number | Letter;

	export interface Partial {
		name: string;
		url: string;
	}

	export interface Number {
		type: 'number';
		tasks: {
			name: string;
			grades: number[];
		}[];

		name: string;
		url: string;
	}

	export interface Letter {
		type: 'letter';
		tasks: {
			name: string;
			grade: [string, number];
		}[];

		name: string;
		url: string;
	}
}
