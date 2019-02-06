# bfx-report-express

## Setup

### Install

- Clone Github repository and install projects dependencies:

```console
git clone https://github.com/bitfinexcom/bfx-report-express.git
cd bfx-report-express
npm install
```

### Configure service

- As to configure the service copy the json.example files from config folder into new ones. Open a console on projects folder a copy the following codes:

```console
cp config/default.json.example config/default.json
```

- To change the api port, client grenache settings or enable logging, change the corresponding properties in the configuration file `config/default.json`

```console
vim config/default.json
## set property values
```

## Other Requirements

### Grenache worker

- Install, configure and run grenache worker following the readme of this repository: [bfx-report](https://github.com/bitfinexcom/bfx-report)

## Run

### Production environment

- For production environment, run the express server in the console:

```console
npm run start
```

### Development environment

- For development environment, run the express server in the console:

```console
npm run startDev
```
