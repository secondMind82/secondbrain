import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import { EntitiesService } from '../../../core/services/entities.service';

import { Entity } from '../../../core/models/entity.model';
import { Timeline } from '../../../core/models/timeline.model';

interface PurchaseItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  purchaseId: string;
}

interface Purchase {
  id: string;
  title: string;
  totalAmount: string | number;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  entityId: string | null;
  items: PurchaseItem[];
}

@Component({
  selector: 'app-entity-profile',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './entity-profile.component.html',
  styleUrls: ['./entity-profile.component.scss'],
})
export class EntityProfileComponent
  implements OnInit {

  private route = inject(
    ActivatedRoute,
  );

  private router = inject(
    Router,
  );

  private entitiesService = inject(
    EntitiesService,
  );

  profile = signal<{
    entity: Entity;

    stats: {
      timelineCount: number;

      firstEvent: string | null;

      lastEvent: string | null;
    };

    timelines: Timeline[];

    purchases: Purchase[];

  } | null>(null);

  isLoading = signal(true);

  ngOnInit(): void {

    const id =
      this.route.snapshot.paramMap.get('id');

    if (!id) {

      this.isLoading.set(false);

      return;

    }

    this.loadProfile(id);

  }

  loadProfile(
    id: string,
  ): void {

    this.entitiesService
      .getEntityProfile(id)
      .subscribe({

        next: profile => {

          this.profile.set(
            profile,
          );

          this.isLoading.set(false);

        },

        error: err => {

          console.error(err);

          this.isLoading.set(false);

        },

      });

  }

  goBack(): void {

    this.router.navigate([
      '/entities',
    ]);

  }

  openTimeline(
    timeline: Timeline,
  ): void {

    this.router.navigate([
      '/timeline',
      timeline.id,
    ]);

  }

  createTimeline(): void {

    this.router.navigate(
      ['/timeline'],
      {
        queryParams: {
          create: true,
          entity: this.profile()?.entity.id,
        },
      },
    );

  }

}