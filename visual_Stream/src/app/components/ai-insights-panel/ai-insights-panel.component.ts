import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrendingInsights } from '../../core/ai/ai-insights.models';

/** "Kino IA" panel: AI (or built-in) summary of what is most watched on Kino. */
@Component({
  selector: 'app-ai-insights-panel',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './ai-insights-panel.component.html',
  styleUrl: './ai-insights-panel.component.scss'
})
export class AiInsightsPanelComponent {
  readonly insights = input.required<TrendingInsights>();

  readonly sourceLabel = computed(() =>
    this.insights().source === 'ai' ? 'Generado con IA' : 'Análisis automático de Kino');
  readonly maxCategoryViews = computed(() =>
    Math.max(1, ...this.insights().topCategories.map(category => category.totalViews)));

  categoryWidth(views: number): number {
    return Math.max(4, Math.round((views / this.maxCategoryViews()) * 100));
  }
}
