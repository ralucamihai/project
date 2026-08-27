import { Component, OnInit } from '@angular/core';
import { ApiCallerService } from '../services/api-caller.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ips-monitoring',
  templateUrl: './ips-monitoring.component.html',
  styleUrls: ['./ips-monitoring.component.css'], 
  standalone: false,
})
export class IpsMonitoringComponent implements OnInit {
  data: any[] = [];
  allColumns: string[] = [];
  displayedColumns: string[] = ['Title', 'PM Number', 'verificat VPN', 'network active', 'Linia', 'Sectia'];
  sortedData: any[] = [];
  sortColumn: string = '';
  sortDirection: boolean = false; 
  selectedRowIndex: number | null = null; // indexul rândului selectat

  constructor(private api_caller: ApiCallerService, private router: Router) { }

  ngOnInit(): void {
    this.api_caller.get_devices_data().subscribe(response => {
      this.data = response;
      this.sortedData = [...this.data];

      if (response.length > 0) {
        this.allColumns = Object.keys(response[0]);
      }
    });
  }

  onCheckboxChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const value = checkbox.value;
    if (checkbox.checked) {
      if (!this.displayedColumns.includes(value)) {
        this.displayedColumns.push(value);
      }
    } else {
      this.displayedColumns = this.displayedColumns.filter(col => col !== value);
    }
  }

  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = !this.sortDirection;
    } else {
      this.sortColumn = column;
      this.sortDirection = false;
    }

    this.sortedData = [...this.data].sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
      } else if (valueA instanceof Date && valueB instanceof Date) {
        return this.sortDirection ? valueB.getTime() - valueA.getTime() : valueA.getTime() - valueB.getTime();
      } else if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        return this.sortDirection
          ? (valueB === valueA ? 0 : valueB ? -1 : 1)
          : (valueA === valueB ? 0 : valueA ? -1 : 1);
      } else {
        return this.sortDirection ? valueB - valueA : valueA - valueB;
      }
    });
  }


  selectRow(index: number) {
    if (this.selectedRowIndex === index) {
      this.selectedRowIndex = null; // deselect
    } else {
      this.selectedRowIndex = index;
    }
  }
}
