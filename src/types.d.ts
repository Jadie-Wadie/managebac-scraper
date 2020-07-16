declare global {
	// Arguments
	interface Args {
		in: string;
		out: string;
		show: boolean;
	}

	interface Secret {
		url: string;
		email: string;
		pass: string;
	}

	// Parsed
	namespace Parsed {
		type Subject = Number | Letter;

		interface Partial {
			name: string;
			url: string;
		}

		interface Number {
			type: 'number';
			tasks: {
				name: string;
				grades: number[];
			}[];

			name: string;
			url: string;
		}

		interface Letter {
			type: 'letter';
			tasks: {
				name: string;
				grade: [string, number];
			}[];

			name: string;
			url: string;
		}
	}

	// Chart
	namespace Chart {
		type Data = Number | Letter;

		interface Number {
			type: 'number';
			labels: Labels.Number;
			series: Series.Number;

			max: number;
		}

		interface Letter {
			type: 'letter';
			labels: Labels.Letter;
			series: Series.Letter;

			max: number;
		}

		namespace Labels {
			type Number = string[];

			type Letter = {
				[key: string]: string;
			};
		}

		namespace Series {
			type Number = {
				name: string;
				data: { name: string; y: number }[];
			}[];

			type Letter = {
				name: string;
				data: [number];
			}[];
		}
	}
}

export {};
