// Imports
import 'colors';

import { existsSync, readFileSync } from 'fs';

import winston from 'winston';
import parseArgs from 'command-line-args';

import puppeteer, { Page } from 'puppeteer';
import Excel, { Workbook, Worksheet } from 'exceljs';

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
async function main() {
	// Args
	const args = parseArgs([
		{
			name: 'in',
			type: str => `./${str}.json`,
			defaultValue: './secret.json'
		},
		{
			name: 'out',
			type: str => `./${str}.xlsx`,
			defaultValue: './export.xlsx'
		},
		{ name: 'show', type: Boolean, defaultValue: false }
	]) as Args;

	if (!existsSync(args.in))
		return logger.error(new Error(`${args.in} does not exist`));

	// JSON
	let secret: Secret;
	try {
		secret = loadJSON(args.in, ['url', 'email', 'pass']);
		secret.url = `https://${secret.url}`;
	} catch (err) {
		return logger.error(err);
	}

	// Start Puppeteer
	const browser = await puppeteer.launch({
		headless: !args.show,
		defaultViewport: null
	});
	const page = (await browser.pages())[0];

	// Login
	try {
		await login(page, secret);
	} catch (err) {
		return void logger.error(err) ?? (await browser.close());
	}
	logger.info(`logged in`);

	// Subjects
	let partials: Parsed.Partial[];
	try {
		partials = await getSubjects(page);
		if (partials.length === 0) throw new Error('no subjects found');
	} catch (err) {
		return void logger.error(err) ?? (await browser.close());
	}

	// Grades
	let subjects: Parsed.Subject[];
	try {
		subjects = await getGrades(page, secret, partials);
	} catch (err) {
		return void logger.error(err) ?? (await browser.close());
	}

	// Workbook
	let criterion = 0;
	for (const subject of subjects)
		if (subject.type === 'number')
			for (const task of subject.tasks)
				criterion = Math.max(criterion, task.grades.length);

	const workbook = createWorkbook(criterion);

	// Export
	exportNumbers(
		workbook.getWorksheet('Number'),
		subjects.filter(subject => subject.type === 'number') as Parsed.Number[]
	);
	exportLetters(
		workbook.getWorksheet('Letter'),
		subjects.filter(subject => subject.type === 'letter') as Parsed.Letter[]
	);

	// Summary
	createSummary(workbook);

	// Autofit
	autofitColumns(workbook);

	// Save
	try {
		await workbook.xlsx.writeFile(args.out);
	} catch (err) {
		return void logger.error(err) ?? (await browser.close());
	}
	logger.info('export complete');

	// Close the Browser
	await new Promise(r => setTimeout(r, 1000));
	await browser.close();
}
main();

// Load JSON
function loadJSON(file: string, keys: string[]) {
	const data = JSON.parse(readFileSync(file, 'utf8'));

	for (const key of keys)
		if (data[key] === undefined)
			throw new Error(`${key.cyan} is ${String(undefined).yellow}`);

	return data;
}

// Login
async function login(page: Page, { url, email, pass }: Secret) {
	// Navigate
	await page.goto(url, {
		waitUntil: 'domcontentloaded'
	});

	// Form
	try {
		// Details
		await page.type('#session_login', email);
		await page.type('#session_password', pass);

		// Submit
		await (
			await page.$('#session_form')
		).evaluate((form: HTMLFormElement) => form.submit());
		await page.waitForNavigation();
	} catch (err) {
		throw new Error('invalid url');
	}

	// Success
	if ((await page.$('#flash-area')) !== null)
		throw new Error('invalid credentials');
}

// Get Subjects
async function getSubjects(page: Page) {
	return await (await page.$('#menu')).evaluate((menu: HTMLUListElement) => {
		// Subjects
		const list = menu
			.getElementsByClassName('js-menu-classes-list')[0]
			.getElementsByTagName('ul')[0]
			.getElementsByTagName('li');

		// URLs
		const subjects: Parsed.Partial[] = [];
		for (let i = 0; i < list.length - 1; i++) {
			const item = list.item(i).getElementsByTagName('a')[0];
			subjects.push({
				name: item.getElementsByTagName('span')[0].innerHTML,
				url: item.getAttribute('href')
			});
		}

		return subjects;
	});
}

// Get Grades
async function getGrades(
	page: Page,
	{ url }: Secret,
	partials: Parsed.Partial[]
) {
	let subjects: Parsed.Subject[] = [];

	for (const partial of partials) {
		const subject: Partial<Parsed.Subject> = { ...partial };
		logger.info(subject.name.cyan);

		// First Term
		await page.goto(`${url}${subject.url}/core_tasks`);
		const term = await (await page.$('#term')).evaluate(
			(select: HTMLSelectElement) => {
				return select
					.getElementsByTagName('optgroup')[0]
					.getElementsByTagName('option')[0].value;
			}
		);
		await page.goto(`${url}${subject.url}/core_tasks?term=${term}`);

		// Chart Data
		let data: Chart.Data;
		try {
			data = JSON.parse(
				await page.evaluate(() => {
					const chart = document
						.getElementById('term-set-chart-container')
						.getElementsByTagName('div')[0];

					let type: string, labels: string;
					if (chart.hasAttribute('data-grade-labels')) {
						type = 'letter';
						labels = chart.getAttribute('data-grade-labels');
					} else {
						type = 'number';
						labels = chart.getAttribute('data-criterion-labels');
					}

					let series = JSON.parse(chart.getAttribute('data-series'));

					return JSON.stringify({
						type,
						labels: JSON.parse(labels),
						series,
						max: parseInt(chart.getAttribute('data-max-value'))
					});
				})
			);
		} catch (err) {
			logger.error(`download failed`);
			continue;
		}

		// Number or Letter
		subject.type = data.type;
		switch (subject.type) {
			case 'number':
				parseNumber(subject, data as Chart.Number);
				break;

			case 'letter':
				parseLetter(subject, data as Chart.Letter);
				break;
		}

		subjects.push(subject as Parsed.Subject);
	}

	return subjects;
}

// Parse Number
function parseNumber(subject: Partial<Parsed.Number>, data: Chart.Number) {
	subject.tasks = [];

	for (const entry of data.series) {
		let grades: number[] = new Array(data.labels.length);

		for (let i = 0; i < data.labels.length; i++)
			grades[i] = entry.data.find(
				grade => grade.name === data.labels[i]
			)?.y;

		subject.tasks.push({
			name: entry.name,
			grades
		});
	}

	return subject as Parsed.Number;
}

// Parse Letter
function parseLetter(subject: Partial<Parsed.Letter>, data: Chart.Letter) {
	subject.tasks = [];

	for (const entry of data.series) {
		subject.tasks.push({
			name: entry.name,
			grade: [
				data.labels[entry.data[0].toString()],
				(entry.data[0] / data.max) * 100
			]
		});
	}

	return subject as Parsed.Letter;
}

// Create Workbook
function createWorkbook(criteria: number) {
	const workbook = new Excel.Workbook();
	workbook.creator = 'ManageBac Scraper';

	const numberSheet = workbook.addWorksheet('Number', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	numberSheet.columns = [
		{ header: 'Subject', key: 'subject' },
		{ header: 'Task', key: 'task' },
		...Array.from(new Array(criteria), (_value, index) => ({
			header: `Criterion ${String.fromCharCode(65 + index)}`,
			key: `#${index}`
		}))
	];

	const letterSheet = workbook.addWorksheet('Letter', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	letterSheet.columns = [
		{ header: 'Subject', key: 'subject' },
		{ header: 'Task', key: 'task' },
		{ header: 'Letter', key: 'letter' },
		{ header: 'Number', key: 'number', width: 14.5 }
	];

	return workbook;
}

// Export Numbers
function exportNumbers(sheet: Worksheet, subjects: Parsed.Number[]) {
	for (const subject of subjects) {
		for (const task of subject.tasks) {
			const data = { subject: subject.name, task: task.name };

			for (let i = 0; i < task.grades.length; i++) {
				const grade = task.grades[i];
				data[`#${i}`] = grade === -1 ? 'n/a' : grade;
			}

			sheet.addRow(data).commit();
		}
	}
}

// Export Letters
function exportLetters(sheet: Worksheet, subjects: Parsed.Letter[]) {
	for (const subject of subjects) {
		for (const task of subject.tasks) {
			const data = {
				subject: subject.name,
				task: task.name,
				letter: task.grade[0],
				number: task.grade[1]
			};

			const row = sheet.addRow(data);
			row.getCell('number').numFmt = '0.00';
			row.commit();
		}
	}
}

// Create Summary
function createSummary(workbook: Workbook) {
	const summarySheet = workbook.addWorksheet('Summary', {
		views: [{ state: 'frozen', ySplit: 1 }]
	});
	summarySheet.columns = [
		{ header: 'Type', key: 'type' },
		{ header: 'Tasks', key: 'tasks' },
		{ header: 'Average', key: 'avg' }
	];

	const numberRow = summarySheet.addRow({
		type: 'Number',
		tasks: { formula: '=COUNTA(Number!A:A)-1' },
		avg: { formula: '=AVERAGE(Number!C:F)' }
	});
	numberRow.getCell('avg').numFmt = '0.00';

	const letterRow = summarySheet.addRow({
		type: 'Letter',
		tasks: { formula: '=COUNTA(Letter!A:A)-1' },
		avg: { formula: '=AVERAGE(Letter!D:D)' }
	});
	letterRow.getCell('avg').numFmt = '0.00';
}

// Autofit Columns
function autofitColumns(workbook: Workbook) {
	workbook.eachSheet(sheet => {
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
}
