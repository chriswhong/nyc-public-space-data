/**
 * Data Processing Script - Create Line-Delimited GeoJSON
 * 
 * Processes multiple GeoJSON datasets (parks, plazas, POPS, waterfront areas, schoolyards)
 * and converts them into a unified NDJSON format with standardized properties.
 * Normalizes data structure across different NYC open data sources for consistent processing.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory containing the GeoJSON files
const directoryPath = './data-pipeline/tmp';

function toCapitalCase(str) {
  return str
    .split(' ') // Split the string into an array of words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter and make rest of word lowercase
    .join(' '); // Join the array back into a string
}

// Function to process each file in the directory
async function processFile({
  file,
  type,
  name: nameFunction,
  location: locationFunction,
  url: urlFunction
}, fileStream) {
  const inputFilePath = path.join(directoryPath, file);

  const { features } = await JSON.parse(fs.readFileSync(inputFilePath));

  features.forEach(async (feature) => {
    let name = nameFunction(feature.properties);
    let location = locationFunction(feature.properties);
    let url = urlFunction(feature.properties);

    const cleanFeature = {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        type,
        name,
        location,
        url
      }
    }

    console.log(JSON.stringify(cleanFeature))

    await fileStream.write(`${JSON.stringify(cleanFeature)}\n`)
  })


}

const fileConfigs = [
  {
    file: 'parks-properties-centroids.geojson',
    type: 'park',
    name: (d) => d.signname,
    location: (d) => d.address ? toCapitalCase(d.address): null,
    url: (d) => d.url
  },
  {
    file: 'pedestrian-plazas-centroids.geojson',
    type: 'plaza',
    name: (d) => d.plazaname,
    location: (d) => `${d.onstreet} between ${d.fromstreet} & ${d.tostreet}`,
    url: () => null
  },
  {
    file: 'pops.geojson',
    type: 'pops',
    name: (d) => d.bldg_name ? d.bldg_name : toCapitalCase(`${d.add_number} ${d.streetname}`),
    location: (d) => d.bldg_name ? toCapitalCase(`${d.add_number} ${d.streetname}`) : null,
    url: (d) => `https://apops.mas.org/pops/${d.popsnumber}`
  },
  {
    file: 'waterfront-public-access-areas.geojson',
    type: 'wpaa',
    name: (d) => d.WPAA_Name,
    location: (d) => d.Intersect_,
    url: (d) => `https://waterfrontaccess.planning.nyc.gov/profiles/${d.WPAA_ID}`
  },
  {
    file: 'schoolyards-to-playgrounds-centroids.geojson',
    type: 'stp',
    name: (d) => d.address ? toCapitalCase(d.address): 'Schoolyard Playground',
    location: (d) => d.location,
    url: () => null
  }
]

async function processItemsSequentially(fileConfigs) {
  const outputFilePath = path.join(directoryPath, `../ld/combined.ndjson`);

  const fileStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

  for (const fileConfig of fileConfigs) {
    await processFile(fileConfig, fileStream); // Wait for each item to be processed before moving on to the next
  }
  // Close the stream after writing all lines
  fileStream.end(() => {
    console.log('All lines have been written to:', outputFilePath);
  });

}

processItemsSequentially(fileConfigs);
