import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CreateMatch1Page } from './create-match1.page';

describe('CreateMatch1Page', () => {
  let component: CreateMatch1Page;
  let fixture: ComponentFixture<CreateMatch1Page>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateMatch1Page ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateMatch1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
