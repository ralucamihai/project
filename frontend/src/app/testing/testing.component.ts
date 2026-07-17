import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-testing',
  templateUrl: './testing.component.html',
  styleUrl: './testing.component.css',
  standalone: false
})
export class TestingComponent implements OnInit {

  activeTab: string = 'pmb_dashboard';
  selectedRow: any = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'pmb_dashboard';
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onRowSelected(row: any) {
    this.selectedRow = row;
    this.setTab('pmb_details');
  }
}