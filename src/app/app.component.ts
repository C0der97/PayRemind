import { Component } from '@angular/core';
import { MediatorStorageService } from './services/mediator-storage.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private database: MediatorStorageService,
    private settingsService: SettingsService
  ) {
    this.initApp();
  }

  async initApp() {
    // Initialize database connection
    await this.database.initializeConnection();

    // Load categories on startup
    await this.database.loadCategories();

    // Apply saved theme preference
    const settings = this.settingsService.getCurrentSettings();
    this.settingsService.applyTheme(settings.theme);
  }
}
