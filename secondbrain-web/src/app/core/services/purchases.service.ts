import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PurchaseItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CreatePurchaseRequest {
  title: string;
  entityId?: string;
  purchaseDate?: string;
  items: PurchaseItem[];
}

export interface Purchase {
  id: string;
  title: string;
  totalAmount: string | number;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  entityId?: string | null;
  items: PurchaseItem[];
}

@Injectable({
  providedIn: 'root'
})
export class PurchasesService {

  private http = inject(HttpClient);

  private api = `${environment.apiUrl}/purchases`;

  createPurchase(
    data: CreatePurchaseRequest
  ): Observable<Purchase> {
    return this.http.post<Purchase>(
      this.api,
      data
    );
  }

}