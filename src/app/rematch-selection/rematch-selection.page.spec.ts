import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RematchSelectionPage } from './rematch-selection.page';

describe('RematchSelectionPage', () => {
  let component: RematchSelectionPage;
  let fixture: ComponentFixture<RematchSelectionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RematchSelectionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RematchSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
