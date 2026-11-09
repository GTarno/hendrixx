import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { InstallService } from './core/display/install.service';
import { ChordNamingService } from './core/preferences/chord-naming.service';
import { UpdateBannerComponent } from './shared/update-banner/update-banner.component';

@Component({
  imports: [RouterOutlet, RouterLink, UpdateBannerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly naming = inject(ChordNamingService);
  /** Criado já na abertura, para não perder o pedido de instalação do navegador. */
  protected readonly install = inject(InstallService);
}
