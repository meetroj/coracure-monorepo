import { AppRegistry } from 'react-native';
import App from './app/App';

function mountApp() {
  const container = document.getElementById('root');
  if (!container) return;
  AppRegistry.registerComponent('App', () => App);
  AppRegistry.runApplication('App', {
    initialProps: {},
    rootTag: container,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

