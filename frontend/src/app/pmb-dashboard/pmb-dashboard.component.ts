import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiCallerService } from '../services/api-caller.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/web-socket.service';
import { Subscription } from 'rxjs';

type DateRangeType = 'current_day' | 'current_month' | 'all_dates' | 'custom_dates';
type RowData = Record<string, any>;

@Component({
  selector: 'app-pmb-dashboard',
  templateUrl: './pmb-dashboard.component.html',
  styleUrls: ['./pmb-dashboard.component.css'],
  standalone: false,
})
export class PmbDashboardComponent implements OnInit, OnDestroy {
  data: RowData[] = [];
  allColumns: string[] = [];
  displayedColumns: string[] = [];
  sortedData: RowData[] = [];

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  columnFilters: Record<string, string[]> = {};
  filterSearchText: Record<string, string> = {};
  filteredOptions: Record<string, any[]> = {};
  showDropdown: Record<string, boolean> = {};

  FPY_interval_high = 96;
  FPY_interval_low = 85;
  SPY_interval_high = 95;
  SPY_interval_low = 90;

  messageSubscription?: Subscription;

  selectedStartDate = '';
  selectedEndDate = '';
  selectedProductCode = '';

  availableDates: string[] = [];
  availableEndDates: string[] = [];
  availableStartDates: string[] = [];
  availableProductCodes: string[] = [];

  selectedRow: RowData | null = null;
  sidebarOpen = false;

  // ✅ default = current day
  selectedDateRangeType: DateRangeType = 'current_day';

  // Column resize
  columnWidths: Record<string, number> = {};
  readonly defaultColumnWidth = 80;
  private resizingCol: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  // Local storage keys
  private readonly STORAGE_START_DATE_KEY = 'pmb_dashboard_selected_start_date';
  private readonly STORAGE_END_DATE_KEY = 'pmb_dashboard_selected_end_date';
  private readonly STORAGE_PRODUCT_CODE_KEY = 'pmb_dashboard_selected_product_code';
  private readonly STORAGE_DATE_RANGE_TYPE_KEY = 'pmb_dashboard_date_range_type';
  private readonly STORAGE_COLUMN_FILTERS_KEY = 'pmb_dashboard_column_filters';
  private readonly STORAGE_COLUMN_WIDTHS_KEY = 'pmb_dashboard_column_widths';

  // Stable refs for add/removeEventListener
  private readonly outsideClickHandler = (event: MouseEvent) => this.handleOutsideClick(event);
  private readonly resizeMoveHandler = (event: MouseEvent) => this.onResizeMouseMove(event);
  private readonly resizeUpHandler = () => this.onResizeMouseUp();

  constructor(
    private api_caller: ApiCallerService,
    private router: Router,
    private wsService: WebSocketService,
  ) { }

  ngOnInit(): void {
    this.loadSavedState();

    this.wsService.connect();
    this.getPmbDashboardLimits();
    this.getAvailableDates();
    this.getAvailableProductCodes();

    this.messageSubscription = this.wsService.messages$.subscribe((message) => {
      if (message === 'pmb_dashboard_data_updated') {
        this.getPmbDashboardData();
      }
    });

    document.addEventListener('click', this.outsideClickHandler);
  }

  ngOnDestroy(): void {
    this.messageSubscription?.unsubscribe();
    this.wsService.disconnect();

    document.removeEventListener('click', this.outsideClickHandler);
    document.removeEventListener('mousemove', this.resizeMoveHandler);
    document.removeEventListener('mouseup', this.resizeUpHandler);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getPmbDashboardData(date?: string): void {
    const targetStartDate = date ?? this.selectedStartDate;
    const targetEndDate = date ?? this.selectedEndDate;
    const targetProductCode = this.selectedProductCode;

    this.api_caller
      .get_global_lp_data(targetStartDate, targetEndDate, targetProductCode)
      .subscribe((response: any) => {
        this.data = response?.data ?? response ?? [];
        this.initializeColumnsAndFilters();
        this.applyFilters(); // keeps filter selections active after refresh
      });
  }

  getAvailableDates(): void {
    this.api_caller.get_available_dates().subscribe((response: string[]) => {
      this.availableDates = response ?? [];
      this.availableStartDates = [...this.availableDates];
      this.availableEndDates = [...this.availableDates];

      // If nothing saved, use default current day
      if (!this.selectedStartDate && !this.selectedEndDate) {
        this.setDateRangeBasedOnType();
        this.saveDateToStorage();
        this.saveDateRangeTypeToStorage();
      }

      this.rebuildCustomDateLists();
      this.getPmbDashboardData();
    });
  }

  getAvailableProductCodes(): void {
    this.api_caller.get_available_product_codes().subscribe((response: string[]) => {
      this.availableProductCodes = response ?? [];

      // If saved product code no longer exists, clear it
      if (
        this.selectedProductCode &&
        !this.availableProductCodes.includes(this.selectedProductCode)
      ) {
        this.selectedProductCode = '';
        this.saveProductCodeToStorage();
      }

      this.getPmbDashboardData();
    });
  }

  getPmbDashboardLimits(): void {
    this.api_caller.get_pmb_dashboard_limits().subscribe((response: any) => {
      this.FPY_interval_high = response?.fpy_interval_high ?? this.FPY_interval_high;
      this.FPY_interval_low = response?.fpy_interval_low ?? this.FPY_interval_low;
      this.SPY_interval_high = response?.spy_interval_high ?? this.SPY_interval_high;
      this.SPY_interval_low = response?.spy_interval_low ?? this.SPY_interval_low;
    });
  }

  onDateRangeTypeChange(event: Event | string): void {
    const selectedValue = typeof event === 'string'
      ? event
      : (event.target as HTMLSelectElement)?.value;

    this.selectedDateRangeType = (selectedValue as DateRangeType) || 'current_day';

    if (this.selectedDateRangeType !== 'custom_dates') {
      this.setDateRangeBasedOnType();
    } else if (!this.selectedStartDate || !this.selectedEndDate) {
      this.initializeCustomDates();
    }

    this.rebuildCustomDateLists();
    this.saveDateRangeTypeToStorage();
    this.saveDateToStorage();
    this.getPmbDashboardData();
  }

  onStartDateChange(event: Event | string): void {
    this.selectedStartDate =
      typeof event === 'string' ? event : (event.target as HTMLSelectElement)?.value ?? '';

    // Keep end date >= start date
    if (this.selectedEndDate && this.selectedStartDate && this.selectedEndDate < this.selectedStartDate) {
      this.selectedEndDate = this.selectedStartDate;
    }

    this.rebuildCustomDateLists();
    this.saveDateToStorage();
    this.getPmbDashboardData();
  }

  onEndDateChange(event: Event | string): void {
    this.selectedEndDate =
      typeof event === 'string' ? event : (event.target as HTMLSelectElement)?.value ?? '';

    // Keep start date <= end date
    if (this.selectedStartDate && this.selectedEndDate && this.selectedStartDate > this.selectedEndDate) {
      this.selectedStartDate = this.selectedEndDate;
    }

    this.rebuildCustomDateLists();
    this.saveDateToStorage();
    this.getPmbDashboardData();
  }

  onProductCodeChange(event: Event | string): void {
    this.selectedProductCode =
      typeof event === 'string' ? event : (event.target as HTMLInputElement)?.value ?? '';

    this.saveProductCodeToStorage();
    this.getPmbDashboardData();
  }

  loadAllData(): void {
    this.selectedDateRangeType = 'all_dates';
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedProductCode = '';

    this.saveDateRangeTypeToStorage();
    this.saveDateToStorage();
    this.saveProductCodeToStorage();

    this.getPmbDashboardData();
  }

  sortData(col: string): void {
    if (this.sortColumn === col) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }

    this.sortedData = [...this.sortedData].sort((a, b) => {
      const valA = a[col];
      const valB = b[col];

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      const aNum = Number(valA);
      const bNum = Number(valB);
      const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);

      if (bothNumeric) {
        return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(valA).toLowerCase();
      const bStr = String(valB).toLowerCase();
      if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  applyFilters(): void {
    this.sortedData = this.data.filter((row) =>
      this.displayedColumns.every((col) => {
        const selectedFilters = this.columnFilters[col];
        if (!selectedFilters?.length) return true;

        const cellVal = row[col];
        return selectedFilters.some(
          (filter) => String(cellVal).toLowerCase() === String(filter).toLowerCase(),
        );
      }),
    );

    // Reapply sort after filtering
    if (this.sortColumn) {
      const currentCol = this.sortColumn;
      const currentDirection = this.sortDirection;
      this.sortColumn = '';
      this.sortDirection = currentDirection;
      this.sortData(currentCol);
    }
  }

  getUniqueValues(column: string): any[] {
    return Array.from(
      new Set(this.data.map((row) => row[column]).filter((val) => val !== null && val !== undefined)),
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
  }

  toggleDropdown(col: string, event: Event): void {
    event.stopPropagation();

    Object.keys(this.showDropdown).forEach((key) => {
      if (key !== col) this.showDropdown[key] = false;
    });

    this.showDropdown[col] = !this.showDropdown[col];
    if (this.showDropdown[col]) this.updateFilteredOptions(col);
  }

  onSearchInput(col: string, event: Event): void {
    event.stopPropagation();
    const inputValue = (event.target as HTMLInputElement)?.value ?? '';
    this.filterSearchText[col] = inputValue;
    this.updateFilteredOptions(col);
    this.showDropdown[col] = true;
  }

  updateFilteredOptions(col: string): void {
    const searchText = (this.filterSearchText[col] ?? '').toLowerCase();
    const allOptions = this.getUniqueValues(col);

    this.filteredOptions[col] = !searchText
      ? allOptions
      : allOptions.filter((option) => String(option).toLowerCase().includes(searchText));
  }

  toggleOption(col: string, option: any, event: Event): void {
    event.stopPropagation();

    if (!this.columnFilters[col]) this.columnFilters[col] = [];
    const index = this.columnFilters[col].indexOf(option);

    if (index === -1) this.columnFilters[col].push(option);
    else this.columnFilters[col].splice(index, 1);

    this.saveColumnFiltersToStorage();
    this.applyFilters();
  }

  isOptionSelected(col: string, option: any): boolean {
    return (this.columnFilters[col] ?? []).includes(option);
  }

  clearSelections(col: string, event: Event): void {
    event.stopPropagation();
    this.columnFilters[col] = [];
    this.filterSearchText[col] = '';
    this.updateFilteredOptions(col);
    this.saveColumnFiltersToStorage();
    this.applyFilters();
  }

  closeAllDropdowns(): void {
    Object.keys(this.showDropdown).forEach((key) => (this.showDropdown[key] = false));
  }

  getFilterDisplayText(col: string): string {
    const selections = this.columnFilters[col] ?? [];
    if (!selections.length) return `All ${col}`;
    if (selections.length === 1) return String(selections[0]);
    return `${selections.length} selected`;
  }

  selectRow(row: RowData): void {
    this.selectedRow = row;
  }

  isRowSelected(row: RowData): boolean {
    return this.selectedRow === row;
  }

  goToDetails(row: RowData): void {
    this.router.navigate(['/pmb_details'], { state: { data: row } });
  }

  getCellClass(col: string, value: any): string {
    const n = Number(value);
    if (Number.isNaN(n)) return '';

    if (col === 'FPY') {
      if (n >= this.FPY_interval_high) return 'green-background';
      if (n > this.FPY_interval_low) return 'yellow-background';
      return 'red-background';
    }

    if (col === 'SPY') {
      if (n >= this.SPY_interval_high) return 'green-background';
      if (n > this.SPY_interval_low) return 'yellow-background';
      return 'red-background';
    }

    return '';
  }

  // -----------------------
  // Column resizing
  // -----------------------
  startResize(event: MouseEvent, col: string): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizingCol = col;
    this.resizeStartX = event.pageX;
    this.resizeStartWidth = this.columnWidths[col] ?? this.defaultColumnWidth;

    document.addEventListener('mousemove', this.resizeMoveHandler);
    document.addEventListener('mouseup', this.resizeUpHandler);
  }

  private onResizeMouseMove(event: MouseEvent): void {
    if (!this.resizingCol) return;
    const delta = event.pageX - this.resizeStartX;
    const newWidth = Math.max(80, this.resizeStartWidth + delta);
    this.columnWidths[this.resizingCol] = newWidth;
  }

  private onResizeMouseUp(): void {
    if (this.resizingCol) this.saveColumnWidthsToStorage();
    this.resizingCol = null;

    document.removeEventListener('mousemove', this.resizeMoveHandler);
    document.removeEventListener('mouseup', this.resizeUpHandler);
  }

  private handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-wrapper')) this.closeAllDropdowns();
  }

  // -----------------------
  // Date helpers
  // -----------------------
  private getStartEndDatesByDateRange(type: DateRangeType): { start_date: string; end_date: string } {
    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];

    switch (type) {
      case 'current_day':
        return { start_date: currentDateStr, end_date: currentDateStr };

      case 'current_month': {
        const y = today.getFullYear();
        const m = today.getMonth();
        const first = new Date(y, m, 1).toISOString().split('T')[0];
        const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
        return { start_date: first, end_date: last };
      }

      case 'all_dates':
        return { start_date: '', end_date: '' };

      case 'custom_dates':
      default:
        return { start_date: this.selectedStartDate, end_date: this.selectedEndDate };
    }
  }

  private setDateRangeBasedOnType(): void {
    const { start_date, end_date } = this.getStartEndDatesByDateRange(this.selectedDateRangeType);
    this.selectedStartDate = start_date;
    this.selectedEndDate = end_date;

    if (this.selectedDateRangeType === 'custom_dates') {
      this.initializeCustomDates();
    }
  }

  private initializeCustomDates(): void {
    if (!this.availableDates.length) return;
    this.selectedStartDate = this.selectedStartDate || this.availableDates[0];
    this.selectedEndDate = this.selectedEndDate || this.availableDates[this.availableDates.length - 1];
  }

  private rebuildCustomDateLists(): void {
    this.availableStartDates = this.availableDates.filter(
      (date) => !this.selectedEndDate || date <= this.selectedEndDate,
    );

    this.availableEndDates = this.availableDates.filter(
      (date) => !this.selectedStartDate || date >= this.selectedStartDate,
    );
  }

  // -----------------------
  // Initialization helpers
  // -----------------------
  private initializeColumnsAndFilters(): void {
    if (!this.data.length) {
      this.allColumns = [];
      this.displayedColumns = [];
      this.sortedData = [];
      return;
    }

    this.allColumns = Object.keys(this.data[0]);
    this.displayedColumns = [...this.allColumns];

    this.displayedColumns.forEach((col) => {
      if (!this.columnFilters[col]) this.columnFilters[col] = [];
      if (!this.filterSearchText[col]) this.filterSearchText[col] = '';
      if (typeof this.showDropdown[col] !== 'boolean') this.showDropdown[col] = false;
      this.filteredOptions[col] = this.getUniqueValues(col);

      if (!this.columnWidths[col]) this.columnWidths[col] = this.defaultColumnWidth;
    });
  }

  private loadSavedState(): void {
    this.loadSavedDateAndProductCode();
    this.loadColumnFiltersFromStorage();
    this.loadColumnWidthsFromStorage();
  }

  private loadSavedDateAndProductCode(): void {
    try {
      const savedStartDate = localStorage.getItem(this.STORAGE_START_DATE_KEY);
      const savedEndDate = localStorage.getItem(this.STORAGE_END_DATE_KEY);
      const savedProductCode = localStorage.getItem(this.STORAGE_PRODUCT_CODE_KEY);
      const savedDateRangeType = localStorage.getItem(this.STORAGE_DATE_RANGE_TYPE_KEY);

      if (savedDateRangeType) {
        this.selectedDateRangeType = savedDateRangeType as DateRangeType;
      } else {
        this.selectedDateRangeType = 'current_day';
      }

      if (savedStartDate !== null) this.selectedStartDate = savedStartDate;
      if (savedEndDate !== null) this.selectedEndDate = savedEndDate;
      if (savedProductCode !== null) this.selectedProductCode = savedProductCode;
    } catch (error) {
      console.warn('Failed to load saved dashboard filters:', error);
    }
  }

  private saveDateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_START_DATE_KEY, this.selectedStartDate);
      localStorage.setItem(this.STORAGE_END_DATE_KEY, this.selectedEndDate);
    } catch (error) {
      console.warn('Failed to save dates to localStorage:', error);
    }
  }

  private saveDateRangeTypeToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_DATE_RANGE_TYPE_KEY, this.selectedDateRangeType);
    } catch (error) {
      console.warn('Failed to save date range type to localStorage:', error);
    }
  }

  private saveProductCodeToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_PRODUCT_CODE_KEY, this.selectedProductCode);
    } catch (error) {
      console.warn('Failed to save product code to localStorage:', error);
    }
  }

  private saveColumnFiltersToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_COLUMN_FILTERS_KEY, JSON.stringify(this.columnFilters));
    } catch (error) {
      console.warn('Failed to save column filters to localStorage:', error);
    }
  }

  private loadColumnFiltersFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_COLUMN_FILTERS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') this.columnFilters = parsed;
    } catch (error) {
      console.warn('Failed to load column filters from localStorage:', error);
    }
  }

  private saveColumnWidthsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_COLUMN_WIDTHS_KEY, JSON.stringify(this.columnWidths));
    } catch (error) {
      console.warn('Failed to save column widths to localStorage:', error);
    }
  }

  private loadColumnWidthsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_COLUMN_WIDTHS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') this.columnWidths = parsed;
    } catch (error) {
      console.warn('Failed to load column widths from localStorage:', error);
    }
  }
}