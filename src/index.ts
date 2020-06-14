// Imports
import 'colors';

import winston from 'winston';
import parseArgs from 'command-line-args';

import { resolve } from 'path';

import Excel from 'exceljs';
import puppeteer, { Browser } from 'puppeteer';

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
		{ name: 'url', type: (str: string) => `https://${str}/` },
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
async function login(browser: Browser, { url, email, pass }: Args) {
	// Load URL
	const page = (await browser.pages())[0];
	await page.goto(`${url}login`, {
		waitUntil: 'domcontentloaded'
	});

	// Login to ManageBac
	await page.type('#session_login', email);
	await page.type('#session_password', pass);

	await (await page.$('#session_form')).evaluate((form: HTMLFormElement) =>
		form.submit()
	);
	await page.waitForNavigation();
}

// Get Subjects
async function getSubjects(browser: Browser) {
	const page = (await browser.pages())[0];
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

// Main
(async function () {
	try {
		// Arguments
		const args = readArguments();
		logger.info(`url: ${args.url.yellow}`);
		logger.info(`file: ${args.file.yellow}`);

		// Launch
		const browser = await puppeteer.launch({
			headless: !args.show,
			defaultViewport: null
		});
		logger.debug('browser running');

		// Log In
		await login(browser, args);
		logger.debug('logged in');

		// Get Subjects
		let subjects = await getSubjects(browser);
		console.log(subjects);

		// Close
		await browser.close();
	} catch (err) {
		logger.error(err.message);
	}
})();
