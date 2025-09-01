import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import createCsvWriter from 'csv-writer';

export class CsvHandler {
  constructor(options = {}) {
    this.encoding = options.encoding || 'utf8';
  }

  async readUrls(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`URLs file not found: ${filePath}`);
      }

      const urls = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            const url = row.url?.trim();
            if (url && this.isValidUrl(url)) {
              urls.push(url);
            } else if (url) {
              console.warn(`Invalid URL skipped: ${url}`);
            }
          })
          .on('end', () => {
            console.log(`✅ Loaded ${urls.length} URLs from ${filePath}`);
            resolve(urls);
          })
          .on('error', (error) => {
            reject(new Error(`Error reading URLs file: ${error.message}`));
          });
      });
    } catch (error) {
      throw new Error(`Failed to read URLs: ${error.message}`);
    }
  }

  async writeResults(data, outputPath, columns) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('⚠️  No data to write');
        return;
      }

      const header = columns.map(col => ({
        id: col.name,
        title: col.name.replace(/_/g, ' ').toUpperCase()
      }));

      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: outputPath,
        header: header,
        encoding: this.encoding
      });

      await csvWriter.writeRecords(data);
      console.log(`✅ Results saved to ${outputPath} (${data.length} records)`);
      
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to write CSV: ${error.message}`);
    }
  }

  async appendResults(data, outputPath, columns) {
    try {
      const fileExists = fs.existsSync(outputPath);
      
      if (!fileExists) {
        return await this.writeResults(data, outputPath, columns);
      }

      const header = columns.map(col => ({
        id: col.name,
        title: col.name.replace(/_/g, ' ').toUpperCase()
      }));

      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: outputPath,
        header: header,
        append: true,
        encoding: this.encoding
      });

      await csvWriter.writeRecords(data);
      console.log(`✅ Appended ${data.length} records to ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to append to CSV: ${error.message}`);
    }
  }

  createBackup(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = path.dirname(filePath);
      const name = path.basename(filePath, '.csv');
      const backupPath = path.join(dir, `${name}_backup_${timestamp}.csv`);
      
      fs.copyFileSync(filePath, backupPath);
      console.log(`📋 Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error(`Failed to create backup: ${error.message}`);
      return null;
    }
  }

  validateCsvStructure(filePath, requiredColumns = ['url']) {
    return new Promise((resolve, reject) => {
      let headers = [];
      let rowCount = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
        })
        .on('data', () => {
          rowCount++;
        })
        .on('end', () => {
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          resolve({
            headers,
            rowCount,
            isValid: true
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV validation failed: ${error.message}`));
        });
    });
  }

  isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  getStats(data) {
    const stats = {
      total: data.length,
      successful: data.filter(row => row.url && !row.error).length,
      failed: data.filter(row => row.error).length,
      empty: data.filter(row => !row.url).length
    };
    
    stats.successRate = stats.total > 0 ? 
      ((stats.successful / stats.total) * 100).toFixed(2) + '%' : '0%';
      
    return stats;
  }

  logStats(data) {
    const stats = this.getStats(data);
    console.log('\n📊 Scraping Statistics:');
    console.log(`   Total processed: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success rate: ${stats.successRate}`);
    
    if (stats.failed > 0) {
      const failedUrls = data.filter(row => row.error).map(row => row.url);
      console.log('\n❌ Failed URLs:');
      failedUrls.forEach(url => console.log(`   - ${url}`));
    }
  }
}