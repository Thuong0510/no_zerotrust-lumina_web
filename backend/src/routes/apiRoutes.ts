import {handle as apiController} from '../controllers/apiController.js';
export const handle = (request: Request) => apiController(request);
