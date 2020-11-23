# ManageBac Scraper

> A simple ManageBac scraper.

## Installation

Clone the repository locally using [git](https://git-scm.com/).

```cmd
git clone https://github.com/ja1den/managebac-scraper.git
```

Install the dependencies with [npm](https://www.npmjs.com/).

```cmd
npm install
```

## Usage

Create an `.env` file with the target account's credentials.

```sh
TARGET_URL=school.managebac.com
TARGET_EMAIL=student@school.edu.au
TARGET_PASS=p455w0rd
```

Then, run the `start` script.

```sh
npm start
```

To watch Puppeteer's progress, pass the `--debug` flag.

```sh
npm start -- --debug
```

The scraper will export to `./export/data.xlsx`.

## License

[MIT](LICENSE)
