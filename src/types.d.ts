declare global {
	// Arguments
	interface Args {
		url: string;
		email: string;
		pass: string;
		file: string;
		show: boolean;
	}

	// Parsed
	interface Subject {
		name: string;
		type?: 'IB' | 'SACE';
		url: string;
		tasks: Task[];
	}

	interface Task {
		name: string;
		grade: Grade | Grade[];
	}

	interface Grade {
		name: string;
		value: number;
	}

	// Raw
	type DataSeries = [
		{
			data: ({ name: string; y: number } | number)[];
			name: string;
			color: string;
		}
	];
}

export {};
