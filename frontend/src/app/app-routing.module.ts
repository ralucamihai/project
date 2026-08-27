import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { IpsMonitoringComponent } from './ips-monitoring/ips-monitoring.component';
import { HomeComponent } from './home/home.component';
import { PmbDashboardComponent } from './pmb-dashboard/pmb-dashboard.component';
import { LoginComponent } from './login/login.component';
import { PmbDetailsComponent } from './pmb-details/pmb-details.component';
import { RegisterComponent } from './register/register.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AccountAdministrationComponent } from './account-administration/account-administration.component';
import { apiCallerGuard } from './api-caller.guard';
import { AuthGuard } from './services/auth.guard';
import { AccountManagementComponent } from './account-management/account-management.component';
import { MaintenanceComponent } from './maintenance/maintenance.component';
import { NomenclatureComponent } from './nomenclature/nomenclature.component';
import { TestingComponent } from './testing/testing.component';
import { CustomerSupportComponent } from './customer-support/customer-support.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [apiCallerGuard] },
  { path: 'ips_monitoring', component: IpsMonitoringComponent, canActivate: [apiCallerGuard] },
  { path: 'pmb_dashboard', component: PmbDashboardComponent, canActivate: [apiCallerGuard] },
  { path: 'pmb_details', component: PmbDetailsComponent, canActivate: [apiCallerGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'user_management',
    component: UserManagementComponent,
    canActivate: [apiCallerGuard],
    data: { requiresAdmin: true }
  },
  { path: 'account_management', component: AccountManagementComponent, canActivate: [apiCallerGuard] },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  { path: 'maintenance', component: MaintenanceComponent, canActivate: [apiCallerGuard] },
  { path: 'nomenclature', component: NomenclatureComponent, canActivate: [apiCallerGuard] },
  { path: 'testing', component: TestingComponent, canActivate: [apiCallerGuard] },
  { path: 'customer_support', component: CustomerSupportComponent, canActivate: [apiCallerGuard] },

  { path: '**', redirectTo: '/login' } // ÎNTOTDEAUNA ULTIMA rută din array
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }