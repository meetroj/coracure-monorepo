import { AppRegistry } from 'react-native';
import App from './app/App';
import { configureDemoMode } from '@coracure/api';

configureDemoMode(true);

AppRegistry.registerComponent('Patient', () => App);
