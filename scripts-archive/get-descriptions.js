/**
 * AI Enhancement Script - Generate Space Descriptions
 * 
 * Uses OpenAI GPT-3.5 to review and improve descriptions for public spaces.
 * Processes NDJSON file line-by-line, validates existing descriptions against location data,
 * and generates improved descriptions where inconsistencies are found.
 */

const fs = require('fs');
const readline = require('readline');
const OpenAI = require('openai');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

// Set your OpenAI API key
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

// Function to call the OpenAI API
async function getDescription(geojsonObject) {
  const prompt = `Given this geojson object, research whether the description is consistent based on the location and other properties. If it looks ok respond with only the text "nochanges". If it is not consistent or has errors, generate a new one-sentence description in a similar format, without mentioning the name of the space. Do not describe your analysis or what you did, only respond with the text of an improved description.  ${JSON.stringify(geojsonObject)}`;
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: prompt }],
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return null;
  }
}

// Function to read existing CSV and return processed space IDs
async function getProcessedSpaceIds(outputFile) {
  const processedIds = new Set();

  if (fs.existsSync(outputFile)) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(outputFile)
        .pipe(csvParser())
        .on('data', (row) => {
          processedIds.add(row.space_id);
        })
        .on('end', () => {
          resolve(processedIds);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  return processedIds;
}

// Function to append data to CSV after each iteration
async function appendToCsv(outputFile, record) {
  const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
      { id: 'space_id', title: 'Space ID' },
      { id: 'description', title: 'Description' },
    ],
    append: true, // Append mode to avoid overwriting
  });

  await csvWriter.writeRecords([record]);
}

// Function to process the NDGeoJSON file
async function processGeoJsonFile(inputFile, outputFile) {
  // const processedIds = await getProcessedSpaceIds(outputFile);

  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const geojsonObject = JSON.parse(line);


      const newDescription = await getDescription(geojsonObject);
      if (newDescription !== 'nochanges') {
        const space_id = geojsonObject.properties.space_id
        const record = { space_id, description: newDescription };
        await appendToCsv(outputFile, record); // Write to CSV immediately after processing
        console.log(`Processed: ${space_id} - ${newDescription}`);
      }
    } catch (error) {
      console.error('Error processing line:', error);
    }
  }
}

// File paths
const inputFilePath = 'data-pipeline/ld/combined.ndjson';
const outputFilePath = 'output_descriptions.csv';

// Start processing the NDGeoJSON file
processGeoJsonFile(inputFilePath, outputFilePath);
