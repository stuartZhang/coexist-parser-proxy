# coexist-parser-proxy

Resolve the coexistent fault among multer, body-parser and http-proxy(-middleware).

## Usage

An Express.js middleware is exported. As a result, all that you need is to import and use it before hooking body-parser and http-proxy middleware.

```shell
npm i -S coexist-parser-proxy
```

```javascript
const middleware = require('coexist-parser-proxy');
const express = require('express');
const app = express();
// ...
app.use(middleware);
// ...
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.text());
// ...
app.use((req, res) => {
    proxy.web(req, res, {target: 'http://mytarget.com:8080'});
})
```
