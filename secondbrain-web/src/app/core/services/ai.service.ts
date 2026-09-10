import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MindIntent =
  | 'NOTE'
  | 'PURCHASE'
  | 'MEETING'
  | 'REMINDER'
  | 'UNKNOWN';

export interface PurchaseItemPreview {
  name: string;
  price: number;
  quantity: number;
}

export interface SmartCaptureResult {
  intent: MindIntent;
  title?: string;
  description?: string;
  entityHint?: string;
  eventDate?: string;
  purchaseItems?: PurchaseItemPreview[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ai`;

  smartCapture(
    input: string,
    entityName?: string,
  ): Observable<SmartCaptureResult> {
    return this.http.post<SmartCaptureResult>(
      `${this.api}/smart-capture`,
      { input, entityName },
    );
  }
}
