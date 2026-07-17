import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { IpsMonitoringComponent } from './ips-monitoring/ips-monitoring.component';
import { PmbDashboardComponent } from './pmb-dashboard/pmb-dashboard.component';
import { PmbDetailsComponent } from './pmb-details/pmb-details.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { HomeComponent } from './home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { apiCallerInterceptor } from './api-caller.interceptor';
import { AccountManagementComponent } from './account-management/account-management.component';

import { MaintenanceComponent } from './maintenance/maintenance.component';
import { NomenclatureComponent } from './nomenclature/nomenclature.component';
import { TestingComponent } from './testing/testing.component';

import { AuthService } from './services/auth.service';
import { AuthGuard } from './services/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    IpsMonitoringComponent,
    PmbDashboardComponent,
    PmbDetailsComponent,
    LoginComponent,
    RegisterComponent,
    UserManagementComponent,
    AccountManagementComponent,
    MaintenanceComponent,
    NomenclatureComponent,
    TestingComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    HomeComponent,
    HttpClientModule,
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: apiCallerInterceptor, multi: true },
    AuthService,
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }