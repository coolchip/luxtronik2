Upcoming
========
  * optimize file/folder structure
  * queue read/write jobs (fix for job collisions)

v1.0.0 / 25 Jul 2017 [see migrating guide](MIGRATING.md) 
========================================================
  * create object with luxtronik.createConnection() instead of "new"
  * return errors in callback instead of winston.log them
  * use error-first standard for handling callback parameters
  * correct spelling of "temperature" at write function
  * add early returns for cleaner functions
  * add installation how-to and rewrite example code
  * update dev-dependecies

v0.1.2 / 13 Apr 2017
====================
  * enable strict mode in all js files (**thanks to marcus**)

v0.1.1 / 13 Apr 2017
====================
  * insert roadmap
  * use of luxtronik always creates a new object - even without "new"
  * moved some code, renamed some functions and rewrite some passages to make the code more readable
  * add eslint to project and fix some eslint problems

v0.1.0 / 12 Apr 2017
====================
  * added missing error event handlers for client connection (**thanks to marcus**)
  * fixed handling, when heatpump is busy (**thanks to marcus**)
  * return plain text for error code and outage codes (**thanks to bakito**)

v0.0.2 / 11 Apr 2017
====================
  * add readRaw() function to get the raw data from the pump
  * code correctness

v0.0.1 / 06 Apr 2017
====================
  * first official release