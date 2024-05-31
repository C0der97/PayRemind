import { Component } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { MediatorStorageService } from './services/mediator-storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private database: MediatorStorageService) {
    this.initApp();
  }

  async initApp(){
    await this.database.initializeConnnection();
  }
}
