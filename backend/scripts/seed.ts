import {migrate} from '../src/models/migrate.js';
import {initialize} from '../src/services/initializeService.js';
import {pool} from '../src/models/database.js';
try {await migrate();await initialize();} catch(e:any){console.error(e.message);process.exitCode=1;} finally {await pool.end();}

