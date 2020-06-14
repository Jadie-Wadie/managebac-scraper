// Imports
import 'colors';

import winston from 'winston';
import parseArgs from 'command-line-args';

import { resolve } from 'path';

import Excel from 'exceljs';
import puppeteer, { Page } from 'puppeteer';

// Logger
const logger = winston.createLogger({
	format: winston.format.cli(),
	transports: [
		new winston.transports.Console({
			level: 'debug'
		})
	]
});

// Read Arguments
function readArguments() {
	// Parse
	const args = parseArgs([
		{ name: 'url' },
		{ name: 'email' },
		{ name: 'pass' },
		{
			name: 'file',
			type: (str: string) => `${str}.xlsm`,
			defaultValue: 'export.xlsm'
		},
		{ name: 'show', type: Boolean, defaultValue: false }
	]) as Args;

	// Check Required
	const required = ['url', 'email', 'pass'];
	for (const arg of required) {
		if (args[arg] === undefined)
			throw new Error(
				`${`--${arg}`.cyan} cannot be ${String(args[arg]).yellow}`
			);
	}

	// Return
	return args;
}

// Login
async function login(page: Page, { email, pass }: Args) {
	await page.type('#session_login', email);
	await page.type('#session_password', pass);

	await (await page.$('#session_form')).evaluate((form: HTMLFormElement) =>
		form.submit()
	);
	await page.waitForNavigation();
}

// Get Subjects
async function getSubjects(page: Page) {
	return await page.evaluate(() => {
		// Menu
		const menu = document.getElementById('menu');

		// Subject List
		const list = menu
			.getElementsByClassName('js-menu-classes-list')[0]
			.getElementsByTagName('ul')[0]
			.getElementsByTagName('li');

		// Subject URLs
		const subjects: Parsed.Subject[] = [];
		for (let i = 0; i < list.length - 1; i++) {
			const item = list.item(i).getElementsByTagName('a')[0];
			subjects.push({
				name: item.getElementsByTagName('span')[0].innerHTML,
				url: item.getAttribute('href'),
				tasks: []
			});
		}

		// Return
		return subjects;
	});
}

// Get Grades
async function getGrades(page: Page, url: string, subject: Parsed.Subject) {
	// Find Term 1
	await page.goto(`${url}${subject.url}/core_tasks`);
	const term = await page.evaluate(() => {
		return document
			.getElementById('term')
			.getElementsByTagName('optgroup')[0]
			.getElementsByTagName('option')[0].value;
	});
	await page.goto(`${url}${subject.url}/core_tasks?term=${term}`);

	// Get Raw Data
	const data: Raw.Task[] = JSON.parse(
		await page.evaluate(() => {
			return document
				.getElementById('term-set-chart-container')
				.getElementsByTagName('div')[0]
				.getAttribute('data-series');
		})
	);

	// Grade Type
	let type: 'N' | 'L';
}

// Main
(async function () {
	try {
		// Arguments
		const args = readArguments();
		logger.info(`url: ${args.url.yellow}`);
		logger.info(`file: ${args.file.yellow}`);

		args.url = `https://${args.url}`;

		// Launch and Load
		const browser = await puppeteer.launch({
			headless: !args.show,
			defaultViewport: null
		});
		logger.debug('browser running');

		const page = (await browser.pages())[0];
		await page.goto(`${args.url}/login`, {
			waitUntil: 'domcontentloaded'
		});

		// Log In
		await login(page, args);
		logger.debug('logged in');

		// Get Subjects
		let subjects = await getSubjects(page);

		// Get Grades
		for (let i = 0; i < subjects.length; i++) {
			let subject = await getGrades(page, args.url, subjects[i]);
		}

		// Close
		await browser.close();
	} catch (err) {
		logger.error(err.message);
	}
})();
