import {migrate} from '../src/models/migrate.js';
import {pool} from '../src/models/database.js';
try {await migrate();} catch(e:any){console.error(e.message);process.exitCode=1;} finally {await pool.end();}

