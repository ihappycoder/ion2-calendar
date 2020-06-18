import { NG_VALUE_ACCESSOR, ControlValueAccessor } from "@angular/forms";
import {
  CalendarInfiniteOptions,
  CalendarComponentPayloadTypes,
  CalendarComponentTypeProperty
} from "./../calendar.model";
import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  Renderer2,
  OnInit,
  Input,
  AfterViewInit,
  EventEmitter,
  Output,
  forwardRef
} from "@angular/core";
import { IonContent } from "@ionic/angular";
import { CalendarDay, CalendarMonth } from "../calendar.model";
import { CalendarService } from "../services/calendar.service";
import * as moment from "moment";
import { pickModes, defaults } from "../config";
import { Provider } from "@angular/core/src/render3/jit/compiler_facade_interface";

const NUM_OF_MONTHS_TO_CREATE = 3;

export const ION_CAL_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CalendarInfiniteComponent),
  multi: true
};

@Component({
  selector: "ion-calendar-infinite",
  providers: [ION_CAL_VALUE_ACCESSOR],
  styleUrls: ["./calendar-infinite.scss"],
  template: /* html */ `
    <ion-content
      (ionScroll)="onScroll($event)"
      class="calendar-page"
      [scrollEvents]="true"
      [ngClass]="{ 'multi-selection': _d.pickMode === 'multi' }"
    >
      <div #months>
        <ng-template
          ngFor
          let-month
          [ngForOf]="calendarMonths"
          [ngForTrackBy]="trackByIndex"
          let-i="index"
        >
          <div class="month-box" [attr.id]="'month-' + i">
            <h4 class="text-center month-title">
              {{ _monthFormat(month.original.date) }}
            </h4>
            <ion-calendar-month
              [month]="month"
              [pickMode]="_d.pickMode"
              [isSaveHistory]="_d.isSaveHistory"
              [id]="_d.id"
              [color]="_d.color"
              (change)="onChange($event)"
              [(ngModel)]="datesTemp"
            >
            </ion-calendar-month>
          </div>
        </ng-template>
      </div>

      <ion-infinite-scroll threshold="25%" (ionInfinite)="nextMonth($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `
})
export class CalendarInfiniteComponent
  implements OnInit, AfterViewInit, ControlValueAccessor {
  @ViewChild(IonContent)
  content: IonContent;
  @ViewChild("months")
  monthsEle: ElementRef;

  @Output()
  change: EventEmitter<CalendarComponentPayloadTypes> = new EventEmitter();

  @Input()
  options: CalendarInfiniteOptions;
  @Input()
  format: string = defaults.DATE_FORMAT;
  @Input()
  type: CalendarComponentTypeProperty = "string";

  datesTemp: Array<CalendarDay> = [null, null];
  calendarMonths: Array<CalendarMonth>;
  step: number;
  showYearPicker: boolean;
  year: number;
  years: Array<number>;
  _scrollLock = true;
  _d: CalendarInfiniteOptions;
  actualFirstTime: number;
  onChangeCallback: any;

  constructor(
    private _renderer: Renderer2,
    public _elementRef: ElementRef,
    public ref: ChangeDetectorRef,
    public calSvc: CalendarService
  ) {}

  ngOnInit(): void {
    this.init();
    this.initDefaultDate();
  }

  ngAfterViewInit(): void {
    this.findCssClass();
    if (this._d.canBackwardsSelected) this.backwardsMonth();
    this.scrollToDefaultDate();
  }

  init(): void {
    this._d = this.calSvc.safeOpt(this.options);
    this._d.showAdjacentMonthDay = false;
    this.step = this._d.step;
    if (this.step < this.calSvc.DEFAULT_STEP) {
      this.step = this.calSvc.DEFAULT_STEP;
    }

    this.calendarMonths = this.calSvc.createMonthsByPeriod(
      moment(this._d.from).valueOf(),
      this.findInitMonthNumber(this._d.defaultScrollTo) + this.step,
      this._d
    );
  }

  initDefaultDate(): void {
    const { pickMode, defaultDate, defaultDateRange, defaultDates } = this._d;
    switch (pickMode) {
      case pickModes.SINGLE:
        if (defaultDate) {
          this.datesTemp[0] = this.calSvc.createCalendarDay(
            this._getDayTime(defaultDate),
            this._d
          );
        }
        break;
      case pickModes.RANGE:
        if (defaultDateRange) {
          if (defaultDateRange.from) {
            this.datesTemp[0] = this.calSvc.createCalendarDay(
              this._getDayTime(defaultDateRange.from),
              this._d
            );
          }
          if (defaultDateRange.to) {
            this.datesTemp[1] = this.calSvc.createCalendarDay(
              this._getDayTime(defaultDateRange.to),
              this._d
            );
          }
        }
        break;
      case pickModes.MULTI:
        if (defaultDates && defaultDates.length) {
          this.datesTemp = defaultDates.map(e =>
            this.calSvc.createCalendarDay(this._getDayTime(e), this._d)
          );
        }
        break;
      default:
        this.datesTemp = [null, null];
    }
  }

  findCssClass(): void {
    const { cssClass } = this._d;
    if (cssClass) {
      cssClass.split(" ").forEach((_class: string) => {
        if (_class.trim() !== "")
          this._renderer.addClass(this._elementRef.nativeElement, _class);
      });
    }
  }

  onChange(data: any): void {
    this.datesTemp = data;
    this.ref.detectChanges();
    this.repaintDOM();
    this.change.emit(data);
    this.onChangeCallback(data);
  }

  writeValue(data: any): void {
    this._writeValue(data);
    if (!data) {
      return;
    }
    this.ref.detectChanges();
    this.repaintDOM();
  }

  _writeValue(value: any): void {
    if (!value) {
      this.datesTemp = [null, null];
      return;
    }
    switch (this._d.pickMode) {
      case "single":
        this.datesTemp[0] = this._createCalendarDay(value);
        break;
      case "range":
        if (value.from) {
          this.datesTemp[0] = value.from
            ? this._createCalendarDay(value.from)
            : null;
        }
        if (value.to) {
          this.datesTemp[1] = value.to
            ? this._createCalendarDay(value.to)
            : null;
        }
        break;
      case "multi":
        if (Array.isArray(value)) {
          this.datesTemp = value.map(e => {
            return this._createCalendarDay(e);
          });
        } else {
          this.datesTemp = [null, null];
        }
        break;
      default:
    }
  }

  _createCalendarDay(value: CalendarComponentPayloadTypes): CalendarDay {
    return this.calSvc.createCalendarDay(
      this._payloadToTimeNumber(value),
      this._d
    );
  }

  _payloadToTimeNumber(value: CalendarComponentPayloadTypes): number {
    let date;
    if (this.type === "string") {
      date = moment(value, this.format);
    } else {
      date = moment(value);
    }
    return date.valueOf();
  }

  registerOnChange(fn: () => {}): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: () => {}): void {
    this.onChangeCallback = fn;
  }

  nextMonth(event: any): void {
    const len = this.calendarMonths.length;
    const final = this.calendarMonths[len - 1];
    const nextTime = moment(final.original.time)
      .add(NUM_OF_MONTHS_TO_CREATE, "M")
      .valueOf();
    const rangeEnd = this._d.to ? moment(this._d.to).subtract(1, "M") : 0;

    if (
      len <= 0 ||
      (rangeEnd !== 0 && moment(final.original.time).isAfter(rangeEnd))
    ) {
      event.target.disabled = true;
      return;
    }

    this.calendarMonths.push(
      ...this.calSvc.createMonthsByPeriod(
        nextTime,
        NUM_OF_MONTHS_TO_CREATE,
        this._d
      )
    );
    event.target.complete();
    this.repaintDOM();
  }

  backwardsMonth(): void {
    const first = this.calendarMonths[0];

    if (first.original.time <= 0) {
      this._d.canBackwardsSelected = false;
      return;
    }

    const firstTime = (this.actualFirstTime = moment(first.original.time)
      .subtract(NUM_OF_MONTHS_TO_CREATE, "M")
      .valueOf());

    this.calendarMonths.unshift(
      ...this.calSvc.createMonthsByPeriod(
        firstTime,
        NUM_OF_MONTHS_TO_CREATE,
        this._d
      )
    );
    this.ref.detectChanges();
    this.repaintDOM();
  }

  scrollToDate(date: Date): void {
    const defaultDateIndex = this.findInitMonthNumber(date);
    const monthElement = this.monthsEle.nativeElement.children[
      `month-${defaultDateIndex}`
    ];
    const domElemReadyWaitTime = 300;

    setTimeout(() => {
      const defaultDateMonth = monthElement ? monthElement.offsetTop : 0;

      if (defaultDateIndex !== -1 && defaultDateMonth !== 0) {
        this.content.scrollByPoint(0, defaultDateMonth, 0);
      }
    }, domElemReadyWaitTime);
  }

  scrollToDefaultDate(): void {
    this.scrollToDate(this._d.defaultScrollTo);
  }

  onScroll($event: any): void {
    if (!this._d.canBackwardsSelected) return;

    const { detail } = $event;

    if (detail.scrollTop <= 200 && detail.velocityY < 0 && this._scrollLock) {
      this.content.getScrollElement().then(scrollElem => {
        this._scrollLock = !1;

        const heightBeforeMonthPrepend = scrollElem.scrollHeight;
        this.backwardsMonth();
        setTimeout(() => {
          const heightAfterMonthPrepend = scrollElem.scrollHeight;

          this.content
            .scrollByPoint(
              0,
              heightAfterMonthPrepend - heightBeforeMonthPrepend,
              0
            )
            .then(() => {
              this._scrollLock = !0;
            });
        }, 180);
      });
    }
  }

  /**
   * In some older Safari versions (observed at Mac's Safari 10.0), there is an issue where style updates to
   * shadowRoot descendants don't cause a browser repaint.
   * See for more details: https://github.com/Polymer/polymer/issues/4701
   */
  repaintDOM() {
    return this.content.getScrollElement().then(scrollElem => {
      // Update scrollElem to ensure that height of the container changes as Months are appended/prepended
      scrollElem.style.zIndex = "2";
      scrollElem.style.zIndex = "initial";
      // Update monthsEle to ensure selected state is reflected when tapping on a day
      this.monthsEle.nativeElement.style.zIndex = "2";
      this.monthsEle.nativeElement.style.zIndex = "initial";
    });
  }

  findInitMonthNumber(date: Date): number {
    let startDate = this.actualFirstTime
      ? moment(this.actualFirstTime)
      : moment(this._d.from);
    const defaultScrollTo = moment(date);
    const isAfter: boolean = defaultScrollTo.isAfter(startDate);
    if (!isAfter) return -1;

    if (this.showYearPicker) {
      startDate = moment(new Date(this.year, 0, 1));
    }

    return defaultScrollTo.diff(startDate, "month");
  }

  _getDayTime(date: any): number {
    return moment(moment(date).format("YYYY-MM-DD")).valueOf();
  }

  _monthFormat(date: any): string {
    return moment(date).format(this._d.monthFormat.replace(/y/g, "Y"));
  }

  trackByIndex(index: number, momentDate: CalendarMonth): number {
    return momentDate.original ? momentDate.original.time : index;
  }
}
