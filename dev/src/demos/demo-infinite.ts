import { Component } from '@angular/core';

import {
  CalendarInfiniteOptions
} from '../ion2-calendar'

@Component({
  selector: 'demo-infinite-basic',
  template: /* html */`
    <ion-calendar-infinite [options]="options"></ion-calendar-infinite>
  `
})
export class DemoInfiniteBasicComponent {

  date: Date = new Date();
  options: CalendarInfiniteOptions

  constructor() {
  }

  openCalendar() {
    this.options = {
      defaultDate: this.date
    };
  }

}
