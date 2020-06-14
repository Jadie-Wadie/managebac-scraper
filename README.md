# ManageBac Scraper

A simple ManageBac scraper, using [Puppeteer](https://pptr.dev/) and [TypeScript](https://www.typescriptlang.org/).

## Installation

Clone the repository locally using [git](https://git-scm.com/).

```bash
git clone https://github.com/Jadie-Wadie/managebac-scraper.git
```

Install dependencies using [NPM](https://www.npmjs.com/).

```bash
npm install
```

## Usage

```bash
npm start -- --url=school.managebac.com --email=example@school.edu --pass=secret-password
```

| Argument | Description                           | Required | Default       |
| -------- | ------------------------------------- | -------- | ------------- |
| url      | The URL of the account to scrape      | [x]      |               |
| email    | The email of the account to scrape    | [x]      |               |
| pass     | The password of the account to scrape | [x]      |               |
| file     | The name of the spreadsheet           | [ ]      | `export.xlsm` |
| show     | Tell puppeteer to run in a window     | [ ]      | `false`       |

## License

[MIT](https://choosealicense.com/licenses/mit/)
