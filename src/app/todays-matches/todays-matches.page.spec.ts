import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TodaysMatchesPage } from './todays-matches.page';

describe('TodaysMatchesPage', () => {
  let component: TodaysMatchesPage;
  let fixture: ComponentFixture<TodaysMatchesPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TodaysMatchesPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TodaysMatchesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
