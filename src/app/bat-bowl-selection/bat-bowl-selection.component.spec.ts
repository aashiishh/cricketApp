import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BatBowlSelectionComponent } from './bat-bowl-selection.component';

describe('BatBowlSelectionComponent', () => {
  let component: BatBowlSelectionComponent;
  let fixture: ComponentFixture<BatBowlSelectionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BatBowlSelectionComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BatBowlSelectionComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
