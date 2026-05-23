import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddPlayerComponent } from './add-player.component';

describe('AddPlayerComponent', () => {
  let component: AddPlayerComponent;
  let fixture: ComponentFixture<AddPlayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddPlayerComponent ],
      imports: [FormsModule, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddPlayerComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
