# Embedding Our Recharts Dashboard

Embed the dashboard using this iframe:

```html
<iframe
  src="https://deltalytix.app/embed?theme=dark&apiKey=your_key"
  width="100%"
  height="600px"
  title="Dashboard"
  frameborder="0"
  allowfullscreen
></iframe>

## Query Parameters
- `theme`: `light` or `dark` for styling default to dark.
- `apiKey`: Required for access (contact us for a key).

## Updating Chart Data
Send new data using `postMessage`:

```javascript
const iframe = document.getElementById('dashboard');
const newData = [
  { name: 'Jan', value: 500 },
  { name: 'Feb', value: 200 },
  { name: 'Mar', value: 700 },
];
iframe.contentWindow.postMessage(
  { chartData: newData },
  'https://your-dashboard.com'
);