// Imports
import 'colors';

import winston from 'winston';
import parseArgs from 'command-line-args';

import { resolve } from 'path';

import Excel from 'exceljs';
import puppeteer from 'puppeteer';

// Interfaces
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

type DataSeries = [
	{
		data: ({ name: string; y: number } | number)[];
		name: string;
		color: string;
	}
];

// Arguments and Validation
const args = parseArgs([
	{ name: 'url', type: String },
	{ name: 'email', type: String },
	{ name: 'pass', type: String },
	{ name: 'file', type: String },
	{ name: 'show', type: Boolean }
]) as {
	url: string;
	email: string;
	pass: string;
	file: string;
	show: boolean;
};

// if (args.url === undefined) return logger.error();

// Logger
const logger = winston.createLogger({
	format: winston.format.cli(),
	transports: [
		new winston.transports.Console({
			level: 'info'
		})
	]
});

// Main
(async function () {
	// Generate URL
	const url = `https://${process.env.MB_URL}`;
	logger.info(`url: ${`${url}/`.cyan}`);

	// Launch a Browser
	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: null
	});
	logger.info(`browser running`);

	// Go to ManageBac
	const page = await browser.newPage();
	await page.goto(`${url}/login`, {
		waitUntil: 'domcontentloaded'
	});

	// Login Form
	await page.type('#session_login', process.env.MB_USER);
	await page.type('#session_password', process.env.MB_PASS);

	await (await page.$('#session_form')).evaluate((form: HTMLFormElement) =>
		form.submit()
	);
	await page.waitForNavigation();
	logger.info('logged in');

	// Get Subjects
	let subjects = await (await page.$('#menu')).evaluate(
		(menu: HTMLUListElement) => {
			// Get Subject List
			const list = menu
				.getElementsByClassName('js-menu-classes-list')[0]
				.getElementsByTagName('ul')[0]
				.getElementsByTagName('li');

			// Get Subject URLs
			const subjects: Subject[] = [];
			for (let i = 0; i < list.length - 1; i++) {
				const item = list.item(i).getElementsByTagName('a')[0];
				subjects.push({
					name: item.getElementsByTagName('span')[0].innerHTML,
					url: item.getAttribute('href'),
					tasks: []
				});
			}

			// Return URLs
			return subjects;
		}
	);

	// Get Subject Grades
	let maxSACE = 0;
	for (let i = 0; i < subjects.length; i++) {
		const subject = subjects[i];

		// Term 1
		await page.goto(`${url}${subject.url}/core_tasks`);
		const term = await (await page.$('#term')).evaluate(
			(select: HTMLSelectElement) => {
				return select
					.getElementsByTagName('optgroup')[0]
					.getElementsByTagName('option')[0].value;
			}
		);
		await page.goto(`${url}${subject.url}/core_tasks?term=${term}`);

		// Get Chart
		const data: DataSeries = JSON.parse(
			await page.evaluate(() => {
				return document
					.getElementById('term-set-chart-container')
					.getElementsByTagName('div')[0]
					.getAttribute('data-series');
			})
		);

		// Get SACE Labels
		const labels: {
			[key: string]: string;
		} =
			JSON.parse(
				await page.evaluate(() => {
					return document
						.getElementById('term-set-chart-container')
						.getElementsByTagName('div')[0]
						.getAttribute('data-grade-labels');
				})
			) ?? undefined;

		if (labels !== undefined) {
			const keys = Object.keys(labels);
			maxSACE = parseInt(keys[keys.length - 1]);
		}

		// Populate Subject
		for (const task of data) {
			let grade: Grade | Grade[];

			for (const key in task.data) {
				const rawGrade = task.data[key];

				if (typeof rawGrade !== 'number') {
					grade = [
						...((grade as Grade[]) ?? []),
						{
							name: rawGrade.name,
							value: rawGrade.y
						}
					];

					subject.type = 'IB';
				} else {
					grade = {
						name: labels[rawGrade],
						value: rawGrade
					};

					subject.type = 'SACE';
				}
			}

			subject.tasks.push({
				name: task.name,
				grade
			});
		}

		logger.info(`scraped ${subject.name.cyan} as ${subject.type.cyan}`);
	}

	// Configure Excel
	const workbook = new Excel.Workbook();
	workbook.creator = 'ManageBac Scraper';

	const sheetIB = workbook.addWorksheet('IB', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	sheetIB.columns = [
		{ header: 'Subject', key: 'subject' },
		{ header: 'Task', key: 'task' },
		{ header: 'A', key: 'a' },
		{ header: 'B', key: 'b' },
		{ header: 'C', key: 'c' },
		{ header: 'D', key: 'd' }
	];

	const sheetSACE = workbook.addWorksheet('SACE', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	sheetSACE.columns = [
		{ header: 'Subject', key: 'subject' },
		{ header: 'Task', key: 'task' },
		{ header: 'Grade', key: 'grade' },
		{ header: 'Percentage', key: 'percentage', width: 14.5 }
	];

	// Export Data
	for (const subject of subjects) {
		for (const task of subject.tasks) {
			let row: Excel.Row;
			if (subject.type! === 'IB') {
				const temp = (task.grade as Grade[]).reduce(
					(
						total: {
							[key: string]: number;
						},
						grade
					) => ({
						...total,
						[grade.name.charAt(0).toLowerCase()]:
							grade.value === -1 ? 'n/a' : grade.value
					}),
					{}
				);

				row = sheetIB.addRow({
					subject: subject.name,
					task: task.name,
					...temp
				});
			} else {
				row = sheetSACE.addRow({
					subject: subject.name,
					task: task.name,
					grade: (task.grade as Grade).name,
					percentage: ((task.grade as Grade).value / maxSACE) * 100
				});
				row.getCell('percentage').numFmt = '0.00';
			}

			row.commit();
		}
	}

	// Summary Sheet
	const sheetSum = workbook.addWorksheet('Summary', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	sheetSum.columns = [
		{ header: 'Name', key: 'name' },
		{ header: 'Tasks', key: 'tasks' },
		{ header: 'Average', key: 'avg' }
	];

	const rowIB = sheetSum.addRow({
		name: 'IB',
		tasks: { formula: '=COUNTA(IB!A:A)-1' },
		avg: { formula: '=AVERAGE(IB!C:F)' }
	});
	rowIB.getCell('avg').numFmt = '0.00';

	const rowSACE = sheetSum.addRow({
		name: 'SACE',
		tasks: { formula: '=COUNTA(SACE!A:A)-1' },
		avg: { formula: '=AVERAGE(SACE!D:D)' }
	});
	rowSACE.getCell('avg').numFmt = '0.00';

	// Autofit Columns
	[sheetIB, sheetSACE, sheetSum].forEach(sheet => {
		sheet.eachColumnKey(column => {
			let width = Math.max(column.width, column.header.length);

			column.eachCell(cell => {
				let string = (cell.value ?? '').toString();

				if (string.match(/\d+.\d+/))
					string = parseFloat(string).toFixed(2);
				if (cell.formula !== undefined) string = '0';

				width = Math.max(width, string.length);
			});

			column.width = width;
		});
	});

	// Save Workbook
	await workbook.xlsx
		.writeFile(resolve(__dirname, 'export.xlsx'))
		.catch(err => logger.error(err));
	logger.info('exported to excel');

	// Close the Browser
	await browser.close();
	logger.info(`browser closed`);
})();
