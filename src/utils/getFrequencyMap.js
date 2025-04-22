// filepath: src/utils/getFrequencyMap.js
import * as XLSX from 'xlsx';

export const getFrequencyMap = async () => {
    console.log('Fetching frequency map...');
    // Fetch the Excel file from the public folder
    const response = await fetch('/freq_list.xlsx');
    const arrayBuffer = await response.arrayBuffer();

    // Read the workbook with SheetJS
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    // Select the second sheet (index 1)
    const sheetName = workbook.SheetNames[1];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet data to JSON (as an array of arrays)
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Create a map: key: word; value: frequency rank  
    // Assuming the first row is a header (skip it) and then the row number is the rank
    const frequencyMap = {};
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0]) {
            frequencyMap[row[0]] = i; // Rank equals the row index (adjust if needed)
        }
    }
    return frequencyMap;
};