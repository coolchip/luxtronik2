
Luxtronik2 Roadmap
==================
This roadmap is a short, living document and should give some indication for the future.

Goals
-----
* **Spell luxtronik with a capital "L"**. That should be the natural way - also ESLint wants that.
* **Return errors in callback instead of winston.log them**. The module should return the errors and not log them. Also note the following goal.
* **Remove standard/no-callback-literal errors**. There is a standard for handling callback parameters in Node.js and I should use this.
* **Use a standard Node.js file/folder structure**. 
* **Translate to clean english and other languages**. The output of Luxtronik is a crazy language mixture. I want a clear output. First in English and than translate to other Languages.
* **Queue read/write jobs**. If a new read/write command is triggered, before the old is done, the modules crashes.
* **Reduce complexity of some functions**. Some functions are really complex and not readable. I will gix that.
