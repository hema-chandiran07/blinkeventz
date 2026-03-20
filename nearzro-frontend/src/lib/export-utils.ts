/**
 * Export Utility Functions
 * 
 * Supports exporting data to CSV, XLSX, PDF, and JSON formats
 * with customizable fields, filters, and formatting.
 */

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  fields: string[];
  filters?: Record<string, any>;
  dateRange?: { from: Date; to: Date };
  includeHeaders: boolean;
  includeSummary: boolean;
  fileName?: string;
}

/**
 * Convert data array to CSV format
 */
export function exportToCSV(data: any[], options: ExportOptions): Blob {
  const { fields, includeHeaders } = options;
  
  if (data.length === 0) {
    return new Blob([], { type: 'text/csv;charset=utf-8;' });
  }

  // Create headers
  const headers = includeHeaders
    ? fields.map(field => formatHeader(field)).join(',')
    : '';

  // Create rows
  const rows = data.map(item =>
    fields
      .map(field => {
        const value = getNestedValue(item, field);
        return escapeCSVValue(value);
      })
      .join(',')
  );

  const csv = [headers, ...rows].filter(Boolean).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Convert data array to XLSX format (using simple XML-based approach)
 * For production, consider using a library like 'xlsx'
 */
export function exportToXLSX(data: any[], options: ExportOptions): Blob {
  const { fields, includeHeaders, includeSummary } = options;

  let xml = '<?xml version="1.0"?>';
  xml += '<?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
  xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"';
  xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  
  // Styles
  xml += '<Styles>';
  xml += '<Style ss:ID="header"><Font ss:Bold="1" ss:Size="12"/></Style>';
  xml += '<Style ss:ID="summary"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/></Style>';
  xml += '</Styles>';
  
  // Worksheet
  xml += '<Worksheet ss:Name="Data">';
  xml += '<Table>';
  
  // Headers
  if (includeHeaders) {
    xml += '<Row>';
    fields.forEach(field => {
      xml += `<Cell><Data ss:Type="String">${formatHeader(field)}</Data></Cell>`;
    });
    xml += '</Row>';
  }
  
  // Data rows
  data.forEach(item => {
    xml += '<Row>';
    fields.forEach(field => {
      const value = getNestedValue(item, field);
      const type = typeof value === 'number' ? 'Number' : 'String';
      xml += `<Cell><Data ss:Type="${type}">${escapeXMLValue(value)}</Data></Cell>`;
    });
    xml += '</Row>';
  });
  
  // Summary row
  if (includeSummary && data.length > 0) {
    xml += '<Row>';
    fields.forEach((field, index) => {
      if (index === 0) {
        xml += `<Cell ss:StyleID="summary"><Data ss:Type="String">Total: ${data.length} records</Data></Cell>`;
      } else {
        xml += '<Cell></Cell>';
      }
    });
    xml += '</Row>';
  }
  
  xml += '</Table></Worksheet></Workbook>';
  
  return new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
}

/**
 * Convert data array to JSON format
 */
export function exportToJSON(data: any[], options: ExportOptions): Blob {
  const { fields, includeSummary } = options;
  
  // Filter to only include specified fields
  const filteredData = data.map(item => {
    const filtered: any = {};
    fields.forEach(field => {
      filtered[field] = getNestedValue(item, field);
    });
    return filtered;
  });
  
  const exportData: any = {
    data: filteredData,
    exportedAt: new Date().toISOString(),
    totalRecords: data.length,
  };
  
  if (includeSummary) {
    exportData.summary = generateSummary(data, fields);
  }
  
  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}

/**
 * Convert data array to PDF format
 * Note: For production PDF generation, consider using libraries like jsPDF or pdfmake
 * This is a simple HTML-based approach that can be printed to PDF
 */
export async function exportToPDF(data: any[], options: ExportOptions): Promise<Blob> {
  const { fields, includeHeaders, includeSummary } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4F46E5; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header { text-align: center; margin-bottom: 20px; }
        .summary { margin-top: 20px; padding: 10px; background-color: #f0f0f0; }
        .timestamp { color: #666; font-size: 10px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Export Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
      <table>
        <thead>
          <tr>
            ${includeHeaders ? fields.map(f => `<th>${formatHeader(f)}</th>`).join('') : ''}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${fields.map(f => `<td>${escapeHTMLValue(getNestedValue(item, f))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${includeSummary ? `
        <div class="summary">
          <h3>Summary</h3>
          <p>Total Records: ${data.length}</p>
          <p>${JSON.stringify(generateSummary(data, fields), null, 2)}</p>
        </div>
      ` : ''}
      <p class="timestamp">Exported from NearZro Admin Dashboard</p>
    </body>
    </html>
  `;
  
  return new Blob([html], { type: 'text/html;charset=utf-8;' });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export async function exportData(data: any[], options: ExportOptions): Promise<Blob> {
  const { format } = options;

  let blob: Blob;

  switch (format) {
    case 'csv':
      blob = exportToCSV(data, options);
      break;
    case 'xlsx':
      blob = exportToXLSX(data, options);
      break;
    case 'json':
      blob = exportToJSON(data, options);
      break;
    case 'pdf':
      blob = await exportToPDF(data, options);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return blob;
}

/**
 * Export with progress tracking
 */
export async function exportDataWithProgress(
  data: any[],
  options: ExportOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const totalSteps = 4;
  let currentStep = 0;
  
  const updateProgress = () => {
    currentStep++;
    const progress = Math.round((currentStep / totalSteps) * 100);
    onProgress?.(progress);
  };
  
  updateProgress();
  
  // Simulate async processing for large datasets
  if (data.length > 1000) {
    await new Promise(resolve => setTimeout(resolve, 100));
    updateProgress();
  }
  
  const blob = await exportData(data, options);
  updateProgress();
  
  updateProgress();
  return blob;
}

// ==================== Helper Functions ====================

function formatHeader(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function escapeXMLValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHTMLValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateSummary(data: any[], fields: string[]): Record<string, any> {
  const summary: Record<string, any> = {
    totalRecords: data.length,
  };
  
  // Calculate numeric field statistics
  fields.forEach(field => {
    const values = data
      .map(item => getNestedValue(item, field))
      .filter(v => typeof v === 'number');
    
    if (values.length > 0) {
      summary[`${field}_sum`] = values.reduce((a, b) => a + b, 0);
      summary[`${field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
      summary[`${field}_min`] = Math.min(...values);
      summary[`${field}_max`] = Math.max(...values);
    }
  });
  
  return summary;
}

/**
 * Hook for export functionality with toast notifications
 */
export async function handleExport(
  data: any[],
  options: ExportOptions,
  showProgress?: (message: string, progress: number) => void,
  showToast?: (type: 'success' | 'error', message: string) => void
): Promise<void> {
  try {
    showProgress?.('Preparing export...', 0);
    
    const blob = await exportDataWithProgress(data, options, (progress) => {
      showProgress?.(`Exporting... ${progress}%`, progress);
    });
    
    const fileName = options.fileName || `export_${new Date().toISOString().split('T')[0]}.${options.format}`;
    downloadBlob(blob, fileName);
    
    showProgress?.('Export complete!', 100);
    showToast?.('success', `Exported ${data.length} records successfully`);
    
    // Clear progress after delay
    setTimeout(() => showProgress?.('', 0), 3000);
  } catch (error: any) {
    console.error('Export failed:', error);
    showToast?.('error', `Export failed: ${error.message}`);
    showProgress?.('', 0);
  }
}
