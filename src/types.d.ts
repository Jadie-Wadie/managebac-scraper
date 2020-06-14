declare global {
	// Arguments
	interface Args {
		url: string;
		email: string;
		pass: string;
		file: string;
		show: boolean;
	}

	// Parsed Data
	namespace Parsed {
		export interface Subject {
			name: string;
			url: string;

			tasks: Task[];
		}

		export interface Task {
			name: string;
			grades: Grade[];
		}

		export interface Grade {
			name?: string;
			value: number | string;
		}
	}

	// Raw Data
	namespace Raw {
		export interface Task {
			name: string;
			color: string;

			data: Grade[];
		}

		export type Grade =
			| {
					name: string;
					y: number;
			  }
			| number;
	}
}

export {};
