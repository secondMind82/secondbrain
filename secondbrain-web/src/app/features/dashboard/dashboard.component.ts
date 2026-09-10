import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PurchasesService } from '../../core/services/purchases.service';

import { EntitiesService } from '../../core/services/entities.service';
import { Entity } from '../../core/models/entity.model';

import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TimelineService } from '../../core/services/timeline.service';
import {
  AiService,
  MindIntent,
  SmartCaptureResult,
  PurchaseItemPreview,
} from '../../core/services/ai.service';

import { DashboardResponse } from '../../core/models/dashboard.model';
import { Timeline } from '../../core/models/timeline.model';

import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { QuickActionCardComponent } from '../../shared/components/quick-action-card/quick-action-card.component';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';

import {
  UpcomingEventsComponent,
  UpcomingEvent
} from '../../shared/components/upcoming-events/upcoming-events.component';


// ================================
// Intent / Category
// ================================

// ================================
// Purchase Preview Models
// ================================

interface PurchasePreview {
  title: string;
  items: PurchaseItemPreview[];
  totalAmount: number;
}


@Component({
  selector: 'app-dashboard',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    StatCardComponent,
    QuickActionCardComponent,
    ActivityTimelineComponent,
    UpcomingEventsComponent
  ],

  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private timelineService = inject(TimelineService);
  private entitiesService = inject(EntitiesService);
  private purchasesService = inject(PurchasesService);
  private aiService = inject(AiService);

  router = inject(Router);


  // ================================
  // User
  // ================================

  currentUser = this.authService.currentUser;


  // ================================
  // Dashboard State
  // ================================

  dashboard = signal<DashboardResponse | null>(null);
  isLoading = signal(false);

  timelines = signal<Timeline[]>([]);
  entities = signal<Entity[]>([]);


  // ================================
  // Smart Search
  // ================================

  mindQuery = '';

  entitySuggestions = signal<Entity[]>([]);
  showEntitySuggestions = signal(false);
  isSearchingEntities = signal(false);

  selectedEntity = signal<Entity | null>(null);


  // ================================
  // AI / Intent State
  // ================================

  detectedIntent = signal<MindIntent>('UNKNOWN');
  detectedResult = signal<SmartCaptureResult | null>(null);
  isDetectingIntent = signal(false);


  // ================================
  // Purchase Preview
  // ================================

  purchasePreview =
    signal<PurchasePreview | null>(null);

  showPurchasePreview =
    signal(false);


  // ================================
  // Lifecycle
  // ================================

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUpcomingEvents();
    this.loadEntities();
  }


  // ================================
  // Dashboard
  // ================================

  loadDashboard(): void {
    this.isLoading.set(true);

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
        this.dashboard.set(response);
        this.isLoading.set(false);
      },

      error: (error) => {
        console.error(
          'Dashboard loading error:',
          error
        );

        this.isLoading.set(false);
      }
    });
  }


  // ================================
  // Entities
  // ================================

  loadEntities(): void {
    this.entitiesService.getEntities().subscribe({
      next: (entities) => {
        this.entities.set(entities);
      },

      error: (error) => {
        console.error(
          'Failed to load entities:',
          error
        );

        this.entities.set([]);
      }
    });
  }


  viewEntity(entity: Entity): void {
    this.router.navigate([
      '/entities',
      entity.id
    ]);
  }


  // ================================
  // Timeline
  // ================================

  loadUpcomingEvents(): void {
    this.timelineService.getTimelines().subscribe({
      next: (response) => {
        console.log(
          'Timeline events:',
          response
        );

        this.timelines.set(response);
      },

      error: (error) => {
        console.error(
          'Failed to load timeline events:',
          error
        );

        this.timelines.set([]);
      }
    });
  }


  // ================================
  // Smart Search + Intent Detection
  // ================================

  onMindInput(): void {

    const value = this.mindQuery.trim();


    // --------------------------------
    // Existing Entity Search
    // --------------------------------

    if (
      value.startsWith('@') &&
      !this.selectedEntity()
    ) {

      const search =
        value.substring(1).trim();


      if (!search) {
        this.entitySuggestions.set([]);
        this.showEntitySuggestions.set(false);
        this.detectedIntent.set('UNKNOWN');
        this.detectedResult.set(null);
        this.isDetectingIntent.set(false);
        this.clearIntentTimer();
        return;
      }


      this.showEntitySuggestions.set(true);
      this.isSearchingEntities.set(true);


      this.entitiesService
        .getEntities(search)
        .subscribe({

          next: (entities) => {

            this.entitySuggestions.set(
              entities
            );

            this.isSearchingEntities.set(
              false
            );
          },

          error: (error) => {

            console.error(
              'Entity search failed:',
              error
            );

            this.entitySuggestions.set([]);
            this.isSearchingEntities.set(
              false
            );
          }
        });


      return;
    }


    // --------------------------------
    // Normal Natural Language Input
    // --------------------------------

    this.entitySuggestions.set([]);
    this.showEntitySuggestions.set(false);


    if (!value) {
      this.detectedIntent.set('UNKNOWN');
      this.detectedResult.set(null);
      this.isDetectingIntent.set(false);
      return;
    }


    // Debounce + use AI to detect intent
    this.isDetectingIntent.set(true);
    this.clearIntentTimer();

    this.intentTimer = setTimeout(() => {
      this.aiService
        .smartCapture(
          value,
          this.selectedEntity()?.name ?? undefined,
        )
        .subscribe({
          next: (result) => {
            this.detectedResult.set(result);
            this.detectedIntent.set(result.intent);
            this.isDetectingIntent.set(false);
          },
          error: (error) => {
            console.error('AI intent detection failed:', error);
            this.detectedIntent.set('UNKNOWN');
            this.detectedResult.set(null);
            this.isDetectingIntent.set(false);
          },
        });
    }, 400);
  }


  // ================================
  // Intent Detection (AI)
  // ================================

  private intentTimer: any = null;

  private clearIntentTimer(): void {
    if (this.intentTimer) {
      clearTimeout(this.intentTimer);
      this.intentTimer = null;
    }
  }


  // ================================
  // Select Entity
  // ================================

  selectEntity(entity: Entity): void {

    this.selectedEntity.set(entity);

    this.showEntitySuggestions.set(false);
    this.entitySuggestions.set([]);

    this.mindQuery = '';

    this.detectedIntent.set('UNKNOWN');
    this.detectedResult.set(null);
    this.isDetectingIntent.set(false);
    this.clearIntentTimer();
  }


  // ================================
  // Save Mind Entry
  // ================================

  saveMindEntry(): void {

    const input =
      this.mindQuery.trim();


    if (!input) {
      return;
    }


    // --------------------------------
    // Purchase Flow (AI-detected)
    // --------------------------------

    const result = this.detectedResult();
    const intent = result?.intent ?? 'UNKNOWN';


    if (intent === 'PURCHASE') {

      const items = result?.purchaseItems;

      const preview =
        items && items.length
          ? {
              title:
                result.title || 'Purchase',
              items,
              totalAmount: items.reduce(
                (total, item) =>
                  total + item.price * item.quantity,
                0,
              ),
            }
          : this.parsePurchaseInput(input);


      if (preview) {

        this.purchasePreview.set(
          preview
        );

        this.showPurchasePreview.set(
          true
        );

        this.detectedIntent.set(
          'PURCHASE'
        );

        return;
      }


      console.warn(
        'Could not understand purchase input.'
      );

      return;
    }


    // --------------------------------
    // Existing Timeline Flow
    // --------------------------------

    this.timelineService
      .quickCapture(
        input,
        this.selectedEntity()?.id ?? ''
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Quick capture successful:',
            response
          );


          this.mindQuery = '';

          this.selectedEntity.set(null);

          this.entitySuggestions.set([]);

          this.showEntitySuggestions.set(
            false
          );

          this.detectedIntent.set(
            'UNKNOWN'
          );

          this.detectedResult.set(null);
          this.isDetectingIntent.set(false);
          this.clearIntentTimer();


          this.loadUpcomingEvents();
          this.loadDashboard();
          this.loadEntities();
        },


        error: (error) => {

          console.error(
            'Quick capture failed:',
            error
          );
        }
      });
  }


  // ================================
  // Purchase Parser
  // ================================
private parsePurchaseInput(input: string): PurchasePreview | null {
  const cleaned = input
    .replace(
      /^.*?\b(purchased|purchase|bought|buy|buying)\b/i,
      '',
    )
    .trim();

  /*
   * Supports:
   * earbuds 15000 macbook 40000
   * MacBook for 85000, AirPods for 18000 and Keyboard for 5000
   * iPhone 17 90000 AirPods Max 55000 Nike shoes 12000
   */

  const items: PurchaseItemPreview[] = [];

  const pricePattern =
    /(.+?)(?:\s+for)?\s+₹?\s*([\d,]+(?:\.\d+)?)(?=\s+(?:and\s+)?[A-Za-z₹]|$)/gi;

  let match: RegExpExecArray | null;

  while ((match = pricePattern.exec(cleaned)) !== null) {
    const name = match[1]
      .replace(/,\s*$/, '')
      .replace(/\s+and\s*$/i, '')
      .trim();

    const price = Number(
      match[2].replace(/,/g, ''),
    );

    if (!name || Number.isNaN(price)) {
      continue;
    }

    items.push({
      name,
      price,
      quantity: 1,
    });
  }

  if (!items.length) {
    return null;
  }

  const totalAmount = items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0,
  );

  return {
    title: 'Purchase',
    items,
    totalAmount,
  };
}
  // ================================
  // Cancel Purchase Preview
  // ================================

  cancelPurchase(): void {

    this.purchasePreview.set(null);

    this.showPurchasePreview.set(false);

    this.detectedIntent.set('UNKNOWN');
    this.detectedResult.set(null);
    this.isDetectingIntent.set(false);
    this.clearIntentTimer();
  }
  confirmPurchase(): void {
  const preview = this.purchasePreview();
  const entity = this.selectedEntity();

  if (!preview) {
    return;
  }

  if (!entity) {
    console.warn('No entity selected for purchase.');
    return;
  }

  this.purchasesService
    .createPurchase({
      title: preview.title,
      entityId: entity.id,
      items: preview.items,
    })
    .subscribe({
      next: (response) => {
        console.log('Purchase saved successfully:', response);

        // Clear temporary preview
        this.purchasePreview.set(null);
        this.showPurchasePreview.set(false);
        this.selectedEntity.set(null);
        this.mindQuery = '';
        this.detectedIntent.set('UNKNOWN');
        this.detectedResult.set(null);
        this.isDetectingIntent.set(false);
        this.clearIntentTimer();

        // Refresh dashboard data
        this.loadDashboard();
        this.loadEntities();
      },

      error: (error) => {
        console.error('Purchase save failed:', error);
      },
    });
}


  // ================================
  // Greeting
  // ================================

  greeting = computed(() => {

    const hour =
      new Date().getHours();


    if (hour < 12) {
      return 'Good Morning';
    }


    if (hour < 17) {
      return 'Good Afternoon';
    }


    return 'Good Evening';
  });


  // ================================
  // Stats
  // ================================

  stats = computed(() => {

    const data =
      this.dashboard();


    return [
      {
        title: 'Notes',
        value:
          data?.stats.totalNotes ?? 0,
        icon: 'description',
        subtitle: 'Total Notes',
        color: '#6366F1'
      },

      {
        title: 'Pinned',
        value:
          data?.stats.pinnedNotes ?? 0,
        icon: 'push_pin',
        subtitle: 'Pinned Notes',
        color: '#EC4899'
      },

      {
        title: 'Categories',
        value:
          data?.stats.categories ?? 0,
        icon: 'category',
        subtitle: 'Categories',
        color: '#0EA5E9'
      },

      {
        title: 'Events',
        value:
          this.timelines().length,
        icon: 'event',
        subtitle: 'Calendar Events',
        color: '#F59E0B'
      }
    ];
  });


  // ================================
  // Upcoming Events
  // ================================

  upcomingEvents =
    computed<UpcomingEvent[]>(() => {

      const now =
        new Date();


      return this.timelines()

        .filter((event) => {

          const eventDate =
            new Date(event.eventDate);

          return eventDate >= now;
        })

        .sort((a, b) => {

          const dateA =
            new Date(
              a.eventDate
            ).getTime();

          const dateB =
            new Date(
              b.eventDate
            ).getTime();

          return dateA - dateB;
        })

        .map((event) => {

          const date =
            new Date(
              event.eventDate
            );


          return {
            id: event.id,
            title: event.title,
            date:
              this.formatEventDate(date)
          };
        });
    });


  formatEventDate(
    date: string | Date
  ): string {

    const eventDate =
      new Date(date);


    const today =
      new Date();

    const tomorrow =
      new Date();


    tomorrow.setDate(
      today.getDate() + 1
    );


    const eventDay =
      new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );


    const todayDay =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );


    const tomorrowDay =
      new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate()
      );


    let dayText: string;


    if (
      eventDay.getTime() ===
      todayDay.getTime()
    ) {

      dayText = 'Today';

    }

    else if (
      eventDay.getTime() ===
      tomorrowDay.getTime()
    ) {

      dayText = 'Tomorrow';

    }

    else {

      dayText =
        eventDate.toLocaleDateString(
          'en-US',
          {
            weekday: 'long'
          }
        );
    }


    const timeText =
      eventDate.toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit'
        }
      );


    return `${dayText} • ${timeText}`;
  }


  // ================================
  // Quick Actions
  // ================================

  quickActions = [

    {
      title: 'New Note',
      description:
        'Capture an idea instantly',
      icon: 'edit_note',
      route: '/notes',
      action: 'new',
      color: '#6366F1'
    },

    {
      title: 'New Entity',
      description:
        'Create a person or company',
      icon: 'account_tree',
      route: '/entities',
      action: 'new',
      color: '#06B6D4'
    },

    {
      title: 'Add Event',
      description:
        'Schedule something important',
      icon: 'event',
      route: '/timeline',
      action: 'new',
      color: '#F59E0B'
    }
  ];


  // ================================
  // Activity
  // ================================

  activities = [

    {
      id: '1',
      icon: 'login',
      title:
        'Logged into SecondBrain',
      time:
        '2 minutes ago'
    },

    {
      id: '2',
      icon: 'description',
      title:
        'Created Angular Signals note',
      time:
        '15 minutes ago'
    },

    {
      id: '3',
      icon: 'edit',
      title:
        'Updated Diary',
      time:
        'Yesterday'
    },

    {
      id: '4',
      icon: 'account_tree',
      title:
        'Added Entity',
      time:
        '2 days ago'
    }
  ];
}