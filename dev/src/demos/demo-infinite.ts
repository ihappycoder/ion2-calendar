import { Component } from '@angular/core';

import {
  CalendarInfiniteOptions
} from '../ion2-calendar'

@Component({
  selector: 'demo-infinite-basic',
  template: /* html */`
    <ion-calendar-infinite 
      [options]="options"
      type="string"
      format="YYYY-MM-DD"
      (change)="onChange($event)"
      [(ngModel)]="date"></ion-calendar-infinite>
  `
})
export class DemoInfiniteBasicComponent {

  date: string[] = ['2019-08-01', '2019-08-02', '2019-08-05'];
  options: CalendarInfiniteOptions = {
    pickMode: "multi",
  };

  constructor() {
  }
  onChange(e: any) {
    console.log("CHANGE", e)
    this.date = ['2019-08-01', '2019-08-02', '2019-08-03', '2019-08-04', '2019-08-05'];
  }

}
