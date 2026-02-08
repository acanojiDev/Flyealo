import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RutaGenerada } from './ruta-generada';

describe('RutaGenerada', () => {
  let component: RutaGenerada;
  let fixture: ComponentFixture<RutaGenerada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RutaGenerada]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RutaGenerada);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
