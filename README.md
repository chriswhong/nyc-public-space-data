# NYC Public Space App Data

This repo is home to sharable data and processing scripts supporting the NYC Public Space App.

NYC Public Space App Links:
- [iOS App Store](https://apps.apple.com/us/app/nyc-public-space/id6737332320)
- [Android Play Store](https://play.google.com/store/apps/details?id=com.nycpublicspace&hl=en_US)
- [Web Version (https://nycpublicspace.org/)](https://nycpublicspace.org/)

## About the data

The dataset behind the NYC Public Space App is a consolidated dataset of public spaces in New York City, spanning multiple state, local, and federal agencies and including some more ambiguous spaces that are open to the public via the good will of private owners.

The data were first compiled by combining published data from various agencies in late 2024, then manually improved by me with the help of AI, and continuously improved by contributions from users of the app.

The data shared here are snapshots of data from a database. Changes are committed periodically. I may automate this to monthly exports if there is demand.

The published dataset files are located in `/data`

## Scripts

### `firebase-export.js`

Exports data from the Firebase database and writes to three files in `/data` in the following formats:
- **GeoJSON**: Standard geographic data format for use in mapping applications
- **GeoJSON-LD**: Line-delimited geojson for use with Mapbox Tiling Service
- **CSV**: Tabular format for analysis and general use

### `update-tileset.sh`

Shell script that pushes the GeoJSON-LD file created by `firebase-export` to Mapbox Tiling Service, publishing a new version of the tileset used in the Flutter mobile app.

### `export-and-publish` (npm script)

Run `npm run export-and-publish` to execute both `firebase-export.js` and `update-tileset.sh` in sequence, providing a complete data export and publishing workflow.

## Setup

1. Copy `.env.example` to `.env` and add your API credentials
2. Install dependencies: `npm install`
3. Run scripts as needed or use `npm run export-and-publish` for the full workflow

## License

- Code: MIT License
- Data: Creative Commons Attribution 4.0 International (CC BY 4.0)

See [LICENSE.md](LICENSE.md) for full details.
