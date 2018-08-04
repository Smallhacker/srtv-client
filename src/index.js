import {headSetup, bodySetup} from './setup.js';
import './pages/allPages.js';
import debug from './debug.js';

debug();
window.hydra = {headSetup, bodySetup};