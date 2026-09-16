import { Component, inject } from '@angular/core';

import { ToastQueue } from '../toast-queue';

@Component({
  selector: 'app-toast-list',
  templateUrl: './toast-list.html',
  styleUrl: './toast-list.scss',
})
export class ToastList {
  private readonly queue = inject(ToastQueue);

  protected readonly toasts = this.queue.toasts;

  protected dismiss(id: number): void {
    this.queue.dismiss(id);
  }
}
