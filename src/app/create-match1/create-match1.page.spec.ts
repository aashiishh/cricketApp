import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CreateMatch1Page } from './create-match1.page';

describe('CreateMatch1Page', () => {
  let component: CreateMatch1Page;
  let fixture: ComponentFixture<CreateMatch1Page>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateMatch1Page ],
      imports: [FormsModule, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateMatch1Page);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
