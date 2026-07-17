import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiCallerService } from '../services/api-caller.service';

@Component({
  selector: 'app-pmb-details',
  templateUrl: './pmb-details.component.html',
  styleUrls: ['./pmb-details.component.css'],
  standalone: false,
})
export class PmbDetailsComponent implements OnInit, OnChanges {
  @Input() rowData: any;

  constructor(private api_caller: ApiCallerService) {}

  datFilename: string = '';
  parFilename: string = '';
  row_data: any;
  data: any;
  par: any;
  originalData: any;
  originalPar: any;
  columns: any;

  productCode: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  indexDat: string = '';
  indexPar: string = '';

  chartData: any[] = [];
  chartOptions: any = {};

  calculateFailsPerStep(): void {
    if (!this.data || !this.par) {
      return;
    }

    const failsPerStep: { [key: number]: number } = {};

    this.par.forEach((parRow: any[], index: number) => {
      failsPerStep[index + 1] = 0;
    });

    this.data.forEach((row: any) => {
      if (this.isHeaderRow(row)) {
        return;
      }

      this.columns.forEach((col: string, colIndex: number) => {
        if (colIndex >= 6) {
          const stepNumber = colIndex - 5;
          const value = row[col];

          if (
            value &&
            value !== 'N/A' &&
            !this.isValueInRange(colIndex, value, row)
          ) {
            failsPerStep[stepNumber] = (failsPerStep[stepNumber] || 0) + 1;
          }
        }
      });
    });

    this.chartData = Object.keys(failsPerStep).map((step) => ({
      step: parseInt(step),
      fails: failsPerStep[parseInt(step)],
      stepName: this.getStepName(parseInt(step)),
    }));

    this.setupChartOptions();
  }

  getStepName(stepNumber: number): string {
    const parIndex = stepNumber - 1;
    if (
      this.par &&
      parIndex < this.par.length &&
      this.par[parIndex].length > 4
    ) {
      return this.par[parIndex][4];
    }
    return `Step ${stepNumber}`;
  }

  setupChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Fails per Test Step',
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Test Step Number',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Number of Fails',
          },
          beginAtZero: true,
        },
      },
    };
  }

  updateChart(): void {
    this.calculateFailsPerStep();
    this.testChartData();
  }

  combinedData: any[] = [];

  checkAndUpdateChart(): void {
    if (this.data && this.par) {
      this.updateChart();
    }
  }

  ngOnInit(): void {
    this.loadRowData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData'] && !changes['rowData'].firstChange && this.rowData) {
      this.loadRowData();
    }
  }

  private loadRowData(): void {
    const data = this.rowData;
    if (!data) {
      return;
    }

    this.row_data = data;

    this.productCode = data['Product Code'] || '';
    this.indexDat = data['.dat Number'] || '';
    this.indexPar = data['.par Number'] || '';

    const dashboardDate =
      data['Date'] || data['Last Updated'] || data['Test Date'];
    if (dashboardDate) {
      const parsedDate = this.parseDate(dashboardDate);
      if (parsedDate) {
        this.dateFrom = parsedDate.toISOString().split('T')[0];
        this.dateTo = parsedDate.toISOString().split('T')[0];
      }
    }

    this.datFilename =
      data.Rack +
      '/' +
      data.Module +
      '/data/' +
      data['Product Code'] +
      data['.dat Number'] +
      '.dat';
    this.parFilename =
      data.Rack +
      '/' +
      data.Module +
      '/' +
      data['Product Code'] +
      data['.par Number'] +
      '.par';
    this.get_specific_dat_file();
    this.get_specific_par_file();
  }

  get_specific_dat_file() {
    this.api_caller.get_specific_dat_file(this.datFilename).subscribe(
      (response) => {
        this.originalData = response;
        this.data = response;
        if (response.length > 0) {
          this.columns = Object.keys(response[0]);
        }
        this.checkAndUpdateChart();
      },
      (error) => {
        console.error('Error fetching data:', error);
      }
    );
  }

  get_specific_par_file() {
    this.api_caller.get_specific_dat_file(this.parFilename).subscribe(
      (response) => {
        this.originalPar = response;
        this.par = response;
        this.checkAndUpdateChart();
      },
      (error) => {
        console.error('Error fetching par:', error);
      }
    );
  }

  applyCombinedFilter() {
    if (
      !this.productCode &&
      !this.indexDat &&
      (!this.dateFrom || !this.dateTo)
    ) {
      console.warn('Please fill at least one filter criteria');
      return;
    }

    this.combinedData = [];
    const requests: any[] = [];

    const productCodes = this.productCode
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m);
    const indexDats = this.indexDat
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i);

    const productCodesToProcess =
      productCodes.length > 0 ? productCodes : [this.row_data['Product Code']];
    const indexesToProcess =
      indexDats.length > 0 ? indexDats : [this.row_data['.dat Number']];

    productCodesToProcess.forEach((productCode) => {
      indexesToProcess.forEach((index) => {
        const filename = `${this.row_data.Rack}/${this.row_data.Module}/data/${productCode}${index}.dat`;
        requests.push({
          filename: filename,
          material: productCode,
          index: index,
        });
      });
    });

    let completedRequests = 0;
    const totalRequests = requests.length;
    let allResponses: any[] = [];

    requests.forEach((request) => {
      this.api_caller.get_specific_dat_file(request.filename).subscribe(
        (response) => {
          let filteredResponse = response;
          if (this.dateFrom && this.dateTo) {
            const fromDate = new Date(this.dateFrom);
            const toDate = new Date(this.dateTo);
            toDate.setHours(23, 59, 59, 999);

            filteredResponse = response.filter((row: any) => {
              const rowDate = this.parseDate(row['2']);
              if (!rowDate) return false;
              return rowDate >= fromDate && rowDate <= toDate;
            });
          }

          filteredResponse.forEach((row: any) => {
            const rowDate = this.parseDate(row['2']);
            allResponses.push({
              ...row,
              _material: request.material,
              _index: request.index,
              _source: request.filename,
              _day: rowDate ? rowDate.toISOString().split('T')[0] : 'Unknown',
            });
          });

          completedRequests++;
          if (completedRequests === totalRequests) {
            if (this.dateFrom && this.dateTo) {
              const fullRange = this.generateDateRange(
                this.dateFrom,
                this.dateTo
              );

              fullRange.forEach((day) => {
                const rowsForDay = allResponses.filter((r) => r._day === day);

                if (rowsForDay.length > 0) {
                  this.combinedData.push(...rowsForDay);
                } else {
                  const emptyRow: any = {
                    _day: day,
                    _material: '-',
                    _index: '-',
                    _source: '-',
                  };
                  this.columns?.forEach(
                    (col: string) => (emptyRow[col] = 'N/A')
                  );
                  this.combinedData.push(emptyRow);
                }
              });
            } else {
              this.combinedData = allResponses;
            }

            this.combinedData.sort((a, b) => {
              const dateA = this.parseDate(a._day);
              const dateB = this.parseDate(b._day);
              if (!dateA && !dateB) return 0;
              if (!dateA) return 1;
              if (!dateB) return -1;
              return dateA.getTime() - dateB.getTime();
            });

            if (this.combinedData.length > 0) {
              this.columns = Object.keys(this.combinedData[0]);
              this.data = this.combinedData;
              this.updateChart();
            }
          }
        },
        (error) => {
          console.error('Error fetching data for:', request.filename, error);
          completedRequests++;
        }
      );
    });
  }

  clearCombinedFilter() {
    this.productCode = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.indexDat = '';
    this.data = [...this.originalData];
    this.combinedData = [];
    this.updateChart();
  }

  getInitialValue(key: string): string {
    return this.row_data?.[key] || '';
  }

  getUniqueSources(): number {
    if (!this.combinedData || this.combinedData.length === 0) return 0;
    const sources = new Set(this.combinedData.map((row) => row._source));
    return sources.size;
  }

  getUniqueDays(): number {
    if (!this.combinedData || this.combinedData.length === 0) return 0;
    const days = new Set(this.combinedData.map((row) => row._day));
    return days.size;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(dateString);
    const ddmmyyyy = dateString.match(
      /^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})$/
    );
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1]);
      const month = parseInt(ddmmyyyy[2]) - 1;
      const year = parseInt(ddmmyyyy[3]);
      return new Date(year, month, day);
    }
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private generateDateRange(start: string, end: string): string[] {
    const result: string[] = [];
    const current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      result.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  isHeaderRow(row: any): boolean {
    const firstColumn =
      this.columns && this.columns.length > 0 ? this.columns[0] : null;
    if (firstColumn && row[firstColumn]) {
      return row[firstColumn].toString().includes('#HDR');
    }
    return false;
  }

  isValueInRange(columnIndex: number, value: any, row: any): boolean {
    if (this.isHeaderRow(row)) {
      return true;
    }

    if (!this.par || columnIndex < 6 || !value || value === 'N/A') {
      return true;
    }

    const parIndex = columnIndex - 6;
    if (parIndex >= this.par.length) {
      return true;
    }

    const parRow = this.par[parIndex];
    if (!parRow || parRow.length < 3) {
      return true;
    }

    const minValue = parseFloat(parRow[1]);
    const maxValue = parseFloat(parRow[2]);
    const cellValue = parseFloat(value);

    if (isNaN(minValue) || isNaN(maxValue) || isNaN(cellValue)) {
      return true;
    }

    return cellValue >= minValue && cellValue <= maxValue;
  }

  getRangeInfo(columnIndex: number, row: any): string {
    if (this.isHeaderRow(row)) {
      return '';
    }

    if (!this.par || columnIndex < 6) {
      return '';
    }

    const parIndex = columnIndex - 6;
    if (parIndex >= this.par.length) {
      return '';
    }

    const parRow = this.par[parIndex];
    if (!parRow || parRow.length < 6) {
      return '';
    }

    const minValue = parRow[1];
    const maxValue = parRow[2];
    const unit = parRow[3];
    const description = parRow[5];

    return `${description}\nRange: ${minValue} - ${maxValue} ${unit}`;
  }

  getYAxisTicks(): number[] {
    if (!this.chartData || this.chartData.length === 0) {
      return [0, 1, 2, 3, 4, 5];
    }

    const maxFails = Math.max(...this.chartData.map((item) => item.fails));
    const ticks: number[] = [];
    const step = Math.ceil(maxFails / 5) || 1;

    for (let i = 0; i <= maxFails + step; i += step) {
      ticks.push(i);
    }

    return ticks.reverse();
  }

  getTotalFails(): number {
    if (!this.chartData) {
      return 0;
    }
    return this.chartData.reduce((total, item) => total + item.fails, 0);
  }

  getWorstStep(): string {
    if (!this.chartData || this.chartData.length === 0) {
      return 'N/A';
    }

    const worstStep = this.chartData.reduce((worst, current) =>
      current.fails > worst.fails ? current : worst
    );

    return `Step ${worstStep.step} (${worstStep.fails} fails)`;
  }

  getBarHeight(fails: number): number {
    if (!this.chartData || this.chartData.length === 0) {
      return 5;
    }

    const maxFails = Math.max(...this.chartData.map((item) => item.fails));

    if (maxFails === 0) {
      return 10;
    }

    const maxHeight = 280;
    const height = Math.max((fails / maxFails) * maxHeight, 5);

    return height;
  }

  testChartData(): void {
    if (this.chartData && this.chartData.length > 0) {
      this.chartData.forEach((item) => {
        console.log(
          `Step ${item.step}: ${item.fails} fails (${item.stepName})`
        );
      });
    }
  }
}