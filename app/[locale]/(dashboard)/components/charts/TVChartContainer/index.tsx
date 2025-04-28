'use client';

import styles from "./index.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { 
	ChartingLibraryWidgetOptions, 
	LanguageCode, 
	ResolutionString, 
	widget,
	IBasicDataFeed
} from "@/public/static/charting_library";
import { useTheme } from "@/components/context/theme-provider";
import datafeed from "./datafeed";

export const TVChartContainer = (props: Partial<ChartingLibraryWidgetOptions>) => {
	const { theme } = useTheme();
	const chartContainerRef = useRef<HTMLDivElement>(null);
 

	useEffect(() => {
		const widgetOptions: ChartingLibraryWidgetOptions = {
			symbol: props.symbol || 'BTC-USD',  // Default to BTC-USD
			datafeed: datafeed,
			interval: props.interval as ResolutionString || '1D' as ResolutionString,
			container: chartContainerRef.current as HTMLElement,
			library_path: props.library_path || '/static/charting_library/',
			locale: props.locale as LanguageCode || 'en' as LanguageCode,
			disabled_features: [
				"use_localstorage_for_settings",
			],
			enabled_features: [
				'hide_left_toolbar_by_default',
				'header_screenshot',
				'header_fullscreen_button',
				'snapshot_trading_drawings',
				'chart_scroll',
				'chart_zoom',
				'horz_touch_drag_scroll',
				'vert_touch_drag_scroll',
				'mouse_wheel_scroll',
				'pressed_mouse_move_scroll',
				'mouse_wheel_scale',
				'pinch_scale',
				'axis_pressed_mouse_move_scale'
			],
			charts_storage_url: props.charts_storage_url,
			charts_storage_api_version: props.charts_storage_api_version,
			client_id: props.client_id,
			user_id: props.user_id,
			fullscreen: props.fullscreen,
			autosize: props.autosize || true,
			theme: theme === 'dark' ? 'dark' : 'light',
			overrides: {
				"mainSeriesProperties.style": 1,
				"mainSeriesProperties.candleStyle.upColor": "#26a69a",
				"mainSeriesProperties.candleStyle.downColor": "#ef5350",
				"mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
				"mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
				"mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
				"mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
			},
		};

		const tvWidget = new widget(widgetOptions);

		tvWidget.onChartReady(() => {
			tvWidget.headerReady().then(() => {
				// Add entry and exit points for a fake trade
				const currentTime = Date.now();
				const entryTime = currentTime - 1000 * 60 * 60 * 24 * 2; // 2 days ago
				const exitTime = currentTime - 1000 * 60 * 60 * 24; // 1 day ago

				// // Entry point (green)
				// tvWidget.chart().createShape(
				// 	{ time: entryTime, price: 150.50 },
				// 	{
				// 		shape: 'arrow_up',
				// 		text: 'Entry',
				// 		overrides: {
				// 			backgroundColor: '#26a69a',
				// 			borderColor: '#26a69a',
				// 			textColor: '#ffffff',
				// 			fontSize: 12
				// 		}
				// 	}
				// );

				// // Exit point (red)
				// tvWidget.chart().createShape(
				// 	{ time: exitTime, price: 152.75 },
				// 	{
				// 		shape: 'arrow_down',
				// 		text: 'Exit',
				// 		overrides: {
				// 			backgroundColor: '#ef5350',
				// 			borderColor: '#ef5350',
				// 			textColor: '#ffffff',
				// 			fontSize: 12
				// 		}
				// 	}
				// );
			});
		});

		return () => {
			tvWidget.remove();
		};
	}, [props, theme]);

	return (
		<div ref={chartContainerRef} className={styles.TVChartContainer} />
	);
}; 