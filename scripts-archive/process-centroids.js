/**
 * Geospatial Processing Script - Convert Polygons to Centroids
 * 
 * Converts polygon datasets to point datasets by calculating centroids using GDAL.
 * Processes parks, plazas, and schoolyard GeoJSON files to create centroid versions
 * for simplified point-based mapping and analysis.
 */

// convert polygon datasets to centroid datasets
const { exec } = require('child_process');
const path = require('path');

const centroidDatasetIds = [
  './data-pipeline/tmp/parks-properties.geojson',
  './data-pipeline/tmp/pedestrian-plazas.geojson',
  './data-pipeline/tmp/schoolyards-to-playgrounds.geojson'
]

// Function to generate output file name
function getOutputFileName(inputFile) {
    const dir = path.dirname(inputFile);
    const ext = path.extname(inputFile);
    const baseName = path.basename(inputFile, ext);
    return path.join(dir, `${baseName}-centroids${ext}`);
  }
  
  // Function to run the GDAL command
  function runGdalCommand(inputFile) {
    const outputFile = getOutputFileName(inputFile);
    const ext = path.extname(inputFile);
    const baseName = path.basename(inputFile, ext);
    const command = `ogr2ogr -f GeoJSON -dialect sqlite -sql "SELECT ST_Centroid(geometry) AS geometry, * FROM '${baseName}'" '${outputFile}' '${inputFile}'`;
  
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error in GDAL: ${stderr}`);
        return;
      }
      console.log(`Successfully processed: ${inputFile}`);
      console.log(`Output written to: ${outputFile}`);
    });
  }
  
  // Iterate over the list of source files
  centroidDatasetIds.forEach(runGdalCommand);