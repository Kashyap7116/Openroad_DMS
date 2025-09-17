"use client";

import { useEffect, useState } from "react";

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        if (
          entry.entryType === "paint" &&
          entry.name === "first-contentful-paint"
        ) {
          setMetrics((prev) => ({
            ...prev!,
            firstContentfulPaint: entry.startTime,
          }));
        }

        if (entry.entryType === "largest-contentful-paint") {
          setMetrics((prev) => ({
            ...prev!,
            largestContentfulPaint: entry.startTime,
          }));
        }

        if (
          entry.entryType === "layout-shift" &&
          !(entry as any).hadRecentInput
        ) {
          setMetrics((prev) => ({
            ...prev!,
            cumulativeLayoutShift:
              (prev?.cumulativeLayoutShift || 0) + (entry as any).value,
          }));
        }

        if (entry.entryType === "first-input") {
          setMetrics((prev) => ({
            ...prev!,
            firstInputDelay: (entry as any).processingStart - entry.startTime,
          }));
        }
      });
    });

    observer.observe({
      entryTypes: [
        "paint",
        "largest-contentful-paint",
        "layout-shift",
        "first-input",
      ],
    });

    // Get navigation timing metrics
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    if (navigation) {
      const startTime = navigation.fetchStart || 0;
      setMetrics({
        loadTime: navigation.loadEventEnd - startTime,
        domContentLoaded: navigation.domContentLoadedEventEnd - startTime,
      });
    }

    return () => observer.disconnect();
  }, []);

  return metrics;
}

export function PerformanceMonitor() {
  const metrics = usePerformanceMetrics();

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null;

  if (!metrics) return null;

  const getScoreColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return "text-green-600";
    if (value <= thresholds[1]) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm border rounded-lg p-3 text-xs shadow-lg max-w-sm z-50">
      <div className="font-semibold text-gray-800 mb-2">
        Performance Metrics
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Load Time:</span>
          <span className={getScoreColor(metrics.loadTime, [2000, 4000])}>
            {Math.round(metrics.loadTime)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span>DOM Ready:</span>
          <span
            className={getScoreColor(metrics.domContentLoaded, [1500, 3000])}
          >
            {Math.round(metrics.domContentLoaded)}ms
          </span>
        </div>

        {metrics.firstContentfulPaint && (
          <div className="flex justify-between">
            <span>FCP:</span>
            <span
              className={getScoreColor(
                metrics.firstContentfulPaint,
                [1800, 3000]
              )}
            >
              {Math.round(metrics.firstContentfulPaint)}ms
            </span>
          </div>
        )}

        {metrics.largestContentfulPaint && (
          <div className="flex justify-between">
            <span>LCP:</span>
            <span
              className={getScoreColor(
                metrics.largestContentfulPaint,
                [2500, 4000]
              )}
            >
              {Math.round(metrics.largestContentfulPaint)}ms
            </span>
          </div>
        )}

        {metrics.cumulativeLayoutShift !== undefined && (
          <div className="flex justify-between">
            <span>CLS:</span>
            <span
              className={getScoreColor(
                metrics.cumulativeLayoutShift * 1000,
                [100, 250]
              )}
            >
              {metrics.cumulativeLayoutShift.toFixed(3)}
            </span>
          </div>
        )}

        {metrics.firstInputDelay && (
          <div className="flex justify-between">
            <span>FID:</span>
            <span
              className={getScoreColor(metrics.firstInputDelay, [100, 300])}
            >
              {Math.round(metrics.firstInputDelay)}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
