import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Timeline } from '../models/timeline.model';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  Entity,
  EntityStats,
  CreateEntityDto,
  UpdateEntityDto,
} from '../models/entity.model';

@Injectable({
  providedIn: 'root',
})
export class EntitiesService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/entities`;

  getEntities(search?: string): Observable<Entity[]> {
    if (search) {
      return this.http.get<Entity[]>(
        `${this.apiUrl}?search=${search}`,
      );
    }

    return this.http.get<Entity[]>(this.apiUrl);
  }

  getStats(): Observable<EntityStats> {
    return this.http.get<EntityStats>(
      `${this.apiUrl}/stats`,
    );
  }

  createEntity(data: CreateEntityDto) {
    return this.http.post<Entity>(
      this.apiUrl,
      data,
    );
  }

  updateEntity(
    id: string,
    data: UpdateEntityDto,
  ) {
    return this.http.patch<Entity>(
      `${this.apiUrl}/${id}`,
      data,
    );
  }

  deleteEntity(id: string) {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
    );
  }

  getEntityProfile(
    id: string,
  ) {
    return this.http.get<{
      entity: Entity;

      stats: {
        timelineCount: number;

        firstEvent: string | null;

        lastEvent: string | null;
      };

      timelines: Timeline[];

      purchases: {
        id: string;
        title: string;
        totalAmount: string | number;
        purchaseDate: string;
        createdAt: string;
        updatedAt: string;
        userId: string;
        entityId: string | null;

        items: {
          id: string;
          name: string;
          price: string | number;
          quantity: number;
          createdAt: string;
          updatedAt: string;
          purchaseId: string;
        }[];
      }[];
    }>(
      `${this.apiUrl}/${id}/profile`,
    );
  }
}