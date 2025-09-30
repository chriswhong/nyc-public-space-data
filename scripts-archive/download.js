/**
 * Data Download Script - Fetch NYC Open Data
 * 
 * Downloads GeoJSON datasets from various NYC open data sources including:
 * - Parks properties, POPS, waterfront access areas, pedestrian plazas, schoolyards
 * Saves files to temporary directory for further processing in the data pipeline.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { pipeline } = require('stream');

const streamPipeline = promisify(pipeline);

const downloadFiles = async (sourceDatasets) => {
    const tmpDir = path.join('./data-pipeline/tmp');
    
    // Ensure the tmp directory exists
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const downloadFile = async (id, downloadUrl) => {
        const fileName = path.basename(downloadUrl);
        const filePath = path.join(tmpDir, `${id}.geojson`);
        const file = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            https.get(downloadUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                    return;
                }

                streamPipeline(response, file)
                    .then(() => resolve(filePath))
                    .catch(reject);
            }).on('error', reject);
        });
    };

    try {
        const downloadPromises = sourceDatasets.map(({id, downloadUrl}) => downloadFile(id, downloadUrl));
        const downloadedFiles = await Promise.all(downloadPromises);
        console.log('Downloaded files:', downloadedFiles);
    } catch (error) {
        console.error('Error downloading files:', error);
    }
};

// Example usage:
const sourceDatasets = [
    {
        id: 'pops',
        name: 'Privately Owned Public Spaces',
        downloadUrl: "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/Privately_Owned_Public_Spaces/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson"
    },
    {
        id: 'parks-properties',
        name: 'NYC Parks Properties',
        downloadUrl: "https://data.cityofnewyork.us/api/geospatial/enfh-gkve?fourfour=enfh-gkve&cacheBust=1723640748&date=20240814&accessType=DOWNLOAD&method=export&format=GeoJSON"
    },
    {
        id: 'waterfront-public-access-areas',
        name: 'Waterfront Public Access Areas',
        downloadUrl: 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nywpaa_accesspoints/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson'
    },
    {
        id: 'pedestrian-plazas',
        name: 'DOT Pedestrian Plazas',
        downloadUrl: 'https://data.cityofnewyork.us/api/geospatial/k5k6-6jex?fourfour=k5k6-6jex&cacheBust=1714080609&date=20240814&accessType=DOWNLOAD&method=export&format=GeoJSON'
    },
    {
        id: 'schoolyards-to-playgrounds',
        name: 'Schoolyards to Playgrounds',
        downloadUrl: 'https://data.cityofnewyork.us/resource/bbtf-6p3c.geojson'
    },

];

downloadFiles(sourceDatasets);


