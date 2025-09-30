/**
 * Mapbox Tileset Creation Script - Upload Vector Tile Sources
 * 
 * Uploads GeoJSON data to Mapbox as tileset sources for vector tile generation.
 * Processes line-delimited GeoJSON files and creates map tiles used in the
 * NYC Public Space App's interactive mapping interface.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config()

// Directory containing the GeoJSON files
const directoryPath = './data-pipeline/ld'; // Replace with your directory path
const username = 'chriswhongmapbox'; // Replace with your username

// Function to process each file in the directory
function uploadFile(file) {
  const inputFilePath = path.join(directoryPath, file);
  const command = `tilesets upload-source ${username} ${path.parse(file).name} ${inputFilePath} --token ${process.env.MAPBOX_TILESETS_ACCESS_TOKEN}`;

  console.log(command)
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error processing file ${file}: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Command error for file ${file}: ${stderr}`);
      return;
    }
    console.log(`Successfully uploaded: ${file}`);
    console.log(stdout);
  });
}

// Read all files in the directory
fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error(`Unable to scan directory: ${err.message}`);
    return;
  }

  // Process each file
  files.forEach(uploadFile);
});
