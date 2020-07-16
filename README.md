# ManageBac Scraper

A simple ManageBac scraper, using [Puppeteer](https://pptr.dev/) and [TypeScript](https://www.typescriptlang.org/).

## Installation

Clone the repository locally using [git](https://git-scm.com/).

```cmd
git clone https://github.com/Jadie-Wadie/managebac-scraper.git
```

Install dependencies using [NPM](https://www.npmjs.com/).

```cmd
npm install
```

## Usage

### JSON

Account data is loaded from JSON, rather than the command line.

```json
{
	"url": "school.managebac.com",
	"email": "example@school.edu",
	"pass": "pa55w0rd"
}
```

| Argument | Description            |
| -------- | ---------------------- |
| url      | The URL of the school  |
| email    | The account's email    |
| pass     | The account's password |

### CMD

The scraper accepts a number of optional command-line arguments:

```cmd
npm start -- --in data/secret --out data/export --show
```

| Argument | Description                                      | Default  |
| -------- | ------------------------------------------------ | -------- |
| in       | The name of the JSON file containing credentials | `secret` |
| out      | The name of the generated spreadsheet            | `export` |
| show     | Tell puppeteer to run in a window                | `false`  |

**Note**<br>
Paths should not include extensions (`.json` or `.xlsx`).<br>
Paths are resolved relative to the current terminal location.

## License

[MIT](https://choosealicense.com/licenses/mit/)
