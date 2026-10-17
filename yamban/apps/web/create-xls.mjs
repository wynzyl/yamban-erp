import * as XLSX from 'xlsx';

// Create a workbook with test data
const data = [
  ['Name', 'Number', 'Size'],
  ['XlsPlayer1', '10', 'M'],
  ['XlsPlayer2', '20', 'L'],
  ['XlsPlayer3', '30', 'XL'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Write as XLS (BIFF8 format)
XLSX.writeFile(wb, 'E:/Projects/Nest-ERP/test-files/test-xls-format.xls', { bookType: 'biff8' });

console.log('XLS file created successfully');
